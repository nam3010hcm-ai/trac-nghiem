/**
 * MODULE STUDENT REPORTS & TOP 10 RANKING (js/auth/student-reports.js)
 * Tính toán Top 10 học viên tuần & Modal xem hồ sơ chi tiết
 */
import { esc } from '../common.js';
import { getWeeklyPeriod, formatDuration } from './auth-tracker.js';

const db = () => window.supabaseClient;

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
