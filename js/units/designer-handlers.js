/**
 * MODULE DESIGNER INTERACTIVE HANDLERS (js/units/designer-handlers.js)
 * Toàn bộ các handler thao tác nhanh: Thêm/Xóa dòng động từ, Trắc nghiệm, Cặp nối, Thẻ 3D & Xếp chữ
 */
import { esc } from '../common.js';
import { _currentLfSubTab, setCurrentLfSubTab } from './units-state.js';
import { renderLanguageFocusDesigner } from './designer-lang-focus.js';

export function switchLfSubTab(subTab) {
  if (typeof window.syncCurrentDesignerSkillToDraft === 'function') {
    window.syncCurrentDesignerSkillToDraft();
  }
  setCurrentLfSubTab(subTab);
  const contentWrap = document.getElementById('ud-skill-content');
  if (contentWrap && window._currentDraftUnit) {
    contentWrap.innerHTML = renderLanguageFocusDesigner(window._currentDraftUnit);
    if (typeof window.autoFitAllDesignerTextareas === 'function') {
      window.autoFitAllDesignerTextareas();
    }
  }
}

export function addLfPastVerbRow(inf = '', past = '', meaning = '') {
  const tbody = document.getElementById('ud-lf-verbs-tbody');
  if (!tbody) return;
  const curCount = tbody.querySelectorAll('tr.lf-verb-row').length;
  const tr = document.createElement('tr');
  tr.className = 'lf-verb-row';
  tr.innerHTML = `
    <td class="lf-row-num" style="text-align:center;font-weight:700;color:#64748b;">${curCount + 1}</td>
    <td><input type="text" class="lf-verb-inf" value="${esc(inf)}" placeholder="VD: go"></td>
    <td><input type="text" class="lf-verb-past" value="${esc(past)}" placeholder="VD: went"></td>
    <td><input type="text" class="lf-verb-meaning" value="${esc(meaning)}" placeholder="VD: đi"></td>
    <td style="text-align:center;">
      <button type="button" class="btn-icon-del" onclick="window.removeLfPastVerbRow(this)" title="Xóa dòng này">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);
  updateLfVerbsIndices();
}

export function removeLfPastVerbRow(btn) {
  const row = btn.closest('tr.lf-verb-row');
  if (row) {
    row.remove();
    updateLfVerbsIndices();
  }
}

export function updateLfVerbsIndices() {
  const rows = document.querySelectorAll('#ud-lf-verbs-tbody tr.lf-verb-row');
  rows.forEach((r, idx) => {
    const numEl = r.querySelector('.lf-row-num');
    if (numEl) numEl.textContent = idx + 1;
  });
  const badge = document.getElementById('badge-lf-verbs');
  if (badge) badge.textContent = rows.length;
}

export function toggleLfPastQuickPaste() {
  const el = document.getElementById('ud-lf-past-quick-drawer');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

export function processLfPastQuickPaste() {
  const input = document.getElementById('ud-lf-past-quick-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const lines = text.split('\n');
  lines.forEach(line => {
    const l = line.trim();
    if (!l) return;
    const parts = l.split(/\s*[-–—\t,;|]+\s*/);
    if (parts.length >= 2) {
      addLfPastVerbRow(parts[0]?.trim() || '', parts[1]?.trim() || '', parts.slice(2).join(', ').trim() || '');
    } else if (parts.length === 1 && parts[0]) {
      addLfPastVerbRow(parts[0].trim(), '', '');
    }
  });
  input.value = '';
  toggleLfPastQuickPaste();
}

export function loadSampleLfPastVerbs() {
  const samples = [
    { infinitive: 'go', past: 'went', meaning: 'đi' },
    { infinitive: 'see', past: 'saw', meaning: 'thấy, nhìn' },
    { infinitive: 'buy', past: 'bought', meaning: 'mua' },
    { infinitive: 'take', past: 'took', meaning: 'cầm, lấy' },
    { infinitive: 'make', past: 'made', meaning: 'làm, chế tạo' },
    { infinitive: 'write', past: 'wrote', meaning: 'viết' },
    { infinitive: 'read', past: 'read', meaning: 'đọc' },
    { infinitive: 'build', past: 'built', meaning: 'xây dựng' },
    { infinitive: 'speak', past: 'spoke', meaning: 'nói' },
    { infinitive: 'find', past: 'found', meaning: 'tìm thấy' }
  ];
  const tbody = document.getElementById('ud-lf-verbs-tbody');
  if (tbody) tbody.innerHTML = '';
  samples.forEach(s => addLfPastVerbRow(s.infinitive, s.past, s.meaning));
}

export function clearAllLfPastVerbs() {
  if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách động từ này?")) return;
  const tbody = document.getElementById('ud-lf-verbs-tbody');
  if (tbody) tbody.innerHTML = '';
  updateLfVerbsIndices();
}

export function addLfGrammarQuestion(q = '', opts = ['Option A', 'Option B', 'Option C', 'Option D'], ans = 0, exp = '') {
  const list = document.getElementById('ud-lf-grammar-list');
  if (!list) return;
  const curCount = list.querySelectorAll('.lf-gm-card').length;
  const card = document.createElement('div');
  card.className = 'lf-gm-card card';
  card.style = 'padding:16px;border:1.5px solid #cbd5e1;border-radius:12px;background:#ffffff;margin:0;';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
      <span class="gm-q-badge" style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">Câu hỏi #${curCount + 1}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfGrammarQuestion(this)" title="Xóa câu hỏi này">🗑️ Xóa câu</button>
    </div>
    <div class="fg" style="margin-bottom:10px;">
      <label style="font-weight:700;font-size:12.5px;color:#0f172a;">Nội dung câu hỏi (Dùng ___ cho vị trí cần điền) *</label>
      <input type="text" class="lf-gm-question" value="${esc(q)}" placeholder="VD: She ___ English for five years.">
    </div>
    <div class="grid2" style="margin-bottom:10px;">
      <div class="fg" style="margin:0;"><label style="font-size:11.5px;color:#64748b;">Đáp án A</label><input type="text" class="lf-gm-opt-0" value="${esc(opts[0] || '')}"></div>
      <div class="fg" style="margin:0;"><label style="font-size:11.5px;color:#64748b;">Đáp án B</label><input type="text" class="lf-gm-opt-1" value="${esc(opts[1] || '')}"></div>
    </div>
    <div class="grid2" style="margin-bottom:12px;">
      <div class="fg" style="margin:0;"><label style="font-size:11.5px;color:#64748b;">Đáp án C</label><input type="text" class="lf-gm-opt-2" value="${esc(opts[2] || '')}"></div>
      <div class="fg" style="margin:0;"><label style="font-size:11.5px;color:#64748b;">Đáp án D</label><input type="text" class="lf-gm-opt-3" value="${esc(opts[3] || '')}"></div>
    </div>
    <div class="grid2" style="margin:0;">
      <div class="fg" style="margin:0;">
        <label style="font-size:12px;font-weight:700;color:#16a34a;">Đáp án đúng *</label>
        <select class="lf-gm-ans" style="padding:7px 10px;border-radius:6px;border:1.5px solid #86efac;background:#f0fdf4;font-weight:700;color:#166534;">
          <option value="0" ${ans === 0 ? 'selected' : ''}>A</option>
          <option value="1" ${ans === 1 ? 'selected' : ''}>B</option>
          <option value="2" ${ans === 2 ? 'selected' : ''}>C</option>
          <option value="3" ${ans === 3 ? 'selected' : ''}>D</option>
        </select>
      </div>
      <div class="fg" style="margin:0;">
        <label style="font-size:12px;color:#64748b;">Giải thích chi tiết (Explain)</label>
        <input type="text" class="lf-gm-explain" value="${esc(exp)}" placeholder="VD: Giải thích...">
      </div>
    </div>
  `;
  list.appendChild(card);
  updateLfGrammarIndices();
}

