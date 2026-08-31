/**
 * MODULE AUTH TRACKER & TIMING ENGINE (js/auth/auth-tracker.js)
 * Ghi nhận sự kiện đăng nhập, đăng xuất và thời gian học tập vào Supabase
 */
const db = () => window.supabaseClient;

// 1. TÍNH TOÁN KHOẢNG THỜI GIAN TUẦN HIỆN TẠI (THỨ 2 ĐẾN CHỦ NHẬT)
export function getWeeklyPeriod() {
  const now = new Date();
  const day = now.getDay(); // 0: CN, 1: T2, 2: T3, ..., 6: T7
  const diffToMonday = (day + 6) % 7;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mStr = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
  const sStr = `${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}/${sunday.getFullYear()}`;
  const weekKey = `week_${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  return { monday, sunday, label: `Tuần: Thứ Hai ${mStr} – Chủ Nhật ${sStr}`, weekKey };
}

// 2. GHI NHẬN SỰ KIỆN ĐĂNG NHẬP / ĐĂNG XUẤT VÀ TÍNH THỜI GIAN PHIÊN
export async function recordAuthEvent(userEmail, userType, eventType, durationSeconds = 0, userId = '', studentName = '', className = '') {
  if (!userEmail) return;
  const nowISO = new Date().toISOString();

  try {
    if (!db()) return;

    // Ghi vào bảng nhật ký user_auth_logs
    const logPayload = {
      user_email: userEmail,
      user_type: userType, // 'student' hoặc 'teacher'
      event_type: eventType, // 'login' hoặc 'logout'
      timestamp: nowISO
    };

    await db().from('user_auth_logs').insert([logPayload]);

    // Cập nhật timestamp trên bảng students hoặc teachers
    if (userType === 'student') {
      const updateField = eventType === 'login' 
        ? { last_login_at: nowISO } 
        : { last_logout_at: nowISO };

      if (userId) {
        await db().from('students').update(updateField).eq('id', userId);
      } else {
        await db().from('students').update(updateField).eq('email', userEmail);
      }

      // Cập nhật thống kê học tập tuần nếu có thời gian học hoặc điểm số
      if (durationSeconds > 0 && userId) {
        await recordStudyTime(userId, studentName || userId, className || '', durationSeconds, 0);
      }
    } else if (userType === 'teacher') {
      const updateField = eventType === 'login' 
        ? { last_login_at: nowISO } 
        : { last_logout_at: nowISO };
      await db().from('teachers').update(updateField).eq('email', userEmail);
    }
  } catch (err) {
    console.warn("Lỗi ghi nhận auth event:", err);
  }
}

// 3. TÍCH LŨY THỜI GIAN HỌC VÀ ĐIỂM XP TUẦN VÀO SUPABASE
export async function recordStudyTime(studentId, studentName, className, durationSeconds = 0, xpGained = 0) {
  if (!studentId) return;
  const period = getWeeklyPeriod();
  const statId = `${studentId}_${period.weekKey}`;

  try {
    if (!db()) return;

    // 1. Kiểm tra bản ghi tuần hiện tại
    const { data: existing } = await db()
      .from('student_learning_stats')
      .select('*')
      .eq('id', statId)
      .maybeSingle();

    if (existing) {
      await db().from('student_learning_stats').update({
        weekly_time_seconds: (existing.weekly_time_seconds || 0) + durationSeconds,
        weekly_xp: (existing.weekly_xp || 0) + xpGained,
        last_active: new Date().toISOString()
      }).eq('id', statId);
    } else {
      await db().from('student_learning_stats').insert([{
        id: statId,
        student_id: studentId,
        student_name: studentName || studentId,
        class_name: className || '',
        week_key: period.weekKey,
        weekly_time_seconds: durationSeconds,
        weekly_xp: xpGained,
        last_active: new Date().toISOString()
      }]);
    }

    // 2. Cộng dồn total_xp vào bảng students
    if (xpGained > 0) {
      const { data: st } = await db().from('students').select('total_xp').eq('id', studentId).maybeSingle();
      if (st) {
        await db().from('students').update({ total_xp: (st.total_xp || 0) + xpGained }).eq('id', studentId);
      }
    }
  } catch (err) {
    console.warn("Lỗi cập nhật thời gian học:", err);
  }
}

// 4. FORMAT THỜI LƯỢNG HỌC SANG ĐỊNH DẠNG DỄ ĐỌC
export function formatDuration(seconds = 0) {
  if (!seconds || seconds <= 0) return '0 phút';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${mins > 0 ? mins + 'p' : ''}`;
  }
  if (mins > 0) {
    return `${mins} phút ${secs > 0 ? secs + 's' : ''}`;
  }
  return `${secs} giây`;
}
