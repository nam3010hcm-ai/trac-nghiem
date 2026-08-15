/**
 * =========================================================================
 * INTERACTIVE ENGLISH LEARNING HUB - JAVASCRIPT CONTROLLER (learn.js)
 * =========================================================================
 */

import { LEARN_DATA } from './learn-data.js';

// --- GAMIFICATION STATE ---
const STORE_KEY = 'quiz_learn_profile_v1';
let userProfile = {
  xp: 0,
  level: 1,
  streak: 1,
  lastActiveDate: new Date().toDateString(),
  completedExercises: [],
  unlockedBadges: []
};

// --- AUDIO CONTEXT SOUND ENGINE (Web Audio API) ---
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
  } catch (e) {
    // Silent fail if audio blocked
  }
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
  window.speechSynthesis.cancel(); // Dừng câu đang phát trước đó
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;

  // Ưu tiên chọn giọng tiếng Anh bản ngữ tự nhiên
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))));
  if (naturalVoice) utter.voice = naturalVoice;

  window.speechSynthesis.speak(utter);
}

// --- CONFETTI ANIMATION ENGINE ---
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
      p.vy += 0.4; // Trọng lực
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

// --- PROFILE & GAMIFICATION LOGIC ---
function loadProfile() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      userProfile = { ...userProfile, ...JSON.parse(saved) };
    }
  } catch (e) {}

  // Kiểm tra Streak ngày học
  const today = new Date().toDateString();
  if (userProfile.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (userProfile.lastActiveDate === yesterday.toDateString()) {
      userProfile.streak += 1;
    } else if (new Date(userProfile.lastActiveDate) < yesterday) {
      userProfile.streak = 1; // Đứt chuỗi
    }
    userProfile.lastActiveDate = today;
    saveProfile();
  }

  renderProfileStats();
}

function saveProfile() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(userProfile));
  } catch (e) {}
}

export function addXP(amount, reason = '') {
  userProfile.xp += amount;
  const oldLevel = userProfile.level;
  userProfile.level = Math.floor(userProfile.xp / 100) + 1;
  saveProfile();
  renderProfileStats();

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
// 1. LISTENING MODULE CONTROLLER
// =========================================================================
let currentLisLesson = LEARN_DATA.listening[0];
let currentPlaybackSpeed = 1.0;

function initListening() {
  renderListeningLessons();
  loadListeningLesson(currentLisLesson.id);
}

function renderListeningLessons() {
  const container = document.getElementById('lis-lesson-list');
  if (!container) return;
  container.innerHTML = LEARN_DATA.listening.map(item => `
    <div class="lesson-card ${item.id === currentLisLesson.id ? 'active' : ''}" onclick="window.selectListeningLesson('${item.id}')">
      <span class="lesson-badge">${item.level}</span>
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">${item.title}</div>
      <div style="font-size:12px;color:#64748b">🎯 Chủ đề: ${item.topic} • ⏱ ${item.duration}</div>
    </div>
  `).join('');
}

window.selectListeningLesson = function(id) {
  const found = LEARN_DATA.listening.find(l => l.id === id);
  if (found) {
    currentLisLesson = found;
    renderListeningLessons();
    loadListeningLesson(id);
  }
};

function loadListeningLesson(id) {
  const l = currentLisLesson;
  const workspace = document.getElementById('lis-workspace');
  if (!workspace) return;

  workspace.innerHTML = `
    <div class="listening-player-box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:800;color:#fff">${l.title}</div>
          <div style="font-size:13px;color:#94a3b8">🎧 Kỹ năng nghe hiểu • ${l.level} • ${l.topic}</div>
        </div>
        <div class="speed-selector-group">
          <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
        </div>
      </div>

      <div class="audio-controls-row">
        <button class="play-audio-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()">▶</button>
        <button class="btn btn-sm" onclick="window.playCurrentListeningAudio()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">🔁 Nghe lại từ đầu</button>
        <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="background:rgba(255,255,255,0.15);color:#fff;border:none">👁️ Hiện Transcript</button>
      </div>

      <div id="lis-transcript-box" style="display:none;background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:8px;font-size:14px;line-height:1.7;color:#e2e8f0;border-left:3px solid #10b981">
        <b>📝 Transcript:</b><br>${l.audioText}
      </div>
    </div>

    <!-- CÁC BÀI TẬP TƯƠNG TÁC -->
    <div style="display:flex;flex-direction:column;gap:20px;">
      ${renderListeningExercises(l.exercises)}
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
            ${ex.options.map((opt, oIdx) => `
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
          <div style="font-size:13px;color:#64748b;margin-bottom:8px">${ex.prompt} <i>(${ex.hint})</i></div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button class="btn btn-sm" onclick="window.speakDictation('${ex.targetSentence.replace(/'/g, "\\'")}')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">🔊 Nghe câu này</button>
          </div>
          <textarea id="dictation-input-${idx}" class="dictation-textarea" placeholder="Gõ lại những gì bạn nghe được..."></textarea>
          <div style="margin-top:10px;display:flex;gap:10px">
            <button class="btn btn-p" onclick="window.checkDictation(${idx}, '${ex.targetSentence.replace(/'/g, "\\'")}')">Kiểm tra chính tả</button>
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
  if (!userInput) {
    alert('Vui lòng gõ nội dung trước khi kiểm tra!');
    return;
  }

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
// 2. READING MODULE CONTROLLER (SPLIT SCREEN + TRA TỪ NHANH)
// =========================================================================
let currentReadLesson = LEARN_DATA.reading[0];

