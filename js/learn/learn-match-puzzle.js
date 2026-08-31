/**
 * MODULE LEARN MATCHING PUZZLE (js/learn/learn-match-puzzle.js)
 * Trò chơi nối từ vựng & định nghĩa với Canvas SVG đường cong Bezier và chấm điểm
 */
import { esc } from '../common.js';
import { currentUnit, getUnitSkillObj, safeArray, playSuccessSound, playWrongSound, addXP, triggerConfetti } from './learn-common.js';

export const MATCH_COLORS = [
  { id: 'indigo', hex: '#6366f1', bg: '#eef2ff', border: '#6366f1', text: '#4338ca' },
  { id: 'emerald', hex: '#10b981', bg: '#ecfdf5', border: '#10b981', text: '#047857' },
  { id: 'amber', hex: '#f59e0b', bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
  { id: 'rose', hex: '#f43f5e', bg: '#fff1f2', border: '#f43f5e', text: '#be123c' },
  { id: 'cyan', hex: '#06b6d4', bg: '#ecfeff', border: '#06b6d4', text: '#0e7490' },
  { id: 'purple', hex: '#8b5cf6', bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' },
  { id: 'blue', hex: '#3b82f6', bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  { id: 'orange', hex: '#ea580c', bg: '#fff7ed', border: '#ea580c', text: '#c2410c' }
];

export let matchPuzzleState = {
  pairs: [],
  lefts: [],
  rights: [],
  connections: {},
  selectedLeft: null,
  selectedRight: null,
  submitted: false,
  result: null
};

export function renderMatchPuzzleView() {
  const langObj = getUnitSkillObj(currentUnit, 'languageFocus') || currentUnit?.languageFocus || currentUnit?.language_focus || {};
  const rawPairs = safeArray(langObj?.matchPairs, []);
  
  const pairs = rawPairs.map((p, idx) => ({
    pairId: p.pairId !== undefined ? String(p.pairId) : String(idx + 1),
    left: p.left || '',
    right: p.right || ''
  })).filter(p => p.left && p.right);

  if (!pairs.length) {
    return `
      <div class="empty" style="text-align:center;padding:40px;background:#ffffff;border-radius:16px;border:1.5px dashed #cbd5e1;max-width:650px;margin:0 auto;">
        <div style="font-size:36px;margin-bottom:8px;">🧩</div>
        <div style="font-weight:700;font-size:16px;color:#1e293b;">Chưa có bài nối từ & thành ngữ trong Unit này</div>
      </div>
    `;
  }

  const lefts = [...pairs].sort(() => Math.random() - 0.5);
  const rights = [...pairs].sort(() => Math.random() - 0.5);

  matchPuzzleState = {
    pairs: pairs,
    lefts: lefts,
    rights: rights,
    connections: {},
    selectedLeft: null,
    selectedRight: null,
    submitted: false,
    result: null
  };

  setTimeout(() => {
    redrawMatchLines();
    if (typeof window !== 'undefined' && !window._matchResizeAttached) {
      window._matchResizeAttached = true;
      window.addEventListener('resize', () => {
        if (document.getElementById('match-puzzle-svg')) {
          redrawMatchLines();
        }
      });
    }
  }, 60);

  return `
    <div class="match-puzzle-wrapper">
      <div class="match-puzzle-header">
        <div class="match-puzzle-title-wrap">
          <div class="match-puzzle-title">🧩 Ghép Cặp Từ Vựng, Thành Ngữ & Định Nghĩa</div>
          <div class="match-puzzle-desc">Bấm 1 ô bên trái rồi bấm 1 ô bên phải để nối đường line. Bấm <b>Nộp bài</b> khi xong.</div>
        </div>
        <div class="match-puzzle-stats">
          <div class="match-progress-badge">
            <span>Đã nối:</span>
            <strong id="match-progress-text">0 / ${pairs.length} cặp</strong>
          </div>
          <button type="button" class="btn btn-sm match-btn-reset" onclick="window.resetMatchPuzzle(true)">🔄 Xáo trộn lại</button>
        </div>
      </div>

      <div class="match-progress-track">
        <div class="match-progress-fill" id="match-progress-fill" style="width: 0%;"></div>
      </div>

      <div class="match-puzzle-canvas-wrap" id="match-puzzle-canvas-wrap">
        <svg class="match-puzzle-svg" id="match-puzzle-svg"></svg>
        <div class="match-puzzle-grid">
          <div class="match-col match-col-left">
            <div class="match-col-label"><span>📖 Từ vựng / Thuật ngữ</span></div>
            <div class="match-chips-list" id="match-chips-left">
              ${lefts.map((p, idx) => `
                <div class="match-puzzle-chip chip-left" id="mp-left-${p.pairId}" onclick="window.selectMatchLeft('${p.pairId}')">
                  <div class="chip-content-wrap">
                    <span style="font-weight:700;color:#64748b;font-size:12px;width:18px;">${idx + 1}.</span>
                    <span class="chip-text">${esc(p.left)}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="match-eval-holder" id="mp-eval-left-${p.pairId}"></span>
                    <span class="match-del-holder" id="mp-del-left-${p.pairId}"></span>
                    <div class="chip-connector-dot chip-connector-dot-right"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="match-col match-col-right">
            <div class="match-col-label"><span>💡 Định nghĩa / Ý nghĩa tương ứng</span></div>
            <div class="match-chips-list" id="match-chips-right">
              ${rights.map(p => `
                <div class="match-puzzle-chip chip-right" id="mp-right-${p.pairId}" onclick="window.selectMatchRight('${p.pairId}')">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div class="chip-connector-dot chip-connector-dot-left"></div>
                    <span class="match-eval-holder" id="mp-eval-right-${p.pairId}"></span>
                  </div>
                  <div class="chip-content-wrap">
                    <span class="chip-text">${esc(p.right)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="match-action-bar" id="match-action-bar">
        <div style="display:flex;gap:10px;align-items:center;margin-left:auto;">
          <button type="button" class="btn btn-sm" onclick="window.clearAllMatchConnections()" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">🗑️ Xóa hết</button>
          <button type="button" class="btn-match-submit" id="btn-match-submit" onclick="window.submitMatchPuzzle()"><span>✅ Nộp bài</span></button>
        </div>
      </div>
      <div id="match-result-card" class="match-result-card" style="display:none;"></div>
    </div>
  `;
}

export function redrawMatchLines() {
  const svg = document.getElementById('match-puzzle-svg');
  const canvasWrap = document.getElementById('match-puzzle-canvas-wrap');
  if (!svg || !canvasWrap) return;

  const wrapRect = canvasWrap.getBoundingClientRect();
  svg.setAttribute('width', wrapRect.width);
  svg.setAttribute('height', wrapRect.height);
  svg.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);

  let pathsHtml = '';
  const isSubmitted = matchPuzzleState.submitted;
  const connEntries = Object.entries(matchPuzzleState.connections);

  connEntries.forEach(([leftId, rightId], idx) => {
    const bLeft = document.getElementById(`mp-left-${leftId}`);
    const bRight = document.getElementById(`mp-right-${rightId}`);
    if (!bLeft || !bRight) return;

    const dotLeft = bLeft.querySelector('.chip-connector-dot-right') || bLeft;
    const dotRight = bRight.querySelector('.chip-connector-dot-left') || bRight;
    const rectL = dotLeft.getBoundingClientRect();
    const rectR = dotRight.getBoundingClientRect();

    const x1 = rectL.left + rectL.width / 2 - wrapRect.left;
    const y1 = rectL.top + rectL.height / 2 - wrapRect.top;
    const x2 = rectR.left + rectR.width / 2 - wrapRect.left;
    const y2 = rectR.top + rectR.height / 2 - wrapRect.top;

    const dx = Math.max(30, Math.abs(x2 - x1) * 0.45);
    const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

    let strokeColor = '';
    let dashArray = '7,5';
    let strokeWidth = 3;

    if (isSubmitted) {
      const isCorrect = String(leftId) === String(rightId);
      strokeColor = isCorrect ? '#16a34a' : '#dc2626';
      dashArray = isCorrect ? 'none' : '5,4';
    } else {
      const color = MATCH_COLORS[idx % MATCH_COLORS.length];
      strokeColor = color.hex;
    }

    pathsHtml += `
      <g class="match-line-group">
        <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round" />
        <circle cx="${x1}" cy="${y1}" r="4" fill="${strokeColor}" />
        <circle cx="${x2}" cy="${y2}" r="4" fill="${strokeColor}" />
      </g>
    `;
  });

  svg.innerHTML = pathsHtml;
}

export function updateMatchChipsState() {
  const total = matchPuzzleState.pairs.length;
  const connectedCount = Object.keys(matchPuzzleState.connections).length;

  const progText = document.getElementById('match-progress-text');
  const progFill = document.getElementById('match-progress-fill');
  if (progText) progText.textContent = `${connectedCount} / ${total} cặp`;
  if (progFill) progFill.style.width = Math.round((connectedCount / total) * 100) + '%';

  matchPuzzleState.lefts.forEach(p => {
    const el = document.getElementById(`mp-left-${p.pairId}`);
    if (!el) return;
    const isSelected = matchPuzzleState.selectedLeft === p.pairId;
    const isConnected = !!matchPuzzleState.connections[p.pairId];
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('connected', isConnected && !isSelected);
  });

  const rightToLeft = {};
  Object.entries(matchPuzzleState.connections).forEach(([lId, rId]) => { rightToLeft[rId] = lId; });

  matchPuzzleState.rights.forEach(p => {
    const el = document.getElementById(`mp-right-${p.pairId}`);
    if (!el) return;
    const isSelected = matchPuzzleState.selectedRight === p.pairId;
    const isConnected = !!rightToLeft[p.pairId];
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('connected', isConnected && !isSelected);
  });
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.redrawMatchLines = redrawMatchLines;
  window._updateMatchChipsState = updateMatchChipsState;

  window.selectMatchLeft = function(leftId) {
    if (matchPuzzleState.submitted) return;
    if (matchPuzzleState.selectedRight !== null) {
      matchPuzzleState.connections[leftId] = matchPuzzleState.selectedRight;
      matchPuzzleState.selectedLeft = null;
      matchPuzzleState.selectedRight = null;
    } else {
      matchPuzzleState.selectedLeft = matchPuzzleState.selectedLeft === leftId ? null : leftId;
    }
    updateMatchChipsState();
    redrawMatchLines();
  };

  window.selectMatchRight = function(rightId) {
    if (matchPuzzleState.submitted) return;
    if (matchPuzzleState.selectedLeft !== null) {
      matchPuzzleState.connections[matchPuzzleState.selectedLeft] = rightId;
      matchPuzzleState.selectedLeft = null;
      matchPuzzleState.selectedRight = null;
    } else {
      matchPuzzleState.selectedRight = matchPuzzleState.selectedRight === rightId ? null : rightId;
    }
    updateMatchChipsState();
    redrawMatchLines();
  };

  window.clearAllMatchConnections = function() {
    matchPuzzleState.connections = {};
    updateMatchChipsState();
    redrawMatchLines();
  };

  window.resetMatchPuzzle = function() {
    matchPuzzleState.submitted = false;
    matchPuzzleState.connections = {};
    updateMatchChipsState();
    redrawMatchLines();
    const resCard = document.getElementById('match-result-card');
    if (resCard) resCard.style.display = 'none';
  };

  window.submitMatchPuzzle = function() {
    matchPuzzleState.submitted = true;
    let correctCount = 0;
    const total = matchPuzzleState.pairs.length;

    Object.entries(matchPuzzleState.connections).forEach(([lId, rId]) => {
      if (String(lId) === String(rId)) correctCount++;
    });

    redrawMatchLines();
    updateMatchChipsState();

    const isPerfect = correctCount === total;
    if (isPerfect) {
      playSuccessSound();
      triggerConfetti();
      addXP(total * 10, 'Ghép cặp hoàn hảo 100%');
    } else {
      playWrongSound();
    }

    const resCard = document.getElementById('match-result-card');
    if (resCard) {
      resCard.style.display = 'block';
      resCard.className = `match-result-card ${isPerfect ? 'all-correct' : 'partial-correct'}`;
      resCard.innerHTML = `
        <div class="match-res-title">${isPerfect ? '🎉 Xuất Sắc!' : '📊 Kết Quả'}</div>
        <div class="match-res-desc">Bạn đã ghép đúng ${correctCount}/${total} cặp.</div>
      `;
    }
  };
}
