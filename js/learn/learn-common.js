/**
 * MODULE LEARN COMMON (js/learn/learn-common.js)
 * State quản lý học tập 5 kỹ năng, gamification XP, âm thanh, Web Speech TTS & helper functions
 */
import { SAMPLE_LEARN_UNITS } from '../learn-data.js';

export const STORE_KEY = 'educore_learn_profile_v2';
export const DEFAULT_UNITS = SAMPLE_LEARN_UNITS;

export let allUnits = [...DEFAULT_UNITS];
export let currentUnit = DEFAULT_UNITS[0];
export let currentSkillTab = 'listening';
export let currentSubject = 'Tiếng Anh Lớp 10';
export let currentModule = 'Term 1';

export let userProfile = {
  xp: 120,
  level: 2,
  streak: 3,
  badges: ['first_step', 'listen_pro'],
  completedLessons: [],
  lastActiveDate: new Date().toDateString()
};

export function setAllUnits(u) { allUnits = u; }
export function setCurrentUnit(u) { currentUnit = u; }
export function setCurrentSkillTab(s) { currentSkillTab = s; }
export function setCurrentSubject(s) { currentSubject = s; }
export function setCurrentModule(m) { currentModule = m; }

export function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

export function playLevelUpSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch (e) {}
}

export function getBestNaturalVoice(lang = 'en-US', gender = 'neutral') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const enVoices = voices.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB')));
  if (!enVoices.length) return voices[0];
  return enVoices[0];
}

export function speakText(text, options = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  if (!text) return;
  const clean = String(text).replace(/<\/?[^>]+(>|$)/g, "").trim();
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = options.lang || 'en-US';
  utterance.rate = options.rate || 0.95;
  utterance.pitch = options.pitch || 1.0;
  if (options.onEnd) utterance.onend = options.onEnd;
  const voice = getBestNaturalVoice(utterance.lang, options.gender);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function triggerConfetti() {
  if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
    window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  }
}

export function saveProfile() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(userProfile)); } catch (e) {}
}

export function renderProfileStats() {
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

export function addXP(amount, reason = '') {
  userProfile.xp += amount;
  const oldLevel = userProfile.level;
  userProfile.level = Math.floor(userProfile.xp / 100) + 1;
  saveProfile();
  renderProfileStats();

  if (userProfile.level > oldLevel) {
    playLevelUpSound();
    triggerConfetti();
  }
}

export function safeArray(val, fallback = []) {
  let res = val;
  if (typeof val === 'string') {
    try { res = JSON.parse(val); } catch (e) { res = null; }
  }
  if (Array.isArray(res) && res.length > 0) return res;
  return fallback;
}

export function safeObj(val, fallback = {}) {
  let res = val;
  if (typeof val === 'string') {
    try { res = JSON.parse(val); } catch (e) { res = null; }
  }
  if (res && typeof res === 'object' && !Array.isArray(res) && Object.keys(res).length > 0) return res;
  return fallback;
}

export function getUnitSkillList(unit, skillName) {
  let list = safeArray(unit?.[skillName], []);
  const defMatch = DEFAULT_UNITS.find(d => d.id === unit?.id) || (unit?.subject?.includes('Tiếng Anh') ? DEFAULT_UNITS[0] : null);

  if (!list.length) {
    list = safeArray(defMatch?.[skillName], []);
  } else if (skillName === 'speaking' && defMatch?.speaking) {
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

export function getUnitSkillObj(unit, skillName) {
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

if (typeof window !== 'undefined') {
  window.playSuccessSound = playSuccessSound;
  window.playWrongSound = playWrongSound;
}