function initReading() {
  renderReadingLessons();
  loadReadingLesson(currentReadLesson.id);
}

function renderReadingLessons() {
  const container = document.getElementById('read-lesson-list');
  if (!container) return;
  container.innerHTML = LEARN_DATA.reading.map(item => `
    <div class="lesson-card ${item.id === currentReadLesson.id ? 'active' : ''}" onclick="window.selectReadingLesson('${item.id}')">
      <span class="lesson-badge">${item.level}</span>
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">${item.title}</div>
      <div style="font-size:12px;color:#64748b">🎯 Chủ đề: ${item.topic}</div>
    </div>
  `).join('');
}

window.selectReadingLesson = function(id) {
  const found = LEARN_DATA.reading.find(r => r.id === id);
  if (found) {
    currentReadLesson = found;
    renderReadingLessons();
    loadReadingLesson(id);
  }
};

function loadReadingLesson(id) {
  const r = currentReadLesson;
  const workspace = document.getElementById('read-workspace');
  if (!workspace) return;

  // Xử lý làm nổi bật từ vựng có thể click tra từ
  let annotatedPassage = r.passage;
  Object.keys(r.vocabulary).forEach(word => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    annotatedPassage = annotatedPassage.replace(regex, `<span class="vocab-tag" onclick="window.showVocabLookup('$1')">$1</span>`);
  });

  workspace.innerHTML = `
    <div class="reading-split-view">
      <!-- CỘT BÊN TRÁI: ĐOẠN VĂN ĐỌC HIỂU -->
      <div class="reading-passage-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <h3 style="margin:0;font-size:17px;color:#1e293b">${r.title}</h3>
          <span style="font-size:12px;color:#0284c7;background:#e0f2fe;padding:2px 8px;border-radius:4px;font-weight:600">💡 Bấm vào từ màu xanh để tra nhanh</span>
        </div>
        <div style="white-space:pre-wrap;">${annotatedPassage}</div>
      </div>

      <!-- CỘT BÊN PHẢI: BỘ CÂU HỎI TƯƠNG TÁC -->
      <div style="display:flex;flex-direction:column;gap:16px;max-height:520px;overflow-y:auto;padding-right:6px">
        ${renderReadingExercises(r.exercises)}
      </div>
    </div>
  `;
}

