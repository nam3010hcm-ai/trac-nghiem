/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN GIẢNG VIÊN / NGƯỜI DẠY (teachers-mgr.js)
 * EduCore LMS Teachers Management Subsystem
 * =========================================================================
 */

import { $, esc, isRootUser, ROOT_ADMIN_EMAIL, state } from './common.js';

export const DEFAULT_TEACHERS = [
  {
    id: 'T001',
    email: 'nam3010hcm@gmail.com',
    teacher_name: 'Thầy Nam (Root Admin)',
    name: 'Thầy Nam (Root Admin)',
    department: 'Ban Giám Hiệu & Quản Trị LMS',
    role: 'admin',
    is_active: true
  },
  {
    id: 'T002',
    email: 'chen.lms@k7.edu.vn',
    teacher_name: 'Dr. Chen',
    name: 'Dr. Chen',
    department: 'Khoa Ngoại Ngữ',
    role: 'teacher',
    is_active: true
  },
  {
    id: 'T004',
    email: 'alice@example.com',
    teacher_name: 'Alice',
    name: 'Alice',
    department: 'Khoa Ngoại Ngữ',
    role: 'teacher',
    is_active: true
  },
  {
    id: 'T005',
    email: 'nam84hcm@gmail.com',
    teacher_name: 'Lê Văn Nam',
    name: 'Lê Văn Nam',
    department: 'Khoa Tin Học',
    role: 'teacher',
    is_active: true
  }
];

export let teachersList = [];

let editingTeacherId = null;

function saveTeachersToLocal() {
  try {
    localStorage.setItem('educore_teachers_cache', JSON.stringify(teachersList));
  } catch(e){}
}

function loadTeachersFromLocal() {
  try {
    const saved = localStorage.getItem('educore_teachers_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e){}
  return DEFAULT_TEACHERS;
}

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
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('teachers').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        teachersList = data.map(t => ({
          ...t,
          id: t.id || 'T001',
          name: t.teacher_name || t.name || t.full_name || t.email,
          teacher_name: t.teacher_name || t.name || t.full_name || t.email,
          email: t.email || '',
          department: t.department || 'Bộ Môn Chung',
          is_active: t.is_active !== false
        }));

        // Đảm bảo Root Admin luôn có trong danh sách
        const rootExists = teachersList.some(t => (t.email || '').toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase());
        if (!rootExists) {
          teachersList.unshift(DEFAULT_TEACHERS[0]);
        }

        saveTeachersToLocal();
        renderTeachersList();
        return teachersList;
      }
      if (error) {
        console.warn("[Teachers] Lỗi select từ bảng teachers trên Supabase:", error);
      }
    }
  } catch (err) {
    console.warn("[Teachers] Exception khi loadTeachers:", err);
  }

  // Fallback cache / demo teachers
  teachersList = loadTeachersFromLocal();
  renderTeachersList();
  return teachersList;
}

