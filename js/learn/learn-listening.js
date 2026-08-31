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
  } else {
    const isAudioFile = Boolean(l.audioUrl);
    mediaHtml = `
      <div class="lis-audio-hero-card">
        ${isAudioFile ? `<audio id="current-lis-audio" src="${l.audioUrl}" preload="metadata"></audio>` : ''}
        <div class="lis-audio-left">
          <button type="button" class="lis-big-speaker-btn" id="btn-play-lis" onclick="window.playCurrentListeningAudio()" title="Bấm vào để Nghe Bài Học">
            <span id="lis-speaker-icon">🔊</span>
          </button>
          <div class="lis-audio-info">
            <div class="lis-audio-main-title" onclick="window.playCurrentListeningAudio()">
              <span id="lis-audio-status-text">BẤM VÀO LOA ĐỂ PHÁT ÂM THANH</span>
              <span class="lis-audio-play-tag" id="lis-audio-play-tag">▶ BẮT ĐẦU NGHE</span>
            </div>
            <div class="lis-audio-sub-meta">
              <span class="lis-engine-badge">
                ${isAudioFile ? '🎧 File âm thanh Studio chất lượng cao' : '🎙️ Giọng đọc tự nhiên chuẩn bản xứ (Web Speech AI Voice)'}
              </span>
              <span class="lis-duration-pill">⏱️ ${esc(l.duration || '50s')}</span>
            </div>
          </div>
        </div>

        <div class="lis-audio-controls">
          <div class="speed-selector-group">
            <span class="speed-label">⚡ Tốc độ:</span>
            <div class="speed-btn-group">
              <button type="button" class="speed-pill ${currentPlaybackSpeed === 0.75 ? 'active' : ''}" onclick="window.setListeningSpeed(0.75)">0.75x</button>
              <button type="button" class="speed-pill ${currentPlaybackSpeed === 1.0 ? 'active' : ''}" onclick="window.setListeningSpeed(1.0)">1.0x (Chuẩn)</button>
              <button type="button" class="speed-pill ${currentPlaybackSpeed === 1.25 ? 'active' : ''}" onclick="window.setListeningSpeed(1.25)">1.25x</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  workspace.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:22px">
      <div class="card" style="margin:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1.3">${esc(l.title)}</div>
            <div style="font-size:16px;color:#475569;margin-top:6px">🎯 Chủ đề: <b style="color:#1e293b">${esc(l.topic || currentUnit.topic || 'General')}</b></div>
          </div>
          <button class="btn btn-sm" id="btn-toggle-transcript" onclick="window.toggleLisTranscript()" style="font-size:15px;padding:8px 16px;font-weight:700">👁️ Hiện Transcript</button>
        </div>

        ${mediaHtml}

        <div id="lis-transcript-box" class="transcript-box" style="display:none;margin-top:18px">
          <div style="font-weight:800;font-size:18.5px;color:#0f172a;margin-bottom:10px">📝 Lời thoại bài nghe (Transcript):</div>
          <div style="font-size:19px;color:#1e293b;line-height:1.95;background:#f8fafc;padding:20px 24px;border-radius:14px;border:1px solid #e2e8f0;letter-spacing:0.15px;">${esc(l.transcript || l.audioText || l.text || 'Chưa có transcript.')}</div>
        </div>
      </div>

      <div style="font-weight:800;font-size:21px;color:#0f172a;margin-top:8px">📋 Bài tập luyện tập (Exercises):</div>
      <div id="lis-exercises-container" style="display:flex;flex-direction:column;gap:18px">
        ${renderListeningExercises(l.exercises)}
      </div>
    </div>
  `;
  typesetMath(workspace);
}

