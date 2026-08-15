import { supabase } from './supabase.js';
import { state, $, esc, getPool, fillSubcatSelect } from './common.js';

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
    $('eform').style.display = 'block';
    
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
            document.querySelector('#eform .sec-title').innerText = '✏️ Sửa đề thi';
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
        $('ef-cat').value = '';
        updateEFormSubcat();
        $('ef-subcat').value = '';
        
        document.querySelector('#eform .sec-title').innerText = 'Tạo đề thi mới';
        $('btn-save-exam').innerText = '✅ Tạo đề thi';
        
        // Xóa ID cũ (nếu trước đó vừa bấm sửa đề khác)
        delete $('btn-save-exam').dataset.editId; 
    }
}

export function closeEForm(){ $('eform').style.display='none'; }

export async function saveExam(){
  const name = $('ef-name').value.trim();
  if(!name){ alert('Nhập tên đề thi!'); return; }
  const count = parseInt($('ef-count').value) || 10;
  const cat = $('ef-cat').value;
  const subcat = $('ef-subcat').value;
  const desc = $('ef-desc').value.trim();
  const timeLimit = parseInt($('ef-time').value) || 0;
  
  const saveBtn = $('btn-save-exam');
  if(saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...'; }

  try {
    if (editId) {
      const exam = state.exams.find(e => e.id === editId);
      if(exam){
        Object.assign(exam, { name, desc, count, cat, subcat, timeLimit });
      }
      const { error } = await supabase.from('exams').update({
        name, description: desc, count, cat, subcat, time_limit: timeLimit
      }).eq('id', editId);
      if(error) throw error;
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
        q_ids: []
      };
      const { data, error } = await supabase.from('exams').insert([payload]).select();
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
        qIds: created.q_ids || []
      });
      alert("✅ Tạo đề thi mới thành công!");
    }

    closeEForm();
    renderExams();
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
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa đề thi này không?")) return;
    
    try {
        // 1. Xóa đề thi trên cơ sở dữ liệu Supabase
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if(error) throw error;
        
        // 2. Xóa khỏi bộ nhớ tạm (state) của trình duyệt
        state.exams = state.exams.filter(e => e.id !== id);
        
        // 3. Cập nhật lại giao diện danh sách đề thi
        renderExams();
        
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
  e.isHidden = !e.isHidden;
  const { error } = await supabase.from('exams').update({ is_hidden: e.isHidden }).eq('id', id);
  if(error) console.error("Lỗi cập nhật trạng thái đề thi:", error);
  renderExams();
  populateExamSelect();
}

export function renderExams(){
  const list = $('e-list');
  if(!list) return;
  list.innerHTML = state.exams.map(e => {
    const pool = getPool(e).length;
    const hideClass = e.isHidden ? 'btn-warn' : 'btn-p';
    const hideText = e.isHidden ? '🙈 Đang ẩn' : '👁️ Đang hiện';
    const statusBadge = e.isHidden ? '<span class="badge-status status-hidden">Đã ẩn</span>' : '<span class="badge-status status-active">Đang mở</span>';
    return `<div class="qitem"><div class="qrow">
      <div>
        <div style="font-size:14px;font-weight:600">${esc(e.name)} ${statusBadge}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${esc(e.desc || '')}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px">${e.count} câu • ${esc(e.subcat || e.cat || 'Tất cả chủ đề')} • Ngân hàng: ${pool} câu${e.timeLimit>0?' • ⏱ '+e.timeLimit+'p':''}</div>
      </div>
      <div style="display:flex;gap:4px;flex-direction:column;align-items:flex-end">
        <button class="btn btn-sm ${hideClass} e-action" data-action="toggle" data-id="${e.id}">${hideText}</button>
        <button class="btn btn-sm e-action" data-action="manage-q" data-id="${e.id}" style="color: #10b981; border: 1px solid #a7f3d0; background: #ecfdf5; margin-right: 6px;">📝 Câu hỏi</button>
        <button class="btn btn-sm e-action" data-action="edit" data-id="${e.id}" style="color: #3b82f6; border: 1px solid #bfdbfe; background: #eff6ff; margin-right: 6px;">✏️ Sửa</button>
        <button class="btn btn-sm btn-danger e-action" data-action="delete" data-id="${e.id}">× Xóa</button>
      </div>
    </div></div>`;
  }).join('') || '<div class="empty">📭 Chưa có đề thi.</div>';
}