// 2. RENDER BẢNG GIẢNG VIÊN
export function renderTeachersList() {
  const container = document.getElementById('teachers-table-body');
  const countEl = document.getElementById('teacher-count-badge');
  const searchInput = document.getElementById('flt-teacher-search');
  const addBtn = document.getElementById('btn-open-add-teacher');

  if (addBtn) {
    addBtn.style.display = 'inline-flex';
  }

  if (countEl) countEl.textContent = (teachersList || []).length;
  if (!container) return;

  const q = (searchInput?.value || '').trim().toLowerCase();

  let filtered = (teachersList || []).filter(t => {
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
    const questionsCount = (state?.questions || []).filter(q => (q.created_by || q.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const examsCount = (state?.exams || []).filter(e => (e.created_by || e.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const unitsCount = (state?.units || []).filter(u => (u.created_by || u.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;

    const loginTime = t.last_login_at ? new Date(t.last_login_at).toLocaleString('vi-VN') : 'Chưa có nhật ký';
    const logoutTime = t.last_logout_at ? new Date(t.last_logout_at).toLocaleString('vi-VN') : 'Đang online / Chưa xuất';

    const actionButtonsHtml = `
      <button class="action-btn-sm" onclick="window.openTeacherModal('${esc(t.id)}')">✏️ Sửa</button>
      <button class="action-btn-sm" style="color:${isActive ? '#d97706' : '#16a34a'}" onclick="window.toggleTeacherStatus('${esc(t.id)}')">
        ${isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
      </button>
      ${!isRoot ? `<button class="action-btn-sm" style="color:#ef4444" onclick="window.deleteTeacher('${esc(t.id)}')">🗑️ Xóa</button>` : ''}
    `;

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
  editingTeacherId = id;
  const modal = document.getElementById('modal-teacher');
  const title = document.getElementById('modal-teacher-title');

  if (!modal) return;

  if (id) {
    const t = (teachersList || []).find(item => item.id === id);
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
      const client = window.supabaseClient;
      if (client) {
        const { error } = await client.from('teachers').update(updatePayload).eq('id', editingTeacherId);
        if (error) {
          console.warn("Cập nhật Supabase teachers error:", error);
        }
      }
    } catch(e) {
      console.warn("Lỗi sync Supabase:", e);
    }

    const t = (teachersList || []).find(item => item.id === editingTeacherId);
    if (t) {
      t.teacher_name = name;
      t.name = name;
      t.department = dept || 'Khoa Ngoại Ngữ';
      if (password) {
        t.password = password;
      }
    }
    saveTeachersToLocal();
    alert("✅ Đã cập nhật thông tin Giảng viên thành công!");
  } else {
    const exists = (teachersList || []).some(t => (t.email || '').toLowerCase() === email.toLowerCase());
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
      is_active: true
    };

    try {
      const client = window.supabaseClient;
      if (client) {
        const { data, error } = await client.from('teachers').insert([newTeacher]).select();
        if (error) {
          console.warn("Lỗi insert Supabase teachers:", error);
        }
      }
    } catch(e) {
      console.warn("Lỗi sync Supabase:", e);
    }

    newTeacher.name = name;
    teachersList.unshift(newTeacher);
    saveTeachersToLocal();
    alert("✅ Đã thêm tài khoản Giảng viên mới thành công!");
  }

  closeTeacherModal();
  renderTeachersList();
}

// 5. MỞ / KHÓA TÀI KHOẢN GIẢNG VIÊN TRÊN SUPABASE
export async function toggleTeacherStatus(id) {
  const t = (teachersList || []).find(item => item.id === id);
  if (!t) return;
  const nextStatus = !(t.is_active !== false);

  try {
    const client = window.supabaseClient;
    if (client) {
      const { error } = await client.from('teachers').update({ is_active: nextStatus }).eq('id', id);
      if (error) {
        console.warn("Lỗi toggle status trên Supabase:", error);
      }
    }
    t.is_active = nextStatus;
    saveTeachersToLocal();
    alert(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản giảng viên ${t.teacher_name || t.name || t.email}!`);
    renderTeachersList();
  } catch (e) {
    console.error("Lỗi toggle status:", e);
    t.is_active = nextStatus;
    saveTeachersToLocal();
    renderTeachersList();
  }
}

// 6. XÓA GIẢNG VIÊN TRÊN SUPABASE
export async function deleteTeacher(id) {
  const t = (teachersList || []).find(item => item.id === id);
  if (!t) return;
  const teacherDisplayName = t.teacher_name || t.name || t.email;
  if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản giảng viên "${teacherDisplayName}" không?`)) return;

  try {
    const client = window.supabaseClient;
    if (client) {
      const { error } = await client.from('teachers').delete().eq('id', id);
      if (error) {
        console.warn("Lỗi xóa trên Supabase:", error);
      }
    }
    teachersList = teachersList.filter(item => item.id !== id);
    saveTeachersToLocal();
    alert("✅ Đã xóa tài khoản giảng viên thành công!");
    renderTeachersList();
  } catch (e) {
    console.error("Lỗi xóa giảng viên:", e);
    teachersList = teachersList.filter(item => item.id !== id);
    saveTeachersToLocal();
    renderTeachersList();
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