export function removeLfGrammarQuestion(btn) {
  const card = btn.closest('.lf-gm-card');
  if (card) {
    card.remove();
    updateLfGrammarIndices();
  }
}

export function updateLfGrammarIndices() {
  const cards = document.querySelectorAll('#ud-lf-grammar-list .lf-gm-card');
  cards.forEach((c, idx) => {
    const badge = c.querySelector('.gm-q-badge');
    if (badge) badge.textContent = `Câu hỏi #${idx + 1}`;
  });
  const badge = document.getElementById('badge-lf-grammar');
  if (badge) badge.textContent = cards.length;
}

export function loadSampleLfGrammar() {
  addLfGrammarQuestion('She ___ English for five years.', ['has learned', 'is learning', 'learns', 'learned'], 0, 'Thì Hiện tại hoàn thành.');
  addLfGrammarQuestion('While I was walking home, it ___ to rain heavily.', ['starts', 'started', 'was starting', 'has started'], 1, 'Hành động ngắn cắt ngang.');
}

export function addLfMatchPair(left = '', right = '') {
  const list = document.getElementById('ud-lf-pairs-list');
  if (!list) return;
  const curCount = list.querySelectorAll('.lf-pair-row').length;
  const row = document.createElement('div');
  row.className = 'lf-pair-row';
  row.style = 'display:flex;gap:10px;align-items:center;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px;';
  row.innerHTML = `
    <div class="lf-pair-num" style="width:28px;text-align:center;font-weight:800;color:#64748b;font-size:12px;">#${curCount + 1}</div>
    <div style="flex:1;"><input type="text" class="lf-pair-left" value="${esc(left)}" placeholder="Thuật ngữ tiếng Anh"></div>
    <div style="font-size:18px;color:#3b82f6;font-weight:bold;">⇄</div>
    <div style="flex:1;"><input type="text" class="lf-pair-right" value="${esc(right)}" placeholder="Nghĩa tiếng Việt"></div>
    <button type="button" class="btn-icon-del" onclick="window.removeLfMatchPair(this)" title="Xóa cặp này">🗑️</button>
  `;
  list.appendChild(row);
  updateLfPairsIndices();
}

