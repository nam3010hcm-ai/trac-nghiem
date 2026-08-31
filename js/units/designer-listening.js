/**
 * MODULE DESIGNER LISTENING SKILL (js/units/designer-listening.js)
 * Giao diện soạn thảo kỹ năng Listening: Audio Script, câu hỏi MCQ, Điền từ, Tự luận
 */
import { esc } from '../common.js';

export function renderListeningDesignerExercises(exercises = []) {
  if (!exercises.length) {
    exercises = [
      {
        type: 'mcq',
        question: 'What is the main topic of the conversation?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 0,
        explain: 'The audio mentions...'
      }
    ];
  }

  return exercises.map((ex, idx) => {
    const isMcq = ex.type === 'mcq' || !ex.type;
    const isFill = ex.type === 'fill_blank';
    const isEssay = ex.type === 'essay';

    return `
      <div class="ud-lis-ex-card card" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#dbeafe; color:#1e40af; font-size:12px; font-weight:800; padding:2px 8px; border-radius:4px;">Câu ${idx + 1}</span>
            <select class="ud-lis-ex-type" onchange="window.onListeningExTypeChange(this)" style="padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px; font-weight:700;">
              <option value="mcq" ${isMcq ? 'selected' : ''}>Trắc nghiệm 4 lựa chọn (MCQ)</option>
              <option value="fill_blank" ${isFill ? 'selected' : ''}>Điền từ vào chỗ trống</option>
              <option value="essay" ${isEssay ? 'selected' : ''}>Câu hỏi tự luận ngắn / Tóm tắt</option>
            </select>
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.removeListeningExerciseCard(this)" style="padding:2px 8px; font-size:11px;">🗑️ Xóa câu</button>
        </div>

        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px; font-weight:700;">Nội dung câu hỏi / Hướng dẫn *</label>
          <input type="text" class="ud-lis-ex-question" value="${esc(ex.question || '')}" placeholder="VD: What is the main idea of the recording?">
        </div>

        <div class="ud-lis-ex-mcq-box" style="display:${isMcq ? 'block' : 'none'};">
          <label style="font-size:11.5px; font-weight:700; color:#475569; margin-bottom:6px; display:block;">Các phương án lựa chọn:</label>
          <div class="grid2" style="gap:8px; margin-bottom:10px;">
            ${[0, 1, 2, 3].map(optIdx => `
              <div>
                <input type="text" class="ud-lis-ex-opt-${optIdx}" value="${esc(ex.options?.[optIdx] || '')}" placeholder="Lựa chọn ${['A', 'B', 'C', 'D'][optIdx]}">
              </div>
            `).join('')}
          </div>
          <div class="fg" style="margin-bottom:10px;">
            <label style="font-size:12px; font-weight:700; color:#16a34a;">Đáp án đúng:</label>
            <select class="ud-lis-ex-ans" style="padding:6px 10px; border-radius:6px; border:1px solid #86efac; background:#f0fdf4; font-weight:700; color:#166534;">
              <option value="0" ${ex.answer === 0 ? 'selected' : ''}>A (Phương án 1)</option>
              <option value="1" ${ex.answer === 1 ? 'selected' : ''}>B (Phương án 2)</option>
              <option value="2" ${ex.answer === 2 ? 'selected' : ''}>C (Phương án 3)</option>
              <option value="3" ${ex.answer === 3 ? 'selected' : ''}>D (Phương án 4)</option>
            </select>
          </div>
        </div>

        <div class="ud-lis-ex-fill-box" style="display:${isFill ? 'block' : 'none'}; margin-bottom:10px;">
          <div class="fg" style="margin-bottom:6px;">
            <label style="font-size:12px; font-weight:700; color:#0284c7;">Từ khóa đáp án đúng (cách nhau bằng dấu gạch đứng | nếu có nhiều từ):</label>
            <input type="text" class="ud-lis-ex-fill-ans" value="${esc(Array.isArray(ex.answer) ? ex.answer.join(' | ') : (ex.answer || ''))}" placeholder="VD: international | global">
          </div>
        </div>

        <div class="ud-lis-ex-essay-box" style="display:${isEssay ? 'block' : 'none'}; margin-bottom:10px;">
          <div class="fg" style="margin-bottom:6px;">
            <label style="font-size:12px; font-weight:700; color:#7c3aed;">Gợi ý câu trả lời mẫu / Rubric chấm điểm:</label>
            <textarea class="ud-lis-ex-essay-hint" style="min-height:60px;" placeholder="VD: Học viên cần nêu được ít nhất 2 luận điểm...">${esc(ex.explain || '')}</textarea>
          </div>
        </div>

        <div class="fg" style="margin:0;">
          <label style="font-size:11.5px; color:#64748b;">Giải thích / Script dẫn chứng:</label>
          <input type="text" class="ud-lis-ex-explain" value="${esc(ex.explain || '')}" placeholder="VD: Trong đoạn băng có đoạn: '...' chứng minh đáp án.">
        </div>
      </div>
    `;
  }).join('');
}

