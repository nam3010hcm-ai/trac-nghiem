import { state, $, esc, clone, DEFAULT_SUBCATS, fillSubcatSelect } from './common.js';

const db = () => window.supabaseClient;

async function syncCategoriesToSupabase(){
  try{
    const inserts = Object.keys(state.SUBCATS).map(name => ({
      name,
      subcategories: state.SUBCATS[name] || []
    }));
    await db().from('categories').upsert(inserts, { onConflict: 'name' });
  }catch(e){
    console.error("Lỗi đồng bộ danh mục Supabase:", e);
  }
}

export function populateCategoryDropdowns(){
  const cats = Object.keys(state.SUBCATS).sort();
  const setOptions = (id, prefix='') => { const el=$(id); if(el) el.innerHTML = prefix + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join(''); };
  setOptions('flt-cat','<option value="">(Tất cả chủ đề)</option>');
  setOptions('qf-cat');
  setOptions('ef-cat','<option value="">(Tất cả chủ đề)</option>');
  setOptions('flt-e-cat','<option value="">(Tất cả Môn học / Chủ đề)</option>');
  setOptions('flt-practice-cat','<option value="">(Tất cả Môn học / Chủ đề)</option>');
  setOptions('add-sub-parent');
}

export function updateFltSubcat(){ fillSubcatSelect('flt-subcat', $('flt-cat')?.value || '', true, '(Tất cả phần)'); }
export function updateQFormSubcat(){ fillSubcatSelect('qf-subcat', $('qf-cat')?.value || '', false); }
export function updateEFormSubcat(){ fillSubcatSelect('ef-subcat', $('ef-cat')?.value || '', true, '(Không lọc theo phần)'); }

export async function addParentCategory(){
  const name = $('new-parent-cat').value.trim();
  if(!name){ alert('Vui lòng nhập tên chủ đề cha!'); return; }
  const exists = Object.keys(state.SUBCATS).some(c => c.toLowerCase() === name.toLowerCase());
  if(exists){ alert('Chủ đề cha này đã tồn tại!'); return; }
  state.SUBCATS[name] = [];
  try {
    const { error } = await db().from('categories').upsert([{ name, subcategories: [] }], { onConflict: 'name' });
    if(error) throw error;
    $('new-parent-cat').value = '';
    refreshCategoryUI();
    alert('✅ Đã thêm chủ đề cha thành công!');
  } catch(e) {
    console.error("Lỗi thêm chủ đề cha:", e);
    alert("❌ Lỗi khi thêm chủ đề cha: " + (e.message || ''));
  }
}

export async function deleteParentCategory(parent){
  if(!confirm(`Xóa chủ đề cha "${parent}"? Các câu hỏi/đề thi thuộc chủ đề này sẽ bị bỏ liên kết.`)) return;
  const subs = state.SUBCATS[parent] || [];
  
  const updatedSubcats = { ...state.SUBCATS };
  delete updatedSubcats[parent];
  state.SUBCATS = updatedSubcats;

  try {
    await db().from('categories').delete().eq('name', parent);
    for(const q of (state.questions || [])){
      if(q.cat === parent || subs.includes(q.subcat)){ 
          q.cat=''; q.subcat=''; 
          await db().from('questions').update({ cat: '', subcat: '' }).eq('id', q.id);
      }
    }
    for(const e of (state.exams || [])){
      if(e.cat === parent || subs.includes(e.subcat)){ 
          e.cat=''; e.subcat=''; 
          await db().from('exams').update({ cat: '', subcat: '' }).eq('id', e.id);
      }
    }
    refreshCategoryUI();
    if(typeof window.renderQuestions === 'function') window.renderQuestions();
    if(typeof window.renderExams === 'function') window.renderExams();
    alert('✅ Đã xóa chủ đề cha!');
  } catch(e) {
    console.error("Lỗi xóa chủ đề cha:", e);
    alert("❌ Lỗi khi xóa chủ đề cha: " + (e.message || ''));
  }
}

export async function addSubCategory(){
  const parent = $('add-sub-parent').value;
  let subName = $('new-sub-cat').value.trim();
  if(!parent || !subName){ alert('Vui lòng chọn chủ đề cha và nhập tên chủ đề con!'); return; }
  if(!state.SUBCATS[parent]) state.SUBCATS[parent] = [];
  if(!subName.startsWith(parent + '/')) subName = parent + '/' + subName;
  const exists = state.SUBCATS[parent].some(s => s.trim().toLowerCase() === subName.trim().toLowerCase());
  if(exists){ alert('Phần con này đã tồn tại!'); return; }
  state.SUBCATS[parent].push(subName);
  try {
    const { error } = await db().from('categories').update({ subcategories: state.SUBCATS[parent] }).eq('name', parent);
    if(error) throw error;
    $('new-sub-cat').value = '';
    refreshCategoryUI();
    alert('✅ Đã thêm phần con thành công!');
  } catch(e) {
    console.error("Lỗi thêm phần con:", e);
    alert("❌ Lỗi khi thêm phần con: " + (e.message || ''));
  }
}

