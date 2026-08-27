/**
 * =========================================================================
 * INTERACTIVE ENGLISH LEARNING HUB - JAVASCRIPT CONTROLLER (learn.js)
 * Real-time Unit Loading & 5 Skills Execution Engine
 * =========================================================================
 */

import { LEARN_DATA, DEFAULT_UNITS } from './learn-data.js';
import { renderRich, typesetMath, renderGlobalHeaderProfile, esc, KEYS } from './common.js';

const db = () => window.supabaseClient;

// --- UNITS & SKILLS STATE ---
let allUnits = [];
let currentUnit = null;
let currentSkillTab = 'listening';
let currentSubject = '';
let currentModule = '';
let currentLisLesson = null;
let currentPlaybackSpeed = 1.0;
let currentReadLesson = null;
let currentSpkLesson = null;
let isRecording = false;
let speechRecognizer = null;
let currentWrtCategory = 'scramble';
let currentCardIdx = 0;
let matchSelectedLeft = null;
let matchSelectedRight = null;
let matchedCount = 0;

export function selectUnitTile(unitId) {
  const chosen = allUnits.find(u => u.id === unitId);
  if (chosen) {
    currentUnit = chosen;
    updateBreadcrumbs();
    loadCurrentUnitView();
  }
}
window.selectUnitTile = selectUnitTile;

// --- GAMIFICATION STATE ---
const STORE_KEY = 'quiz_learn_profile_v1';
let userProfile = {
  xp: 0,
  level: 1,
  streak: 1,
  lastActiveDate: new Date().toDateString(),
  completedExercises: []
};

// --- AUDIO CONTEXT SOUND ENGINE ---
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type, duration, startTime = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  } catch (e) {}
}

export function playSuccessSound() {
  playTone(523.25, 'sine', 0.15, 0);       // C5
  playTone(659.25, 'sine', 0.15, 0.1);     // E5
  playTone(783.99, 'sine', 0.25, 0.2);     // G5
}

export function playWrongSound() {
  playTone(220, 'sawtooth', 0.25, 0);     // A3
  playTone(196, 'sawtooth', 0.35, 0.15);  // G3
}

export function playLevelUpSound() {
  playTone(440, 'triangle', 0.12, 0);
  playTone(554.37, 'triangle', 0.12, 0.1);
  playTone(659.25, 'triangle', 0.12, 0.2);
  playTone(880, 'triangle', 0.4, 0.3);
}

// --- HIGH-QUALITY NATURAL SPEECH SYNTHESIS ENGINE (TTS) ---
let cachedVoices = [];
function initVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  cachedVoices = window.speechSynthesis.getVoices() || [];
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    };
  }
}
initVoices();

export function getBestNaturalVoice(gender = 'neutral', lang = 'en') {
  if (!window.speechSynthesis) return null;
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices() || [];
  
  const enVoices = cachedVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  if (!enVoices.length) return cachedVoices[0] || null;

  const femaleKeywords = ['jenny', 'aria', 'michelle', 'sonia', 'female', 'samantha', 'ava', 'serena', 'karen', 'victoria', 'moira', 'zira', 'emma'];
  const maleKeywords = ['guy', 'christopher', 'ryan', 'eric', 'male', 'daniel', 'oliver', 'tom', 'alex', 'david', 'george', 'mark', 'andrew'];

  // 1. Nếu yêu cầu giọng Nữ (Female)
  if (gender === 'female') {
    const fNatural = enVoices.find(v => (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Enhanced')) && femaleKeywords.some(k => v.name.toLowerCase().includes(k)));
    if (fNatural) return fNatural;
    const fAny = enVoices.find(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k)));
    if (fAny) return fAny;
  } 
  // 2. Nếu yêu cầu giọng Nam (Male)
  else if (gender === 'male') {
    const mNatural = enVoices.find(v => (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Enhanced')) && maleKeywords.some(k => v.name.toLowerCase().includes(k)));
    if (mNatural) return mNatural;
    const mAny = enVoices.find(v => maleKeywords.some(k => v.name.toLowerCase().includes(k)));
    if (mAny) return mAny;
  }

  // 3. Fallback: Chọn bất kỳ giọng Natural / Neural / Enhanced / Google nào
  const premiumVoice = enVoices.find(v => 
    v.name.includes('Natural') || 
    v.name.includes('Online') || 
    v.name.includes('Neural') || 
    v.name.includes('Google') || 
    v.name.includes('Enhanced') ||
    v.name.includes('Samantha') ||
    v.name.includes('Daniel')
  );

  return premiumVoice || enVoices[0] || cachedVoices[0] || null;
}

export function speakText(text, options = {}) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();

  const gender = typeof options === 'string' ? options : (options.gender || 'neutral');
  const rate = (typeof options === 'object' && options.rate) ? options.rate : 0.92;
  const pitch = (typeof options === 'object' && options.pitch) ? options.pitch : (gender === 'female' ? 1.04 : gender === 'male' ? 0.94 : 1.0);
  const lang = (typeof options === 'object' && options.lang) || 'en-US';
  const onEnd = typeof options === 'object' ? options.onEnd : null;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;
  utter.pitch = pitch;

  const voice = getBestNaturalVoice(gender, 'en');
  if (voice) utter.voice = voice;

  if (onEnd) {
    utter.onend = () => onEnd();
    utter.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utter);
}

// --- CONFETTI ENGINE ---
export function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      p.rotation += p.rSpeed;
      if (p.y < canvas.height) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

// --- STUDENT AUTHENTICATION & WEEKLY STATS TRACKING ---
const STUDENT_AUTH_KEY = 'quiz_student_auth_session_v1';
let currentStudent = null;
let currentWeeklyStudySeconds = 0;
let currentWeeklyXP = 0;
let studyTrackerInterval = null;

export function getWeeklyPeriod() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return `week_${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function formatStudyTime(seconds = 0) {
  if (!seconds || seconds <= 0) return '0 phút';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} giờ ${remMins > 0 ? remMins + ' phút' : ''}`;
}

