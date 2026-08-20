/**
 * =========================================================================
 * MODULE NHẬT KÝ ĐĂNG NHẬP, THỜI LƯỢNG HỌC & XẾP HẠNG TOP 10 (auth-logs.js)
 * EduCore LMS - Session Tracking & Student Performance Analytics Engine
 * =========================================================================
 */

import { $, esc, isRootUser, state } from './common.js';

const db = () => window.supabaseClient;

export let authLogsList = [];
export let weeklyStatsList = [];
export let currentAuthLogTab = 'events'; // 'events' | 'summary'

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
  const period = getWeeklyPeriod();

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

// 5. TẢI NHẬT KÝ ĐĂNG NHẬP / ĐĂNG XUẤT TỪ SUPABASE
export async function loadAuthLogs(limit = 500) {
  try {
    if (!db()) return [];
    const { data, error } = await db()
      .from('user_auth_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Chưa có bảng user_auth_logs hoặc lỗi query:", error);
      authLogsList = [];
    } else {
      authLogsList = data || [];
    }
    renderAuthLogsAnalytics();
    return authLogsList;
  } catch (e) {
    console.error("Lỗi loadAuthLogs:", e);
    authLogsList = [];
    return [];
  }
}

// 6. TÍNH TOÁN & RENDER BẢNG ĐIỀU KHIỂN KPI METRICS
export function renderAuthLogsAnalytics() {
  const totalEvents = authLogsList.length;
  const loginEvents = authLogsList.filter(l => l.event_type === 'login');
  const logoutEvents = authLogsList.filter(l => l.event_type === 'logout');
  
  const uniqueUsersSet = new Set(authLogsList.map(l => (l.user_email || '').toLowerCase()).filter(Boolean));
  const uniqueUsers = uniqueUsersSet.size;

  const teacherLogins = loginEvents.filter(l => l.user_type === 'teacher').length;
  const studentLogins = loginEvents.filter(l => l.user_type === 'student').length;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const active24hSet = new Set(
    authLogsList
      .filter(l => l.timestamp && new Date(l.timestamp).getTime() >= oneDayAgo)
      .map(l => (l.user_email || '').toLowerCase())
      .filter(Boolean)
  );
  const active24h = active24hSet.size;

  const sessionsWithDuration = authLogsList.filter(l => (l.duration_seconds || 0) > 0);
  const totalDuration = sessionsWithDuration.reduce((acc, l) => acc + (l.duration_seconds || 0), 0);
  const avgDurationSec = sessionsWithDuration.length > 0 ? Math.round(totalDuration / sessionsWithDuration.length) : 0;

  // Gán vào các element giao diện nếu tồn tại
  if ($('stat-auth-total-logins')) $('stat-auth-total-logins').textContent = loginEvents.length;
  if ($('stat-auth-unique-users')) $('stat-auth-unique-users').textContent = uniqueUsers;
  if ($('stat-auth-active-24h')) $('stat-auth-active-24h').textContent = active24h;
  if ($('stat-auth-avg-duration')) $('stat-auth-avg-duration').textContent = formatDuration(avgDurationSec);
  if ($('stat-auth-teacher-count')) $('stat-auth-teacher-count').textContent = teacherLogins;
  if ($('stat-auth-student-count')) $('stat-auth-student-count').textContent = studentLogins;
  if ($('logs-count-sidebar')) $('logs-count-sidebar').textContent = totalEvents;
  if ($('auth-logs-count')) $('auth-logs-count').textContent = totalEvents;
}

