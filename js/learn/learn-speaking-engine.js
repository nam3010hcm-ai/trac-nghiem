/**
 * MODULE LEARN SPEAKING ENGINE (js/learn/learn-speaking-engine.js)
 * Luyện phát âm câu đơn lẻ (Single Phrases), nhận diện giọng nói Web Speech API & chấm điểm phát âm
 */
import { esc, typesetMath } from '../common.js';
import { currentUnit, getUnitSkillList, speakText, playSuccessSound, playWrongSound, addXP } from './learn-common.js';
import { renderRoleSelectionView, renderActiveRoleplayView } from './learn-speaking-roleplay.js';

export let currentSpkLesson = null;
export let isRecording = false;
export let speechRecognizer = null;

export function initSpeaking() {
  const list = getUnitSkillList(currentUnit, 'speaking');
  currentSpkLesson = list[0] || null;
  renderSpeakingLessons();
  if (currentSpkLesson) loadSpeakingLesson(currentSpkLesson.id);
  else {
    const ws = document.getElementById('spk-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài nói trong Unit này.</div>';
  }
}

export function renderSpeakingLessons() {
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

export function selectSpeakingLesson(id) {
  const list = getUnitSkillList(currentUnit, 'speaking');
  const found = list.find(s => s.id === id);
  if (found) {
    currentSpkLesson = found;
    renderSpeakingLessons();
    loadSpeakingLesson(id);
  }
}

export function loadSpeakingLesson(id) {
  const s = currentSpkLesson;
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !s) return;

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (speechRecognizer) {
    try { speechRecognizer.stop(); } catch(e){}
  }

  if (s.type === 'video_roleplay' || (s.characterA && s.characterB) || (s.dialogue && s.dialogue.some(d => d.speaker === 'A' || d.speaker === 'B'))) {
    renderRoleSelectionView(s);
    return;
  }

  if (s.phrases && s.phrases.length) {
    workspace.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
        ${s.phrases.map((p, idx) => {
          const safeText = String(p.text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
          return `
          <div class="card" style="margin:0;border-left:5px solid #f43f5e">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:10px">
              <div>
                <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:6px">${esc(p.text || '')}</div>
                <div style="font-family:'Courier New',monospace;color:#e11d48;font-size:16px;font-weight:700">${esc(p.ipa || '')}</div>
                <div style="font-size:15px;color:#334155;margin-top:6px">💡 <i>${esc(p.meaning || '')}</i></div>
                ${p.tip ? `<div class="video-tip-pill" style="margin-top:10px;font-size:14.5px"><span>🎯</span> <span><b>Mẹo phát âm:</b> ${esc(p.tip)}</span></div>` : ''}
              </div>
              <button class="btn btn-sm" onclick="window.speakPronunciation('${safeText}')" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;white-space:nowrap;font-size:14.5px;padding:7px 16px;font-weight:700">🔊 Nghe mẫu</button>
            </div>
            
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;margin-top:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <button class="btn btn-p" id="btn-spk-rec-${idx}" onclick="window.togglePronunciationRecording(${idx}, '${safeText}')" style="background:#e11d48;border-color:#e11d48;font-size:15.5px;padding:10px 22px">
                🎙️ Bấm để nói
              </button>
              <div id="spk-score-${idx}" style="font-weight:800;font-size:17.5px;color:#475569">Điểm: --</div>
            </div>
            <div id="spk-result-${idx}" style="margin-top:12px;font-size:15px;display:none" class="spoken-transcript-result"></div>
          </div>
        `;
        }).join('')}
      </div>
    `;
    typesetMath(workspace);
    return;
  }
}

export function speakPronunciation(text) {
  speakText(text, { rate: 0.9, lang: 'en-US' });
}

export function togglePronunciationRecording(idx, targetSentence) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng sử dụng Google Chrome hoặc Edge!");
    return;
  }

  const btn = document.getElementById(`btn-spk-rec-${idx}`);
  const scoreEl = document.getElementById(`spk-score-${idx}`);
  const resultEl = document.getElementById(`spk-result-${idx}`);

  if (isRecording) {
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch(e){}
    }
    isRecording = false;
    if (btn) {
      btn.innerHTML = '🎙️ Bấm để nói';
      btn.style.background = '#e11d48';
    }
    return;
  }

  try {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.lang = 'en-US';
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;

    speechRecognizer.onstart = () => {
      isRecording = true;
      if (btn) {
        btn.innerHTML = '⏹️ Đang nghe... (Bấm để dừng)';
        btn.style.background = '#059669';
      }
      if (scoreEl) scoreEl.textContent = 'Đang phân tích âm thanh...';
    };

    speechRecognizer.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      const cleanSpoken = spokenText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      const cleanTarget = targetSentence.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();

      const targetWords = cleanTarget.split(/\s+/);
      const spokenWords = cleanSpoken.split(/\s+/);

      let matchedWords = 0;
      targetWords.forEach(w => {
        if (spokenWords.includes(w)) matchedWords++;
      });

      const score = Math.round((matchedWords / targetWords.length) * 100);

      if (scoreEl) {
        scoreEl.innerHTML = `<span style="color:${score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}">Điểm: ${score}/100</span>`;
      }

      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
          <div style="font-size:12px;color:#64748b;margin-bottom:4px">🎯 Bạn vừa nói:</div>
          <div style="font-weight:700;color:#0f172a">"${esc(spokenText)}"</div>
        `;
      }

      if (score >= 70) {
        playSuccessSound();
        addXP(20, 'Luyện phát âm chuẩn');
      } else {
        playWrongSound();
      }
    };

    speechRecognizer.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (scoreEl) scoreEl.textContent = 'Lỗi thu âm: ' + event.error;
    };

    speechRecognizer.onend = () => {
      isRecording = false;
      if (btn) {
        btn.innerHTML = '🎙️ Bấm để nói lại';
        btn.style.background = '#e11d48';
      }
    };

    speechRecognizer.start();
  } catch (err) {
    console.error("Lỗi khởi chạy Speech Recognition:", err);
    alert("Không thể khởi chạy micro thu âm: " + (err.message || ''));
  }
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.selectSpeakingLesson = selectSpeakingLesson;
  window.speakPronunciation = speakPronunciation;
  window.togglePronunciationRecording = togglePronunciationRecording;
}
