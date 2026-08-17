/**
 * =========================================================================
 * INTERACTIVE ENGLISH LEARNING HUB - JAVASCRIPT CONTROLLER (learn.js)
 * Real-time Unit Loading & 5 Skills Execution Engine
 * =========================================================================
 */

import { LEARN_DATA, DEFAULT_UNITS } from './learn-data.js';

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
    // Nếu trong DB chỉ có câu cũ mà chưa có video_roleplay, tự động nạp các bài Video Roleplay A-B từ mẫu
    const hasVideoRp = list.some(item => item.type === 'video_roleplay' || (item.characterA && item.characterB));
    if (!hasVideoRp) {
      const defRpLessons = defMatch.speaking.filter(item => item.type === 'video_roleplay');
      if (defRpLessons.length > 0) {
        list = [...defRpLessons, ...list];
      }
    }
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
          <span>1. LISTENING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">📖</span>
          <span>2. READING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span>3. SPEAKING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span>4. WRITING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🔍</span>
          <span>5. LANGUAGE FOCUS</span>
        </button>
      `;
    } else {
      navRow.innerHTML = `
        <button class="skill-tab-btn ${currentSkillTab === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchSkillTab('listening')">
          <span class="tab-icon">📖</span>
          <span>1. LÝ THUYẾT & BÀI GIẢNG</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">💡</span>
          <span>2. VÍ DỤ MINH HỌA</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span>3. ĐỌC CÔNG THỨC / CODE</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span>4. BÀI TẬP TỰ LUYỆN</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🧠</span>
          <span>5. CÔNG THỨC & TRẮC NGHIỆM</span>
        </button>
      `;
    }
    const bindSkillTabClicks = () => {
      document.querySelectorAll('.skill-tab-btn, .subject-tab').forEach(btn => {
        if (btn.dataset.boundSkillTab === 'true') return;
        btn.dataset.boundSkillTab = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const skill = btn.dataset.skill || btn.getAttribute('data-skill');
          if (skill) switchSkillTab(skill);
        });
      });
    };
    bindSkillTabClicks();
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

function loadListeningLesson(id) {
  const l = currentLisLesson;
  const workspace = document.getElementById('lis-workspace');
  if (!workspace || !l) return;

  workspace.innerHTML = `
    <div class="listening-player-box">
      ${l.image ? `
        <div style="margin-bottom:14px;border-radius:8px;overflow:hidden;max-height:220px;border:1px solid rgba(255,255,255,0.2)">
          <img src="${l.image}" style="width:100%;height:180px;object-fit:cover;display:block" alt="${l.title}" onerror="this.style.display='none'">
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:800;color:#fff">${l.title}</div>
          <div style="font-size:13px;color:#94a3b8">🎧 Kỹ năng nghe hiểu • ${l.level || currentUnit.level}</div>
        </div>
        <div class="speed-selector-group">
          <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
        </div>
      </div>

      <div class="audio-controls-row">
        <button class="play-audio-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()">▶</button>
        <button class="btn btn-sm" onclick="window.playCurrentListeningAudio()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">🔁 Nghe lại</button>
        <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">👁️ Hiện Transcript</button>
      </div>

      <div id="lis-transcript-box" style="display:none;background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:8px;font-size:14px;line-height:1.7;color:#e2e8f0;border-left:3px solid #10b981">
        <b>📝 Transcript:</b><br>${l.audioText || ''}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;">
      ${renderListeningExercises(l.exercises || [])}
    </div>
  `;
}

window.setListeningSpeed = function(spd) {
  currentPlaybackSpeed = spd;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === spd);
  });
  window.playCurrentListeningAudio();
};

window.playCurrentListeningAudio = function() {
  if (!currentLisLesson) return;
  speakText(currentLisLesson.audioText, currentPlaybackSpeed, 'en-US');
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
  return exercises.map((ex, idx) => {
    if (ex.type === 'mcq') {
      return `
        <div class="card" style="margin:0">
          <div style="font-weight:700;margin-bottom:10px;color:#1e293b">Câu hỏi ${idx + 1}: ${ex.question}</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(ex.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkLisMCQ(${idx}, ${oIdx}, ${ex.answer})" id="lis-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
          <div id="lis-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `;
    } else if (ex.type === 'dictation') {
      return `
        <div class="card" style="margin:0;border-left:4px solid #3b82f6">
          <div style="font-weight:700;margin-bottom:6px;color:#1e293b">✍️ Câu hỏi ${idx + 1} (Dictation - Nghe chép chính tả):</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:8px">${ex.prompt || 'Nghe và gõ lại chính xác câu bạn nghe được:'}</div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button class="btn btn-sm" onclick="window.speakDictation('${(ex.targetSentence || '').replace(/'/g, "\\'")}')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">🔊 Nghe câu này</button>
          </div>
          <textarea id="dictation-input-${idx}" class="dictation-textarea" placeholder="Gõ lại những gì bạn nghe được..."></textarea>
          <div style="margin-top:10px;display:flex;gap:10px">
            <button class="btn btn-p" onclick="window.checkDictation(${idx}, '${(ex.targetSentence || '').replace(/'/g, "\\'")}')">Kiểm tra chính tả</button>
          </div>
          <div id="dictation-fb-${idx}" style="display:none;" class="diff-result-view"></div>
        </div>
      `;
    }
    return '';
  }).join('');
}

