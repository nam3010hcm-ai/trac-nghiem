import { state, $, esc, getPool, fillSubcatSelect, canEditItem, getAuthorDisplayName, logTeacherActivity } from './common.js';

const db = () => window.supabaseClient;

export function updateEFormSubcat(){ fillSubcatSelect('ef-subcat', $('ef-cat')?.value || '', true, '(Không lọc theo phần)'); }
export function populateExamSelect(){
  const sel = $('s-exam');
  if(!sel) return;
  const visibleExams = state.exams.filter(e => !e.isHidden);
  if(!visibleExams.length){
    sel.innerHTML = '<option value="">(Không có đề thi nào đang mở)</option>';
    const desc = $('s-exam-desc'); if(desc) desc.textContent = '';
    return;
  }
  sel.innerHTML = visibleExams.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
  updateExamDesc();
}

export function updateExamDesc(){
  const sel = $('s-exam');
  if(!sel || !sel.value) return;
  const e = state.exams.find(x => x.id === parseInt(sel.value));
  const pool = e ? getPool(e).length : 0;
  $('s-exam-desc').textContent = e ? `${e.desc || ''} • ${e.count} câu • Ngân hàng: ${pool} câu${e.timeLimit>0?' • ⏱ '+e.timeLimit+' phút':''}` : '';
}

