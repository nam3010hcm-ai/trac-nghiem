import { state, $, esc, KEYS, mediaHTML, audioHTML, videoHTML, renderRich, typesetMath, TYPE_LABELS, splitBlanks, countBlanks, fillSubcatSelect, canEditItem, isRootUser, getAuthorDisplayName, logTeacherActivity } from './common.js';

const db = () => window.supabaseClient;

function updateQFormSubcat() { fillSubcatSelect('qf-subcat', $('qf-cat')?.value || '', false); }

let editQId = null;
let qPage = 1;

export let selectedQIds = new Set();

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

// ==============================================================
// HỆ THỐNG SOẠN THẢO VĂN BẢN (B, I, U, ĐỔI MÀU)
// ==============================================================
window.insertFormat = function(targetId, startTag, endTag) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);
    const replacement = startTag + selectedText + endTag;
    
    el.value = text.substring(0, start) + replacement + text.substring(end);
    el.focus();
    // Đặt con trỏ vào giữa thẻ vừa chèn
    el.selectionStart = start + startTag.length;
    el.selectionEnd = start + startTag.length + selectedText.length;
    el.dispatchEvent(new Event('input')); 
};

function initRichTextEditors() {
    const targets = ['qf-text', 'qf-a', 'qf-b', 'qf-c', 'qf-d', 'qf-explain'];
    targets.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.toolbarAdded) return;
        
        const tb = document.createElement('div');
        tb.style.cssText = "display:flex; gap:6px; margin-bottom:6px; background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; align-items:center;";
        tb.innerHTML = `
            <button type="button" title="In đậm" style="font-weight:bold; width:28px; height:28px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; cursor:pointer; font-size:13px; color:#1e293b; display:flex; align-items:center; justify-content:center;" onclick="window.insertFormat('${id}', '<b>', '</b>')">B</button>
            <button type="button" title="In nghiêng" style="font-style:italic; width:28px; height:28px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; cursor:pointer; font-size:13px; color:#1e293b; display:flex; align-items:center; justify-content:center;" onclick="window.insertFormat('${id}', '<i>', '</i>')">I</button>
            <button type="button" title="Gạch chân" style="text-decoration:underline; width:28px; height:28px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; cursor:pointer; font-size:13px; color:#1e293b; display:flex; align-items:center; justify-content:center;" onclick="window.insertFormat('${id}', '<u>', '</u>')">U</button>
            <div style="width:1px; height:20px; background:#cbd5e1; margin:0 5px;"></div>
            <label style="font-size:12px; margin:0; color:#64748b; font-weight:600;">Màu chữ:</label>
            <input type="color" title="Đổi màu chữ" style="width:28px; height:28px; padding:0; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; background:#fff;" onchange="window.insertFormat('${id}', '<span style=\\'color:'+this.value+'\\'>', '</span>'); this.value='#000000';">
        `;
        el.parentNode.insertBefore(tb, el);
        el.dataset.toolbarAdded = "true";
    });
}
// ==============================================================

// --- Hiển thị/ẩn khối input tương ứng với loại câu hỏi đang chọn trong form ---
function applyQTypeUI(){
  const type = $('qf-type').value;
  const isBlankBased = type === 'fill_blank' || type === 'drag_drop';
  $('qf-mcq-block').style.display = (type === 'mcq_single' || type === 'mcq_multi') ? 'block' : 'none';
  $('qf-ans-single-wrap').style.display = type === 'mcq_single' ? 'block' : 'none';
  $('qf-ans-multi-wrap').style.display = type === 'mcq_multi' ? 'block' : 'none';
  $('qf-fillblank-block').style.display = isBlankBased ? 'block' : 'none';
  $('qf-bank-wrap').style.display = type === 'drag_drop' ? 'block' : 'none';
  $('qf-matching-block').style.display = type === 'matching' ? 'block' : 'none';
  if(isBlankBased) renderBlankInputs();
}