window.checkLisMCQ = function(exIdx, chosenIdx, correctIdx) {
  const fb = document.getElementById(`lis-fb-${exIdx}`);
  const btn = document.getElementById(`lis-opt-${exIdx}-${chosenIdx}`);
  if (!fb || !btn) return;

  const allBtns = document.querySelectorAll(`[id^="lis-opt-${exIdx}-"]`);
  allBtns.forEach(b => (b.disabled = true));

  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> Bạn đã nghe và chọn đúng.';
    fb.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Nghe hiểu đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`lis-opt-${exIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa chính xác!</b> Hãy nghe lại audio nhé.';
    fb.style.display = 'block';
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
      return `<span class="diff-word-wrong">${userWord}</span><span class="diff-word-target">${targetWord}</span>`;
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

function normalizeSpeechText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSpeechText(text = '') {
  const normalized = normalizeSpeechText(text);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

function computeWordDiffAndScore(targetText, transcriptText = '') {
  const targetWords = tokenizeSpeechText(targetText);
  const transcriptWords = tokenizeSpeechText(transcriptText);
  const totalTarget = Math.max(targetWords.length, 1);

  let matched = 0;
  const rendered = targetWords.map((targetWord, index) => {
    const userWord = transcriptWords[index];
    if (userWord && userWord === targetWord) {
      matched++;
      return `<span class="diff-word-correct">${targetWord}</span>`;
    }
    if (userWord) {
      return `<span class="diff-word-wrong">${userWord}</span><span class="diff-word-target">${targetWord}</span>`;
    }
    return `<span class="diff-word-missing">${targetWord}</span>`;
  });

  if (!transcriptWords.length) {
    return {
      score: 0,
      diffHtml: `<span class="diff-word-missing">${targetWords.join(' ') || 'Chưa có câu mẫu'}</span>`
    };
  }

  const score = Math.min(100, Math.max(0, Math.round((matched / totalTarget) * 100)));
  return {
    score,
    diffHtml: rendered.join(' ')
  };
}

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
  return exercises.map((ex, idx) => `
    <div class="card" style="margin:0">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b">Câu ${idx + 1}: ${ex.question}</div>
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
  `).join('');
}

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
let forceTurnPlayback = false;

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
  }
}

// -------------------------------------------------------------------------
// 3.1 MÀN HÌNH CHỌN VAI TRÒ VIDEO ROLEPLAY (CHARACTER A VS CHARACTER B)
// -------------------------------------------------------------------------
function renderRoleSelectionView(lesson) {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace) return;

  const charA = lesson.characterA || { name: 'Nhân vật A', avatar: '👩‍💼', roleTitle: 'Speaker A', color: '#2563eb' };
  const charB = lesson.characterB || { name: 'Nhân vật B', avatar: '🧑‍💼', roleTitle: 'Speaker B', color: '#059669' };
  const turnsCount = (lesson.dialogue || []).length;

  workspace.innerHTML = `
    <div class="video-rp-container">
      <div class="video-rp-header">
        <div class="video-rp-title-wrap">
          <span class="video-rp-badge">🎬 Video Roleplay A & B</span>
          <span style="font-weight:800;font-size:16px;color:#0f172a">${lesson.title}</span>
        </div>
        <div style="font-size:13px;color:#64748b;font-weight:600">
          🎯 Chủ đề: <b>${lesson.topic || 'Giao tiếp'}</b> • ${turnsCount} lượt thoại
        </div>
      </div>

      <div class="role-select-screen">
        <div style="font-size:36px;margin-bottom:8px">🎭</div>
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px">Chọn Nhân Vật Bạn Muốn Đóng Vai</h2>
        <p style="font-size:14px;color:#64748b;max-width:580px;margin:0 auto">
          ${lesson.description || 'Bạn sẽ trực tiếp đọc thoại của nhân vật đã chọn. Hệ thống sẽ phát video của nhân vật đối tác và chấm điểm phát âm của bạn theo thời gian thực!'}
        </p>

        <div class="role-select-grid">
          <!-- NHÂN VẬT A -->
          <div class="role-card role-a" onclick="window.startRoleplayAsRole('A')">
            <div style="position:absolute;top:12px;right:12px;background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:800">
              NHÂN VẬT A
            </div>
            <div class="role-avatar-circle" style="border-color:#93c5fd;background:#eff6ff">
              ${charA.avatar || '👩‍💼'}
            </div>
            <div class="role-card-name">${charA.name}</div>
            <div class="role-card-title">${charA.roleTitle || 'Vai trò chính'}</div>
            <div style="font-size:12.5px;color:#475569;margin-bottom:16px;line-height:1.4">
              👉 Bạn nói vai <b>${charA.name}</b><br>
              🤖 Máy tự động phát video & giọng vai <b>${charB.name}</b>
            </div>
            <button type="button" class="role-card-cta">
              Đóng Vai Nhân Vật A →
            </button>
          </div>

          <!-- NHÂN VẬT B -->
          <div class="role-card role-b" onclick="window.startRoleplayAsRole('B')">
            <div style="position:absolute;top:12px;right:12px;background:#f0fdf4;color:#047857;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:800">
              NHÂN VẬT B
            </div>
            <div class="role-avatar-circle" style="border-color:#86efac;background:#f0fdf4">
              ${charB.avatar || '🧑‍💼'}
            </div>
            <div class="role-card-name">${charB.name}</div>
            <div class="role-card-title">${charB.roleTitle || 'Vai trò phản hồi'}</div>
            <div style="font-size:12.5px;color:#475569;margin-bottom:16px;line-height:1.4">
              👉 Bạn nói vai <b>${charB.name}</b><br>
              🤖 Máy tự động phát video & giọng vai <b>${charA.name}</b>
            </div>
            <button type="button" class="role-card-cta">
              Đóng Vai Nhân Vật B →
            </button>
          </div>
        </div>

        <div style="margin-top:16px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.startRoleplayAsRole('ALL')" style="background:#ffffff;border:1.5px solid #cbd5e1;color:#475569;padding:8px 16px;font-weight:700">
            🎬 Chế độ Luyện toàn bộ (Luyện phát âm cả 2 vai A & B)
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
  const nextRole = currentRpRole === 'A' ? 'B' : 'A';
  if (confirm(`Bạn có muốn đổi sang đóng vai ${nextRole === 'A' ? (currentRpLesson.characterA?.name || 'Nhân vật A') : (currentRpLesson.characterB?.name || 'Nhân vật B')} không?`)) {
    window.startRoleplayAsRole(nextRole);
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
  const charA = lesson.characterA || { name: 'Nhân vật A', avatar: '👩‍💼', roleTitle: 'Role A', color: '#2563eb' };
  const charB = lesson.characterB || { name: 'Nhân vật B', avatar: '🧑‍💼', roleTitle: 'Role B', color: '#059669' };
  const currentLine = dialogue[currentRpTurnIdx] || dialogue[0];
  const isUserTurn = currentRpRole === 'ALL' || (currentLine && currentLine.speaker === currentRpRole);
  const activeChar = currentLine?.speaker === 'A' ? charA : charB;

  const myRoleName = currentRpRole === 'A' ? charA.name : currentRpRole === 'B' ? charB.name : 'Cả 2 vai (A & B)';
  const myRoleAvatar = currentRpRole === 'A' ? (charA.avatar || '👩‍💼') : currentRpRole === 'B' ? (charB.avatar || '🧑‍💼') : '👥';
  const myRoleColor = currentRpRole === 'A' ? '#2563eb' : '#059669';

  workspace.innerHTML = `
    <div class="video-rp-container">
      <!-- HEADER THANH ĐIỀU KHIỂN -->
      <div class="video-rp-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="video-rp-badge">🎬 Video Roleplay</span>
          <span style="font-weight:800;font-size:15px;color:#0f172a">${lesson.title}</span>
          <div style="background:${myRoleColor}15;color:${myRoleColor};border:1.5px solid ${myRoleColor}40;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px">
            <span>${myRoleAvatar}</span>
            <span>Bạn đang đóng: <b>${myRoleName}</b></span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.switchRoleplayRoleModal()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:12px;font-weight:700" title="Đổi sang vai đối tác">
            🔁 Đổi vai (${currentRpRole === 'A' ? 'A ➔ B' : 'B ➔ A'})
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
        <!-- KỊCH BẢN HỘI THOẠI ĐẶT TRÊN -->
        <div class="card" style="margin:0;padding:16px;background:#f8fafc;border:1.5px solid #cbd5e1;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">
            <span style="font-weight:800;font-size:13.5px;color:#0f172a">📋 Kịch bản hội thoại:</span>
            <span style="font-size:11.5px;color:#64748b">Bấm câu bất kỳ để luyện</span>
          </div>

          <div class="dialogue-timeline">
            ${dialogue.map((d, idx) => {
              const isCurrent = idx === currentRpTurnIdx;
              const spkChar = d.speaker === 'A' ? charA : charB;
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

        <!-- PHẦN SPEAKING Ở DƯỚI -->
        <div class="speaking-panel-row">
          <!-- KHUNG VIDEO TƯƠNG TÁC -->
          <div class="video-player-frame" id="rp-video-container">
            <div class="video-turn-indicator" id="rp-turn-indicator">
              <span class="video-speaker-tag" style="background:${activeChar.color || '#2563eb'}">
                ${activeChar.avatar || '👤'} ${currentLine?.speakerName || activeChar.name}
              </span>
              <span id="rp-turn-status-text">
                ${isUserTurn ? '🎙️ Đến lượt bạn nói!' : '🔊 Đang phát video đối tác...'}
              </span>
            </div>

            <!-- THẺ VIDEO THỰC TẾ -->
            <video id="rp-video-player" playsinline preload="auto" style="display:none;width:100%;height:100%;max-height:340px;object-fit:cover"></video>

            <!-- KHUNG SÂN KHẤU AVATAR DỰ PHÒNG HOẶC ĐANG TẢI -->
            <div id="rp-avatar-stage" class="video-avatar-stage">
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

          <!-- KHUNG CHỨA CÂU TƯƠNG TÁC CẦN NÓI -->
          <div class="target-script-box">
            <div class="target-script-header">
              <span class="target-script-title">${currentLine?.speakerName || activeChar.name}</span>
              ${isUserTurn ? '<span class="target-script-pill">• Bạn nói</span>' : '<span class="target-script-pill target-script-pill-muted">• Đang phát</span>'}
            </div>
            <div class="target-script-text">${currentLine?.text || ''}</div>
            ${currentLine?.meaning ? `<div class="target-script-meaning">${currentLine.meaning}</div>` : ''}
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
                <div class="speech-diff-box" id="rp-diff-box" style="display:none">
                  <div style="font-size:11.5px;font-weight:800;color:#475569;margin-bottom:6px;text-transform:uppercase">
                    Kết quả nhận diện giọng nói:
                  </div>
                  <div id="rp-diff-content"></div>
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
                <div style="font-size:28px;margin-bottom:6px">🤖</div>
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
      </div>
    </div>
  `;

  const recordedAudioUrl = rpScores[currentRpTurnIdx]?.userAudioUrl;
  if (recordedAudioUrl) {
    renderUserRoleplayPlaybackControls(recordedAudioUrl);
  } else {
    const existingPlaybackCard = document.getElementById('rp-user-playback-card');
    if (existingPlaybackCard) {
      existingPlaybackCard.remove();
    }
  }
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

  const playBtn = document.getElementById('btn-play-user-audio');

  if (currentUserAudioElement && !currentUserAudioElement.paused) {
    stopUserAudioPlayback();
    return;
  }

  stopUserAudioPlayback();
  currentUserAudioElement = new Audio(audioUrl);
  if (playBtn) {
    playBtn.classList.add('playing');
    playBtn.innerHTML = '⏸️ Đang phát giọng bạn...';
  }

  currentUserAudioElement.onended = () => {
    stopUserAudioPlayback();
  };
  currentUserAudioElement.onerror = () => {
    stopUserAudioPlayback();
  };

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
  const videoElem = document.getElementById('rp-video-player');
  const avatarStage = document.getElementById('rp-avatar-stage');

  renderActiveRoleplayView();

  const refreshedVideoElem = document.getElementById('rp-video-player');
  const refreshedAvatarStage = document.getElementById('rp-avatar-stage');
  const shouldForcePlayback = forceTurnPlayback;

  if (isUserTurn && !shouldForcePlayback) {
    if (refreshedVideoElem) {
      refreshedVideoElem.pause();
      refreshedVideoElem.style.display = 'none';
    }
    if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';
    forceTurnPlayback = false;
    return;
  }

  const shouldUseVideoPlayback = !isUserTurn && !!currentLine.videoUrl && !shouldForcePlayback;

  if (shouldUseVideoPlayback) {
    if (refreshedVideoElem) {
      refreshedVideoElem.style.display = 'block';
      refreshedVideoElem.src = currentLine.videoUrl;
      refreshedVideoElem.playbackRate = rpPlaybackSpeed;
      refreshedVideoElem.currentTime = currentLine.startTime || 0;
      if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'none';

      const playPromise = refreshedVideoElem.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video autoplay blocked or format error, fallback to TTS:", err);
          if (refreshedVideoElem) refreshedVideoElem.style.display = 'none';
          if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';
          speakLineWithTTS(currentLine.text, () => {
            setTimeout(() => { window.advanceRoleplayTurnManual(); }, 700);
          });
        });
      }

      refreshedVideoElem.onended = () => {
        setTimeout(() => {
          window.advanceRoleplayTurnManual();
        }, 700);
      };
      forceTurnPlayback = false;
      return;
    }
  }

  if (refreshedVideoElem) refreshedVideoElem.style.display = 'none';
  if (refreshedAvatarStage) refreshedAvatarStage.style.display = 'block';

  speakLineWithTTS(currentLine.text, () => {
    forceTurnPlayback = false;
    if (!isUserTurn && !shouldForcePlayback) {
      setTimeout(() => {
        window.advanceRoleplayTurnManual();
      }, 700);
    }
  });

  if (shouldForcePlayback) {
    setTimeout(() => { forceTurnPlayback = false; }, 600);
  }
}

