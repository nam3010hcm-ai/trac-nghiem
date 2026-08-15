/**
 * =========================================================================
 * MODULE NHẬT KÝ ĐĂNG NHẬP, THỜI LƯỢNG HỌC & XẾP HẠNG TOP 10 (auth-logs.js)
 * EduCore LMS - Session Tracking & Student Performance Analytics Engine
 * =========================================================================
 */

import { $, esc } from './common.js';

const db = () => window.supabaseClient;

export let authLogsList = [];
export let weeklyStatsList = [];

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
      duration_seconds: durationSeconds || 0,
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
export async function loadAuthLogs(limit = 100) {
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
    return authLogsList;
  } catch (e) {
    console.error("Lỗi loadAuthLogs:", e);
    authLogsList = [];
    return [];
  }
}

// 6. RENDER BẢNG NHẬT KÝ ĐĂNG NHẬP / ĐĂNG XUẤT TRÊN TEACHER PANEL
export function renderAuthLogsTable() {
  const tbody = document.getElementById('auth-logs-tbody');
  const countBadge = document.getElementById('auth-logs-count');
  if (countBadge) countBadge.textContent = authLogsList.length;
  if (!tbody) return;

  if (!authLogsList.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">📭 Chưa có nhật ký đăng nhập nào được ghi nhận.</td></tr>';
    return;
  }

  tbody.innerHTML = authLogsList.map((log, idx) => {
    const isLogin = log.event_type === 'login';
    const isTeacher = log.user_type === 'teacher';
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—';
    const durationStr = log.duration_seconds > 0 ? formatDuration(log.duration_seconds) : '—';

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="font-weight:700;color:#0f172a">${esc(log.user_email)}</div>
          <div style="font-size:11px;color:#64748b">${log.user_id ? 'Mã: ' + esc(log.user_id) : ''}</div>
        </td>
        <td>
          <span class="abadge" style="${isTeacher ? 'background:#fef3c7;color:#92400e' : 'background:#e0f2fe;color:#0369a1'}">
            ${isTeacher ? '👨‍🏫 Giảng viên' : '🎓 Học viên'}
          </span>
        </td>
        <td>
          <span class="abadge" style="${isLogin ? 'background:#ecfdf5;color:#15803d' : 'background:#fef2f2;color:#dc2626'}">
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

// 7. TÍNH TOÁN VÀ RENDER BẢNG XẾP HẠNG TOP 10 TRONG 1 TUẦN
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

// 8. MỞ MODAL XEM BÁO CÁO HỌC TẬP CHI TIẾT CỦA 1 HỌC VIÊN
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

window.openStudentReportModal = openStudentReportModal;
window.closeStudentReportModal = closeStudentReportModal;
window.calculateAndRenderTop10 = calculateAndRenderTop10;
window.loadAuthLogs = loadAuthLogs;
window.renderAuthLogsTable = renderAuthLogsTable;