export function removeLfMatchPair(btn) {
  const row = btn.closest('.lf-pair-row');
  if (row) {
    row.remove();
    updateLfPairsIndices();
  }
}

export function updateLfPairsIndices() {
  const rows = document.querySelectorAll('#ud-lf-pairs-list .lf-pair-row');
  rows.forEach((r, idx) => {
    const numEl = r.querySelector('.lf-pair-num');
    if (numEl) numEl.textContent = `#${idx + 1}`;
  });
  const badge = document.getElementById('badge-lf-pairs');
  if (badge) badge.textContent = rows.length;
}

export function toggleLfPairQuickPaste() {
  const el = document.getElementById('ud-lf-pair-quick-drawer');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

export function processLfPairQuickPaste() {
  const input = document.getElementById('ud-lf-pair-quick-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  rawLines.forEach(line => {
    let l = line.replace(/^[0-9]+[\.\)\-]\s*/, '').trim();
    const parts = l.split(/\s*[:=–—\t]+\s*|\s+-\s+/);
    if (parts.length >= 2) {
      addLfMatchPair(parts[0].trim(), parts.slice(1).join(' ').trim());
    } else if (parts.length === 1 && parts[0]) {
      addLfMatchPair(parts[0].trim(), '');
    }
  });
  input.value = '';
  toggleLfPairQuickPaste();
}

export function loadSampleLfMatchPairs() {
  addLfMatchPair('Piece of cake', 'Rất dễ dàng, dễ như ăn bánh');
  addLfMatchPair('Break a leg', 'Chúc may mắn trong buổi biểu diễn');
  addLfMatchPair('Combat Engineer', 'Binh chủng Công binh');
}

