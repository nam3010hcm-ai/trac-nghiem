/**
 * MODULE STUDENT QUIZ TOPBAR & MATRIX (js/student/student-topbar.js)
 * Thanh dải câu hỏi, nhảy câu hỏi trực tiếp, ma trận tổng quan và badge thông tin
 */
import { $, esc } from '../common.js';
import { qState, persist } from './student-exam.js';
import { renderPart } from './student-renderer.js';

export function isQuestionAnswered(q, gIdx, answers) {
  if (!answers) return false;
  const ans = answers[gIdx];
  if (ans === undefined || ans === null) return false;
  const type = q ? (q.type || 'mcq_single') : 'mcq_single';

  if (type === 'mcq_single') {
    return typeof ans === 'number' || (typeof ans === 'string' && ans.trim() !== '');
  }
  if (type === 'mcq_multi') {
    return Array.isArray(ans) && ans.length > 0;
  }
  if (type === 'fill_blank' || type === 'drag_drop') {
    if (Array.isArray(ans)) {
      return ans.some(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
    return false;
  }
  if (type === 'matching') {
    if (typeof ans === 'object' && ans !== null) {
      return Object.keys(ans).length > 0;
    }
    return false;
  }
  if (type === 'essay') {
    return typeof ans === 'string' && ans.trim().length > 0;
  }
  return Boolean(ans);
}

export function showStudentBadge() {
  const s = qState.student;
  if ($('q-student')) {
    $('q-student').textContent = `${s.id || ''} - ${s.name || ''} (${s.class_name || ''}) • ${qState.mode === 'practice' ? '💡 Ôn thi' : `Ca thi: ${s.cohort || ''}`} • ${qState.exam?.name || ''}`;
  }
}

export function renderQuizTopbar() {
  const strip = $('quiz-nav-strip');
  if (!strip || !qState.qs) return;

  strip.innerHTML = '';
  qState.qs.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'q-nav-btn';
    btn.id = `q-nav-btn-${i}`;
    btn.textContent = i + 1;
    btn.title = `Câu ${i + 1} (${q.subcat || 'Part'})`;

    btn.addEventListener('click', () => {
      jumpToQuestion(i);
    });

    strip.appendChild(btn);
  });

  updateQuizStats();
}

export function updateQuizStats() {
  if (!qState.qs) return;
  const total = qState.qs.length;
  let answeredCount = 0;

  const currentPart = qState.parts ? qState.parts[qState.partIdx] : null;

  qState.qs.forEach((q, i) => {
    const answered = isQuestionAnswered(q, i, qState.answers);
    if (answered) answeredCount++;

    const btn = $(`q-nav-btn-${i}`);
    if (btn) {
      btn.classList.toggle('answered', answered);
      btn.classList.toggle('unanswered', !answered);

      const isInCurrentPart = currentPart && currentPart.questions.some(pq => pq.globalIdx === i);
      btn.classList.toggle('in-current-part', Boolean(isInCurrentPart));
    }
  });

  const unansweredCount = total - answeredCount;

  if ($('quiz-stat-total')) {
    $('quiz-stat-total').innerHTML = `📝 Tổng: <b>${total}</b> câu`;
  }
  if ($('quiz-stat-answered')) {
    $('quiz-stat-answered').innerHTML = `✅ Đã làm: <b>${answeredCount}</b>/${total}`;
  }
  if ($('quiz-stat-unanswered')) {
    $('quiz-stat-unanswered').innerHTML = `⏳ Chưa làm: <b>${unansweredCount}</b>`;
  }

  if ($('q-pbar')) {
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    $('q-pbar').style.width = `${pct}%`;
  }

  renderQuestionMatrixBody();
}

export function jumpToQuestion(gIdx) {
  if (!qState.parts || !qState.qs) return;

  let targetPartIdx = -1;
  for (let p = 0; p < qState.parts.length; p++) {
    if (qState.parts[p].questions.some(q => q.globalIdx === gIdx)) {
      targetPartIdx = p;
      break;
    }
  }

  if (targetPartIdx === -1) return;

  toggleQuestionMatrix(false);

  const switchPartNeeded = (targetPartIdx !== qState.partIdx);
  if (switchPartNeeded) {
    qState.partIdx = targetPartIdx;
    persist();
    renderPart();
  } else {
    updateQuizStats();
  }

  document.querySelectorAll('.q-nav-btn').forEach(b => b.classList.remove('active-target'));
  const navBtn = $(`q-nav-btn-${gIdx}`);
  if (navBtn) {
    navBtn.classList.add('active-target');
    navBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  setTimeout(() => {
    const cardEl = $(`q-card-${gIdx}`);
    if (cardEl) {
      const topbar = $('quiz-sticky-topbar');
      const header = document.querySelector('.header');
      
      const headerHeight = header ? header.offsetHeight : 64;
      const topbarHeight = topbar ? topbar.offsetHeight : 110;
      const gap = 10;
      const totalStickyOffset = headerHeight + topbarHeight + gap;

      const cardRect = cardEl.getBoundingClientRect();
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const cardAbsoluteTop = cardRect.top + currentScrollY;
      const targetScrollY = Math.max(0, cardAbsoluteTop - totalStickyOffset);

      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth'
      });

      cardEl.classList.remove('q-card-highlighted');
      void cardEl.offsetWidth;
      cardEl.classList.add('q-card-highlighted');
    }
  }, switchPartNeeded ? 120 : 30);
}

export function toggleQuestionMatrix(show) {
  const modal = $('quiz-matrix-modal');
  if (!modal) return;
  if (show) {
    renderQuestionMatrixBody();
    modal.classList.add('open');
  } else {
    modal.classList.remove('open');
  }
}

export function renderQuestionMatrixBody() {
  const body = $('quiz-matrix-body');
  if (!body || !qState.parts) return;

  body.innerHTML = qState.parts.map((part, pIdx) => {
    const isCurrent = pIdx === qState.partIdx;
    const partQs = part.questions || [];
    const partAnswered = partQs.filter(q => isQuestionAnswered(q, q.globalIdx, qState.answers)).length;

    return `
      <div class="quiz-matrix-part-section">
        <div class="quiz-matrix-part-label">
          <span>${esc(part.name)} ${isCurrent ? '<span style="color:#6366f1;font-size:12px;font-weight:700">(Đang làm)</span>' : ''}</span>
          <span style="font-size:12px;color:#64748b;font-weight:600">Đã làm: ${partAnswered}/${partQs.length}</span>
        </div>
        <div class="quiz-matrix-grid">
          ${partQs.map(q => {
            const gIdx = q.globalIdx;
            const ans = isQuestionAnswered(q, gIdx, qState.answers);
            return `
              <button type="button" class="quiz-matrix-btn ${ans ? 'answered' : ''}" onclick="window.jumpToQuestion(${gIdx})" title="Câu ${gIdx + 1}: ${ans ? 'Đã làm' : 'Chưa làm'}">
                ${gIdx + 1}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}
