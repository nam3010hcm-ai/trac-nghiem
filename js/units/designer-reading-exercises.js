/**
 * MODULE DESIGNER READING EXERCISES (js/units/designer-reading-exercises.js)
 * Studio biên soạn 10 dạng bài tập đọc hiểu sư phạm chuẩn quốc tế dành cho Giáo viên
 */
import { esc } from '../common.js';

// Danh mục định nghĩa 10 dạng bài tập đọc hiểu sư phạm
export const PEDAGOGICAL_READING_TYPES = [
  { type: 'pre_reading', label: '1. 🟢 Pre-reading (Kích hoạt kiến thức & Dự đoán)', color: '#065f46', bg: '#ecfdf5', badge: 'Pre-reading' },
  { type: 'skimming', label: '2. 🔵 Skimming (Đọc lướt tìm ý chính 60s)', color: '#1e40af', bg: '#eff6ff', badge: 'Skimming' },
  { type: 'scanning_table', label: '3. 🔵 Scanning Table (Bảng tra cứu thông tin chi tiết)', color: '#0f766e', bg: '#f0fdfa', badge: 'Scanning' },
  { type: 'matching', label: '4. 🟡 Matching Pairs (Nối từ vựng 1–8 với định nghĩa a–h)', color: '#854d0e', bg: '#fefce8', badge: 'Matching' },
  { type: 'true_false_group', label: '5. 🟠 True / False (Nhận định Đúng / Sai)', color: '#c2410c', bg: '#fff7ed', badge: 'True/False' },
  { type: 'tfng', label: '6. 🟠 True / False / Not Given (Chuẩn IELTS Reading)', color: '#9a3412', bg: '#ffedd5', badge: 'T/F/NG' },
  { type: 'summary_cloze', label: '7. 🟣 Summary Cloze (Tóm tắt điền khuyết từ khóa)', color: '#7e22ce', bg: '#faf5ff', badge: 'Summary Cloze' },
  { type: 'sequencing', label: '8. 🟣 Sequencing (Sắp xếp thứ tự thời gian / Mạch sự kiện)', color: '#9d174d', bg: '#fdf2f8', badge: 'Sequencing' },
  { type: 'mcq_group', label: '9. 🔴 Detailed MCQ (Trắc nghiệm đọc hiểu chi tiết A/B/C/D)', color: '#991b1b', bg: '#fef2f2', badge: 'Detailed MCQ' },
  { type: 'backward_spelling', label: '10. 🔤 Backward Spelling (Đánh vần & Xếp chữ từ vựng)', color: '#3730a3', bg: '#eef2ff', badge: 'Word Spelling' }
];