export async function deleteSubCategory(parent, sub){
  if(!confirm(`Xóa phần con "${sub}"? Các câu hỏi/đề thi thuộc phần này sẽ bị bỏ liên kết.`)) return;
  
  const updatedSubcats = { ...state.SUBCATS };
  updatedSubcats[parent] = (updatedSubcats[parent] || []).filter(s => s !== sub);
  state.SUBCATS = updatedSubcats;

  try {
    await db().from('categories').update({ subcategories: state.SUBCATS[parent] }).eq('name', parent);
    for(const q of (state.questions || [])){
      if(q.subcat === sub){ 
          q.subcat = ''; 
          await db().from('questions').update({ subcat: '' }).eq('id', q.id);
      }
    }
    for(const e of (state.exams || [])){
      if(e.subcat === sub){ 
          e.subcat = ''; 
          await db().from('exams').update({ subcat: '' }).eq('id', e.id);
      }
    }
    refreshCategoryUI();
    if(typeof window.renderQuestions === 'function') window.renderQuestions();
    if(typeof window.renderExams === 'function') window.renderExams();
    alert('✅ Đã xóa phần con!');
  } catch(e) {
    console.error("Lỗi xóa phần con:", e);
    alert("❌ Lỗi khi xóa phần con: " + (e.message || ''));
  }
}

export async function editSubCategory(parent, oldSub){
  const defaultName = oldSub.startsWith(parent + '/') ? oldSub.substring(parent.length + 1) : oldSub;
  let newNamePart = prompt(`Nhập tên mới cho phần con (thuộc chủ đề ${parent}):`, defaultName);
  if(newNamePart === null) return;
  newNamePart = newNamePart.trim();
  if(!newNamePart) return;
  const newSub = parent + '/' + newNamePart;
  if(newSub === oldSub) return;
  if((state.SUBCATS[parent] || []).some(s => s.toLowerCase() === newSub.toLowerCase())){ alert('Tên phần con này đã tồn tại!'); return; }

  const idx = state.SUBCATS[parent].indexOf(oldSub);
  if(idx === -1) return;
  state.SUBCATS[parent][idx] = newSub;
  try {
    await db().from('categories').update({ subcategories: state.SUBCATS[parent] }).eq('name', parent);
    let qCount = 0, eCount = 0;
    for(const q of state.questions){
      if(q.subcat === oldSub){ q.subcat = newSub; await db().from('questions').update({ subcat: newSub }).eq('id', q.id); qCount++; }
    }
    for(const e of state.exams){
      if(e.subcat === oldSub){ e.subcat = newSub; await db().from('exams').update({ subcat: newSub }).eq('id', e.id); eCount++; }
    }
    refreshCategoryUI();
    if(typeof window.renderQuestions === 'function') window.renderQuestions();
    if(typeof window.renderExams === 'function') window.renderExams();
    if(typeof window.populateExamSelect === 'function') window.populateExamSelect();
    alert(`✅ Đổi tên thành công!\nĐồng bộ: ${qCount} câu hỏi, ${eCount} đề thi`);
  } catch(e) {
    console.error("Lỗi đổi tên phần con:", e);
    alert("❌ Lỗi khi đổi tên: " + (e.message || ''));
  }
}

export async function restoreDefaultCategories(){
  if(!confirm('Khôi phục danh mục gốc? Các chủ đề bạn tạo thêm có thể bị xóa.')) return;
  state.SUBCATS = clone(DEFAULT_SUBCATS);
  try {
    await syncCategoriesToSupabase();
    refreshCategoryUI();
    alert('✅ Đã khôi phục danh mục gốc!');
  } catch(e) {
    console.error("Lỗi khôi phục danh mục:", e);
    alert("❌ Lỗi khi khôi phục: " + (e.message || ''));
  }
}

export function renderCatManagementList(){
  const listDiv = $('cat-management-list');
  if(!listDiv) return;
  const cats = Object.keys(state.SUBCATS).sort();
  if(!cats.length){ listDiv.innerHTML = '<div class="empty">📭 Hệ thống chưa có danh mục nào.</div>'; return; }
  listDiv.innerHTML = cats.map(parent => {
    const subs = state.SUBCATS[parent] || [];
    return `<div class="qitem">
      <div class="qrow" style="border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px">
        <strong>📁 Chủ đề cha: ${esc(parent)} (${subs.length} phần con)</strong>
        <button class="btn btn-sm btn-danger cat-action" data-action="delete-parent" data-parent="${esc(parent)}">Xóa Cha</button>
      </div>
      <div style="padding-left:16px">
        ${subs.length === 0 ? '<span style="font-size:12px;color:#94a3b8;font-style:italic">(Chưa có phần con)</span>' :
          subs.map(sub => `<div class="qrow" style="padding:5px 0;border-bottom:1px dashed #f1f5f9">
            <span>🔹 ${esc(sub)}</span>
            <div>
              <button class="btn btn-sm cat-action" data-action="edit-sub" data-parent="${esc(parent)}" data-sub="${esc(sub)}">Sửa</button>
              <button class="btn btn-sm btn-danger cat-action" data-action="delete-sub" data-parent="${esc(parent)}" data-sub="${esc(sub)}">Xóa</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

export function refreshCategoryUI(){
  populateCategoryDropdowns();
  updateFltSubcat();
  updateQFormSubcat();
  updateEFormSubcat();
  renderCatManagementList();
}
