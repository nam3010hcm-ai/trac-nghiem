/**
 * MODULE STUDENT QUESTION RENDERER & INTERACTION (js/student/student-renderer.js)
 * Hiển thị câu hỏi MCQ, Điền từ, Kéo thả, Nối cặp & Tự luận trong phòng thi
 */
import { $, KEYS, esc, mediaHTML, audioHTML, videoHTML, renderRich, typesetMath, splitBlanks } from '../common.js';
import { qState, persist } from './student-exam.js';
import { updateQuizStats } from './student-topbar.js';

export let uiState = { multiSelected: {} };

export function renderPart() {
  const currentPart = qState.parts ? qState.parts[qState.partIdx] : null;
  if (!currentPart) return;

  if ($('q-progress')) {
    $('q-progress').textContent = `${currentPart.name} (${qState.partIdx + 1}/${qState.parts.length})`;
  }

  const container = $('part-container');
  if (!container) return;
  container.innerHTML = '';

  currentPart.questions.forEach((q) => {
    const gIdx = q.globalIdx;
    const type = q.type || 'mcq_single';
    const qCard = document.createElement('div');
    qCard.className = 'card';
    qCard.id = `q-card-${gIdx}`;
    qCard.style.marginBottom = '20px';

    let bodyHtml = '';
    if(type === 'mcq_single' || type === 'mcq_multi'){
      bodyHtml = renderMCQ(q, gIdx, type);
    } else if(type === 'fill_blank'){
      bodyHtml = renderFillBlank(q, gIdx);
    } else if(type === 'drag_drop'){
      bodyHtml = renderDragDrop(q, gIdx);
    } else if(type === 'matching'){
      bodyHtml = renderMatching(q, gIdx);
    } else if(type === 'essay'){
      bodyHtml = renderEssay(q, gIdx);
    }

    qCard.innerHTML = `
      <div style="font-size:15px; font-weight:700; color:#1e293b; margin-bottom:12px;">
        Câu ${gIdx + 1}: ${renderRich(q.text)}
      </div>
      ${mediaHTML(q.image)}
      ${audioHTML(q.audio, gIdx, qState.mode)}
      ${videoHTML(q.video, gIdx, qState.mode)}
      <div style="margin-top:14px;">${bodyHtml}</div>
    `;
    container.appendChild(qCard);

    bindEventsForQuestion(q, gIdx, type, qCard);
  });

  if ($('btn-prev')) $('btn-prev').style.display = qState.partIdx > 0 ? 'block' : 'none';
  if (qState.partIdx === qState.parts.length - 1) {
    if ($('btn-next')) $('btn-next').style.display = 'none';
    if ($('btn-finish')) $('btn-finish').style.display = 'block';
  } else {
    if ($('btn-next')) $('btn-next').style.display = 'block';
    if ($('btn-finish')) $('btn-finish').style.display = 'none';
  }

  updateQuizStats();
  typesetMath(container);
}

