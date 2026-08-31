/**
 * MODULE QUESTIONS FORM & WYSIWYG EDITOR (js/questions/questions-form.js)
 * Form tạo/chỉnh sửa câu hỏi, thanh công cụ B/I/U/Color, Live Preview và lưu câu hỏi
 */
import { state, $, esc, countBlanks, fillSubcatSelect, canEditItem, logTeacherActivity, renderRich, typesetMath, uploadMediaFile } from '../common.js';
import { renderQuestions } from './questions-list.js';

const db = () => window.supabaseClient;

export let editQId = null;

export function updateQFormSubcat() {
  fillSubcatSelect('qf-subcat', $('qf-cat')?.value || '', false);
}

// ==============================================================
// HỆ THỐNG SOẠN THẢO VĂN BẢN (B, I, U, ĐỔI MÀU)
// ==============================================================
export function insertFormat(targetId, startTag, endTag) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const selectedText = text.substring(start, end);
  const replacement = startTag + selectedText + endTag;
  
  el.value = text.substring(0, start) + replacement + text.substring(end);
  el.focus();
  el.selectionStart = start + startTag.length;
  el.selectionEnd = start + startTag.length + selectedText.length;
  el.dispatchEvent(new Event('input')); 
}

export function initRichTextEditors() {
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

// Hiển thị/ẩn khối input tương ứng với loại câu hỏi
export function applyQTypeUI(){
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

export function renderBlankInputs(existingVals = null){
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

// LIVE PREVIEW 2 TRẠNG THÁI CHO FORM SOẠN CÂU HỎI
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

export function openQForm(id = null){
  initRichTextEditors();

  editQId = id;
  $('qform-title').textContent = id ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới';
  ['qf-ans-m0','qf-ans-m1','qf-ans-m2','qf-ans-m3'].forEach(cid => { if($(cid)) $(cid).checked = false; });
  
  // RESET TRIỆT ĐỂ KHỐI HÌNH ẢNH, AUDIO, VIDEO
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
  $('qform').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function closeQForm(){
  $('qform').style.display = 'none';
  editQId = null;
}

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

if (typeof window !== 'undefined') {
  window.insertFormat = insertFormat;
  window.updateQFormPreviews = updateQFormPreviews;
}
