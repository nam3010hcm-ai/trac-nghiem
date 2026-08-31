/**
 * MODULE TEACHER COHORTS & CLASS SESSIONS (js/teacher/teacher-cohorts.js)
 * Quản lý ca thi / lớp học trực tuyến, mã truy cập bảo mật và thời gian mở/đóng ca
 */
import { state, esc } from '../common.js';

const db = () => window.supabaseClient;

export let allCohortsData = {};
export let editingCohortId = null;

// Hàm hiển thị danh sách đề thi dạng Checkbox cho Form tạo / sửa Ca thi
export function populateCohortExams() {
  const container = document.getElementById("t-cohort-exams");
  if (!container) return;
  
  if (typeof state === 'undefined' || !state.exams) {
    container.innerHTML = '<div style="color:#ef4444; font-size:13px;">Lỗi: Chưa tải được dữ liệu đề thi. Vui lòng F5 lại trang!</div>';
    return;
  }

  const visibleExams = state.exams.filter(e => !e.isHidden);

  if (visibleExams.length === 0) {
    container.innerHTML = '<div style="color:#64748b; font-size:13px; text-align:center; padding: 10px;">Không có đề thi nào đang ở chế độ HIỆN!</div>';
    return;
  }

  container.innerHTML = visibleExams.map(e => `
    <label style="
      display: flex !important; 
      justify-content: flex-start !important; 
      align-items: center !important; 
      text-align: left !important; 
      gap: 12px; 
      margin-bottom: 8px; 
      padding: 10px 12px; 
      background: #ffffff; 
      border: 1px solid #cbd5e1; 
      border-radius: 6px; 
      cursor: pointer; 
      width: 100%; 
      box-sizing: border-box;
      transition: all 0.2s;
    ">
      <input type="checkbox" class="cohort-exam-cb" value="${e.id}" style="
        margin: 0 !important; 
        width: 18px !important; 
        height: 18px !important; 
        flex-shrink: 0; 
        cursor: pointer;
      "> 
      <span style="
        font-weight: 500; 
        font-size: 14px; 
        color: #334155; 
        word-break: break-word;
        line-height: 1.4;
      ">
        ${esc(e.name)}
      </span>
    </label>
  `).join('');
}

