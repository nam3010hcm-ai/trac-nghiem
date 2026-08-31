/**
 * MODULE LEARN LISTENING EVALUATION (js/learn/learn-listening-eval.js)
 * Chấm điểm tương tác các bài tập nghe: MCQ, Gap fill, True/False, Dictation & Short answer
 */
import { playSuccessSound, playWrongSound, addXP } from './learn-common.js';

export function checkLisMCQ(exIdx, chosenIdx, correctIdx) {
  const fb = document.getElementById(`lis-fb-${exIdx}`);
  const exp = document.getElementById(`lis-exp-${exIdx}`);
  const btn = document.getElementById(`lis-opt-${exIdx}-${chosenIdx}`);
  if (!fb || !btn) return;
  document.querySelectorAll(`[id^="lis-opt-${exIdx}-"]`).forEach(b => (b.disabled = true));
  if (chosenIdx === correctIdx) {
    btn.classList.add('correct');
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> Bạn đã nghe/xem và chọn đúng.';
    fb.style.display = 'block';
    if (exp) exp.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Nghe hiểu đúng');
  } else {
    btn.classList.add('wrong');
    const correctBtn = document.getElementById(`lis-opt-${exIdx}-${correctIdx}`);
    if (correctBtn) correctBtn.classList.add('correct');
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa chính xác!</b> Hãy xem/nghe lại bài.';
    fb.style.display = 'block';
    if (exp) exp.style.display = 'block';
    playWrongSound();
  }
}

export function checkLisGapFill(exIdx) {
  const inputs = document.querySelectorAll(`[id^="gap-inp-${exIdx}-"]`);
  const fb = document.getElementById(`gap-fb-${exIdx}`);
  if (!inputs.length || !fb) return;
  let allCorrect = true;
  inputs.forEach((inp) => {
    const val = inp.value.trim().toLowerCase();
    const correct = (inp.dataset.correct || '').trim().toLowerCase();
    if (val === correct) {
      inp.className = 'gap-input correct';
    } else {
      inp.className = 'gap-input wrong';
      allCorrect = false;
    }
  });
  fb.style.display = 'block';
  if (allCorrect) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Xuất sắc!</b> Tất cả các chỗ trống đều được điền chính xác.';
    playSuccessSound();
    addXP(20, 'Điền đúng chỗ trống');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = '⚠️ Có một số từ chưa chính xác. Hãy đối chiếu lại bài nhé!';
    playWrongSound();
  }
}

export function checkLisTrueFalse(exIdx, chosenVal, correctVal) {
  const fb = document.getElementById(`lis-tf-fb-${exIdx}`);
  const exp = document.getElementById(`lis-tf-exp-${exIdx}`);
  const btnTrue = document.getElementById(`lis-tf-${exIdx}-true`);
  const btnFalse = document.getElementById(`lis-tf-${exIdx}-false`);
  if (!fb || !btnTrue || !btnFalse) return;
  btnTrue.disabled = true;
  btnFalse.disabled = true;
  const isMatch = (chosenVal === correctVal);
  if (chosenVal === true) btnTrue.classList.add(isMatch ? 'correct' : 'wrong');
  else btnFalse.classList.add(isMatch ? 'correct' : 'wrong');
  if (!isMatch) {
    if (correctVal === true) btnTrue.classList.add('correct');
    else btnFalse.classList.add('correct');
  }
  fb.style.display = 'block';
  if (isMatch) {
    fb.className = 'fb fb-ok';
    fb.innerHTML = '🎉 <b>Chính xác!</b> Bạn đã nhận định đúng mệnh đề.';
    if (exp) exp.style.display = 'block';
    playSuccessSound();
    addXP(15, 'Chọn đúng True/False');
  } else {
    fb.className = 'fb fb-bad';
    fb.innerHTML = '❌ <b>Chưa đúng!</b> Hãy nghe/xem lại chi tiết trong bài.';
    if (exp) exp.style.display = 'block';
    playWrongSound();
  }
}

export function checkDictation(idx, targetSentence) {
  const inputEl = document.getElementById(`dictation-input-${idx}`);
  const fb = document.getElementById(`dictation-fb-${idx}`);
  if (!inputEl || !fb) return;
  const userInput = inputEl.value.trim();
  if (!userInput) { alert('Vui lòng gõ nội dung trước khi kiểm tra!'); return; }
  const cleanTarget = targetSentence.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase().split(/\s+/);
  const cleanUser = userInput.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase().split(/\s+/);
  let matchCount = 0;
  let diffHtml = cleanTarget.map((targetWord, i) => {
    const userWord = cleanUser[i];
    if (userWord === targetWord) {
      matchCount++;
      return `<span class="diff-word-correct" style="color:#15803d;background:#dcfce7;padding:2px 4px;border-radius:4px;font-weight:bold">${targetWord}</span>`;
    } else if (userWord) {
      return `<span class="diff-word-wrong" style="color:#b91c1c;background:#fee2e2;padding:2px 4px;border-radius:4px">${userWord}</span> <span class="diff-word-correct" style="color:#15803d;font-weight:bold">${targetWord}</span>`;
    } else {
      return `<span class="diff-word-missing" style="color:#b91c1c;text-decoration:underline">${targetWord}</span>`;
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
}

if (typeof window !== 'undefined') {
  window.checkLisMCQ = checkLisMCQ;
  window.checkLisGapFill = checkLisGapFill;
  window.checkLisTrueFalse = checkLisTrueFalse;
  window.checkDictation = checkDictation;
}