function renderBlankInputs(existingVals = null){
  const wrap = $('qf-blanks-wrap');
  const n = countBlanks($('qf-text').value);
  const prevVals = existingVals || Array.from(wrap.querySelectorAll('.qf-blank-input')).map(i => i.value);
  if(!n){
    wrap.innerHTML = '<div class="empty" style="padding:8px 0">Chưa có dấu ___ nào trong câu hỏi.</div>';
    return;
  }
  wrap.innerHTML = Array.from({length:n}).map((_,i) => `
    <div class="fg" style="margin:0 0 8px">
      <label>Đáp án đúng - chỗ trống #${i+1}</label>
      <input class="qf-blank-input" data-idx="${i}" value="${esc(prevVals[i] || '')}" placeholder="VD: is|'s">
    </div>`).join('');
}

function getPageSize(){ return parseInt($('q-page-size')?.value || '10') || 10; }
function getSearch(){ return ($('q-search')?.value || '').trim().toLowerCase(); }

function ensureQuestionTools(){
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

  // Gắn sự kiện cập nhật Live Render Preview 2 trạng thái cho Form câu hỏi
  ['qf-text', 'qf-a', 'qf-b', 'qf-c', 'qf-d', 'qf-explain'].forEach(id => {
    const el = $(id);
    if (el && !el.dataset.liveBound) {
      el.addEventListener('input', updateQFormPreviews);
      el.dataset.liveBound = 'true';
    }
  });

  // --- XỬ LÝ UPLOAD AUDIO LÊN SUPABASE STORAGE ---
  const qfAudioFile = $('qf-audio-file');
  if (qfAudioFile) {
    qfAudioFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const progressWrapper = $('audio-upload-progress');
      const progressBar = $('audio-progress-bar');
      const progressPercent = $('audio-progress-percent');
      const preview = $('audio-preview');

      if (progressWrapper) progressWrapper.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';

      try {
        const downloadURL = await uploadMediaFile(file, 'audio-bank', (pct) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPercent) progressPercent.textContent = `${pct}%`;
        });

        $('qf-audio').value = downloadURL;
        if (progressPercent) progressPercent.textContent = '100% (Hoàn thành)';
        if (preview) {
          preview.innerHTML = `
            <div style="font-size:12px;color:#10b981;margin-bottom:4px">✅ Đã tải lên Supabase Storage:</div>
            <audio controls src="${downloadURL}" style="width:100%;max-width:320px;height:36px"></audio>
          `;
        }
      } catch (err) {
        console.error("Lỗi upload audio:", err);
        alert('Lỗi khi tải file audio lên Supabase Storage: ' + (err.message || ''));
        if (progressWrapper) progressWrapper.style.display = 'none';
      }
    });
  }

  const btnClearAudio = $('btn-clear-audio');
  if (btnClearAudio) {
    btnClearAudio.addEventListener('click', () => {
      $('qf-audio').value = '';
      if ($('qf-audio-file')) $('qf-audio-file').value = '';
      if ($('audio-preview')) $('audio-preview').innerHTML = '';
      if ($('audio-upload-progress')) $('audio-upload-progress').style.display = 'none';
      btnClearAudio.style.display = 'none';
    });
  }

  // --- XỬ LÝ UPLOAD VIDEO MP4 LÊN SUPABASE STORAGE ---
  const qfVideoFile = $('qf-video-file');
  if (qfVideoFile && !qfVideoFile.dataset.bound) {
    qfVideoFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const progressWrapper = $('video-upload-progress');
      const progressBar = $('video-upload-fill');
      const progressText = $('video-upload-text');
      const preview = $('video-preview');

      if (progressWrapper) progressWrapper.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = 'Đang tải video: 0%';

      try {
        const downloadURL = await uploadMediaFile(file, 'video-bank', (pct) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressText) progressText.textContent = `Đang tải video: ${pct}%`;
        });

        $('qf-video').value = downloadURL;
        if (progressText) progressText.textContent = '✅ Đã tải video lên 100%';
        if ($('btn-clear-video')) $('btn-clear-video').style.display = 'inline-block';
        if (preview) {
          preview.innerHTML = `
            <div style="font-size:12px;color:#10b981;margin-bottom:4px;font-weight:700;">✅ Đã tải video lên Supabase:</div>
            <video controls playsinline src="${downloadURL}" style="width:100%;max-width:360px;max-height:200px;border-radius:8px;border:1.5px solid #cbd5e1;background:#000;"></video>
          `;
        }
      } catch (err) {
        console.error("Lỗi upload video:", err);
        alert('Lỗi khi tải file video lên Supabase Storage: ' + (err.message || ''));
        if (progressWrapper) progressWrapper.style.display = 'none';
      }
    });
    qfVideoFile.dataset.bound = 'true';
  }

  const qfVideoInput = $('qf-video');
  if (qfVideoInput && !qfVideoInput.dataset.bound) {
    qfVideoInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const preview = $('video-preview');
      if (preview) {
        preview.innerHTML = val ? `<video controls playsinline src="${val}" style="width:100%;max-width:360px;max-height:200px;border-radius:8px;border:1.5px solid #cbd5e1;background:#000;margin-top:6px;"></video>` : '';
      }
      if ($('btn-clear-video')) $('btn-clear-video').style.display = val ? 'inline-block' : 'none';
    });
    qfVideoInput.dataset.bound = 'true';
  }

  const btnClearVideo = $('btn-clear-video');
  if (btnClearVideo && !btnClearVideo.dataset.bound) {
    btnClearVideo.addEventListener('click', () => {
      $('qf-video').value = '';
      if ($('qf-video-file')) $('qf-video-file').value = '';
      if ($('video-preview')) $('video-preview').innerHTML = '';
      if ($('video-upload-progress')) $('video-upload-progress').style.display = 'none';
      btnClearVideo.style.display = 'none';
    });
    btnClearVideo.dataset.bound = 'true';
  }

  // --- XỬ LÝ UPLOAD ẢNH LÊN SUPABASE STORAGE ---
  const qfImageFile = $('qf-image-file');
  if (qfImageFile) {
    qfImageFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const progressWrapper = $('image-upload-progress');
      const progressBar = $('image-progress-bar');
      const progressPercent = $('image-progress-percent');
      const preview = $('image-preview');

      if (progressWrapper) progressWrapper.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';

      try {
        const downloadURL = await uploadMediaFile(file, 'image-bank', (pct) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPercent) progressPercent.textContent = `${pct}%`;
        });

        $('qf-image').value = downloadURL;
        if (progressPercent) progressPercent.textContent = '100% (Hoàn thành)';
        if (preview) {
          preview.innerHTML = `
            <img src="${downloadURL}" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #cbd5e1">
          `;
        }
      } catch (err) {
        console.error("Lỗi upload ảnh:", err);
        alert('Lỗi khi tải file ảnh lên Supabase Storage: ' + (err.message || ''));
        if (progressWrapper) progressWrapper.style.display = 'none';
      }
    });
  }

  const imgInput = $('qf-image');
  if (imgInput && !imgInput.dataset.bound) {
      imgInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          $('image-preview').innerHTML = val ? `<img src="${val}" style="max-width:100%; max-height:200px; border-radius:8px; margin-top:10px; border: 1px solid #e2e8f0;">` : '';
          if ($('btn-clear-image')) $('btn-clear-image').style.display = val ? 'inline-block' : 'none';
      });
      imgInput.dataset.bound = "true";
  }

  const btnClearImage = $('btn-clear-image');
  if (btnClearImage && !btnClearImage.dataset.bound) {
    btnClearImage.addEventListener('click', () => {
      if ($('qf-image-file')) $('qf-image-file').value = '';
      if ($('qf-image')) $('qf-image').value = '';
      if ($('image-preview')) $('image-preview').innerHTML = '';
      btnClearImage.style.display = 'none';
    });
    btnClearImage.dataset.bound = "true";
  }

  // --- XỬ LÝ MỞ MODAL THƯ VIỆN ẢNH KHI BẤM NÚT "CHỌN TỪ THƯ VIỆN" ---
  const btnOpenGal = $('btn-open-gallery');
  if(btnOpenGal && !btnOpenGal.dataset.bound) {
      btnOpenGal.addEventListener('click', () => {
          const modal = $('modal-select-gallery');
          if (modal) {
              modal.style.display = 'flex';
              if(typeof window.loadGallery === 'function') window.loadGallery(); 
          }
      });
      btnOpenGal.dataset.bound = "true";
  }

  const btnCloseGal = $('btn-close-gallery-modal');
  if(btnCloseGal && !btnCloseGal.dataset.bound) {
      btnCloseGal.addEventListener('click', () => {
          const modal = $('modal-select-gallery');
          if (modal) modal.style.display = 'none';
      });
      btnCloseGal.dataset.bound = "true";
  }

  const selectAll = $('q-select-all');
  if (selectAll && !selectAll.dataset.bound) {
    selectAll.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const cbs = document.querySelectorAll('.q-select-checkbox');
      cbs.forEach(cb => {
        cb.checked = checked;
        const id = Number(cb.dataset.id);
        if (checked) {
          selectedQIds.add(id);
        } else {
          selectedQIds.delete(id);
        }
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
        if (cb.checked) {
          selectedQIds.add(id);
        } else {
          selectedQIds.delete(id);
        }
        updateSelectedCountLabel();
      }
    });
    qList.dataset.selectBound = 'true';
  }
}