// 1. Hàm tải danh sách ca thi
export async function loadCohorts() {
  const tbody = document.getElementById("t-cohort-list");
  if (!tbody) return;

  try {
    const { data: cohorts, error } = await db().from('cohorts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    tbody.innerHTML = "";
    allCohortsData = {};

    if (!cohorts || cohorts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px;">Chưa có ca thi nào</td></tr>';
      return;
    }

    cohorts.forEach(data => {
      const id = String(data.id);
      allCohortsData[id] = {
        ...data,
        startTime: data.start_time || data.startTime,
        endTime: data.end_time || data.endTime,
        allowedExams: data.allowed_exams || data.allowedExams || []
      };
      const isActive = data.status === 'active';
      const modeText = data.mode === 'exam' ? '📝 Thi thật' : '📖 Ôn luyện';
      const sTime = data.start_time ? new Date(data.start_time).toLocaleString('vi-VN') : 'Không giới hạn';
      const eTime = data.end_time ? new Date(data.end_time).toLocaleString('vi-VN') : 'Không giới hạn';
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color:#1e293b;">${esc(data.name)}</div>
          <div style="font-size:12px; color:#f59e0b; font-weight:600; margin-top:4px;">Chế độ: ${modeText}</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">Từ: ${sTime}</div>
          <div style="font-size:12px; color:#64748b;">Đến: ${eTime}</div>
          <div style="font-size:12px; color:#10b981; font-weight:600; margin-top:4px;">
            Mã truy cập: <span style="background:#d1fae5; padding:2px 6px; border-radius:4px; color:#065f46;">${esc(data.code)}</span>
            <button onclick="window.changeCohortCode('${id}', '${esc(data.code)}')" style="border:none; background:none; cursor:pointer; color:#3b82f6; text-decoration:underline;">(Đổi mã)</button>
          </div>
        </td>
        <td>
          <span style="color: ${isActive ? '#1D9E75' : '#ef4444'}; font-weight: 600; font-size: 13px;">
            ${isActive ? 'Đang mở' : 'Đã đóng'}
          </span>
        </td>
        <td style="display: flex; gap: 5px; flex-direction:column;">
          <button class="btn" onclick="window.editCohort('${id}')" style="padding: 4px 10px; font-size: 12px; background: #e0e7ff; color: #4f46e5;">
            ✏️ Sửa
          </button>
          <button class="btn" onclick="window.toggleCohort('${id}', '${data.status}')" style="padding: 4px 10px; font-size: 12px; background: #f1f5f9; color: #334155;">
            ${isActive ? 'Khóa ca thi' : 'Mở lại'}
          </button>
          <button class="btn" onclick="window.deleteCohort('${id}')" style="padding: 4px 10px; font-size: 12px; background: #fee2e2; color: #ef4444;">
            Xóa
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Lỗi tải danh sách ca thi:", error);
  }
}

// 2. Hàm đẩy dữ liệu lên Form để Sửa
export function editCohort(id) {
  const data = allCohortsData[id];
  if (!data) return;

  editingCohortId = id;
  if (document.getElementById("t-cohort-name")) document.getElementById("t-cohort-name").value = data.name || '';
  if (document.getElementById("t-cohort-code")) document.getElementById("t-cohort-code").value = data.code || '';
  if (document.getElementById("t-cohort-start")) document.getElementById("t-cohort-start").value = data.startTime || '';
  if (document.getElementById("t-cohort-end")) document.getElementById("t-cohort-end").value = data.endTime || '';
  
  const modeSelect = document.getElementById("t-cohort-mode");
  if(modeSelect) modeSelect.value = data.mode || 'practice';

  const allowed = data.allowedExams || [];
  document.querySelectorAll('.cohort-exam-cb').forEach(cb => {
    cb.checked = allowed.includes(parseInt(cb.value));
  });

  const btn = document.getElementById("btn-add-cohort");
  if (btn) {
    btn.textContent = "💾 Cập nhật Ca thi";
    btn.style.background = "#f59e0b";
  }
  
  let cancelBtn = document.getElementById("btn-cancel-edit-cohort");
  if (!cancelBtn && btn) {
    cancelBtn = document.createElement("button");
    cancelBtn.id = "btn-cancel-edit-cohort";
    cancelBtn.className = "btn";
    cancelBtn.style.marginTop = "10px";
    cancelBtn.style.marginLeft = "8px";
    cancelBtn.textContent = "Hủy sửa";
    cancelBtn.onclick = () => cancelEditCohort();
    btn.parentNode.insertBefore(cancelBtn, btn.nextSibling);
  }
  if (cancelBtn) cancelBtn.style.display = "inline-block";
  document.getElementById("t-cohort-name")?.scrollIntoView({ behavior: 'smooth' });
}

// 3. Hàm Hủy chế độ Sửa và làm sạch Form
export function cancelEditCohort() {
  editingCohortId = null;
  if (document.getElementById("t-cohort-name")) document.getElementById("t-cohort-name").value = "";
  if (document.getElementById("t-cohort-code")) document.getElementById("t-cohort-code").value = "";
  if (document.getElementById("t-cohort-start")) document.getElementById("t-cohort-start").value = "";
  if (document.getElementById("t-cohort-end")) document.getElementById("t-cohort-end").value = "";
  document.querySelectorAll('.cohort-exam-cb').forEach(cb => cb.checked = false);
  
  const btn = document.getElementById("btn-add-cohort");
  if(btn) {
    btn.textContent = "✅ Tạo Ca thi";
    btn.style.background = "";
  }
  
  const cancelBtn = document.getElementById("btn-cancel-edit-cohort");
  if(cancelBtn) cancelBtn.style.display = "none";
}

// 4. Thêm hoặc Cập nhật ca thi
export async function addCohort() {
  const name = document.getElementById("t-cohort-name")?.value?.trim();
  const mode = document.getElementById("t-cohort-mode") ? document.getElementById("t-cohort-mode").value : 'practice';
  let code = document.getElementById("t-cohort-code")?.value?.trim();
  const startTime = document.getElementById("t-cohort-start")?.value;
  const endTime = document.getElementById("t-cohort-end")?.value;
  
  const checkedExams = Array.from(document.querySelectorAll('.cohort-exam-cb:checked')).map(cb => parseInt(cb.value));

  if (!name) { alert("Vui lòng nhập tên ca thi!"); return; }
  if (!startTime || !endTime) { alert("Vui lòng chọn thời gian bắt đầu và kết thúc!"); return; }
  if (new Date(startTime) >= new Date(endTime)) { alert("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!"); return; }
  if (checkedExams.length === 0) { alert("Vui lòng chọn ít nhất 1 đề thi cho ca này!"); return; }

  if (!code) code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const btnAddCohort = document.getElementById("btn-add-cohort");
  if(btnAddCohort) {
    btnAddCohort.disabled = true;
    btnAddCohort.textContent = "Đang lưu...";
  }
  
  try {
    if (editingCohortId) {
      const { error } = await db().from('cohorts').update({
        name: name,
        code: code,
        start_time: startTime,
        end_time: endTime,
        allowed_exams: checkedExams,
        mode: mode
      }).eq('id', editingCohortId);
      if (error) throw error;
      alert("✅ Đã cập nhật ca thi thành công!");
    } else {
      const { error } = await db().from('cohorts').insert([{
        name: name,
        code: code,
        start_time: startTime,
        end_time: endTime,
        allowed_exams: checkedExams,
        mode: mode,
        status: "active",
        created_at: Date.now()
      }]);
      if (error) throw error;
      alert(`✅ Tạo ca thi thành công!\nMã truy cập cho học viên là: ${code}`);
    }
    
    cancelEditCohort();
    loadCohorts(); 
  } catch (error) {
    console.error("Lỗi khi lưu ca thi:", error);
    alert("❌ Đã có lỗi xảy ra: " + (error.message || ''));
  } finally {
    if(btnAddCohort) {
      btnAddCohort.disabled = false;
      btnAddCohort.textContent = editingCohortId ? "💾 Cập nhật Ca thi" : "✅ Tạo Ca thi";
    }
  }
}

export async function changeCohortCode(id, oldCode) {
  const newCode = prompt(`Nhập mã truy cập mới (Mã hiện tại: ${oldCode}):`, oldCode);
  if (newCode && newCode.trim() !== oldCode) {
    try {
      const { error } = await db().from('cohorts').update({ code: newCode.trim().toUpperCase() }).eq('id', id);
      if (error) throw error;
      loadCohorts();
      alert("Đã đổi mã bảo mật thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi đổi mã!");
    }
  }
}

export async function toggleCohort(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "closed" : "active";
  const { error } = await db().from('cohorts').update({ status: newStatus }).eq('id', id);
  if(error) console.error("Lỗi toggleCohort:", error);
  loadCohorts();
}

export async function deleteCohort(id) {
  if (confirm("Xóa ca thi này? Điểm của học viên đã thi sẽ KHÔNG bị mất.")) {
    const { error } = await db().from('cohorts').delete().eq('id', id);
    if(error) console.error("Lỗi deleteCohort:", error);
    loadCohorts();
  }
}

if (typeof window !== 'undefined') {
  window.populateCohortExams = populateCohortExams;
  window.editCohort = editCohort;
  window.cancelEditCohort = cancelEditCohort;
  window.addCohort = addCohort;
  window.changeCohortCode = changeCohortCode;
  window.toggleCohort = toggleCohort;
  window.deleteCohort = deleteCohort;
  window.loadCohorts = loadCohorts;
}
