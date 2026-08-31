/**
 * MODULE DESIGNER READING EXERCISES (js/units/designer-reading-exercises.js)
 * 10 dạng bài tập đọc hiểu chuyên sâu: Pre-reading, Skimming, Scanning, Matching, T/F, Cloze, Sequencing
 */
import { esc } from '../common.js';

export function renderReadingDesignerExercises(exercises = []) {
  if (!exercises.length) return '<div class="empty-placeholder" style="text-align:center; padding:20px; color:#64748b;">Chưa có bài tập đọc hiểu nào. Hãy thêm bài tập bên dưới!</div>';

  return exercises.map((ex, idx) => {
    const type = ex.type || 'mcq_group';
    const isMatching = type === 'matching';
    const isMcqGroup = type === 'mcq_group';
    const isTf = type === 'true_false_group';

    return `
      <div class="ud-read-ex-card card" data-exidx="${idx}" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:16px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#f0fdf4; color:#166534; font-size:12px; font-weight:800; padding:2px 8px; border-radius:4px;">Bài tập #${idx + 1}</span>
            <span style="font-size:12.5px; font-weight:700; color:#334155;">${esc(ex.title || 'Bài tập đọc hiểu')}</span>
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.removeReadingExerciseCard(this)" style="padding:2px 8px; font-size:11px;">🗑️ Xóa bài tập</button>
        </div>

        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px; font-weight:700;">Tiêu đề bài tập *</label>
          <input type="text" class="ud-read-ex-title" value="${esc(ex.title || '')}" placeholder="VD: Exercise 1. Skimming – Read for main ideas">
        </div>

        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px;">Hướng dẫn làm bài (Subtitle)</label>
          <input type="text" class="ud-read-ex-subtitle" value="${esc(ex.subtitle || '')}" placeholder="VD: Read the text quickly and choose the best option...">
        </div>

        ${isMatching ? `
          <div class="read-matching-box" style="margin-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:12px; font-weight:700; color:#4f46e5;">Cặp từ nối (Matching Pairs 1–8 với a–h):</label>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-sm" onclick="window.toggleReadingMatchQuickPaste(this)" style="font-size:11px; padding:2px 6px;">⚡ Dán nhanh</button>
                <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingMatchPairToCard(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm cặp</button>
              </div>
            </div>
            <div class="read-match-quick-drawer" style="display:none; background:#f8fafc; border:1px dashed #6366f1; border-radius:6px; padding:8px; margin-bottom:8px;">
              <textarea class="read-match-quick-input" placeholder="VD:&#10;core = The central part&#10;sacrifice = To give up something" style="width:100%; min-height:60px; font-size:11.5px; margin-bottom:4px;"></textarea>
              <div style="display:flex; justify-content:flex-end; gap:4px;">
                <button type="button" class="btn btn-sm btn-p" onclick="window.processReadingMatchQuickPaste(this)" style="font-size:11px;">Nạp</button>
              </div>
            </div>
            <div class="read-match-pairs-container" style="display:flex; flex-direction:column; gap:6px;">
              ${(ex.pairs || []).map((p, pIdx) => `
                <div class="read-match-pair-row" style="display:flex; gap:6px; align-items:center; background:#f8fafc; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${pIdx + 1}</span>
                  <input type="text" class="read-match-pair-word" value="${esc(p.word || '')}" placeholder="Từ / Cụm từ" style="flex:1; font-size:12px;">
                  <span style="font-size:12px; font-weight:bold; color:#6366f1;">➔</span>
                  <input type="text" class="read-match-pair-letter" value="${esc(p.letter || String.fromCharCode(97 + pIdx))}" placeholder="a, b..." style="width:40px; text-align:center; font-weight:700; font-size:12px;">
                  <input type="text" class="read-match-pair-def" value="${esc(p.definition || '')}" placeholder="Định nghĩa tiếng Anh" style="flex:2; font-size:12px;">
                  <button type="button" class="btn-icon-del" onclick="window.removeReadingMatchPairRow(this)" title="Xóa cặp này">🗑️</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${isMcqGroup ? `
          <div class="read-mcq-group-box" style="margin-top:10px;">
            <label style="font-size:12px; font-weight:700; color:#0369a1; margin-bottom:8px; display:block;">Danh sách câu hỏi trắc nghiệm:</label>
            <div class="read-mcq-items-container" style="display:flex; flex-direction:column; gap:8px;">
              ${(ex.items || []).map((item, itIdx) => `
                <div class="read-mcq-item-card" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px;">
                  <div style="font-weight:700; font-size:12px; color:#0f172a; margin-bottom:6px;">Câu ${itIdx + 1}:</div>
                  <input type="text" class="read-mcq-q-text" value="${esc(item.question || '')}" placeholder="Nội dung câu hỏi..." style="width:100%; margin-bottom:6px; font-size:12.5px;">
                  <div class="grid2" style="gap:6px; margin-bottom:6px;">
                    ${[0, 1, 2, 3].map(optIdx => `
                      <input type="text" class="read-mcq-opt-${optIdx}" value="${esc(item.options?.[optIdx] || '')}" placeholder="Lựa chọn ${['A', 'B', 'C', 'D'][optIdx]}" style="font-size:12px;">
                    `).join('')}
                  </div>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <div style="font-size:11.5px; font-weight:700; color:#166534;">Đáp án đúng:</div>
                    <select class="read-mcq-ans" style="padding:4px 8px; border-radius:6px; border:1px solid #86efac; background:#f0fdf4; font-weight:700;">
                      <option value="0" ${item.answer === 0 ? 'selected' : ''}>A</option>
                      <option value="1" ${item.answer === 1 ? 'selected' : ''}>B</option>
                      <option value="2" ${item.answer === 2 ? 'selected' : ''}>C</option>
                      <option value="3" ${item.answer === 3 ? 'selected' : ''}>D</option>
                    </select>
                    <input type="text" class="read-mcq-explain" value="${esc(item.explain || '')}" placeholder="Giải thích đáp án..." style="flex:1; font-size:11.5px;">
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${isTf ? `
          <div class="read-tf-group-box" style="margin-top:10px;">
            <label style="font-size:12px; font-weight:700; color:#92400e; margin-bottom:8px; display:block;">Danh sách nhận định True / False:</label>
            <div class="read-tf-items-container" style="display:flex; flex-direction:column; gap:6px;">
              ${(ex.items || []).map((item, itIdx) => `
                <div class="read-tf-item-row" style="display:flex; gap:8px; align-items:center; background:#f8fafc; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:#64748b;">${itIdx + 1}</span>
                  <input type="text" class="read-tf-statement" value="${esc(item.statement || '')}" placeholder="Nội dung nhận định..." style="flex:1; font-size:12px;">
                  <select class="read-tf-ans" style="padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px;">
                    <option value="true" ${item.answer === true ? 'selected' : ''}>True (Đúng)</option>
                    <option value="false" ${item.answer === false ? 'selected' : ''}>False (Sai)</option>
                  </select>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

export function extractReadingExercisesFromDOM(existingExercises = []) {
  const cards = document.querySelectorAll('#ud-read-exercises-list .ud-read-ex-card');
  if (!cards.length) return existingExercises;

  const result = [];
  cards.forEach((card, idx) => {
    const orig = existingExercises[idx] || {};
    const title = card.querySelector('.ud-read-ex-title')?.value.trim() || orig.title || `Exercise ${idx + 1}`;
    const subtitle = card.querySelector('.ud-read-ex-subtitle')?.value.trim() || orig.subtitle || '';

    const updated = { ...orig, title, subtitle };

    if (orig.type === 'matching') {
      const pairRows = card.querySelectorAll('.read-match-pair-row');
      if (pairRows.length) {
        const pairs = [];
        pairRows.forEach((r, pIdx) => {
          pairs.push({
            id: pIdx + 1,
            word: r.querySelector('.read-match-pair-word')?.value.trim() || '',
            letter: r.querySelector('.read-match-pair-letter')?.value.trim() || String.fromCharCode(97 + pIdx),
            definition: r.querySelector('.read-match-pair-def')?.value.trim() || ''
          });
        });
        updated.pairs = pairs;
      }
    } else if (orig.type === 'mcq_group') {
      const itemCards = card.querySelectorAll('.read-mcq-item-card');
      if (itemCards.length) {
        const items = [];
        itemCards.forEach(ic => {
          items.push({
            question: ic.querySelector('.read-mcq-q-text')?.value.trim() || '',
            options: [
              ic.querySelector('.read-mcq-opt-0')?.value.trim() || 'Option A',
              ic.querySelector('.read-mcq-opt-1')?.value.trim() || 'Option B',
              ic.querySelector('.read-mcq-opt-2')?.value.trim() || 'Option C',
              ic.querySelector('.read-mcq-opt-3')?.value.trim() || 'Option D'
            ],
            answer: parseInt(ic.querySelector('.read-mcq-ans')?.value || '0', 10),
            explain: ic.querySelector('.read-mcq-explain')?.value.trim() || ''
          });
        });
        updated.items = items;
      }
    } else if (orig.type === 'true_false_group') {
      const tfRows = card.querySelectorAll('.read-tf-item-row');
      if (tfRows.length) {
        const items = [];
        tfRows.forEach(tr => {
          items.push({
            statement: tr.querySelector('.read-tf-statement')?.value.trim() || '',
            answer: tr.querySelector('.read-tf-ans')?.value === 'true',
            explain: ''
          });
        });
        updated.items = items;
      }
    }

    result.push(updated);
  });

  return result;
}

if (typeof window !== 'undefined') {
  window.addReadingMatchPairToCard = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    if (!card) return;
    const container = card.querySelector('.read-match-pairs-container');
    if (!container) return;
    const curCount = container.querySelectorAll('.read-match-pair-row').length;
    const nextLetter = String.fromCharCode(97 + (curCount % 26));
    const row = document.createElement('div');
    row.className = 'read-match-pair-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#f8fafc;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${curCount + 1}</span>
      <input type="text" class="read-match-pair-word" value="" placeholder="Từ / Cụm từ" style="flex:1;font-size:12px;">
      <span style="font-size:12px;font-weight:bold;color:#6366f1;">➔</span>
      <input type="text" class="read-match-pair-letter" value="${nextLetter}" placeholder="a, b..." style="width:40px;text-align:center;font-weight:700;font-size:12px;">
      <input type="text" class="read-match-pair-def" value="" placeholder="Định nghĩa tiếng Anh" style="flex:2;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingMatchPairRow(this)" title="Xóa cặp này">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.removeReadingMatchPairRow = function(btn) {
    const row = btn.closest('.read-match-pair-row');
    if (row) row.remove();
  };

  window.removeReadingExerciseCard = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    if (card) card.remove();
  };

  window.toggleReadingMatchQuickPaste = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    if (!card) return;
    const drawer = card.querySelector('.read-match-quick-drawer');
    if (drawer) drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  };

  window.processReadingMatchQuickPaste = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    if (!card) return;
    const input = card.querySelector('.read-match-quick-input');
    const container = card.querySelector('.read-match-pairs-container');
    if (!input || !container) return;

    const text = input.value.trim();
    if (!text) {
      alert("Vui lòng nhập danh sách cặp nối từ!");
      return;
    }

    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    container.innerHTML = '';

    rawLines.forEach((line, i) => {
      let l = line.replace(/^[0-9]+[\.\)\-]\s*/, '').trim();
      const parts = l.split(/\s*[:=–—\t]+\s*|\s+-\s+/);
      const w = parts[0]?.trim() || '';
      const d = parts.slice(1).join(' ').trim() || '';
      const letter = String.fromCharCode(97 + (i % 26));

      const row = document.createElement('div');
      row.className = 'read-match-pair-row';
      row.style = 'display:flex;gap:6px;align-items:center;background:#f8fafc;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
      row.innerHTML = `
        <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${i + 1}</span>
        <input type="text" class="read-match-pair-word" value="${esc(w)}" placeholder="Từ / Cụm từ" style="flex:1;font-size:12px;">
        <span style="font-size:12px;font-weight:bold;color:#6366f1;">➔</span>
        <input type="text" class="read-match-pair-letter" value="${letter}" placeholder="a, b..." style="width:40px;text-align:center;font-weight:700;font-size:12px;">
        <input type="text" class="read-match-pair-def" value="${esc(d)}" placeholder="Định nghĩa tiếng Anh" style="flex:2;font-size:12px;">
        <button type="button" class="btn-icon-del" onclick="window.removeReadingMatchPairRow(this)" title="Xóa cặp này">🗑️</button>
      `;
      container.appendChild(row);
    });

    input.value = '';
    window.toggleReadingMatchQuickPaste(btn);
  };
}