export function renderMCQ(q, gIdx, type) {
  const isMulti = type === 'mcq_multi';
  const savedAns = qState.answers[gIdx];
  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${(q.opts || []).map((opt, i) => {
        let isSelected = false;
        if (isMulti) {
          const arr = uiState.multiSelected[gIdx] || (Array.isArray(savedAns) ? savedAns : []);
          isSelected = arr.includes(i);
        } else {
          isSelected = savedAns === i;
        }
        return `
          <button class="opt ${isSelected ? 'selected' : ''}" data-gidx="${gIdx}" data-optidx="${i}">
            <span class="okey">${KEYS[i]}</span>
            <span>${renderRich(opt)}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function renderFillBlank(q, gIdx) {
  const parts = splitBlanks(q.text);
  const savedAns = qState.answers[gIdx] || [];
  let html = '<div class="fillblank-sentence">';
  parts.forEach((p, i) => {
    html += `<span>${renderRich(p)}</span>`;
    if (i < parts.length - 1) {
      const val = savedAns[i] || '';
      html += `<input type="text" class="blank-input" data-gidx="${gIdx}" data-blankidx="${i}" value="${esc(val)}" placeholder="...">`;
    }
  });
  html += '</div>';
  return html;
}

export function renderDragDrop(q, gIdx) {
  const parts = splitBlanks(q.text);
  const savedAns = qState.answers[gIdx] || [];
  const bank = q.bank || [];
  
  let html = '<div class="fillblank-sentence" style="margin-bottom:15px;">';
  parts.forEach((p, i) => {
    html += `<span>${renderRich(p)}</span>`;
    if (i < parts.length - 1) {
      const val = savedAns[i] || '';
      html += `<button class="drop-slot ${val ? 'filled' : ''}" data-gidx="${gIdx}" data-slotidx="${i}">${val ? esc(val) : '⬚'}</button>`;
    }
  });
  html += '</div>';

  html += '<div style="display:flex; gap:8px; flex-wrap:wrap; padding:10px; background:#f8fafc; border-radius:8px;">';
  bank.forEach((word) => {
    const isUsed = savedAns.includes(word);
    html += `<button class="bank-chip ${isUsed ? 'used' : ''}" data-gidx="${gIdx}" data-word="${esc(word)}" ${isUsed ? 'disabled' : ''}>${esc(word)}</button>`;
  });
  html += '</div>';
  return html;
}

export function renderMatching(q, gIdx) {
  const pairs = q.pairs || [];
  const savedAns = qState.answers[gIdx] || {}; 
  const leftItems = pairs.map((p, i) => ({ text: p.left, id: i }));
  const rightItems = pairs.map((p, i) => ({ text: p.right, id: i }));

  let html = '<div class="match-cols">';
  html += '<div class="match-col">';
  leftItems.forEach(l => {
    const isPaired = savedAns[l.id] !== undefined;
    html += `<button class="match-item ${isPaired ? 'paired' : ''}" data-gidx="${gIdx}" data-side="left" data-id="${l.id}">
      <span class="match-badge">${l.id + 1}</span>${esc(l.text)}
    </button>`;
  });
  html += '</div><div class="match-col">';
  rightItems.forEach(r => {
    const isPaired = Object.values(savedAns).includes(r.id);
    html += `<button class="match-item ${isPaired ? 'paired' : ''}" data-gidx="${gIdx}" data-side="right" data-id="${r.id}">
      ${esc(r.text)}
    </button>`;
  });
  html += '</div></div>';
  return html;
}

export function renderEssay(q, gIdx) {
  const savedAns = qState.answers[gIdx] || '';
  return `
    <div>
      <textarea class="designer-textarea" data-gidx="${gIdx}" placeholder="Nhập bài làm tự luận của bạn tại đây..." style="min-height:140px;">${esc(savedAns)}</textarea>
    </div>
  `;
}

export function bindEventsForQuestion(q, gIdx, type, qCard) {
  if (type === 'mcq_single') {
    qCard.querySelectorAll('.opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = parseInt(btn.dataset.optidx);
        qState.answers[gIdx] = optIdx;
        qCard.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        persist();
        updateQuizStats();
      });
    });
  } else if (type === 'mcq_multi') {
    qCard.querySelectorAll('.opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = parseInt(btn.dataset.optidx);
        if (!uiState.multiSelected[gIdx]) uiState.multiSelected[gIdx] = [];
        const arr = uiState.multiSelected[gIdx];
        const idxInArr = arr.indexOf(optIdx);
        if (idxInArr >= 0) arr.splice(idxInArr, 1);
        else arr.push(optIdx);
        
        qState.answers[gIdx] = [...arr];
        btn.classList.toggle('selected');
        persist();
        updateQuizStats();
      });
    });
  } else if (type === 'fill_blank') {
    qCard.querySelectorAll('.blank-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const bIdx = parseInt(inp.dataset.blankidx);
        if (!qState.answers[gIdx]) qState.answers[gIdx] = [];
        qState.answers[gIdx][bIdx] = inp.value.trim();
        persist();
        updateQuizStats();
      });
    });
  } else if (type === 'drag_drop') {
    qCard.querySelectorAll('.drop-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotIdx = parseInt(slot.dataset.slotidx);
        if (!qState.answers[gIdx]) qState.answers[gIdx] = [];
        if (qState.answers[gIdx][slotIdx]) {
          qState.answers[gIdx][slotIdx] = '';
          persist();
          renderPart();
        }
      });
    });
    qCard.querySelectorAll('.bank-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const word = chip.dataset.word;
        if (!qState.answers[gIdx]) qState.answers[gIdx] = [];
        const parts = splitBlanks(q.text);
        const totalSlots = parts.length - 1;
        let placed = false;
        for (let s = 0; s < totalSlots; s++) {
          if (!qState.answers[gIdx][s]) {
            qState.answers[gIdx][s] = word;
            placed = true;
            break;
          }
        }
        if (placed) {
          persist();
          renderPart();
        }
      });
    });
  } else if (type === 'matching') {
    let selectedLeft = null;
    qCard.querySelectorAll('.match-item[data-side="left"]').forEach(item => {
      item.addEventListener('click', () => {
        qCard.querySelectorAll('.match-item[data-side="left"]').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedLeft = parseInt(item.dataset.id);
      });
    });
    qCard.querySelectorAll('.match-item[data-side="right"]').forEach(item => {
      item.addEventListener('click', () => {
        if (selectedLeft !== null) {
          const rightId = parseInt(item.dataset.id);
          if (!qState.answers[gIdx] || typeof qState.answers[gIdx] !== 'object') qState.answers[gIdx] = {};
          qState.answers[gIdx][selectedLeft] = rightId;
          persist();
          renderPart();
        }
      });
    });
  } else if (type === 'essay') {
    const ta = qCard.querySelector('textarea');
    if (ta) {
      ta.addEventListener('input', () => {
        qState.answers[gIdx] = ta.value;
        persist();
        updateQuizStats();
      });
    }
  }
}
