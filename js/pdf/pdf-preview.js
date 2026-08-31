/**
 * MODULE PDF PREVIEW & UI INTERACTION (js/pdf/pdf-preview.js)
 * Màn hình xem trước 2 trạng thái (LaTeX & Rendered), chỉnh sửa, lọc và xóa câu hỏi
 */
import { state, $, esc, typesetMath, renderRich } from '../common.js';
import { parseDocxDocument } from '../docx-parser.js';
import { parsePdfDocument, getStoredGeminiApiKey, togglePdfEngineMode } from './pdf-engine.js';

export let currentParsedExam = null;

export function openPdfImportModal() {
  const modal = $('modal-pdf-import');
  if (!modal) return;
  modal.style.display = 'flex';

  populatePdfCatSelects();
  
  const savedMode = localStorage.getItem('pdf_engine_mode') || 'ai';
  const savedKey = getStoredGeminiApiKey();

  if ($('pdf-engine-ai') && $('pdf-engine-offline')) {
    if (savedMode === 'offline') {
      $('pdf-engine-offline').checked = true;
      togglePdfEngineMode('offline');
    } else {
      $('pdf-engine-ai').checked = true;
      togglePdfEngineMode('ai');
    }
  }

  if ($('pdf-gemini-api-key')) {
    $('pdf-gemini-api-key').value = savedKey;
  }

  $('pdf-step-upload').style.display = 'block';
  $('pdf-step-loading').style.display = 'none';
  $('pdf-step-preview').style.display = 'none';
  if ($('btn-pdf-back-upload')) $('btn-pdf-back-upload').style.display = 'none';
  $('pdf-file-input').value = '';
}

export function closePdfImportModal() {
  const modal = $('modal-pdf-import');
  if (modal) modal.style.display = 'none';
  currentParsedExam = null;
}

export function populatePdfCatSelects() {
  const catSel = $('pdf-exam-cat');
  const subcatSel = $('pdf-exam-subcat');
  if (!catSel) return;

  const cats = Object.keys(state.SUBCATS || {});
  catSel.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (cats.includes("Toán")) catSel.value = "Toán";

  updatePdfSubcatSelect();
  catSel.onchange = updatePdfSubcatSelect;
}

export function updatePdfSubcatSelect() {
  const catSel = $('pdf-exam-cat');
  const subcatSel = $('pdf-exam-subcat');
  if (!catSel || !subcatSel) return;
  const selectedCat = catSel.value;
  const subcats = state.SUBCATS[selectedCat] || [];
  subcatSel.innerHTML = subcats.map(sc => `<option value="${esc(sc)}">${esc(sc)}</option>`).join('');
  const mathSub = subcats.find(s => s.includes("Đại số") || s.includes("Phần 2"));
  if (mathSub) subcatSel.value = mathSub;
}

export async function handlePdfFileUpload(e) {
  const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
  if (!file) return;

  const fileName = (file.name || '').toLowerCase();
  if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
    alert("❌ Vui lòng chọn file có định dạng Word (.docx) hoặc PDF (.pdf)!");
    return;
  }

  runPdfParsingWorkflow(file);
}

export async function testWithSamplePdf() {
  const sampleFakeFile = {
    name: "2 trang.pdf",
    size: 433164,
    arrayBuffer: async () => new ArrayBuffer(8),
    isSampleTest: true
  };
  runPdfParsingWorkflow(sampleFakeFile);
}

export async function runPdfParsingWorkflow(file) {
  $('pdf-step-upload').style.display = 'none';
  $('pdf-step-loading').style.display = 'block';
  $('pdf-step-preview').style.display = 'none';

  const progressFill = $('pdf-progress-fill');
  const progressText = $('pdf-progress-text');
  const progressDesc = $('pdf-progress-desc');
  const isDocx = (file.name || '').toLowerCase().endsWith('.docx');

  try {
    let parsedData;
    if (isDocx) {
      if (progressDesc) progressDesc.textContent = "Đang đọc cấu trúc Word (.docx) và công thức OMML...";
      parsedData = await parseDocxDocument(file, (percent, msg) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        if (progressDesc) progressDesc.textContent = msg;
      });
    } else {
      parsedData = await parsePdfDocument(file, (percent, msg) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        if (progressDesc) progressDesc.textContent = msg;
      });
    }

    currentParsedExam = parsedData;
    renderParsedExamPreview();
  } catch (err) {
    console.error("Lỗi parse file:", err);
    alert(`❌ Lỗi khi đọc file ${isDocx ? 'Word (.docx)' : 'PDF'}: ` + (err.message || "Vui lòng thử lại"));
    $('pdf-step-upload').style.display = 'block';
    $('pdf-step-loading').style.display = 'none';
  }
}

