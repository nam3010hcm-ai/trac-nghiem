/**
 * MODULE QUESTIONS LIST & TABLE RENDERER (js/questions/questions-list.js)
 * Render danh sách câu hỏi, phân trang, lọc bộ đề, xóa câu hỏi, xem LaTeX
 */
import { state, $, esc, KEYS, mediaHTML, audioHTML, videoHTML, renderRich, typesetMath, TYPE_LABELS, canEditItem, getAuthorDisplayName, logTeacherActivity } from '../common.js';
import { applyQTypeUI, renderBlankInputs, updateQFormPreviews, openQForm } from './questions-form.js';
import { importQuestionsFromFile, downloadTemplateCSV } from './questions-import.js';

const db = () => window.supabaseClient;

export let selectedQIds = new Set();
export let qPage = 1;

export function updateSelectedCountLabel() {
  const lbl = $('q-selected-count');
  if (lbl) {
    lbl.textContent = selectedQIds.size;
  }
  const selectAllCb = $('q-select-all');
  if (selectAllCb) {
    const pageCbs = document.querySelectorAll('.q-select-checkbox');
    if (pageCbs.length > 0) {
      const allChecked = Array.from(pageCbs).every(cb => cb.checked);
      selectAllCb.checked = allChecked;
    } else {
      selectAllCb.checked = false;
    }
  }
}

export async function deleteSelectedQuestions() {
  if (selectedQIds.size === 0) {
    alert("⚠️ Vui lòng chọn ít nhất một câu hỏi để xóa!");
    return;
  }

  const idsToDelete = [];
  const unauthorizedQTexts = [];
  for (const id of selectedQIds) {
    const q = state.questions.find(x => Number(x.id) === Number(id));
    if (q) {
      if (canEditItem(q, state.currentUserEmail)) {
        idsToDelete.push(Number(id));
      } else {
        unauthorizedQTexts.push(q.text);
      }
    }
  }

  if (idsToDelete.length === 0) {
    alert("❌ Bạn không có quyền xóa các câu hỏi đã chọn (thuộc về giáo viên khác)!");
    return;
  }

  let confirmMsg = `Bạn có chắc chắn muốn xóa ${idsToDelete.length} câu hỏi đã chọn không?`;
  if (unauthorizedQTexts.length > 0) {
    confirmMsg += `\n(Có ${unauthorizedQTexts.length} câu hỏi khác bạn không có quyền xóa và sẽ bị bỏ qua).`;
  }

  if (!confirm(confirmMsg)) return;

  try {
    const { error } = await db().from('questions').delete().in('id', idsToDelete);
    if (error) throw error;

    state.questions = state.questions.filter(q => !idsToDelete.includes(Number(q.id)));
    selectedQIds.clear();
    alert(`✅ Đã xóa thành công ${idsToDelete.length} câu hỏi!`);
    renderQuestions();
  } catch (e) {
    console.error("Lỗi xóa nhiều câu hỏi:", e);
    alert("❌ Lỗi khi xóa các câu hỏi: " + (e.message || ''));
  }
}