function speakLineWithTTS(text, onEndCallback = null) {
  if (!currentRpLesson) {
    speakText(text, { onEnd: onEndCallback });
    return;
  }
  const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
  const charA = currentRpLesson.characterA || {};
  const charB = currentRpLesson.characterB || {};
  const spkChar = currentLine?.speaker === 'A' ? charA : charB;
  
  // Nhận diện giới tính nhân vật để chọn giọng tự nhiên tương ứng
  let gender = 'neutral';
  const nameStr = ((spkChar.name || '') + ' ' + (spkChar.roleTitle || '')).toLowerCase();
  if (nameStr.includes('emma') || nameStr.includes('sarah') || nameStr.includes('elena') || (spkChar.avatar && spkChar.avatar.includes('👩')) || nameStr.includes('lễ tân') || nameStr.includes('receptionist')) {
    gender = 'female';
  } else if (nameStr.includes('david') || nameStr.includes('alex') || nameStr.includes('harrison') || (spkChar.avatar && (spkChar.avatar.includes('🧑') || spkChar.avatar.includes('👨'))) || nameStr.includes('mr')) {
    gender = 'male';
  } else {
    gender = currentLine?.speaker === 'A' ? 'female' : 'male';
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
    forceTurnPlayback = true;
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

window.retryCurrentRoleplayTurn = function() {
  if (advanceTimerTimeout) clearTimeout(advanceTimerTimeout);
  stopUserAudioPlayback();
  if (rpScores[currentRpTurnIdx]) {
    delete rpScores[currentRpTurnIdx];
  }
  renderActiveRoleplayView();
  setTimeout(() => {
    window.toggleRoleplayRecording();
  }, 250);
};

// -------------------------------------------------------------------------
// 3.4 THU ÂM HỌC VIÊN (MEDIARECORDER) + CHẤM ĐIỂM AI (SPEECH DIFF ENGINE)
// -------------------------------------------------------------------------
function renderUserRoleplayPlaybackControls(audioUrl) {
  const existingWrap = document.getElementById('rp-user-playback-card');
  const container = document.getElementById('rp-speak-box');
  if (!container) return;

  const html = `
    <div id="rp-user-playback-card" style="margin-top:14px;width:100%;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="font-size:12.5px;font-weight:800;color:#1d4ed8;display:flex;align-items:center;gap:6px">
        <span>🎧</span>
        <span>Giọng nói của bạn</span>
      </div>
      <button id="btn-play-user-audio" class="voice-playback-btn" type="button" onclick="window.playUserRecordedAudio('${audioUrl.replace(/'/g, "\\'")}')">🎧 Nghe lại giọng của bạn</button>
    </div>
  `;

  if (existingWrap) {
    existingWrap.outerHTML = html;
  } else {
    container.insertAdjacentHTML('beforeend', html);
  }
}

function showRoleplayCompletionSummary() {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace) return;

  const totalTurns = (currentRpLesson?.dialogue || []).length;
  const scoredTurns = Object.keys(rpScores).length;
  const avgScore = scoredTurns ? Math.round(Object.values(rpScores).reduce((sum, item) => sum + (Number(item.score || 0)), 0) / scoredTurns) : 0;

  workspace.innerHTML = `
    <div class="card" style="margin:0 auto;max-width:700px;border-left:4px solid #10b981">
      <div style="font-size:28px;margin-bottom:8px">🎉</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px">Hoàn thành luyện hội thoại</div>
      <div style="color:#475569;line-height:1.7">Bạn đã luyện ${scoredTurns}/${totalTurns} lượt và đạt điểm trung bình <b>${avgScore}%</b>.</div>
      <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:10px">
        <button class="btn btn-p" onclick="window.startRoleplayAsRole('${currentRpRole || 'A'}')">🔁 Luyện lại</button>
        <button class="btn btn-sm" onclick="window.openRoleSelectionScreen()">⚙️ Chọn vai mới</button>
      </div>
    </div>
  `;
}

function startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  const recognizer = new SpeechRec();
  rpSpeechRecognizer = recognizer;
  recognizer.lang = 'en-US';
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  isRpRecording = true;

  if (micBtn) {
    micBtn.classList.add('recording');
    micBtn.textContent = '🔴';
  }
  if (statusLabel) {
    statusLabel.textContent = 'Đang nghe bạn nói…';
    statusLabel.style.color = '#dc2626';
  }

  recognizer.onstart = () => {
    isRpRecording = true;
    if (micBtn) {
      micBtn.classList.add('recording');
      micBtn.textContent = '🔴';
    }
  };

  recognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcript) return;

    const { score, diffHtml } = computeWordDiffAndScore(currentLine?.text || '', transcript);

    if (diffBox) diffBox.style.display = 'block';
    if (diffContent) diffContent.innerHTML = diffHtml;

    if (scoreVal) {
      const color = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
      scoreVal.innerHTML = `Điểm: <span style="color:${color};font-weight:800">${score}%</span>`;
    }

    if (currentRpLesson) {
      rpScores[currentRpTurnIdx] = {
        ...rpScores[currentRpTurnIdx],
        score,
        transcript,
        diffHtml,
        userAudioUrl: rpScores[currentRpTurnIdx]?.userAudioUrl || null,
      };
    }

    if (statusLabel) {
      statusLabel.textContent = transcript ? `Đang nghe / đã nhận diện: “${transcript}”` : 'Đã nghe xong. Bấm Mic để nói lại';
      statusLabel.style.color = score >= 80 ? '#15803d' : '#7c2d12';
    }

    if (event.results[event.results.length - 1]?.isFinal) {
      if (transcript) {
        if (score >= 75) {
          playSuccessSound();
          addXP(20, 'Phát âm roleplay tốt');
        } else {
          playWrongSound();
        }
      }
    }
  };

  recognizer.onerror = (event) => {
    console.error('Lỗi SpeechRecognition:', event.error);
    if (statusLabel) {
      statusLabel.textContent = 'Không nhận diện được giọng nói. Hãy thử lại!';
      statusLabel.style.color = '#dc2626';
    }
    if (diffBox) diffBox.style.display = 'block';
    if (diffContent) diffContent.innerHTML = `<span class="diff-word-missing">Không nhận diện được giọng nói. Vui lòng thử lại.</span>`;
  };

  recognizer.onend = () => {
    isRpRecording = false;
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.textContent = '🎙️';
    }
    if (statusLabel) statusLabel.style.color = '#64748b';
    if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
      try { activeMediaRecorder.stop(); } catch (e) {}
    }
  };

  try {
    recognizer.start();
  } catch (err) {
    isRpRecording = false;
    if (micBtn) {
      micBtn.classList.remove('recording');
      micBtn.textContent = '🎙️';
    }
    if (statusLabel) {
      statusLabel.textContent = 'Mic đang bận. Vui lòng thử lại sau vài giây';
    }
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
  const playbackCard = document.getElementById('rp-user-playback-card');

  // NẾU ĐANG THU ÂM -> DỪNG THU ÂM
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
      micBtn.textContent = '🎙️';
    }
    if (statusLabel) statusLabel.textContent = 'Đã dừng thu âm. Bấm Mic để nói lại';
    return;
  }

  // BẮT ĐẦU THU ÂM BẰNG MEDIARECORDER (LƯU AUDIO THẬT CỦA HỌC VIÊN)
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then(stream => {
      activeAudioStream = stream;
      recordedAudioChunks = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }
        activeMediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        
        activeMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedAudioChunks.push(e.data);
        };

        activeMediaRecorder.onstop = () => {
          if (recordedAudioChunks.length > 0) {
            const blobType = mimeType || 'audio/webm';
            const audioBlob = new Blob(recordedAudioChunks, { type: blobType });
            const userAudioUrl = URL.createObjectURL(audioBlob);
            if (currentRpLesson) {
              if (!rpScores[currentRpTurnIdx]) rpScores[currentRpTurnIdx] = {};
              rpScores[currentRpTurnIdx].userAudioUrl = userAudioUrl;
            }
            // Hiển thị khung nghe lại giọng đọc của học viên
            renderUserRoleplayPlaybackControls(userAudioUrl);
          }
          if (activeAudioStream) {
            activeAudioStream.getTracks().forEach(t => t.stop());
            activeAudioStream = null;
          }
        };

        activeMediaRecorder.start(100);
      }

      // ĐỒNG THỜI CHẠY SPEECH RECOGNITION ĐỂ SO KHỚP TỪNG TỪ & CHẤM ĐIỂM
      startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal);
    })
    .catch(err => {
      console.warn("Không thể mở micro qua getUserMedia, tiếp tục với SpeechRecognition thuần:", err);
      startRoleplaySpeechRecognition(currentLine, micBtn, statusLabel, diffBox, diffContent, scoreVal);
    });
};



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
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.maxAlternatives = 1;

  speechRecognizer.onstart = () => {
    isRecording = true;
    if (btn) {
      btn.textContent = '🔴 Đang nghe bạn nói...';
      btn.classList.add('recording');
    }
  };

  speechRecognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcript) return;

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

    if (event.results[event.results.length - 1]?.isFinal) {
      if (score >= 75) {
        playSuccessSound();
        addXP(20, 'Phát âm chuẩn xác');
      } else {
        playWrongSound();
      }
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

  if (type === 'scramble') {
    const scrambleGroup = wrtData.find(w => w.id?.includes('scramble')) || wrtData[0] || { items: [] };
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${(scrambleGroup.items || []).map((item, idx) => {
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
    const errorGroup = wrtData.find(w => w.id?.includes('error_fix')) || { items: [] };
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${(errorGroup.items || []).map((item, idx) => `
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
            <button class="btn btn-p" style="margin-top:12px" onclick="window.checkErrorFix(${idx}, '${item.errorWord}', '${item.correctWord}', '${(item.explain || '').replace(/'/g, "\\'")}')">Kiểm tra sửa lỗi</button>
            <div id="err-fb-${idx}" class="fb" style="display:none"></div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

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
  loadLanguageFocusView();
}

function loadLanguageFocusView() {
  const workspace = document.getElementById('lang-workspace');
  if (!workspace || !currentUnit) return;

  const langObj = getUnitSkillObj(currentUnit, 'languageFocus');
  const fCards = safeArray(langObj?.flashcards, []);
  const currentCard = fCards[currentCardIdx] || { word: 'Practice', meaning: 'Luyện tập', ipa: '/ˈpræk.tɪs/', pos: 'noun' };

  workspace.innerHTML = `
    <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px">
      <button class="btn ${window._langTab === 'cards' || !window._langTab ? 'btn-p' : ''}" onclick="window.switchLangSubTab('cards')">🎴 Thẻ Từ Vựng 3D</button>
      <button class="btn ${window._langTab === 'match' ? 'btn-p' : ''}" onclick="window.switchLangSubTab('match')">🧩 Nối Từ & Thành Ngữ</button>
      <button class="btn ${window._langTab === 'quiz' ? 'btn-p' : ''}" onclick="window.switchLangSubTab('quiz')">⚡ Thử Thách Ngữ Pháp</button>
    </div>

    <div id="lang-subtab-container">
      ${renderFlashcardsView(currentCard, fCards.length || 1)}
    </div>
  `;
}

window.switchLangSubTab = function(tab) {
  window._langTab = tab;
  const container = document.getElementById('lang-subtab-container');
  if (!container || !currentUnit) return;

  if (tab === 'cards') {
    const fCards = currentUnit.languageFocus?.flashcards || [];
    container.innerHTML = renderFlashcardsView(fCards[currentCardIdx] || fCards[0], fCards.length);
  } else if (tab === 'match') {
    container.innerHTML = renderMatchPuzzleView();
  } else if (tab === 'quiz') {
    container.innerHTML = renderGrammarQuizView();
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
  const pairs = currentUnit?.languageFocus?.matchPairs || [];
  if (!pairs.length) return '<div class="empty">Chưa có bài nối từ trong Unit này.</div>';

  const lefts = [...pairs].sort(() => Math.random() - 0.5);
  const rights = [...pairs].sort(() => Math.random() - 0.5);
  matchedCount = 0;
  matchSelectedLeft = null;
  matchSelectedRight = null;

  return `
    <div class="card" style="max-width:700px;margin:0 auto">
      <div style="font-weight:700;font-size:16px;margin-bottom:6px;color:#1e293b">🧩 Ghép cặp Từ vựng & Thành ngữ (Match Pairs)</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:14px">Bấm 1 ô bên trái rồi bấm 1 ô bên phải mang nghĩa tương ứng.</div>

      <div class="match-puzzle-grid">
        <div style="display:flex;flex-direction:column;gap:8px">
          ${lefts.map(p => `<button class="match-puzzle-chip" id="mp-left-${p.pairId}" onclick="window.selectMatchLeft(${p.pairId})">${p.left}</button>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${rights.map(p => `<button class="match-puzzle-chip" id="mp-right-${p.pairId}" onclick="window.selectMatchRight(${p.pairId})">${p.right}</button>`).join('')}
        </div>
      </div>
      <div id="match-puzzle-win" style="display:none;text-align:center;padding:16px;background:#ecfdf5;border-radius:10px;color:#047857;font-weight:700;margin-top:14px">
        🎉 Chúc mừng! Bạn đã ghép chính xác toàn bộ các cặp!
      </div>
    </div>
  `;
}

window.selectMatchLeft = function(pairId) {
  document.querySelectorAll('[id^="mp-left-"]').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById(`mp-left-${pairId}`);
  if (btn && !btn.classList.contains('matched')) {
    btn.classList.add('selected');
    matchSelectedLeft = pairId;
    checkPuzzlePair();
  }
};

window.selectMatchRight = function(pairId) {
  document.querySelectorAll('[id^="mp-right-"]').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById(`mp-right-${pairId}`);
  if (btn && !btn.classList.contains('matched')) {
    btn.classList.add('selected');
    matchSelectedRight = pairId;
    checkPuzzlePair();
  }
};

function checkPuzzlePair() {
  if (matchSelectedLeft !== null && matchSelectedRight !== null) {
    if (matchSelectedLeft === matchSelectedRight) {
      const bLeft = document.getElementById(`mp-left-${matchSelectedLeft}`);
      const bRight = document.getElementById(`mp-right-${matchSelectedRight}`);
      if (bLeft) { bLeft.classList.remove('selected'); bLeft.classList.add('matched'); bLeft.disabled = true; }
      if (bRight) { bRight.classList.remove('selected'); bRight.classList.add('matched'); bRight.disabled = true; }
      playSuccessSound();
      addXP(10, 'Nối thành ngữ đúng');
      matchedCount++;

      const pairs = currentUnit?.languageFocus?.matchPairs || [];
      if (matchedCount === pairs.length) {
        triggerConfetti();
        const winBox = document.getElementById('match-puzzle-win');
        if (winBox) winBox.style.display = 'block';
      }
    } else {
      playWrongSound();
      setTimeout(() => {
        document.querySelectorAll('.match-puzzle-chip.selected').forEach(b => b.classList.remove('selected'));
      }, 400);
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
    playSuccessSound();
    addXP(15, 'Ngữ pháp đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`gq-opt-${qIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + (quizItem?.explain || '');
    fb.style.display = 'block';
    playWrongSound();
  }
};

// =========================================================================
// MAIN CONTROLLER INITIALIZATION
// =========================================================================
export function switchSkillTab(skill) {
  if (!skill) return;
  currentSkillTab = skill;

  const navButtons = document.querySelectorAll('.skill-tab-btn, .subject-tab');
  navButtons.forEach(btn => {
    const btnSkill = btn.dataset.skill || btn.getAttribute('data-skill');
    const isTarget = btnSkill === skill;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-pressed', String(isTarget));
  });

  const panels = document.querySelectorAll('.tab-content, .skill-content-panel');
  panels.forEach(panel => {
    const isTarget = panel.id === `skill-panel-${skill}`;
    panel.classList.toggle('active', isTarget);
    panel.style.display = isTarget ? 'block' : 'none';
  });

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
  const bindSkillTabClicks = () => {
    document.querySelectorAll('.skill-tab-btn, .subject-tab').forEach(btn => {
      if (btn.dataset.boundSkillTab === 'true') return;
      btn.dataset.boundSkillTab = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const skill = btn.dataset.skill || btn.getAttribute('data-skill');
        if (skill) switchSkillTab(skill);
      });
    });
  };

  bindSkillTabClicks();

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
