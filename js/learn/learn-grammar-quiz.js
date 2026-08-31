/**
 * MODULE LEARN GRAMMAR QUIZ (js/learn/learn-grammar-quiz.js)
 * Trắc nghiệm Ngữ pháp A, B, C, D kèm giải thích và tính điểm XP
 */
import { esc, typesetMath } from '../common.js';
import { currentUnit, getUnitSkillObj, playSuccessSound, playWrongSound, addXP } from './learn-common.js';

export function renderGrammarQuizView() {
  const langObj = getUnitSkillObj(currentUnit, 'languageFocus') || currentUnit?.languageFocus || currentUnit?.language_focus || {};
  const quiz = langObj?.grammarChallenge || langObj?.grammarQuiz || [];
  if (!quiz.length) {
    return `
      <div class="empty" style="text-align:center;padding:40px;background:#ffffff;border-radius:16px;border:1.5px dashed #cbd5e1;max-width:650px;margin:0 auto;">
        <div style="font-size:36px;margin-bottom:8px;">⚡</div>
        <div style="font-weight:700;font-size:16px;color:#1e293b;">Chưa có câu hỏi trắc nghiệm trong Unit này</div>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:18px;max-width:760px;margin:0 auto">
      <div style="background:#ffffff;padding:16px 20px;border-radius:14px;border:1.5px solid #e2e8f0;box-shadow:0 2px 10px rgba(0,0,0,0.03);">
        <div style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:4px;">
          ⚡ Exercise 2. Choose the best answer from A, B, C, or D.
        </div>
        <div style="font-size:13px;color:#64748b;">
          Đọc kỹ từng câu hỏi và bấm chọn phương án chính xác nhất để hoàn thành câu.
        </div>
      </div>

      ${quiz.map((q, idx) => `
        <div class="card" style="margin:0;padding:20px;border-radius:14px;border:1.5px solid #e2e8f0;box-shadow:0 2px 10px rgba(0,0,0,0.03);" id="gq-card-${idx}">
          <div style="font-weight:700;font-size:15px;margin-bottom:12px;color:#1e293b;line-height:1.5;">
            <span style="display:inline-block;background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:6px;font-size:12.5px;font-weight:800;margin-right:6px;">Câu ${idx + 1}</span>
            ${esc(q.question)}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(q.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkGrammarQuiz(${idx}, ${oIdx}, ${q.answer})" id="gq-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${esc(opt)}</span>
              </button>
            `).join('')}
          </div>
          <div id="gq-fb-${idx}" class="fb" style="display:none;margin-top:12px;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.checkGrammarQuiz = function(qIdx, chosenIdx, correctIdx) {
    const fb = document.getElementById(`gq-fb-${qIdx}`);
    const btn = document.getElementById(`gq-opt-${qIdx}-${chosenIdx}`);
    if (!fb || !btn || !currentUnit) return;

    const allBtns = document.querySelectorAll(`[id^="gq-opt-${qIdx}-"]`);
    allBtns.forEach(b => (b.disabled = true));

    const langObj = getUnitSkillObj(currentUnit, 'languageFocus') || currentUnit?.languageFocus || currentUnit?.language_focus || {};
    const quiz = langObj?.grammarChallenge || langObj?.grammarQuiz || [];
    const quizItem = quiz[qIdx];

    if (chosenIdx === correctIdx) {
      btn.classList.add('correct');
      fb.className = 'fb fb-ok';
      fb.innerHTML = '🎉 <b>Chính xác!</b> ' + (quizItem?.explain || '');
      fb.style.display = 'block';
      typesetMath(fb);
      playSuccessSound();
      addXP(15, 'Ngữ pháp đúng');
    } else {
      btn.classList.add('wrong');
      const correctBtn = document.getElementById(`gq-opt-${qIdx}-${correctIdx}`);
      if (correctBtn) correctBtn.classList.add('correct');
      fb.className = 'fb fb-bad';
      fb.innerHTML = '❌ <b>Chưa đúng.</b> ' + (quizItem?.explain || '');
      fb.style.display = 'block';
      typesetMath(fb);
      playWrongSound();
    }
  };
}
