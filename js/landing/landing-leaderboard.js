/**
 * MODULE LANDING LEADERBOARDS (js/landing/landing-leaderboard.js)
 * Bảng vinh danh Top XP & Top Thời lượng học tập tuần (Monday to Sunday)
 */
import { esc } from '../common.js';

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

    // 1. Nạp dữ liệu student_learning_stats tuần hiện tại
    const { data: dbStats } = await db()
      .from('student_learning_stats')
      .select('*')
      .eq('week_key', period.weekKey);

    // 2. Nạp thêm kết quả thi từ bảng results và danh sách học viên
    const { data: dbResults } = await db()
      .from('results')
      .select('*');

    const { data: dbStudents } = await db()
      .from('students')
      .select('*');

    const mondayTs = period.monday.getTime();
    const sundayTs = period.sunday.getTime();

    const studentMap = {};

    // Khởi tạo từ danh sách học viên
    (dbStudents || []).forEach(st => {
      studentMap[st.id] = {
        student_id: st.id,
        student_name: st.full_name || st.student_name || st.id,
        class_name: st.class_name || 'K7',
        weekly_xp: st.total_xp || 0,
        weekly_time_seconds: 0
      };
    });

    // Cộng dồn từ bảng results trong tuần
    (dbResults || []).forEach(r => {
      const rTime = r.timestamp || (r.at ? new Date(r.at).getTime() : 0);
      if (rTime >= mondayTs && rTime <= sundayTs) {
        const sid = r.sid || r.student;
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student_id: sid,
            student_name: r.student || sid,
            class_name: r.cohort || 'K7',
            weekly_xp: 0,
            weekly_time_seconds: 0
          };
        }
        const scoreVal = parseFloat(r.manual_score ?? r.score) || 0;
        studentMap[sid].weekly_xp += Math.round(scoreVal * 10);
        studentMap[sid].weekly_time_seconds += (r.time || 0);
      }
    });

    // Cộng dồn từ bảng student_learning_stats
    (dbStats || []).forEach(st => {
      if (studentMap[st.student_id]) {
        studentMap[st.student_id].weekly_xp = Math.max(studentMap[st.student_id].weekly_xp, st.weekly_xp || 0);
        studentMap[st.student_id].weekly_time_seconds = Math.max(studentMap[st.student_id].weekly_time_seconds, st.weekly_time_seconds || 0);
      } else {
        studentMap[st.student_id] = {
          student_id: st.student_id,
          student_name: st.student_name,
          class_name: st.class_name,
          weekly_xp: st.weekly_xp || 0,
          weekly_time_seconds: st.weekly_time_seconds || 0
        };
      }
    });

    const combinedList = Object.values(studentMap);

    // 1. TOP 10 ĐIỂM SỐ (XP)
    const topXP = [...combinedList]
      .filter(s => (s.weekly_xp || 0) > 0)
      .sort((a, b) => (b.weekly_xp || 0) - (a.weekly_xp || 0))
      .slice(0, 10);

    // 2. TOP 10 THỜI GIAN HỌC
    const topTime = [...combinedList]
      .filter(s => (s.weekly_time_seconds || 0) > 0)
      .sort((a, b) => (b.weekly_time_seconds || 0) - (a.weekly_time_seconds || 0))
      .slice(0, 10);

    if (!topXP.length && !topTime.length) {
      renderEmptyLeaderboards('Chưa có dữ liệu học tập trong tuần này. Hãy là người đầu tiên tham gia làm bài để được vinh danh!');
      return;
    }

    renderXPLeaderboard(topXP, xpListEl);
    renderTimeLeaderboard(topTime, timeListEl);

  } catch (err) {
    console.error("Lỗi loadWeeklyLeaderboards:", err);
    renderEmptyLeaderboards('Đang nạp bảng vinh danh...');
  }
}
