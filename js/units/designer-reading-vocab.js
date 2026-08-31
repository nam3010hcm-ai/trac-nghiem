/**
 * MODULE DESIGNER READING VOCABULARY (js/units/designer-reading-vocab.js)
 * Soạn từ điển đọc hiểu: tra từ, IPA, từ loại, quick paste & bulk parsing
 */
import { esc } from '../common.js';

export function renderReadingVocabularyDesigner(vocabulary = {}) {
  const entries = Object.entries(vocabulary || {});
  const count = entries.length;

  return `
    <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a; display:flex; align-items:center; gap:8px;">
            <span>📖 Từ Điển Tích Hợp Cho Bài Đọc (Interactive Vocab Dictionary)</span>
            <span id="badge-read-vocab" style="background:#eff6ff; color:#1d4ed8; font-size:12px; padding:2px 8px; border-radius:6px;">${count} từ</span>
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">
            Khi học viên bấm vào các từ này trong đoạn văn, hệ thống sẽ tự động tra nghĩa tiếng Việt và phát âm IPA!
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" onclick="window.toggleReadingVocabQuickPaste()" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155;">⚡ Dán nhanh danh sách</button>
          <button type="button" class="btn btn-sm" onclick="window.loadSampleReadingVocab()" style="background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8;">✨ Nạp mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingVocabRow()">➕ Thêm từ mới</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.clearAllReadingVocab()">🗑️ Xóa hết</button>
        </div>
      </div>

      <div id="ud-read-vocab-quick-drawer" style="display:none; background:#f8fafc; border:1.5px dashed #93c5fd; border-radius:8px; padding:12px; margin-bottom:14px;">
        <div style="font-size:12px; font-weight:700; color:#1e40af; margin-bottom:4px;">📥 Nhập / Dán nhanh danh sách từ vựng (Hỗ trợ định dạng Word - /IPA/ - POS - Nghĩa):</div>
        <textarea id="ud-read-vocab-quick-input" placeholder="VD:&#10;expand - /ɪkˈspænd/ - verb - Mở rộng, phát triển&#10;comprehension - /ˌkɒm.prɪˈhen.ʃən/ - noun - Sự hiểu biết" style="min-height:90px; width:100%; font-size:12.5px; font-family:monospace; margin-bottom:6px;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.toggleReadingVocabQuickPaste()">Đóng</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.processReadingVocabQuickPaste()">⚡ Chuyển đổi & Nạp vào bảng</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" style="width:100%; font-size:12.5px; border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
              <th style="width:38px; text-align:center;">#</th>
              <th style="width:22%;">Từ vựng (Word) *</th>
              <th style="width:20%;">Phiên âm (IPA)</th>
              <th style="width:18%;">Từ loại (POS)</th>
              <th>Nghĩa tiếng Việt *</th>
              <th style="width:45px; text-align:center;">Xóa</th>
            </tr>
          </thead>
          <tbody id="ud-read-vocab-tbody">
            ${entries.map(([w, v], idx) => `
              <tr class="read-vocab-row">
                <td class="read-vocab-num" style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
                <td>
                  <input type="text" class="read-vocab-word" value="${esc(w)}" placeholder="VD: expand">
                </td>
                <td>
                  <input type="text" class="read-vocab-ipa" value="${esc(v.ipa || '')}" placeholder="VD: /ɪkˈspænd/" onfocus="window._lastFocusedReadVocabIpa = this;">
                </td>
                <td>
                  <select class="read-vocab-pos" style="width:100%; padding:7px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12.5px;">
                    <option value="verb" ${v.pos === 'verb' ? 'selected' : ''}>verb (Động từ)</option>
                    <option value="noun" ${v.pos === 'noun' ? 'selected' : ''}>noun (Danh từ)</option>
                    <option value="adjective" ${v.pos === 'adjective' || v.pos === 'adj' ? 'selected' : ''}>adjective (Tính từ)</option>
                    <option value="adverb" ${v.pos === 'adverb' || v.pos === 'adv' ? 'selected' : ''}>adverb (Trạng từ)</option>
                    <option value="phrase" ${v.pos === 'phrase' ? 'selected' : ''}>phrase (Cụm từ)</option>
                    <option value="idiom" ${v.pos === 'idiom' ? 'selected' : ''}>idiom (Thành ngữ)</option>
                    <option value="preposition" ${v.pos === 'preposition' ? 'selected' : ''}>preposition (Giới từ)</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="read-vocab-meaning" value="${esc(v.meaning || '')}" placeholder="VD: Mở rộng, phát triển">
                </td>
                <td style="text-align:center;">
                  <button type="button" class="btn-icon-del" onclick="window.removeReadingVocabRow(this)" title="Xóa từ này">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.addReadingVocabRow = function(word = '', ipa = '', pos = 'noun', meaning = '') {
    const tbody = document.getElementById('ud-read-vocab-tbody');
    if (!tbody) return;
    const curCount = tbody.querySelectorAll('tr.read-vocab-row').length;
    const posVal = pos || 'noun';
    const tr = document.createElement('tr');
    tr.className = 'read-vocab-row';
    tr.innerHTML = `
      <td class="read-vocab-num" style="text-align:center;font-weight:700;color:#64748b;">${curCount + 1}</td>
      <td><input type="text" class="read-vocab-word" value="${esc(word)}" placeholder="VD: expand"></td>
      <td><input type="text" class="read-vocab-ipa" value="${esc(ipa)}" placeholder="VD: /ɪkˈspænd/" onfocus="window._lastFocusedReadVocabIpa = this;"></td>
      <td>
        <select class="read-vocab-pos" style="width:100%;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
          <option value="verb" ${posVal === 'verb' ? 'selected' : ''}>verb (Động từ)</option>
          <option value="noun" ${posVal === 'noun' ? 'selected' : ''}>noun (Danh từ)</option>
          <option value="adjective" ${posVal === 'adjective' || posVal === 'adj' ? 'selected' : ''}>adjective (Tính từ)</option>
          <option value="adverb" ${posVal === 'adverb' || posVal === 'adv' ? 'selected' : ''}>adverb (Trạng từ)</option>
          <option value="phrase" ${posVal === 'phrase' ? 'selected' : ''}>phrase (Cụm từ)</option>
          <option value="idiom" ${posVal === 'idiom' ? 'selected' : ''}>idiom (Thành ngữ)</option>
          <option value="preposition" ${posVal === 'preposition' ? 'selected' : ''}>preposition (Giới từ)</option>
        </select>
      </td>
      <td><input type="text" class="read-vocab-meaning" value="${esc(meaning)}" placeholder="VD: Mở rộng, phát triển"></td>
      <td style="text-align:center;">
        <button type="button" class="btn-icon-del" onclick="window.removeReadingVocabRow(this)" title="Xóa từ này">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
    window._updateReadingVocabIndices();
  };

  window.removeReadingVocabRow = function(btn) {
    const row = btn.closest('tr.read-vocab-row');
    if (row) {
      row.remove();
      window._updateReadingVocabIndices();
    }
  };

  window._updateReadingVocabIndices = function() {
    const rows = document.querySelectorAll('#ud-read-vocab-tbody tr.read-vocab-row');
    rows.forEach((r, idx) => {
      const numEl = r.querySelector('.read-vocab-num');
      if (numEl) numEl.textContent = idx + 1;
    });
    const badge = document.getElementById('badge-read-vocab');
    if (badge) badge.textContent = `${rows.length} từ`;
  };

  window.toggleReadingVocabQuickPaste = function() {
    const el = document.getElementById('ud-read-vocab-quick-drawer');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.processReadingVocabQuickPaste = function() {
    const input = document.getElementById('ud-read-vocab-quick-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      alert("Vui lòng nhập nội dung danh sách từ vựng cần chuyển đổi!");
      return;
    }
    const lines = text.split('\n');
    lines.forEach(line => {
      const l = line.trim();
      if (!l) return;

      let word = '', ipa = '', pos = 'noun', meaning = '';
      const ipaMatch = l.match(/\/(.*?)\//);
      if (ipaMatch) {
        ipa = `/${ipaMatch[1].trim()}/`;
        const partsBefore = l.substring(0, ipaMatch.index).trim();
        const partsAfter = l.substring(ipaMatch.index + ipaMatch[0].length).trim();
        word = partsBefore.replace(/^[0-9]+[\.\)\-]\s*/, '').trim();

        const posMatch = partsAfter.match(/[\(\[\-:]?\s*(verb|noun|adjective|adj|adverb|adv|phrase|idiom|preposition)\s*[\)\]\-:]?/i);
        if (posMatch) {
          let pStr = posMatch[1].toLowerCase();
          if (pStr === 'adj') pStr = 'adjective';
          if (pStr === 'adv') pStr = 'adverb';
          pos = pStr;
          meaning = partsAfter.substring(posMatch.index + posMatch[0].length).replace(/^[\s:\-–—,]+/, '').trim();
        } else {
          meaning = partsAfter.replace(/^[\s:\-–—,]+/, '').trim();
        }
      } else {
        const parts = l.split(/\s*[-–—:=,\t]+\s*/);
        if (parts.length >= 4) {
          word = parts[0];
          ipa = parts[1].startsWith('/') ? parts[1] : `/${parts[1]}/`;
          let pStr = parts[2].toLowerCase();
          if (pStr === 'adj') pStr = 'adjective';
          if (pStr === 'adv') pStr = 'adverb';
          pos = pStr;
          meaning = parts.slice(3).join(', ');
        } else if (parts.length === 3) {
          word = parts[0];
          const p2 = parts[1].toLowerCase();
          if (['verb', 'noun', 'adjective', 'adj', 'adverb', 'adv', 'phrase', 'idiom', 'preposition'].includes(p2)) {
            pos = p2 === 'adj' ? 'adjective' : (p2 === 'adv' ? 'adverb' : p2);
            meaning = parts[2];
          } else if (p2.startsWith('/') || p2.endsWith('/')) {
            ipa = p2.startsWith('/') ? p2 : `/${p2}/`;
            meaning = parts[2];
          } else {
            pos = 'noun';
            meaning = `${parts[1]} - ${parts[2]}`;
          }
        } else if (parts.length === 2) {
          word = parts[0];
          meaning = parts[1];
        } else if (parts.length === 1 && parts[0]) {
          word = parts[0];
        }
      }

      word = word.replace(/^[0-9]+[\.\)\-]\s*/, '').trim();
      if (word) {
        window.addReadingVocabRow(word, ipa, pos, meaning);
      }
    });

    input.value = '';
    window.toggleReadingVocabQuickPaste();
  };

  window.loadSampleReadingVocab = function() {
    const samples = [
      { word: 'expand', ipa: '/ɪkˈspænd/', pos: 'verb', meaning: 'Mở rộng, phát triển quy mô' },
      { word: 'comprehension', ipa: '/ˌkɒm.prɪˈhen.ʃən/', pos: 'noun', meaning: 'Sự hiểu biết, khả năng lĩnh hội' },
      { word: 'sustainable', ipa: '/səˈsteɪ.nə.bəl/', pos: 'adjective', meaning: 'Bền vững, thân thiện với môi trường' },
      { word: 'confined', ipa: '/kənˈfaɪnd/', pos: 'adjective', meaning: 'Bị giới hạn trong một phạm vi nhất định' },
      { word: 'integral', ipa: '/ˈɪn.tɪ.ɡrəl/', pos: 'adjective', meaning: 'Thiết yếu, không thể thiếu' }
    ];
    const tbody = document.getElementById('ud-read-vocab-tbody');
    if (tbody) tbody.innerHTML = '';
    samples.forEach(s => window.addReadingVocabRow(s.word, s.ipa, s.pos, s.meaning));
  };

  window.clearAllReadingVocab = function() {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ danh mục tra từ này?")) return;
    const tbody = document.getElementById('ud-read-vocab-tbody');
    if (tbody) tbody.innerHTML = '';
    window._updateReadingVocabIndices();
  };
}
