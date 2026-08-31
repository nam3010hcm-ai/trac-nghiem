/**
 * MODULE LEARN LISTENING (js/learn/learn-listening.js)
 * Quản lý bài học nghe (Audio/Video/TTS) & giao diện bài tập nghe hiểu
 */
import { esc, typesetMath } from '../common.js';
import { currentUnit, getUnitSkillList, speakText, playSuccessSound, playWrongSound, addXP } from './learn-common.js';
import { checkLisMCQ, checkLisGapFill, checkLisTrueFalse, checkDictation } from './learn-listening-eval.js';

export let currentLisLesson = null;
export let currentPlaybackSpeed = 1.0;

export function initListening() {
  const list = getUnitSkillList(currentUnit, 'listening');
  currentLisLesson = list[0] || null;
  renderListeningLessons();
  if (currentLisLesson) loadListeningLesson(currentLisLesson.id);
  else {
    const ws = document.getElementById('lis-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài nghe trong Unit này.</div>';
  }
}

export function renderListeningLessons() {
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
          <span class="lesson-badge">${item.type === 'video' ? '🎬 Video' : '🎧 Audio'} • ${item.level || currentUnit.level || 'B1'}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">${item.title}</div>
        <div class="lesson-meta">⏱️ Thời lượng: ${item.duration || '2-3 mins'}</div>
      </div>
    `;
  }).join('');
}

export function selectListeningLesson(id) {
  const list = getUnitSkillList(currentUnit, 'listening');
  const found = list.find(l => l.id === id);
  if (found) {
    currentLisLesson = found;
    renderListeningLessons();
    loadListeningLesson(id);
  }
}

export function loadListeningLesson(id) {
  const l = currentLisLesson;
  const workspace = document.getElementById('lis-workspace');
  if (!workspace || !l) return;

  const isVideo = l.type === 'video' || !!l.videoUrl;
  let mediaHtml = '';

  if (isVideo) {
    mediaHtml = `
      <div class="video-container">
        <video id="current-lis-video" controls playsinline preload="metadata">
          <source src="${l.videoUrl || l.audioUrl}" type="video/mp4">
          Trình duyệt của bạn không hỗ trợ phát Video.
        </video>
      </div>
    `;
  } else if (l.audioUrl) {
    mediaHtml = `
      <div class="audio-player-custom">
        <audio id="current-lis-audio" src="${l.audioUrl}" preload="metadata"></audio>
        <button class="play-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()">▶</button>
        <div class="speed-selector">
          <span style="font-size:12px;color:#64748b;font-weight:600">Tốc độ:</span>
          <button class="speed-btn ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x</button>
          <button class="speed-btn ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
        </div>
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="audio-player-custom">
        <button class="play-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()">🔊</button>
        <span style="font-size:13.5px;color:#334155;font-weight:600">Phát âm tự nhiên (Web Speech AI Voice)</span>
      </div>
    `;
  }

  workspace.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <div class="card" style="margin:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:18px;font-weight:800;color:#1e293b">${l.title}</div>
            <div style="font-size:13px;color:#64748b">🎯 Chủ đề: ${l.topic || currentUnit.topic || 'General'}</div>
          </div>
          <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()">👁️ Hiện Transcript</button>
        </div>

        ${mediaHtml}

        <div id="lis-transcript-box" class="transcript-box" style="display:none;margin-top:14px">
          <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:6px">📝 Lời thoại bài nghe (Transcript):</div>
          <div style="font-size:14px;color:#334155;line-height:1.7">${l.transcript || l.audioText || 'Chưa có transcript.'}</div>
        </div>
      </div>

      <div style="font-weight:800;font-size:16px;color:#0f172a;margin-top:4px">📋 Bài tập luyện tập (Exercises):</div>
      <div id="lis-exercises-container" style="display:flex;flex-direction:column;gap:14px">
        ${renderListeningExercises(l.exercises)}
      </div>
    </div>
  `;
  typesetMath(workspace);
}

export function renderListeningExercises(exercises) {
  if (!exercises || !exercises.length) {
    return '<div class="empty">Chưa có bài tập cho phần nghe này.</div>';
  }

  return exercises.map((ex, idx) => {
    if (ex.type === 'mcq') {
      return `
        <div class="card" style="margin:0" id="lis-ex-card-${idx}">
          <div style="font-weight:700;font-size:14.5px;margin-bottom:10px;color:#1e293b">
            Câu ${idx + 1}: ${esc(ex.question)}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(ex.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkLisMCQ(${idx}, ${oIdx}, ${ex.answer})" id="lis-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${esc(opt)}</span>
              </button>
            `).join('')}
          </div>
          <div id="lis-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `;
    }

    if (ex.type === 'dictation') {
      return `
        <div class="card" style="margin:0;border-left:4px solid #0284c7" id="lis-ex-card-${idx}">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#1e293b">Câu ${idx + 1}: Nghe và chép chính tả (Dictation)</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px">💡 Bấm nút nghe câu mẫu, sau đó gõ lại chính xác từng từ bạn nghe được:</div>
          <div style="margin-bottom:12px;display:flex;gap:10px">
            <button class="btn btn-sm" onclick="window.speakDictation('${ex.sentence.replace(/'/g, "\\'")}')" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd">🔊 Nghe câu này</button>
          </div>
          <textarea id="dictation-input-${idx}" class="dictation-textarea" placeholder="Gõ lại câu bạn nghe được tại đây..."></textarea>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="btn btn-p" onclick="window.checkDictation(${idx}, '${ex.sentence.replace(/'/g, "\\'")}')">✅ Kiểm tra kết quả</button>
          </div>
          <div id="dictation-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `;
    }

    return '';
  }).join('');
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.selectListeningLesson = selectListeningLesson;
  window.setListeningSpeed = function(spd) {
    currentPlaybackSpeed = spd;
    const audio = document.getElementById('current-lis-audio');
    if (audio) audio.playbackRate = spd;
  };
  window.playCurrentListeningAudio = function() {
    if (!currentLisLesson) return;
    const audio = document.getElementById('current-lis-audio');
    if (audio) {
      if (audio.paused) audio.play();
      else audio.pause();
      return;
    }
    speakText(currentLisLesson.audioText || currentLisLesson.transcript, { rate: currentPlaybackSpeed, lang: 'en-US' });
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
  window.speakDictation = function(sentence) {
    speakText(sentence, { rate: currentPlaybackSpeed, lang: 'en-US' });
  };
}