export function renderReadingDesignerExercises(exercises = []) {
  return `
    <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:18px; margin-bottom:16px;">
      <!-- TOOLBAR HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px; border-bottom:1.5px solid #e2e8f0; padding-bottom:12px;">
        <div>
          <div style="font-weight:800; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
            <span>📋 Hệ Thống 10 Dạng Bài Tập Đọc Hiểu Sư Phạm (Reading Studio)</span>
            <span id="badge-read-ex-count" style="background:#eff6ff; color:#1d4ed8; font-size:12px; padding:2px 8px; border-radius:6px; font-weight:700;">
              ${exercises.length} bài tập
            </span>
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">
            Soạn thảo tương tác 10 dạng chuẩn quốc tế: Pre-reading, Skimming, Scanning, Matching, True/False, T/F/NG, Summary Cloze, Sequencing, Detailed MCQ & Spelling.
          </div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <!-- DROPDOWN THÊM DẠNG BÀI TẬP -->
          <div style="position:relative; display:inline-block;">
            <select id="ud-read-add-type-select" onchange="if(this.value){window.addReadingExerciseByType(this.value); this.value='';}" style="background:#4f46e5; color:#ffffff; font-weight:700; font-size:12.5px; padding:6px 12px; border-radius:8px; border:none; cursor:pointer; outline:none;">
              <option value="" style="background:#ffffff; color:#1e293b;">➕ Thêm Dạng Bài Tập Mới (Chọn 1/10 dạng) ▾</option>
              ${PEDAGOGICAL_READING_TYPES.map(t => `
                <option value="${t.type}" style="background:#ffffff; color:#1e293b; padding:4px 8px;">${t.label}</option>
              `).join('')}
            </select>
          </div>

          <button type="button" class="btn btn-sm" onclick="window.loadSample10ReadingExercises()" style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-weight:700;">
            ✨ Nạp trọn bộ 10 dạng mẫu
          </button>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.clearAllReadingExercises()" style="font-weight:700;">
            🗑️ Xóa hết
          </button>
        </div>
      </div>

      <!-- DANH SÁCH CÁC CARD BÀI TẬP -->
      <div id="ud-read-exercises-list">
        ${exercises.length ? renderExerciseCardsList(exercises) : `
          <div class="empty-placeholder" style="text-align:center; padding:32px 16px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:10px;">
            <div style="font-size:28px; margin-bottom:8px;">📚</div>
            <div style="font-weight:700; font-size:14px; color:#334155; margin-bottom:4px;">Chưa có bài tập đọc hiểu nào trong Unit này!</div>
            <div style="font-size:12.5px; color:#64748b; margin-bottom:14px;">Hãy chọn 1 dạng bài tập từ menu bên trên hoặc bấm nút bên dưới để nạp nhanh bộ 10 dạng mẫu chuẩn sư phạm:</div>
            <button type="button" class="btn btn-p" onclick="window.loadSample10ReadingExercises()" style="font-weight:700; padding:8px 16px;">
              ✨ Nạp Trọn Bộ 10 Dạng Bài Tập Đọc Hiểu Mẫu
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderExerciseCardsList(exercises = []) {
  return exercises.map((ex, idx) => renderSingleExerciseCard(ex, idx)).join('');
}

function renderSingleExerciseCard(ex, idx) {
  const type = ex.type || 'mcq_group';
  const meta = PEDAGOGICAL_READING_TYPES.find(t => t.type === type) || { label: `Dạng: ${type}`, color: '#334155', bg: '#f1f5f9', badge: type };

  return `
    <div class="ud-read-ex-card card" data-extype="${type}" data-exidx="${idx}" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <!-- CARD HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:${meta.bg}; color:${meta.color}; font-size:12px; font-weight:800; padding:3px 10px; border-radius:6px; border:1px solid ${meta.color}33;">
            Bài #${idx + 1}: ${meta.badge}
          </span>
          <span style="font-size:12.5px; font-weight:700; color:#334155;">${esc(ex.title || meta.label)}</span>
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="window.removeReadingExerciseCard(this)" style="padding:2px 8px; font-size:11.5px; font-weight:700;">
          🗑️ Xóa bài tập này
        </button>
      </div>

      <!-- COMMON FIELDS -->
      <div class="grid2" style="margin-bottom:10px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:12px; font-weight:700;">Tiêu đề bài tập *</label>
          <input type="text" class="ud-read-ex-title" value="${esc(ex.title || '')}" placeholder="VD: Exercise ${idx + 1}. ${meta.label}">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:12px;">Hướng dẫn làm bài (Subtitle)</label>
          <input type="text" class="ud-read-ex-subtitle" value="${esc(ex.subtitle || '')}" placeholder="VD: Read the text and choose the correct answer...">
        </div>
      </div>

      <!-- SPECIFIC BODY BASED ON TYPE -->
      ${renderExerciseBodyByType(ex, type, idx)}
    </div>
  `;
}

function renderExerciseBodyByType(ex, type, idx) {
  // 1. PRE-READING
  if (type === 'pre_reading') {
    const questions = ex.questions || ['What everyday devices use AI in modern life?'];
    const hintAnswers = ex.hintAnswers || ['Virtual assistants (Siri, Alexa), recommendation algorithms (Netflix, YouTube).'];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#065f46;">💬 Danh sách câu hỏi thảo luận / kích hoạt kiến thức:</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingPreReadQuestion(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm câu hỏi</button>
        </div>
        <div class="read-preread-q-container" style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
          ${questions.map((q, qIdx) => `
            <div class="read-preread-q-row" style="display:flex; gap:6px; align-items:center;">
              <span style="font-size:11px; font-weight:700; color:#065f46; width:20px; text-align:center;">Q${qIdx + 1}</span>
              <input type="text" class="read-preread-q-input" value="${esc(q)}" placeholder="Nội dung câu hỏi thảo luận..." style="flex:1; font-size:12px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:12px; font-weight:700; color:#065f46;">🎯 Gợi ý trả lời & Thông tin tham khảo (Hints):</label>
          <button type="button" class="btn btn-sm" onclick="window.addReadingPreReadHint(this)" style="font-size:11px; padding:2px 6px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46;">➕ Thêm gợi ý</button>
        </div>
        <div class="read-preread-h-container" style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
          ${hintAnswers.map((h, hIdx) => `
            <div class="read-preread-h-row" style="display:flex; gap:6px; align-items:center;">
              <span style="font-size:11px; font-weight:700; color:#059669; width:20px; text-align:center;">✓</span>
              <input type="text" class="read-preread-h-input" value="${esc(h)}" placeholder="Gợi ý trả lời cho học viên..." style="flex:1; font-size:12px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>

        <div class="fg" style="margin:0;">
          <label style="font-size:11.5px; color:#64748b;">Mục tiêu sư phạm (Target)</label>
          <input type="text" class="read-preread-target" value="${esc(ex.target || '')}" placeholder="VD: Kích hoạt vốn từ vựng và tư duy phản biện..." style="font-size:12px;">
        </div>
      </div>
    `;
  }

  // 2. SKIMMING
  if (type === 'skimming') {
    const items = ex.items || [{ question: 'What is the main topic of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0, explain: '' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px; font-weight:700; color:#1e40af;">⏱️ Giới hạn thời gian đọc lướt (Time Limit)</label>
          <input type="text" class="read-skim-time" value="${esc(ex.timeLimit || '60s')}" placeholder="VD: 45s, 60s, 90s" style="font-size:12px; width:120px;">
        </div>
        <div style="font-weight:700; font-size:12px; color:#1e40af; margin-bottom:8px;">Câu hỏi trắc nghiệm ý chính:</div>
        <div class="read-mcq-items-container" style="display:flex; flex-direction:column; gap:8px;">
          ${renderMcqItemsEditor(items)}
        </div>
      </div>
    `;
  }

  // 3. SCANNING TABLE
  if (type === 'scanning_table') {
    const rows = ex.rows || [{ label: 'The year AI was founded', answer: '1956' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#0f766e;">🔍 Bảng dữ liệu quét thông tin (Scanning Grid):</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingScanRow(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm dòng</button>
        </div>
        <div class="read-scan-rows-container" style="display:flex; flex-direction:column; gap:6px;">
          ${rows.map((r, rIdx) => `
            <div class="read-scan-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${rIdx + 1}</span>
              <input type="text" class="read-scan-label" value="${esc(r.label || '')}" placeholder="Thông tin cần tìm (VD: Year of release)" style="flex:2; font-size:12px;">
              <span style="font-weight:bold; color:#0f766e;">➔</span>
              <input type="text" class="read-scan-ans" value="${esc(r.answer || '')}" placeholder="Đáp án chuẩn / Từ khóa" style="flex:2; font-size:12px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 4. MATCHING PAIRS
  if (type === 'matching') {
    const pairs = ex.pairs || [];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
          <label style="font-size:12px; font-weight:700; color:#854d0e;">🧩 Cặp từ nối (Matching Pairs 1–8 với a–h):</label>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-sm" onclick="window.toggleReadingMatchQuickPaste(this)" style="font-size:11px; padding:2px 6px; background:#fef9c3; border:1px solid #fde047; color:#854d0e; font-weight:700;">⚡ Dán nhanh</button>
            <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingMatchPairToCard(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm cặp</button>
          </div>
        </div>

        <div class="read-match-quick-drawer" style="display:none; background:#ffffff; border:1.5px dashed #eab308; border-radius:8px; padding:10px; margin-bottom:10px;">
          <div style="font-size:11.5px; font-weight:700; color:#854d0e; margin-bottom:4px;">📥 Nhập hoặc dán nhanh danh sách (định dạng: Từ = Định nghĩa hoặc 1-8 / a-h):</div>
          <textarea class="read-match-quick-input" placeholder="VD:&#10;confined = limited or restricted to a particular space&#10;integral = essential or necessary for completeness" style="width:100%; min-height:70px; font-size:12px; font-family:monospace; margin-bottom:6px;"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button type="button" class="btn btn-sm" onclick="window.toggleReadingMatchQuickPaste(this)">Đóng</button>
            <button type="button" class="btn btn-sm btn-p" onclick="window.processReadingMatchQuickPaste(this)">⚡ Nạp danh sách</button>
          </div>
        </div>

        <div class="read-match-pairs-container" style="display:flex; flex-direction:column; gap:6px;">
          ${pairs.map((p, pIdx) => `
            <div class="read-match-pair-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${pIdx + 1}</span>
              <input type="text" class="read-match-pair-word" value="${esc(p.word || '')}" placeholder="Từ / Cụm từ" style="flex:1; font-size:12px;">
              <span style="font-size:12px; font-weight:bold; color:#eab308;">➔</span>
              <input type="text" class="read-match-pair-letter" value="${esc(p.letter || String.fromCharCode(97 + pIdx))}" placeholder="a, b..." style="width:40px; text-align:center; font-weight:700; font-size:12px;">
              <input type="text" class="read-match-pair-def" value="${esc(p.definition || '')}" placeholder="Định nghĩa tiếng Anh" style="flex:2; font-size:12px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 5. TRUE / FALSE
  if (type === 'true_false_group') {
    const items = ex.items || [{ statement: 'AI is no longer confined to science fiction.', answer: true, explain: '' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#c2410c;">🟠 Danh sách nhận định True / False:</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingTfRow(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm nhận định</button>
        </div>
        <div class="read-tf-items-container" style="display:flex; flex-direction:column; gap:6px;">
          ${items.map((item, itIdx) => `
            <div class="read-tf-item-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${itIdx + 1}</span>
              <input type="text" class="read-tf-statement" value="${esc(item.statement || '')}" placeholder="Nội dung nhận định..." style="flex:2; font-size:12px;">
              <select class="read-tf-ans" style="padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px; border:1px solid #cbd5e1;">
                <option value="true" ${item.answer === true ? 'selected' : ''}>True (Đúng)</option>
                <option value="false" ${item.answer === false ? 'selected' : ''}>False (Sai)</option>
              </select>
              <input type="text" class="read-tf-explain" value="${esc(item.explain || '')}" placeholder="Giải thích / Dòng trích dẫn..." style="flex:1.5; font-size:11.5px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 6. TRUE / FALSE / NOT GIVEN (TFNG)
  if (type === 'tfng') {
    const items = ex.items || [{ statement: 'Autonomous vehicles will eliminate 100% of accidents.', answer: 'F', evidence: '' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#9a3412;">🟠 Danh sách nhận định True / False / Not Given (IELTS):</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingTfngRow(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm nhận định</button>
        </div>
        <div class="read-tfng-items-container" style="display:flex; flex-direction:column; gap:6px;">
          ${items.map((item, itIdx) => `
            <div class="read-tfng-item-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${itIdx + 1}</span>
              <input type="text" class="read-tfng-statement" value="${esc(item.statement || '')}" placeholder="Nội dung nhận định..." style="flex:2; font-size:12px;">
              <select class="read-tfng-ans" style="padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px; border:1px solid #cbd5e1;">
                <option value="T" ${item.answer === 'T' || item.answer === true ? 'selected' : ''}>TRUE (Đúng)</option>
                <option value="F" ${item.answer === 'F' || item.answer === false ? 'selected' : ''}>FALSE (Sai)</option>
                <option value="NG" ${item.answer === 'NG' ? 'selected' : ''}>NOT GIVEN (Không có thông tin)</option>
              </select>
              <input type="text" class="read-tfng-evidence" value="${esc(item.evidence || item.explain || '')}" placeholder="Trích dẫn đoạn văn chứng minh..." style="flex:1.5; font-size:11.5px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 7. SUMMARY CLOZE
  if (type === 'summary_cloze') {
    const bank = ex.wordBank || ['integral', 'radiology', 'dilemmas', 'regulatory'];
    const blanks = ex.blanks || [{ num: 1, correct: 'integral' }, { num: 2, correct: 'radiology' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px; font-weight:700; color:#7e22ce;">🔤 Ngân hàng từ khóa (phân cách bằng dấu phẩy)</label>
          <input type="text" class="read-sum-wordbank" value="${esc(bank.join(', '))}" placeholder="VD: integral, radiology, dilemmas, regulatory" style="font-size:12px;">
        </div>

        <div class="fg" style="margin-bottom:10px;">
          <label style="font-size:12px; font-weight:700; color:#7e22ce;">📝 Đoạn văn tóm tắt (Đặt [BLANK_1], [BLANK_2]... tại các chỗ trống cần điền) *</label>
          <textarea class="read-sum-template designer-textarea" style="min-height:80px; font-size:12px;">${esc(ex.textTemplate || 'AI is an [BLANK_1] technology. It assists doctors with [BLANK_2] scans.')}</textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:12px; font-weight:700; color:#7e22ce;">🎯 Đáp án chuẩn cho từng ô trống:</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingSummaryBlank(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm ô trống</button>
        </div>
        <div class="read-sum-blanks-container" style="display:flex; flex-direction:column; gap:6px;">
          ${blanks.map(b => `
            <div class="read-sum-blank-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#7e22ce; width:80px;">[BLANK_${b.num}]</span>
              <input type="number" class="read-sum-blank-num" value="${b.num}" style="display:none;">
              <input type="text" class="read-sum-blank-ans" value="${esc(b.correct || '')}" placeholder="Từ chuẩn (VD: integral)" style="flex:1; font-size:12px;">
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 8. SEQUENCING
  if (type === 'sequencing') {
    const events = ex.events || [{ text: 'Introduction to AI in daily tools', correctOrder: 1 }, { text: 'Medical and transport applications', correctOrder: 2 }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#9d174d;">🟣 Danh sách các sự kiện / Mạch diễn biến:</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingSeqEvent(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm sự kiện</button>
        </div>
        <div class="read-seq-events-container" style="display:flex; flex-direction:column; gap:6px;">
          ${events.map((ev, evIdx) => `
            <div class="read-seq-event-row" style="display:flex; gap:6px; align-items:center; background:#ffffff; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
              <span style="font-size:11px; font-weight:700; color:#64748b; width:20px; text-align:center;">${evIdx + 1}</span>
              <input type="text" class="read-seq-text" value="${esc(ev.text || '')}" placeholder="Nội dung sự kiện / bước..." style="flex:3; font-size:12px;">
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:11px; font-weight:700; color:#9d174d;">Thứ tự:</span>
                <input type="number" class="read-seq-order" value="${ev.correctOrder || (evIdx + 1)}" min="1" max="20" style="width:50px; text-align:center; font-weight:700; font-size:12px;">
              </div>
              <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 9. DETAILED MCQ / MCQ GROUP
  if (type === 'mcq_group' || type === 'mcq') {
    const items = ex.items || (ex.question ? [{ question: ex.question, options: ex.options || [], answer: ex.answer || 0, explain: ex.explain || '' }] : [{ question: 'According to paragraph 2...', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0, explain: '' }]);
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#991b1b;">🔴 Danh sách câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D):</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingMcqItem(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm câu hỏi</button>
        </div>
        <div class="read-mcq-items-container" style="display:flex; flex-direction:column; gap:8px;">
          ${renderMcqItemsEditor(items)}
        </div>
      </div>
    `;
  }

  // 10. BACKWARD SPELLING
  if (type === 'backward_spelling') {
    const items = ex.items || [{ targetWord: ex.targetWord || 'AUTONOMOUS', scrambled: ex.scrambled || 'SUOMONOTUA', clue: ex.clue || 'Tự hành, tự chủ', hint: ex.hint || '10 chữ cái' }];
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:#3730a3;">🔤 Thử thách Đánh vần & Xếp chữ từ vựng (Backward Spelling):</label>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addReadingSpellingCard(this)" style="font-size:11px; padding:2px 6px;">➕ Thêm từ vựng</button>
        </div>
        <div class="read-spell-items-container" style="display:flex; flex-direction:column; gap:8px;">
          ${items.map((it, sIdx) => `
            <div class="read-spell-item-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span style="font-size:11px; font-weight:700; color:#3730a3;">Từ #${sIdx + 1}</span>
                <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
              </div>
              <div class="grid2" style="gap:6px; margin-bottom:6px;">
                <div class="fg" style="margin:0;"><label style="font-size:11px;">Từ chuẩn (VIẾT HOA) *</label><input type="text" class="read-sp-target" value="${esc(it.targetWord || '')}" placeholder="VD: AUTONOMOUS" style="font-weight:700; font-size:12px;"></div>
                <div class="fg" style="margin:0;"><label style="font-size:11px;">Chữ xáo trộn / ngược</label><input type="text" class="read-sp-scrambled" value="${esc(it.scrambled || '')}" placeholder="Tự động đảo nếu để trống" style="font-size:12px;"></div>
              </div>
              <div class="grid2" style="gap:6px;">
                <div class="fg" style="margin:0;"><label style="font-size:11px;">Gợi ý nghĩa tiếng Việt</label><input type="text" class="read-sp-clue" value="${esc(it.clue || '')}" placeholder="VD: Tự hành, tự chủ" style="font-size:12px;"></div>
                <div class="fg" style="margin:0;"><label style="font-size:11px;">Mẹo (Hint)</label><input type="text" class="read-sp-hint" value="${esc(it.hint || '')}" placeholder="VD: 10 chữ cái" style="font-size:12px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `<div style="color:#64748b; font-size:12px;">Dạng bài tập không xác định: ${type}</div>`;
}

function renderMcqItemsEditor(items = []) {
  return items.map((item, itIdx) => `
    <div class="read-mcq-item-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:700; font-size:12px; color:#0f172a;">Câu hỏi #${itIdx + 1}:</span>
        <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
      </div>
      <input type="text" class="read-mcq-q-text" value="${esc(item.question || '')}" placeholder="Nội dung câu hỏi trắc nghiệm..." style="width:100%; margin-bottom:6px; font-size:12px;">
      <div class="grid2" style="gap:6px; margin-bottom:6px;">
        ${[0, 1, 2, 3].map(optIdx => `
          <input type="text" class="read-mcq-opt-${optIdx}" value="${esc(item.options?.[optIdx] || '')}" placeholder="Lựa chọn ${['A', 'B', 'C', 'D'][optIdx]}" style="font-size:12px;">
        `).join('')}
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="font-size:11.5px; font-weight:700; color:#166534;">Đáp án đúng:</div>
        <select class="read-mcq-ans" style="padding:4px 8px; border-radius:6px; border:1px solid #86efac; background:#f0fdf4; font-weight:700; font-size:12px;">
          <option value="0" ${item.answer === 0 ? 'selected' : ''}>A</option>
          <option value="1" ${item.answer === 1 ? 'selected' : ''}>B</option>
          <option value="2" ${item.answer === 2 ? 'selected' : ''}>C</option>
          <option value="3" ${item.answer === 3 ? 'selected' : ''}>D</option>
        </select>
        <input type="text" class="read-mcq-explain" value="${esc(item.explain || '')}" placeholder="Giải thích đáp án / Dòng trích dẫn..." style="flex:1; font-size:11.5px;">
      </div>
    </div>
  `).join('');
}

// BÓC TÁCH DỮ LIỆU TỪ DOM LÊN OBJECT STATE
export function extractReadingExercisesFromDOM(existingExercises = []) {
  const cards = document.querySelectorAll('#ud-read-exercises-list .ud-read-ex-card');
  if (!cards.length) return existingExercises;

  const result = [];
  cards.forEach((card, idx) => {
    const type = card.dataset.extype || 'mcq_group';
    const orig = existingExercises[idx] || {};
    const title = card.querySelector('.ud-read-ex-title')?.value.trim() || orig.title || `Exercise ${idx + 1}`;
    const subtitle = card.querySelector('.ud-read-ex-subtitle')?.value.trim() || orig.subtitle || '';

    const exObj = { id: orig.id || `read_ex_${Date.now()}_${idx}`, type, title, subtitle };

    if (type === 'pre_reading') {
      const qInputs = card.querySelectorAll('.read-preread-q-input');
      const hInputs = card.querySelectorAll('.read-preread-h-input');
      exObj.questions = Array.from(qInputs).map(i => i.value.trim()).filter(Boolean);
      exObj.hintAnswers = Array.from(hInputs).map(i => i.value.trim()).filter(Boolean);
      exObj.target = card.querySelector('.read-preread-target')?.value.trim() || '';
    } else if (type === 'skimming') {
      exObj.timeLimit = card.querySelector('.read-skim-time')?.value.trim() || '60s';
      exObj.items = extractMcqItemsFromContainer(card);
    } else if (type === 'scanning_table') {
      const rows = card.querySelectorAll('.read-scan-row');
      exObj.rows = Array.from(rows).map(r => ({
        label: r.querySelector('.read-scan-label')?.value.trim() || '',
        answer: r.querySelector('.read-scan-ans')?.value.trim() || ''
      })).filter(r => r.label);
    } else if (type === 'matching') {
      const pRows = card.querySelectorAll('.read-match-pair-row');
      exObj.pairs = Array.from(pRows).map((r, pIdx) => ({
        id: pIdx + 1,
        word: r.querySelector('.read-match-pair-word')?.value.trim() || '',
        letter: r.querySelector('.read-match-pair-letter')?.value.trim() || String.fromCharCode(97 + pIdx),
        definition: r.querySelector('.read-match-pair-def')?.value.trim() || ''
      })).filter(p => p.word);
    } else if (type === 'true_false_group') {
      const tfRows = card.querySelectorAll('.read-tf-item-row');
      exObj.items = Array.from(tfRows).map(r => ({
        statement: r.querySelector('.read-tf-statement')?.value.trim() || '',
        answer: r.querySelector('.read-tf-ans')?.value === 'true',
        explain: r.querySelector('.read-tf-explain')?.value.trim() || ''
      })).filter(r => r.statement);
    } else if (type === 'tfng') {
      const tfngRows = card.querySelectorAll('.read-tfng-item-row');
      exObj.items = Array.from(tfngRows).map(r => ({
        statement: r.querySelector('.read-tfng-statement')?.value.trim() || '',
        answer: r.querySelector('.read-tfng-ans')?.value || 'T',
        evidence: r.querySelector('.read-tfng-evidence')?.value.trim() || ''
      })).filter(r => r.statement);
    } else if (type === 'summary_cloze') {
      const bankStr = card.querySelector('.read-sum-wordbank')?.value || '';
      exObj.wordBank = bankStr.split(',').map(s => s.trim()).filter(Boolean);
      exObj.textTemplate = card.querySelector('.read-sum-template')?.value || '';
      const bRows = card.querySelectorAll('.read-sum-blank-row');
      exObj.blanks = Array.from(bRows).map((r, bIdx) => ({
        num: parseInt(r.querySelector('.read-sum-blank-num')?.value || (bIdx + 1), 10),
        correct: r.querySelector('.read-sum-blank-ans')?.value.trim() || ''
      }));
    } else if (type === 'sequencing') {
      const evRows = card.querySelectorAll('.read-seq-event-row');
      exObj.events = Array.from(evRows).map((r, eIdx) => ({
        text: r.querySelector('.read-seq-text')?.value.trim() || '',
        correctOrder: parseInt(r.querySelector('.read-seq-order')?.value || (eIdx + 1), 10)
      })).filter(e => e.text);
    } else if (type === 'mcq_group' || type === 'mcq') {
      exObj.items = extractMcqItemsFromContainer(card);
    } else if (type === 'backward_spelling') {
      const sCards = card.querySelectorAll('.read-spell-item-card');
      exObj.items = Array.from(sCards).map(sc => {
        const target = (sc.querySelector('.read-sp-target')?.value || '').trim().toUpperCase();
        const scrambled = (sc.querySelector('.read-sp-scrambled')?.value || '').trim().toUpperCase();
        return {
          targetWord: target,
          scrambled: scrambled || target.split('').reverse().join(''),
          clue: sc.querySelector('.read-sp-clue')?.value.trim() || '',
          hint: sc.querySelector('.read-sp-hint')?.value.trim() || ''
        };
      }).filter(s => s.targetWord);
    }

    result.push(exObj);
  });

  return result;
}

function extractMcqItemsFromContainer(container) {
  const itemCards = container.querySelectorAll('.read-mcq-item-card');
  return Array.from(itemCards).map(ic => ({
    question: ic.querySelector('.read-mcq-q-text')?.value.trim() || '',
    options: [
      ic.querySelector('.read-mcq-opt-0')?.value.trim() || 'Option A',
      ic.querySelector('.read-mcq-opt-1')?.value.trim() || 'Option B',
      ic.querySelector('.read-mcq-opt-2')?.value.trim() || 'Option C',
      ic.querySelector('.read-mcq-opt-3')?.value.trim() || 'Option D'
    ],
    answer: parseInt(ic.querySelector('.read-mcq-ans')?.value || '0', 10),
    explain: ic.querySelector('.read-mcq-explain')?.value.trim() || ''
  })).filter(i => i.question);
}

// SAMPLE 10 EXERCISES GENERATOR
export function getPedagogical10SampleExercises() {
  return [
    {
      id: 'read_ex_pre',
      type: 'pre_reading',
      stage: 'pre_reading',
      title: '1. 🟢 Pre-reading – Activate Prior Knowledge',
      subtitle: 'Thảo luận các câu hỏi sau cùng bạn học trước khi đọc văn bản:',
      questions: [
        'What everyday tools or applications use Artificial Intelligence?',
        'Do you think AI will replace human teachers in the future? Why or why not?'
      ],
      hintAnswers: [
        'Virtual assistants (Siri, Alexa), recommendation algorithms (Netflix, YouTube), GPS navigation.',
        'AI can assist with personalized exercises, but cannot replace human empathy and mentorship.'
      ],
      target: 'Kích hoạt vốn từ vựng và tư duy phản biện về công nghệ AI'
    },
    {
      id: 'read_ex_skim',
      type: 'skimming',
      stage: 'skimming',
      title: '2. 🔵 Skimming – Read for Main Ideas & Overview',
      subtitle: 'Đọc nhanh toàn bộ bài đọc trong 60 giây và chọn tiêu đề / ý chính phù hợp nhất:',
      timeLimit: '60s',
      items: [
        {
          question: 'What is the primary purpose of the passage?',
          options: [
            'To warn readers about the dangers of autonomous vehicles',
            'To discuss the growth, applications, and ethical dilemmas of AI',
            'To explain how machine learning models are trained mathematically',
            'To promote streaming platforms like Netflix and Spotify'
          ],
          answer: 1,
          explain: 'Bài viết bao quát sự phát triển, ứng dụng thực tế của AI cũng như các thách thức đạo đức liên quan.'
        }
      ]
    },
    {
      id: 'read_ex_scan',
      type: 'scanning_table',
      stage: 'scanning',
      title: '3. 🔵 Scanning Table – Find Specific Information',
      subtitle: 'Quét nhanh văn bản để điền thông tin và số liệu cụ thể vào bảng:',
      rows: [
        { label: 'Name of two virtual assistants mentioned in paragraph 1', answer: 'Siri and Alexa' },
        { label: 'Medical field technology used to detect diseases at earlier stages', answer: 'Machine learning algorithms / radiology scans' },
        { label: 'Main factor causing traffic accidents that autonomous vehicles aim to reduce', answer: 'Human error' }
      ]
    },
    {
      id: 'read_ex_match',
      type: 'matching',
      stage: 'vocabulary',
      title: '4. 🟡 Matching Pairs – Vocabulary in Context (1–8 ➔ a–h)',
      subtitle: 'Nối các từ vựng học thuật trong bài với định nghĩa tiếng Anh tương ứng:',
      pairs: [
        { id: 1, word: 'confined', letter: 'a', definition: 'limited or restricted to a particular space' },
        { id: 2, word: 'integral', letter: 'b', definition: 'essential or necessary for completeness' },
        { id: 3, word: 'radiology', letter: 'c', definition: 'medical science dealing with X-rays and imaging scans' },
        { id: 4, word: 'autonomous', letter: 'd', definition: 'self-governing, operating without human intervention' },
        { id: 5, word: 'rigorously', letter: 'e', definition: 'in an extremely thorough, careful, and strict manner' },
        { id: 6, word: 'dilemmas', letter: 'f', definition: 'difficult situations in which a tough choice has to be made' },
        { id: 7, word: 'displacement', letter: 'g', definition: 'the removal of someone or something from its position or job' },
        { id: 8, word: 'scrutiny', letter: 'h', definition: 'critical observation, close examination, or surveillance' }
      ]
    },
    {
      id: 'read_ex_tf',
      type: 'true_false_group',
      stage: 'comprehension',
      title: '5. 🟠 True or False – Core Comprehension',
      subtitle: 'Xác định các nhận định sau là Đúng (True) hay Sai (False) theo nội dung bài đọc:',
      items: [
        {
          statement: 'AI technology is currently only found in science fiction books.',
          answer: false,
          explain: 'Đoạn 1 nêu: AI is no longer confined to science fiction novels.'
        },
        {
          statement: 'Autonomous vehicles are being tested on public roads to reduce traffic accidents.',
          answer: true,
          explain: 'Đoạn 2 nêu: promising to reduce traffic accidents caused by human error.'
        }
      ]
    },
    {
      id: 'read_ex_tfng',
      type: 'tfng',
      stage: 'comprehension',
      title: '6. 🟠 True / False / Not Given (Chuẩn IELTS Reading)',
      subtitle: 'Chọn True (Đúng), False (Sai), hoặc Not Given (Không có thông tin trong bài):',
      items: [
        {
          statement: 'Machine learning algorithms can detect all known medical diseases with 100% precision.',
          answer: 'F',
          evidence: 'Bài viết chỉ nêu "with remarkable accuracy", không khẳng định 100% precision.'
        },
        {
          statement: 'Netflix spends more annual budget on AI development than Spotify.',
          answer: 'NG',
          evidence: 'Bài viết chỉ đề cập cả hai đều dùng thuật toán streaming, không so sánh kinh phí đầu tư.'
        }
      ]
    },
    {
      id: 'read_ex_sum',
      type: 'summary_cloze',
      stage: 'summarizing',
      title: '7. 🟣 Summary Cloze – Complete the Summary Passage',
      subtitle: 'Điền từ thích hợp từ ngân hàng từ khóa vào các vị trí [BLANK_1], [BLANK_2] trong đoạn tóm tắt:',
      wordBank: ['integral', 'radiology', 'dilemmas', 'regulatory', 'humanity'],
      textTemplate: 'Artificial intelligence has become an [BLANK_1] part of daily life. In healthcare, it assists in [BLANK_2] scans, while in transportation it enables self-driving vehicles. However, ethical [BLANK_3] such as privacy and bias require strict [BLANK_4] frameworks to ensure AI benefits all [BLANK_5].',
      blanks: [
        { num: 1, correct: 'integral' },
        { num: 2, correct: 'radiology' },
        { num: 3, correct: 'dilemmas' },
        { num: 4, correct: 'regulatory' },
        { num: 5, correct: 'humanity' }
      ]
    },
    {
      id: 'read_ex_seq',
      type: 'sequencing',
      stage: 'sequencing',
      title: '8. 🟣 Sequencing – Chronological / Logical Flow',
      subtitle: 'Sắp xếp các ý theo đúng mạch triển khai luận điểm của bài đọc (từ 1 đến 4):',
      events: [
        { text: 'Giới thiệu AI trong đời sống hàng ngày (trợ lý ảo, thuật toán gợi ý phim/nhạc)', correctOrder: 1 },
        { text: 'Nêu các ứng dụng chuyên sâu trong y khoa (chẩn đoán hình ảnh) và giao thông (xe tự hành)', correctOrder: 2 },
        { text: 'Chỉ ra các thách thức và vấn đề đạo đức (bảo mật dữ liệu, nguy cơ mất việc làm)', correctOrder: 3 },
        { text: 'Đưa ra giải pháp: Cần có khung pháp lý và giám sát đạo đức nghiêm ngặt', correctOrder: 4 }
      ]
    },
    {
      id: 'read_ex_mcq',
      type: 'mcq_group',
      stage: 'comprehension',
      title: '9. 🔴 Multiple Choice Questions – In-depth Comprehension',
      subtitle: 'Chọn phương án đúng nhất A, B, C hoặc D cho từng câu hỏi chi tiết sau:',
      items: [
        {
          question: 'Which of the following is NOT mentioned as an ethical concern regarding AI in the passage?',
          options: [
            'Data privacy violations',
            'Algorithmic bias',
            'Excessive electricity consumption',
            'Potential job displacement'
          ],
          answer: 2,
          explain: 'Đoạn 3 chỉ nhắc đến data privacy, algorithmic bias và job displacement, không nhắc đến tiêu thụ điện năng.'
        }
      ]
    },
    {
      id: 'read_ex_spell',
      type: 'backward_spelling',
      stage: 'vocabulary',
      title: '10. 🔤 Backward Spelling & Vocabulary Puzzle',
      subtitle: 'Thử thách đánh vần và giải đố xếp từ vựng đọc hiểu:',
      items: [
        {
          targetWord: 'AUTONOMOUS',
          scrambled: 'SUOMONOTUA',
          clue: 'Tự hành, tự chủ (không cần người lái)',
          hint: 'Bắt đầu bằng A, kết thúc bằng S'
        },
        {
          targetWord: 'SCRUTINY',
          scrambled: 'YNITURCS',
          clue: 'Sự xem xét, kiểm tra kỹ lưỡng',
          hint: 'Bắt đầu bằng S, có 8 chữ cái'
        }
      ]
    }
  ];
}

// GLOBAL WINDOW HANDLERS FOR TEACHER ACTIONS
if (typeof window !== 'undefined') {
  window.addReadingExerciseByType = function(type) {
    if (!type) return;
    const meta = PEDAGOGICAL_READING_TYPES.find(t => t.type === type);
    const title = meta ? meta.label : `Dạng: ${type}`;
    const newEx = {
      id: `read_ex_${Date.now()}`,
      type: type,
      title: title,
      subtitle: 'Hướng dẫn làm bài tập...'
    };

    const container = document.getElementById('ud-read-exercises-list');
    if (!container) return;

    // Remove empty placeholder if any
    const placeholder = container.querySelector('.empty-placeholder');
    if (placeholder) placeholder.remove();

    const curCount = container.querySelectorAll('.ud-read-ex-card').length;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderSingleExerciseCard(newEx, curCount);
    const cardEl = tempDiv.firstElementChild;
    container.appendChild(cardEl);

    // Update count badge
    const badge = document.getElementById('badge-read-ex-count');
    if (badge) badge.innerText = `${curCount + 1} bài tập`;

    if (typeof window.autoFitAllDesignerTextareas === 'function') {
      window.autoFitAllDesignerTextareas();
    }
  };

  window.loadSample10ReadingExercises = function() {
    if (!confirm('Nạp trọn bộ 10 dạng bài tập đọc hiểu mẫu chuẩn sư phạm? (Dữ liệu hiện tại sẽ được cập nhật)')) return;
    const container = document.getElementById('ud-read-exercises-list');
    if (!container) return;

    const samples = getPedagogical10SampleExercises();
    container.innerHTML = renderExerciseCardsList(samples);

    const badge = document.getElementById('badge-read-ex-count');
    if (badge) badge.innerText = `${samples.length} bài tập`;

    if (window._currentDraftUnit) {
      if (!window._currentDraftUnit.reading) window._currentDraftUnit.reading = [];
      if (!window._currentDraftUnit.reading[0]) window._currentDraftUnit.reading[0] = {};
      window._currentDraftUnit.reading[0].exercises = samples;
    }

    if (typeof window.autoFitAllDesignerTextareas === 'function') {
      window.autoFitAllDesignerTextareas();
    }
  };

  window.clearAllReadingExercises = function() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách bài tập đọc hiểu?')) return;
    const container = document.getElementById('ud-read-exercises-list');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-placeholder" style="text-align:center; padding:32px 16px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:10px;">
        <div style="font-size:28px; margin-bottom:8px;">📚</div>
        <div style="font-weight:700; font-size:14px; color:#334155; margin-bottom:4px;">Chưa có bài tập đọc hiểu nào!</div>
        <button type="button" class="btn btn-p" onclick="window.loadSample10ReadingExercises()" style="font-weight:700; margin-top:8px;">
          ✨ Nạp Trọn Bộ 10 Dạng Bài Tập Đọc Hiểu Mẫu
        </button>
      </div>
    `;
    const badge = document.getElementById('badge-read-ex-count');
    if (badge) badge.innerText = '0 bài tập';
  };

  window.removeReadingExerciseCard = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    if (card) {
      card.remove();
      const container = document.getElementById('ud-read-exercises-list');
      const count = container ? container.querySelectorAll('.ud-read-ex-card').length : 0;
      const badge = document.getElementById('badge-read-ex-count');
      if (badge) badge.innerText = `${count} bài tập`;

      if (count === 0 && container) {
        container.innerHTML = `
          <div class="empty-placeholder" style="text-align:center; padding:32px 16px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:10px;">
            <div style="font-size:28px; margin-bottom:8px;">📚</div>
            <div style="font-weight:700; font-size:14px; color:#334155; margin-bottom:4px;">Chưa có bài tập đọc hiểu nào!</div>
            <button type="button" class="btn btn-p" onclick="window.loadSample10ReadingExercises()" style="font-weight:700; margin-top:8px;">
              ✨ Nạp Trọn Bộ 10 Dạng Bài Tập Đọc Hiểu Mẫu
            </button>
          </div>
        `;
      }
    }
  };

  window.removeReadingItemRow = function(btn) {
    const row = btn.closest('.read-preread-q-row, .read-preread-h-row, .read-scan-row, .read-match-pair-row, .read-tf-item-row, .read-tfng-item-row, .read-sum-blank-row, .read-seq-event-row, .read-mcq-item-card, .read-spell-item-card');
    if (row) row.remove();
  };

  window.addReadingPreReadQuestion = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-preread-q-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-preread-q-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-preread-q-row';
    row.style = 'display:flex;gap:6px;align-items:center;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#065f46;width:20px;text-align:center;">Q${count}</span>
      <input type="text" class="read-preread-q-input" value="" placeholder="Nội dung câu hỏi thảo luận..." style="flex:1;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingPreReadHint = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-preread-h-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'read-preread-h-row';
    row.style = 'display:flex;gap:6px;align-items:center;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#059669;width:20px;text-align:center;">✓</span>
      <input type="text" class="read-preread-h-input" value="" placeholder="Gợi ý trả lời cho học viên..." style="flex:1;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingScanRow = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-scan-rows-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-scan-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-scan-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${count}</span>
      <input type="text" class="read-scan-label" value="" placeholder="Thông tin cần tìm (VD: Release date)" style="flex:2;font-size:12px;">
      <span style="font-weight:bold;color:#0f766e;">➔</span>
      <input type="text" class="read-scan-ans" value="" placeholder="Đáp án chuẩn / Từ khóa" style="flex:2;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingMatchPairToCard = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-match-pairs-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-match-pair-row').length + 1;
    const nextLetter = String.fromCharCode(97 + ((count - 1) % 26));
    const row = document.createElement('div');
    row.className = 'read-match-pair-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${count}</span>
      <input type="text" class="read-match-pair-word" value="" placeholder="Từ / Cụm từ" style="flex:1;font-size:12px;">
      <span style="font-size:12px;font-weight:bold;color:#eab308;">➔</span>
      <input type="text" class="read-match-pair-letter" value="${nextLetter}" placeholder="a, b..." style="width:40px;text-align:center;font-weight:700;font-size:12px;">
      <input type="text" class="read-match-pair-def" value="" placeholder="Định nghĩa tiếng Anh" style="flex:2;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.toggleReadingMatchQuickPaste = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const drawer = card?.querySelector('.read-match-quick-drawer');
    if (drawer) drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  };

  window.processReadingMatchQuickPaste = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const input = card?.querySelector('.read-match-quick-input');
    const container = card?.querySelector('.read-match-pairs-container');
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
      row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
      row.innerHTML = `
        <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${i + 1}</span>
        <input type="text" class="read-match-pair-word" value="${esc(w)}" placeholder="Từ / Cụm từ" style="flex:1;font-size:12px;">
        <span style="font-size:12px;font-weight:bold;color:#eab308;">➔</span>
        <input type="text" class="read-match-pair-letter" value="${letter}" placeholder="a, b..." style="width:40px;text-align:center;font-weight:700;font-size:12px;">
        <input type="text" class="read-match-pair-def" value="${esc(d)}" placeholder="Định nghĩa tiếng Anh" style="flex:2;font-size:12px;">
        <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
      `;
      container.appendChild(row);
    });

    input.value = '';
    window.toggleReadingMatchQuickPaste(btn);
  };

  window.addReadingTfRow = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-tf-items-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-tf-item-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-tf-item-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${count}</span>
      <input type="text" class="read-tf-statement" value="" placeholder="Nội dung nhận định..." style="flex:2;font-size:12px;">
      <select class="read-tf-ans" style="padding:4px 8px;border-radius:6px;font-weight:700;font-size:12px;border:1px solid #cbd5e1;">
        <option value="true">True (Đúng)</option>
        <option value="false">False (Sai)</option>
      </select>
      <input type="text" class="read-tf-explain" value="" placeholder="Giải thích / Dòng trích dẫn..." style="flex:1.5;font-size:11.5px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingTfngRow = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-tfng-items-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-tfng-item-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-tfng-item-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${count}</span>
      <input type="text" class="read-tfng-statement" value="" placeholder="Nội dung nhận định..." style="flex:2;font-size:12px;">
      <select class="read-tfng-ans" style="padding:4px 8px;border-radius:6px;font-weight:700;font-size:12px;border:1px solid #cbd5e1;">
        <option value="T">TRUE (Đúng)</option>
        <option value="F">FALSE (Sai)</option>
        <option value="NG">NOT GIVEN (Không có thông tin)</option>
      </select>
      <input type="text" class="read-tfng-evidence" value="" placeholder="Trích dẫn đoạn văn chứng minh..." style="flex:1.5;font-size:11.5px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingSummaryBlank = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-sum-blanks-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-sum-blank-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-sum-blank-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#7e22ce;width:80px;">[BLANK_${count}]</span>
      <input type="number" class="read-sum-blank-num" value="${count}" style="display:none;">
      <input type="text" class="read-sum-blank-ans" value="" placeholder="Từ chuẩn (VD: integral)" style="flex:1;font-size:12px;">
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingSeqEvent = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-seq-events-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-seq-event-row').length + 1;
    const row = document.createElement('div');
    row.className = 'read-seq-event-row';
    row.style = 'display:flex;gap:6px;align-items:center;background:#ffffff;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;';
    row.innerHTML = `
      <span style="font-size:11px;font-weight:700;color:#64748b;width:20px;text-align:center;">${count}</span>
      <input type="text" class="read-seq-text" value="" placeholder="Nội dung sự kiện / bước..." style="flex:3;font-size:12px;">
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="font-size:11px;font-weight:700;color:#9d174d;">Thứ tự:</span>
        <input type="number" class="read-seq-order" value="${count}" min="1" max="20" style="width:50px;text-align:center;font-weight:700;font-size:12px;">
      </div>
      <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
    `;
    container.appendChild(row);
  };

  window.addReadingMcqItem = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-mcq-items-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-mcq-item-card').length + 1;
    const div = document.createElement('div');
    div.className = 'read-mcq-item-card';
    div.style = 'background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-weight:700;font-size:12px;color:#0f172a;">Câu hỏi #${count}:</span>
        <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
      </div>
      <input type="text" class="read-mcq-q-text" value="" placeholder="Nội dung câu hỏi trắc nghiệm..." style="width:100%;margin-bottom:6px;font-size:12px;">
      <div class="grid2" style="gap:6px;margin-bottom:6px;">
        <input type="text" class="read-mcq-opt-0" value="" placeholder="Lựa chọn A" style="font-size:12px;">
        <input type="text" class="read-mcq-opt-1" value="" placeholder="Lựa chọn B" style="font-size:12px;">
        <input type="text" class="read-mcq-opt-2" value="" placeholder="Lựa chọn C" style="font-size:12px;">
        <input type="text" class="read-mcq-opt-3" value="" placeholder="Lựa chọn D" style="font-size:12px;">
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <div style="font-size:11.5px;font-weight:700;color:#166534;">Đáp án đúng:</div>
        <select class="read-mcq-ans" style="padding:4px 8px;border-radius:6px;border:1px solid #86efac;background:#f0fdf4;font-weight:700;font-size:12px;">
          <option value="0">A</option>
          <option value="1">B</option>
          <option value="2">C</option>
          <option value="3">D</option>
        </select>
        <input type="text" class="read-mcq-explain" value="" placeholder="Giải thích đáp án..." style="flex:1;font-size:11.5px;">
      </div>
    `;
    container.appendChild(div);
  };

  window.addReadingSpellingCard = function(btn) {
    const card = btn.closest('.ud-read-ex-card');
    const container = card?.querySelector('.read-spell-items-container');
    if (!container) return;
    const count = container.querySelectorAll('.read-spell-item-card').length + 1;
    const div = document.createElement('div');
    div.className = 'read-spell-item-card';
    div.style = 'background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:10px;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:11px;font-weight:700;color:#3730a3;">Từ #${count}</span>
        <button type="button" class="btn-icon-del" onclick="window.removeReadingItemRow(this)">🗑️</button>
      </div>
      <div class="grid2" style="gap:6px;margin-bottom:6px;">
        <div class="fg" style="margin:0;"><label style="font-size:11px;">Từ chuẩn (VIẾT HOA) *</label><input type="text" class="read-sp-target" value="" placeholder="VD: AUTONOMOUS" style="font-weight:700;font-size:12px;"></div>
        <div class="fg" style="margin:0;"><label style="font-size:11px;">Chữ xáo trộn / ngược</label><input type="text" class="read-sp-scrambled" value="" placeholder="Tự động đảo nếu để trống" style="font-size:12px;"></div>
      </div>
      <div class="grid2" style="gap:6px;">
        <div class="fg" style="margin:0;"><label style="font-size:11px;">Gợi ý nghĩa tiếng Việt</label><input type="text" class="read-sp-clue" value="" placeholder="VD: Tự hành, tự chủ" style="font-size:12px;"></div>
        <div class="fg" style="margin:0;"><label style="font-size:11px;">Mẹo (Hint)</label><input type="text" class="read-sp-hint" value="" placeholder="VD: 10 chữ cái" style="font-size:12px;"></div>
      </div>
    `;
    container.appendChild(div);
  };
}
