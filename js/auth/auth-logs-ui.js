/**
 * MODULE AUTH LOGS UI (js/auth/auth-logs-ui.js)
 * Bảng nhật ký đăng nhập/đăng xuất, thống kê KPI và chuyển đổi view
 */
import { $, esc, getAuthorDisplayName } from '../common.js';
import { formatDuration } from './auth-tracker.js';
import { renderTeacherActivityLogsTable, exportAuthLogsCSV } from './auth-logs-crud.js';

const db = () => window.supabaseClient;

export let authLogsList = [];
export let weeklyStatsList = [];
export let currentAuthLogTab = 'events'; // 'events' | 'summary' | 'crud'

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
  const avgDuration = sessionsWithDuration.length ? Math.round(totalDuration / sessionsWithDuration.length) : 0;

  if ($('stat-auth-total-events')) $('stat-auth-total-events').textContent = totalEvents.toLocaleString('vi-VN');
  if ($('stat-auth-unique-users')) $('stat-auth-unique-users').textContent = uniqueUsers.toLocaleString('vi-VN');
  if ($('stat-auth-active-24h')) $('stat-auth-active-24h').textContent = active24h.toLocaleString('vi-VN');
  if ($('stat-auth-avg-session')) $('stat-auth-avg-session').textContent = formatDuration(avgDuration);

  if ($('stat-auth-teacher-count')) $('stat-auth-teacher-count').textContent = teacherLogins;
  if ($('stat-auth-student-count')) $('stat-auth-student-count').textContent = studentLogins;
}

