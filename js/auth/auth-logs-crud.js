/**
 * MODULE AUTH LOGS CRUD (js/auth/auth-logs-crud.js)
 * Nhật ký thao tác CRUD của Giảng viên & Xuất báo cáo CSV
 */
import { $, esc, getAuthorDisplayName } from '../common.js';
import { formatDuration } from './auth-tracker.js';
import { authLogsList } from './auth-logs-ui.js';

export function renderTeacherActivityLogsTable() {
  const tbody = document.getElementById('teacher-crud-logs-tbody');
  if (!tbody) return;

  let rawLogs = [];
  try {
    const raw = localStorage.getItem('educore_teacher_activity_logs');
    if (raw) rawLogs = JSON.parse(raw);
  } catch(e){}

  const q = ($('flt-auth-search')?.value || '').trim().toLowerCase();
  const timeFlt = $('flt-auth-time')?.value || 'all';

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let filtered = rawLogs.filter(log => {
    const name = (log.actor_name || '').toLowerCase();
    const email = (log.actor_email || '').toLowerCase();
    const act = (log.action_type || '').toLowerCase();
    const target = (log.target_type || '').toLowerCase();
    const targetName = (log.target_name || '').toLowerCase();
    const details = (log.details || '').toLowerCase();

    if (q && !name.includes(q) && !email.includes(q) && !act.includes(q) && !target.includes(q) && !targetName.includes(q) && !details.includes(q)) {
      return false;
    }

    if (timeFlt !== 'all' && log.timestamp) {
      const logTs = new Date(log.timestamp).getTime();
      if (timeFlt === 'today' && logTs < startOfToday.getTime()) return false;
      if (timeFlt === '7days' && logTs < now - 7 * 24 * 60 * 60 * 1000) return false;
      if (timeFlt === '30days' && logTs < now - 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8;">📭 Chưa có thao tác CRUD nào được ghi nhận khớp với bộ lọc.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((log, idx) => {
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—';
    const isRoot = (log.actor_email || '').toLowerCase() === 'nam3010hcm@gmail.com' || log.actor_role === 'root' || log.actor_role === 'admin';
    const act = log.action_type || 'Thao tác';

    let actBadgeStyle = 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;';
    let actIcon = '⚡';
    if (act.includes('Tạo mới') || act.includes('Giao bài')) {
      actBadgeStyle = 'background:#ecfdf5;color:#15803d;border:1px solid #bbf7d0;';
      actIcon = '➕';
    } else if (act.includes('Cập nhật') || act.includes('Mở')) {
      actBadgeStyle = 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;';
      actIcon = '✏️';
    } else if (act.includes('Xóa')) {
      actBadgeStyle = 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;';
      actIcon = '🗑️';
    } else if (act.includes('Khóa')) {
      actBadgeStyle = 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;';
      actIcon = '🔒';
    } else if (act.includes('Import') || act.includes('Nhập')) {
      actBadgeStyle = 'background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;';
      actIcon = '📥';
    }

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${isRoot ? '#fef3c7' : '#eff6ff'};color:${isRoot ? '#92400e' : '#1d4ed8'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${isRoot ? '👑' : '👨‍🏫'}
            </div>
            <div>
              <div style="font-weight:800;color:#0f172a;font-size:13.5px;">${esc(log.actor_name || getAuthorDisplayName(log.actor_email))}</div>
              <div style="font-size:11px;color:#64748b;">${esc(log.actor_email || '')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="abadge" style="${isRoot ? 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;' : 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;'}">
            ${isRoot ? '👑 Root Admin' : '👨‍🏫 Giảng viên'}
          </span>
        </td>
        <td>
          <span class="abadge" style="${actBadgeStyle}">
            ${actIcon} ${esc(act)}
          </span>
        </td>
        <td>
          <span class="cat-badge" style="background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;font-weight:700;">
            ${esc(log.target_type || 'Hệ thống')}
          </span>
        </td>
        <td>
          <div style="font-weight:700;color:#0f172a;font-size:13px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(log.target_name || '')}">
            ${esc(log.target_name || '—')}
          </div>
          ${log.details ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(log.details)}</div>` : ''}
        </td>
        <td>
          <div style="font-size:12.5px;color:#334155;font-weight:600">${timeStr}</div>
        </td>
      </tr>
    `;
  }).join('');
}

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

if (typeof window !== 'undefined') {
  window.renderTeacherActivityLogsTable = renderTeacherActivityLogsTable;
  window.exportAuthLogsCSV = exportAuthLogsCSV;
}
