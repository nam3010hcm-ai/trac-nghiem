/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN GIẢNG VIÊN / NGƯỜI DẠY (teachers-mgr.js)
 * EduCore LMS Teachers Management Subsystem
 * =========================================================================
 */

import { $, esc, isRootUser, ROOT_ADMIN_EMAIL, state } from './common.js';

const db = () => window.supabaseClient;

export let teachersList = [];

let editingTeacherId = null;

function generateNextTeacherId() {
  const nums = (teachersList || [])
    .map(t => parseInt(String(t.id || '').replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return 'T' + String(max + 1).padStart(3, '0');
}

// 1. NẠP DANH SÁCH GIẢNG VIÊN TỪ SUPABASE
export async function loadTeachers() {
  try {
    if (!db()) return;
    let { data, error } = await db().from('teachers').select('*').order('created_at', { ascending: false });
    if (error) {
      // Fallback query if created_at column doesn't exist or order fails
      const res = await db().from('teachers').select('*');
      data = res.data;
      error = res.error;
    }
    if (error) {
      console.warn("Lỗi truy vấn bảng teachers trên Supabase:", error);
    } else if (data) {
      teachersList = data.map(t => ({
        ...t,
        name: t.teacher_name || t.name || t.full_name || t.email
      }));
      renderTeachersList();
    }
  } catch (err) {
    console.warn("Lỗi khi loadTeachers từ Supabase:", err);
  }
}

// 2. RENDER BẢNG GIẢNG VIÊN
export function renderTeachersList() {
  const container = document.getElementById('teachers-table-body');
  const countEl = document.getElementById('teacher-count-badge');
  const searchInput = document.getElementById('flt-teacher-search');
  const addBtn = document.getElementById('btn-open-add-teacher');

  const currentUserIsRoot = isRootUser(state?.currentUserEmail);
  if (addBtn) {
    addBtn.style.display = currentUserIsRoot ? 'inline-flex' : 'none';
  }

  if (countEl) countEl.textContent = teachersList.length;
  if (!container) return;

  const q = (searchInput?.value || '').trim().toLowerCase();

  let filtered = teachersList.filter(t => {
    const tName = (t.teacher_name || t.name || t.full_name || '').toLowerCase();
    const tEmail = (t.email || '').toLowerCase();
    const tDept = (t.department || '').toLowerCase();
    const tId = (t.id || '').toLowerCase();
    return !q || tId.includes(q) || tName.includes(q) || tEmail.includes(q) || tDept.includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:32px;color:#94a3b8;">
          Không tìm thấy tài khoản Giảng viên / Người dạy nào khớp với từ khóa.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isActive = t.is_active !== false;
    const isRoot = isRootUser(t.email);
    const teacherName = t.teacher_name || t.name || t.full_name || t.email;

    // Tính toán tài nguyên do giảng viên này tạo ra
    const questionsCount = (window.state?.questions || []).filter(q => (q.created_by || q.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const examsCount = (window.state?.exams || []).filter(e => (e.created_by || e.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const unitsCount = (window.state?.units || []).filter(u => (u.created_by || u.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;

    const loginTime = t.last_login_at ? new Date(t.last_login_at).toLocaleString('vi-VN') : 'Chưa có nhật ký';
    const logoutTime = t.last_logout_at ? new Date(t.last_logout_at).toLocaleString('vi-VN') : 'Đang online / Chưa xuất';

    let actionButtonsHtml = '';
    if (currentUserIsRoot) {
      actionButtonsHtml = `
        <button class="action-btn-sm" onclick="window.openTeacherModal('${esc(t.id)}')">✏️ Sửa</button>
        <button class="action-btn-sm" style="color:${isActive ? '#d97706' : '#16a34a'}" onclick="window.toggleTeacherStatus('${esc(t.id)}')">
          ${isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
        </button>
        ${!isRoot ? `<button class="action-btn-sm" style="color:#ef4444" onclick="window.deleteTeacher('${esc(t.id)}')">🗑️ Xóa</button>` : ''}
      `;
    } else {
      actionButtonsHtml = `
        <span style="font-size:12px;color:#94a3b8;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0" title="Chỉ Root Admin mới có quyền sửa/xóa/thêm giảng viên">🔒 Chỉ xem</span>
      `;
    }

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:${isRoot ? '#fef3c7' : '#e0f2fe'};color:${isRoot ? '#92400e' : '#0284c7'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">
              ${isRoot ? '👑' : '👨‍🏫'}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${esc(teacherName)}</div>
              <div style="font-size:11.5px;color:#64748b;">Mã GV: ${esc(t.id || 'GV')}</div>
            </div>
          </div>
        </td>
        <td><b>${esc(t.email)}</b></td>
        <td><span class="cat-badge" style="background:#f1f5f9;color:#334155;">${esc(t.department || 'Bộ Môn Chung')}</span></td>
        <td>
          <div style="font-size:11.5px;color:#334155;">
            <div><b>📚 ${questionsCount}</b> Câu hỏi</div>
            <div><b>📝 ${examsCount}</b> Đề thi</div>
            <div><b>📖 ${unitsCount}</b> Unit bài học</div>
          </div>
        </td>
        <td>
          <div style="font-size:11px;color:#475569;line-height:1.4;">
            <div>🟢 In: <b>${loginTime}</b></div>
            <div>🔴 Out: <b>${logoutTime}</b></div>
          </div>
        </td>
        <td>
          <span class="status-badge ${isActive ? 'status-active' : 'status-pending'}">
            ${isActive ? '● Hoạt động' : '🔒 Đã khóa'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. MỞ MODAL THÊM / SỬA GIẢNG VIÊN
export function openTeacherModal(id = null) {
  if (!isRootUser(state?.currentUserEmail)) {
    alert("🔒 Quyền hạn bị từ chối: Chỉ tài khoản Root Admin mới có quyền thêm mới hoặc chỉnh sửa giảng viên!");
    return;
  }

  editingTeacherId = id;
  const modal = document.getElementById('modal-teacher');
  const title = document.getElementById('modal-teacher-title');

  if (!modal) return;

  if (id) {
    const t = teachersList.find(item => item.id === id);
    if (!t) return;
    if (title) title.textContent = '✏️ Cập Nhật Tài Khoản Giảng Viên';
    if ($('t-mod-email')) { $('t-mod-email').value = t.email || ''; $('t-mod-email').disabled = true; }
    if ($('t-mod-name')) $('t-mod-name').value = t.teacher_name || t.name || t.full_name || '';
    if ($('t-mod-dept')) $('t-mod-dept').value = t.department || '';
    if ($('t-mod-pass')) $('t-mod-pass').value = '';
  } else {
    if (title) title.textContent = '➕ Thêm Tài Khoản Giảng Viên Mới';
    if ($('t-mod-email')) { $('t-mod-email').value = ''; $('t-mod-email').disabled = false; }
    if ($('t-mod-name')) $('t-mod-name').value = '';
    if ($('t-mod-dept')) $('t-mod-dept').value = '';
    if ($('t-mod-pass')) $('t-mod-pass').value = '';
  }

  modal.style.display = 'flex';
}

export function closeTeacherModal() {
  const modal = document.getElementById('modal-teacher');
  if (modal) modal.style.display = 'none';
  editingTeacherId = null;
}

// 4. LƯU TÀI KHOẢN GIẢNG VIÊN LÊN SUPABASE
export async function saveTeacher() {
  if (!isRootUser(state?.currentUserEmail)) {
    alert("🔒 Quyền hạn bị từ chối: Chỉ tài khoản Root Admin mới có quyền lưu hoặc thêm mới giảng viên!");
    return;
  }

  const email = ($('t-mod-email')?.value || '').trim().toLowerCase();
  const name = ($('t-mod-name')?.value || '').trim();
  const dept = ($('t-mod-dept')?.value || '').trim();
  const password = ($('t-mod-pass')?.value || '').trim();

  if (!email || !name) {
    alert("❌ Vui lòng nhập đầy đủ Email và Họ tên giảng viên!");
    return;
  }

  if (!editingTeacherId && !password) {
    alert("❌ Vui lòng nhập mật khẩu cho tài khoản giảng viên mới!");
    return;
  }

  if (editingTeacherId) {
    const updatePayload = {
      teacher_name: name,
      department: dept || 'Khoa Ngoại Ngữ'
    };

    if (password) {
      updatePayload.password = password;
    }

    try {
      if (db()) {
        const { error } = await db().from('teachers').update(updatePayload).eq('id', editingTeacherId);
        if (error) {
          console.error("Lỗi cập nhật giảng viên Supabase:", error);
          alert("❌ Lỗi cập nhật lên Supabase: " + (error.message || ''));
          return;
        }
      }
    } catch(e) {
      console.error("Lỗi sync Supabase:", e);
      alert("❌ Lỗi kết nối Supabase: " + e.message);
      return;
    }

    const t = teachersList.find(item => item.id === editingTeacherId);
    if (t) {
      t.teacher_name = name;
      t.name = name;
      t.department = dept || 'Khoa Ngoại Ngữ';
      if (password) {
        t.password = password;
      }
    }
    alert("✅ Đã cập nhật thông tin Giảng viên thành công!");
  } else {
    const exists = teachersList.some(t => (t.email || '').toLowerCase() === email.toLowerCase());
    if (exists) {
      alert("❌ Email giảng viên này đã tồn tại trên hệ thống!");
      return;
    }

    const newId = generateNextTeacherId();
    const newTeacher = {
      id: newId,
      email: email,
      teacher_name: name,
      department: dept || 'Khoa Ngoại Ngữ',
      password: password,
      role: isRootUser(email) ? 'admin' : 'teacher',
      is_active: true,
      created_at: new Date().toISOString()
    };

    try {
      if (db()) {
        const { data, error } = await db().from('teachers').insert([newTeacher]).select();
        if (error) {
          console.error("Lỗi thêm giảng viên vào Supabase:", error);
          alert("❌ Lỗi lưu giảng viên vào Supabase: " + (error.message || ''));
          return;
        }
        if (data && data.length > 0) {
          newTeacher.created_at = data[0].created_at || newTeacher.created_at;
        }
      }
    } catch(e) {
      console.error("Lỗi sync Supabase:", e);
      alert("❌ Lỗi kết nối Supabase: " + e.message);
      return;
    }

    newTeacher.name = name;
    teachersList.unshift(newTeacher);
    alert("✅ Đã thêm tài khoản Giảng viên mới vào Supabase thành công!");
  }

  closeTeacherModal();
  renderTeachersList();
}

// 5. MỞ / KHÓA TÀI KHOẢN GIẢNG VIÊN TRÊN SUPABASE
export async function toggleTeacherStatus(id) {
  if (!isRootUser(state?.currentUserEmail)) {
    alert("🔒 Quyền hạn bị từ chối: Chỉ tài khoản Root Admin mới có quyền khóa hoặc mở khóa tài khoản giảng viên!");
    return;
  }

  const t = teachersList.find(item => item.id === id);
  if (!t) return;
  const nextStatus = !(t.is_active !== false);

  try {
    if (db()) {
      const { error } = await db().from('teachers').update({ is_active: nextStatus }).eq('id', id);
      if (error) {
        alert("❌ Lỗi cập nhật trạng thái trên Supabase: " + error.message);
        return;
      }
    }
    t.is_active = nextStatus;
    alert(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản giảng viên ${t.teacher_name || t.name || t.email}!`);
    renderTeachersList();
  } catch (e) {
    console.error("Lỗi toggle status:", e);
    alert("❌ Lỗi: " + e.message);
  }
}

// 6. XÓA GIẢNG VIÊN TRÊN SUPABASE
export async function deleteTeacher(id) {
  if (!isRootUser(state?.currentUserEmail)) {
    alert("🔒 Quyền hạn bị từ chối: Chỉ tài khoản Root Admin mới có quyền xóa tài khoản giảng viên!");
    return;
  }

  const t = teachersList.find(item => item.id === id);
  if (!t) return;
  const teacherDisplayName = t.teacher_name || t.name || t.email;
  if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản giảng viên "${teacherDisplayName}" không?`)) return;

  try {
    if (db()) {
      const { error } = await db().from('teachers').delete().eq('id', id);
      if (error) {
        alert("❌ Lỗi xóa giảng viên trên Supabase: " + error.message);
        return;
      }
    }
    teachersList = teachersList.filter(item => item.id !== id);
    alert("✅ Đã xóa tài khoản giảng viên khỏi Supabase thành công!");
    renderTeachersList();
  } catch (e) {
    console.error("Lỗi xóa giảng viên:", e);
    alert("❌ Lỗi: " + e.message);
  }
}

// Gán lên window object
window.loadTeachers = loadTeachers;
window.renderTeachersList = renderTeachersList;
window.openTeacherModal = openTeacherModal;
window.closeTeacherModal = closeTeacherModal;
window.saveTeacher = saveTeacher;
window.toggleTeacherStatus = toggleTeacherStatus;
window.deleteTeacher = deleteTeacher;