export function openQForm(id = null){
  // GỌI HÀM KHỞI TẠO TOOLBAR ĐỊNH DẠNG CHỮ
  initRichTextEditors();

  editQId = id;
  $('qform-title').textContent = id ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới';
  ['qf-ans-m0','qf-ans-m1','qf-ans-m2','qf-ans-m3'].forEach(cid => { if($(cid)) $(cid).checked = false; });
  
  // RESET TRIỆT ĐỂ KHỐI HÌNH ẢNH & AUDIO MỖI LẦN MỞ FORM
  if($('qf-image-file')) $('qf-image-file').value = '';
  if($('qf-image')) $('qf-image').value = '';
  if($('image-preview')) $('image-preview').innerHTML = '';
  if($('image-upload-progress')) $('image-upload-progress').style.display = 'none';
  if($('btn-clear-image')) $('btn-clear-image').style.display = 'none';

  if($('qf-audio-file')) $('qf-audio-file').value = '';
  if($('qf-audio')) $('qf-audio').value = '';
  if($('audio-preview')) $('audio-preview').innerHTML = '';
  if($('audio-upload-progress')) $('audio-upload-progress').style.display = 'none';
  if($('btn-clear-audio')) $('btn-clear-audio').style.display = 'none';

  if($('qf-video-file')) $('qf-video-file').value = '';
  if($('qf-video')) $('qf-video').value = '';
  if($('video-preview')) $('video-preview').innerHTML = '';
  if($('video-upload-progress')) $('video-upload-progress').style.display = 'none';
  if($('btn-clear-video')) $('btn-clear-video').style.display = 'none';

  if(id){
    const q = state.questions.find(x => x.id === id);
    if(!q) return;
    const type = q.type || 'mcq_single';
    $('qf-type').value = type;
    $('qf-cat').value = q.cat || '';
    fillSubcatSelect('qf-subcat', q.cat, false);
    $('qf-subcat').value = q.subcat || '';
    $('qf-text').value = q.text || '';
    
    if(q.audio) {
      $('qf-audio').value = q.audio;
      $('audio-preview').innerHTML = `<audio controls style="width:100%; margin-top:6px;" src="${q.audio}"></audio>`;
      if($('btn-clear-audio')) $('btn-clear-audio').style.display = 'inline-block';
    }

    if(q.video) {
      $('qf-video').value = q.video;
      $('video-preview').innerHTML = `<video controls playsinline style="width:100%; max-width:360px; max-height:200px; border-radius:8px; margin-top:6px; border:1.5px solid #cbd5e1; background:#000;" src="${q.video}"></video>`;
      if($('btn-clear-video')) $('btn-clear-video').style.display = 'inline-block';
    }
    
    if(q.image) {
      $('qf-image').value = q.image;
      $('image-preview').innerHTML = `<img src="${q.image}" style="max-width:100%; max-height:200px; border-radius:8px; margin-top:10px; border: 1px solid #e2e8f0;">`;
      if($('btn-clear-image')) $('btn-clear-image').style.display = 'inline-block';
    }

    if($('qf-explain')) $('qf-explain').value = q.explain || '';
    $('qf-a').value = q.opts?.[0] || '';
    $('qf-b').value = q.opts?.[1] || '';
    $('qf-c').value = q.opts?.[2] || '';
    $('qf-d').value = q.opts?.[3] || '';
    if(type === 'mcq_multi'){
      (q.ans || []).forEach(i => { const cb = $('qf-ans-m'+i); if(cb) cb.checked = true; });
    }else{
      $('qf-ans').value = q.ans ?? 0;
    }
    if($('qf-bank')) $('qf-bank').value = (q.bank || []).join(', ');
    if($('qf-pairs')) $('qf-pairs').value = (q.pairs || []).map(p => `${p.left} = ${p.right}`).join('\n');
    applyQTypeUI();
    if(type === 'fill_blank' || type === 'drag_drop') renderBlankInputs(q.blanks || []);
  }else{
    ['qf-text','qf-audio','qf-video','qf-explain','qf-a','qf-b','qf-c','qf-d','qf-bank','qf-pairs'].forEach(id => { if($(id)) $(id).value = ''; });
    $('qf-ans').value = '0';
    $('qf-type').value = 'mcq_single';
    applyQTypeUI();
    const currentFltCat = $('flt-cat')?.value || '';
    const currentFltSubcat = $('flt-subcat')?.value || '';
    if(currentFltCat){
      $('qf-cat').value = currentFltCat;
      fillSubcatSelect('qf-subcat', currentFltCat, false);
      if(currentFltSubcat) $('qf-subcat').value = currentFltSubcat;
    }else updateQFormSubcat();
  }
  
  $('qform').style.display = 'block';
  updateQFormPreviews();
  typesetMath($('qform'));
  
  // TỰ ĐỘNG CUỘN LÊN FORM MƯỢT MÀ
  $('qform').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function closeQForm(){ $('qform').style.display = 'none'; editQId = null; }

export async function saveQ(){
  const type = $('qf-type').value;
  const text = $('qf-text').value.trim();
  if(!text){ alert('Vui lòng nhập nội dung câu hỏi!'); return; }
  const image = $('qf-image') ? $('qf-image').value.trim() : '';
  const audio = $('qf-audio') ? $('qf-audio').value.trim() : '';
  const video = $('qf-video') ? $('qf-video').value.trim() : '';
  const explain = $('qf-explain') ? $('qf-explain').value.trim() : ''; 
  const cat = $('qf-cat').value;
  const subcat = $('qf-subcat').value;

  let fields = { type };
  if(type === 'mcq_single' || type === 'mcq_multi'){
    const opts = ['qf-a','qf-b','qf-c','qf-d'].map(id => $(id).value.trim());
    if(opts.some(x => !x)){ alert('Vui lòng điền đầy đủ 4 đáp án A/B/C/D!'); return; }
    if(type === 'mcq_single'){
      fields.opts = opts;
      fields.ans = parseInt($('qf-ans').value);
    }else{
      const ans = ['qf-ans-m0','qf-ans-m1','qf-ans-m2','qf-ans-m3']
        .map((id,i) => $(id).checked ? i : -1).filter(i => i >= 0);
      if(ans.length < 2){ alert('Trắc nghiệm nhiều đáp án cần chọn ít nhất 2 ô đúng!'); return; }
      fields.opts = opts;
      fields.ans = ans;
    }
  }else if(type === 'fill_blank' || type === 'drag_drop'){
    const n = countBlanks(text);
    if(!n){ alert('Câu hỏi cần có ít nhất 1 dấu ___ đánh dấu chỗ trống!'); return; }
    const blanks = Array.from($('qf-blanks-wrap').querySelectorAll('.qf-blank-input')).map(i => i.value.trim());
    if(blanks.some(b => !b)){ alert('Vui lòng nhập đáp án đúng cho tất cả các chỗ trống!'); return; }
    fields.blanks = blanks;
    if(type === 'drag_drop'){
      const bank = ($('qf-bank').value || '').split(',').map(s => s.trim()).filter(Boolean);
      if(bank.length < n){ alert('Ngân hàng từ cần có ít nhất bằng số chỗ trống!'); return; }
      fields.bank = bank;
    }
  }else if(type === 'matching'){
    const lines = ($('qf-pairs').value || '').split('\n').map(l => l.trim()).filter(Boolean);
    const pairs = lines.map(l => {
      const i = l.indexOf('=');
      if(i < 0) return null;
      return { left: l.slice(0,i).trim(), right: l.slice(i+1).trim() };
    }).filter(p => p && p.left && p.right);
    if(pairs.length < 2){ alert('Cần ít nhất 2 cặp ghép hợp lệ, định dạng mỗi dòng: Trái = Phải'); return; }
    fields.pairs = pairs;
  }

  const saveBtn = $('btn-save-q');
  if(saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...'; }

  try {
    if(editQId){
      const q = state.questions.find(x => x.id === editQId);
      if(q && !canEditItem(q, state.currentUserEmail)) {
        alert("❌ Bạn không có quyền chỉnh sửa câu hỏi của giáo viên khác!");
        return;
      }
      if(q) {
        delete q.opts; delete q.ans; delete q.blanks; delete q.bank; delete q.pairs;
        Object.assign(q, { cat, subcat, text, image, audio, video, explain, ...fields }); 
      }
      let updatePayload = { cat, subcat, text, image, audio, video, explain, ...fields };
      let { error } = await db().from('questions').update(updatePayload).eq('id', editQId);
      if(error && error.message && error.message.includes('column') && error.message.includes('video')) {
        delete updatePayload.video;
        const retry = await db().from('questions').update(updatePayload).eq('id', editQId);
        if (retry.error) throw retry.error;
      } else if (error) {
        throw error;
      }
      await logTeacherActivity('Cập nhật', 'Câu hỏi', text.replace(/<[^>]*>?/gm, '').substring(0, 60), editQId, `Môn: ${cat || ''} / ${subcat || ''}`);
      alert("✅ Đã cập nhật câu hỏi thành công!");
    }else{
      const payload = { cat, subcat, text, image, audio, video, explain, created_by: state.currentUserEmail || 'nam3010hcm@gmail.com', ...fields }; 
      let insertPayload = [payload];
      let { data, error } = await db().from('questions').insert(insertPayload).select();
      if(error && error.message && error.message.includes('column') && error.message.includes('video')) {
        const fallbackPayload = [{ ...payload }];
        delete fallbackPayload[0].video;
        const retry = await db().from('questions').insert(fallbackPayload).select();
        data = retry.data;
        error = retry.error;
      }
      if(error) throw error;
      const created = data?.[0] || { id: state.nextQId++, ...payload };
      state.questions.unshift({
        ...created,
        id: Number(created.id),
        opts: created.opts || [],
        blanks: created.blanks || [],
        bank: created.bank || [],
        pairs: created.pairs || []
      });
      await logTeacherActivity('Tạo mới', 'Câu hỏi', text.replace(/<[^>]*>?/gm, '').substring(0, 60), created.id, `Môn: ${cat || ''} / ${subcat || ''}`);
      alert("✅ Đã tạo câu hỏi mới thành công!");
    }
    closeQForm();
    renderQuestions();
  } catch(error) {
    console.error("Lỗi lưu câu hỏi:", error);
    alert("❌ Lỗi khi lưu câu hỏi: " + (error.message || ''));
  } finally {
    if(saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✅ Lưu câu hỏi'; }
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

function filteredQuestions(){
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
    
    // Cập nhật giao diện xem đáp án có thẻ HTML (Đáp án đúng màu đỏ đậm)
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
        <!-- KHUNG HIỂN THỊ TRẠNG THÁI 1: MÃ NGUỒN LATEX GỐC -->
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

function downloadTemplateCSV(){
  const csv = '\uFEFFcat,subcat,text,image,A,B,C,D,ans\nToán,Toán/Phần 1 - Số học,"Tính $2^5+3^2$",,"$32$","$41$","$25$","$64$",B';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'mau_import_cau_hoi.csv';
  a.click();
}

async function loadSheetJS(){
  if(window.XLSX) return window.XLSX;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.XLSX;
}

async function importQuestionsFromFile(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const XLSX = await loadSheetJS();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, {type:'array'});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
    const newQs = [];
    for(const r of rows){
      const cat = String(r.cat || r.Cat || r['Chủ đề'] || r['Chu de'] || '').trim();
      const subcat = String(r.subcat || r.Subcat || r['Phần'] || r['Phan'] || '').trim();
      const text = String(r.text || r.Question || r.question || r['Câu hỏi'] || r['Cau hoi'] || '').trim();
      const image = String(r.image || r.Image || r['Hình ảnh'] || '').trim();
      const explain = String(r.explain || r.Explain || r['Giải thích'] || '').trim();
      const opts = ['A','B','C','D'].map(k => String(r[k] || r[k.toLowerCase()] || '').trim());
      let ansRaw = String(r.ans || r.Answer || r.answer || r['Đáp án'] || r['Dap an'] || 'A').trim().toUpperCase();
      let ans = ['A','B','C','D'].indexOf(ansRaw);
      if(ans < 0 && /^[0-3]$/.test(ansRaw)) ans = parseInt(ansRaw);
      if(!cat || !text || opts.some(x=>!x) || ans < 0) continue;
      const q = { id: state.nextQId++, cat, subcat, text, image, explain, opts, ans };
      state.questions.push(q);
      newQs.push(q);
    }
    if (newQs.length > 0) {
      const { error } = await db().from('questions').insert(newQs);
      if(error) console.error("Lỗi insert questions:", error);
    }
    alert(`✅ Đã import ${newQs.length} câu hỏi.`);
    e.target.value = '';
    renderQuestions();
  }catch(err){
    console.error(err);
    alert('Không import được file. Hãy kiểm tra định dạng cột hoặc kết nối mạng để tải thư viện XLSX.');
  }
}

// ==============================================================
// HỆ THỐNG LIVE PREVIEW 2 TRẠNG THÁI CHO FORM SOẠN CÂU HỎI
// ==============================================================
let qFormPrevTimeout = null;
export function updateQFormPreviews() {
  if (qFormPrevTimeout) clearTimeout(qFormPrevTimeout);
  qFormPrevTimeout = setTimeout(() => {
    const textVal = $('qf-text')?.value || '';
    const textPrev = $('qf-text-preview');
    if (textPrev) {
      textPrev.innerHTML = textVal.trim() ? renderRich(textVal) : '<span style="color:#94a3b8;font-style:italic;">(Nội dung câu hỏi sau khi render sẽ xuất hiện ở đây)</span>';
      typesetMath(textPrev);
    }

    ['a', 'b', 'c', 'd'].forEach(k => {
      const val = $(`qf-${k}`)?.value || '';
      const prev = $(`qf-${k}-preview`);
      if (prev) {
        prev.innerHTML = val.trim() ? renderRich(val) : '<span style="color:#94a3b8;font-size:11.5px;font-style:italic;">(Trống)</span>';
        typesetMath(prev);
      }
    });

    const expVal = $('qf-explain')?.value || '';
    const expPrev = $('qf-explain-preview');
    if (expPrev) {
      if (expVal.trim()) {
        expPrev.style.display = 'block';
        expPrev.innerHTML = '<b>💡 Giải thích:</b> ' + renderRich(expVal);
        typesetMath(expPrev);
      } else {
        expPrev.style.display = 'none';
      }
    }
  }, 100);
}

export function toggleQLatexSource(qId) {
  const el = document.getElementById('q-latex-raw-' + qId);
  if (el) {
    el.style.display = (el.style.display === 'none' ? 'block' : 'none');
  }
}

window.updateQFormPreviews = updateQFormPreviews;
window.toggleQLatexSource = toggleQLatexSource;