export async function deleteQ(id){
  const q = state.questions.find(x => Number(x.id) === Number(id));
  if(q && !canEditItem(q, state.currentUserEmail)) {
    alert("❌ Bạn không có quyền xóa câu hỏi của giáo viên khác!");
    return;
  }

  if(!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
  try {
    const { error } = await db().from('questions').delete().eq('id', id);
    if(error) throw error;
    state.questions = state.questions.filter(q => Number(q.id) !== Number(id));
    await logTeacherActivity('Xóa', 'Câu hỏi', (q?.text || `Câu hỏi #${id}`).replace(/<[^>]*>?/gm, '').substring(0, 60), id, '');
    alert('✅ Đã xóa câu hỏi!');
    renderQuestions();
  } catch(e) {
    console.error("Lỗi xóa câu hỏi:", e);
    alert("❌ Lỗi khi xóa câu hỏi: " + (e.message || ''));
  }
}

export function getPageSize(){ return parseInt($('q-page-size')?.value || '10') || 10; }
export function getSearch(){ return ($('q-search')?.value || '').trim().toLowerCase(); }

export function filteredQuestions(){
  const filterCat = $('flt-cat')?.value || '';
  const filterSC = $('flt-subcat')?.value || '';
  const kw = getSearch();
  let qs = state.questions.slice();
  if(filterSC) qs = qs.filter(q => q.subcat === filterSC);
  else if(filterCat) qs = qs.filter(q => q.cat === filterCat);
  if(kw){
    qs = qs.filter(q => [q.text, q.cat, q.subcat, ...(q.opts||[])].join(' ').toLowerCase().includes(kw));
  }
  return qs.sort((a,b)=>(b.id||0)-(a.id||0));
}

export function toggleQLatexSource(qId) {
  const el = document.getElementById('q-latex-raw-' + qId);
  if (el) {
    el.style.display = (el.style.display === 'none' ? 'block' : 'none');
  }
}

export function ensureQuestionTools(){
  const list = $('q-list');
  if(!list || $('q-search')) return;
  const box = document.createElement('div');
  box.className = 'q-tools card-lite';
  box.innerHTML = `
    <div class="grid2">
      <div class="fg"><label>Tìm kiếm</label><input id="q-search" placeholder="Nhập từ khóa trong câu hỏi/đáp án..."></div>
      <div class="fg"><label>Số câu/trang</label><select id="q-page-size"><option>10</option><option>20</option><option>50</option><option>100</option></select></div>
    </div>
    <div class="import-row" style="flex-wrap:wrap;gap:8px;">
      <input id="q-import-file" type="file" accept=".xlsx,.xls,.csv" style="display:none">
      <button class="btn" id="btn-import-xlsx" type="button">⬆ Import Excel/CSV</button>
      <button class="btn" id="btn-download-template" type="button">⬇ Tải mẫu CSV</button>
      <button class="btn btn-p" id="btn-open-pdf-import" type="button" onclick="if(window.openPdfImportModal) window.openPdfImportModal();" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-weight:700;border:none;box-shadow:0 2px 6px rgba(220,38,38,0.25);">📄 Bóc Tách từ PDF (Chữ Đỏ)</button>
      <span class="math-note">Hỗ trợ Excel/CSV và Bóc tách tự động file đề thi PDF</span>
    </div>`;
  list.parentNode.insertBefore(box, list);
  $('q-search').addEventListener('input', () => { qPage = 1; renderQuestions(); });
  $('q-page-size').addEventListener('change', () => { qPage = 1; renderQuestions(); });
  $('btn-import-xlsx').addEventListener('click', () => $('q-import-file').click());
  $('q-import-file').addEventListener('change', importQuestionsFromFile);
  $('btn-download-template').addEventListener('click', downloadTemplateCSV);

  $('qf-type').addEventListener('change', applyQTypeUI);
  $('qf-text').addEventListener('input', () => {
    const t = $('qf-type').value;
    if(t === 'fill_blank' || t === 'drag_drop') renderBlankInputs();
  });

  ['qf-text', 'qf-a', 'qf-b', 'qf-c', 'qf-d', 'qf-explain'].forEach(id => {
    const el = $(id);
    if (el && !el.dataset.liveBound) {
      el.addEventListener('input', updateQFormPreviews);
      el.dataset.liveBound = 'true';
    }
  });

  const qfAudioFile = $('qf-audio-file');
  if (qfAudioFile && !qfAudioFile.dataset.bound) {
    qfAudioFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const downloadURL = await uploadMediaFile(file, 'audio-bank');
        $('qf-audio').value = downloadURL;
        if ($('audio-preview')) $('audio-preview').innerHTML = `<audio controls src="${downloadURL}" style="width:100%;max-width:320px;height:36px"></audio>`;
      } catch (err) {
        alert('Lỗi khi tải file audio: ' + (err.message || ''));
      }
    });
    qfAudioFile.dataset.bound = 'true';
  }

  const qfVideoFile = $('qf-video-file');
  if (qfVideoFile && !qfVideoFile.dataset.bound) {
    qfVideoFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const downloadURL = await uploadMediaFile(file, 'video-bank');
        $('qf-video').value = downloadURL;
        if ($('btn-clear-video')) $('btn-clear-video').style.display = 'inline-block';
        if ($('video-preview')) $('video-preview').innerHTML = `<video controls playsinline src="${downloadURL}" style="width:100%;max-width:360px;max-height:200px;border-radius:8px;border:1.5px solid #cbd5e1;background:#000;"></video>`;
      } catch (err) {
        alert('Lỗi khi tải video: ' + (err.message || ''));
      }
    });
    qfVideoFile.dataset.bound = 'true';
  }

  const qfImageFile = $('qf-image-file');
  if (qfImageFile && !qfImageFile.dataset.bound) {
    qfImageFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const downloadURL = await uploadMediaFile(file, 'image-bank');
        $('qf-image').value = downloadURL;
        if ($('image-preview')) $('image-preview').innerHTML = `<img src="${downloadURL}" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #cbd5e1">`;
      } catch (err) {
        alert('Lỗi tải ảnh: ' + (err.message || ''));
      }
    });
    qfImageFile.dataset.bound = 'true';
  }

  const selectAll = $('q-select-all');
  if (selectAll && !selectAll.dataset.bound) {
    selectAll.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const cbs = document.querySelectorAll('.q-select-checkbox');
      cbs.forEach(cb => {
        cb.checked = checked;
        const id = Number(cb.dataset.id);
        if (checked) selectedQIds.add(id);
        else selectedQIds.delete(id);
      });
      updateSelectedCountLabel();
    });
    selectAll.dataset.bound = 'true';
  }

  const btnBulkDelete = $('btn-bulk-delete-q');
  if (btnBulkDelete && !btnBulkDelete.dataset.bound) {
    btnBulkDelete.addEventListener('click', deleteSelectedQuestions);
    btnBulkDelete.dataset.bound = 'true';
  }

  const qList = $('q-list');
  if (qList && !qList.dataset.selectBound) {
    qList.addEventListener('change', (e) => {
      const cb = e.target.closest('.q-select-checkbox');
      if (cb) {
        const id = Number(cb.dataset.id);
        if (cb.checked) selectedQIds.add(id);
        else selectedQIds.delete(id);
        updateSelectedCountLabel();
      }
    });
    qList.addEventListener('click', (e) => {
      const btn = e.target.closest('.q-action');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = Number(btn.dataset.id);
      if (action === 'edit') openQForm(id);
      else if (action === 'delete') deleteQ(id);
    });
    qList.dataset.selectBound = 'true';
  }
}