export function addLfFlashcard(cardData = {}) {
  const list = document.getElementById('ud-lf-cards-list');
  if (!list) return;
  const idx = list.querySelectorAll('.lf-fc-card').length;
  const cardId = cardData.id || `fc_${idx + 1}`;
  const posVal = cardData.pos || 'noun';
  const imgInputId = `ud-fc-img-${idx}-${Date.now().toString(36)}`;
  const imgPrevId = `ud-fc-prev-${idx}-${Date.now().toString(36)}`;

  const card = document.createElement('div');
  card.className = 'lf-fc-card card';
  card.id = `card-${cardId}`;
  card.style = 'padding:16px;border:1.5px solid #cbd5e1;border-radius:12px;background:#ffffff;margin:0;box-shadow:0 2px 6px rgba(0,0,0,0.03);';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
      <span class="lf-fc-num-badge" style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">Thẻ #${idx + 1}</span>
      <div style="display:flex;gap:6px;">
        <button type="button" class="btn btn-sm" onclick="window.duplicateLfFlashcard(this)" style="background:#f8fafc;border:1px solid #cbd5e1;color:#475569;">📋 Nhân bản</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfFlashcard(this)">🗑️ Xóa</button>
      </div>
    </div>
    <div class="grid3" style="margin-bottom:10px;">
      <div class="fg" style="margin:0;"><label style="font-size:12px;font-weight:700;">Từ vựng (Word) *</label><input type="text" class="lf-fc-word" value="${esc(cardData.word || '')}"></div>
      <div class="fg" style="margin:0;"><label style="font-size:12px;">Từ loại (POS)</label><input type="text" class="lf-fc-pos" value="${esc(posVal)}"></div>
      <div class="fg" style="margin:0;"><label style="font-size:12px;">Phiên âm IPA</label><input type="text" class="lf-fc-ipa" value="${esc(cardData.ipa || '')}"></div>
    </div>
    <div class="grid2" style="margin-bottom:10px;">
      <div class="fg" style="margin:0;"><label style="font-size:12px;font-weight:700;">Nghĩa tiếng Việt *</label><input type="text" class="lf-fc-meaning" value="${esc(cardData.meaning || '')}"></div>
      <div class="fg" style="margin:0;"><label style="font-size:12px;">Từ đồng nghĩa (Synonyms)</label><input type="text" class="lf-fc-synonyms" value="${esc(cardData.synonyms || '')}"></div>
    </div>
    <div class="fg" style="margin-bottom:10px;">
      <label style="font-size:12px;">🖼️ URL Hình ảnh minh họa</label>
      <input type="text" id="${imgInputId}" class="lf-fc-image" value="${esc(cardData.image || '')}">
    </div>
    <div class="fg" style="margin:0;">
      <label style="font-size:12px;">Ví dụ thực tế (Example)</label>
      <input type="text" class="lf-fc-example" value="${esc(cardData.example || '')}">
    </div>
  `;
  list.appendChild(card);
  updateLfCardsIndices();
}

export function removeLfFlashcard(btn) {
  const card = btn.closest('.lf-fc-card');
  if (card) {
    card.remove();
    updateLfCardsIndices();
  }
}

export function duplicateLfFlashcard(btn) {
  const card = btn.closest('.lf-fc-card');
  if (!card) return;
  addLfFlashcard({
    word: (card.querySelector('.lf-fc-word')?.value.trim() || '') + ' (Bản sao)',
    pos: card.querySelector('.lf-fc-pos')?.value || 'noun',
    ipa: card.querySelector('.lf-fc-ipa')?.value.trim() || '',
    meaning: card.querySelector('.lf-fc-meaning')?.value.trim() || '',
    synonyms: card.querySelector('.lf-fc-synonyms')?.value.trim() || '',
    image: card.querySelector('.lf-fc-image')?.value.trim() || '',
    example: card.querySelector('.lf-fc-example')?.value.trim() || ''
  });
}

export function updateLfCardsIndices() {
  const cards = document.querySelectorAll('#ud-lf-cards-list .lf-fc-card');
  cards.forEach((c, idx) => {
    const badge = c.querySelector('.lf-fc-num-badge');
    if (badge) badge.textContent = `Thẻ #${idx + 1}`;
  });
  const badge = document.getElementById('badge-lf-cards');
  if (badge) badge.textContent = cards.length;
}

export function loadSampleLfFlashcards() {
  addLfFlashcard({
    word: 'Enthusiastic',
    pos: 'adjective',
    ipa: '/ɪnˌθjuː.ziˈæs.tɪk/',
    meaning: 'Hăng hái, nhiệt tình',
    synonyms: 'Eager, passionate',
    example: 'She was enthusiastic about learning.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600'
  });
}