export function getAuthenticatedStudent() {
  try {
    const raw = sessionStorage.getItem(STUDENT_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function toggleLearnPassVisible() {
  const input = document.getElementById('learn-auth-pass');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

export async function loginLearnStudent() {
  const emailInput = document.getElementById('learn-auth-email')?.value.trim();
  const pass = document.getElementById('learn-auth-pass')?.value.trim();
  const errBox = document.getElementById('learn-login-err');
  const btn = document.getElementById('btn-learn-login');

  if (errBox) errBox.style.display = 'none';

  if (!emailInput || !pass) {
    if (errBox) {
      errBox.textContent = 'Vui lòng nhập đầy đủ Email / Mã SV và Mật khẩu!';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Đang xác thực...'; }

  try {
    let studentData = null;

    if (db()) {
      const { data, error } = await db()
        .from('students')
        .select('*')
        .or(`email.ilike.${emailInput},id.eq.${emailInput}`)
        .eq('password', pass)
        .maybeSingle();

      if (!error && data) {
        studentData = data;
      }
    }

    if (!studentData) {
      if (errBox) {
        errBox.textContent = '❌ Email / Mã SV hoặc mật khẩu không chính xác!';
        errBox.style.display = 'block';
      }
      return;
    }

    if (studentData.is_active === false) {
      if (errBox) {
        errBox.textContent = '⛔ Tài khoản học viên của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!';
        errBox.style.display = 'block';
      }
      return;
    }

    // Đăng nhập thành công
    const stPayload = { 
      sid: studentData.id, 
      id: studentData.id, 
      name: studentData.full_name || studentData.id, 
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
window.loginGuestStudent = loginGuestStudent;

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

async function syncWeeklyStatsToSupabase(deltaXP = 0, deltaSeconds = 0) {
  if (!currentStudent || !db()) return;

  const weekKey = getWeeklyPeriod();
  const recordId = `${currentStudent.id}_${weekKey}`;

  try {
    // 1. Kiểm tra bản ghi tuần hiện tại
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

async function initAuthenticatedLearn() {
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

  if (typeof renderGlobalHeaderProfile === 'function') {
    renderGlobalHeaderProfile();
  }

  // Nạp ảnh đại diện từ localStorage nếu có
  const savedAvatar = localStorage.getItem(`avatar_${currentStudent.id}`);
  if (savedAvatar) {
    const avatarEl = document.getElementById('user-avatar-display');
    if (avatarEl) avatarEl.innerHTML = `<img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }

  // Nạp thống kê tuần hiện tại từ Supabase
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

  loadProfile();

  // Khởi chạy bộ theo dõi thời gian học thực tế mỗi 30 giây
  if (studyTrackerInterval) clearInterval(studyTrackerInterval);
  studyTrackerInterval = setInterval(() => {
    if (!document.hidden && currentStudent) {
      currentWeeklyStudySeconds += 30;
      syncWeeklyStatsToSupabase(0, 30);
    }
  }, 30000);

  await loadUnitsData();
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

window.updateAvatarFromURL = updateAvatarFromURL;
window.clearAvatar = clearAvatar;

window.toggleLearnPassVisible = toggleLearnPassVisible;
window.loginLearnStudent = loginLearnStudent;
window.logoutLearnStudent = logoutLearnStudent;

// --- PROFILE & GAMIFICATION ---
function loadProfile() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) userProfile = { ...userProfile, ...JSON.parse(saved) };
  } catch (e) {}

  const today = new Date().toDateString();
  if (userProfile.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (userProfile.lastActiveDate === yesterday.toDateString()) {
      userProfile.streak += 1;
    } else if (new Date(userProfile.lastActiveDate) < yesterday) {
      userProfile.streak = 1;
    }
    userProfile.lastActiveDate = today;
    saveProfile();
  }

  renderProfileStats();
}

function saveProfile() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(userProfile)); } catch (e) {}
}

export function addXP(amount, reason = '') {
  userProfile.xp += amount;
  currentWeeklyXP += amount;
  const oldLevel = userProfile.level;
  userProfile.level = Math.floor(userProfile.xp / 100) + 1;
  saveProfile();
  renderProfileStats();

  // Đồng bộ lên Supabase cho Bảng Vinh Danh Tuần
  syncWeeklyStatsToSupabase(amount, 0);

  if (userProfile.level > oldLevel) {
    playLevelUpSound();
    triggerConfetti();
    showToast(`🎉 CHÚC MỪNG! BẠN ĐÃ LÊN CẤP ${userProfile.level}! (+${amount} XP)`);
  } else {
    showToast(`⭐ +${amount} XP (${reason})`);
  }
}

function renderProfileStats() {
  const xpEl = document.getElementById('user-xp-val');
  const levelEl = document.getElementById('user-level-val');
  const streakEl = document.getElementById('user-streak-val');
  const xpFill = document.getElementById('user-xp-fill');

  if (xpEl) xpEl.textContent = userProfile.xp;
  if (levelEl) levelEl.textContent = `Cấp ${userProfile.level}`;
  if (streakEl) streakEl.textContent = `${userProfile.streak} ngày`;

  if (xpFill) {
    const currentLevelXP = userProfile.xp % 100;
    xpFill.style.width = `${currentLevelXP}%`;
  }
}

function showToast(msg) {
  let toast = document.getElementById('learn-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'learn-toast';
    toast.style.cssText = 'position:fixed;top:80px;right:20px;background:#1e293b;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.2);transition:0.3s;opacity:0;transform:translateY(-10px);pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
  }, 2500);
}

// =========================================================================

function safeArray(val, fallback = []) {
  let res = val;
  if (typeof val === 'string') {
    try { res = JSON.parse(val); } catch (e) { res = null; }
  }
  if (Array.isArray(res) && res.length > 0) return res;
  return fallback;
}

function safeObj(val, fallback = {}) {
  let res = val;
  if (typeof val === 'string') {
    try { res = JSON.parse(val); } catch (e) { res = null; }
  }
  if (res && typeof res === 'object' && !Array.isArray(res) && Object.keys(res).length > 0) return res;
  return fallback;
}

function getUnitSkillList(unit, skillName) {
  let list = safeArray(unit?.[skillName], []);
  const defMatch = DEFAULT_UNITS.find(d => d.id === unit?.id) || (unit?.subject?.includes('Tiếng Anh') ? DEFAULT_UNITS[0] : null);

  if (!list.length) {
    list = safeArray(defMatch?.[skillName], []);
  } else if (skillName === 'speaking' && defMatch?.speaking) {
    // Tự động nạp bổ sung các bài Video Roleplay đa nhân vật từ mẫu nếu chưa có trong DB
    defMatch.speaking.forEach(defItem => {
      if (!list.some(item => item.id === defItem.id || item.title === defItem.title)) {
        list.unshift(defItem);
      }
    });
  }

  if (!list.length && DEFAULT_UNITS[0]?.[skillName]) {
    list = safeArray(DEFAULT_UNITS[0][skillName], []);
  }
  return list;
}

function getUnitSkillObj(unit, skillName) {
  let obj = safeObj(unit?.[skillName], {});
  if (!obj || !Object.keys(obj).length) {
    const defMatch = DEFAULT_UNITS.find(d => d.id === unit?.id) || DEFAULT_UNITS[0];
    obj = safeObj(defMatch?.[skillName], {});
  }
  if ((!obj || !Object.keys(obj).length) && DEFAULT_UNITS[0]?.[skillName]) {
    obj = safeObj(DEFAULT_UNITS[0][skillName], {});
  }
  return obj;
}

// LOAD UNITS TỪ SUPABASE / DEFAULT
// =========================================================================
async function loadUnitsData() {
  try {
    if (db()) {
function normalizeSubjectName(sub) {
  if (!sub) return '🇬🇧 Tiếng Anh';
  const s = String(sub).trim();
  const clean = s.toLowerCase().replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim();
  if (clean.includes('tiếng anh') || clean.includes('english') || clean.includes('eng')) return '🇬🇧 Tiếng Anh';
  if (clean.includes('toán') || clean.includes('math')) return '📐 Toán Học';
  if (clean.includes('vật lý') || clean.includes('vật lí') || clean.includes('phys')) return '⚡ Vật Lý';
  if (clean.includes('hóa') || clean.includes('chem')) return '🧪 Hóa Học';
  if (clean.includes('tin') || clean.includes('công nghệ thông tin') || clean.includes('it') || clean.includes('cs') || clean.includes('python')) return '💻 Tin Học';
  return s;
}

function normalizeModuleName(mod) {
  if (!mod) return 'English B1 - General & Academic Skills';
  const m = String(mod).trim();
  if (m.toLowerCase().includes('công binh') || m.toLowerCase().includes('military engineering')) {
    return 'Tiếng Anh Chuyên Ngành Công Binh';
  }
  if (m.includes('Tiếng Anh cơ bản 1') || m.includes('Basic English Module 1') || m.includes('Tiếng Anh cơ bản')) {
    return 'English B1 - General & Academic Skills';
  }
  return m;
}

      const { data, error } = await db().from('learning_units').select('*').eq('is_hidden', false).order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        allUnits = data.map(u => {
          const defMatch = DEFAULT_UNITS.find(d => d.id === u.id) || DEFAULT_UNITS[0];
          return {
            id: u.id,
            subject: normalizeSubjectName(u.subject),
            module: normalizeModuleName(u.module),
            title: u.title,
            topic: u.topic || '',
            level: u.level || 'A2 - B1',
            icon: u.icon || '📖',
            description: u.description || '',
            isHidden: u.is_hidden ?? false,
            listening: safeArray(u.listening, defMatch?.listening || []),
            reading: safeArray(u.reading, defMatch?.reading || []),
            speaking: safeArray(u.speaking, defMatch?.speaking || []),
            writing: safeArray(u.writing, defMatch?.writing || []),
            languageFocus: safeObj(u.language_focus || u.languageFocus, defMatch?.languageFocus || {})
          };
        });

        // Bổ sung các Units mặc định của Toán, Lý, Hóa, Tin Học nếu chưa có trong DB
        DEFAULT_UNITS.forEach(defUnit => {
          if (!allUnits.some(u => u.id === defUnit.id)) {
            allUnits.push({ ...defUnit });
          }
        });
      } else {
        allUnits = DEFAULT_UNITS.filter(u => !u.isHidden);
      }
    } else {
      allUnits = DEFAULT_UNITS.filter(u => !u.isHidden);
    }
  } catch (err) {
    console.warn("Lỗi tải units:", err);
    allUnits = DEFAULT_UNITS.filter(u => !u.isHidden);
  }

  if (!allUnits.length) allUnits = DEFAULT_UNITS;

  // Đọc tham số subject từ URL (ví dụ: learn.html?subject=Toán)
  const urlParams = new URLSearchParams(window.location.search);
  const paramSub = urlParams.get('subject');
  if (paramSub) {
    const matched = allUnits.find(u => (u.subject || '').toLowerCase().includes(paramSub.toLowerCase()));
    if (matched) currentSubject = matched.subject;
  }

  currentUnit = allUnits.find(u => !currentSubject || u.subject === currentSubject) || allUnits[0];

  renderCascadingSelectors();
  loadCurrentUnitView();
}

function renderCascadingSelectors() {
  const subSel = document.getElementById('learn-subject-select');
  const modSel = document.getElementById('learn-module-select');
  const unitSel = document.getElementById('learn-unit-select');
  if (!subSel || !modSel || !unitSel) return;

  // 1. Danh sách Môn học (Subject)
  const subjects = [...new Set(allUnits.map(u => u.subject || '🇬🇧 Tiếng Anh'))];
  if (!currentSubject || !subjects.includes(currentSubject)) {
    currentSubject = currentUnit?.subject || subjects[0] || '🇬🇧 Tiếng Anh';
  }

  subSel.innerHTML = subjects.map(s => `
    <option value="${s}" ${s === currentSubject ? 'selected' : ''}>📚 ${s}</option>
  `).join('');

  // 2. Danh sách Học phần (Module) theo Môn học đã chọn
  const unitsInSubject = allUnits.filter(u => (u.subject || '🇬🇧 Tiếng Anh') === currentSubject);
  const modules = [...new Set(unitsInSubject.map(u => u.module || 'Học phần cơ bản'))];
  
  if (!currentModule || !modules.includes(currentModule)) {
    currentModule = (currentUnit?.module && modules.includes(currentUnit.module)) ? currentUnit.module : (modules[0] || '');
  }

  modSel.innerHTML = modules.map(m => `
    <option value="${m}" ${m === currentModule ? 'selected' : ''}>📦 ${m}</option>
  `).join('');

  // 3. Danh sách Unit thuộc Học phần đã chọn
  const unitsInModule = unitsInSubject.filter(u => (u.module || 'Học phần cơ bản') === currentModule);
  
  if (!currentUnit || !unitsInModule.some(u => u.id === currentUnit.id)) {
    currentUnit = unitsInModule[0] || unitsInSubject[0] || allUnits[0];
  }

  unitSel.innerHTML = unitsInModule.map(u => `
    <option value="${u.id}" ${currentUnit && u.id === currentUnit.id ? 'selected' : ''}>
      ${u.icon || '📖'} ${u.title} (${u.level || 'A2'})
    </option>
  `).join('');

  updateBreadcrumbs();
  updateSubjectUI(currentSubject);
}

export function updateSubjectUI(subject) {
  const isEng = !subject || subject.includes('Tiếng Anh') || subject.includes('English');
  const unitLabel = document.getElementById('lbl-unit-select');
  if (unitLabel) {
    unitLabel.textContent = isEng ? '3. UNIT BÀI HỌC (5 KỸ NĂNG)' : '3. BÀI HỌC TƯƠNG TÁC (INTERACTIVE LESSON)';
  }

  const navRow = document.getElementById('learn-skill-nav-row');
  if (navRow) {
    if (isEng) {
      navRow.innerHTML = `
        <button class="skill-tab-btn ${currentSkillTab === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchSkillTab('listening')">
          <span class="tab-icon">🎧</span>
          <span class="tab-label">1. LISTENING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">📖</span>
          <span class="tab-label">2. READING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span class="tab-label">3. SPEAKING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span class="tab-label">4. WRITING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🔍</span>
          <span class="tab-label">5. LANGUAGE FOCUS</span>
        </button>
      `;
    } else {
      navRow.innerHTML = `
        <button class="skill-tab-btn ${currentSkillTab === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchSkillTab('listening')">
          <span class="tab-icon">📖</span>
          <span class="tab-label">1. LÝ THUYẾT & BÀI GIẢNG</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">💡</span>
          <span class="tab-label">2. VÍ DỤ MINH HỌA</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span class="tab-label">3. ĐỌC CÔNG THỨC / CODE</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span class="tab-label">4. BÀI TẬP TỰ LUYỆN</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🧠</span>
          <span class="tab-label">5. CÔNG THỨC & TRẮC NGHIỆM</span>
        </button>
      `;
    }
  }
}

function updateBreadcrumbs() {
  const bcSub = document.getElementById('bc-subject');
  const bcMod = document.getElementById('bc-module');
  const bcUnit = document.getElementById('bc-unit');

  if (bcSub) bcSub.textContent = currentSubject || '🇬🇧 Tiếng Anh';
  if (bcMod) bcMod.textContent = currentModule || 'Học phần cơ bản';
  if (bcUnit) bcUnit.textContent = currentUnit?.title || 'Unit bài học';
}

window.onLearnSubjectChange = function() {
  const subSel = document.getElementById('learn-subject-select');
  if (!subSel) return;
  currentSubject = subSel.value;
  currentModule = '';
  renderCascadingSelectors();
  loadCurrentUnitView();
};

window.onLearnModuleChange = function() {
  const modSel = document.getElementById('learn-module-select');
  if (!modSel) return;
  currentModule = modSel.value;
  renderCascadingSelectors();
  loadCurrentUnitView();
};

window.onLearnUnitChange = function() {
  const unitSel = document.getElementById('learn-unit-select');
  if (!unitSel) return;
  const chosen = allUnits.find(u => u.id === unitSel.value);
  if (chosen) {
    currentUnit = chosen;
    updateBreadcrumbs();
    loadCurrentUnitView();
  }
};

export function selectContentType(type, btnEl) {
  document.querySelectorAll('.content-type-row .type-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  if (type === 'word' || type === 'mixed') switchSkillTab('languageFocus');
  if (type === 'phrase' || type === 'sentence') switchSkillTab('writing');
  if (type === 'dialogue') switchSkillTab('speaking');
}

export function selectDifficulty(diff, btnEl) {
  document.querySelectorAll('.difficulty-row .diff-btn').forEach(b => b.classList.remove('active'));
  if (btnEl && !btnEl.classList.contains('locked')) btnEl.classList.add('active');
}

export function filterLearningContent() {
  const q = document.getElementById('learn-search-input')?.value.trim().toLowerCase() || '';
  if (!q) return;
  const foundInUnit = allUnits.find(u => 
    (u.title || '').toLowerCase().includes(q) || 
    (u.topic || '').toLowerCase().includes(q)
  );
  if (foundInUnit) {
    currentUnit = foundInUnit;
    populateUnitTiles();
    loadCurrentUnitView();
  }
}

window.selectContentType = selectContentType;
window.selectDifficulty = selectDifficulty;
window.filterLearningContent = filterLearningContent;

function loadCurrentUnitView() {
  if (!currentUnit) return;
  const iconEl = document.getElementById('current-unit-icon');
  const descEl = document.getElementById('current-unit-desc');

  if (iconEl) iconEl.textContent = currentUnit.icon || '📖';
  if (descEl) descEl.textContent = currentUnit.description || `Chủ đề: ${currentUnit.topic || 'General'} • Trình độ: ${currentUnit.level || 'A2'}`;

  switchSkillTab(currentSkillTab);
}

// =========================================================================
// 1. LISTENING MODULE
// =========================================================================

function initListening() {
  const list = getUnitSkillList(currentUnit, 'listening');
  currentLisLesson = list[0] || null;
  renderListeningLessons();
  if (currentLisLesson) loadListeningLesson(currentLisLesson.id);
  else {
    const ws = document.getElementById('lis-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài nghe trong Unit này.</div>';
  }
}

function renderListeningLessons() {
  const container = document.getElementById('lis-lesson-list');
  const list = getUnitSkillList(currentUnit, 'listening');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;width:100%">📭 Chưa có bài nghe trong Unit này.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = currentLisLesson && item.id === currentLisLesson.id;
    return `
      <div class="lesson-card ${isSelected ? 'active' : ''}" onclick="window.selectListeningLesson('${item.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="lesson-badge">${item.level || currentUnit.level || 'A2 - B1'}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">🎧 ${item.title}</div>
        <div class="lesson-meta">🎯 Chủ đề: ${item.topic || currentUnit.topic || 'General'} • ⏱ ${item.duration || '45s'}</div>
      </div>
    `;
  }).join('');
}

window.selectListeningLesson = function(id) {
  const list = getUnitSkillList(currentUnit, 'listening');
  const found = list.find(l => l.id === id);
  if (found) {
    currentLisLesson = found;
    renderListeningLessons();
    loadListeningLesson(id);
  }
};

function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?enablejsapi=1` : '';
}

function loadListeningLesson(id) {
  const l = currentLisLesson;
  const workspace = document.getElementById('lis-workspace');
  if (!workspace || !l) return;

  const isVideo = l.mediaType === 'video' || !!l.videoUrl;
  const isAudio = !isVideo && (l.mediaType === 'audio' || !!l.audioUrl);
  const ytEmbed = isVideo ? getYouTubeEmbedUrl(l.videoUrl) : '';

  let mediaRenderHtml = '';
  if (isVideo) {
    mediaRenderHtml = `
      <div class="listening-video-wrapper">
        ${ytEmbed ? `
          <iframe id="current-lis-yt-player" src="${ytEmbed}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        ` : `
          <video id="current-lis-video" controls playsinline preload="metadata" src="${esc(l.videoUrl)}" style="width:100%;max-height:420px;background:#000;">
            Trình duyệt không hỗ trợ phát video MP4.
          </video>
        `}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:10px">
        <div style="display:flex;gap:8px;align-items:center">
          ${!ytEmbed ? `
            <button class="btn btn-sm" onclick="window.seekListeningVideo(-10)" style="background:rgba(255,255,255,0.15);color:#fff;border:none">⏪ -10s</button>
            <button class="btn btn-sm" onclick="window.seekListeningVideo(10)" style="background:rgba(255,255,255,0.15);color:#fff;border:none">⏩ +10s</button>
          ` : ''}
          <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">👁️ Hiện Transcript</button>
        </div>
        ${!ytEmbed ? `
          <div class="speed-selector-group">
            <span style="font-size:11.5px;color:#94a3b8;font-weight:700;margin-right:4px">⚡ Tốc độ:</span>
            <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningVideoSpeed(0.75)">0.75x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningVideoSpeed(1.0)">1.0x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningVideoSpeed(1.25)">1.25x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.5 ? 'active' : ''}" onclick="window.setListeningVideoSpeed(1.5)">1.5x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 2.0 ? 'active' : ''}" onclick="window.setListeningVideoSpeed(2.0)">2.0x</button>
          </div>
        ` : ''}
      </div>
    `;
  } else if (isAudio) {
    mediaRenderHtml = `
      ${l.image ? `
        <div style="margin-bottom:14px;border-radius:12px;overflow:hidden;max-height:220px;border:1px solid rgba(255,255,255,0.2)">
          <img src="${esc(l.image)}" style="width:100%;height:180px;object-fit:cover;display:block" alt="${esc(l.title)}" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div class="listening-audio-suite">
        <audio id="current-lis-audio" controls preload="metadata" src="${esc(l.audioUrl)}">
          Trình duyệt không hỗ trợ phát file âm thanh.
        </audio>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-sm" onclick="window.seekListeningAudio(-5)" style="background:rgba(255,255,255,0.15);color:#fff;border:none">⏪ -5s</button>
            <button class="btn btn-sm" onclick="window.seekListeningAudio(5)" style="background:rgba(255,255,255,0.15);color:#fff;border:none">⏩ +5s</button>
            <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">👁️ Hiện Transcript</button>
          </div>
          <div class="speed-selector-group">
            <span style="font-size:11.5px;color:#94a3b8;font-weight:700;margin-right:4px">⚡ Tốc độ:</span>
            <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
            <button class="speed-btn ${currentPlaybackSpeed === 1.5 ? 'active' : ''}" onclick="window.setListeningSpeed(1.5)">1.5x</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // TTS Mode
    mediaRenderHtml = `
      ${l.image ? `
        <div style="margin-bottom:14px;border-radius:12px;overflow:hidden;max-height:220px;border:1px solid rgba(255,255,255,0.2)">
          <img src="${esc(l.image)}" style="width:100%;height:180px;object-fit:cover;display:block" alt="${esc(l.title)}" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div class="audio-controls-row" style="margin-top:14px">
        <button class="play-audio-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()">▶</button>
        <button class="btn btn-sm" onclick="window.playCurrentListeningAudio()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">🔁 Nghe lại (AI Voice)</button>
        <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">👁️ Hiện Transcript</button>
        <div class="speed-selector-group" style="margin-left:auto">
          <span style="font-size:11.5px;color:#94a3b8;font-weight:700;margin-right:4px">⚡ Tốc độ:</span>
          <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
        </div>
      </div>
    `;
  }

  const transcriptContent = l.transcript || l.audioText || '';

  workspace.innerHTML = `
    <div class="listening-player-box">
      <div class="listening-media-header">
        <div>
          <div style="font-size:19px;font-weight:800;color:#fff;margin-bottom:4px">${esc(l.title || 'Listening Lesson')}</div>
          <div style="font-size:13px;color:#94a3b8">🎯 Chủ đề: ${esc(l.topic || currentUnit.topic || 'General')} • ⏱ ${esc(l.duration || '45s')}</div>
        </div>
        <div>
          ${isVideo ? '<span class="media-type-badge video-type">🎬 Video Lesson</span>' : (isAudio ? '<span class="media-type-badge audio-type">🎧 Audio Track</span>' : '<span class="media-type-badge tts-type">🗣️ AI Voice</span>')}
        </div>
      </div>

      ${mediaRenderHtml}

      <div id="lis-transcript-box" class="transcript-accordion" style="display:none">
        <div class="transcript-body">
          <div style="font-weight:800;color:#38bdf8;margin-bottom:8px;font-size:13px;display:flex;align-items:center;gap:6px">
            <span>📝</span> TRANSCRIPT / LỜI THOẠI BÀI NGHE:
          </div>
          <div>${esc(transcriptContent)}</div>
        </div>
      </div>
    </div>

    <!-- DANH SÁCH BÀI TẬP TƯƠNG TÁC -->
    <div class="exercise-card-container">
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;display:flex;align-items:center;gap:8px">
        <span>✍️</span> BÀI TẬP TRẢ LỜI CÂU HỎI (${(l.exercises || []).length} câu):
      </div>
      ${renderListeningExercises(l.exercises || [])}
    </div>
  `;
  typesetMath(workspace);
}

window.seekListeningAudio = function(sec) {
  const audio = document.getElementById('current-lis-audio');
  if (audio) {
    audio.currentTime = Math.max(0, audio.currentTime + sec);
  }
};

window.seekListeningVideo = function(sec) {
  const video = document.getElementById('current-lis-video');
  if (video) {
    video.currentTime = Math.max(0, video.currentTime + sec);
  }
};

window.setListeningSpeed = function(spd) {
  currentPlaybackSpeed = spd;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === spd);
  });
  const audio = document.getElementById('current-lis-audio');
  if (audio) {
    audio.playbackRate = spd;
  } else {
    window.playCurrentListeningAudio();
  }
};

window.setListeningVideoSpeed = function(spd) {
  currentPlaybackSpeed = spd;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === spd);
  });
  const video = document.getElementById('current-lis-video');
  if (video) {
    video.playbackRate = spd;
  }
};

window.playCurrentListeningAudio = function() {
  if (!currentLisLesson) return;
  const audio = document.getElementById('current-lis-audio');
  if (audio) {
    if (audio.paused) audio.play();
    else audio.pause();
    return;
  }

  speakText(currentLisLesson.audioText || currentLisLesson.transcript, currentPlaybackSpeed, 'en-US');
  const btn = document.getElementById('btn-play-lis');
  if (btn) {
    btn.textContent = '🔊';
    setTimeout(() => { btn.textContent = '▶'; }, 4000);
  }
};

window.toggleLisTranscript = function() {
  const box = document.getElementById('lis-transcript-box');
  const btn = document.getElementById('btn-toggle-transcript');
  if (box && btn) {
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '🙈 Ẩn Transcript' : '👁️ Hiện Transcript';
  }
};

function renderListeningExercises(exercises) {
  if (!exercises || !exercises.length) {
    return '<div class="empty">Bài học này chưa có câu hỏi luyện tập.</div>';
  }

  return exercises.map((ex, idx) => {
    if (ex.type === 'mcq') {
      return `
        <div class="card listening-ex-card" style="margin:0">
          <div class="ex-header-row">
            <span class="ex-badge mcq-badge">🔘 Câu hỏi ${idx + 1} (Trắc nghiệm):</span>
          </div>
          <div style="font-weight:700;margin-bottom:12px;color:#1e293b;font-size:15px">${ex.question}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(ex.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkLisMCQ(${idx}, ${oIdx}, ${ex.answer})" id="lis-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
          <div id="lis-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
          ${ex.explain ? `<div id="lis-exp-${idx}" style="display:none;margin-top:8px;font-size:13px;color:#475569;background:#f8fafc;padding:8px 12px;border-radius:8px;border-left:3px solid #6366f1">💡 <b>Giải thích:</b> ${esc(ex.explain)}</div>` : ''}
        </div>
      `;
    } else if (ex.type === 'dictation') {
      return `
        <div class="card listening-ex-card" style="margin:0;border-left:4px solid #10b981">
          <div class="ex-header-row">
            <span class="ex-badge dict-badge">✍️ Câu hỏi ${idx + 1} (Dictation - Chép chính tả):</span>
          </div>
          <div style="font-size:13.5px;color:#64748b;margin-bottom:10px">${ex.prompt || 'Nghe và gõ lại chính xác câu bạn nghe được:'}</div>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <button class="btn btn-sm" onclick="window.speakDictation('${(ex.targetSentence || '').replace(/'/g, "\\'")}')" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0">🔊 Nghe câu này</button>
          </div>
          <textarea id="dictation-input-${idx}" class="dictation-textarea" placeholder="Gõ lại những gì bạn nghe được..."></textarea>
          <div style="margin-top:10px;display:flex;gap:10px">
            <button class="btn btn-p" onclick="window.checkDictation(${idx}, '${(ex.targetSentence || '').replace(/'/g, "\\'")}')">Kiểm tra chính tả</button>
          </div>
          <div id="dictation-fb-${idx}" style="display:none;" class="diff-result-view"></div>
        </div>
      `;
    } else if (ex.type === 'gap_fill') {
      const sentence = ex.sentence || '';
      const parts = sentence.split('___');
      const answers = ex.answers || [];
      const optionsBank = ex.optionsBank && ex.optionsBank.length ? ex.optionsBank : answers;

      let sentenceHtml = '';
      parts.forEach((p, pIdx) => {
        sentenceHtml += esc(p);
        if (pIdx < parts.length - 1) {
          sentenceHtml += `<input type="text" class="gap-input" id="gap-inp-${idx}-${pIdx}" placeholder="[điền từ]" data-correct="${esc(answers[pIdx] || '')}">`;
        }
      });

      return `
        <div class="card listening-ex-card" style="margin:0;border-left:4px solid #f59e0b">
          <div class="ex-header-row">
            <span class="ex-badge gap-badge">🔤 Câu hỏi ${idx + 1} (Điền từ vào chỗ trống):</span>
          </div>
          <div class="gap-fill-sentence">
            ${sentenceHtml}
          </div>
          ${optionsBank.length ? `
            <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:6px">💡 Ngân hàng từ gợi ý (Bấm để chèn vào ô trống):</div>
            <div class="gap-options-bank">
              ${optionsBank.map((word) => `<span class="gap-word-chip" onclick="window.fillFirstEmptyGap(${idx}, '${esc(word)}')">${esc(word)}</span>`).join('')}
            </div>
          ` : ''}
          <div style="margin-top:10px">
            <button class="btn btn-p" onclick="window.checkLisGapFill(${idx})">Kiểm tra câu trả lời</button>
          </div>
          <div id="gap-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    } else if (ex.type === 'true_false') {
      return `
        <div class="card listening-ex-card" style="margin:0;border-left:4px solid #ec4899">
          <div class="ex-header-row">
            <span class="ex-badge tf-badge">⚖️ ${ex.title ? esc(ex.title) : `Câu hỏi ${idx + 1} (True/False):`}</span>
          </div>
          <div style="font-weight:700;margin-bottom:12px;color:#1e293b;font-size:15px">${ex.question}</div>
          <div class="tf-btn-group">
            <button type="button" class="tf-btn" id="lis-tf-${idx}-true" onclick="window.checkLisTrueFalse(${idx}, true, ${ex.answer})">
              <span>✅</span> TRUE (Đúng)
            </button>
            <button type="button" class="tf-btn" id="lis-tf-${idx}-false" onclick="window.checkLisTrueFalse(${idx}, false, ${ex.answer})">
              <span>❌</span> FALSE (Sai)
            </button>
          </div>
          <div id="lis-tf-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
          ${ex.explain ? `<div id="lis-tf-exp-${idx}" style="display:none;margin-top:8px;font-size:13px;color:#475569;background:#f8fafc;padding:8px 12px;border-radius:8px;border-left:3px solid #ec4899">💡 <b>Giải thích:</b> ${esc(ex.explain)}</div>` : ''}
        </div>
      `;
    } else if (ex.type === 'short_answer') {
      const keywordsStr = (ex.keywords || []).join(', ');
      return `
        <div class="card listening-ex-card short-answer-card" style="margin:0;border-left:4px solid #0284c7">
          <div class="ex-header-row">
            <span class="ex-badge" style="background:#e0f2fe;color:#0369a1;font-weight:800">💬 ${ex.title ? esc(ex.title) : `Câu hỏi ${idx + 1} (Trả lời câu hỏi nghe hiểu):`}</span>
          </div>
          <div style="font-weight:700;margin-bottom:10px;color:#1e293b;font-size:15px">${esc(ex.question)}</div>
          ${ex.hint ? `<div style="font-size:12.5px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${esc(ex.hint)}</div>` : ''}
          <div style="display:flex;flex-direction:column;gap:10px">
            <input type="text" id="lis-sa-inp-${idx}" class="short-answer-input" placeholder="Nhập câu trả lời của bạn bằng tiếng Anh...">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-p" onclick="window.checkLisShortAnswer(${idx}, '${esc(ex.sampleAnswer || '')}', '${esc(keywordsStr)}')">Kiểm tra câu trả lời</button>
              <button class="btn btn-sm" onclick="window.toggleLisSampleAnswer(${idx})" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1">👁️ Xem đáp án mẫu</button>
            </div>
          </div>
          <div id="lis-sa-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
          <div id="lis-sa-sample-${idx}" class="sample-answer-reveal" style="display:none">
            <b>📝 Đáp án mẫu (Sample Answer):</b> ${esc(ex.sampleAnswer || '')}
            ${keywordsStr ? `<div style="font-size:12px;color:#0369a1;margin-top:4px">🔑 Từ khóa trọng tâm: <b>${esc(keywordsStr)}</b></div>` : ''}
          </div>
        </div>
      `;
    }
    return '';
  }).join('');
}

window.checkLisShortAnswer = function(exIdx, sampleAnswer, keywordsStr) {
  const input = document.getElementById(`lis-sa-inp-${exIdx}`);
  const fb = document.getElementById(`lis-sa-fb-${exIdx}`);
  if (!input || !fb) return;

  const userVal = input.value.trim().toLowerCase();
  if (!userVal) {
    alert('Vui lòng nhập câu trả lời trước khi kiểm tra!');
    return;
  }

  const keywords = keywordsStr ? keywordsStr.toLowerCase().split(',').map(k => k.trim()).filter(Boolean) : [];
  let matchedKw = 0;
  keywords.forEach(kw => {
    if (userVal.includes(kw)) matchedKw++;
  });

  const isFullMatch = userVal === sampleAnswer.trim().toLowerCase();
  const hasKeyContent = keywords.length > 0 ? (matchedKw / keywords.length >= 0.5) : (userVal.length >= 5);

  fb.style.display = 'block';
  if (isFullMatch || hasKeyContent) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Rất tốt!</b> Câu trả lời của bạn thể hiện đúng ý bài nghe.<br><b>Đáp án mẫu:</b> <i>"${sampleAnswer}"</i>`;
    playSuccessSound();
    addXP(20, 'Trả lời đúng câu hỏi nghe hiểu');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `⚠️ <b>Cần bổ sung thêm thông tin!</b> Hãy đối chiếu với đáp án mẫu bên dưới.<br><b>Đáp án mẫu:</b> <i>"${sampleAnswer}"</i>`;
    playWrongSound();
  }
};

window.toggleLisSampleAnswer = function(exIdx) {
  const sampleBox = document.getElementById(`lis-sa-sample-${exIdx}`);
  if (sampleBox) {
    sampleBox.style.display = sampleBox.style.display === 'none' ? 'block' : 'none';
  }
};

window.checkLisMCQ = function(exIdx, chosenIdx, correctIdx) {
  const fb = document.getElementById(`lis-fb-${exIdx}`);
  const exp = document.getElementById(`lis-exp-${exIdx}`);
  const btn = document.getElementById(`lis-opt-${exIdx}-${chosenIdx}`);
  if (!fb || !btn) return;

  const allBtns = document.querySelectorAll(`[id^="lis-opt-${exIdx}-"]`);
  allBtns.forEach(b => (b.disabled = true));

  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> Bạn đã nghe/xem và chọn đúng.';
    fb.style.display = 'block';
    if (exp) exp.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Nghe hiểu đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`lis-opt-${exIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa chính xác!</b> Hãy xem/nghe lại audio/video nhé.';
    fb.style.display = 'block';
    if (exp) exp.style.display = 'block';
    playWrongSound();
  }
};

window.fillFirstEmptyGap = function(exIdx, word) {
  const inputs = document.querySelectorAll(`[id^="gap-inp-${exIdx}-"]`);
  for (let inp of inputs) {
    if (!inp.value.trim()) {
      inp.value = word;
      inp.focus();
      break;
    }
  }
};

window.checkLisGapFill = function(exIdx) {
  const inputs = document.querySelectorAll(`[id^="gap-inp-${exIdx}-"]`);
  const fb = document.getElementById(`gap-fb-${exIdx}`);
  if (!inputs.length || !fb) return;

  let allCorrect = true;
  inputs.forEach((inp) => {
    const val = inp.value.trim().toLowerCase();
    const correct = (inp.dataset.correct || '').trim().toLowerCase();
    if (val === correct) {
      inp.className = 'gap-input correct';
    } else {
      inp.className = 'gap-input wrong';
      allCorrect = false;
    }
  });

  fb.style.display = 'block';
  if (allCorrect) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Xuất sắc!</b> Tất cả các chỗ trống đều được điền chính xác.';
    playSuccessSound();
    addXP(20, 'Điền đúng chỗ trống');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = '⚠️ Có một số từ chưa chính xác. Hãy đối chiếu lại bài nghe/video nhé!';
    playWrongSound();
  }
};

window.checkLisTrueFalse = function(exIdx, chosenVal, correctVal) {
  const fb = document.getElementById(`lis-tf-fb-${exIdx}`);
  const exp = document.getElementById(`lis-tf-exp-${exIdx}`);
  const btnTrue = document.getElementById(`lis-tf-${exIdx}-true`);
  const btnFalse = document.getElementById(`lis-tf-${exIdx}-false`);
  if (!fb || !btnTrue || !btnFalse) return;

  btnTrue.disabled = true;
  btnFalse.disabled = true;

  const isMatch = (chosenVal === correctVal);
  if (chosenVal === true) {
    btnTrue.classList.add(isMatch ? 'correct' : 'wrong');
  } else {
    btnFalse.classList.add(isMatch ? 'correct' : 'wrong');
  }

  if (!isMatch) {
    if (correctVal === true) btnTrue.classList.add('correct');
    else btnFalse.classList.add('correct');
  }

  fb.style.display = 'block';
  if (isMatch) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> Bạn đã nhận định đúng mệnh đề.';
    if (exp) exp.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Chọn đúng True/False');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng!</b> Hãy nghe/xem lại chi tiết trong bài.';
    if (exp) exp.style.display = 'block';
    playWrongSound();
  }
};

window.speakDictation = function(sentence) {
  speakText(sentence, currentPlaybackSpeed, 'en-US');
};

window.checkDictation = function(idx, targetSentence) {
  const inputEl = document.getElementById(`dictation-input-${idx}`);
  const fb = document.getElementById(`dictation-fb-${idx}`);
  if (!inputEl || !fb) return;

  const userInput = inputEl.value.trim();
  if (!userInput) { alert('Vui lòng gõ nội dung trước khi kiểm tra!'); return; }

  const cleanTarget = targetSentence.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase().split(/\s+/);
  const cleanUser = userInput.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase().split(/\s+/);

  let matchCount = 0;
  let diffHtml = cleanTarget.map((targetWord, i) => {
    const userWord = cleanUser[i];
    if (userWord === targetWord) {
      matchCount++;
      return `<span class="diff-word-correct">${targetWord}</span>`;
    } else if (userWord) {
      return `<span class="diff-word-wrong">${userWord}</span><span class="diff-word-correct">${targetWord}</span>`;
    } else {
      return `<span class="diff-word-missing">${targetWord}</span>`;
    }
  }).join(' ');

  const accuracy = Math.round((matchCount / cleanTarget.length) * 100);
  fb.style.display = 'block';
  if (accuracy >= 85) {
    fb.style.background = '#f0fdf4';
    fb.style.border = '1px solid #bbf7d0';
    fb.innerHTML = `<div style="font-weight:700;color:#16a34a;margin-bottom:6px">🎉 Xuất sắc! Độ chính xác: ${accuracy}%</div><div>${diffHtml}</div>`;
    playSuccessSound();
    addXP(25, 'Hoàn thành Dictation');
  } else {
    fb.style.background = '#fef2f2';
    fb.style.border = '1px solid #fecaca';
    fb.innerHTML = `<div style="font-weight:700;color:#dc2626;margin-bottom:6px">⚠️ Cần cố gắng hơn: ${accuracy}%</div><div>${diffHtml}</div>`;
    playWrongSound();
  }
};

// =========================================================================
// 2. READING MODULE
// =========================================================================

function initReading() {
  const list = getUnitSkillList(currentUnit, 'reading');
  currentReadLesson = list[0] || null;
  renderReadingLessons();
  if (currentReadLesson) loadReadingLesson(currentReadLesson.id);
  else {
    const ws = document.getElementById('read-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài đọc trong Unit này.</div>';
  }
}

function renderReadingLessons() {
  const container = document.getElementById('read-lesson-list');
  const list = getUnitSkillList(currentUnit, 'reading');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;width:100%">📭 Chưa có bài đọc trong Unit này.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = currentReadLesson && item.id === currentReadLesson.id;
    return `
      <div class="lesson-card ${isSelected ? 'active' : ''}" onclick="window.selectReadingLesson('${item.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="lesson-badge">${item.level || currentUnit.level || 'A2 - B1'}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">📖 ${item.title}</div>
        <div class="lesson-meta">🎯 Chủ đề: ${item.topic || currentUnit.topic || 'General'}</div>
      </div>
    `;
  }).join('');
}

window.selectReadingLesson = function(id) {
  const list = getUnitSkillList(currentUnit, 'reading');
  const found = list.find(r => r.id === id);
  if (found) {
    currentReadLesson = found;
    renderReadingLessons();
    loadReadingLesson(id);
  }
};

function loadReadingLesson(id) {
  const r = currentReadLesson;
  const workspace = document.getElementById('read-workspace');
  if (!workspace || !r) return;

  let annotatedPassage = r.passage || '';
  if (r.vocabulary) {
    Object.keys(r.vocabulary).forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      annotatedPassage = annotatedPassage.replace(regex, `<span class="vocab-tag" onclick="window.showVocabLookup('$1')">$1</span>`);
    });
  }

  workspace.innerHTML = `
    <div class="reading-split-view">
      <div class="reading-passage-box">
        ${r.image ? `
          <div style="margin-bottom:14px;border-radius:8px;overflow:hidden;max-height:220px;border:1.5px solid #cbd5e1">
            <img src="${r.image}" style="width:100%;height:180px;object-fit:cover;display:block" alt="${r.title}" onerror="this.style.display='none'">
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <h3 style="margin:0;font-size:17px;color:#1e293b">${r.title}</h3>
          <span style="font-size:12px;color:#0284c7;background:#e0f2fe;padding:2px 8px;border-radius:4px;font-weight:600">💡 Bấm vào từ màu xanh để tra nhanh</span>
        </div>
        <div style="white-space:pre-wrap;">${annotatedPassage}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;max-height:520px;overflow-y:auto;padding-right:6px">
        ${renderReadingExercises(r.exercises || [])}
      </div>
    </div>
  `;
  typesetMath(workspace);
}

window.showVocabLookup = function(word) {
  if (!currentReadLesson || !currentReadLesson.vocabulary) return;
  const key = Object.keys(currentReadLesson.vocabulary).find(k => k.toLowerCase() === word.toLowerCase());
  const data = key ? currentReadLesson.vocabulary[key] : null;
  if (!data) return;

  let modal = document.getElementById('vocab-lookup-card');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vocab-lookup-card';
    modal.className = 'vocab-modal-card';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
      <div>
        <span style="font-size:18px;font-weight:800;color:#0369a1">${word}</span>
        <span style="font-size:12px;color:#64748b;margin-left:4px">(${data.pos || 'word'})</span>
      </div>
      <button onclick="document.getElementById('vocab-lookup-card').style.display='none'" style="border:none;background:none;cursor:pointer;color:#94a3b8;font-size:16px">✖</button>
    </div>
    <div style="font-family:'Courier New',monospace;color:#d97706;font-size:13px;margin-bottom:8px">${data.ipa || ''}</div>
    <div style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:10px">${data.meaning || ''}</div>
    <button class="btn btn-sm btn-p" onclick="window.speakVocab('${word}')" style="width:100%">🔊 Phát âm chuẩn</button>
  `;
  modal.style.display = 'block';
};

window.speakVocab = function(word) { speakText(word, 0.9, 'en-US'); };

function renderReadingExercises(exercises) {
  if (!exercises || !exercises.length) {
    return '<div class="empty">Chưa có câu hỏi luyện tập cho bài đọc này.</div>';
  }

  return exercises.map((ex, idx) => {
    if (ex.type === 'matching') {
      const pairs = ex.pairs || [];
      const letters = pairs.map(p => p.letter || String.fromCharCode(97 + pairs.indexOf(p)));
      const defsShuffled = [...pairs].sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));

      return `
        <div class="matching-exercise-card" style="margin:0">
          <div style="font-weight:800;font-size:15px;color:#1e293b;margin-bottom:6px">
            🧩 ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Match the words/phrases with their definitions:`}
          </div>
          <div style="font-size:12.5px;color:#64748b;margin-bottom:12px">Chọn chữ cái (a, b, c...) định nghĩa tương ứng cho mỗi từ vựng:</div>

          <table class="matching-grid-table">
            <thead>
              <tr style="font-size:12px;color:#64748b;text-align:left">
                <th style="padding:4px 8px">STT</th>
                <th style="padding:4px 12px">Từ vựng (Word / Phrase)</th>
                <th style="padding:4px 8px;text-align:center">Nối với</th>
              </tr>
            </thead>
            <tbody>
              ${pairs.map((p, pIdx) => `
                <tr class="matching-row" id="read-match-row-${idx}-${pIdx}">
                  <td class="matching-col-num">${p.id || (pIdx + 1)}</td>
                  <td class="matching-col-word">${esc(p.word || '')}</td>
                  <td class="matching-col-select">
                    <select class="matching-select" id="read-match-sel-${idx}-${pIdx}" data-correct="${esc(p.letter || '')}">
                      <option value="">--</option>
                      ${letters.map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="matching-definitions-list">
            <div style="font-size:12.5px;font-weight:800;color:#0369a1;margin-bottom:4px">📖 Danh Sách Định Nghĩa (Definitions):</div>
            ${defsShuffled.map(d => `
              <div class="matching-def-item">
                <span class="matching-def-letter">(${d.letter})</span>
                <span>${esc(d.definition || '')}</span>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:14px">
            <button class="btn btn-p" onclick="window.checkReadingMatching(${idx})">✅ Kiểm tra nối từ</button>
          </div>
          <div id="read-match-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    } else if (ex.type === 'backward_spelling') {
      const target = (ex.targetWord || '').toUpperCase();
      const chars = target.split('');
      const shuffledTiles = [...chars].map((c, i) => ({ id: i, char: c })).sort(() => Math.random() - 0.5);

      return `
        <div class="spelling-puzzle-card" style="margin:0">
          <div style="font-weight:800;font-size:15px;color:#1e40af;margin-bottom:6px">
            🔤 ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Backward Spelling & Word Puzzle:`}
          </div>
          <div style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:4px">
            💡 Gợi ý/Định nghĩa: <span style="color:#0369a1">${esc(ex.clue || '')}</span>
          </div>
          ${ex.hint ? `<div style="font-size:12px;color:#64748b;margin-bottom:10px">🔑 ${esc(ex.hint)}</div>` : ''}

          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;text-align:center">Các chữ cái bạn đã chọn:</div>
          <div class="spelling-assembled-row" id="spelling-assembled-${idx}">
            <span style="color:#94a3b8;font-size:13px" id="spelling-ph-${idx}">(Bấm các ô chữ cái bên dưới để ghép từ)</span>
          </div>

          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;text-align:center">Ngân hàng chữ cái:</div>
          <div class="spelling-tiles-container" id="spelling-pool-${idx}">
            ${shuffledTiles.map(tile => `
              <button type="button" class="spelling-char-tile" id="sp-tile-${idx}-${tile.id}" onclick="window.placeSpellingTile(${idx}, ${tile.id}, '${tile.char}')">${tile.char}</button>
            `).join('')}
          </div>

          <div style="display:flex;gap:10px;justify-content:center;margin-top:14px">
            <button class="btn btn-p" onclick="window.checkSpellingPuzzle(${idx}, '${target}')">✅ Kiểm tra từ vựng</button>
            <button class="btn btn-sm" onclick="window.resetSpellingPuzzle(${idx})">🔄 Xếp lại</button>
            <button class="btn btn-sm" onclick="window.speakVocab('${target}')" style="background:#fff;border:1px solid #cbd5e1">🔊 Nghe phát âm</button>
          </div>
          <div id="spelling-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    } else if (ex.type === 'mcq' || ex.type === 'tfng') {
      return `
        <div class="card" style="margin:0">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b">
            ${ex.title ? `<b>${esc(ex.title)}</b><br>` : ''}Câu ${idx + 1}: ${ex.question}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(ex.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkReadMCQ(${idx}, ${oIdx}, ${ex.answer})" id="read-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
          <div id="read-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `;
    }
    return '';
  }).join('');
}

window.checkReadingMatching = function(exIdx) {
  const selects = document.querySelectorAll(`[id^="read-match-sel-${exIdx}-"]`);
  const fb = document.getElementById(`read-match-fb-${exIdx}`);
  if (!selects.length || !fb) return;

  let correctCount = 0;
  let hasUnselected = false;

  selects.forEach((sel, i) => {
    const row = document.getElementById(`read-match-row-${exIdx}-${i}`);
    const userVal = (sel.value || '').trim().toLowerCase();
    const correctVal = (sel.dataset.correct || '').trim().toLowerCase();

    if (!userVal) hasUnselected = true;

    if (userVal && userVal === correctVal) {
      correctCount++;
      if (row) {
        row.className = 'matching-row correct';
      }
    } else if (userVal) {
      if (row) {
        row.className = 'matching-row wrong';
      }
    } else {
      if (row) row.className = 'matching-row';
    }
  });

  if (hasUnselected) {
    alert('Vui lòng chọn đầy đủ các định nghĩa trước khi kiểm tra!');
    return;
  }

  fb.style.display = 'block';
  if (correctCount === selects.length) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Hoàn hảo!</b> Bạn đã nối chính xác toàn bộ ${correctCount}/${selects.length} từ vựng với định nghĩa.`;
    playSuccessSound();
    addXP(25, 'Nối từ vựng đọc hiểu chính xác');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `⚠️ <b>Kết quả:</b> Bạn đã nối đúng ${correctCount}/${selects.length} cặp. Hãy xem các dòng màu đỏ để chỉnh lại nhé!`;
    playWrongSound();
  }
};

window.spellingAssembledState = {};

window.placeSpellingTile = function(exIdx, tileId, char) {
  if (!window.spellingAssembledState[exIdx]) window.spellingAssembledState[exIdx] = [];
  window.spellingAssembledState[exIdx].push({ tileId, char });

  const btn = document.getElementById(`sp-tile-${exIdx}-${tileId}`);
  if (btn) btn.classList.add('used');

  renderAssembledSpelling(exIdx);
};

function renderAssembledSpelling(exIdx) {
  const box = document.getElementById(`spelling-assembled-${exIdx}`);
  const list = window.spellingAssembledState[exIdx] || [];
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<span style="color:#94a3b8;font-size:13px">(Bấm các ô chữ cái bên dưới để ghép từ)</span>`;
    return;
  }

  box.innerHTML = list.map((item, i) => `
    <button type="button" class="spelling-char-tile" style="background:#2563eb;color:#fff;border-color:#1d4ed8" onclick="window.removeSpellingTile(${exIdx}, ${i})">
      ${item.char}
    </button>
  `).join('');
}

window.removeSpellingTile = function(exIdx, itemIndex) {
  const list = window.spellingAssembledState[exIdx] || [];
  const removed = list.splice(itemIndex, 1)[0];
  if (removed) {
    const btn = document.getElementById(`sp-tile-${exIdx}-${removed.tileId}`);
    if (btn) btn.classList.remove('used');
  }
  renderAssembledSpelling(exIdx);
};

window.resetSpellingPuzzle = function(exIdx) {
  window.spellingAssembledState[exIdx] = [];
  const pool = document.getElementById(`spelling-pool-${exIdx}`);
  if (pool) {
    pool.querySelectorAll('.spelling-char-tile').forEach(b => b.classList.remove('used'));
  }
  renderAssembledSpelling(exIdx);
  const fb = document.getElementById(`spelling-fb-${exIdx}`);
  if (fb) fb.style.display = 'none';
};

window.checkSpellingPuzzle = function(exIdx, targetWord) {
  const list = window.spellingAssembledState[exIdx] || [];
  const assembled = list.map(item => item.char).join('').toUpperCase();
  const fb = document.getElementById(`spelling-fb-${exIdx}`);
  if (!fb) return;

  const target = targetWord.trim().toUpperCase();

  fb.style.display = 'block';
  if (assembled === target) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Chính xác!</b> Từ vựng đúng: <b>${target}</b>`;
    playSuccessSound();
    addXP(20, 'Giải đố đánh vần từ vựng');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `❌ <b>Chưa đúng chính tả!</b> Từ bạn ghép là "${assembled}". Hãy thử lại!`;
    playWrongSound();
  }
};

window.checkReadMCQ = function(exIdx, chosenIdx, correctIdx) {
  const fb = document.getElementById(`read-fb-${exIdx}`);
  const btn = document.getElementById(`read-opt-${exIdx}-${chosenIdx}`);
  if (!fb || !btn) return;

  const allBtns = document.querySelectorAll(`[id^="read-opt-${exIdx}-"]`);
  allBtns.forEach(b => (b.disabled = true));

  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> ' + (currentReadLesson.exercises[exIdx]?.explain || '');
    fb.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Đọc hiểu đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`read-opt-${exIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + (currentReadLesson.exercises[exIdx]?.explain || '');
    fb.style.display = 'block';
    playWrongSound();
  }
};

// =========================================================================
// 3. SPEAKING & VIDEO ROLEPLAY MODULE
// =========================================================================

let currentRpLesson = null;
let currentRpRole = null; // 'A' | 'B' | 'ALL'
let currentRpTurnIdx = 0;
let rpScores = {}; // { [turnIdx]: { score, transcript, diffHtml } }
let isRpRecording = false;
let rpSpeechRecognizer = null;
let rpPlaybackSpeed = 1.0;
let rpAutoPlay = true;

function initSpeaking() {
  const list = getUnitSkillList(currentUnit, 'speaking');
  currentSpkLesson = list[0] || null;
  renderSpeakingLessons();
  if (currentSpkLesson) loadSpeakingLesson(currentSpkLesson.id);
  else {
    const ws = document.getElementById('spk-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài nói trong Unit này.</div>';
  }
}

function renderSpeakingLessons() {
  const container = document.getElementById('spk-lesson-list');
  const list = getUnitSkillList(currentUnit, 'speaking');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;width:100%">📭 Chưa có bài nói trong Unit này.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = currentSpkLesson && item.id === currentSpkLesson.id;
    const isVideoRp = item.type === 'video_roleplay' || (item.characterA && item.characterB);
    const badgeLabel = isVideoRp ? '🎬 Video Roleplay A-B' : (item.level || currentUnit.level || 'A2 - B1');
    const badgeClass = isVideoRp ? 'background:#fdf2f8;color:#db2777;border:1px solid #fbcfe8;' : '';

    return `
      <div class="lesson-card ${isSelected ? 'active' : ''}" onclick="window.selectSpeakingLesson('${item.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="lesson-badge" style="${badgeClass}">${badgeLabel}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">${item.title}</div>
        <div class="lesson-meta">🎯 Chủ đề: ${item.topic || currentUnit.topic || 'General'}</div>
      </div>
    `;
  }).join('');
}

window.selectSpeakingLesson = function(id) {
  const list = getUnitSkillList(currentUnit, 'speaking');
  const found = list.find(s => s.id === id);
  if (found) {
    currentSpkLesson = found;
    currentRpRole = null; // reset role selection on lesson change
    renderSpeakingLessons();
    loadSpeakingLesson(id);
  }
};

function loadSpeakingLesson(id) {
  const s = currentSpkLesson;
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !s) return;

  // Dừng mọi nhận diện giọng nói hoặc audio trước đó
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (rpSpeechRecognizer) {
    try { rpSpeechRecognizer.stop(); } catch(e){}
  }

  // 1. NẾU LÀ BÀI HỌC VIDEO ROLEPLAY (HỘI THOẠI 2 NHÂN VẬT A & B)
  if (s.type === 'video_roleplay' || (s.characterA && s.characterB) || (s.dialogue && s.dialogue.some(d => d.speaker === 'A' || d.speaker === 'B'))) {
    currentRpLesson = s;
    if (!currentRpRole) {
      renderRoleSelectionView(s);
    } else {
      renderActiveRoleplayView();
    }
    return;
  }

  // 2. NẾU LÀ CÁC CÂU LUYỆN PHÁT ÂM ĐƠN LẺ (PHRASES)
  if (s.phrases && s.phrases.length) {
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        ${s.phrases.map((p, idx) => `
          <div class="card" style="margin:0;border-left:4px solid #f43f5e">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:8px">
              <div>
                <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:4px">${p.text}</div>
                <div style="font-family:'Courier New',monospace;color:#e11d48;font-size:14px">${p.ipa || ''}</div>
                <div style="font-size:13px;color:#475569;margin-top:4px">💡 <i>${p.meaning || ''}</i></div>
                ${p.tip ? `<div class="video-tip-pill" style="margin-top:8px"><span>🎯</span> <span><b>Mẹo phát âm:</b> ${p.tip}</span></div>` : ''}
              </div>
              <button class="btn btn-sm" onclick="window.speakPronunciation('${p.text.replace(/'/g, "\\'")}')" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;white-space:nowrap">🔊 Nghe mẫu</button>
            </div>
            
            <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-top:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
              <button class="btn btn-p" id="btn-spk-rec-${idx}" onclick="window.togglePronunciationRecording(${idx}, '${p.text.replace(/'/g, "\\'")}')" style="background:#e11d48;border-color:#e11d48">
                🎙️ Bấm để nói
              </button>
              <div id="spk-score-${idx}" style="font-weight:800;font-size:16px;color:#64748b">Điểm: --</div>
            </div>
            <div id="spk-result-${idx}" style="margin-top:10px;font-size:14px;display:none" class="spoken-transcript-result"></div>
          </div>
        `).join('')}
      </div>
    `;
    typesetMath(workspace);
    return;
  }

  // 3. FALLBACK: Hội thoại cơ bản không có video
  if (s.dialogue) {
    workspace.innerHTML = `
      <div class="card" style="max-width:700px;margin:0 auto">
        <div style="font-weight:700;font-size:16px;margin-bottom:14px;color:#1e293b">💬 Hội thoại tương tác (Interactive Dialogue)</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${s.dialogue.map((d, idx) => `
            <div style="display:flex;gap:12px;align-items:flex-start;${d.isUser ? 'flex-direction:row-reverse' : ''}">
              <div style="font-size:28px">${d.avatar || '👤'}</div>
              <div style="max-width:80%;background:${d.isUser ? '#eff6ff' : '#f1f5f9'};padding:12px 16px;border-radius:12px;border:${d.isUser ? '1px solid #bfdbfe' : '1px solid #e2e8f0'}">
                <div style="font-weight:700;font-size:12px;color:${d.isUser ? '#1d4ed8' : '#475569'};margin-bottom:4px">${d.role || d.speakerName || 'Speaker'}</div>
                <div style="font-size:14px;color:#1e293b;line-height:1.5">${d.isUser ? d.targetText || d.text : d.text}</div>
                ${d.ipa ? `<div style="font-family:'Courier New',monospace;font-size:12.5px;color:#db2777;margin-top:3px">${d.ipa}</div>` : ''}
                ${d.meaning ? `<div style="font-size:12px;color:#64748b;margin-top:4px"><i>${d.meaning}</i></div>` : ''}
                <div style="margin-top:8px;display:flex;gap:8px">
                  <button class="btn btn-sm" onclick="window.speakPronunciation('${(d.targetText || d.text || '').replace(/'/g, "\\'")}')" style="background:#fff;font-size:11px">🔊 Nghe mẫu</button>
                  <button class="btn btn-sm btn-p" onclick="window.togglePronunciationRecording('dlg-${idx}', '${(d.targetText || d.text || '').replace(/'/g, "\\'")}')" style="font-size:11px">🎙️ Đọc câu này</button>
                </div>
                <div id="spk-score-dlg-${idx}" style="margin-top:6px;font-weight:700;font-size:13px;color:#047857"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    typesetMath(workspace);
  }
}

// -------------------------------------------------------------------------
// 3.1 MÀN HÌNH CHỌN VAI TRÒ VIDEO ROLEPLAY (HỖ TRỢ ĐA NHÂN VẬT: A, B, C, D...)
// -------------------------------------------------------------------------
function getLessonCharacters(lesson) {
  if (!lesson) return [];
  if (lesson.characters && Array.isArray(lesson.characters) && lesson.characters.length > 0) {
    return lesson.characters.map((c, idx) => ({
      code: c.code || String.fromCharCode(65 + idx),
      id: c.id || c.code || String.fromCharCode(65 + idx),
      name: c.name || `Nhân vật ${String.fromCharCode(65 + idx)}`,
      avatar: c.avatar || (idx % 2 === 0 ? '👩‍💼' : '🧑‍💼'),
      roleTitle: c.roleTitle || `Speaker ${String.fromCharCode(65 + idx)}`,
      color: c.color || (idx === 0 ? '#2563eb' : idx === 1 ? '#059669' : idx === 2 ? '#db2777' : '#7c3aed'),
      videoUrl: c.videoUrl || ''
    }));
  }
  const chars = [];
  if (lesson.characterA) chars.push({ code: 'A', id: 'A', ...lesson.characterA, color: lesson.characterA.color || '#2563eb' });
  if (lesson.characterB) chars.push({ code: 'B', id: 'B', ...lesson.characterB, color: lesson.characterB.color || '#059669' });
  if (lesson.characterC) chars.push({ code: 'C', id: 'C', ...lesson.characterC, color: lesson.characterC.color || '#db2777' });
  if (lesson.characterD) chars.push({ code: 'D', id: 'D', ...lesson.characterD, color: lesson.characterD.color || '#7c3aed' });
  if (!chars.length) {
    chars.push({ code: 'A', id: 'A', name: 'Nhân vật A', avatar: '👩‍💼', roleTitle: 'Speaker A', color: '#2563eb' });
    chars.push({ code: 'B', id: 'B', name: 'Nhân vật B', avatar: '🧑‍💼', roleTitle: 'Speaker B', color: '#059669' });
  }
  return chars;
}

function getCharacterByCode(lesson, code) {
  const chars = getLessonCharacters(lesson);
  return chars.find(c => c.code === code || c.id === code) || chars[0] || { code, name: `Nhân vật ${code}`, avatar: '👤', color: '#2563eb' };
}

function renderRoleSelectionView(lesson) {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace) return;

  const chars = getLessonCharacters(lesson);
  const turnsCount = (lesson.dialogue || []).length;

  workspace.innerHTML = `
    <div class="video-rp-container">
      <div class="video-rp-header">
        <div class="video-rp-title-wrap">
          <span class="video-rp-badge">🎬 Multi-Character Video Roleplay</span>
          <span style="font-weight:800;font-size:16px;color:#0f172a">${lesson.title}</span>
        </div>
        <div style="font-size:13px;color:#64748b;font-weight:600">
          🎯 Chủ đề: <b>${lesson.topic || 'Giao tiếp'}</b> • ${chars.length} nhân vật • ${turnsCount} lượt thoại
        </div>
      </div>

      <div class="role-select-screen">
        <div style="font-size:36px;margin-bottom:8px">🎭</div>
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px">Chọn Nhân Vật Bạn Muốn Đóng Vai</h2>
        <p style="font-size:14px;color:#64748b;max-width:620px;margin:0 auto 20px auto">
          ${lesson.description || 'Bạn sẽ trực tiếp đóng vai nhân vật đã chọn. Hệ thống tự động phát video của các nhân vật đối tác và chuyển lượt thông minh để bạn luyện nói!'}
        </p>

        <div class="role-select-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;max-width:960px;margin:0 auto">
          ${chars.map(c => {
            const charTurns = (lesson.dialogue || []).filter(d => d.speaker === c.code).length;
            return `
              <div class="role-card" onclick="window.startRoleplayAsRole('${c.code}')" style="border-top:4px solid ${c.color};position:relative;background:#ffffff;border-radius:14px;padding:20px 16px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,0.06);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s">
                <div style="position:absolute;top:12px;right:12px;background:${c.color}15;color:${c.color};padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:800">
                  VAI ${c.code}
                </div>
                <div class="role-avatar-circle" style="font-size:42px;width:76px;height:76px;margin:0 auto 12px auto;display:flex;align-items:center;justify-content:center;background:${c.color}10;border:2px solid ${c.color}40;border-radius:50%">
                  ${c.avatar || '👤'}
                </div>
                <div class="role-card-name" style="font-weight:800;font-size:15px;color:#0f172a;margin-bottom:4px">${c.name}</div>
                <div class="role-card-title" style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px">${c.roleTitle || 'Nhân vật hội thoại'}</div>
                <div style="font-size:12px;color:#475569;margin-bottom:16px;line-height:1.4">
                  👉 Luyện nói: <b>${charTurns} lượt thoại</b><br>
                  🤖 Máy phát video các vai còn lại
                </div>
                <button type="button" class="btn btn-p" style="width:100%;background:${c.color};border-color:${c.color};font-size:13px;padding:8px">
                  Đóng Vai ${c.name.split('(')[0].trim()} →
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <div style="margin-top:20px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.startRoleplayAsRole('ALL')" style="background:#ffffff;border:1.5px solid #cbd5e1;color:#475569;padding:8px 18px;font-weight:700">
            🎬 Chế độ Luyện toàn bộ (Luyện nói tất cả các nhân vật)
          </button>
        </div>
      </div>
    </div>
  `;
}

window.startRoleplayAsRole = function(role) {
  currentRpRole = role;
  currentRpTurnIdx = 0;
  rpScores = {};
  renderActiveRoleplayView();
  playCurrentRpTurn();
};

window.switchRoleplayRoleModal = function() {
  if (!currentRpLesson) return;
  const chars = getLessonCharacters(currentRpLesson);
  if (!chars.length) return;
  const currIdx = chars.findIndex(c => c.code === currentRpRole);
  const nextChar = chars[(currIdx + 1) % chars.length];
  if (confirm(`Bạn có muốn đổi sang đóng vai ${nextChar.name} không?`)) {
    window.startRoleplayAsRole(nextChar.code);
  }
};

window.openRoleSelectionScreen = function() {
  currentRpRole = null;
  if (currentRpLesson) renderRoleSelectionView(currentRpLesson);
};

// -------------------------------------------------------------------------
// 3.2 GIAO DIỆN PHÒNG THU VIDEO ROLEPLAY TƯƠNG TÁC (INTERACTIVE STUDIO)
// -------------------------------------------------------------------------
function renderActiveRoleplayView() {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !currentRpLesson) return;

  const lesson = currentRpLesson;
  const dialogue = lesson.dialogue || [];
  const chars = getLessonCharacters(lesson);
  const currentLine = dialogue[currentRpTurnIdx] || dialogue[0];
  const isUserTurn = currentRpRole === 'ALL' || (currentLine && currentLine.speaker === currentRpRole);
  const activeChar = getCharacterByCode(lesson, currentLine?.speaker);
  const myChar = currentRpRole === 'ALL' ? { name: 'Toàn bộ các vai', avatar: '👥', color: '#6366f1' } : getCharacterByCode(lesson, currentRpRole);

  workspace.innerHTML = `
    <div class="video-rp-container">
      <!-- HEADER THANH ĐIỀU KHIỂN -->
      <div class="video-rp-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="video-rp-badge">🎬 Video Studio</span>
          <span style="font-weight:800;font-size:15px;color:#0f172a">${lesson.title}</span>
          <div style="background:${myChar.color}15;color:${myChar.color};border:1.5px solid ${myChar.color}40;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px">
            <span>${myChar.avatar || '👤'}</span>
            <span>Bạn đang đóng: <b>${myChar.name}</b></span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.switchRoleplayRoleModal()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:12px;font-weight:700" title="Đổi sang vai tiếp theo">
            🔁 Đổi vai
          </button>
          <button class="btn btn-sm" onclick="window.openRoleSelectionScreen()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:12px" title="Quay lại chọn vai">
            ⚙️ Chọn lại vai
          </button>
          <span class="cat-badge" style="background:#eff6ff;color:#1e40af;margin:0;font-weight:800">
            Lượt ${currentRpTurnIdx + 1}/${dialogue.length}
          </span>
        </div>
      </div>

      <!-- KHUNG TRÌNH DIỄN VIDEO & THU ÂM -->
      <div class="video-rp-stage">
        <!-- CỘT TRÁI: VIDEO PLAYER & BẢNG ĐIỀU KHIỂN NÓI -->
        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- KHUNG VIDEO TƯƠNG TÁC -->
          <div class="video-player-frame" id="rp-video-container">
            <div class="video-turn-indicator" id="rp-turn-indicator">
              <span class="video-speaker-tag" style="background:${activeChar.color || '#2563eb'}">
                ${activeChar.avatar || '👤'} ${currentLine?.speakerName || activeChar.name}
              </span>
              <span id="rp-turn-status-text">
                ${isUserTurn ? '🎙️ Đến lượt bạn nói!' : '🔊 Đang nghe đối tác nói...'}
              </span>
            </div>

            <!-- THẺ VIDEO THỰC TẾ -->
            <video id="rp-video-player" playsinline preload="auto" style="display:none;width:100%;height:100%;max-height:340px;object-fit:cover;background:#000"></video>

            <!-- KHUNG SÂN KHẤU AVATAR DỰ PHÒNG HOẶC ĐANG TẢI -->
            <div id="rp-avatar-stage" class="video-avatar-stage" style="background:radial-gradient(circle, ${activeChar.color}25 0%, #0f172a 100%)">
              <div style="font-size:72px;margin-bottom:12px;animation:float-avatar 3s ease-in-out infinite">
                ${activeChar.avatar || '👤'}
              </div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:4px">
                ${currentLine?.speakerName || activeChar.name}
              </div>
              <div style="font-size:13px;color:#94a3b8;font-weight:600">
                ${activeChar.roleTitle || 'Nhân vật hội thoại'}
              </div>
            </div>
          </div>

          <!-- KHUNG PHỤ ĐỀ KARAOKE & PHIÊN ÂM IPA & DỊCH NGHĨA -->
          <div class="video-subtitle-overlay" id="rp-subtitle-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:12px;font-weight:800;color:${activeChar.color || '#2563eb'};text-transform:uppercase;letter-spacing:0.5px">
                ${activeChar.avatar || '👤'} ${currentLine?.speakerName || activeChar.name} ${isUserTurn ? '(LƯỢT CỦA BẠN)' : '(ĐỐI TÁC)'}
              </div>
              <button class="btn btn-sm" onclick="window.speakCurrentLineTTS()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:11.5px;padding:3px 10px">
                🔊 Nghe mẫu
              </button>
            </div>

            <div class="video-subtitle-text" id="rp-subtitle-target-text">${currentLine?.text || ''}</div>
            
            ${currentLine?.ipa ? `
              <div class="video-subtitle-ipa" id="rp-subtitle-ipa">
                ${currentLine.ipa}
              </div>
            ` : ''}

            ${currentLine?.meaning ? `
              <div class="video-subtitle-meaning" id="rp-subtitle-meaning">
                💡 <b>Nghĩa:</b> ${currentLine.meaning}
              </div>
            ` : ''}

            ${currentLine?.tip ? `
              <div class="video-tip-pill" id="rp-subtitle-tip">
                <span>🎯</span>
                <span><b>Mẹo phát âm:</b> ${currentLine.tip}</span>
              </div>
            ` : ''}
          </div>

          <!-- KHUNG TƯƠNG TÁC THU ÂM CỦA HỌC VIÊN -->
          <div class="user-speak-box ${isUserTurn ? 'active-turn' : ''}" id="rp-speak-box">
            ${isUserTurn ? `
              <div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%">
                <div style="font-size:14px;font-weight:800;color:#1e40af">
                  🎙️ Hãy đọc to câu trên bằng tiếng Anh:
                </div>
                
                <button type="button" class="mic-rec-btn" id="rp-mic-btn" onclick="window.toggleRoleplayRecording()" title="Bấm để ghi âm phát âm">
                  🎙️
                </button>
                <div id="rp-mic-status-label" style="font-size:13px;font-weight:700;color:#64748b">
                  Bấm vào Mic để bắt đầu nói
                </div>

                <!-- BẢNG SO KHỚP TỪNG TỪ (WORD DIFF) -->
                <div class="speech-diff-box" id="rp-diff-box" style="display:none;width:100%;background:#ffffff;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;margin-top:6px">
                  <div style="font-size:11.5px;font-weight:800;color:#475569;margin-bottom:6px;text-transform:uppercase">
                    Kết quả nhận diện giọng nói:
                  </div>
                  <div id="rp-diff-content" style="line-height:1.6"></div>
                </div>

                <!-- ĐIỂM SỐ VÀ NÚT ĐIỀU HƯỚNG -->
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:6px;flex-wrap:wrap;gap:8px">
                  <div id="rp-turn-score-val" style="font-size:15px;font-weight:800;color:#0f172a">
                    Điểm: <span style="color:#64748b">Chưa nói</span>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-sm" onclick="window.speakCurrentLineTTS()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:12px">
                      🔊 Nghe lại mẫu
                    </button>
                    <button class="btn btn-sm btn-p" onclick="window.advanceRoleplayTurnManual()" style="font-size:12px">
                      Tiếp tục ❯
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <div style="padding:16px 0;text-align:center;width:100%">
                <div style="font-size:28px;margin-bottom:6px">🎧</div>
                <div style="font-size:14px;font-weight:700;color:#475569">
                  Đang lắng nghe đối tác (<b>${currentLine?.speakerName || activeChar.name}</b>) nói...
                </div>
                <div style="margin-top:12px;display:flex;justify-content:center;gap:10px">
                  <button class="btn btn-sm" onclick="window.replayCurrentRpTurn()" style="background:#ffffff;border:1px solid #cbd5e1">
                    🔄 Phát lại câu này
                  </button>
                  <button class="btn btn-sm btn-p" onclick="window.advanceRoleplayTurnManual()">
                    Bỏ qua sang lượt bạn ❯
                  </button>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- CỘT PHẢI: TOÀN BỘ KỊCH BẢN HỘI THOẠI & TIẾN TRÌNH -->
        <div class="card" style="margin:0;padding:16px;background:#f8fafc;border:1.5px solid #cbd5e1;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">
            <span style="font-weight:800;font-size:13.5px;color:#0f172a">📋 Kịch bản hội thoại:</span>
            <span style="font-size:11.5px;color:#64748b">Bấm câu bất kỳ để luyện</span>
          </div>

          <div class="dialogue-timeline">
            ${dialogue.map((d, idx) => {
              const isCurrent = idx === currentRpTurnIdx;
              const spkChar = getCharacterByCode(lesson, d.speaker);
              const isUserLine = currentRpRole === 'ALL' || (d.speaker === currentRpRole);
              const scored = rpScores[idx];
              const isCompleted = scored && scored.score >= 75;

              return `
                <div class="timeline-line-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}" onclick="window.jumpToRoleplayTurn(${idx})">
                  <div class="timeline-avatar">${spkChar.avatar || '👤'}</div>
                  <div class="timeline-content">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
                      <span class="timeline-speaker-name" style="color:${spkChar.color || '#2563eb'}">
                        ${d.speakerName || spkChar.name} ${isUserLine ? '• (Bạn nói)' : ''}
                      </span>
                      ${scored ? `
                        <span class="timeline-status-badge" style="background:${scored.score >= 75 ? '#dcfce7;color:#15803d' : '#fee2e2;color:#b91c1c'}">
                          ${scored.score}%
                        </span>
                      ` : isCurrent ? `
                        <span class="timeline-status-badge" style="background:#dbeafe;color:#1d4ed8">▶ Đang phát</span>
                      ` : ''}
                    </div>
                    <div class="timeline-text">${d.text}</div>
                    ${d.meaning ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px"><i>${d.meaning}</i></div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  typesetMath(workspace);
}

// -------------------------------------------------------------------------
// 3.3 ĐIỀU PHỐI PHÁT VIDEO / LỜI THOẠI & CHUYỂN LƯỢT TỰ ĐỘNG
// -------------------------------------------------------------------------
let activeMediaRecorder = null;
let activeAudioStream = null;
let recordedAudioChunks = [];
let currentUserAudioElement = null;
let advanceTimerTimeout = null;

export function stopUserAudioPlayback() {
  if (currentUserAudioElement) {
    try {
      currentUserAudioElement.pause();
      currentUserAudioElement.currentTime = 0;
    } catch (e) {}
    currentUserAudioElement = null;
  }
  document.querySelectorAll('.voice-playback-btn').forEach(btn => {
    btn.classList.remove('playing');
    btn.innerHTML = '🎧 Nghe lại giọng của bạn';
  });
}

window.playUserRecordedAudio = function(customUrl = null) {
  const audioUrl = customUrl || rpScores[currentRpTurnIdx]?.userAudioUrl;
  if (!audioUrl) {
    alert('Chưa có bản ghi âm. Vui lòng bấm Mic đọc câu để hệ thống thu âm giọng của bạn!');
    return;
  }

  if (currentUserAudioElement && !currentUserAudioElement.paused) {
    stopUserAudioPlayback();
    return;
  }

  stopUserAudioPlayback();
  currentUserAudioElement = new Audio(audioUrl);
  currentUserAudioElement.onended = () => stopUserAudioPlayback();
  currentUserAudioElement.onerror = () => stopUserAudioPlayback();
  currentUserAudioElement.play().catch(e => {
    console.warn("Audio play error:", e);
    stopUserAudioPlayback();
  });
};

function playCurrentRpTurn() {
  if (!currentRpLesson) return;
  const dialogue = currentRpLesson.dialogue || [];
  const currentLine = dialogue[currentRpTurnIdx];
  if (!currentLine) return;

  if (advanceTimerTimeout) clearTimeout(advanceTimerTimeout);
  stopUserAudioPlayback();

  const isUserTurn = currentRpRole === 'ALL' || (currentLine.speaker === currentRpRole);
  renderActiveRoleplayView();

  const refreshedVideoElem = document.getElementById('rp-video-player');
  const refreshedAvatarStage = document.getElementById('rp-avatar-stage');

  if (isUserTurn) {
    // LƯỢT CỦA HỌC VIÊN: Dừng video hoặc hiển thị avatar lắng nghe
    if (refreshedVideoElem) {
      refreshedVideoElem.pause();
      refreshedVideoElem.style.display = 'none';
    }
    if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';
  } else {
    // LƯỢT CỦA MÁY / ĐỐI TÁC: Phát video hoặc TTS tự nhiên
    const targetVideoUrl = currentLine.videoUrl || currentRpLesson.videoUrl;
    if (targetVideoUrl && refreshedVideoElem) {
      refreshedVideoElem.style.display = 'block';
      if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'none';

      refreshedVideoElem.src = targetVideoUrl;
      refreshedVideoElem.playbackRate = rpPlaybackSpeed;
      if (currentLine.startTime !== undefined) {
        refreshedVideoElem.currentTime = currentLine.startTime;
      }

      const playPromise = refreshedVideoElem.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video autoplay blocked, fallback to TTS:", err);
          if (refreshedVideoElem) refreshedVideoElem.style.display = 'none';
          if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';
          speakLineWithTTS(currentLine.text, () => {
            setTimeout(() => { window.advanceRoleplayTurnManual(); }, 700);
          });
        });
      }

      refreshedVideoElem.onended = () => {
        setTimeout(() => { window.advanceRoleplayTurnManual(); }, 700);
      };
    } else {
      // Không có video URL: Dùng Natural Speech Synthesis TTS
      if (refreshedVideoElem) refreshedVideoElem.style.display = 'none';
      if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';
      speakLineWithTTS(currentLine.text, () => {
        setTimeout(() => { window.advanceRoleplayTurnManual(); }, 700);
      });
    }
  }
}

function speakLineWithTTS(text, onEndCallback = null) {
  if (!currentRpLesson) {
    speakText(text, { onEnd: onEndCallback });
    return;
  }
  const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
  const spkChar = getCharacterByCode(currentRpLesson, currentLine?.speaker);
  
  let gender = 'neutral';
  const nameStr = ((spkChar.name || '') + ' ' + (spkChar.roleTitle || '')).toLowerCase();
  if (nameStr.includes('emma') || nameStr.includes('bella') || nameStr.includes('sarah') || nameStr.includes('elena') || (spkChar.avatar && spkChar.avatar.includes('👩')) || nameStr.includes('lễ tân') || nameStr.includes('receptionist')) {
    gender = 'female';
  } else if (nameStr.includes('alex') || nameStr.includes('david') || nameStr.includes('harrison') || (spkChar.avatar && (spkChar.avatar.includes('🧑') || spkChar.avatar.includes('👨'))) || nameStr.includes('mr')) {
    gender = 'male';
  }

  speakText(text, {
    gender,
    rate: rpPlaybackSpeed * 0.92,
    onEnd: onEndCallback
  });
}

window.speakCurrentLineTTS = function() {
  if (!currentRpLesson) return;
  const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
  if (currentLine) speakLineWithTTS(currentLine.text);
};

window.replayCurrentRpTurn = function() {
  playCurrentRpTurn();
};

window.jumpToRoleplayTurn = function(idx) {
  if (!currentRpLesson) return;
  const dialogue = currentRpLesson.dialogue || [];
  if (idx >= 0 && idx < dialogue.length) {
    currentRpTurnIdx = idx;
    playCurrentRpTurn();
  }
};

window.advanceRoleplayTurnManual = function() {
  if (!currentRpLesson) return;
  if (advanceTimerTimeout) clearTimeout(advanceTimerTimeout);
  const dialogue = currentRpLesson.dialogue || [];
  if (currentRpTurnIdx + 1 >= dialogue.length) {
    showRoleplayCompletionSummary();
  } else {
    currentRpTurnIdx++;
    playCurrentRpTurn();
  }
};

window.cancelAutoAdvance = function() {
  if (advanceTimerTimeout) {
    clearTimeout(advanceTimerTimeout);
    advanceTimerTimeout = null;
  }
  const statusLabel = document.getElementById('rp-mic-status-label');
  if (statusLabel) {
    statusLabel.innerHTML = '⏸️ <b>Đã dừng chuyển câu. Bạn có thể nghe lại giọng hoặc bấm "Đọc lại" để luyện tiếp!</b>';
  }
};

// -------------------------------------------------------------------------
// 3.4 THU ÂM HỌC VIÊN + NHẬN DIỆN GIỌNG NÓI & SO KHỚP TỪ (SPEECH DIFF)
// -------------------------------------------------------------------------
function computeWordDiffAndScore(targetText, spokenText) {
  const cleanTarget = String(targetText || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').trim().split(/\s+/).filter(Boolean);
  const cleanSpoken = String(spokenText || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').trim().split(/\s+/).filter(Boolean);
  
  if (!cleanTarget.length) return { score: 100, diffHtml: '<span>' + esc(targetText) + '</span>' };
  if (!cleanSpoken.length) return { score: 0, diffHtml: '<span style="color:#ef4444">' + esc(targetText) + '</span>' };
  
  let matchedCount = 0;
  const originalWords = String(targetText || '').split(/\s+/);
  
  const diffHtml = originalWords.map(origWord => {
    const norm = origWord.toLowerCase().replace(/[^a-z0-9']/g, '');
    const isMatched = cleanSpoken.some(spk => {
      if (spk === norm) return true;
      if (norm.length >= 4 && (spk.includes(norm) || norm.includes(spk))) return true;
      return false;
    });
    if (isMatched) {
      matchedCount++;
      return `<span class="diff-word-correct" style="color:#15803d;background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:700;margin:0 2px;">${esc(origWord)}</span>`;
    } else {
      return `<span class="diff-word-missing" style="color:#b91c1c;background:#fee2e2;padding:2px 6px;border-radius:4px;text-decoration:underline;margin:0 2px;">${esc(origWord)}</span>`;
    }
  }).join(' ');

  const score = Math.round(Math.min(100, Math.max(0, (matchedCount / originalWords.length) * 100)));
  return { score, diffHtml, matchedCount, totalWords: originalWords.length };
}

function startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  rpSpeechRecognizer = new SpeechRec();
  rpSpeechRecognizer.lang = 'en-US';
  rpSpeechRecognizer.interimResults = true;
  rpSpeechRecognizer.maxAlternatives = 1;

  isRpRecording = true;
  if (micBtn) {
    micBtn.classList.add('recording');
    micBtn.innerHTML = '🔴';
  }
  if (statusLabel) {
    statusLabel.innerHTML = '<span style="color:#dc2626;font-weight:800">🎙️ Đang nghe bạn nói... Hãy đọc to câu tiếng Anh!</span>';
  }

  let finalTranscript = '';

  rpSpeechRecognizer.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const currentSpoken = (finalTranscript || interim || '').trim();
    if (currentSpoken && diffBox && diffContent) {
      diffBox.style.display = 'block';
      const { score, diffHtml } = computeWordDiffAndScore(currentLine.text, currentSpoken);
      diffContent.innerHTML = diffHtml;
      if (scoreVal) {
        const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
        scoreVal.innerHTML = `Độ chính xác: <b style="color:${scoreColor};font-size:17px">${score}/100</b>`;
      }
    }
  };

  rpSpeechRecognizer.onend = () => {
    isRpRecording = false;
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '🎙️';
    }
    
    const targetText = currentLine.text;
    const { score, diffHtml } = computeWordDiffAndScore(targetText, finalTranscript);
    if (!rpScores[currentRpTurnIdx]) rpScores[currentRpTurnIdx] = {};
    rpScores[currentRpTurnIdx].score = score;
    rpScores[currentRpTurnIdx].transcript = finalTranscript;
    rpScores[currentRpTurnIdx].targetText = targetText;

    if (diffBox && diffContent) {
      diffBox.style.display = 'block';
      diffContent.innerHTML = diffHtml || `<span>${esc(targetText)}</span>`;
    }

    if (scoreVal) {
      const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
      scoreVal.innerHTML = `Điểm phát âm: <b style="color:${scoreColor};font-size:18px">${score}/100</b>`;
    }

    if (statusLabel) {
      if (score >= 75) {
        playSuccessSound();
        addXP(15, 'Hoàn thành lượt đóng vai xuất sắc');
        statusLabel.innerHTML = `✅ <b>Tuyệt vời (${score}%)!</b> Tự động chuyển câu sau 2 giây... <button class="btn btn-xs" onclick="window.cancelAutoAdvance()" style="margin-left:6px;background:#fff;border:1px solid #cbd5e1">Dừng chuyển</button>`;
        advanceTimerTimeout = setTimeout(() => {
          window.advanceRoleplayTurnManual();
        }, 2200);
      } else if (score >= 50) {
        playSuccessSound();
        statusLabel.innerHTML = `👍 <b>Khá tốt (${score}%)!</b> Bấm "Tiếp tục" hoặc bấm Mic để đọc lại đạt điểm cao hơn.`;
      } else {
        playWrongSound();
        statusLabel.innerHTML = `⚠️ <b>Chưa chuẩn (${score}%)!</b> Hãy bấm Mic để đọc lại rõ ràng hơn nhé.`;
      }
    }
  };

  rpSpeechRecognizer.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
    isRpRecording = false;
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '🎙️';
    }
    if (statusLabel) {
      statusLabel.innerHTML = '⚠️ Chưa nhận diện rõ âm thanh. Vui lòng bấm Mic đọc lại!';
    }
  };

  try {
    rpSpeechRecognizer.start();
  } catch (err) {
    console.warn("SpeechRecognizer start error:", err);
  }
}

window.toggleRoleplayRecording = function() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Trình duyệt của bạn chưa hỗ trợ Web Speech Recognition. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge trên máy tính/điện thoại!');
    return;
  }

  const currentLine = currentRpLesson?.dialogue?.[currentRpTurnIdx];
  if (!currentLine) return;

  if (advanceTimerTimeout) clearTimeout(advanceTimerTimeout);
  stopUserAudioPlayback();

  const micBtn = document.getElementById('rp-mic-btn');
  const statusLabel = document.getElementById('rp-mic-status-label');
  const diffBox = document.getElementById('rp-diff-box');
  const diffContent = document.getElementById('rp-diff-content');
  const scoreVal = document.getElementById('rp-turn-score-val');

  if (isRpRecording) {
    if (rpSpeechRecognizer) {
      try { rpSpeechRecognizer.stop(); } catch(e){}
    }
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }
    isRpRecording = false;
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '🎙️';
    }
    if (statusLabel) statusLabel.textContent = 'Đã dừng thu âm. Bấm Mic để nói lại';
    return;
  }

  navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then(stream => {
      activeAudioStream = stream;
      recordedAudioChunks = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else mimeType = '';
        }
        activeMediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        activeMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedAudioChunks.push(e.data);
        };
        activeMediaRecorder.onstop = () => {
          if (recordedAudioChunks.length > 0) {
            const blob = new Blob(recordedAudioChunks, { type: mimeType || 'audio/webm' });
            const userAudioUrl = URL.createObjectURL(blob);
            if (currentRpLesson) {
              if (!rpScores[currentRpTurnIdx]) rpScores[currentRpTurnIdx] = {};
              rpScores[currentRpTurnIdx].userAudioUrl = userAudioUrl;
            }
          }
          if (activeAudioStream) {
            activeAudioStream.getTracks().forEach(t => t.stop());
            activeAudioStream = null;
          }
        };
        activeMediaRecorder.start(100);
      }
      startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal);
    })
    .catch(err => {
      console.warn("getUserMedia fallback to SpeechRecognition:", err);
      startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal);
    });
};

// -------------------------------------------------------------------------
// 3.5 BÁO CÁO TỔNG KẾT & BÀI TẬP HIỂU VIDEO (COMPREHENSION QUIZ)
// -------------------------------------------------------------------------
function showRoleplayCompletionSummary() {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !currentRpLesson) return;

  const lesson = currentRpLesson;
  const dialogue = lesson.dialogue || [];
  const chars = getLessonCharacters(lesson);
  const myChar = currentRpRole === 'ALL' ? { name: 'Tất cả các vai', avatar: '👥', color: '#6366f1' } : getCharacterByCode(lesson, currentRpRole);
  
  const userTurns = dialogue.map((d, idx) => ({ ...d, idx })).filter(d => currentRpRole === 'ALL' || d.speaker === currentRpRole);
  const turnScores = userTurns.map(d => rpScores[d.idx]?.score ?? 0);
  const avgScore = turnScores.length ? Math.round(turnScores.reduce((a, b) => a + b, 0) / turnScores.length) : 85;

  let badgeEmoji = '🏆';
  let badgeTitle = 'Xuất Sắc! Giao Tiếp Tự Nhiên & Lưu Loát';
  let badgeColor = '#059669';
  if (avgScore < 60) {
    badgeEmoji = '🌱';
    badgeTitle = 'Cần Luyện Tập Thêm';
    badgeColor = '#dc2626';
  } else if (avgScore < 80) {
    badgeEmoji = '⭐';
    badgeTitle = 'Khá Tốt! Tiếp Tục Phát Huy';
    badgeColor = '#d97706';
  }

  addXP(30, 'Hoàn thành toàn bộ kịch bản Video Roleplay');
  const exercises = lesson.exercises || [];

  workspace.innerHTML = `
    <div class="video-rp-container">
      <div class="role-select-screen" style="max-width:840px;margin:0 auto;text-align:center">
        <div style="font-size:48px;margin-bottom:8px">${badgeEmoji}</div>
        <h2 style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:4px">Hoàn Thành Đóng Vai Video!</h2>
        <div style="font-size:16px;font-weight:700;color:${badgeColor};margin-bottom:16px">${badgeTitle}</div>
        
        <!-- THẺ ĐIỂM TỔNG HỢP -->
        <div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px;flex-wrap:wrap">
          <div class="card" style="margin:0;padding:16px 24px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px">
            <div style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase">Điểm Phát Âm Trung Bình</div>
            <div style="font-size:32px;font-weight:900;color:#15803d">${avgScore}<span style="font-size:18px">/100</span></div>
          </div>
          <div class="card" style="margin:0;padding:16px 24px;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:12px">
            <div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Vai Bạn Đã Đóng</div>
            <div style="font-size:18px;font-weight:800;color:#1d4ed8;margin-top:6px">${myChar.avatar || '👤'} ${myChar.name}</div>
          </div>
          <div class="card" style="margin:0;padding:16px 24px;background:#fdf2f8;border:1.5px solid #fbcfe8;border-radius:12px">
            <div style="font-size:12px;font-weight:700;color:#9d174d;text-transform:uppercase">Thưởng Điểm Tích Lũy</div>
            <div style="font-size:32px;font-weight:900;color:#db2777">+30 <span style="font-size:18px">XP ⭐</span></div>
          </div>
        </div>

        <!-- BẢNG CHI TIẾT TỪNG CÂU VÀ NGHE LẠI BẢN THU ÂM CỦA HỌC VIÊN -->
        <div class="card" style="text-align:left;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px">
          <div style="font-weight:800;font-size:15px;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <span>🎧</span> Bản ghi âm giọng đọc của bạn theo từng câu:
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${userTurns.map((d, i) => {
              const sc = rpScores[d.idx];
              const score = sc?.score ?? 0;
              const audioUrl = sc?.userAudioUrl;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;background:#ffffff;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;flex-wrap:wrap;gap:10px">
                  <div style="flex:1;min-width:260px">
                    <div style="font-weight:700;font-size:13.5px;color:#1e293b">${d.text}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px"><i>${d.meaning || ''}</i></div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-weight:800;font-size:14px;color:${score >= 75 ? '#15803d' : '#dc2626'};background:${score >= 75 ? '#dcfce7' : '#fee2e2'};padding:4px 10px;border-radius:6px">
                      ${score}%
                    </span>
                    ${audioUrl ? `
                      <button class="btn btn-sm" onclick="window.playUserRecordedAudio('${audioUrl}')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:12px">
                        🎧 Nghe lại giọng
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- PHẦN BÀI TẬP HIỂU VIDEO (COMPREHENSION QUIZ) NẾU CÓ -->
        ${exercises.length ? `
          <div class="card" style="text-align:left;background:#ffffff;border:2px solid #818cf8;border-radius:14px;margin-bottom:24px;box-shadow:0 4px 16px rgba(99,102,241,0.1);padding:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e0e7ff">
              <span style="font-size:22px">📝</span>
              <div>
                <div style="font-weight:800;font-size:16px;color:#3730a3">Bài Tập Kiểm Tra Hiểu Nội Dung Video (Comprehension Quiz)</div>
                <div style="font-size:12.5px;color:#6366f1">Trả lời các câu hỏi sau để củng cố kiến thức và kiểm tra độ hiểu:</div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:16px">
              ${exercises.map((ex, exIdx) => {
                if (ex.type === 'mcq') {
                  return `
                    <div class="card" style="margin:0;background:#f8fafc;border:1px solid #cbd5e1" id="rp-quiz-card-${exIdx}">
                      <div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:10px">
                        Câu ${exIdx + 1}: ${renderRich(ex.question)}
                      </div>
                      <div style="display:flex;flex-direction:column;gap:6px">
                        ${(ex.options || []).map((opt, optIdx) => `
                          <button class="opt" id="rp-opt-${exIdx}-${optIdx}" onclick="window.checkRoleplayQuizMCQ(${exIdx}, ${optIdx}, ${ex.answer}, '${(ex.explain || '').replace(/'/g, "\\'")}')" style="text-align:left;padding:8px 12px;background:#fff">
                            <span class="okey">${KEYS[optIdx]}</span>
                            <span>${renderRich(opt)}</span>
                          </button>
                        `).join('')}
                      </div>
                      <div id="rp-quiz-fb-${exIdx}" class="fb" style="display:none;margin-top:10px"></div>
                    </div>
                  `;
                } else if (ex.type === 'gap_fill') {
                  return `
                    <div class="card" style="margin:0;background:#f8fafc;border:1px solid #cbd5e1" id="rp-quiz-card-${exIdx}">
                      <div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:10px">
                        Câu ${exIdx + 1}: ${renderRich(ex.sentence)}
                      </div>
                      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                        <input type="text" id="rp-gap-input-${exIdx}" placeholder="Nhập từ còn thiếu..." style="max-width:240px;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px">
                        <button class="btn btn-p" onclick="window.checkRoleplayQuizGap(${exIdx}, '${(ex.correct || '').replace(/'/g, "\\'")}', '${(ex.explain || '').replace(/'/g, "\\'")}')">Kiểm tra</button>
                      </div>
                      <div id="rp-quiz-fb-${exIdx}" class="fb" style="display:none;margin-top:10px"></div>
                    </div>
                  `;
                }
                return '';
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- HÀNG NÚT ĐIỀU HƯỚNG CUỐI BÀI -->
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-p" onclick="window.startRoleplayAsRole('${currentRpRole}')" style="padding:10px 20px;font-weight:700">
            🔄 Luyện lại vai này (${myChar.name})
          </button>
          <button class="btn" onclick="window.openRoleSelectionScreen()" style="background:#ffffff;border:1.5px solid #cbd5e1;color:#1e293b;padding:10px 20px;font-weight:700">
            🎭 Chọn đóng vai nhân vật khác
          </button>
        </div>
      </div>
    </div>
  `;
  typesetMath(workspace);
}

if (typeof window !== 'undefined') {
  window.checkRoleplayQuizMCQ = function(exIdx, chosenIdx, correctIdx, explain) {
    const fb = document.getElementById(`rp-quiz-fb-${exIdx}`);
    const card = document.getElementById(`rp-quiz-card-${exIdx}`);
    if (!fb || !card) return;
    
    card.querySelectorAll('.opt').forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIdx) {
        btn.classList.add('correct');
      } else if (idx === chosenIdx) {
        btn.classList.add('wrong');
      }
    });

    fb.style.display = 'block';
    if (chosenIdx === correctIdx) {
      playSuccessSound();
      addXP(10, 'Trả lời đúng bài tập hiểu video');
      fb.className = 'fb ok';
      fb.innerHTML = `✅ <b>Chính xác!</b> ${explain ? `<br>${explain}` : ''}`;
    } else {
      playWrongSound();
      fb.className = 'fb bad';
      fb.innerHTML = `❌ <b>Chưa đúng!</b> Đáp án đúng là <b>${KEYS[correctIdx]}</b>. ${explain ? `<br>${explain}` : ''}`;
    }
  };

  window.checkRoleplayQuizGap = function(exIdx, correctWord, explain) {
    const input = document.getElementById(`rp-gap-input-${exIdx}`);
    const fb = document.getElementById(`rp-quiz-fb-${exIdx}`);
    if (!input || !fb) return;
    const val = input.value.trim().toLowerCase();
    const correct = String(correctWord || '').trim().toLowerCase();

    fb.style.display = 'block';
    if (val === correct) {
      playSuccessSound();
      addXP(10, 'Điền đúng từ trong bài tập video');
      fb.className = 'fb ok';
      fb.innerHTML = `✅ <b>Chính xác!</b> ${explain ? `<br>${explain}` : ''}`;
      input.disabled = true;
      input.style.borderColor = '#22c55e';
      input.style.background = '#f0fdf4';
    } else {
      playWrongSound();
      fb.className = 'fb bad';
      fb.innerHTML = `❌ <b>Chưa đúng!</b> Từ đúng là: <b>${correctWord}</b>. ${explain ? `<br>${explain}` : ''}`;
      input.style.borderColor = '#ef4444';
      input.style.background = '#fef2f2';
    }
  };
}



// -------------------------------------------------------------------------
// 3.6 THU ÂM & NGHE LẠI PHÁT ÂM CÂU ĐƠN LẺ (PHRASES)
// -------------------------------------------------------------------------
const phraseAudioMap = {};

window.playPhraseRecordedAudio = function(idx) {
  const audioUrl = phraseAudioMap[idx];
  if (!audioUrl) {
    alert('Chưa có bản ghi âm cho câu này. Hãy bấm Mic để đọc!');
    return;
  }
  stopUserAudioPlayback();
  const playBtn = document.getElementById(`btn-phrase-play-${idx}`);
  currentUserAudioElement = new Audio(audioUrl);
  if (playBtn) {
    playBtn.classList.add('playing');
    playBtn.innerHTML = '⏸️ Đang phát...';
  }
  currentUserAudioElement.onended = () => stopUserAudioPlayback();
  currentUserAudioElement.onerror = () => stopUserAudioPlayback();
  currentUserAudioElement.play().catch(e => {
    console.warn("Play error:", e);
    stopUserAudioPlayback();
  });
};

window.togglePronunciationRecording = function(idx, targetText) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Trình duyệt chưa hỗ trợ Web Speech Recognition. Vui lòng dùng Chrome hoặc Edge!');
    return;
  }

  stopUserAudioPlayback();

  const btn = document.getElementById(`btn-spk-rec-${idx}`);
  const scoreEl = document.getElementById(`spk-score-${idx}`);
  const resultEl = document.getElementById(`spk-result-${idx}`);

  if (isRecording) {
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch(e){}
    }
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }
    isRecording = false;
    if (btn) btn.textContent = '🎙️ Bấm để nói';
    return;
  }

  // Bắt đầu thu âm audio thật của học viên
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then(stream => {
      activeAudioStream = stream;
      recordedAudioChunks = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else mimeType = '';
        }
        activeMediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        activeMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedAudioChunks.push(e.data);
        };
        activeMediaRecorder.onstop = () => {
          if (recordedAudioChunks.length > 0) {
            const blob = new Blob(recordedAudioChunks, { type: mimeType || 'audio/webm' });
            phraseAudioMap[idx] = URL.createObjectURL(blob);
            renderPhrasePlaybackBtn(idx);
          }
          if (activeAudioStream) {
            activeAudioStream.getTracks().forEach(t => t.stop());
            activeAudioStream = null;
          }
        };
        activeMediaRecorder.start(100);
      }
      startPhraseRecognition(idx, targetText, btn, scoreEl, resultEl);
    })
    .catch(() => {
      startPhraseRecognition(idx, targetText, btn, scoreEl, resultEl);
    });
};

function startPhraseRecognition(idx, targetText, btn, scoreEl, resultEl) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  speechRecognizer = new SpeechRec();
  speechRecognizer.lang = 'en-US';
  speechRecognizer.interimResults = false;
  speechRecognizer.maxAlternatives = 1;

  speechRecognizer.onstart = () => {
    isRecording = true;
    if (btn) {
      btn.textContent = '🔴 Đang nghe bạn nói...';
      btn.classList.add('recording');
    }
  };

  speechRecognizer.onresult = (event) => {
    const transcript = event.results[0][0].transcript || '';
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }

    const { score, diffHtml } = computeWordDiffAndScore(targetText, transcript);

    if (scoreEl) {
      const color = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
      scoreEl.innerHTML = `Điểm phát âm: <span style="color:${color};font-weight:800;font-size:16px">${score}/100</span>`;
    }

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="margin-top:6px">🗣️ <b>Chi tiết từ phát âm:</b> ${diffHtml}</div>
      `;
    }

    if (score >= 75) {
      playSuccessSound();
      addXP(20, 'Phát âm chuẩn xác');
    } else {
      playWrongSound();
    }
  };

  speechRecognizer.onerror = (event) => {
    console.error("Lỗi nhận diện giọng nói:", event.error);
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }
    if (scoreEl) scoreEl.textContent = '⚠️ Chưa nhận diện được giọng nói!';
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch(e){}
    }
    if (btn) {
      btn.textContent = '🔄 Đọc lại lần nữa';
      btn.classList.remove('recording');
    }
  };

  speechRecognizer.start();
}

function renderPhrasePlaybackBtn(idx) {
  let playBtn = document.getElementById(`btn-phrase-play-${idx}`);
  if (!playBtn) {
    const container = document.getElementById(`btn-spk-rec-${idx}`)?.parentElement;
    if (!container) return;
    playBtn = document.createElement('button');
    playBtn.id = `btn-phrase-play-${idx}`;
    playBtn.className = 'voice-playback-btn';
    playBtn.style.padding = '6px 12px';
    playBtn.style.fontSize = '12px';
    playBtn.onclick = () => window.playPhraseRecordedAudio(idx);
    container.appendChild(playBtn);
  }
  playBtn.innerHTML = '🎧 Nghe lại giọng của bạn';
}

// =========================================================================
// 4. WRITING MODULE
// =========================================================================

function initWriting() {
  if (!currentWrtCategory) currentWrtCategory = 'transformation';
  loadWritingView(currentWrtCategory);
}

window.selectWritingTab = function(type) {
  currentWrtCategory = type;
  loadWritingView(type);
};

function loadWritingView(type) {
  const workspace = document.getElementById('wrt-workspace');
  if (!workspace || !currentUnit) return;

  const wrtData = getUnitSkillList(currentUnit, 'writing');
  if (!type) type = 'transformation';
  currentWrtCategory = type;

  const transformGroup = wrtData.find(w => w.category === 'transformation' || w.id?.includes('transform')) || wrtData[0];
  const scrambleGroup = wrtData.find(w => w.category === 'scramble' || w.id?.includes('scramble')) || wrtData[1];
  const errorGroup = wrtData.find(w => w.category === 'error_fix' || w.id?.includes('error_fix')) || wrtData[2];

  let subviewHtml = '';

  if (type === 'transformation') {
    const items = transformGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        <div style="font-size:14px;color:#475569;margin-bottom:2px">
          💡 Hãy chuyển đổi các câu khẳng định sau sang: <b>a) Thể Phủ định (-)</b> và <b>b) Thể Nghi vấn (?)</b>.
        </div>
        ${items.map((item, idx) => `
          <div class="sentence-transform-card" id="transform-card-${idx}">
            <div class="transform-orig-sentence">
              <span style="color:#7c3aed;font-weight:800">Câu ${idx + 1}:</span> "${esc(item.originalSentence || '')}"
            </div>
            ${item.hint ? `<div style="font-size:12px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${esc(item.hint)}</div>` : ''}

            <!-- a) PHỦ ĐỊNH (-) -->
            <div class="transform-sub-row">
              <label class="transform-badge-neg">a) Phủ định (-)</label>
              <input type="text" id="tf-neg-inp-${idx}" class="transform-input" placeholder="VD: They did not arrive...">
            </div>

            <!-- b) NGHI VẤN (?) -->
            <div class="transform-sub-row">
              <label class="transform-badge-ques">b) Nghi vấn / Câu hỏi (?)</label>
              <input type="text" id="tf-ques-inp-${idx}" class="transform-input" placeholder="VD: Did they arrive...?">
            </div>

            <div style="display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-p" onclick="window.checkSentenceTransformation(${idx}, '${esc(item.negativeAnswer || '')}', '${esc(item.negativeAlt || '')}', '${esc(item.questionAnswer || '')}')">✅ Kiểm tra câu</button>
              <button class="btn btn-sm" onclick="window.toggleTransformAnswer(${idx})" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1">👁️ Xem đáp án chuẩn</button>
            </div>

            <div id="tf-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
            <div id="tf-ans-box-${idx}" class="sample-answer-reveal" style="display:none">
              <div><b>a) Phủ định (-):</b> ${esc(item.negativeAnswer || '')} ${item.negativeAlt ? `<i>(hoặc: ${esc(item.negativeAlt)})</i>` : ''}</div>
              <div style="margin-top:4px"><b>b) Nghi vấn (?):</b> ${esc(item.questionAnswer || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'scramble') {
    const items = scrambleGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${items.map((item, idx) => {
          const wordsList = item.words || item.correctSentence?.split(/\s+/) || [];
          const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
          return `
            <div class="card" style="margin:0;border-left:4px solid #8b5cf6">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">Câu ${idx + 1}: Sắp xếp các từ thành câu hoàn chỉnh</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${item.hint || ''}</div>
              
              <div class="assembled-sentence-box" id="sc-assembled-${idx}">
                <span style="color:#94a3b8;font-size:13px" id="sc-placeholder-${idx}">(Bấm các từ bên dưới để đưa vào đây)</span>
              </div>

              <div class="scramble-word-chips" id="sc-pool-${idx}">
                ${shuffled.map((w, wIdx) => `
                  <button class="word-chip-btn" id="sc-btn-${idx}-${wIdx}" onclick="window.placeWordChip(${idx}, ${wIdx}, '${w.replace(/'/g, "\\'")}')">${w}</button>
                `).join('')}
              </div>

              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-p" onclick="window.checkScrambleSentence(${idx}, '${(item.correctSentence || '').replace(/'/g, "\\'")}')">✅ Kiểm tra câu</button>
                <button class="btn btn-sm" onclick="window.resetScramble(${idx})">🔄 Xếp lại</button>
              </div>
              <div id="sc-fb-${idx}" class="fb" style="display:none"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (type === 'error_fix') {
    const items = errorGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${items.map((item, idx) => `
          <div class="card" style="margin:0;border-left:4px solid #f59e0b">
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#1e293b">Câu ${idx + 1}: Tìm và sửa lỗi sai trong câu</div>
            <div style="font-size:16px;color:#1e293b;padding:12px;background:#fffbeb;border-radius:8px;margin-bottom:12px;border:1px solid #fef3c7">
              "${item.incorrectSentence}"
            </div>
            <div class="grid2">
              <div class="fg" style="margin:0">
                <label>Từ bị sai trong câu</label>
                <input type="text" id="err-word-${idx}" placeholder="VD: went">
              </div>
              <div class="fg" style="margin:0">
                <label>Sửa lại thành từ đúng</label>
                <input type="text" id="err-fix-${idx}" placeholder="VD: been">
              </div>
            </div>
            <button class="btn btn-p" style="margin-top:12px" onclick="window.checkErrorFix(${idx}, '${item.errorWord || ''}', '${item.correctWord || ''}', '${(item.explain || '').replace(/'/g, '&#39;')}')">Kiểm tra sửa lỗi</button>
            <div id="err-fb-${idx}" class="fb" style="display:none"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  workspace.innerHTML = `
    <div class="skill-subnav-bar">
      <button class="skill-subnav-btn ${type === 'transformation' ? 'active' : ''}" onclick="window.selectWritingTab('transformation')">🔄 Ex 3. Chuyển Đổi Câu (Negative & Question)</button>
      <button class="skill-subnav-btn ${type === 'scramble' ? 'active' : ''}" onclick="window.selectWritingTab('scramble')">🧩 Ex 4. Sắp Xếp Từ (Reorder Words)</button>
      <button class="skill-subnav-btn ${type === 'error_fix' ? 'active' : ''}" onclick="window.selectWritingTab('error_fix')">🔍 Sửa Lỗi Ngữ Pháp</button>
    </div>

    <div>
      ${subviewHtml}
    </div>
  `;
  typesetMath(workspace);
}

function cleanSentenceText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ');
}

window.checkSentenceTransformation = function(idx, negAns, negAlt, quesAns) {
  const negInp = document.getElementById(`tf-neg-inp-${idx}`);
  const quesInp = document.getElementById(`tf-ques-inp-${idx}`);
  const fb = document.getElementById(`tf-fb-${idx}`);
  if (!negInp || !quesInp || !fb) return;

  const userNeg = cleanSentenceText(negInp.value);
  const userQues = cleanSentenceText(quesInp.value);

  const cleanNeg1 = cleanSentenceText(negAns);
  const cleanNeg2 = cleanSentenceText(negAlt);
  const cleanQues = cleanSentenceText(quesAns);

  const isNegCorrect = (userNeg && (userNeg === cleanNeg1 || userNeg === cleanNeg2 || userNeg.replace("n't", " not") === cleanNeg1.replace("n't", " not")));
  const isQuesCorrect = (userQues && userQues === cleanQues);

  negInp.className = `transform-input ${isNegCorrect ? 'correct' : 'wrong'}`;
  quesInp.className = `transform-input ${isQuesCorrect ? 'correct' : 'wrong'}`;

  fb.style.display = 'block';
  if (isNegCorrect && isQuesCorrect) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Xuất sắc!</b> Cả 2 câu phủ định và nghi vấn đều chuyển đổi chính xác.';
    playSuccessSound();
    addXP(20, 'Chuyển đổi câu đúng ngữ pháp');
  } else if (isNegCorrect || isQuesCorrect) {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `⚠️ <b>Đúng 1 phần:</b> Bạn đã làm đúng ${isNegCorrect ? 'câu Phủ định (-)' : 'câu Nghi vấn (?)'}. Hãy kiểm tra lại câu còn lại nhé!`;
    playWrongSound();
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa chính xác.</b> Hãy kiểm tra lại trợ động từ (did/was/were...) hoặc bấm "Xem đáp án chuẩn".';
    playWrongSound();
  }
};

window.toggleTransformAnswer = function(idx) {
  const box = document.getElementById(`tf-ans-box-${idx}`);
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }
};

window.placedWordsState = {};

window.placeWordChip = function(sentIdx, wordIdx, word) {
  if (!window.placedWordsState[sentIdx]) window.placedWordsState[sentIdx] = [];
  window.placedWordsState[sentIdx].push({ wordIdx, word });

  const btn = document.getElementById(`sc-btn-${sentIdx}-${wordIdx}`);
  if (btn) btn.classList.add('placed');

  renderAssembledSentence(sentIdx);
};

function renderAssembledSentence(sentIdx) {
  const box = document.getElementById(`sc-assembled-${sentIdx}`);
  const list = window.placedWordsState[sentIdx] || [];
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<span style="color:#94a3b8;font-size:13px">(Bấm các từ bên dưới để đưa vào đây)</span>`;
    return;
  }

  box.innerHTML = list.map((item, i) => `
    <button class="word-chip-btn" style="background:#8b5cf6;color:#fff;border-color:#8b5cf6" onclick="window.removePlacedWord(${sentIdx}, ${i})">
      ${item.word} ✖
    </button>
  `).join('');
}

window.removePlacedWord = function(sentIdx, indexInList) {
  const list = window.placedWordsState[sentIdx] || [];
  const removed = list.splice(indexInList, 1)[0];
  if (removed) {
    const btn = document.getElementById(`sc-btn-${sentIdx}-${removed.wordIdx}`);
    if (btn) btn.classList.remove('placed');
  }
  renderAssembledSentence(sentIdx);
};

window.resetScramble = function(sentIdx) {
  window.placedWordsState[sentIdx] = [];
  const pool = document.getElementById(`sc-pool-${sentIdx}`);
  if (pool) {
    pool.querySelectorAll('.word-chip-btn').forEach(b => b.classList.remove('placed'));
  }
  renderAssembledSentence(sentIdx);
  const fb = document.getElementById(`sc-fb-${sentIdx}`);
  if (fb) fb.style.display = 'none';
};

window.checkScrambleSentence = function(sentIdx, correctSentence) {
  const list = window.placedWordsState[sentIdx] || [];
  const assembled = list.map(item => item.word).join(' ');
  const fb = document.getElementById(`sc-fb-${sentIdx}`);
  if (!fb) return;

  if (assembled.trim() === correctSentence.trim()) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Chính xác!</b> Câu hoàn chỉnh: <i>"${correctSentence}"</i>`;
    fb.style.display = 'block';
    playSuccessSound();
    addXP(20, 'Ghép câu hoàn chỉnh');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `❌ <b>Chưa đúng thứ tự!</b> Hãy thử suy nghĩ lại hoặc bấm nút Xếp lại.`;
    fb.style.display = 'block';
    playWrongSound();
  }
};

window.checkErrorFix = function(idx, errorWord, correctWord, explain) {
  const userErr = document.getElementById(`err-word-${idx}`)?.value.trim().toLowerCase();
  const userFix = document.getElementById(`err-fix-${idx}`)?.value.trim().toLowerCase();
  const fb = document.getElementById(`err-fb-${idx}`);
  if (!fb) return;

  if (userErr === errorWord?.toLowerCase() && (userFix === correctWord?.toLowerCase() || userFix.includes(correctWord?.toLowerCase()))) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Chính xác!</b> ${explain}`;
    fb.style.display = 'block';
    playSuccessSound();
    addXP(20, 'Sửa lỗi ngữ pháp');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `❌ <b>Chưa chính xác!</b> Từ sai là "<b>${errorWord}</b>" ➔ sửa thành "<b>${correctWord}</b>".<br>${explain}`;
    fb.style.display = 'block';
    playWrongSound();
  }
};

// =========================================================================
// 5. LANGUAGE FOCUS MODULE
// =========================================================================

function initLanguageFocus() {
  currentCardIdx = 0;
  if (!window._langTab) window._langTab = 'past_form';
  loadLanguageFocusView();
}

function loadLanguageFocusView() {
  const workspace = document.getElementById('lang-workspace');
  if (!workspace || !currentUnit) return;

  const tab = window._langTab || 'past_form';
  const langObj = getUnitSkillObj(currentUnit, 'languageFocus');

  let bodyContent = '';
  if (tab === 'past_form') {
    const verbs = langObj?.pastFormVerbs || [
      { infinitive: 'go', past: 'went', meaning: 'đi' },
      { infinitive: 'see', past: 'saw', meaning: 'thấy' },
      { infinitive: 'buy', past: 'bought', meaning: 'mua' }
    ];
    bodyContent = renderPastFormVerbsView(verbs);
  } else if (tab === 'cards') {
    const fCards = safeArray(langObj?.flashcards, []);
    const currentCard = fCards[currentCardIdx] || fCards[0] || { word: 'Practice', meaning: 'Luyện tập', ipa: '/ˈpræk.tɪs/', pos: 'noun' };
    bodyContent = renderFlashcardsView(currentCard, fCards.length || 1);
  } else if (tab === 'match') {
    bodyContent = renderMatchPuzzleView();
  } else if (tab === 'quiz') {
    bodyContent = renderGrammarQuizView();
  }

  workspace.innerHTML = `
    <div class="skill-subnav-bar" style="justify-content:center">
      <button class="skill-subnav-btn ${tab === 'past_form' ? 'active' : ''}" onclick="window.switchLangSubTab('past_form')">📝 Ex 1. Bảng Động Từ Quá Khứ (Past Form)</button>
      <button class="skill-subnav-btn ${tab === 'quiz' ? 'active' : ''}" onclick="window.switchLangSubTab('quiz')">⚡ Ex 2. Thử Thách Ngữ Pháp (Grammar Quiz)</button>
      <button class="skill-subnav-btn ${tab === 'match' ? 'active' : ''}" onclick="window.switchLangSubTab('match')">🧩 Nối Từ & Thành Ngữ</button>
      <button class="skill-subnav-btn ${tab === 'cards' ? 'active' : ''}" onclick="window.switchLangSubTab('cards')">🎴 Thẻ Từ Vựng 3D</button>
    </div>

    <div id="lang-subtab-container">
      ${bodyContent}
    </div>
  `;
  typesetMath(workspace);
}

window.switchLangSubTab = function(tab) {
  window._langTab = tab;
  loadLanguageFocusView();
};

function renderPastFormVerbsView(verbs) {
  if (!verbs || !verbs.length) return '<div class="empty">Chưa có bảng động từ quá khứ trong Unit này.</div>';

  return `
    <div class="past-form-table-wrap" style="max-width:800px;margin:0 auto">
      <div style="padding:16px 20px;background:#f8fafc;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:800;font-size:16px;color:#1e293b">📝 Exercise 1. Fill in the Past Form (Điền dạng Quá khứ của Động từ)</div>
          <div style="font-size:12.5px;color:#64748b">Gõ dạng Quá khứ đơn (Past Simple V2) cho mỗi động từ nguyên thể bên dưới:</div>
        </div>
        <button class="btn btn-p" onclick="window.checkAllPastFormVerbs()">✅ Kiểm tra toàn bảng</button>
      </div>

      <table class="past-form-table">
        <thead>
          <tr>
            <th style="width:50px;text-align:center">#</th>
            <th>Động từ nguyên thể (Infinitive)</th>
            <th>Dạng quá khứ (Past Form V2)</th>
            <th>Nghĩa tiếng Việt</th>
          </tr>
        </thead>
        <tbody>
          ${verbs.map((v, idx) => `
            <tr id="verb-row-${idx}">
              <td style="text-align:center;font-weight:800;color:#6366f1">${idx + 1}</td>
              <td style="font-weight:700;color:#1e293b;font-size:15px"><b>${esc(v.infinitive || '')}</b></td>
              <td>
                <input type="text" class="verb-input-cell" id="verb-inp-${idx}" data-correct="${esc(v.past || '')}" placeholder="Nhập dạng V2...">
              </td>
              <td style="color:#475569;font-size:13.5px">${esc(v.meaning || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="padding:16px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <button class="btn btn-p" onclick="window.checkAllPastFormVerbs()">✅ Kiểm tra toàn bảng</button>
        <div id="verbs-table-fb" class="fb" style="display:none;margin:0"></div>
      </div>
    </div>
  `;
}

window.checkAllPastFormVerbs = function() {
  const inputs = document.querySelectorAll('[id^="verb-inp-"]');
  const fb = document.getElementById('verbs-table-fb');
  if (!inputs.length || !fb) return;

  let correctCount = 0;
  inputs.forEach((inp) => {
    const val = inp.value.trim().toLowerCase();
    const correct = (inp.dataset.correct || '').trim().toLowerCase();
    if (val && val === correct) {
      inp.className = 'verb-input-cell correct';
      correctCount++;
    } else {
      inp.className = 'verb-input-cell wrong';
    }
  });

  fb.style.display = 'block';
  if (correctCount === inputs.length) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = `🎉 <b>Hoàn hảo!</b> Bạn đã điền chính xác toàn bộ ${correctCount}/${inputs.length} động từ thì quá khứ.`;
    playSuccessSound();
    addXP(25, 'Điền đúng bảng động từ quá khứ');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = `⚠️ <b>Kết quả:</b> Bạn đã điền đúng ${correctCount}/${inputs.length} động từ. Hãy xem các ô màu đỏ để sửa lại nhé!`;
    playWrongSound();
  }
};

function renderFlashcardsView(card, total) {
  if (!card) return '<div class="empty">Chưa có thẻ từ vựng trong Unit này.</div>';
  return `
    <div style="text-align:center;max-width:480px;margin:0 auto">
      <div style="text-align:center;margin-bottom:10px">
        <span style="font-size:13px;color:#64748b;font-weight:600">Thẻ ${currentCardIdx + 1} / ${total} • Bấm thẻ để lật 3D xem nghĩa</span>
      </div>
      
      <div class="flashcard-3d-scene" id="flashcard-scene" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-3d-inner">
          <!-- MẶT TRƯỚC THẺ 3D -->
          <div class="flashcard-face flashcard-front">
            ${card.image ? `
              <div class="fc-img-wrap">
                <img src="${card.image}" class="flashcard-img" alt="${card.word}" loading="lazy" onerror="this.parentElement.style.display='none'">
              </div>
            ` : ''}
            <div class="fc-pos-tag">${card.pos || 'word'}</div>
            <div class="flashcard-word">${card.word || ''}</div>
            <div class="flashcard-ipa">${card.ipa || ''}</div>
            <button class="btn btn-sm btn-p" onclick="event.stopPropagation(); window.speakVocab('${card.word}')" style="background:#f59e0b;border-color:#f59e0b;margin-top:4px">🔊 Nghe phát âm</button>
          </div>

          <!-- MẶT SAU THẺ 3D -->
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-meaning">${card.meaning || ''}</div>
            <div class="flashcard-example">"${card.example || ''}"</div>
            ${card.synonyms ? `<div style="font-size:12.5px;color:#047857;margin-top:10px;font-weight:600"><b>Đồng nghĩa:</b> ${card.synonyms}</div>` : ''}
            ${card.image ? `
              <div style="margin-top:10px;opacity:0.85">
                <img src="${card.image}" style="width:70px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1" onerror="this.style.display='none'">
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:18px">
        <button class="btn" onclick="window.prevFlashcard()" ${currentCardIdx === 0 ? 'disabled' : ''}>← Từ trước</button>
        <button class="btn btn-p" onclick="window.nextFlashcard()" ${currentCardIdx >= total - 1 ? 'disabled' : ''}>Từ tiếp theo →</button>
      </div>
    </div>
  `;
}

window.prevFlashcard = function() {
  if (currentCardIdx > 0) {
    currentCardIdx--;
    window.switchLangSubTab('cards');
  }
};

window.nextFlashcard = function() {
  const fCards = currentUnit?.languageFocus?.flashcards || [];
  if (currentCardIdx < fCards.length - 1) {
    currentCardIdx++;
    addXP(5, 'Học từ vựng mới');
    window.switchLangSubTab('cards');
  }
};

function renderMatchPuzzleView() {
  const langObj = (typeof getUnitSkillObj === 'function' ? getUnitSkillObj(currentUnit, 'languageFocus') : null) || currentUnit?.languageFocus || currentUnit?.language_focus || {};
  const rawPairs = safeArray(langObj?.matchPairs, []);
  
  const pairs = rawPairs.map((p, idx) => ({
    pairId: p.pairId !== undefined ? p.pairId : (idx + 1),
    left: p.left || '',
    right: p.right || ''
  })).filter(p => p.left && p.right);

  if (!pairs.length) {
    return `
      <div class="empty" style="text-align:center;padding:40px;background:#ffffff;border-radius:16px;border:1.5px dashed #cbd5e1;max-width:650px;margin:0 auto;">
        <div style="font-size:36px;margin-bottom:8px;">🧩</div>
        <div style="font-weight:700;font-size:16px;color:#1e293b;">Chưa có bài nối từ & thành ngữ trong Unit này</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Giáo viên có thể bổ sung các cặp từ trong Unit Designer.</div>
      </div>
    `;
  }

  const lefts = [...pairs].sort(() => Math.random() - 0.5);
  const rights = [...pairs].sort(() => Math.random() - 0.5);
  matchedCount = 0;
  matchSelectedLeft = null;
  matchSelectedRight = null;
  window._currentMatchTotalPairs = pairs.length;

  return `
    <div class="match-puzzle-wrapper">
      <!-- HEADER -->
      <div class="match-puzzle-header">
        <div class="match-puzzle-title-wrap">
          <div class="match-puzzle-title">🧩 Ghép cặp Từ vựng & Thành ngữ (Match Pairs)</div>
          <div class="match-puzzle-desc">Bấm chọn 1 ô thuật ngữ tiếng Anh bên trái rồi bấm 1 ô nghĩa tiếng Việt bên phải tương ứng.</div>
        </div>
        <div class="match-puzzle-stats">
          <div class="match-progress-badge">
            <span>Tiến độ:</span>
            <strong id="match-progress-text">0 / ${pairs.length} cặp</strong>
          </div>
          <button type="button" class="btn btn-sm match-btn-reset" onclick="window.switchLangSubTab('match')" title="Xáo trộn và chơi lại từ đầu">
            🔄 Chơi lại
          </button>
        </div>
      </div>

      <!-- PROGRESS BAR -->
      <div class="match-progress-track">
        <div class="match-progress-fill" id="match-progress-fill" style="width: 0%;"></div>
      </div>

      <!-- 2 COLUMNS OF TILES -->
      <div class="match-puzzle-grid">
        <!-- LEFT COLUMN: TERMS / WORDS -->
        <div class="match-col match-col-left">
          <div class="match-col-label">
            <span>📖 Từ vựng / Thuật ngữ (Words & Terms)</span>
          </div>
          <div class="match-chips-list">
            ${lefts.map(p => `
              <button type="button" class="match-puzzle-chip chip-left" id="mp-left-${p.pairId}" onclick="window.selectMatchLeft('${p.pairId}')">
                <span class="chip-dot"></span>
                <span class="chip-text">${esc(p.left)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT COLUMN: DEFINITIONS / MEANINGS -->
        <div class="match-col match-col-right">
          <div class="match-col-label">
            <span>💡 Định nghĩa / Ý nghĩa tương ứng (Definitions & Meanings)</span>
          </div>
          <div class="match-chips-list">
            ${rights.map(p => `
              <button type="button" class="match-puzzle-chip chip-right" id="mp-right-${p.pairId}" onclick="window.selectMatchRight('${p.pairId}')">
                <span class="chip-dot"></span>
                <span class="chip-text">${esc(p.right)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- WIN CELEBRATION BOX -->
      <div id="match-puzzle-win" class="match-puzzle-win-card" style="display:none;">
        <div class="match-win-icon">🎉</div>
        <div class="match-win-title">Xuất Sắc! Bạn Đã Ghép Đúng Tất Cả Các Cặp!</div>
        <div class="match-win-desc">Bạn vừa nhận được <strong style="color:#16a34a;">+${pairs.length * 10} XP</strong> ghi nhớ từ vựng.</div>
        <div class="match-win-actions">
          <button type="button" class="btn btn-p" onclick="window.switchLangSubTab('match')">🔄 Luyện tập lại</button>
          <button type="button" class="btn" style="background:#8b5cf6;color:#ffffff;" onclick="window.switchLangSubTab('quiz')">⚡ Tiếp theo: Trắc nghiệm Ngữ Pháp ➔</button>
        </div>
      </div>
    </div>
  `;
}

window.selectMatchLeft = function(pairId) {
  const btn = document.getElementById(`mp-left-${pairId}`);
  if (!btn || btn.classList.contains('matched') || btn.classList.contains('wrong')) return;
  if (matchSelectedLeft === pairId) {
    btn.classList.remove('selected');
    matchSelectedLeft = null;
    return;
  }
  document.querySelectorAll('[id^="mp-left-"]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  matchSelectedLeft = pairId;
  checkPuzzlePair();
};

window.selectMatchRight = function(pairId) {
  const btn = document.getElementById(`mp-right-${pairId}`);
  if (!btn || btn.classList.contains('matched') || btn.classList.contains('wrong')) return;
  if (matchSelectedRight === pairId) {
    btn.classList.remove('selected');
    matchSelectedRight = null;
    return;
  }
  document.querySelectorAll('[id^="mp-right-"]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  matchSelectedRight = pairId;
  checkPuzzlePair();
};

function checkPuzzlePair() {
  if (matchSelectedLeft !== null && matchSelectedRight !== null) {
    const bLeft = document.getElementById(`mp-left-${matchSelectedLeft}`);
    const bRight = document.getElementById(`mp-right-${matchSelectedRight}`);

    if (String(matchSelectedLeft) === String(matchSelectedRight)) {
      if (bLeft) {
        bLeft.classList.remove('selected');
        bLeft.classList.add('matched');
        bLeft.disabled = true;
      }
      if (bRight) {
        bRight.classList.remove('selected');
        bRight.classList.add('matched');
        bRight.disabled = true;
      }
      playSuccessSound();
      addXP(10, 'Nối thành ngữ đúng');
      matchedCount++;

      const totalPairs = window._currentMatchTotalPairs || 1;
      const progressFill = document.getElementById('match-progress-fill');
      const progressText = document.getElementById('match-progress-text');
      if (progressFill) progressFill.style.width = Math.round((matchedCount / totalPairs) * 100) + '%';
      if (progressText) progressText.textContent = `${matchedCount} / ${totalPairs} cặp`;

      if (matchedCount === totalPairs) {
        triggerConfetti();
        const winBox = document.getElementById('match-puzzle-win');
        if (winBox) winBox.style.display = 'block';
      }
    } else {
      if (bLeft) bLeft.classList.add('wrong');
      if (bRight) bRight.classList.add('wrong');
      playWrongSound();
      setTimeout(() => {
        if (bLeft) {
          bLeft.classList.remove('selected');
          bLeft.classList.remove('wrong');
        }
        if (bRight) {
          bRight.classList.remove('selected');
          bRight.classList.remove('wrong');
        }
      }, 450);
    }
    matchSelectedLeft = null;
    matchSelectedRight = null;
  }
}

function renderGrammarQuizView() {
  const quiz = currentUnit?.languageFocus?.grammarChallenge || [];
  if (!quiz.length) return '<div class="empty">Chưa có thử thách ngữ pháp trong Unit này.</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:16px;max-width:700px;margin:0 auto">
      ${quiz.map((q, idx) => `
        <div class="card" style="margin:0">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#1e293b">Câu ${idx + 1}: ${q.question}</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(q.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkGrammarQuiz(${idx}, ${oIdx}, ${q.answer})" id="gq-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
          <div id="gq-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `).join('')}
    </div>
  `;
}

window.checkGrammarQuiz = function(qIdx, chosenIdx, correctIdx) {
  const fb = document.getElementById(`gq-fb-${qIdx}`);
  const btn = document.getElementById(`gq-opt-${qIdx}-${chosenIdx}`);
  if (!fb || !btn || !currentUnit) return;

  const allBtns = document.querySelectorAll(`[id^="gq-opt-${qIdx}-"]`);
  allBtns.forEach(b => (b.disabled = true));

  const quizItem = currentUnit.languageFocus?.grammarChallenge?.[qIdx];

  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> ' + (quizItem?.explain || '');
    fb.style.display = 'block';
    typesetMath(fb);
    playSuccessSound();
    addXP(15, 'Ngữ pháp đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`gq-opt-${qIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + (quizItem?.explain || '');
    fb.style.display = 'block';
    typesetMath(fb);
    playWrongSound();
  }
};

// =========================================================================
// MAIN CONTROLLER INITIALIZATION
// =========================================================================
export function switchSkillTab(skill) {
  if (!skill) return;
  currentSkillTab = skill;

  // 1. Cập nhật trạng thái Active trên 5 nút Tab
  document.querySelectorAll('#learn-skill-nav-row .skill-tab-btn, #learn-skill-nav-row .subject-tab, .skill-tab-btn, .subject-tab').forEach(btn => {
    const btnSkill = btn.dataset.skill || btn.getAttribute('data-skill');
    const isTarget = btnSkill === skill;
    btn.classList.toggle('active', isTarget);
  });

  // 2. Ẩn/Hiện chính xác Panel nội dung tương ứng
  const panelIds = ['skill-panel-listening', 'skill-panel-reading', 'skill-panel-speaking', 'skill-panel-writing', 'skill-panel-languageFocus'];
  panelIds.forEach(pId => {
    const panel = document.getElementById(pId);
    if (panel) {
      const isTarget = pId === `skill-panel-${skill}`;
      panel.classList.toggle('active', isTarget);
      panel.style.display = isTarget ? 'block' : 'none';
    }
  });

  // 3. Khởi tạo dữ liệu bài tập tương ứng một cách an toàn
  try {
    if (skill === 'listening') initListening();
    else if (skill === 'reading') initReading();
    else if (skill === 'speaking') initSpeaking();
    else if (skill === 'writing') initWriting();
    else if (skill === 'languageFocus') initLanguageFocus();
  } catch (err) {
    console.error("Lỗi khi chuyển sang tab " + skill + ":", err);
  }
}

window.switchSkillTab = switchSkillTab;

async function initLearnApp() {
  document.querySelectorAll('#learn-skill-nav-row button, .skill-tab-btn, .subject-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const skill = btn.dataset.skill || btn.getAttribute('data-skill');
      if (skill) switchSkillTab(skill);
    });
  });

  const student = getAuthenticatedStudent();
  if (student && student.id) {
    await initAuthenticatedLearn();
  } else {
    logoutLearnStudent();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLearnApp);
} else {
  initLearnApp();
}
