/**
 * =========================================================================
 * TRANG CHỦ & BẢNG VINH DANH HỌC TẬP TUẦN (index.js)
 * Weekly Top XP & Top Study Time Leaderboards (Monday to Sunday)
 * =========================================================================
 */

const db = () => window.supabaseClient;

// 1. TÍNH TOÁN KHOẢNG THỜI GIAN TUẦN HIỆN TẠI (THỨ 2 ĐẾN CHỦ NHẬT)
export function getWeeklyPeriod() {
  const now = new Date();
  const day = now.getDay(); // 0: CN, 1: T2, 2: T3, ..., 6: T7
  const diffToMonday = (day + 6) % 7; // Số ngày lùi về Thứ 2
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mStr = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
  const sStr = `${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}/${sunday.getFullYear()}`;
  
  const weekKey = `week_${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  return { monday, sunday, label: `Từ Thứ Hai ${mStr} đến Chủ Nhật ${sStr}`, weekKey };
}

// 2. FORMAT THỜI GIAN HỌC SANG GIỜ & PHÚT
export function formatStudyTime(seconds = 0) {
  if (!seconds || seconds <= 0) return '0 phút';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} giờ ${remMins > 0 ? remMins + ' phút' : ''}`;
}

// 3. TẢI VÀ RENDER BẢNG VINH DANH TUẦN
export async function loadWeeklyLeaderboards() {
  const period = getWeeklyPeriod();
  const dateLabelEl = document.getElementById('leaderboard-date-label');
  if (dateLabelEl) dateLabelEl.textContent = period.label;

  const xpListEl = document.getElementById('top-xp-list');
  const timeListEl = document.getElementById('top-time-list');

  try {
    if (!db()) {
      renderEmptyLeaderboards('Chưa kết nối cơ sở dữ liệu Supabase.');
      return;
    }

    // Truy vấn dữ liệu tuần hiện tại
    const { data, error } = await db()
      .from('student_learning_stats')
      .select('*')
      .eq('week_key', period.week_key);

    if (error || !data || data.length === 0) {
      renderEmptyLeaderboards('Chưa có dữ liệu học tập trong tuần này. Hãy là người đầu tiên tham gia học tập để vinh danh!');
      return;
    }

    // 1. TOP 10 ĐIỂM SỐ (XP)
    const topXP = [...data]
      .filter(s => (s.weekly_xp || 0) > 0)
      .sort((a, b) => (b.weekly_xp || 0) - (a.weekly_xp || 0))
      .slice(0, 10);

    // 2. TOP 10 THỜI GIAN HỌC
    const topTime = [...data]
      .filter(s => (s.weekly_time_seconds || 0) > 0)
      .sort((a, b) => (b.weekly_time_seconds || 0) - (a.weekly_time_seconds || 0))
      .slice(0, 10);

    renderXPLeaderboard(topXP, xpListEl);
    renderTimeLeaderboard(topTime, timeListEl);

  } catch (err) {
    console.error("Lỗi loadWeeklyLeaderboards:", err);
    renderEmptyLeaderboards('Đang nạp bảng vinh danh...');
  }
}

function renderEmptyLeaderboards(msg) {
  const xpListEl = document.getElementById('top-xp-list');
  const timeListEl = document.getElementById('top-time-list');
  const html = `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13.5px">${msg}</div>`;
  if (xpListEl) xpListEl.innerHTML = html;
  if (timeListEl) timeListEl.innerHTML = html;
}

function getRankBadge(rank) {
  if (rank === 1) return '<span style="font-size:20px" title="Hạng Nhất">🥇</span>';
  if (rank === 2) return '<span style="font-size:20px" title="Hạng Nhì">🥈</span>';
  if (rank === 3) return '<span style="font-size:20px" title="Hạng Ba">🥉</span>';
  return `<span class="rank-number">#${rank}</span>`;
}

function renderXPLeaderboard(list, container) {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13.5px">Chưa có lượt học tích lũy điểm XP tuần này.</div>';
    return;
  }

  container.innerHTML = list.map((st, idx) => {
    const rank = idx + 1;
    const isTop3 = rank <= 3;
    return `
      <div class="lb-row ${isTop3 ? 'lb-top' : ''}">
        <div class="lb-rank">${getRankBadge(rank)}</div>
        <div class="lb-avatar">${isTop3 ? '🌟' : '🧑‍🎓'}</div>
        <div class="lb-info">
          <div class="lb-name">${esc(st.student_name)}</div>
          <div class="lb-sub">Lớp: <b>${esc(st.class_name || 'N/A')}</b> • Mã: ${esc(st.student_id)}</div>
        </div>
        <div class="lb-score xp-score">
          <span>⭐</span>
          <b>${st.weekly_xp || 0}</b> <small>XP</small>
        </div>
      </div>
    `;
  }).join('');
}

function renderTimeLeaderboard(list, container) {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13.5px">Chưa có thời gian học tích lũy tuần này.</div>';
    return;
  }

  container.innerHTML = list.map((st, idx) => {
    const rank = idx + 1;
    const isTop3 = rank <= 3;
    return `
      <div class="lb-row ${isTop3 ? 'lb-top' : ''}">
        <div class="lb-rank">${getRankBadge(rank)}</div>
        <div class="lb-avatar">${isTop3 ? '🔥' : '⏱️'}</div>
        <div class="lb-info">
          <div class="lb-name">${esc(st.student_name)}</div>
          <div class="lb-sub">Lớp: <b>${esc(st.class_name || 'N/A')}</b> • Mã: ${esc(st.student_id)}</div>
        </div>
        <div class="lb-score time-score">
          <b>${formatStudyTime(st.weekly_time_seconds || 0)}</b>
        </div>
      </div>
    `;
  }).join('');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

document.addEventListener('DOMContentLoaded', () => {
  loadWeeklyLeaderboards();
});
