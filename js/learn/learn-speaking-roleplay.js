/**
 * MODULE LEARN SPEAKING ROLEPLAY (js/learn/learn-speaking-roleplay.js)
 * Studio mô phỏng hội thoại Video tương tác 2 nhân vật (Roleplay Studio) & nhận diện giọng nói
 */
import { esc, typesetMath } from '../common.js';
import { speakText, playSuccessSound, playWrongSound, addXP, triggerConfetti } from './learn-common.js';

export let currentRpLesson = null;
export let currentRpRole = null;
export let currentRpTurnIdx = 0;
export let rpScores = {};
export let isRpRecording = false;
export let rpSpeechRecognizer = null;
export let rpPlaybackSpeed = 1.0;

export function setCurrentRpLesson(l) { currentRpLesson = l; }

export function getLessonCharacters(lesson) {
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
  if (!chars.length) {
    chars.push({ code: 'A', id: 'A', name: 'Nhân vật A', avatar: '👩‍💼', roleTitle: 'Speaker A', color: '#2563eb' });
    chars.push({ code: 'B', id: 'B', name: 'Nhân vật B', avatar: '🧑‍💼', roleTitle: 'Speaker B', color: '#059669' });
  }
  return chars;
}

export function getCharacterByCode(lesson, code) {
  const chars = getLessonCharacters(lesson);
  return chars.find(c => c.code === code || c.id === code) || chars[0] || { code, name: `Nhân vật ${code}`, avatar: '👤', color: '#2563eb' };
}