export function addLfSpellingCard(data = {}) {
  const list = document.getElementById('ud-lf-spelling-list');
  if (!list) return;
  const curCount = list.querySelectorAll('.lf-spelling-card').length;
  const target = (data.targetWord || '').toUpperCase();
  const scrambled = (data.scrambled || '').toUpperCase() || (target ? target.split('').reverse().join('') : '');

  const card = document.createElement('div');
  card.className = 'lf-spelling-card card';
  card.style = 'padding:16px;border:1.5px solid #cbd5e1;border-radius:12px;background:#ffffff;margin:0;';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
      <span class="spelling-q-badge" style="background:#f3e8ff;color:#7e22ce;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">Từ vựng #${curCount + 1}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfSpellingCard(this)">🗑️ Xóa</button>
    </div>
    <div class="grid2" style="margin-bottom:10px;">
      <div class="fg" style="margin:0;"><label style="font-weight:700;font-size:12px;color:#16a34a;">Từ vựng mục tiêu *</label><input type="text" class="lf-sp-target" value="${esc(target)}" style="font-weight:800;text-transform:uppercase;"></div>
      <div class="fg" style="margin:0;"><label style="font-size:12px;color:#64748b;">Dạng xáo trộn</label><input type="text" class="lf-sp-scrambled" value="${esc(scrambled)}" style="font-weight:700;text-transform:uppercase;"></div>
    </div>
    <div class="fg" style="margin-bottom:10px;"><label style="font-size:12px;font-weight:700;">Định nghĩa *</label><input type="text" class="lf-sp-clue" value="${esc(data.clue || '')}"></div>
    <div class="fg" style="margin:0;"><label style="font-size:12px;color:#64748b;">Gợi ý (Hint)</label><input type="text" class="lf-sp-hint" value="${esc(data.hint || '')}"></div>
  `;
  list.appendChild(card);
  updateLfSpellingIndices();
}

export function removeLfSpellingCard(btn) {
  const card = btn.closest('.lf-spelling-card');
  if (card) {
    card.remove();
    updateLfSpellingIndices();
  }
}

export function updateLfSpellingIndices() {
  const cards = document.querySelectorAll('#ud-lf-spelling-list .lf-spelling-card');
  cards.forEach((c, idx) => {
    const badge = c.querySelector('.spelling-q-badge');
    if (badge) badge.textContent = `Từ vựng #${idx + 1}`;
  });
  const badge = document.getElementById('badge-lf-spelling');
  if (badge) badge.textContent = cards.length;
}

export function loadSampleLfSpelling() {
  addLfSpellingCard({
    targetWord: 'PROPAGANDA',
    scrambled: 'ADNAGAPORP',
    clue: 'Ideas or statements used to gain support...',
    hint: '10 chữ cái • Nghĩa: Tuyên truyền'
  });
}

export function autoUpdateLfScrambled(input) {
  if (!input) return;
  const card = input.closest('.lf-spelling-card');
  if (!card) return;
  const scrambledInput = card.querySelector('.lf-sp-scrambled');
  if (scrambledInput) {
    const val = input.value.trim().toUpperCase();
    scrambledInput.value = val.split('').reverse().join('');
  }
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.switchLfSubTab = switchLfSubTab;
  window.addLfPastVerbRow = addLfPastVerbRow;
  window.removeLfPastVerbRow = removeLfPastVerbRow;
  window._updateLfVerbsIndices = updateLfVerbsIndices;
  window.toggleLfPastQuickPaste = toggleLfPastQuickPaste;
  window.processLfPastQuickPaste = processLfPastQuickPaste;
  window.loadSampleLfPastVerbs = loadSampleLfPastVerbs;
  window.clearAllLfPastVerbs = clearAllLfPastVerbs;
  window.addLfGrammarQuestion = addLfGrammarQuestion;
  window.removeLfGrammarQuestion = removeLfGrammarQuestion;
  window._updateLfGrammarIndices = updateLfGrammarIndices;
  window.loadSampleLfGrammar = loadSampleLfGrammar;
  window.addLfMatchPair = addLfMatchPair;
  window.removeLfMatchPair = removeLfMatchPair;
  window._updateLfPairsIndices = updateLfPairsIndices;
  window.toggleLfPairQuickPaste = toggleLfPairQuickPaste;
  window.processLfPairQuickPaste = processLfPairQuickPaste;
  window.loadSampleLfMatchPairs = loadSampleLfMatchPairs;
  window.addLfFlashcard = addLfFlashcard;
  window.removeLfFlashcard = removeLfFlashcard;
  window.duplicateLfFlashcard = duplicateLfFlashcard;
  window._updateLfCardsIndices = updateLfCardsIndices;
  window.loadSampleLfFlashcards = loadSampleLfFlashcards;
  window.addLfSpellingCard = addLfSpellingCard;
  window.removeLfSpellingCard = removeLfSpellingCard;
  window._updateLfSpellingIndices = updateLfSpellingIndices;
  window.loadSampleLfSpelling = loadSampleLfSpelling;
  window.autoUpdateLfScrambled = autoUpdateLfScrambled;
}