export function openEForm(id = null) {
    const eForm = $('eform');
    if (!eForm) return;

    // Xác định tab đang hiển thị (tc-practice hay tc-e)
    const isPracticeTab = $('tc-practice') && $('tc-practice').style.display !== 'none';
    if (isPracticeTab) {
        const pList = $('practice-e-list');
        if (pList && eForm.parentNode !== $('tc-practice')) {
            $('tc-practice').insertBefore(eForm, pList);
        }
    } else {
        const eList = $('e-list');
        if (eList && eForm.parentNode !== $('tc-e')) {
            $('tc-e').insertBefore(eForm, eList);
        }
    }

    eForm.style.display = 'block';
    
    if (id) {
        // --- TRƯỜNG HỢP: SỬA ĐỀ THI ---
        const exam = state.exams.find(e => e.id === id);
        if (exam) {
            // Đổ dữ liệu cũ vào form
            $('ef-name').value = exam.name || '';
            $('ef-desc').value = exam.desc || '';
            $('ef-count').value = exam.count || 10;
            $('ef-time').value = exam.timeLimit || 0;
            
            // Xử lý Category và Sub-category
            $('ef-cat').value = exam.cat || '';
            updateEFormSubcat(); // Bắt buộc gọi hàm này để load danh sách phần con
            $('ef-subcat').value = exam.subcat || '';
            
            // Đổi giao diện để giáo viên biết đang ở chế độ Sửa
            const titleEl = document.querySelector('#eform .sec-title');
            if (titleEl) titleEl.innerText = isPracticeTab ? '✏️ Sửa Đề Ôn Thi & Luyện Tập' : '✏️ Sửa Đề Thi Chính Thức';
            $('btn-save-exam').innerText = '✅ Cập nhật';
            
            // Gắn ID của đề thi vào nút Lưu để lát nữa hàm saveExam biết đường cập nhật
            $('btn-save-exam').dataset.editId = id; 
        }
    } else {
        // --- TRƯỜNG HỢP: TẠO MỚI ---
        $('ef-name').value = '';
        $('ef-desc').value = '';
        $('ef-count').value = 10;
        $('ef-time').value = 0;

        const currentCat = isPracticeTab ? ($('flt-practice-cat')?.value || '') : ($('flt-e-cat')?.value || '');
        $('ef-cat').value = currentCat;
        updateEFormSubcat();
        $('ef-subcat').value = '';
        
        const titleEl = document.querySelector('#eform .sec-title');
        if (titleEl) titleEl.innerText = isPracticeTab ? '💡 Tạo Đề Ôn Thi & Luyện Tập Mới' : '📝 Tạo Đề Thi Chính Thức Mới';
        $('btn-save-exam').innerText = isPracticeTab ? '✅ Tạo đề ôn thi' : '✅ Tạo đề thi';
        
        // Xóa ID cũ (nếu trước đó vừa bấm sửa đề khác)
        delete $('btn-save-exam').dataset.editId; 
    }

    eForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function closeEForm(){ 
  if ($('eform')) $('eform').style.display = 'none'; 
}

export async function saveExam(){
  const name = $('ef-name').value.trim();
  if(!name){ alert('Nhập tên đề thi!'); return; }
  const count = parseInt($('ef-count').value) || 10;
  const cat = $('ef-cat').value;
  const subcat = $('ef-subcat').value;
  const desc = $('ef-desc').value.trim();
  const timeLimit = parseInt($('ef-time').value) || 0;
  
  const saveBtn = $('btn-save-exam');
  const editId = saveBtn?.dataset?.editId ? (isNaN(saveBtn.dataset.editId) ? saveBtn.dataset.editId : Number(saveBtn.dataset.editId)) : null;
  if(saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...'; }

  try {
    if (editId) {
      const exam = state.exams.find(e => e.id === editId);
      if(exam && !canEditItem(exam, state.currentUserEmail)){
        alert("❌ Bạn không có quyền chỉnh sửa đề thi của giáo viên khác!");
        return;
      }
      if(exam){
        Object.assign(exam, { name, desc, count, cat, subcat, timeLimit });
      }
      const { error } = await db().from('exams').update({
        name, description: desc, count, cat, subcat, time_limit: timeLimit
      }).eq('id', editId);
      if(error) throw error;
      await logTeacherActivity('Cập nhật', 'Đề thi', name, editId, `Quy mô: ${count} câu, Chủ đề: ${cat || 'Chung'}`);
      alert("✅ Cập nhật đề thi thành công!");
    } else {
      const payload = {
        name,
        description: desc,
        count,
        cat,
        subcat,
        time_limit: timeLimit,
        is_hidden: false,
        q_ids: [],
        created_by: state.currentUserEmail || 'nam3010hcm@gmail.com'
      };
      const { data, error } = await db().from('exams').insert([payload]).select();
      if(error) throw error;
      const created = data?.[0] || { id: state.nextEId++, ...payload };
      state.exams.unshift({
        id: Number(created.id),
        name: created.name,
        desc: created.description || created.desc || '',
        count: created.count || 10,
        cat: created.cat || '',
        subcat: created.subcat || '',
        timeLimit: created.time_limit ?? 0,
        isHidden: created.is_hidden ?? false,
        qIds: created.q_ids || [],
        created_by: created.created_by || state.currentUserEmail || 'nam3010hcm@gmail.com'
      });
      await logTeacherActivity('Tạo mới', 'Đề thi', name, created.id, `Quy mô: ${count} câu, Chủ đề: ${cat || 'Chung'}`);
      alert("✅ Tạo đề thi mới thành công!");
    }

    closeEForm();
    renderExams();
    renderPracticeExams();
    populateExamSelect();
    if (typeof window.populateCohortExams === 'function') {
      window.populateCohortExams();
    }
  } catch(error) {
    console.error("Lỗi khi lưu đề thi:", error);
    alert("❌ Lỗi khi lưu đề thi: " + (error.message || ''));
  } finally {
    if(saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editId ? '✅ Cập nhật' : '✅ Tạo đề thi'; }
  }
}

export async function deleteExam(id) {
    const exam = state.exams.find(e => e.id === id);
    if(exam && !canEditItem(exam, state.currentUserEmail)){
        alert("❌ Bạn không có quyền xóa đề thi của giáo viên khác!");
        return;
    }

    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa đề thi này không?")) return;
    
    try {
        // 1. Xóa đề thi trên cơ sở dữ liệu Supabase
        const { error } = await db().from('exams').delete().eq('id', id);
        if(error) throw error;
        
        // 2. Xóa khỏi bộ nhớ tạm (state) của trình duyệt
        state.exams = state.exams.filter(e => e.id !== id);
        await logTeacherActivity('Xóa', 'Đề thi', exam?.name || `Đề thi #${id}`, id, '');
        
        // 3. Cập nhật lại giao diện danh sách đề thi trên cả 2 Tab
        renderExams();
        renderPracticeExams();
        
        // 4. Cập nhật lại danh sách đề thi trong Tab "Ca thi"
        if (typeof window.populateCohortExams === 'function') {
            window.populateCohortExams();
        }
        
        alert("✅ Xóa đề thi thành công!");
    } catch (error) {
        console.error("Lỗi khi xóa đề thi:", error);
        alert("❌ Lỗi: Không thể xóa đề thi. Vui lòng kiểm tra Console.");
    }
}

export async function toggleExamVisibility(id){
  const e = state.exams.find(x => x.id === id);
  if(!e) return;
  if(!canEditItem(e, state.currentUserEmail)){
    alert("❌ Bạn không có quyền ẩn/hiện đề thi của giáo viên khác!");
    return;
  }

  e.isHidden = !e.isHidden;
  const { error } = await db().from('exams').update({ is_hidden: e.isHidden }).eq('id', id);
  if(error) console.error("Lỗi cập nhật trạng thái đề thi:", error);
  await logTeacherActivity(e.isHidden ? 'Ẩn đề thi' : 'Mở đề thi', 'Đề thi', e.name, id, '');
  renderExams();
  renderPracticeExams();
  populateExamSelect();
}

export function renderPracticeExams(){
  const list = $('practice-e-list');
  if(!list) return;

  const catSel = $('flt-practice-cat');
  if (catSel && catSel.getAttribute('data-loaded') !== 'true') {
    const cats = Object.keys(state.SUBCATS || {});
    catSel.innerHTML = '<option value="">(Tất cả Môn học / Chủ đề)</option>' +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    catSel.setAttribute('data-loaded', 'true');
  }

  const fCat = $('flt-practice-cat')?.value || '';
  const fSearch = ($('flt-practice-search')?.value || '').trim().toLowerCase();

  let arr = state.exams || [];
  if (fCat) arr = arr.filter(e => e.cat === fCat);
  if (fSearch) arr = arr.filter(e => (e.name || '').toLowerCase().includes(fSearch) || (e.desc || '').toLowerCase().includes(fSearch));

  if ($('practice-exam-count')) $('practice-exam-count').textContent = arr.length;

  list.innerHTML = arr.map(e => {
    const pool = getPool(e).length;
    const hideClass = e.isHidden ? 'btn-warn' : 'btn-p';
    const hideText = e.isHidden ? '🙈 Đang ẩn' : '👁️ Đang mở ôn thi';
    const statusBadge = e.isHidden ? '<span class="badge-status status-hidden">Đã ẩn</span>' : '<span class="badge-status status-active">Đang mở ôn thi</span>';
    const canEdit = canEditItem(e, state.currentUserEmail);
    const authorName = getAuthorDisplayName(e.created_by);
    const authorBadge = e.created_by ? `<span class="cat-badge" style="background:#f1f5f9;color:#475569;margin-left:4px" title="Người tạo: ${esc(authorName)} (${esc(e.created_by)})">👤 ${esc(authorName)}</span>` : '';

    return `<div class="qitem" style="border-left:4px solid #2563eb;"><div class="qrow">
      <div>
        <div style="font-size:15px;font-weight:700;color:#0f172a">
          💡 ${esc(e.name)} ${statusBadge} ${authorBadge}
        </div>
        <div style="font-size:13px;color:#64748b;margin-top:3px">${esc(e.desc || 'Đề ôn luyện kiến thức')}</div>
        <div style="font-size:11.5px;color:#0284c7;margin-top:5px;font-weight:600">
          📚 ${esc(e.cat || 'Chung')}${e.subcat ? ` • ${esc(e.subcat)}` : ''} • Quy mô: <b>${e.count} câu</b> (Ngân hàng: ${pool} câu) • ${e.timeLimit > 0 ? `⏱ ${e.timeLimit} phút` : '⏱ Không giới hạn thời gian'}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end">
        ${canEdit ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn btn-sm ${hideClass} e-action" data-action="toggle" data-id="${e.id}">${hideText}</button>
            <button class="btn btn-sm e-action" data-action="manage-q" data-id="${e.id}" style="color: #0284c7; border: 1px solid #bae6fd; background: #f0f9ff;">📝 Chọn câu hỏi</button>
            <button class="btn btn-sm e-action" data-action="edit" data-id="${e.id}" style="color: #3b82f6; border: 1px solid #bfdbfe; background: #eff6ff;">✏️ Sửa</button>
            <button class="btn btn-sm btn-danger e-action" data-action="delete" data-id="${e.id}">× Xóa</button>
          </div>
        ` : `
          <span style="font-size:12px;color:#94a3b8;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0" title="Chỉ người tạo hoặc Root Admin mới có quyền sửa/xóa">🔒 Chỉ xem</span>
        `}
      </div>
    </div></div>`;
  }).join('') || '<div class="empty">📭 Chưa có đề ôn thi nào phù hợp.</div>';
}

export function renderExams(){
  const list = $('e-list');
  if(!list) return;

  const catSel = $('flt-e-cat');
  if (catSel && catSel.getAttribute('data-loaded') !== 'true') {
    const cats = Object.keys(state.SUBCATS || {});
    catSel.innerHTML = '<option value="">(Tất cả Môn học / Chủ đề)</option>' +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    catSel.setAttribute('data-loaded', 'true');
  }

  const fCat = $('flt-e-cat')?.value || '';
  const fSearch = ($('flt-e-search')?.value || '').trim().toLowerCase();

  let arr = state.exams || [];
  if (fCat) arr = arr.filter(e => e.cat === fCat);
  if (fSearch) arr = arr.filter(e => (e.name || '').toLowerCase().includes(fSearch) || (e.desc || '').toLowerCase().includes(fSearch));

  if ($('e-count')) $('e-count').textContent = arr.length;

  list.innerHTML = arr.map(e => {
    const pool = getPool(e).length;
    const hideClass = e.isHidden ? 'btn-warn' : 'btn-p';
    const hideText = e.isHidden ? '🙈 Đang ẩn' : '👁️ Đang hiện';
    const statusBadge = e.isHidden ? '<span class="badge-status status-hidden">Đã ẩn</span>' : '<span class="badge-status status-active">Đang mở</span>';
    const canEdit = canEditItem(e, state.currentUserEmail);
    const authorName = getAuthorDisplayName(e.created_by);
    const authorBadge = e.created_by ? `<span class="cat-badge" style="background:#f1f5f9;color:#475569;margin-left:4px" title="Người tạo: ${esc(authorName)} (${esc(e.created_by)})">👤 ${esc(authorName)}</span>` : '';

    return `<div class="qitem"><div class="qrow">
      <div>
        <div style="font-size:14px;font-weight:600">${esc(e.name)} ${statusBadge} ${authorBadge}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${esc(e.desc || '')}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px">${e.count} câu • ${esc(e.subcat || e.cat || 'Tất cả chủ đề')} • Ngân hàng: ${pool} câu${e.timeLimit>0?' • ⏱ '+e.timeLimit+'p':''}</div>
      </div>
      <div style="display:flex;gap:4px;flex-direction:column;align-items:flex-end">
        ${canEdit ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn btn-sm ${hideClass} e-action" data-action="toggle" data-id="${e.id}">${hideText}</button>
            <button class="btn btn-sm e-action" data-action="manage-q" data-id="${e.id}" style="color: #10b981; border: 1px solid #a7f3d0; background: #ecfdf5;">📝 Câu hỏi</button>
            <button class="btn btn-sm e-action" data-action="edit" data-id="${e.id}" style="color: #3b82f6; border: 1px solid #bfdbfe; background: #eff6ff;">✏️ Sửa</button>
            <button class="btn btn-sm btn-danger e-action" data-action="delete" data-id="${e.id}">× Xóa</button>
          </div>
        ` : `
          <span style="font-size:12px;color:#94a3b8;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0" title="Chỉ người tạo hoặc Root Admin mới có quyền sửa/xóa">🔒 Chỉ xem</span>
        `}
      </div>
    </div></div>`;
  }).join('') || '<div class="empty">📭 Chưa có đề thi.</div>';
}

window.renderPracticeExams = renderPracticeExams;
window.renderExams = renderExams;
