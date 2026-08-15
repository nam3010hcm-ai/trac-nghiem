/**
 * =========================================================================
 * INTERACTIVE ENGLISH LEARNING HUB - JAVASCRIPT CONTROLLER (learn.js)
 * Real-time Unit Loading & 5 Skills Execution Engine
 * =========================================================================
 */

import { LEARN_DATA, DEFAULT_UNITS } from './learn-data.js';

const db = () => window.supabaseClient;

// --- UNITS STATE ---
let allUnits = [];
let currentUnit = null;
let currentSkillTab = 'listening';

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

// --- WEB SPEECH SYNTHESIS (TTS) ---
export function speakText(text, rate = 1.0, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))));
  if (naturalVoice) utter.voice = naturalVoice;

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
  const email = document.getElementById('learn-auth-email')?.value.trim().toLowerCase();
  const pass = document.getElementById('learn-auth-pass')?.value.trim();
  const errBox = document.getElementById('learn-login-err');
  const btn = document.getElementById('btn-learn-login');

  if (errBox) errBox.style.display = 'none';

  if (!email || !pass) {
    if (errBox) {
      errBox.textContent = 'Vui lòng nhập đầy đủ Gmail và Mật khẩu!';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Đang xác thực...'; }

  try {
    const { data, error } = await db()
      .from('students')
      .select('*')
      .eq('email', email)
      .eq('password', pass)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      if (errBox) {
        errBox.textContent = '❌ Gmail hoặc mật khẩu không chính xác!';
        errBox.style.display = 'block';
      }
      return;
    }

    if (data.is_active === false) {
      if (errBox) {
        errBox.textContent = '⛔ Tài khoản học viên của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!';
        errBox.style.display = 'block';
      }
      return;
    }

    // Đăng nhập thành công
    sessionStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(data));
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
// LOAD UNITS TỪ SUPABASE / DEFAULT
// =========================================================================
async function loadUnitsData() {
  try {
    if (db()) {
      const { data, error } = await db().from('learning_units').select('*').eq('is_hidden', false).order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        allUnits = data.map(u => ({
          id: u.id,
          title: u.title,
          topic: u.topic || '',
          level: u.level || 'A2 - B1',
          icon: u.icon || '📖',
          description: u.description || '',
          isHidden: u.is_hidden ?? false,
          listening: u.listening || [],
          reading: u.reading || [],
          speaking: u.speaking || [],
          writing: u.writing || [],
          languageFocus: u.language_focus || u.languageFocus || {}
        }));
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
  currentUnit = allUnits[0];

  populateUnitTiles();
  loadCurrentUnitView();
}

function populateUnitTiles() {
  const container = document.getElementById('unit-tiles-container');
  if (container) {
    let html = `
      <div class="unit-card-btn ${!currentUnit || currentUnit.id === 'all' ? 'active' : ''}" onclick="window.selectUnitTile('all')">
        <div style="font-size:20px">📚</div>
        <div class="unit-btn-title">Tất cả</div>
        <div class="unit-btn-desc">Tổng hợp tất cả bài</div>
      </div>
    `;

    allUnits.forEach((u, idx) => {
      const isAct = currentUnit && currentUnit.id === u.id;
      html += `
        <div class="unit-card-btn ${isAct ? 'active' : ''}" onclick="window.selectUnitTile('${u.id}')">
          <div style="font-size:20px">${u.icon || (idx + 1) + '️⃣'}</div>
          <div class="unit-btn-title">${u.title.split(':')[0] || 'Unit ' + (idx + 1)}</div>
          <div class="unit-btn-desc">${u.topic || u.level || ''}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  const sel = document.getElementById('learn-unit-select');
  if (sel) {
    sel.innerHTML = allUnits.map(u => `
      <option value="${u.id}" ${currentUnit && u.id === currentUnit.id ? 'selected' : ''}>
        ${u.title} (${u.level || 'A2'})
      </option>
    `).join('');

    sel.onchange = (e) => {
      const chosen = allUnits.find(u => u.id === e.target.value);
      if (chosen) {
        currentUnit = chosen;
        populateUnitTiles();
        loadCurrentUnitView();
      }
    };
  }
}

export function selectUnitTile(unitId) {
  if (unitId === 'all') {
    currentUnit = allUnits[0];
  } else {
    const found = allUnits.find(u => u.id === unitId);
    if (found) currentUnit = found;
  }
  populateUnitTiles();
  loadCurrentUnitView();
}

export function selectContentType(type, btnEl) {
  document.querySelectorAll('.content-type-row .type-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  // Chuyển tab tương ứng nếu chọn
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

window.selectUnitTile = selectUnitTile;
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
let currentLisLesson = null;
let currentPlaybackSpeed = 1.0;

function initListening() {
  const list = currentUnit?.listening || [];
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
  const list = currentUnit?.listening || [];
  if (!container) return;
  if (!list.length) { container.innerHTML = ''; return; }

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
  const found = (currentUnit?.listening || []).find(l => l.id === id);
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
let currentReadLesson = null;

function initReading() {
  const list = currentUnit?.reading || [];
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
  const list = currentUnit?.reading || [];
  if (!container) return;
  if (!list.length) { container.innerHTML = ''; return; }

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
  const found = (currentUnit?.reading || []).find(r => r.id === id);
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
// 3. SPEAKING MODULE
// =========================================================================
let currentSpkLesson = null;
let isRecording = false;
let speechRecognizer = null;

function initSpeaking() {
  const list = currentUnit?.speaking || [];
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
  const list = currentUnit?.speaking || [];
  if (!container) return;
  if (!list.length) { container.innerHTML = ''; return; }

  container.innerHTML = list.map(item => {
    const isSelected = currentSpkLesson && item.id === currentSpkLesson.id;
    return `
      <div class="lesson-card ${isSelected ? 'active' : ''}" onclick="window.selectSpeakingLesson('${item.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="lesson-badge">${item.level || currentUnit.level || 'A2 - B1'}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">🗣️ ${item.title}</div>
        <div class="lesson-meta">🎯 Chủ đề: ${item.topic || currentUnit.topic || 'General'}</div>
      </div>
    `;
  }).join('');
}

window.selectSpeakingLesson = function(id) {
  const found = (currentUnit?.speaking || []).find(s => s.id === id);
  if (found) {
    currentSpkLesson = found;
    renderSpeakingLessons();
    loadSpeakingLesson(id);
  }
};

function loadSpeakingLesson(id) {
  const s = currentSpkLesson;
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !s) return;

  if (s.phrases) {
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        ${s.phrases.map((p, idx) => `
          <div class="card" style="margin:0;border-left:4px solid #f43f5e">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:8px">
              <div>
                <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:4px">${p.text}</div>
                <div style="font-family:'Courier New',monospace;color:#e11d48;font-size:14px">${p.ipa || ''}</div>
                <div style="font-size:13px;color:#475569;margin-top:4px">💡 <i>${p.meaning || ''}</i></div>
              </div>
              <button class="btn btn-sm" onclick="window.speakPronunciation('${p.text.replace(/'/g, "\\'")}')" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3">🔊 Nghe mẫu</button>
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
  } else if (s.dialogue) {
    workspace.innerHTML = `
      <div class="card" style="max-width:700px;margin:0 auto">
        <div style="font-weight:700;font-size:16px;margin-bottom:14px;color:#1e293b">☕ Hội thoại tương tác (Interactive Roleplay)</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${s.dialogue.map((d, idx) => `
            <div style="display:flex;gap:12px;align-items:flex-start;${d.isUser ? 'flex-direction:row-reverse' : ''}">
              <div style="font-size:28px">${d.avatar || '👤'}</div>
              <div style="max-width:80%;background:${d.isUser ? '#eff6ff' : '#f1f5f9'};padding:12px 16px;border-radius:12px;border:${d.isUser ? '1px solid #bfdbfe' : '1px solid #e2e8f0'}">
                <div style="font-weight:700;font-size:12px;color:${d.isUser ? '#1d4ed8' : '#475569'};margin-bottom:4px">${d.role}</div>
                <div style="font-size:14px;color:#1e293b;line-height:1.5">${d.isUser ? d.targetText : d.text}</div>
                ${d.meaning ? `<div style="font-size:12px;color:#64748b;margin-top:4px"><i>${d.meaning}</i></div>` : ''}
                ${d.isUser ? `
                  <div style="margin-top:8px;display:flex;gap:8px">
                    <button class="btn btn-sm" onclick="window.speakPronunciation('${(d.targetText || '').replace(/'/g, "\\'")}')" style="background:#fff;font-size:11px">🔊 Nghe mẫu</button>
                    <button class="btn btn-sm btn-p" onclick="window.togglePronunciationRecording('dlg-${idx}', '${(d.targetText || '').replace(/'/g, "\\'")}')" style="font-size:11px">🎙️ Đọc câu này</button>
                  </div>
                  <div id="spk-score-dlg-${idx}" style="margin-top:6px;font-weight:700;font-size:13px;color:#047857"></div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

window.speakPronunciation = function(text) { speakText(text, 0.9, 'en-US'); };

window.togglePronunciationRecording = function(idx, targetText) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Trình duyệt của bạn chưa hỗ trợ Web Speech Recognition. Vui lòng thử trên Google Chrome hoặc Microsoft Edge!');
    return;
  }

  const btn = document.getElementById(`btn-spk-rec-${idx}`);
  const scoreEl = document.getElementById(`spk-score-${idx}`);
  const resultEl = document.getElementById(`spk-result-${idx}`);

  if (isRecording) {
    if (speechRecognizer) speechRecognizer.stop();
    isRecording = false;
    if (btn) btn.textContent = '🎙️ Bấm để nói';
    return;
  }

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
    const transcript = event.results[0][0].transcript;
    const score = calculateSpeakingAccuracy(targetText, transcript);
    if (scoreEl) {
      const color = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
      scoreEl.innerHTML = `Điểm phát âm: <span style="color:${color}">${score}/100</span>`;
    }

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `🗣️ <b>Bạn vừa nói:</b> "${transcript}"`;
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
    if (scoreEl) scoreEl.textContent = '⚠️ Chưa nhận diện được giọng nói!';
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    if (btn) {
      btn.textContent = '🎙️ Thử lại lần nữa';
      btn.classList.remove('recording');
    }
  };

  speechRecognizer.start();
};

function calculateSpeakingAccuracy(target, actual) {
  const cleanT = target.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
  const cleanA = actual.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
  
  let match = 0;
  cleanT.forEach(w => {
    if (cleanA.includes(w)) match++;
  });

  return Math.min(100, Math.round((match / cleanT.length) * 100));
}

// =========================================================================
// 4. WRITING MODULE
// =========================================================================
let currentWrtCategory = 'scramble';

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

  const wrtData = currentUnit.writing || [];

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
let currentCardIdx = 0;
let matchSelectedLeft = null;
let matchSelectedRight = null;
let matchedCount = 0;

function initLanguageFocus() {
  currentCardIdx = 0;
  loadLanguageFocusView();
}

function loadLanguageFocusView() {
  const workspace = document.getElementById('lang-workspace');
  if (!workspace || !currentUnit) return;

  const fCards = currentUnit.languageFocus?.flashcards || [];
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
    <div style="text-align:center;max-width:500px;margin:0 auto">
      <div style="font-size:13px;color:#64748b;margin-bottom:10px">Thẻ ${currentCardIdx + 1} / ${total} • Bấm vào thẻ để lật mặt xem nghĩa</div>
      
      <div class="flashcard-3d-scene" id="flashcard-scene" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-3d-inner">
          <div class="flashcard-face">
            <div style="font-size:12px;color:#a16207;font-weight:700;margin-bottom:4px;text-transform:uppercase">${card.pos || ''}</div>
            <div class="flashcard-word">${card.word || ''}</div>
            <div class="flashcard-ipa">${card.ipa || ''}</div>
            <button class="btn btn-sm btn-p" onclick="event.stopPropagation(); window.speakVocab('${card.word}')" style="background:#f59e0b;border-color:#f59e0b">🔊 Nghe phát âm</button>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-meaning">${card.meaning || ''}</div>
            <div class="flashcard-example">"${card.example || ''}"</div>
            ${card.synonyms ? `<div style="font-size:12px;color:#047857;margin-top:10px"><b>Đồng nghĩa:</b> ${card.synonyms}</div>` : ''}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
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
function switchSkillTab(skill) {
  currentSkillTab = skill;

  document.querySelectorAll('.skill-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skill === skill);
  });

  document.querySelectorAll('.skill-content-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `skill-panel-${skill}`);
  });

  if (skill === 'listening') initListening();
  if (skill === 'reading') initReading();
  if (skill === 'speaking') initSpeaking();
  if (skill === 'writing') initWriting();
  if (skill === 'languageFocus') initLanguageFocus();
}

window.switchSkillTab = switchSkillTab;

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.skill-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSkillTab(btn.dataset.skill));
  });

  const student = getAuthenticatedStudent();
  if (student && student.id) {
    await initAuthenticatedLearn();
  } else {
    logoutLearnStudent();
  }
});
