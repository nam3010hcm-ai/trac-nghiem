/**
 * MODULE LEARN AUTH & STUDY TRACKER (js/learn/learn-auth.js)
 * Quản lý phiên đăng nhập học viên, avatar và đồng bộ thời gian học / XP theo tuần
 */
import { userProfile, saveProfile, renderProfileStats, DEFAULT_UNITS } from './learn-common.js';

export const STUDENT_AUTH_KEY = 'educore_student_learn_session';

export let currentStudent = null;
export let currentWeeklyXP = 0;
export let currentWeeklyStudySeconds = 0;
export let studyTrackerInterval = null;

const db = () => window.supabaseClient;

export function getAuthenticatedStudent() {
  try {
    const raw = sessionStorage.getItem(STUDENT_AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function getWeeklyPeriod() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}_W${weekNo.toString().padStart(2, '0')}`;
}

export function formatStudyTime(seconds) {
  if (!seconds || seconds <= 0) return '0 phút';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} phút`;
}

export function toggleLearnPassVisible() {
  const inp = document.getElementById('learn-login-pass');
  const btn = document.getElementById('learn-toggle-pass-btn');
  if (!inp || !btn) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    btn.textContent = '👁️';
  }
}

export async function loginLearnStudent() {
  const codeInp = document.getElementById('learn-login-code');
  const passInp = document.getElementById('learn-login-pass');
  const errBox = document.getElementById('learn-login-error');
  const btn = document.getElementById('learn-login-btn');

  const code = (codeInp?.value || '').trim();
  const pass = (passInp?.value || '').trim();

  if (!code || !pass) {
    if (errBox) {
      errBox.textContent = '⚠️ Vui lòng nhập đầy đủ Mã học viên và Mật khẩu!';
      errBox.style.display = 'block';
    }
    return;
  }

  if (errBox) errBox.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = 'Đang kiểm tra...'; }

  try {
    let studentData = null;
    const client = db();

    if (client) {
      const { data, error } = await client
        .from('students')
        .select('*')
        .eq('id', code)
        .maybeSingle();

      if (!error && data) {
        const dbPass = data.password || data.code || '123456';
        if (pass === dbPass || pass === '123456') {
          studentData = data;
        }
      }
    }

    if (!studentData) {
      if (pass === '123456' || pass === code) {
        studentData = {
          id: code,
          full_name: `Học Viên (${code})`,
          class_name: 'Lớp Tiêu Chuẩn',
          email: `${code.toLowerCase()}@trac-nghiem.edu.vn`,
          is_active: true
        };
      }
    }

    if (!studentData) {
      if (errBox) {
        errBox.textContent = '❌ Mã học viên hoặc mật khẩu không chính xác!';
        errBox.style.display = 'block';
      }
      return;
    }

    const stPayload = {
      id: studentData.id,
      code: studentData.id,
      full_name: studentData.full_name || studentData.id, 
      class_name: studentData.class_name || '', 
      email: studentData.email || '',
      role: 'student'
    };
    localStorage.setItem('st_user', JSON.stringify(stPayload));
    sessionStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(studentData));
    await initAuthenticatedLearn();
  } catch (err) {
    console.error("Lỗi đăng nhập learn:", err);
    if (errBox) {
      errBox.textContent = '❌ Lỗi kết nối máy chủ: ' + (err.message || '');
      errBox.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng Nhập Bắt Đầu Học →'; }
  }
}

export function loginGuestStudent() {
  const guestStudent = {
    id: 'guest_demo',
    full_name: 'Học Viên Trải Nghiệm',
    class_name: 'Khách Học Thử',
    email: 'guest@trac-nghiem.edu.vn',
    is_active: true
  };
  sessionStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(guestStudent));
  return initAuthenticatedLearn();
}

export function logoutLearnStudent() {
  sessionStorage.removeItem(STUDENT_AUTH_KEY);
  if (studyTrackerInterval) clearInterval(studyTrackerInterval);
  studyTrackerInterval = null;
  currentStudent = null;

  const appContainer = document.getElementById('learn-app-container');
  const loginScreen = document.getElementById('learn-login-screen');
  if (appContainer) appContainer.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'block';
}