// 7. RENDER BẢNG NHẬT KÝ ĐĂNG NHẬP / ĐĂNG XUẤT (EVENTS VIEW)
export function renderAuthLogsTable() {
  const tbody = document.getElementById('auth-logs-tbody');
  if (!tbody) return;

  const q = ($('flt-auth-search')?.value || '').trim().toLowerCase();
  const roleFlt = $('flt-auth-role')?.value || 'all';
  const eventFlt = $('flt-auth-event')?.value || 'all';
  const timeFlt = $('flt-auth-time')?.value || 'all';

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let filtered = authLogsList.filter(log => {
    const email = (log.user_email || '').toLowerCase();
    const role = log.user_type || 'student';
    const ev = log.event_type || 'login';

    if (q && !email.includes(q)) return false;
    if (roleFlt !== 'all' && role !== roleFlt) return false;
    if (eventFlt !== 'all' && ev !== eventFlt) return false;

    if (timeFlt !== 'all' && log.timestamp) {
      const logTs = new Date(log.timestamp).getTime();
      if (timeFlt === 'today' && logTs < startOfToday.getTime()) return false;
      if (timeFlt === '7days' && logTs < now - 7 * 24 * 60 * 60 * 1000) return false;
      if (timeFlt === '30days' && logTs < now - 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">📭 Không có nhật ký truy cập nào khớp với bộ lọc.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((log, idx) => {
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—';
    const isTeacher = log.user_type === 'teacher';
    const isLogin = log.event_type === 'login';
    const durStr = log.duration_seconds ? formatDuration(log.duration_seconds) : '—';

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${isTeacher ? '#eff6ff' : '#f0fdf4'};color:${isTeacher ? '#1d4ed8' : '#15803d'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">
              ${isTeacher ? '👨‍🏫' : '🎓'}
            </div>
            <div>
              <div style="font-weight:800;color:#0f172a;font-size:13.5px;">${esc(log.user_email || 'Ẩn danh')}</div>
              <div style="font-size:11px;color:#64748b;">ID: ${esc((log.user_id || '').slice(0, 13))}...</div>
            </div>
          </div>
        </td>
        <td>
          <span class="abadge" style="${isTeacher ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;' : 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;'}">
            ${isTeacher ? '👨‍🏫 Giảng viên' : '🎓 Học viên'}
          </span>
        </td>
        <td>
          <span class="abadge" style="${isLogin ? 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;' : 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;'}">
            ${isLogin ? '🟢 Đăng nhập' : '🔴 Đăng xuất'}
          </span>
        </td>
        <td>
          <div style="font-size:12.5px;color:#334155;font-weight:600">${timeStr}</div>
        </td>
        <td>
          <span style="font-weight:700;color:${log.duration_seconds ? '#0284c7' : '#94a3b8'};font-size:12.5px;">
            ${durStr}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// 8. RENDER BẢNG TỔNG HỢP THEO USER (SUMMARY VIEW)
export function renderUserActivitySummaryTable() {
  const tbody = document.getElementById('user-summary-tbody');
  if (!tbody) return;

  const userMap = {};
  authLogsList.forEach(l => {
    const email = (l.user_email || 'unknown').toLowerCase();
    if (!userMap[email]) {
      userMap[email] = {
        email,
        id: l.user_id,
        user_type: l.user_type || 'student',
        totalLogins: 0,
        totalDuration: 0,
        lastLogin: null,
        firstSeen: l.timestamp
      };
    }

    if (l.event_type === 'login') {
      userMap[email].totalLogins++;
      if (!userMap[email].lastLogin || new Date(l.timestamp) > new Date(userMap[email].lastLogin)) {
        userMap[email].lastLogin = l.timestamp;
      }
    }
    if (l.duration_seconds) {
      userMap[email].totalDuration += l.duration_seconds;
    }
  });

  const users = Object.values(userMap).sort((a, b) => b.totalLogins - a.totalLogins);

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8;">📭 Chưa có thống kê tài khoản nào.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map((u, idx) => {
    const isTeacher = u.user_type === 'teacher';
    const lastLoginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : '—';
    const durStr = formatDuration(u.totalDuration);

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${isTeacher ? '#eff6ff' : '#f0fdf4'};color:${isTeacher ? '#1d4ed8' : '#15803d'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">
              ${isTeacher ? '👨‍🏫' : '🎓'}
            </div>
            <div>
              <div style="font-weight:800;color:#0f172a;font-size:13.5px;">${esc(u.email)}</div>
              <div style="font-size:11px;color:#64748b;">ID: ${esc((u.id || '').slice(0, 13))}...</div>
            </div>
          </div>
        </td>
        <td>
          <span class="abadge" style="${isTeacher ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;' : 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;'}">
            ${isTeacher ? '👨‍🏫 Giảng viên' : '🎓 Học viên'}
          </span>
        </td>
        <td>
          <span style="font-weight:800;color:#0f172a;font-size:14px;">${u.totalLogins}</span> <span style="font-size:12px;color:#64748b;">lần</span>
        </td>
        <td>
          <span style="font-weight:700;color:#0284c7;font-size:13px;">${durStr}</span>
        </td>
        <td>
          <div style="font-size:12.5px;color:#334155;font-weight:600">${lastLoginStr}</div>
        </td>
        <td style="text-align:center;">
          ${!isTeacher && u.id ? `
            <button class="action-btn-sm" onclick="window.openStudentReportModal('${esc(u.id)}')">
              📊 Hồ sơ
            </button>
          ` : '—'}
        </td>
      </tr>
    `;
  }).join('');
}

// 9. CHUYỂN ĐỔI GIỮA VIEW LỊCH SỬ SỰ KIỆN, THỐNG KÊ USER VÀ NHẬT KÝ THAO TÁC CRUD
export function switchAuthLogsSubTab(subTab) {
  currentAuthLogTab = subTab;
  const eventsView = document.getElementById('authlogs-events-view');
  const summaryView = document.getElementById('authlogs-summary-view');
  const crudView = document.getElementById('authlogs-crud-view');

  const btnEvents = document.getElementById('tab-auth-btn-events');
  const btnSummary = document.getElementById('tab-auth-btn-summary');
  const btnCrud = document.getElementById('tab-auth-btn-crud');

  if (eventsView) eventsView.style.display = 'none';
  if (summaryView) summaryView.style.display = 'none';
  if (crudView) crudView.style.display = 'none';

  [btnEvents, btnSummary, btnCrud].forEach(btn => {
    if (btn) {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
      btn.style.fontWeight = '500';
      btn.style.boxShadow = 'none';
    }
  });

  if (subTab === 'events') {
    if (eventsView) eventsView.style.display = 'block';
    if (btnEvents) {
      btnEvents.style.background = '#ffffff';
      btnEvents.style.color = '#0f172a';
      btnEvents.style.fontWeight = '700';
      btnEvents.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
    renderAuthLogsTable();
  } else if (subTab === 'summary') {
    if (summaryView) summaryView.style.display = 'block';
    if (btnSummary) {
      btnSummary.style.background = '#ffffff';
      btnSummary.style.color = '#0f172a';
      btnSummary.style.fontWeight = '700';
      btnSummary.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
    renderUserActivitySummaryTable();
  } else if (subTab === 'crud') {
    if (crudView) crudView.style.display = 'block';
    if (btnCrud) {
      btnCrud.style.background = '#ffffff';
      btnCrud.style.color = '#0f172a';
      btnCrud.style.fontWeight = '700';
      btnCrud.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
    renderTeacherActivityLogsTable();
  }
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.loadAuthLogs = loadAuthLogs;
  window.renderAuthLogsTable = renderAuthLogsTable;
  window.renderUserActivitySummaryTable = renderUserActivitySummaryTable;
  window.switchAuthLogsSubTab = switchAuthLogsSubTab;
}