export function extractListeningExercisesFromDOM() {
  const cards = document.querySelectorAll('#ud-lis-exercises-list .ud-lis-ex-card');
  const exercises = [];

  cards.forEach(card => {
    const type = card.querySelector('.ud-lis-ex-type')?.value || 'mcq';
    const question = card.querySelector('.ud-lis-ex-question')?.value.trim() || '';
    const explain = card.querySelector('.ud-lis-ex-explain')?.value.trim() || '';

    if (type === 'mcq') {
      const opts = [
        card.querySelector('.ud-lis-ex-opt-0')?.value.trim() || 'Option A',
        card.querySelector('.ud-lis-ex-opt-1')?.value.trim() || 'Option B',
        card.querySelector('.ud-lis-ex-opt-2')?.value.trim() || 'Option C',
        card.querySelector('.ud-lis-ex-opt-3')?.value.trim() || 'Option D'
      ];
      const ans = parseInt(card.querySelector('.ud-lis-ex-ans')?.value || '0', 10);
      exercises.push({ type, question, options: opts, answer: ans, explain });
    } else if (type === 'fill_blank') {
      const fillRaw = card.querySelector('.ud-lis-ex-fill-ans')?.value.trim() || '';
      const ans = fillRaw.split('|').map(s => s.trim()).filter(Boolean);
      exercises.push({ type, question, answer: ans, explain });
    } else if (type === 'essay') {
      const hint = card.querySelector('.ud-lis-ex-essay-hint')?.value.trim() || '';
      exercises.push({ type, question, explain: hint || explain });
    }
  });

  return exercises;
}

if (typeof window !== 'undefined') {
  window.onListeningExTypeChange = function(sel) {
    const card = sel.closest('.ud-lis-ex-card');
    if (!card) return;
    const type = sel.value;
    const mcqBox = card.querySelector('.ud-lis-ex-mcq-box');
    const fillBox = card.querySelector('.ud-lis-ex-fill-box');
    const essayBox = card.querySelector('.ud-lis-ex-essay-box');

    if (mcqBox) mcqBox.style.display = type === 'mcq' ? 'block' : 'none';
    if (fillBox) fillBox.style.display = type === 'fill_blank' ? 'block' : 'none';
    if (essayBox) essayBox.style.display = type === 'essay' ? 'block' : 'none';
  };

  window.addListeningExerciseCard = function() {
    const list = document.getElementById('ud-lis-exercises-list');
    if (!list) return;
    const curCount = list.querySelectorAll('.ud-lis-ex-card').length;
    const dummy = [{
      type: 'mcq',
      question: `Listening Question ${curCount + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 0,
      explain: ''
    }];
    list.insertAdjacentHTML('beforeend', renderListeningDesignerExercises(dummy));
  };

  window.removeListeningExerciseCard = function(btn) {
    const card = btn.closest('.ud-lis-ex-card');
    if (card) card.remove();
  };
}