export function renderQuestions(){
  ensureQuestionTools();
  if(!$('q-count')) return;
  $('q-count').textContent = state.questions.length;
  
  const filterCat = $('flt-cat')?.value || '';
  const filterSC = $('flt-subcat')?.value || '';
  const hasFilter = !!(filterCat || filterSC);

  const bulkActions = $('q-bulk-actions');
  if (bulkActions) {
    bulkActions.style.display = hasFilter ? 'flex' : 'none';
  }

  if (!hasFilter) {
    selectedQIds.clear();
  }

  const qs = filteredQuestions();
  const pageSize = getPageSize();
  const totalPages = Math.max(1, Math.ceil(qs.length / pageSize));
  qPage = Math.min(Math.max(qPage, 1), totalPages);
  const pageItems = qs.slice((qPage-1)*pageSize, qPage*pageSize);

  $('q-list').innerHTML = pageItems.map(q => {
    const type = q.type || 'mcq_single';
    let answerHTML = '';
    const canEdit = canEditItem(q, state.currentUserEmail);
    const authorName = getAuthorDisplayName(q.created_by);
    const authorBadge = q.created_by ? `<div class="cat-badge" style="background:#f1f5f9;color:#475569" title="Người tạo: ${esc(authorName)} (${esc(q.created_by)})">👤 ${esc(authorName)}</div>` : '';
    
    if(type === 'mcq_single' || type === 'mcq_multi'){
      const correctSet = type === 'mcq_multi' ? (q.ans || []) : [q.ans];
      answerHTML = `<div style="display:flex; flex-direction:column; gap:6px;">` + (q.opts || []).map((o,i) => {
        const isOk = correctSet.includes(i);
        return `
        <div class="abadge ${isOk ? 'ok' : ''}" style="display:flex; gap:8px; padding:8px 10px; background:${isOk ? '#fef2f2' : '#f8fafc'}; border:1.5px solid ${isOk ? '#f87171' : '#e2e8f0'}; border-radius:6px; align-items:center; color:${isOk ? '#b91c1c' : '#334155'}; font-weight:${isOk ? '700' : '500'};">
            <b style="min-width:20px; color:${isOk ? '#b91c1c' : '#1e293b'};">${KEYS[i]}.</b>
            <div style="overflow-x:auto; width:100%; color:${isOk ? '#b91c1c' : '#334155'};">${renderRich(o)}</div>
            ${isOk ? '<span style="font-size:11px; background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:4px; font-weight:800; white-space:nowrap; margin-left:auto;">✓ Đáp án đúng</span>' : ''}
        </div>`;
      }).join('') + `</div>`;
    }else if(type === 'fill_blank' || type === 'drag_drop'){
      answerHTML = (q.blanks || []).map((b,i) => `<span class="abadge ok" style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; font-weight:700;">#${i+1}: ${renderRich(b)}</span>`).join('');
      if(q.bank?.length) answerHTML += `<div style="margin-top:4px;font-size:11px;color:#6b7280">Ngân hàng từ: ${esc(q.bank.join(', '))}</div>`;
    }else if(type === 'matching'){
      answerHTML = (q.pairs || []).map(p => `<span class="abadge ok" style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; font-weight:700;">${esc(p.left)} → ${esc(p.right)}</span>`).join('');
    }

    const explainHTML = q.explain ? `<div style="margin-top:6px; font-size:12px; color:#475569; background:#f8fafc; padding:6px 10px; border-radius:4px; border-left:3px solid #059669;">💡 <b>Giải thích:</b> ${renderRich(q.explain)}</div>` : '';

    const checkboxHTML = hasFilter ? `
      <div class="qselect-wrap" style="padding-right:12px; display:flex; align-items:center; align-self:flex-start; margin-top:4px;">
        <input type="checkbox" class="q-select-checkbox" data-id="${q.id}" ${selectedQIds.has(Number(q.id)) ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
      </div>
    ` : '';

    return `
    <div class="qitem" style="display:flex; align-items:flex-start;">
      ${checkboxHTML}
      <div style="flex:1; min-width:0;">
        <div class="qrow">
          <div class="qtext">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
              <div class="cat-badge">${esc(q.subcat || q.cat || 'Chưa phân loại')}</div>
              <div class="cat-badge" style="background:#eef2ff;color:#4338ca">${esc(TYPE_LABELS[type] || type)}</div>
              ${authorBadge}
              ${q.audio ? '<div class="cat-badge" style="background:#fef3c7;color:#92400e">🔊 Nghe</div>' : ''}
              ${q.video ? '<div class="cat-badge" style="background:#fdf2f8;color:#db2777">🎬 Video</div>' : ''}
            </div>
            <div>${renderRich(q.text)}</div>
            ${mediaHTML(q.image)}
            ${audioHTML(q.audio)}
            ${videoHTML(q.video)}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm" type="button" onclick="window.toggleQLatexSource('${q.id}')" style="background:#f8fafc;color:#334155;border:1.5px solid #cbd5e1;font-size:11.5px;padding:4px 8px;font-weight:700;">📝 Xem mã LaTeX</button>
            ${canEdit ? `
              <button class="btn btn-sm q-action" data-action="edit" data-id="${q.id}">Sửa</button>
              <button class="btn btn-sm btn-danger q-action" data-action="delete" data-id="${q.id}">Xóa</button>
            ` : `
              <span style="font-size:12px;color:#94a3b8;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0" title="Chỉ người tạo hoặc Root Admin mới có quyền sửa/xóa">🔒 Chỉ xem</span>
            `}
          </div>
        </div>
        <div style="margin-top:8px">${answerHTML}</div>
        ${explainHTML}
        <div id="q-latex-raw-${q.id}" style="display:none; margin-top:10px; background:#0f172a; color:#f8fafc; padding:12px 14px; border-radius:8px; font-family:monospace; font-size:12px; line-height:1.6; border:1.5px solid #334155; overflow-x:auto;">
          <div style="color:#38bdf8; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>📋</span> Trạng thái 1: Mã nguồn LaTeX / Văn bản gốc của câu hỏi:
          </div>
          <div style="margin-bottom:4px;"><b style="color:#94a3b8;">Nội dung:</b> ${esc(q.text)}</div>
          ${q.opts?.length ? `<div style="margin-bottom:4px;"><b style="color:#94a3b8;">Đáp án:</b> ${q.opts.map((o,i) => `<span style="${(q.type==='mcq_multi'?(q.ans||[]):[q.ans]).includes(i)?'color:#f87171;font-weight:bold;':''}">[${KEYS[i]}] ${esc(o)}</span>`).join(' | ')}</div>` : ''}
          ${q.explain ? `<div><b style="color:#94a3b8;">Giải thích:</b> ${esc(q.explain)}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty">Không có câu hỏi phù hợp.</div>';

  let pager = $('q-pager');
  if(!pager){
    pager = document.createElement('div');
    pager.id = 'q-pager';
    pager.className = 'pager';
    $('q-list').after(pager);
  }
  pager.innerHTML = `
    <button class="btn btn-sm" id="q-prev" ${qPage<=1?'disabled':''}>← Trước</button>
    <span>Trang ${qPage}/${totalPages} • Đang hiển thị ${pageItems.length}/${qs.length} câu phù hợp</span>
    <button class="btn btn-sm" id="q-next" ${qPage>=totalPages?'disabled':''}>Sau →</button>`;
  $('q-prev').onclick = () => { qPage--; renderQuestions(); };
  $('q-next').onclick = () => { qPage++; renderQuestions(); };
  updateSelectedCountLabel();
  typesetMath($('q-list'));
}

if (typeof window !== 'undefined') {
  window.toggleQLatexSource = toggleQLatexSource;
}