export function renderRoleSelectionView(lesson) {
  currentRpLesson = lesson;
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

      <div class="role-select-screen" style="text-align:center; padding:24px 16px;">
        <div style="font-size:36px;margin-bottom:8px">🎭</div>
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px">Chọn Nhân Vật Bạn Muốn Đóng Vai</h2>
        <p style="font-size:14px;color:#64748b;max-width:620px;margin:0 auto 20px auto">
          ${lesson.description || 'Bạn sẽ trực tiếp đóng vai nhân vật đã chọn. Hệ thống tự động phát video của đối tác và chuyển lượt để bạn luyện nói!'}
        </p>

        <div class="role-select-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;max-width:960px;margin:0 auto">
          ${chars.map(c => {
            const charTurns = (lesson.dialogue || []).filter(d => d.speaker === c.code).length;
            return `
              <div class="role-card" onclick="window.startRoleplayAsRole('${c.code}')" style="border-top:4px solid ${c.color};position:relative;background:#ffffff;border-radius:14px;padding:20px 16px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,0.06);cursor:pointer;">
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

export function startRoleplayAsRole(role) {
  currentRpRole = role;
  currentRpTurnIdx = 0;
  rpScores = {};
  renderActiveRoleplayView();
  playCurrentRpTurn();
}

export function renderActiveRoleplayView() {
  const workspace = document.getElementById('spk-workspace');
  if (!workspace || !currentRpLesson) return;

  const lesson = currentRpLesson;
  const dialogue = lesson.dialogue || [];
  const currentLine = dialogue[currentRpTurnIdx] || dialogue[0];
  const isUserTurn = currentRpRole === 'ALL' || (currentLine && currentLine.speaker === currentRpRole);
  const activeChar = getCharacterByCode(lesson, currentLine?.speaker);
  const myChar = currentRpRole === 'ALL' ? { name: 'Toàn bộ các vai', avatar: '👥', color: '#6366f1' } : getCharacterByCode(lesson, currentRpRole);

  workspace.innerHTML = `
    <div class="video-rp-container">
      <div class="video-rp-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="video-rp-badge">🎬 Video Studio</span>
          <span style="font-weight:800;font-size:15px;color:#0f172a">${lesson.title}</span>
          <div style="background:${myChar.color}15;color:${myChar.color};border:1.5px solid ${myChar.color}40;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:6px">
            <span>${myChar.avatar || '👤'}</span>
            <span>Bạn đang đóng: <b>${myChar.name}</b></span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.openRoleSelectionScreen()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:12px">
            ⚙️ Chọn lại vai
          </button>
          <span class="cat-badge" style="background:#eff6ff;color:#1e40af;margin:0;font-weight:800">
            Lượt ${currentRpTurnIdx + 1}/${dialogue.length}
          </span>
        </div>
      </div>

      <div class="video-rp-stage" style="display:grid;grid-template-columns:1.3fr 1fr;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="video-player-frame" id="rp-video-container" style="background:#0f172a;border-radius:12px;padding:16px;text-align:center;min-height:220px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
            <div id="rp-avatar-stage">
              <div style="font-size:64px;margin-bottom:8px">${activeChar.avatar || '👤'}</div>
              <div style="font-size:18px;font-weight:800;color:#ffffff;margin-bottom:4px">${currentLine?.speakerName || activeChar.name}</div>
              <div style="font-size:12.5px;color:#94a3b8;">${isUserTurn ? '🎙️ Đến lượt bạn nói!' : '🔊 Đang nghe đối tác nói...'}</div>
            </div>
          </div>

          <div class="video-subtitle-overlay" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:12px;font-weight:800;color:${activeChar.color || '#2563eb'};">
                ${activeChar.avatar || '👤'} ${currentLine?.speakerName || activeChar.name} ${isUserTurn ? '(LƯỢT CỦA BẠN)' : '(ĐỐI TÁC)'}
              </div>
              <button class="btn btn-sm" onclick="window.speakCurrentLineTTS()" style="background:#ffffff;border:1px solid #cbd5e1;font-size:11.5px;">🔊 Nghe mẫu</button>
            </div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:6px;">${currentLine?.text || ''}</div>
            ${currentLine?.ipa ? `<div style="font-family:'Courier New',monospace;color:#db2777;font-size:13px;margin-bottom:4px;">${currentLine.ipa}</div>` : ''}
            ${currentLine?.meaning ? `<div style="font-size:13px;color:#475569;">💡 <b>Nghĩa:</b> ${currentLine.meaning}</div>` : ''}
          </div>

          <div class="user-speak-box" style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;text-align:center;">
            ${isUserTurn ? `
              <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                <div style="font-size:14px;font-weight:800;color:#1e40af">🎙️ Hãy đọc to câu trên bằng tiếng Anh:</div>
                <button type="button" class="btn btn-p" id="rp-mic-btn" onclick="window.toggleRoleplayRecording()" style="padding:10px 24px;font-size:14px;font-weight:700;">
                  🎙️ Bấm để nói
                </button>
                <div id="rp-mic-status-label" style="font-size:13px;color:#64748b;">Bấm vào nút để bắt đầu thu âm</div>
                <div id="rp-diff-box" style="display:none;width:100%;margin-top:6px;padding:10px;background:#f8fafc;border-radius:8px;"></div>
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-top:10px;">
                  <div id="rp-turn-score-val" style="font-weight:800;font-size:15px;">Điểm: --</div>
                  <button class="btn btn-sm btn-p" onclick="window.advanceRoleplayTurnManual()">Tiếp tục ❯</button>
                </div>
              </div>
            ` : `
              <div>
                <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:10px;">Đang lắng nghe đối tác...</div>
                <button class="btn btn-sm btn-p" onclick="window.advanceRoleplayTurnManual()">Sang lượt bạn ❯</button>
              </div>
            `}
          </div>
        </div>

        <div class="card" style="margin:0;padding:16px;background:#f8fafc;border:1.5px solid #cbd5e1;">
          <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:10px;">📋 Kịch bản hội thoại:</div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:450px;overflow-y:auto;">
            ${dialogue.map((d, idx) => {
              const isCurrent = idx === currentRpTurnIdx;
              const spkChar = getCharacterByCode(lesson, d.speaker);
              return `
                <div onclick="window.jumpToRoleplayTurn(${idx})" style="padding:8px 10px;border-radius:8px;background:${isCurrent ? '#eff6ff' : '#ffffff'};border:1px solid ${isCurrent ? '#93c5fd' : '#e2e8f0'};cursor:pointer;">
                  <div style="font-size:11.5px;font-weight:800;color:${spkChar.color};">${spkChar.avatar} ${d.speakerName || spkChar.name}</div>
                  <div style="font-size:12.5px;color:#1e293b;">${d.text}</div>
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

export function playCurrentRpTurn() {
  if (!currentRpLesson) return;
  const dialogue = currentRpLesson.dialogue || [];
  const currentLine = dialogue[currentRpTurnIdx];
  if (!currentLine) return;

  const isUserTurn = currentRpRole === 'ALL' || (currentLine.speaker === currentRpRole);
  renderActiveRoleplayView();

  if (!isUserTurn) {
    speakLineWithTTS(currentLine.text, () => {
      setTimeout(() => { window.advanceRoleplayTurnManual(); }, 700);
    });
  }
}

export function speakLineWithTTS(text, onEndCallback = null) {
  if (!currentRpLesson) {
    speakText(text, { onEnd: onEndCallback });
    return;
  }
  const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
  const spkChar = getCharacterByCode(currentRpLesson, currentLine?.speaker);
  const gender = (spkChar.name || '').toLowerCase().includes('emma') ? 'female' : 'male';

  speakText(text, {
    gender,
    rate: rpPlaybackSpeed * 0.92,
    onEnd: onEndCallback
  });
}

export function showRoleplayCompletionSummary() {
  playSuccessSound();
  triggerConfetti();
  addXP(50, 'Hoàn thành bài hội thoại Roleplay');
  alert("🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ kịch bản hội thoại Roleplay!");
  renderRoleSelectionView(currentRpLesson);
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.startRoleplayAsRole = startRoleplayAsRole;
  window.openRoleSelectionScreen = function() {
    currentRpRole = null;
    if (currentRpLesson) renderRoleSelectionView(currentRpLesson);
  };
  window.speakCurrentLineTTS = function() {
    if (!currentRpLesson) return;
    const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
    if (currentLine) speakLineWithTTS(currentLine.text);
  };
  window.jumpToRoleplayTurn = function(idx) {
    if (!currentRpLesson) return;
    currentRpTurnIdx = idx;
    playCurrentRpTurn();
  };
  window.advanceRoleplayTurnManual = function() {
    if (!currentRpLesson) return;
    const dialogue = currentRpLesson.dialogue || [];
    if (currentRpTurnIdx + 1 >= dialogue.length) {
      showRoleplayCompletionSummary();
    } else {
      currentRpTurnIdx++;
      playCurrentRpTurn();
    }
  };
  window.toggleRoleplayRecording = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt chưa hỗ trợ Web Speech API!");
      return;
    }
    const currentLine = currentRpLesson.dialogue?.[currentRpTurnIdx];
    if (!currentLine) return;

    const btn = document.getElementById('rp-mic-btn');
    const statusLabel = document.getElementById('rp-mic-status-label');
    const scoreVal = document.getElementById('rp-turn-score-val');

    if (isRpRecording) {
      if (rpSpeechRecognizer) try { rpSpeechRecognizer.stop(); } catch(e){}
      isRpRecording = false;
      if (btn) btn.innerHTML = '🎙️ Bấm để nói';
      return;
    }

    try {
      rpSpeechRecognizer = new SpeechRecognition();
      rpSpeechRecognizer.lang = 'en-US';
      rpSpeechRecognizer.onstart = () => {
        isRpRecording = true;
        if (btn) btn.innerHTML = '⏹️ Đang nghe...';
        if (statusLabel) statusLabel.textContent = 'Đang nhận diện giọng nói...';
      };
      rpSpeechRecognizer.onresult = (e) => {
        const spoken = e.results[0][0].transcript;
        const cleanSpk = spoken.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
        const cleanTgt = currentLine.text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
        const tgtWords = cleanTgt.split(/\s+/);
        const spkWords = cleanSpk.split(/\s+/);
        let match = 0;
        tgtWords.forEach(w => { if (spkWords.includes(w)) match++; });
        const score = Math.round((match / tgtWords.length) * 100);

        if (scoreVal) scoreVal.innerHTML = `<span style="color:${score >= 75 ? '#16a34a' : '#dc2626'}">Điểm: ${score}/100</span>`;
        if (statusLabel) statusLabel.innerHTML = `Bạn vừa nói: <i>"${esc(spoken)}"</i>`;
        if (score >= 70) {
          playSuccessSound();
          addXP(20, 'Nói câu hội thoại chuẩn');
        } else {
          playWrongSound();
        }
      };
      rpSpeechRecognizer.onend = () => {
        isRpRecording = false;
        if (btn) btn.innerHTML = '🎙️ Đọc lại';
      };
      rpSpeechRecognizer.start();
    } catch(err) {
      console.error(err);
    }
  };
}
