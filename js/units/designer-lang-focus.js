/**
 * MODULE DESIGNER LANGUAGE FOCUS (js/units/designer-lang-focus.js)
 * Studio soạn thảo Language Focus: Flashcards 3D, Cặp từ nối, Trắc nghiệm Ngữ pháp, Động từ bất quy tắc & Đảo chữ
 */
import { esc } from '../common.js';
import { _currentLfSubTab } from './units-state.js';

export function renderLanguageFocusDesigner(unit) {
  const lf = unit.languageFocus || {};
  const flashcards = lf.flashcards || [];
  const matchPairs = lf.matchPairs || [];
  const grammarList = lf.grammarChallenge || [];
  const pastVerbs = lf.pastVerbs || [];
  const spellingList = lf.backwardSpelling || [];

  return `
    <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div style="font-weight:800; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
          <span>🔍 Phân Hệ Ngôn Ngữ Trọng Tâm (Language Focus Studio)</span>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:16px; border-bottom:2px solid #e2e8f0; padding-bottom:8px; flex-wrap:wrap;">
        <button type="button" class="tab-btn lf-sub-tab ${_currentLfSubTab === 'past_verbs' ? 'active' : ''}" onclick="window.switchLfSubTab('past_verbs')" style="font-size:12.5px; font-weight:700;">
          ⏳ 1. Động Từ Bất Quy Tắc (<span id="badge-lf-verbs">${pastVerbs.length}</span>)
        </button>
        <button type="button" class="tab-btn lf-sub-tab ${_currentLfSubTab === 'grammar' ? 'active' : ''}" onclick="window.switchLfSubTab('grammar')" style="font-size:12.5px; font-weight:700;">
          📝 2. Trắc Nghiệm Ngữ Pháp (<span id="badge-lf-grammar">${grammarList.length}</span>)
        </button>
        <button type="button" class="tab-btn lf-sub-tab ${_currentLfSubTab === 'spelling' ? 'active' : ''}" onclick="window.switchLfSubTab('spelling')" style="font-size:12.5px; font-weight:700;">
          🔤 3. Game Đảo Chữ Ngược (<span id="badge-lf-spelling">${spellingList.length}</span>)
        </button>
        <button type="button" class="tab-btn lf-sub-tab ${_currentLfSubTab === 'pairs' ? 'active' : ''}" onclick="window.switchLfSubTab('pairs')" style="font-size:12.5px; font-weight:700;">
          🧩 4. Cặp Nối Cụm Từ (<span id="badge-lf-pairs">${matchPairs.length}</span>)
        </button>
        <button type="button" class="tab-btn lf-sub-tab ${_currentLfSubTab === 'flashcards' ? 'active' : ''}" onclick="window.switchLfSubTab('flashcards')" style="font-size:12.5px; font-weight:700;">
          🗂️ 5. Thẻ Ghi Nhớ 3D (<span id="badge-lf-cards">${flashcards.length}</span>)
        </button>
      </div>

      <div id="ud-lf-subtab-container">
        ${_currentLfSubTab === 'past_verbs' ? renderLfPastVerbsDesigner(pastVerbs) : ''}
        ${_currentLfSubTab === 'grammar' ? renderLfGrammarDesigner(grammarList) : ''}
        ${_currentLfSubTab === 'spelling' ? renderLfSpellingDesigner(spellingList) : ''}
        ${_currentLfSubTab === 'pairs' ? renderLfMatchPairsDesigner(matchPairs) : ''}
        ${_currentLfSubTab === 'flashcards' ? renderLfFlashcardsDesigner(flashcards) : ''}
      </div>
    </div>
  `;
}

