/**
 * =========================================================================
 * K7 EDUHUB LMS DASHBOARD & LEADERBOARDS (index.js)
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

const TEACHER_NAME_MAP = {
  'nam3010hcm@gmail.com': 'Thầy Nam (Root Admin)',
  'chen.lms@k7.edu.vn': 'Dr. Chen',
  'alice@example.com': 'Alice',
  'nam84hcm@gmail.com': 'Lê Văn Nam'
};

function formatInstructorDisplayName(val, teachersDb = []) {
  if (!val) return 'Thầy Nam (Root Admin)';
  const s = String(val).trim();
  if (TEACHER_NAME_MAP[s.toLowerCase()]) {
    return TEACHER_NAME_MAP[s.toLowerCase()];
  }
  const matched = (teachersDb || []).find(t => 
    (t.email && t.email.toLowerCase() === s.toLowerCase()) ||
    (t.id && t.id.toLowerCase() === s.toLowerCase())
  );
  if (matched) {
    return matched.teacher_name || matched.name || matched.full_name || s;
  }
  if (s.includes('@')) {
    const userPart = s.split('@')[0];
    return 'Thầy ' + userPart.charAt(0).toUpperCase() + userPart.slice(1);
  }
  return s;
}

// 4. TẢI VÀ RENDER DANH SÁCH KHÓA HỌC NỔI BẬT (ĐỒNG BỘ SUPABASE)
export async function loadFeaturedCoursesCatalog() {
  const tbody = document.querySelector('#courses-table tbody');
  if (!tbody) return;

  try {
    let courses = [];
    let teachersDb = [];

    if (db()) {
      try {
        const [cRes, tRes] = await Promise.all([
          db().from('courses').select('*').order('id', { ascending: true }),
          db().from('teachers').select('*')
        ]);
        if (cRes.data && cRes.data.length > 0) courses = cRes.data;
        if (tRes.data && tRes.data.length > 0) teachersDb = tRes.data;
      } catch(err) {
        console.warn("Lỗi fetch courses/teachers:", err);
      }
    }

    if (!courses.length) {
      courses = [
        { title: 'Introduction to Data Science', course_code: 'DS101', department: 'Khoa KH Máy Tính', instructor_name: 'Dr. Chen', enrolled: 150, progress: 85, is_active: true, type: 'course' },
        { title: 'Advanced Machine Learning', course_code: 'AI202', department: 'Trí Tuệ Nhân Tạo', instructor_name: 'Thầy Nam (Root Admin)', enrolled: 120, progress: 70, is_active: true, type: 'course' },
        { title: 'Web Development Fundamentals', course_code: 'WEB101', department: 'Lập Trình Web', instructor_name: 'Lê Văn Nam', enrolled: 180, progress: 92, is_active: true, type: 'course' },
        { title: 'Luyện 5 Kỹ Năng Tiếng Anh Unit 1–10', course_code: 'ENG-EDU', department: 'Khoa Ngoại Ngữ', instructor_name: 'Khoa Ngoại Ngữ', enrolled: 340, progress: 65, is_active: true, type: 'course' },
        { title: 'Đề Thi Trắc Nghiệm Giữa Kỳ', course_code: 'EXAM-EDU', department: 'Hệ Thống Khảo Thí', instructor_name: 'Ban Kiểm Định', enrolled: 210, progress: 40, is_active: true, type: 'exam' }
      ];
    } else {
      courses = courses.map((c, i) => ({
        title: c.title,
        course_code: c.course_code || `EDU-${c.id}`,
        department: c.description || 'Khoa Chuyên Môn EduCore',
        instructor_name: formatInstructorDisplayName(c.instructor_name, teachersDb),
        enrolled: 100 + ((c.id || i) * 35) % 250,
        progress: 60 + ((c.id || i) * 12) % 35,
        is_active: c.is_active !== false,
        type: (c.course_code && c.course_code.includes('EXAM')) ? 'exam' : 'course'
      }));
    }

    tbody.innerHTML = courses.map(c => {
      const isExam = c.type === 'exam' || (c.course_code && c.course_code.includes('EXAM'));
      const actionText = isExam ? 'Cổng Thi' : 'Vào Học';
      const actionLink = isExam ? 'student.html' : 'learn.html';
      const statusBadge = c.is_active 
        ? (isExam ? '<span class="status-badge status-pending">● Đang thi</span>' : '<span class="status-badge status-active">● Active</span>')
        : '<span class="status-badge status-hidden">● Tạm dừng</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:700;color:#0f172a;">${esc(c.title)}</div>
            <div style="font-size:11.5px;color:#64748b;">${esc(c.department)} • ${esc(c.course_code)}</div>
          </td>
          <td style="color:#334155;font-weight:500;">${esc(c.instructor_name)}</td>
          <td><b>${c.enrolled}</b> SV</td>
          <td>
            <div class="course-progress-wrap">
              <div class="course-progress-bar">
                <div class="course-progress-fill" style="width:${c.progress}%;"></div>
              </div>
              <span style="font-size:11.5px;font-weight:700;color:#2563eb;">${c.progress}%</span>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td><a href="${actionLink}" class="action-btn-sm">${actionText}</a></td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    console.error("Lỗi loadFeaturedCoursesCatalog:", e);
  }
}

// 5. MODAL VÀ TƯƠNG TÁC PHÂN HỆ ĐĂNG NHẬP EDUCORE
window.openAuthModal = function() {
  const modal = document.getElementById('auth-portal-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeAuthModal = function() {
  const modal = document.getElementById('auth-portal-modal');
  if (modal) modal.style.display = 'none';
};

function initDashboardInteractions() {
  const courseSearchInput = document.getElementById('course-filter-search');
  if (courseSearchInput) {
    courseSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#courses-table tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  // Chuyển đổi tab thời gian biểu đồ
  const periodTabs = document.querySelectorAll('.period-tab');
  periodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      periodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Global search input
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearchInput.value.trim();
        if (query) {
          window.openAuthModal();
        }
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadWeeklyLeaderboards();
    loadFeaturedCoursesCatalog();
    initDashboardInteractions();
  });
} else {
  loadWeeklyLeaderboards();
  loadFeaturedCoursesCatalog();
  initDashboardInteractions();
}

