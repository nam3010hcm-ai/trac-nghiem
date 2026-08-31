/**
 * MODULE LEARN WRITING SKILL (js/learn/learn-writing.js)
 * Bộ thực hành kỹ năng Viết: Chuyển đổi câu (Transformation), Sắp xếp từ (Scramble) & Sửa lỗi ngữ pháp
 */
import { esc, typesetMath } from '../common.js';
import { currentUnit, getUnitSkillList, playSuccessSound, playWrongSound, addXP } from './learn-common.js';

export let currentWrtCategory = 'transformation';

export function initWriting() {
  if (!currentWrtCategory) currentWrtCategory = 'transformation';
  loadWritingView(currentWrtCategory);
}

export function selectWritingTab(type) {
  currentWrtCategory = type;
  loadWritingView(type);
}

export function loadWritingView(type) {
  const workspace = document.getElementById('wrt-workspace');
  if (!workspace || !currentUnit) return;

  const wrtData = getUnitSkillList(currentUnit, 'writing');
  if (!type) type = 'transformation';
  currentWrtCategory = type;

  const transformGroup = wrtData.find(w => w.category === 'transformation' || w.id?.includes('transform')) || wrtData[0];
  const scrambleGroup = wrtData.find(w => w.category === 'scramble' || w.id?.includes('scramble')) || wrtData[1];
  const errorGroup = wrtData.find(w => w.category === 'error_fix' || w.id?.includes('error_fix')) || wrtData[2];

  let subviewHtml = '';

  if (type === 'transformation') {
    const items = transformGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        <div style="font-size:14px;color:#475569;margin-bottom:2px">
          💡 Hãy chuyển đổi các câu khẳng định sau sang: <b>a) Thể Phủ định (-)</b> và <b>b) Thể Nghi vấn (?)</b>.
        </div>
        ${items.map((item, idx) => `
          <div class="sentence-transform-card" id="transform-card-${idx}">
            <div class="transform-orig-sentence">
              <span style="color:#7c3aed;font-weight:800">Câu ${idx + 1}:</span> "${esc(item.originalSentence || '')}"
            </div>
            ${item.hint ? `<div style="font-size:12px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${esc(item.hint)}</div>` : ''}

            <div class="transform-sub-row">
              <label class="transform-badge-neg">a) Phủ định (-)</label>
              <input type="text" id="tf-neg-inp-${idx}" class="transform-input" placeholder="VD: They did not arrive...">
            </div>

            <div class="transform-sub-row">
              <label class="transform-badge-ques">b) Nghi vấn / Câu hỏi (?)</label>
              <input type="text" id="tf-ques-inp-${idx}" class="transform-input" placeholder="VD: Did they arrive...?">
            </div>

            <div style="display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-p" onclick="window.checkSentenceTransformation(${idx}, '${esc(item.negativeAnswer || '')}', '${esc(item.negativeAlt || '')}', '${esc(item.questionAnswer || '')}')">✅ Kiểm tra câu</button>
              <button class="btn btn-sm" onclick="window.toggleTransformAnswer(${idx})" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1">👁️ Xem đáp án chuẩn</button>
            </div>

            <div id="tf-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
            <div id="tf-ans-box-${idx}" class="sample-answer-reveal" style="display:none">
              <div><b>a) Phủ định (-):</b> ${esc(item.negativeAnswer || '')} ${item.negativeAlt ? `<i>(hoặc: ${esc(item.negativeAlt)})</i>` : ''}</div>
              <div style="margin-top:4px"><b>b) Nghi vấn (?):</b> ${esc(item.questionAnswer || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'scramble') {
    const items = scrambleGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${items.map((item, idx) => {
          const wordsList = item.words || item.correctSentence?.split(/\s+/) || [];
          const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
          return `
            <div class="card" style="margin:0;border-left:4px solid #8b5cf6">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#1e293b">Câu ${idx + 1}: Sắp xếp các từ thành câu hoàn chỉnh</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:10px">💡 Gợi ý: ${item.hint || ''}</div>
              
              <div class="assembled-sentence-box" id="sc-assembled-${idx}">
                <span style="color:#94a3b8;font-size:13px" id="sc-placeholder-${idx}">(Bấm các từ bên dưới để đưa vào đây)</span>
              </div>

              <div class="scramble-word-chips" id="sc-pool-${idx}">
                ${shuffled.map((w, wIdx) => `
                  <button class="word-chip-btn" id="sc-btn-${idx}-${wIdx}" onclick="window.placeWordChip(${idx}, ${wIdx}, '${w.replace(/'/g, "\\'")}')">${w}</button>
                `).join('')}
              </div>

              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-p" onclick="window.checkScrambleSentence(${idx}, '${(item.correctSentence || '').replace(/'/g, "\\'")}')">✅ Kiểm tra câu</button>
                <button class="btn btn-sm" onclick="window.resetScramble(${idx})">🔄 Xếp lại</button>
              </div>
              <div id="sc-fb-${idx}" class="fb" style="display:none"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (type === 'error_fix') {
    const items = errorGroup?.items || [];
    subviewHtml = `
      <div style="display:flex;flex-direction:column;gap:18px">
        ${items.map((item, idx) => `
          <div class="card" style="margin:0;border-left:4px solid #f59e0b">
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#1e293b">Câu ${idx + 1}: Tìm và sửa lỗi sai trong câu</div>
            <div style="font-size:16px;color:#1e293b;padding:12px;background:#fffbeb;border-radius:8px;margin-bottom:12px;border:1px solid #fef3c7">
              "${item.incorrectSentence}"
            </div>
            <div class="grid2">
              <div class="fg" style="margin:0">
                <label>Từ bị sai trong câu</label>
                <input type="text" id="err-word-${idx}" placeholder="VD: went">
              </div>
              <div class="fg" style="margin:0">
                <label>Sửa lại thành từ đúng</label>
                <input type="text" id="err-fix-${idx}" placeholder="VD: been">
              </div>
            </div>
            <button class="btn btn-p" style="margin-top:12px" onclick="window.checkErrorFix(${idx}, '${item.errorWord || ''}', '${item.correctWord || ''}', '${(item.explain || '').replace(/'/g, '&#39;')}')">Kiểm tra sửa lỗi</button>
            <div id="err-fb-${idx}" class="fb" style="display:none"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  workspace.innerHTML = `
    <div class="skill-subnav-bar">
      <button class="skill-subnav-btn ${type === 'transformation' ? 'active' : ''}" onclick="window.selectWritingTab('transformation')">🔄 Ex 3. Chuyển Đổi Câu (Negative & Question)</button>
      <button class="skill-subnav-btn ${type === 'scramble' ? 'active' : ''}" onclick="window.selectWritingTab('scramble')">🧩 Ex 4. Sắp Xếp Từ (Reorder Words)</button>
      <button class="skill-subnav-btn ${type === 'error_fix' ? 'active' : ''}" onclick="window.selectWritingTab('error_fix')">🔍 Sửa Lỗi Ngữ Pháp</button>
    </div>

    <div>
      ${subviewHtml}
    </div>
  `;
  typesetMath(workspace);
}

function cleanSentenceText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ');
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.selectWritingTab = selectWritingTab;
  
  window.checkSentenceTransformation = function(idx, negAns, negAlt, quesAns) {
    const negInp = document.getElementById(`tf-neg-inp-${idx}`);
    const quesInp = document.getElementById(`tf-ques-inp-${idx}`);
    const fb = document.getElementById(`tf-fb-${idx}`);
    if (!negInp || !quesInp || !fb) return;

    const userNeg = cleanSentenceText(negInp.value);
    const userQues = cleanSentenceText(quesInp.value);

    const cleanNeg1 = cleanSentenceText(negAns);
    const cleanNeg2 = cleanSentenceText(negAlt);
    const cleanQues = cleanSentenceText(quesAns);

    const isNegCorrect = (userNeg && (userNeg === cleanNeg1 || userNeg === cleanNeg2 || userNeg.replace("n't", " not") === cleanNeg1.replace("n't", " not")));
    const isQuesCorrect = (userQues && userQues === cleanQues);

    negInp.className = `transform-input ${isNegCorrect ? 'correct' : 'wrong'}`;
    quesInp.className = `transform-input ${isQuesCorrect ? 'correct' : 'wrong'}`;

    fb.style.display = 'block';
    if (isNegCorrect && isQuesCorrect) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = '🎉 <b>Xuất sắc!</b> Cả 2 câu phủ định và nghi vấn đều chuyển đổi chính xác.';
      playSuccessSound();
      addXP(20, 'Chuyển đổi câu đúng ngữ pháp');
    } else if (isNegCorrect || isQuesCorrect) {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `⚠️ <b>Đúng 1 phần:</b> Bạn đã làm đúng ${isNegCorrect ? 'câu Phủ định (-)' : 'câu Nghi vấn (?)'}.`;
      playWrongSound();
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = '❌ <b>Chưa chính xác.</b> Hãy kiểm tra lại trợ động từ (did/was/were...) hoặc xem đáp án.';
      playWrongSound();
    }
  };

  window.toggleTransformAnswer = function(idx) {
    const box = document.getElementById(`tf-ans-box-${idx}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
  };

  window.placedWordsState = {};

  window.placeWordChip = function(sentIdx, wordIdx, word) {
    if (!window.placedWordsState[sentIdx]) window.placedWordsState[sentIdx] = [];
    window.placedWordsState[sentIdx].push({ wordIdx, word });
    const btn = document.getElementById(`sc-btn-${sentIdx}-${wordIdx}`);
    if (btn) btn.classList.add('placed');
    renderAssembledSentence(sentIdx);
  };

  function renderAssembledSentence(sentIdx) {
    const box = document.getElementById(`sc-assembled-${sentIdx}`);
    const list = window.placedWordsState[sentIdx] || [];
    if (!box) return;
    if (!list.length) {
      box.innerHTML = `<span style="color:#94a3b8;font-size:13px">(Bấm các từ bên dưới để đưa vào đây)</span>`;
      return;
    }
    box.innerHTML = list.map((item, i) => `
      <button class="word-chip-btn" style="background:#8b5cf6;color:#fff;border-color:#8b5cf6" onclick="window.removePlacedWord(${sentIdx}, ${i})">
        ${item.word} ✖
      </button>
    `).join('');
  }

  window.removePlacedWord = function(sentIdx, indexInList) {
    const list = window.placedWordsState[sentIdx] || [];
    const removed = list.splice(indexInList, 1)[0];
    if (removed) {
      const btn = document.getElementById(`sc-btn-${sentIdx}-${removed.wordIdx}`);
      if (btn) btn.classList.remove('placed');
    }
    renderAssembledSentence(sentIdx);
  };

  window.resetScramble = function(sentIdx) {
    window.placedWordsState[sentIdx] = [];
    const pool = document.getElementById(`sc-pool-${sentIdx}`);
    if (pool) {
      pool.querySelectorAll('.word-chip-btn').forEach(b => b.classList.remove('placed'));
    }
    renderAssembledSentence(sentIdx);
    const fb = document.getElementById(`sc-fb-${sentIdx}`);
    if (fb) fb.style.display = 'none';
  };

  window.checkScrambleSentence = function(sentIdx, correctSentence) {
    const list = window.placedWordsState[sentIdx] || [];
    const assembled = list.map(item => item.word).join(' ');
    const fb = document.getElementById(`sc-fb-${sentIdx}`);
    if (!fb) return;

    if (assembled.trim() === correctSentence.trim()) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Chính xác!</b> Câu hoàn chỉnh: <i>"${correctSentence}"</i>`;
      fb.style.display = 'block';
      playSuccessSound();
      addXP(20, 'Ghép câu hoàn chỉnh');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `❌ <b>Chưa đúng thứ tự!</b> Hãy thử suy nghĩ lại hoặc bấm nút Xếp lại.`;
      fb.style.display = 'block';
      playWrongSound();
    }
  };

  window.checkErrorFix = function(idx, errorWord, correctWord, explain) {
    const userErr = document.getElementById(`err-word-${idx}`)?.value.trim().toLowerCase();
    const userFix = document.getElementById(`err-fix-${idx}`)?.value.trim().toLowerCase();
    const fb = document.getElementById(`err-fb-${idx}`);
    if (!fb) return;

    if (userErr === errorWord?.toLowerCase() && (userFix === correctWord?.toLowerCase() || userFix.includes(correctWord?.toLowerCase()))) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Chính xác!</b> ${explain}`;
      fb.style.display = 'block';
      playSuccessSound();
      addXP(20, 'Sửa lỗi ngữ pháp');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `❌ <b>Chưa chính xác!</b> Từ sai là "<b>${errorWord}</b>" ➔ sửa thành "<b>${correctWord}</b>".<br>${explain}`;
      fb.style.display = 'block';
      playWrongSound();
    }
  };
}