export function renderParsedExamPreview(filterKeyword = '') {
  if (!currentParsedExam) return;

  $('pdf-step-loading').style.display = 'none';
  $('pdf-step-preview').style.display = 'block';
  if ($('btn-pdf-back-upload')) $('btn-pdf-back-upload').style.display = 'inline-block';

  $('pdf-exam-name').value = currentParsedExam.examName || "Đề thi mới từ PDF";
  $('pdf-exam-desc').value = currentParsedExam.description || "";
  $('pdf-exam-time').value = currentParsedExam.timeLimit || 45;
  
  if (currentParsedExam.cat && $('pdf-exam-cat')) {
    $('pdf-exam-cat').value = currentParsedExam.cat;
    updatePdfSubcatSelect();
    if (currentParsedExam.subcat && $('pdf-exam-subcat')) {
      $('pdf-exam-subcat').value = currentParsedExam.subcat;
    }
  }

  $('pdf-q-total-count').textContent = currentParsedExam.questions.length;

  const container = $('pdf-questions-container');
  if (!container) return;

  const kw = filterKeyword.trim().toLowerCase();
  const keys = ['A', 'B', 'C', 'D'];

  const renderedCards = currentParsedExam.questions.map((q, qIdx) => {
    if (kw) {
      const matchText = [q.text, ...(q.opts || []), q.explain].join(' ').toLowerCase();
      if (!matchText.includes(kw)) return '';
    }

    return `
      <div class="pdf-q-card" id="pdf-q-card-${qIdx}" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; padding:18px 20px; margin-bottom:18px; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:800; color:#1e293b; font-size:15px; display:flex; align-items:center; gap:8px;">
            <span style="background:#2563eb; color:#ffffff; font-size:12px; padding:3px 12px; border-radius:20px; font-weight:700;">Câu ${qIdx + 1}</span>
            <span style="font-size:12px; color:#64748b; font-weight:600;">2 Trạng thái: Mã LaTeX ⇄ Live Render</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#ecfdf5; color:#059669; font-size:11.5px; font-weight:800; padding:4px 10px; border-radius:6px; border:1px solid #a7f3d0; display:flex; align-items:center; gap:5px;">
              <span>🎯 Đáp án đúng:</span>
              <b style="color:#dc2626; font-size:13px;">Lựa chọn ${keys[q.ans]}</b>
            </span>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteParsedQuestion(${qIdx})" style="padding:3px 8px; font-size:11px; font-weight:700;" title="Xóa câu hỏi này">🗑 Xóa</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
              <span>📝</span> Trạng thái 1: Mã nguồn (Có hỗ trợ LaTeX):
            </label>
            <textarea class="pdf-q-text-input" data-idx="${qIdx}" style="width:100%; min-height:68px; font-size:13px; padding:8px 10px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:monospace; background:#ffffff; color:#0f172a;" oninput="window.updateParsedQuestionText(${qIdx}, this.value)">${esc(q.text)}</textarea>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#2563eb; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
              <span>👁️</span> Trạng thái 2: Hiển thị thực tế (Rendered MathJax):
            </label>
            <div id="pdf-q-rendered-${qIdx}" style="background:#f8fafc; border:1.5px solid #bfdbfe; border-radius:8px; padding:8px 12px; font-size:13.5px; color:#0f172a; min-height:68px; overflow-x:auto;">
              ${renderRich(q.text)}
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:8px;">
            Các phương án lựa chọn (Click chọn Radio để đổi đáp án đúng):
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${(q.opts || []).map((opt, optIdx) => {
              const isCorrect = q.ans === optIdx;
              return `
                <div style="background:${isCorrect ? '#fef2f2' : '#f8fafc'}; border:1.5px solid ${isCorrect ? '#f87171' : '#e2e8f0'}; border-radius:10px; padding:10px 12px; transition:all 0.2s;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <input type="radio" name="pdf-ans-${qIdx}" id="pdf-ans-${qIdx}-${optIdx}" value="${optIdx}" ${isCorrect ? 'checked' : ''} onchange="window.setParsedQuestionAnswer(${qIdx}, ${optIdx})" style="width:16px; height:16px; cursor:pointer; accent-color:#dc2626;">
                      <label for="pdf-ans-${qIdx}-${optIdx}" style="font-weight:800; font-size:13px; color:${isCorrect ? '#b91c1c' : '#1e293b'}; cursor:pointer; margin:0;">
                        Đáp án ${keys[optIdx]}
                      </label>
                    </div>
                    ${isCorrect ? `<span style="font-size:10.5px; background:#fee2e2; color:#b91c1c; font-weight:800; padding:2px 8px; border-radius:4px; border:1px solid #fecaca;">✓ Đúng</span>` : ''}
                  </div>

                  <div style="margin-bottom:6px;">
                    <input type="text" value="${esc(opt)}" placeholder="Mã LaTeX..." style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:5px 8px; font-size:12.5px; font-family:monospace; background:#ffffff;" oninput="window.updateParsedQuestionOption(${qIdx}, ${optIdx}, this.value)">
                  </div>

                  <div id="pdf-opt-rendered-${qIdx}-${optIdx}" style="background:#ffffff; border:1px dashed ${isCorrect ? '#fca5a5' : '#cbd5e1'}; border-radius:6px; padding:5px 8px; font-size:13px; color:${isCorrect ? '#b91c1c' : '#0f172a'}; min-height:28px; overflow-x:auto;">
                    ${renderRich(opt)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${q.explain ? `
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px 12px; margin-top:8px;">
            <div style="font-size:11.5px; font-weight:700; color:#0369a1; margin-bottom:4px;">💡 Hướng dẫn giải (Hiển thị thực tế):</div>
            <div id="pdf-q-explain-rendered-${qIdx}" style="font-size:12.5px; color:#0c4a6e; overflow-x:auto;">${renderRich(q.explain)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = renderedCards || '<div class="empty" style="padding:20px; text-align:center;">Không tìm thấy câu hỏi phù hợp với từ khóa tìm kiếm.</div>';
  typesetMath(container);
}

export function filterParsedQuestionsPreview(keyword) {
  renderParsedExamPreview(keyword);
}

export function deleteParsedQuestion(idx) {
  if (!currentParsedExam?.questions) return;
  if (!confirm(`Bạn có chắc muốn xóa Câu ${idx + 1}?`)) return;
  currentParsedExam.questions.splice(idx, 1);
  renderParsedExamPreview();
}

export function addBlankQuestionToParsed() {
  if (!currentParsedExam) return;
  if (!currentParsedExam.questions) currentParsedExam.questions = [];
  currentParsedExam.questions.push({
    text: "Nội dung câu hỏi mới...",
    opts: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    ans: 0,
    explain: ""
  });
  renderParsedExamPreview();
}

let typesetTimeout = null;
function scheduleTypeset(el) {
  if (typesetTimeout) clearTimeout(typesetTimeout);
  typesetTimeout = setTimeout(() => {
    typesetMath(el || $('pdf-questions-container'));
  }, 120);
}

export function updateParsedQuestionText(idx, val) {
  if (currentParsedExam?.questions?.[idx]) {
    currentParsedExam.questions[idx].text = val;
    const renderedBox = $(`pdf-q-rendered-${idx}`);
    if (renderedBox) {
      renderedBox.innerHTML = renderRich(val);
      scheduleTypeset(renderedBox);
    }
  }
}

export function updateParsedQuestionOption(qIdx, optIdx, val) {
  if (currentParsedExam?.questions?.[qIdx]?.opts) {
    currentParsedExam.questions[qIdx].opts[optIdx] = val;
    const renderedBox = $(`pdf-opt-rendered-${qIdx}-${optIdx}`);
    if (renderedBox) {
      renderedBox.innerHTML = renderRich(val);
      scheduleTypeset(renderedBox);
    }
  }
}

export function setParsedQuestionAnswer(qIdx, optIdx) {
  if (currentParsedExam?.questions?.[qIdx]) {
    currentParsedExam.questions[qIdx].ans = parseInt(optIdx);
    renderParsedExamPreview();
  }
}