// 7. LỌC VÀ RENDER BẢNG NHẬT KÝ ĐĂNG NHẬP / ĐĂNG XUẤT
export function renderAuthLogsTable() {
  const tbody = document.getElementById('auth-logs-tbody');
  const countBadge = document.getElementById('auth-logs-count');
  if (countBadge) countBadge.textContent = authLogsList.length;
  if (!tbody) return;

  const q = ($('flt-auth-search')?.value || '').trim().toLowerCase();
  const roleFlt = $('flt-auth-role')?.value || 'all';
  const eventFlt = $('flt-auth-event')?.value || 'all';
  const timeFlt = $('flt-auth-time')?.value || 'all';

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let filtered = authLogsList.filter(log => {
    // 1. Text search (email, user_id)
    const email = (log.user_email || '').toLowerCase();
    const uid = (log.user_id || '').toLowerCase();
    if (q && !email.includes(q) && !uid.includes(q)) return false;

    // 2. Role filter
    if (roleFlt !== 'all' && log.user_type !== roleFlt) return false;

    // 3. Event filter
    if (eventFlt !== 'all' && log.event_type !== eventFlt) return false;

    // 4. Time filter
    if (timeFlt !== 'all' && log.timestamp) {
      const logTs = new Date(log.timestamp).getTime();
      if (timeFlt === 'today' && logTs < startOfToday.getTime()) return false;
      if (timeFlt === '7days' && logTs < now - 7 * 24 * 60 * 60 * 1000) return false;
      if (timeFlt === '30days' && logTs < now - 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">📭 Không tìm thấy nhật ký đăng nhập nào khớp với bộ lọc.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((log, idx) => {
    const isLogin = log.event_type === 'login';
    const isTeacher = log.user_type === 'teacher';
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—';
    const durationStr = log.duration_seconds > 0 ? formatDuration(log.duration_seconds) : '—';

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:${isTeacher ? '#fef3c7' : '#e0f2fe'};color:${isTeacher ? '#92400e' : '#0369a1'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">
              ${isTeacher ? '👨‍🏫' : '🎓'}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${esc(log.user_email)}</div>
              ${log.user_id ? `<div style="font-size:11px;color:#64748b">Mã ID: ${esc(log.user_id)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="abadge" style="${isTeacher ? 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;' : 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;'}">
            ${isTeacher ? '👨‍🏫 Giảng viên' : '🎓 Học viên'}
          </span>
        </td>
        <td>
          <span class="abadge" style="${isLogin ? 'background:#ecfdf5;color:#15803d;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;'}">
            ${isLogin ? '🟢 Đăng nhập (Login)' : '🔴 Đăng xuất (Logout)'}
          </span>
        </td>
        <td>
          <div style="font-size:12.5px;color:#334155;font-weight:600">${timeStr}</div>
        </td>
        <td style="text-align:center">
          <span style="font-weight:700;color:${log.duration_seconds > 0 ? '#2563eb' : '#94a3b8'}">
            ${durationStr}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// 8. RENDER BẢNG TỔNG HỢP HOẠT ĐỘNG THEO TỪNG USER
export function renderUserActivitySummaryTable() {
  const tbody = document.getElementById('user-activity-tbody');
  if (!tbody) return;

  const q = ($('flt-auth-search')?.value || '').trim().toLowerCase();
  const roleFlt = $('flt-auth-role')?.value || 'all';

  // Gom nhóm thống kê theo Email
  const userMap = {};

  // Gom từ danh sách học viên
  (window.studentsList || []).forEach(st => {
    const email = (st.email || st.id || '').toLowerCase();
    if (!email) return;
    userMap[email] = {
      email: st.email || st.id,
      name: st.full_name || st.student_name || st.name || email,
      role: 'student',
      totalLogins: 0,
      totalLogouts: 0,
      totalDurationSec: 0,
      lastLogin: st.last_login_at || null,
      lastLogout: st.last_logout_at || null,
      id: st.id
    };
  });

  // Gom từ danh sách giảng viên
  (window.teachersList || []).forEach(t => {
    const email = (t.email || '').toLowerCase();
    if (!email) return;
    userMap[email] = {
      email: t.email,
      name: t.teacher_name || t.name || t.full_name || email,
      role: 'teacher',
      totalLogins: 0,
      totalLogouts: 0,
      totalDurationSec: 0,
      lastLogin: t.last_login_at || null,
      lastLogout: t.last_logout_at || null,
      id: t.id
    };
  });

  // Cộng dồn từ authLogsList
  authLogsList.forEach(log => {
    const email = (log.user_email || '').toLowerCase();
    if (!email) return;

    if (!userMap[email]) {
      userMap[email] = {
        email: log.user_email,
        name: email.split('@')[0],
        role: log.user_type || 'student',
        totalLogins: 0,
        totalLogouts: 0,
        totalDurationSec: 0,
        lastLogin: null,
        lastLogout: null,
        id: log.user_id || ''
      };
    }

    if (log.event_type === 'login') {
      userMap[email].totalLogins += 1;
      if (!userMap[email].lastLogin || new Date(log.timestamp) > new Date(userMap[email].lastLogin)) {
        userMap[email].lastLogin = log.timestamp;
      }
    } else if (log.event_type === 'logout') {
      userMap[email].totalLogouts += 1;
      if (!userMap[email].lastLogout || new Date(log.timestamp) > new Date(userMap[email].lastLogout)) {
        userMap[email].lastLogout = log.timestamp;
      }
    }

    if (log.duration_seconds > 0) {
      userMap[email].totalDurationSec += log.duration_seconds;
    }
  });

  let users = Object.values(userMap);

  // Lọc
  users = users.filter(u => {
    const email = (u.email || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    if (q && !email.includes(q) && !name.includes(q)) return false;
    if (roleFlt !== 'all' && u.role !== roleFlt) return false;
    return true;
  });

  // Sắp xếp theo lần đăng nhập gần nhất
  users.sort((a, b) => {
    const tA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
    const tB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
    return tB - tA;
  });

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#94a3b8;">Không có người dùng nào khớp với tìm kiếm.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map((u, idx) => {
    const isTeacher = u.role === 'teacher';
    const isOnline = u.lastLogin && (!u.lastLogout || new Date(u.lastLogin) > new Date(u.lastLogout));
    const lastLoginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Chưa có';
    const lastLogoutStr = u.lastLogout ? new Date(u.lastLogout).toLocaleString('vi-VN') : '—';

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${isTeacher ? '#fef3c7' : '#e0f2fe'};color:${isTeacher ? '#92400e' : '#0369a1'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;">
              ${isTeacher ? '👨‍🏫' : '🎓'}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${esc(u.name)}</div>
              <div style="font-size:11.5px;color:#64748b;">${esc(u.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="abadge" style="${isTeacher ? 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;' : 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;'}">
            ${isTeacher ? '👨‍🏫 Giảng viên' : '🎓 Học viên'}
          </span>
        </td>
        <td style="text-align:center;font-weight:800;color:#2563eb;">
          ${u.totalLogins}
        </td>
        <td style="text-align:center;font-weight:700;color:#0d9488;">
          ${formatDuration(u.totalDurationSec)}
        </td>
        <td style="font-size:12px;color:#334155;">
          ${lastLoginStr}
        </td>
        <td style="font-size:12px;color:#64748b;">
          ${lastLogoutStr}
        </td>
        <td style="text-align:center;">
          <span class="status-badge ${isOnline ? 'status-active' : 'status-pending'}" style="font-size:11px;">
            ${isOnline ? '🟢 Online' : '⚪ Offline'}
          </span>
        </td>
        <td style="text-align:center;">
          ${u.role === 'student' && u.id ? `
            <button class="action-btn-sm" onclick="window.openStudentReportModal('${esc(u.id)}')">
              📊 Hồ sơ
            </button>
          ` : '—'}
        </td>
      </tr>
    `;
  }).join('');
}

// 9. CHUYỂN ĐỔI GIỮA VIEW LỊCH SỬ VÀ VIEW THỐNG KÊ USER
export function switchAuthLogsSubTab(subTab) {
  currentAuthLogTab = subTab;
  const eventsView = document.getElementById('authlogs-events-view');
  const summaryView = document.getElementById('authlogs-summary-view');
  const btnEvents = document.getElementById('tab-auth-btn-events');
  const btnSummary = document.getElementById('tab-auth-btn-summary');

  if (subTab === 'events') {
    if (eventsView) eventsView.style.display = 'block';
    if (summaryView) summaryView.style.display = 'none';

    if (btnEvents) {
      btnEvents.style.background = '#ffffff';
      btnEvents.style.color = '#0f172a';
      btnEvents.style.fontWeight = '700';
      btnEvents.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
    if (btnSummary) {
      btnSummary.style.background = 'transparent';
      btnSummary.style.color = '#64748b';
      btnSummary.style.fontWeight = '500';
      btnSummary.style.boxShadow = 'none';
    }
    renderAuthLogsTable();
  } else {
    if (eventsView) eventsView.style.display = 'none';
    if (summaryView) summaryView.style.display = 'block';

    if (btnSummary) {
      btnSummary.style.background = '#ffffff';
      btnSummary.style.color = '#0f172a';
      btnSummary.style.fontWeight = '700';
      btnSummary.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
    if (btnEvents) {
      btnEvents.style.background = 'transparent';
      btnEvents.style.color = '#64748b';
      btnEvents.style.fontWeight = '500';
      btnEvents.style.boxShadow = 'none';
    }
    renderUserActivitySummaryTable();
  }
}

// 10. XUẤT CSV NHẬT KÝ ĐĂNG NHẬP
export function exportAuthLogsCSV() {
  if (!authLogsList || !authLogsList.length) {
    alert("❌ Không có dữ liệu nhật ký để xuất CSV!");
    return;
  }

  const headers = ["STT", "Email", "Ma ID", "Loai Tai Khoan", "Su Kien", "Thoi Gian", "Thoi Luong (Giay)", "Thoi Luong (Doc)"];
  const rows = authLogsList.map((l, i) => [
    i + 1,
    `"${l.user_email || ''}"`,
    `"${l.user_id || ''}"`,
    `"${l.user_type === 'teacher' ? 'Giang vien' : 'Hoc vien'}"`,
    `"${l.event_type === 'login' ? 'Dang nhap' : 'Dang xuat'}"`,
    `"${l.timestamp || ''}"`,
    l.duration_seconds || 0,
    `"${formatDuration(l.duration_seconds || 0)}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EduCore_Nhat_Ky_Dang_Nhap_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 11. TÍNH TOÁN VÀ RENDER BẢNG XẾP HẠNG TOP 10 TRONG 1 TUẦN
export async function calculateAndRenderTop10() {
  const period = getWeeklyPeriod();
  const dateLabel = document.getElementById('top10-date-label');
  if (dateLabel) dateLabel.textContent = period.label;

  const results = window.state?.results || [];
  const students = window.studentsList || [];

  // Lọc kết quả nộp bài trong tuần hiện tại (Thứ 2 đến Chủ Nhật)
  const mondayTs = period.monday.getTime();
  const sundayTs = period.sunday.getTime();

  const weeklyResults = results.filter(r => {
    const rTime = r.timestamp || (r.at ? new Date(r.at).getTime() : 0);
    return rTime >= mondayTs && rTime <= sundayTs;
  });

  // Gom nhóm theo từng học viên
  const studentMap = {};

  // Khởi tạo từ danh sách học viên
  students.forEach(st => {
    studentMap[st.id] = {
      id: st.id,
      name: st.full_name || st.student_name || st.id,
      className: st.class_name || 'K7',
      totalExams: 0,
      totalScore: 0,
      maxScore: 0,
      examTimeSeconds: 0,
      xp: st.total_xp || 0
    };
  });

  // Cộng dồn điểm thi trong tuần
  weeklyResults.forEach(r => {
    const sid = r.sid || r.student;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        id: sid,
        name: r.student || sid,
        className: r.cohort || 'K7',
        totalExams: 0,
        totalScore: 0,
        maxScore: 0,
        examTimeSeconds: 0,
        xp: 0
      };
    }
    const scoreVal = parseFloat(r.manual_score ?? r.score) || 0;
    studentMap[sid].totalExams += 1;
    studentMap[sid].totalScore += scoreVal;
    studentMap[sid].maxScore = Math.max(studentMap[sid].maxScore, scoreVal);
    studentMap[sid].examTimeSeconds += (r.time || 0);
    studentMap[sid].xp += Math.round(scoreVal * 10);
  });

  // Thêm dữ liệu thời gian học từ Supabase student_learning_stats nếu có
  try {
    if (db()) {
      const { data: dbStats } = await db()
        .from('student_learning_stats')
        .select('*')
        .eq('week_key', period.weekKey);

      (dbStats || []).forEach(st => {
        if (studentMap[st.student_id]) {
          studentMap[st.student_id].examTimeSeconds = Math.max(studentMap[st.student_id].examTimeSeconds, st.weekly_time_seconds || 0);
          studentMap[st.student_id].xp = Math.max(studentMap[st.student_id].xp, st.weekly_xp || 0);
        } else {
          studentMap[st.student_id] = {
            id: st.student_id,
            name: st.student_name,
            className: st.class_name,
            totalExams: 0,
            totalScore: 0,
            maxScore: 0,
            examTimeSeconds: st.weekly_time_seconds || 0,
            xp: st.weekly_xp || 0
          };
        }
      });
    }
  } catch (e) {
    console.warn("Lỗi nạp student_learning_stats:", e);
  }

  const allStats = Object.values(studentMap);

  // 1. TOP 10 ĐIỂM CAO NHẤT TUẦN
  const top10Scores = [...allStats]
    .filter(s => s.totalExams > 0 || s.xp > 0)
    .sort((a, b) => {
      const avgA = a.totalExams > 0 ? (a.totalScore / a.totalExams) : 0;
      const avgB = b.totalExams > 0 ? (b.totalScore / b.totalExams) : 0;
      if (avgB !== avgA) return avgB - avgA;
      return b.xp - a.xp;
    })
    .slice(0, 10);

  // 2. TOP 10 THỜI GIAN HỌC NHIỀU NHẤT TUẦN
  const top10Times = [...allStats]
    .filter(s => s.examTimeSeconds > 0)
    .sort((a, b) => b.examTimeSeconds - a.examTimeSeconds)
    .slice(0, 10);

  // Render ra 2 bảng Top 10 trên giao diện
  const scoreContainer = document.getElementById('top10-score-list');
  const timeContainer = document.getElementById('top10-time-list');

  if (scoreContainer) {
    if (!top10Scores.length) {
      scoreContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Chưa có kết quả làm bài trong tuần này.</div>';
    } else {
      scoreContainer.innerHTML = top10Scores.map((st, idx) => {
        const avg = st.totalExams > 0 ? (st.totalScore / st.totalExams).toFixed(1) : '0';
        const rank = idx + 1;
        const isTop3 = rank <= 3;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        return `
          <div class="lb-row ${isTop3 ? 'lb-top' : ''}" style="margin-bottom:8px">
            <div class="lb-rank" style="font-weight:800;font-size:15px;min-width:32px">${medal}</div>
            <div class="lb-avatar">${isTop3 ? '🌟' : '🧑‍🎓'}</div>
            <div class="lb-info">
              <div class="lb-name" style="font-size:13.5px">${esc(st.name)}</div>
              <div class="lb-sub">Lớp: <b>${esc(st.className)}</b> • Mã: ${esc(st.id)} • Đã thi: <b>${st.totalExams}</b> bài</div>
            </div>
            <div class="lb-score xp-score" style="text-align:right">
              <div style="font-size:15px;font-weight:800;color:#2563eb">⭐ ${avg}đ</div>
              <div style="font-size:11px;color:#16a34a;font-weight:700">+${st.xp} XP</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (timeContainer) {
    if (!top10Times.length) {
      timeContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Chưa có thời gian học tích lũy trong tuần này.</div>';
    } else {
      timeContainer.innerHTML = top10Times.map((st, idx) => {
        const rank = idx + 1;
        const isTop3 = rank <= 3;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        return `
          <div class="lb-row ${isTop3 ? 'lb-top' : ''}" style="margin-bottom:8px">
            <div class="lb-rank" style="font-weight:800;font-size:15px;min-width:32px">${medal}</div>
            <div class="lb-avatar">${isTop3 ? '🔥' : '⏱️'}</div>
            <div class="lb-info">
              <div class="lb-name" style="font-size:13.5px">${esc(st.name)}</div>
              <div class="lb-sub">Lớp: <b>${esc(st.className)}</b> • Mã: ${esc(st.id)}</div>
            </div>
            <div class="lb-score time-score" style="text-align:right">
              <div style="font-size:14px;font-weight:800;color:#0d9488">${formatDuration(st.examTimeSeconds)}</div>
              <div style="font-size:11px;color:#64748b">tích lũy tuần</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// 12. MỞ MODAL XEM BÁO CÁO HỌC TẬP CHI TIẾT CỦA 1 HỌC VIÊN
export function openStudentReportModal(studentId) {
  const modal = document.getElementById('modal-student-report');
  if (!modal) return;

  const students = window.studentsList || [];
  const results = window.state?.results || [];
  const st = students.find(s => String(s.id).toLowerCase() === String(studentId).toLowerCase());

  const stResults = results.filter(r => String(r.sid || r.student).toLowerCase() === String(studentId).toLowerCase());
  const totalExams = stResults.length;
  const avgScore = totalExams > 0 ? (stResults.reduce((acc, curr) => acc + (parseFloat(curr.manual_score ?? curr.score) || 0), 0) / totalExams).toFixed(1) : 'N/A';
  const maxScore = totalExams > 0 ? Math.max(...stResults.map(r => parseFloat(r.manual_score ?? r.score) || 0)) : 'N/A';
  const totalTime = stResults.reduce((acc, curr) => acc + (curr.time || 0), 0);

  const titleEl = document.getElementById('sr-modal-title');
  const bodyEl = document.getElementById('sr-modal-body');

  if (titleEl) {
    titleEl.textContent = `Hồ sơ học tập: ${st ? (st.full_name || st.id) : studentId}`;
  }

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#1d4ed8;">${totalExams}</div>
          <div style="font-size:11.5px;color:#3b82f6;font-weight:600;">Bài thi đã nộp</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#15803d;">${avgScore}đ</div>
          <div style="font-size:11.5px;color:#16a34a;font-weight:600;">Điểm trung bình</div>
        </div>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#92400e;">${maxScore}đ</div>
          <div style="font-size:11.5px;color:#b45309;font-weight:600;">Điểm cao nhất</div>
        </div>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#6d28d9;">${formatDuration(totalTime)}</div>
          <div style="font-size:11.5px;color:#7c3aed;font-weight:600;">Thời gian làm bài</div>
        </div>
      </div>

      <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;">📋 Lịch Sử Các Bài Thi Đã Làm</div>
      <div class="table-wrap" style="max-height:260px;overflow-y:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Đề thi</th>
              <th>Ca thi</th>
              <th style="text-align:center">Điểm</th>
              <th style="text-align:center">Thời gian</th>
              <th>Lúc nộp</th>
            </tr>
          </thead>
          <tbody>
            ${!stResults.length 
              ? '<tr><td colspan="6" style="text-align:center;padding:16px;color:#94a3b8">Học viên này chưa nộp bài thi nào.</td></tr>'
              : stResults.map((r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td style="font-weight:700;color:#0f172a">${esc(r.exam || 'Bài thi')}</td>
                  <td><span class="abadge" style="background:#f1f5f9;color:#334155">${esc(r.cohort || 'Tự do')}</span></td>
                  <td style="text-align:center;font-weight:800;color:#2563eb">${parseFloat(r.manual_score ?? r.score) || 0}đ</td>
                  <td style="text-align:center">${r.time ? Math.floor(r.time/60)+'p '+(r.time%60)+'s' : '—'}</td>
                  <td style="font-size:12px;color:#64748b">${esc(r.at || '—')}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  modal.style.display = 'flex';
}

export function closeStudentReportModal() {
  const modal = document.getElementById('modal-student-report');
  if (modal) modal.style.display = 'none';
}

// Window bindings
window.openStudentReportModal = openStudentReportModal;
window.closeStudentReportModal = closeStudentReportModal;
window.calculateAndRenderTop10 = calculateAndRenderTop10;
window.loadAuthLogs = loadAuthLogs;
window.renderAuthLogsTable = renderAuthLogsTable;
window.renderAuthLogsAnalytics = renderAuthLogsAnalytics;
window.renderUserActivitySummaryTable = renderUserActivitySummaryTable;
window.switchAuthLogsSubTab = switchAuthLogsSubTab;
window.exportAuthLogsCSV = exportAuthLogsCSV;
window.recordAuthEvent = recordAuthEvent;
window.recordStudyTime = recordStudyTime;