window.showVocabLookup = function(word) {
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
        <span style="font-size:12px;color:#64748b;margin-left:4px">(${data.pos})</span>
      </div>
      <button onclick="document.getElementById('vocab-lookup-card').style.display='none'" style="border:none;background:none;cursor:pointer;color:#94a3b8;font-size:16px">✖</button>
    </div>
    <div style="font-family:'Courier New',monospace;color:#d97706;font-size:13px;margin-bottom:8px">${data.ipa}</div>
    <div style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:10px">${data.meaning}</div>
    <button class="btn btn-sm btn-p" onclick="window.speakVocab('${word}')" style="width:100%">🔊 Phát âm chuẩn</button>
  `;
  modal.style.display = 'block';
};

window.speakVocab = function(word) {
  speakText(word, 0.9, 'en-US');
};

function renderReadingExercises(exercises) {
  return exercises.map((ex, idx) => `
    <div class="card" style="margin:0">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b">Câu ${idx + 1}: ${ex.question}</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${ex.options.map((opt, oIdx) => `
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
    fb.innerHTML = '🎉 <b>Chính xác!</b> ' + (currentReadLesson.exercises[exIdx].explain || '');
    fb.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Đọc hiểu đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`read-opt-${exIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + (currentReadLesson.exercises[exIdx].explain || '');
    fb.style.display = 'block';
    playWrongSound();
  }
};

// =========================================================================
// 3. SPEAKING MODULE CONTROLLER (MICROPHONE & PHONETICS)
// =========================================================================
let currentSpkLesson = LEARN_DATA.speaking[0];
let isRecording = false;
let speechRecognizer = null;

function initSpeaking() {
  renderSpeakingLessons();
  loadSpeakingLesson(currentSpkLesson.id);
}

function renderSpeakingLessons() {
  const container = document.getElementById('spk-lesson-list');
  if (!container) return;
  container.innerHTML = LEARN_DATA.speaking.map(item => `
    <div class="lesson-card ${item.id === currentSpkLesson.id ? 'active' : ''}" onclick="window.selectSpeakingLesson('${item.id}')">
      <span class="lesson-badge">${item.level}</span>
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">${item.title}</div>
      <div style="font-size:12px;color:#64748b">🎯 Chủ đề: ${item.topic}</div>
    </div>
  `).join('');
}

window.selectSpeakingLesson = function(id) {
  const found = LEARN_DATA.speaking.find(s => s.id === id);
  if (found) {
    currentSpkLesson = found;
    renderSpeakingLessons();
    loadSpeakingLesson(id);
  }
};

function loadSpeakingLesson(id) {
  const s = currentSpkLesson;
  const workspace = document.getElementById('spk-workspace');
  if (!workspace) return;

  if (s.phrases) {
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        ${s.phrases.map((p, idx) => `
          <div class="card" style="margin:0;border-left:4px solid #f43f5e">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:8px">
              <div>
                <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:4px">${p.text}</div>
                <div style="font-family:'Courier New',monospace;color:#e11d48;font-size:14px">${p.ipa}</div>
                <div style="font-size:13px;color:#475569;margin-top:4px">💡 <i>${p.meaning}</i></div>
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
              <div style="font-size:28px">${d.avatar}</div>
              <div style="max-width:80%;background:${d.isUser ? '#eff6ff' : '#f1f5f9'};padding:12px 16px;border-radius:12px;border:${d.isUser ? '1px solid #bfdbfe' : '1px solid #e2e8f0'}">
                <div style="font-weight:700;font-size:12px;color:${d.isUser ? '#1d4ed8' : '#475569'};margin-bottom:4px">${d.role}</div>
                <div style="font-size:14px;color:#1e293b;line-height:1.5">${d.isUser ? d.targetText : d.text}</div>
                ${d.meaning ? `<div style="font-size:12px;color:#64748b;margin-top:4px"><i>${d.meaning}</i></div>` : ''}
                ${d.isUser ? `
                  <div style="margin-top:8px;display:flex;gap:8px">
                    <button class="btn btn-sm" onclick="window.speakPronunciation('${d.targetText.replace(/'/g, "\\'")}')" style="background:#fff;font-size:11px">🔊 Nghe mẫu</button>
                    <button class="btn btn-sm btn-p" onclick="window.togglePronunciationRecording('dlg-${idx}', '${d.targetText.replace(/'/g, "\\'")}')" style="font-size:11px">🎙️ Đọc câu này</button>
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

window.speakPronunciation = function(text) {
  speakText(text, 0.9, 'en-US');
};

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
      btn.textContent = '🔴 Đang nghe bạn nói... (Bấm để dừng)';
      btn.classList.add('recording');
    }
  };

  speechRecognizer.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    // Tính điểm phát âm
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
// 4. WRITING MODULE CONTROLLER (SCRAMBLE & ERROR CORRECTION)
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
  if (!workspace) return;

  if (type === 'scramble') {
    const data = LEARN_DATA.writing.find(w => w.id === 'wrt_scramble');
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${data.items.map((item, idx) => {
          // Xáo trộn từ
          const shuffled = [...item.words].sort(() => Math.random() - 0.5);
          return `
            <div class="card" style="margin:0;border-left:4px solid #8b5cf6">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">Câu ${idx + 1}: Sắp xếp các từ thành câu hoàn chỉnh</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${item.hint}</div>
              
              <!-- KHUNG CHỨA CÂU ĐÃ GHÉP -->
              <div class="assembled-sentence-box" id="sc-assembled-${idx}">
                <span style="color:#94a3b8;font-size:13px" id="sc-placeholder-${idx}">(Bấm các từ bên dưới để đưa vào đây)</span>
              </div>

              <!-- KHUNG CHỨA CÁC TỪ RỜI RẠC -->
              <div class="scramble-word-chips" id="sc-pool-${idx}">
                ${shuffled.map((w, wIdx) => `
                  <button class="word-chip-btn" id="sc-btn-${idx}-${wIdx}" onclick="window.placeWordChip(${idx}, ${wIdx}, '${w.replace(/'/g, "\\'")}')">${w}</button>
                `).join('')}
              </div>

              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-p" onclick="window.checkScrambleSentence(${idx}, '${item.correctSentence.replace(/'/g, "\\'")}')">✅ Kiểm tra câu</button>
                <button class="btn btn-sm" onclick="window.resetScramble(${idx})">🔄 Xếp lại</button>
              </div>
              <div id="sc-fb-${idx}" class="fb" style="display:none"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (type === 'error_fix') {
    const data = LEARN_DATA.writing.find(w => w.id === 'wrt_error_fix');
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${data.items.map((item, idx) => `
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
            <button class="btn btn-p" style="margin-top:12px" onclick="window.checkErrorFix(${idx}, '${item.errorWord}', '${item.correctWord}', '${item.explain.replace(/'/g, "\\'")}')">Kiểm tra sửa lỗi</button>
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

  if (userErr === errorWord.toLowerCase() && (userFix === correctWord.toLowerCase() || userFix.includes(correctWord.toLowerCase()))) {
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
// 5. LANGUAGE FOCUS MODULE CONTROLLER (3D FLASHCARDS & IDIOM MATCHING)
// =========================================================================
let currentCardIdx = 0;
let matchSelectedLeft = null;
let matchSelectedRight = null;
let matchedCount = 0;

function initLanguageFocus() {
  loadLanguageFocusView();
}

function loadLanguageFocusView() {
  const workspace = document.getElementById('lang-workspace');
  if (!workspace) return;

  const fCards = LEARN_DATA.languageFocus.flashcards;
  const currentCard = fCards[currentCardIdx];

  workspace.innerHTML = `
    <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px">
      <button class="btn ${window._langTab === 'cards' || !window._langTab ? 'btn-p' : ''}" onclick="window.switchLangSubTab('cards')">🎴 Thẻ Từ Vựng 3D</button>
      <button class="btn ${window._langTab === 'match' ? 'btn-p' : ''}" onclick="window.switchLangSubTab('match')">🧩 Nối Thành Ngữ (Idioms)</button>
      <button class="btn ${window._langTab === 'quiz' ? 'btn-p' : ''}" onclick="window.switchLangSubTab('quiz')">⚡ Thử Thách Ngữ Pháp</button>
    </div>

    <div id="lang-subtab-container">
      ${renderFlashcardsView(currentCard, fCards.length)}
    </div>
  `;
}

window.switchLangSubTab = function(tab) {
  window._langTab = tab;
  const container = document.getElementById('lang-subtab-container');
  if (!container) return;

  if (tab === 'cards') {
    const fCards = LEARN_DATA.languageFocus.flashcards;
    container.innerHTML = renderFlashcardsView(fCards[currentCardIdx], fCards.length);
  } else if (tab === 'match') {
    container.innerHTML = renderMatchPuzzleView();
  } else if (tab === 'quiz') {
    container.innerHTML = renderGrammarQuizView();
  }
};

function renderFlashcardsView(card, total) {
  return `
    <div style="text-align:center;max-width:500px;margin:0 auto">
      <div style="font-size:13px;color:#64748b;margin-bottom:10px">Thẻ ${currentCardIdx + 1} / ${total} • Bấm vào thẻ để lật mặt xem nghĩa</div>
      
      <!-- 3D FLASHCARD -->
      <div class="flashcard-3d-scene" id="flashcard-scene" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-3d-inner">
          <!-- MẶT TRƯỚC -->
          <div class="flashcard-face">
            <div style="font-size:12px;color:#a16207;font-weight:700;margin-bottom:4px;text-transform:uppercase">${card.pos}</div>
            <div class="flashcard-word">${card.word}</div>
            <div class="flashcard-ipa">${card.ipa}</div>
            <button class="btn btn-sm btn-p" onclick="event.stopPropagation(); window.speakVocab('${card.word}')" style="background:#f59e0b;border-color:#f59e0b">🔊 Nghe phát âm</button>
          </div>
          <!-- MẶT SAU -->
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-meaning">${card.meaning}</div>
            <div class="flashcard-example">"${card.example}"</div>
            <div style="font-size:12px;color:#047857;margin-top:10px"><b>Đồng nghĩa:</b> ${card.synonyms}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
        <button class="btn" onclick="window.prevFlashcard()" ${currentCardIdx === 0 ? 'disabled' : ''}>← Từ trước</button>
        <button class="btn btn-p" onclick="window.nextFlashcard()" ${currentCardIdx === total - 1 ? 'disabled' : ''}>Từ tiếp theo →</button>
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
  const fCards = LEARN_DATA.languageFocus.flashcards;
  if (currentCardIdx < fCards.length - 1) {
    currentCardIdx++;
    addXP(5, 'Học từ vựng mới');
    window.switchLangSubTab('cards');
  }
};

function renderMatchPuzzleView() {
  const pairs = LEARN_DATA.languageFocus.matchPairs;
  const lefts = [...pairs].sort(() => Math.random() - 0.5);
  const rights = [...pairs].sort(() => Math.random() - 0.5);
  matchedCount = 0;
  matchSelectedLeft = null;
  matchSelectedRight = null;

  return `
    <div class="card" style="max-width:700px;margin:0 auto">
      <div style="font-weight:700;font-size:16px;margin-bottom:6px;color:#1e293b">🧩 Ghép cặp Thành ngữ Tiếng Anh (Idioms Match)</div>
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
        🎉 Chúc mừng! Bạn đã ghép chính xác toàn bộ các thành ngữ!
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

      if (matchedCount === LEARN_DATA.languageFocus.matchPairs.length) {
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
  const quiz = LEARN_DATA.languageFocus.grammarChallenge;
  return `
    <div style="display:flex;flex-direction:column;gap:16px;max-width:700px;margin:0 auto">
      ${quiz.map((q, idx) => `
        <div class="card" style="margin:0">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#1e293b">Câu ${idx + 1}: ${q.question}</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${q.options.map((opt, oIdx) => `
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
  if (!fb || !btn) return;

  const allBtns = document.querySelectorAll(`[id^="gq-opt-${qIdx}-"]`);
  allBtns.forEach(b => (b.disabled = true));

  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> ' + LEARN_DATA.languageFocus.grammarChallenge[qIdx].explain;
    fb.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Ngữ pháp đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`gq-opt-${qIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + LEARN_DATA.languageFocus.grammarChallenge[qIdx].explain;
    fb.style.display = 'block';
    playWrongSound();
  }
};

// =========================================================================
// MAIN APP INITIALIZATION
// =========================================================================
function switchSkillTab(skill) {
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

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  
  // Gắn sự kiện chuyển tab
  document.querySelectorAll('.skill-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSkillTab(btn.dataset.skill));
  });

  // Mặc định khởi tạo kỹ năng Listening
  switchSkillTab('listening');
});