export function renderListeningExercises(exercises) {
  if (!exercises || !exercises.length) {
    return '<div class="empty" style="font-size:17.5px;padding:28px">Chưa có bài tập cho phần nghe này.</div>';
  }

  return exercises.map((ex, idx) => {
    if (!ex) return '';
    const exType = ex.type || 'mcq';

    if (exType === 'mcq') {
      const qText = ex.question || ex.title || `Câu hỏi ${idx + 1}`;
      const opts = Array.isArray(ex.options) ? ex.options : ['A', 'B', 'C', 'D'];
      const ansIdx = typeof ex.answer === 'number' ? ex.answer : 0;
      return `
        <div class="card" style="margin:0" id="lis-ex-card-${idx}">
          <div style="font-weight:800;font-size:18.5px;margin-bottom:16px;color:#0f172a;line-height:1.55">
            Câu ${idx + 1}: ${esc(qText)}
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${opts.map((opt, oIdx) => `
              <button class="opt" onclick="window.checkLisMCQ(${idx}, ${oIdx}, ${ansIdx})" id="lis-opt-${idx}-${oIdx}" style="font-size:17.5px;padding:14px 20px;border-radius:12px">
                <span class="okey" style="font-size:16px;width:36px;height:36px">${String.fromCharCode(65 + oIdx)}</span>
                <span style="font-size:17.5px;font-weight:600">${esc(opt || '')}</span>
              </button>
            `).join('')}
          </div>
          <div id="lis-fb-${idx}" class="fb" style="display:none;font-size:16.5px;margin-top:14px"></div>
          ${ex.explain ? `<div id="lis-exp-${idx}" class="video-tip-pill" style="display:none;margin-top:12px;font-size:15.5px"><span>💡</span> <span><b>Giải thích:</b> ${esc(ex.explain)}</span></div>` : ''}
        </div>
      `;
    }

    if (exType === 'dictation') {
      const rawSent = ex.targetSentence || ex.sentence || ex.text || ex.correct || ex.sampleAnswer || '';
      const safeSent = String(rawSent).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const promptText = ex.prompt || ex.question || ex.title || 'Nghe và chép chính tả (Dictation)';
      return `
        <div class="card" style="margin:0;border-left:5px solid #0284c7" id="lis-ex-card-${idx}">
          <div style="font-weight:800;font-size:18.5px;margin-bottom:8px;color:#0f172a">Câu ${idx + 1}: ${esc(promptText)}</div>
          <div style="font-size:16px;color:#475569;margin-bottom:14px;line-height:1.6">💡 Bấm nút nghe câu mẫu, sau đó gõ lại chính xác từng từ bạn nghe được:</div>
          <div style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-sm" id="btn-dict-play-${idx}" onclick="window.speakDictation('${safeSent}', ${idx})" style="background:#e0f2fe;color:#0369a1;border:1.5px solid #bae6fd;font-weight:700;font-size:15.5px;padding:9px 20px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
              <span id="dict-icon-${idx}" style="font-size:20px">🔊</span>
              <span id="dict-label-${idx}">Nghe câu này</span>
            </button>
            ${ex.hint ? `<span style="font-size:14.5px;color:#475569;background:#f1f5f9;padding:6px 14px;border-radius:8px;border:1px solid #e2e8f0">💡 Gợi ý: ${esc(ex.hint)}</span>` : ''}
          </div>
          <textarea id="dictation-input-${idx}" class="dictation-textarea" placeholder="Gõ lại câu bạn nghe được tại đây..." style="width:100%;min-height:95px;padding:14px 18px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:18px;line-height:1.7;box-sizing:border-box;resize:vertical;"></textarea>
          <div style="display:flex;gap:12px;margin-top:14px">
            <button type="button" class="btn btn-p" onclick="window.checkDictation(${idx}, '${safeSent}')" style="font-weight:700;font-size:16px;padding:11px 24px">✅ Kiểm tra kết quả</button>
          </div>
          <div id="dictation-fb-${idx}" class="fb" style="display:none;margin-top:14px;font-size:16.5px"></div>
        </div>
      `;
    }

    if (exType === 'short_answer' || exType === 'qa') {
      const qText = ex.question || ex.title || `Câu hỏi ${idx + 1}`;
      const sampleAns = ex.sampleAnswer || ex.answer || '';
      const safeKw = JSON.stringify(ex.keywords || []).replace(/"/g, '&quot;');
      const safeSampleAns = String(sampleAns).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        <div class="card" style="margin:0;border-left:5px solid #06b6d4" id="lis-ex-card-${idx}">
          <div style="font-weight:800;font-size:18.5px;margin-bottom:8px;color:#0f172a;line-height:1.55">Câu ${idx + 1}: ${esc(qText)}</div>
          ${ex.hint ? `<div style="font-size:15px;color:#475569;margin-bottom:12px">💡 <b>Gợi ý:</b> ${esc(ex.hint)}</div>` : ''}
          <input type="text" id="short-ans-inp-${idx}" placeholder="Nhập câu trả lời của bạn tại đây..." style="width:100%;padding:12px 16px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:17.5px;box-sizing:border-box;">
          <div style="display:flex;gap:12px;margin-top:14px">
            <button type="button" class="btn btn-p" onclick="window.checkLisShortAnswer(${idx}, '${safeSampleAns}', ${safeKw})" style="font-size:16px;padding:10px 22px">✅ Kiểm tra câu trả lời</button>
          </div>
          <div id="short-ans-fb-${idx}" class="fb" style="display:none;margin-top:14px;font-size:16.5px"></div>
        </div>
      `;
    }

    if (exType === 'gap_fill' || exType === 'fill_in_the_blank') {
      const rawSent = ex.sentence || ex.text || '';
      const answers = Array.isArray(ex.answers) ? ex.answers : [ex.correct || ex.answer || ''];
      const parts = rawSent.split(/\[___\]|___|\.{3,}/);
      return `
        <div class="card" style="margin:0;border-left:5px solid #8b5cf6" id="lis-ex-card-${idx}">
          <div style="font-weight:800;font-size:18.5px;margin-bottom:8px;color:#0f172a">Câu ${idx + 1}: Nghe & Điền từ còn thiếu</div>
          <div style="font-size:18px;color:#1e293b;line-height:2.5;margin-bottom:16px;">
            ${parts.map((p, pIdx) => {
              if (pIdx >= answers.length) return esc(p);
              const ans = answers[pIdx] || '';
              return `${esc(p)} <input type="text" id="gap-inp-${idx}-${pIdx}" data-correct="${esc(ans)}" placeholder="..." style="display:inline-block;width:160px;padding:6px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:17.5px;text-align:center;">`;
            }).join('')}
          </div>
          ${ex.optionsBank && ex.optionsBank.length ? `
            <div style="font-size:15px;color:#475569;margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="font-weight:700">Từ gợi ý:</span>
              ${ex.optionsBank.map(opt => `<span style="background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 12px;border-radius:8px;font-weight:700;font-size:15.5px;color:#1e293b">${esc(opt)}</span>`).join('')}
            </div>
          ` : ''}
          <button type="button" class="btn btn-sm btn-p" onclick="window.checkLisGapFill(${idx})" style="font-size:16px;padding:9px 20px">✅ Kiểm tra</button>
          <div id="gap-fb-${idx}" class="fb" style="display:none;margin-top:14px;font-size:16.5px"></div>
        </div>
      `;
    }

    if (exType === 'true_false' || exType === 'tf') {
      const isCorrectTrue = ex.answer === true || String(ex.answer).toLowerCase() === 'true' || ex.answer === 1;
      return `
        <div class="card" style="margin:0;border-left:5px solid #f59e0b" id="lis-ex-card-${idx}">
          <div style="font-weight:800;font-size:18.5px;margin-bottom:16px;color:#0f172a;line-height:1.55">
            Câu ${idx + 1} (True/False): ${esc(ex.statement || ex.question || '')}
          </div>
          <div style="display:flex;gap:14px;">
            <button class="btn" id="lis-tf-${idx}-true" onclick="window.checkLisTrueFalse(${idx}, true, ${isCorrectTrue})" style="padding:12px 30px;font-size:16.5px;font-weight:700;border:1.5px solid #cbd5e1;border-radius:12px">Đúng (TRUE)</button>
            <button class="btn" id="lis-tf-${idx}-false" onclick="window.checkLisTrueFalse(${idx}, false, ${isCorrectTrue})" style="padding:12px 30px;font-size:16.5px;font-weight:700;border:1.5px solid #cbd5e1;border-radius:12px">Sai (FALSE)</button>
          </div>
          <div id="lis-tf-fb-${idx}" class="fb" style="display:none;margin-top:14px;font-size:16.5px"></div>
          ${ex.explain ? `<div id="lis-tf-exp-${idx}" class="video-tip-pill" style="display:none;margin-top:12px;font-size:15.5px"><span>💡</span> <span><b>Giải thích:</b> ${esc(ex.explain)}</span></div>` : ''}
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
    document.querySelectorAll('.speed-pill').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(spd + 'x'));
    });
  };

  window.playCurrentListeningAudio = function() {
    if (!currentLisLesson) return;
    const audio = document.getElementById('current-lis-audio');
    const playBtn = document.getElementById('btn-play-lis');
    const iconSpan = document.getElementById('lis-speaker-icon');
    const statusText = document.getElementById('lis-audio-status-text');
    const playTag = document.getElementById('lis-audio-play-tag');

    // 1. If real audio element exists
    if (audio) {
      if (audio.paused) {
        audio.playbackRate = currentPlaybackSpeed;
        audio.play().then(() => {
          if (playBtn) playBtn.classList.add('is-playing');
          if (iconSpan) iconSpan.textContent = '⏸️';
          if (statusText) statusText.textContent = 'ĐANG PHÁT ÂM THANH... (BẤM ĐỂ TẠM DỪNG)';
          if (playTag) playTag.textContent = '⏸️ TẠM DỪNG';
        }).catch(err => console.warn('Audio play error:', err));

        audio.onended = function() {
          if (playBtn) playBtn.classList.remove('is-playing');
          if (iconSpan) iconSpan.textContent = '🔊';
          if (statusText) statusText.textContent = 'BẤM VÀO LOA ĐỂ PHÁT ÂM THANH';
          if (playTag) playTag.textContent = '▶ BẮT ĐẦU NGHE';
        };
      } else {
        audio.pause();
        if (playBtn) playBtn.classList.remove('is-playing');
        if (iconSpan) iconSpan.textContent = '🔊';
        if (statusText) statusText.textContent = 'BẤM VÀO LOA ĐỂ PHÁT ÂM THANH';
        if (playTag) playTag.textContent = '▶ BẮT ĐẦU NGHE';
      }
      return;
    }

    // 2. Web Speech AI Voice
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (playBtn) playBtn.classList.remove('is-playing');
      if (iconSpan) iconSpan.textContent = '🔊';
      if (statusText) statusText.textContent = 'BẤM VÀO LOA ĐỂ PHÁT ÂM THANH';
      if (playTag) playTag.textContent = '▶ BẮT ĐẦU NGHE';
      return;
    }

    const textToSpeak = currentLisLesson.audioText || currentLisLesson.transcript || currentLisLesson.text || currentLisLesson.content || '';
    if (!textToSpeak) {
      alert('Bài nghe chưa có nội dung văn bản để phát âm.');
      return;
    }

    if (playBtn) playBtn.classList.add('is-playing');
    if (iconSpan) iconSpan.textContent = '🔊';
    if (statusText) statusText.textContent = 'ĐANG PHÁT ÂM BÀI HỌC (BẤM ĐỂ DỪNG)...';
    if (playTag) playTag.textContent = '⏹️ DỪNG PHÁT';

    speakText(textToSpeak, {
      rate: currentPlaybackSpeed,
      lang: 'en-US',
      onEnd: () => {
        if (playBtn) playBtn.classList.remove('is-playing');
        if (iconSpan) iconSpan.textContent = '🔊';
        if (statusText) statusText.textContent = 'BẤM VÀO LOA ĐỂ PHÁT ÂM THANH';
        if (playTag) playTag.textContent = '▶ BẮT ĐẦU NGHE';
      }
    });
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

  window.speakDictation = function(sentence, idx) {
    const text = sentence || (currentLisLesson ? (currentLisLesson.audioText || currentLisLesson.transcript) : '');
    if (!text) {
      alert('Không tìm thấy câu để phát âm.');
      return;
    }
    const btn = idx !== undefined ? document.getElementById(`btn-dict-play-${idx}`) : null;
    const label = idx !== undefined ? document.getElementById(`dict-label-${idx}`) : null;
    if (btn) {
      btn.style.background = '#dcfce7';
      btn.style.color = '#15803d';
    }
    if (label) label.textContent = 'Đang đọc...';

    speakText(text, {
      rate: currentPlaybackSpeed || 0.9,
      lang: 'en-US',
      onEnd: () => {
        if (btn) {
          btn.style.background = '#e0f2fe';
          btn.style.color = '#0369a1';
        }
        if (label) label.textContent = 'Nghe câu này';
      }
    });
  };
}