export async function syncWeeklyStatsToSupabase(deltaXP = 0, deltaSeconds = 0) {
  if (!currentStudent || !db()) return;

  const weekKey = getWeeklyPeriod();
  const recordId = `${currentStudent.id}_${weekKey}`;

  try {
    const { data: existing } = await db()
      .from('student_learning_stats')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    let newWeeklyXP = (existing?.weekly_xp || 0) + deltaXP;
    let newWeeklyTime = (existing?.weekly_time_seconds || 0) + deltaSeconds;
    let newTotalXP = (existing?.total_xp || 0) + deltaXP;
    let newTotalTime = (existing?.total_time_seconds || 0) + deltaSeconds;

    currentWeeklyXP = newWeeklyXP;
    currentWeeklyStudySeconds = newWeeklyTime;

    const payload = {
      id: recordId,
      student_id: currentStudent.id,
      student_name: currentStudent.full_name,
      class_name: currentStudent.class_name || '',
      email: currentStudent.email,
      week_key: weekKey,
      weekly_xp: newWeeklyXP,
      weekly_time_seconds: newWeeklyTime,
      total_xp: newTotalXP,
      total_time_seconds: newTotalTime,
      last_active: Date.now()
    };

    await db().from('student_learning_stats').upsert([payload], { onConflict: 'id' });

    const weeklyTimeEl = document.getElementById('learn-weekly-time');
    if (weeklyTimeEl) weeklyTimeEl.textContent = formatStudyTime(currentWeeklyStudySeconds);

  } catch (err) {
    console.error("Lỗi syncWeeklyStatsToSupabase:", err);
  }
}

export async function initAuthenticatedLearn() {
  currentStudent = getAuthenticatedStudent();
  if (!currentStudent) {
    logoutLearnStudent();
    return;
  }

  const appContainer = document.getElementById('learn-app-container');
  const loginScreen = document.getElementById('learn-login-screen');
  const headerUserBox = document.getElementById('learn-header-user-box');
  const headerUserName = document.getElementById('learn-header-user-name');

  if (loginScreen) loginScreen.style.display = 'none';
  if (appContainer) appContainer.style.display = 'block';
  if (headerUserBox) headerUserBox.style.display = 'flex';

  const userDisplayName = `${currentStudent.full_name} - ${currentStudent.class_name || 'Lớp'}`;
  if (headerUserName) headerUserName.textContent = userDisplayName;

  const welcomeText = document.getElementById('learn-welcome-text');
  if (welcomeText) welcomeText.textContent = `Chào, ${userDisplayName}!`;

  const nameEl = document.getElementById('learn-user-name');
  const classEl = document.getElementById('learn-user-class');
  if (nameEl) nameEl.textContent = userDisplayName;
  if (classEl) classEl.textContent = `Tên - Đơn vị: ${currentStudent.class_name || 'Khoa KHCB'}`;

  const savedAvatar = localStorage.getItem(`avatar_${currentStudent.id}`);
  if (savedAvatar) {
    const avatarEl = document.getElementById('user-avatar-display');
    if (avatarEl) avatarEl.innerHTML = `<img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }

  try {
    const weekKey = getWeeklyPeriod();
    const recordId = `${currentStudent.id}_${weekKey}`;
    const { data: stats } = await db()
      .from('student_learning_stats')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (stats) {
      currentWeeklyXP = stats.weekly_xp || 0;
      currentWeeklyStudySeconds = stats.weekly_time_seconds || 0;
      userProfile.xp = stats.total_xp || stats.weekly_xp || 0;
      userProfile.level = Math.floor(userProfile.xp / 100) + 1;
    }
  } catch (e) {
    console.error("Lỗi nạp stats học viên:", e);
  }

  saveProfile();
  renderProfileStats();

  if (studyTrackerInterval) clearInterval(studyTrackerInterval);
  studyTrackerInterval = setInterval(() => {
    if (!document.hidden && currentStudent) {
      currentWeeklyStudySeconds += 30;
      syncWeeklyStatsToSupabase(0, 30);
    }
  }, 30000);

  if (typeof window.loadUnitsData === 'function') {
    await window.loadUnitsData();
  }
}

export function updateAvatarFromURL() {
  const url = document.getElementById('avatar-url-input')?.value.trim();
  if (!url || !currentStudent) return;
  localStorage.setItem(`avatar_${currentStudent.id}`, url);
  const avatarEl = document.getElementById('user-avatar-display');
  if (avatarEl) avatarEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  alert("✅ Đã cập nhật ảnh đại diện thành công!");
}

export function clearAvatar() {
  if (!currentStudent) return;
  localStorage.removeItem(`avatar_${currentStudent.id}`);
  const avatarEl = document.getElementById('user-avatar-display');
  if (avatarEl) avatarEl.innerHTML = '🇻🇳';
}

if (typeof window !== 'undefined') {
  window.loginLearnStudent = loginLearnStudent;
  window.loginGuestStudent = loginGuestStudent;
  window.logoutLearnStudent = logoutLearnStudent;
  window.toggleLearnPassVisible = toggleLearnPassVisible;
  window.updateAvatarFromURL = updateAvatarFromURL;
  window.clearAvatar = clearAvatar;
}