export function renderLfPastVerbsDesigner(verbs = []) {
  return `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">Bảng Động Từ Bất Quy Tắc (Infinitive ➔ Past Simple ➔ Meaning)</h4>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" onclick="window.toggleLfPastQuickPaste()" style="background:#fff; border:1px solid #cbd5e1;">⚡ Dán nhanh</button>
          <button type="button" class="btn btn-sm" onclick="window.loadSampleLfPastVerbs()" style="background:#eff6ff; color:#1d4ed8;">✨ Nạp mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addLfPastVerbRow()">➕ Thêm dòng</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.clearAllLfPastVerbs()">🗑️ Xóa hết</button>
        </div>
      </div>

      <div id="ud-lf-past-quick-drawer" style="display:none; background:#ffffff; border:1.5px dashed #3b82f6; border-radius:8px; padding:10px; margin-bottom:12px;">
        <textarea id="ud-lf-past-quick-input" placeholder="VD:&#10;go - went - đi&#10;see - saw - nhìn thấy" style="width:100%; min-height:80px; font-size:12px; margin-bottom:4px;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.toggleLfPastQuickPaste()">Đóng</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.processLfPastQuickPaste()">Nạp vào bảng</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="table" style="width:100%; font-size:12.5px; border-collapse:collapse; background:#fff;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #e2e8f0; color:#475569; text-align:left;">
              <th style="width:38px; text-align:center;">#</th>
              <th style="width:30%;">Nguyên thể (Infinitive) *</th>
              <th style="width:30%;">Quá khứ (Past Simple) *</th>
              <th>Nghĩa tiếng Việt *</th>
              <th style="width:45px; text-align:center;">Xóa</th>
            </tr>
          </thead>
          <tbody id="ud-lf-verbs-tbody">
            ${verbs.map((v, idx) => `
              <tr class="lf-verb-row">
                <td class="lf-row-num" style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
                <td><input type="text" class="lf-verb-inf" value="${esc(v.infinitive || '')}" placeholder="VD: go"></td>
                <td><input type="text" class="lf-verb-past" value="${esc(v.past || '')}" placeholder="VD: went"></td>
                <td><input type="text" class="lf-verb-meaning" value="${esc(v.meaning || '')}" placeholder="VD: đi"></td>
                <td style="text-align:center;">
                  <button type="button" class="btn-icon-del" onclick="window.removeLfPastVerbRow(this)" title="Xóa dòng này">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderLfGrammarDesigner(grammarList = []) {
  return `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">Thử Thách Trắc Nghiệm Ngữ Pháp (Grammar Quiz Challenge)</h4>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.loadSampleLfGrammar()" style="background:#eff6ff; color:#1d4ed8;">✨ Nạp câu mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addLfGrammarQuestion()">➕ Thêm câu hỏi</button>
        </div>
      </div>
      <div id="ud-lf-grammar-list" style="display:flex; flex-direction:column; gap:12px;">
        ${grammarList.map((g, idx) => `
          <div class="lf-gm-card card" style="padding:16px; border:1.5px solid #cbd5e1; border-radius:12px; background:#ffffff; margin:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
              <span class="gm-q-badge" style="background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700;">Câu hỏi #${idx + 1}</span>
              <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfGrammarQuestion(this)" title="Xóa câu hỏi này">🗑️ Xóa câu</button>
            </div>
            <div class="fg" style="margin-bottom:10px;">
              <label style="font-weight:700; font-size:12.5px; color:#0f172a;">Nội dung câu hỏi (Dùng ___ cho vị trí cần điền) *</label>
              <input type="text" class="lf-gm-question" value="${esc(g.question || '')}" placeholder="VD: She ___ English for five years.">
            </div>
            <div class="grid2" style="margin-bottom:10px;">
              <div class="fg" style="margin:0;"><label style="font-size:11.5px; color:#64748b;">Đáp án A</label><input type="text" class="lf-gm-opt-0" value="${esc(g.options?.[0] || '')}"></div>
              <div class="fg" style="margin:0;"><label style="font-size:11.5px; color:#64748b;">Đáp án B</label><input type="text" class="lf-gm-opt-1" value="${esc(g.options?.[1] || '')}"></div>
            </div>
            <div class="grid2" style="margin-bottom:12px;">
              <div class="fg" style="margin:0;"><label style="font-size:11.5px; color:#64748b;">Đáp án C</label><input type="text" class="lf-gm-opt-2" value="${esc(g.options?.[2] || '')}"></div>
              <div class="fg" style="margin:0;"><label style="font-size:11.5px; color:#64748b;">Đáp án D</label><input type="text" class="lf-gm-opt-3" value="${esc(g.options?.[3] || '')}"></div>
            </div>
            <div class="grid2" style="margin:0;">
              <div class="fg" style="margin:0;">
                <label style="font-size:12px; font-weight:700; color:#16a34a;">Đáp án đúng *</label>
                <select class="lf-gm-ans" style="padding:7px 10px; border-radius:6px; border:1.5px solid #86efac; background:#f0fdf4; font-weight:700; color:#166534;">
                  <option value="0" ${g.answer === 0 ? 'selected' : ''}>A</option>
                  <option value="1" ${g.answer === 1 ? 'selected' : ''}>B</option>
                  <option value="2" ${g.answer === 2 ? 'selected' : ''}>C</option>
                  <option value="3" ${g.answer === 3 ? 'selected' : ''}>D</option>
                </select>
              </div>
              <div class="fg" style="margin:0;">
                <label style="font-size:12px; color:#64748b;">Giải thích chi tiết (Explain)</label>
                <input type="text" class="lf-gm-explain" value="${esc(g.explain || '')}" placeholder="VD: Giải thích...">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderLfSpellingDesigner(spellingList = []) {
  return `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">Trò Chơi Đảo Chữ Ngược (Backward Spelling Game)</h4>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.loadSampleLfSpelling()" style="background:#f3e8ff; color:#7e22ce;">✨ Nạp từ mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addLfSpellingCard()">➕ Thêm từ đảo</button>
        </div>
      </div>
      <div id="ud-lf-spelling-list" style="display:flex; flex-direction:column; gap:10px;">
        ${spellingList.map((sp, idx) => `
          <div class="lf-spelling-card card" style="padding:16px; border:1.5px solid #cbd5e1; border-radius:12px; background:#ffffff; margin:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
              <span class="spelling-q-badge" style="background:#f3e8ff; color:#7e22ce; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700;">Từ vựng #${idx + 1}</span>
              <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfSpellingCard(this)" title="Xóa từ này">🗑️ Xóa</button>
            </div>
            <div class="grid2" style="margin-bottom:10px;">
              <div class="fg" style="margin:0;">
                <label style="font-weight:700; font-size:12px; color:#16a34a;">Từ vựng mục tiêu (Target Word) *</label>
                <input type="text" class="lf-sp-target" value="${esc(sp.targetWord || '')}" placeholder="VD: PROPAGANDA" style="font-weight:800; text-transform:uppercase;" oninput="window.autoUpdateLfScrambled(this)">
              </div>
              <div class="fg" style="margin:0;">
                <label style="font-size:12px; color:#64748b;">Dạng xáo trộn (Scrambled)</label>
                <input type="text" class="lf-sp-scrambled" value="${esc(sp.scrambled || '')}" placeholder="VD: ADNAGAPORP" style="font-weight:700; text-transform:uppercase;">
              </div>
            </div>
            <div class="fg" style="margin-bottom:10px;">
              <label style="font-size:12px; font-weight:700; color:#0f172a;">Định nghĩa / Gợi ý ngữ cảnh *</label>
              <input type="text" class="lf-sp-clue" value="${esc(sp.clue || '')}" placeholder="Gợi ý...">
            </div>
            <div class="fg" style="margin:0;">
              <label style="font-size:12px; color:#64748b;">Gợi ý ký tự / nghĩa (Hint)</label>
              <input type="text" class="lf-sp-hint" value="${esc(sp.hint || '')}" placeholder="VD: 10 chữ cái...">
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderLfMatchPairsDesigner(pairs = []) {
  return `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">Cặp Nối Cụm Từ & Thành Ngữ (Matching Pairs Puzzle)</h4>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.toggleLfPairQuickPaste()" style="background:#fff; border:1px solid #cbd5e1;">⚡ Dán nhanh</button>
          <button type="button" class="btn btn-sm" onclick="window.loadSampleLfMatchPairs()" style="background:#eff6ff; color:#1d4ed8;">✨ Nạp mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addLfMatchPair()">➕ Thêm cặp nối</button>
        </div>
      </div>
      <div id="ud-lf-pair-quick-drawer" style="display:none; background:#ffffff; border:1.5px dashed #3b82f6; border-radius:8px; padding:10px; margin-bottom:12px;">
        <textarea id="ud-lf-pair-quick-input" placeholder="VD:&#10;Piece of cake = Rất dễ dàng&#10;Break a leg = Chúc may mắn" style="width:100%; min-height:80px; font-size:12px; margin-bottom:4px;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.toggleLfPairQuickPaste()">Đóng</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.processLfPairQuickPaste()">Nạp vào danh sách</button>
        </div>
      </div>
      <div id="ud-lf-pairs-list" style="display:flex; flex-direction:column; gap:8px;">
        ${pairs.map((p, idx) => `
          <div class="lf-pair-row" style="display:flex; gap:10px; align-items:center; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px;">
            <div class="lf-pair-num" style="width:28px; text-align:center; font-weight:800; color:#64748b; font-size:12px;">#${idx + 1}</div>
            <div style="flex:1;"><input type="text" class="lf-pair-left" value="${esc(p.left || '')}" placeholder="Thuật ngữ tiếng Anh"></div>
            <div style="font-size:18px; color:#3b82f6; font-weight:bold;">⇄</div>
            <div style="flex:1;"><input type="text" class="lf-pair-right" value="${esc(p.right || '')}" placeholder="Nghĩa tiếng Việt"></div>
            <button type="button" class="btn-icon-del" onclick="window.removeLfMatchPair(this)" title="Xóa cặp này">🗑️</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderLfFlashcardsDesigner(flashcards = []) {
  return `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">Thẻ Ghi Nhớ Từ Vựng 3D (3D Flashcards Studio)</h4>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-sm" onclick="window.loadSampleLfFlashcards()" style="background:#eff6ff; color:#1d4ed8;">✨ Nạp thẻ mẫu</button>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addLfFlashcard()">➕ Thêm thẻ 3D</button>
        </div>
      </div>
      <div id="ud-lf-cards-list" style="display:flex; flex-direction:column; gap:12px;">
        ${flashcards.map((fc, idx) => `
          <div class="lf-fc-card card" id="card-${fc.id || idx}" style="padding:16px; border:1.5px solid #cbd5e1; border-radius:12px; background:#ffffff; margin:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
              <span class="lf-fc-num-badge" style="background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700;">Thẻ #${idx + 1}</span>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-sm" onclick="window.duplicateLfFlashcard(this)" style="background:#f8fafc; border:1px solid #cbd5e1; color:#475569;">📋 Nhân bản</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.removeLfFlashcard(this)">🗑️ Xóa</button>
              </div>
            </div>
            <div class="grid3" style="margin-bottom:10px;">
              <div class="fg" style="margin:0;"><label style="font-size:12px; font-weight:700;">Từ vựng (Word) *</label><input type="text" class="lf-fc-word" value="${esc(fc.word || '')}"></div>
              <div class="fg" style="margin:0;"><label style="font-size:12px;">Từ loại (POS)</label><input type="text" class="lf-fc-pos" value="${esc(fc.pos || 'noun')}"></div>
              <div class="fg" style="margin:0;"><label style="font-size:12px;">Phiên âm IPA</label><input type="text" class="lf-fc-ipa" value="${esc(fc.ipa || '')}"></div>
            </div>
            <div class="grid2" style="margin-bottom:10px;">
              <div class="fg" style="margin:0;"><label style="font-size:12px; font-weight:700;">Nghĩa tiếng Việt *</label><input type="text" class="lf-fc-meaning" value="${esc(fc.meaning || '')}"></div>
              <div class="fg" style="margin:0;"><label style="font-size:12px;">Từ đồng nghĩa (Synonyms)</label><input type="text" class="lf-fc-synonyms" value="${esc(fc.synonyms || '')}"></div>
            </div>
            <div class="fg" style="margin-bottom:10px;">
              <label style="font-size:12px;">🖼️ URL Hình ảnh minh họa</label>
              <input type="text" class="lf-fc-image" value="${esc(fc.image || '')}">
            </div>
            <div class="fg" style="margin:0;">
              <label style="font-size:12px;">Ví dụ thực tế (Example)</label>
              <input type="text" class="lf-fc-example" value="${esc(fc.example || '')}">
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
