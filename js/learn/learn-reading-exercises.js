/**
 * MODULE LEARN READING EXERCISES (js/learn/learn-reading-exercises.js)
 * Bộ renderer giao diện 10 dạng bài tập đọc hiểu sư phạm chuẩn quốc tế
 */
import { esc } from '../common.js';
import './learn-reading-eval.js';

export function renderReadingExercises(exercises) {
  if (!exercises || !exercises.length) {
    return '<div class="empty">Chưa có câu hỏi luyện tập cho bài đọc này.</div>';
  }

  return exercises.map((ex, idx) => {
    if (ex.type === 'pre_reading') {
      return `
        <div class="preread-card" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-pre">🟢 Pre-reading — Activate Prior Knowledge</div>
          <div style="font-weight:800;font-size:16px;color:#065f46;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Pre-reading – Activate your knowledge`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#475569;margin-bottom:12px">${esc(ex.subtitle)}</div>` : ''}

          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
            ${(ex.questions || []).map((q) => `
              <div class="preread-q-item">
                <span style="color:#059669;margin-right:6px">💬</span> ${esc(q)}
              </div>
            `).join('')}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <button class="btn btn-sm" onclick="window.togglePreReadingHint(${idx})" style="background:#ecfdf5;color:#065f46;border:1.5px solid #a7f3d0;font-weight:700">
              💡 Gợi ý thảo luận & Dự đoán (Reveal Hints)
            </button>
            <span style="font-size:12px;color:#64748b">👥 Thảo luận cặp đôi / Nhóm</span>
          </div>

          <div id="preread-hint-box-${idx}" class="preread-hint-box" style="display:none">
            <div style="font-weight:800;color:#047857;margin-bottom:6px">🎯 Gợi ý trả lời & Thông tin tham khảo:</div>
            ${(ex.hintAnswers || []).map(h => `<div style="margin-bottom:4px">✓ ${esc(h)}</div>`).join('')}
            ${ex.target ? `<div style="margin-top:8px;font-style:italic;color:#6b7280">📌 ${esc(ex.target)}</div>` : ''}
          </div>
        </div>
      `;
    }

    if (ex.type === 'mcq_group') {
      const stageBadgeClass = ex.stage === 'skimming' ? 'stage-skim' : (ex.stage === 'vocabulary' ? 'stage-vocab' : 'stage-comp');
      const stageBadgeLabel = ex.stage === 'skimming' ? '🔵 Skimming — Main Idea / Overview' : (ex.stage === 'vocabulary' ? '🟡 Vocabulary in Context' : '🟠 Comprehension — Detailed Understanding');
      
      return `
        <div class="mcq-group-card" id="read-ex-card-${idx}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <div class="reading-stage-badge ${stageBadgeClass}">${stageBadgeLabel}</div>
            ${ex.timeLimit ? `<span style="font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:6px;border:1px solid #bfdbfe">⏱️ ${esc(ex.timeLimit)}</span>` : ''}
          </div>

          <div style="font-weight:800;font-size:16px;color:#1e293b;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Multiple Choice Questions`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#64748b;margin-bottom:14px">${esc(ex.subtitle)}</div>` : ''}

          <div style="display:flex;flex-direction:column;gap:12px">
            ${(ex.items || []).map((item, qIdx) => `
              <div class="mcq-group-item" id="mcq-g-item-${idx}-${qIdx}">
                <div class="mcq-group-q-text">${esc(item.question)}</div>
                <div style="display:flex;flex-direction:column;gap:6px">
                  ${(item.options || []).map((opt, oIdx) => `
                    <button class="opt" onclick="window.checkReadGroupMCQ(${idx}, ${qIdx}, ${oIdx}, ${item.answer})" id="read-g-opt-${idx}-${qIdx}-${oIdx}">
                      <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                      <span>${esc(opt)}</span>
                    </button>
                  `).join('')}
                </div>
                <div id="read-g-fb-${idx}-${qIdx}" class="fb" style="display:none;margin-top:8px"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (ex.type === 'scanning_table') {
      const rows = ex.rows || [];
      return `
        <div class="scanning-table-card" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-scan">🔵 Scanning — Find Specific Information</div>
          <div style="font-weight:800;font-size:16px;color:#0f766e;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Scanning – Find specific information`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#64748b;margin-bottom:12px">${esc(ex.subtitle)}</div>` : ''}

          <table class="scanning-grid-table">
            <thead>
              <tr style="font-size:12px;color:#64748b;text-align:left">
                <th style="padding:6px 14px">Thông tin cần tìm</th>
                <th style="padding:6px 10px">Câu trả lời</th>
                <th style="padding:6px 12px;text-align:center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, rIdx) => `
                <tr class="scanning-row" id="scan-row-${idx}-${rIdx}">
                  <td class="scanning-col-q">${esc(r.label)}</td>
                  <td class="scanning-col-input">
                    <input type="text" class="scanning-text-input" id="scan-inp-${idx}-${rIdx}" placeholder="Gõ câu trả lời..." onkeydown="if(event.key==='Enter') window.checkScanningTable(${idx})">
                  </td>
                  <td class="scanning-col-status" id="scan-status-${idx}-${rIdx}">
                    <span style="color:#94a3b8;font-size:12px">Chưa làm</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px">
            <button class="btn btn-p" onclick="window.checkScanningTable(${idx})">✅ Kiểm tra kết quả</button>
            <button class="btn btn-sm" onclick="window.revealScanningAnswers(${idx})">👁️ Hiện đáp án chuẩn</button>
          </div>
          <div id="scan-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    }

    if (ex.type === 'matching') {
      const pairs = ex.pairs || [];
      const letters = pairs.map(p => p.letter || String.fromCharCode(97 + pairs.indexOf(p)));
      const defsShuffled = [...pairs].sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));

      return `
        <div class="matching-exercise-card" style="margin:0" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-vocab">🟡 Vocabulary in Context — Matching</div>
          <div style="font-weight:800;font-size:16px;color:#1e293b;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Match the words/phrases:`}
          </div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px">${esc(ex.subtitle || 'Chọn chữ cái tương ứng:')}</div>

          <table class="matching-grid-table">
            <thead>
              <tr style="font-size:12px;color:#64748b;text-align:left">
                <th style="padding:4px 8px">STT</th>
                <th style="padding:4px 12px">Từ vựng</th>
                <th style="padding:4px 8px;text-align:center">Nối với</th>
              </tr>
            </thead>
            <tbody>
              ${pairs.map((p, pIdx) => `
                <tr class="matching-row" id="read-match-row-${idx}-${pIdx}">
                  <td class="matching-col-num">${p.id || (pIdx + 1)}</td>
                  <td class="matching-col-word">${esc(p.word || '')}</td>
                  <td class="matching-col-select">
                    <select class="matching-select" id="read-match-sel-${idx}-${pIdx}" data-correct="${esc(p.letter || '')}">
                      <option value="">--</option>
                      ${letters.map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="matching-definitions-list">
            <div style="font-size:12.5px;font-weight:800;color:#0369a1;margin-bottom:4px">📖 Định Nghĩa:</div>
            ${defsShuffled.map(d => `
              <div class="matching-def-item">
                <span class="matching-def-letter">(${d.letter})</span>
                <span>${esc(d.definition || '')}</span>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:14px">
            <button class="btn btn-p" onclick="window.checkReadingMatching(${idx})">✅ Kiểm tra nối từ</button>
          </div>
          <div id="read-match-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    }

    if (ex.type === 'true_false_group') {
      const items = ex.items || [];
      return `
        <div class="tf-group-card" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-comp">🟠 Comprehension — True or False</div>
          <div style="font-weight:800;font-size:16px;color:#c2410c;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Comprehension – True or False`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#64748b;margin-bottom:14px">${esc(ex.subtitle)}</div>` : ''}

          <div style="display:flex;flex-direction:column;gap:10px">
            ${items.map((item, itemIdx) => `
              <div class="tf-item" id="tf-item-${idx}-${itemIdx}">
                <div class="tf-statement-text">${esc(item.statement)}</div>
                <div class="tf-btn-group">
                  <button type="button" class="tf-toggle-btn btn-true" id="tf-btn-t-${idx}-${itemIdx}" onclick="window.checkReadTrueFalse(${idx}, ${itemIdx}, true, ${item.answer})">TRUE</button>
                  <button type="button" class="tf-toggle-btn btn-false" id="tf-btn-f-${idx}-${itemIdx}" onclick="window.checkReadTrueFalse(${idx}, ${itemIdx}, false, ${item.answer})">FALSE</button>
                </div>
                <div id="tf-explain-${idx}-${itemIdx}" class="tf-explain-box" style="display:none"></div>
              </div>
            `).join('')}
          </div>
          <div id="tf-fb-${idx}" class="fb" style="display:none;margin-top:12px"></div>
        </div>
      `;
    }

    if (ex.type === 'summary_cloze') {
      const bank = ex.wordBank || [];
      const blanks = ex.blanks || [];
      let templateHtml = esc(ex.textTemplate || '');
      
      blanks.forEach(b => {
        const placeholder = `\\[BLANK_${b.num}\\]`;
        const selectHtml = `
          <select class="summary-select" id="sum-sel-${idx}-${b.num}" data-correct="${esc(b.correct)}">
            <option value="">-- (${b.num}) --</option>
            ${bank.map(w => `<option value="${esc(w)}">${esc(w)}</option>`).join('')}
          </select>
        `;
        templateHtml = templateHtml.replace(new RegExp(placeholder, 'g'), selectHtml);
      });

      return `
        <div class="summary-cloze-card" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-sum">🟣 Summarizing — Synthesize Information</div>
          <div style="font-weight:800;font-size:16px;color:#7e22ce;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Summarizing – Complete the summary`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#64748b;margin-bottom:12px">${esc(ex.subtitle)}</div>` : ''}

          <div class="summary-wordbank-container">
            <div style="font-size:12px;font-weight:800;color:#6b21a8;text-transform:uppercase;">
              🔤 Ngân hàng từ khóa:
            </div>
            <div class="summary-wordbank-pills">
              ${bank.map(w => `<span class="summary-bank-pill">${esc(w)}</span>`).join('')}
            </div>
          </div>

          <div class="summary-passage-box" style="white-space:pre-wrap">
            ${templateHtml}
          </div>

          <div style="margin-top:14px">
            <button class="btn btn-p" onclick="window.checkReadingSummaryCloze(${idx})">✅ Kiểm tra tóm tắt</button>
          </div>
          <div id="sum-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    }

    if (ex.type === 'sequencing') {
      const events = ex.events || [];
      const count = events.length;
      return `
        <div class="sequencing-card" id="read-ex-card-${idx}">
          <div class="reading-stage-badge stage-seq">🟣 Sequencing — Understand Chronology</div>
          <div style="font-weight:800;font-size:16px;color:#be185d;margin-bottom:6px">
            ${ex.title ? esc(ex.title) : `Exercise ${idx + 1}. Sequencing – Chronological order`}
          </div>
          ${ex.subtitle ? `<div style="font-size:13px;color:#64748b;margin-bottom:12px">${esc(ex.subtitle)}</div>` : ''}

          <div class="sequencing-list">
            ${events.map((ev, evIdx) => `
              <div class="sequencing-item" id="seq-item-${idx}-${evIdx}">
                <select class="sequencing-select" id="seq-sel-${idx}-${evIdx}" data-correct="${ev.correctOrder}">
                  <option value="">--</option>
                  ${Array.from({ length: count }, (_, i) => i + 1).map(n => `<option value="${n}">Vị trí ${n}</option>`).join('')}
                </select>
                <div class="sequencing-text">${esc(ev.text)}</div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:14px">
            <button class="btn btn-p" onclick="window.checkReadingSequencing(${idx})">✅ Kiểm tra thứ tự</button>
          </div>
          <div id="seq-fb-${idx}" class="fb" style="display:none;margin-top:10px"></div>
        </div>
      `;
    }

    if (ex.type === 'mcq' || ex.type === 'tfng') {
      return `
        <div class="card" style="margin:0" id="read-ex-card-${idx}">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b">
            ${ex.title ? `<b>${esc(ex.title)}</b><br>` : ''}Câu ${idx + 1}: ${ex.question}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(ex.options || []).map((opt, oIdx) => `
              <button class="opt" onclick="window.checkReadMCQ(${idx}, ${oIdx}, ${ex.answer})" id="read-opt-${idx}-${oIdx}">
                <span class="okey">${String.fromCharCode(65 + oIdx)}</span>
                <span>${esc(opt)}</span>
              </button>
            `).join('')}
          </div>
          <div id="read-fb-${idx}" class="fb" style="display:none"></div>
        </div>
      `;
    }

    return '';
  }).join('');
}
