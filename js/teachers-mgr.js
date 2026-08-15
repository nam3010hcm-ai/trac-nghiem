/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN GIẢNG VIÊN / NGƯỜI DẠY (teachers-mgr.js)
 * K7 EduHub LMS Teachers Management Subsystem
 * =========================================================================
 */

import { $, esc, isRootUser } from './common.js';

const db = () => window.supabaseClient;

export let teachersList = [
  { id: 'T001', name: 'Dr. Chen', email: 'chen.lms@k7.edu.vn', department: 'Khoa Ngoại Ngữ', role: 'Giảng viên', is_active: true, created_at: '2026-01-15' },
  { id: 'T002', name: 'Dr. Ramirez', email: 'ramirez.ai@k7.edu.vn', department: 'Trí Tuệ Nhân Tạo', role: 'Giảng viên', is_active: true, created_at: '2026-02-01' },
  { id: 'T003', name: 'Mr. Davis', email: 'davis.web@k7.edu.vn', department: 'Lập Trình Web', role: 'Giảng viên', is_active: true, created_at: '2026-02-10' },
  { id: 'T004', name: 'Thầy Nam (Root Admin)', email: 'nam3010hcm@gmail.com', department: 'Quản Trị Hệ Thống', role: 'Root Admin', is_active: true, created_at: '2026-01-01' }
];

let editingTeacherId = null;

// 1. NẠP DANH SÁCH GIẢNG VIÊN
export async function loadTeachers() {
  try {
    if (!db()) return;
    const { data, error } = await db().from('teachers').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      teachersList = data;
    }
  } catch (err) {
    console.warn("Dùng danh sách giảng viên mặc định:", err);
  }
}

// 2. RENDER BẢNG GIẢNG VIÊN
export function renderTeachersList() {
  const container = document.getElementById('teachers-table-body');
  const countEl = document.getElementById('teacher-count-badge');
  const searchInput = document.getElementById('flt-teacher-search');

  if (countEl) countEl.textContent = teachersList.length;
  if (!container) return;

  const q = (searchInput?.value || '').trim().toLowerCase();

  let filtered = teachersList.filter(t => {
    return !q || (t.id || '').toLowerCase().includes(q) ||
                 (t.name || '').toLowerCase().includes(q) ||
                 (t.email || '').toLowerCase().includes(q) ||
                 (t.department || '').toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">
          Không tìm thấy tài khoản Giảng viên / Người dạy nào khớp với từ khóa.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isActive = t.is_active !== false;
    const isRoot = isRootUser(t.email);
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:${isRoot ? '#fef3c7' : '#e0f2fe'};color:${isRoot ? '#92400e' : '#0284c7'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">
              ${isRoot ? '👑' : '👨‍🏫'}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${esc(t.name)}</div>
              <div style="font-size:11.5px;color:#64748b;">Mã GV: ${esc(t.id)}</div>
            </div>
          </div>
        </td>
        <td><b>${esc(t.email)}</b></td>
        <td><span class="cat-badge" style="background:#f1f5f9;color:#334155;">${esc(t.department || 'Bộ Môn Chung')}</span></td>
        <td>
          <span class="status-badge ${isRoot ? 'status-active' : 'status-completed'}" style="${isRoot ? 'background:#fef3c7;color:#92400e;' : ''}">
            ${isRoot ? '👑 Root Admin' : '👨‍🏫 Giảng Viên'}
          </span>
        </td>
        <td>
          <span class="status-badge ${isActive ? 'status-active' : 'status-pending'}">
            ${isActive ? '● Hoạt động' : '🔒 Đã khóa'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="action-btn-sm" onclick="window.openTeacherModal('${esc(t.id)}')">✏️ Sửa</button>
            <button class="action-btn-sm" style="color:${isActive ? '#d97706' : '#16a34a'}" onclick="window.toggleTeacherStatus('${esc(t.id)}')">
              ${isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
            </button>
            ${!isRoot ? `<button class="action-btn-sm" style="color:#ef4444" onclick="window.deleteTeacher('${esc(t.id)}')">🗑️ Xóa</button>` : ''}
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
    const t = teachersList.find(item => item.id === id);
    if (!t) return;
    if (title) title.textContent = '✏️ Cập Nhật Tài Khoản Giảng Viên';
    if ($('t-mod-email')) { $('t-mod-email').value = t.email || ''; $('t-mod-email').disabled = true; }
    if ($('t-mod-name')) $('t-mod-name').value = t.name || '';
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

// 4. LƯU TÀI KHOẢN GIẢNG VIÊN
export async function saveTeacher() {
  const email = ($('t-mod-email')?.value || '').trim();
  const name = ($('t-mod-name')?.value || '').trim();
  const dept = ($('t-mod-dept')?.value || '').trim();
  const pass = ($('t-mod-pass')?.value || '').trim();

  if (!email || !name) {
    alert("❌ Vui lòng nhập đầy đủ Email và Họ tên giảng viên!");
    return;
  }

  if (editingTeacherId) {
    const t = teachersList.find(item => item.id === editingTeacherId);
    if (t) {
      t.name = name;
      t.department = dept || 'Khoa Ngoại Ngữ';
    }
    alert("✅ Đã cập nhật thông tin Giảng viên!");
  } else {
    const exists = teachersList.some(t => t.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      alert("❌ Email giảng viên này đã tồn tại trên hệ thống!");
      return;
    }

    const newTeacher = {
      id: 'T' + String(teachersList.length + 1).padStart(3, '0'),
      email,
      name,
      department: dept || 'Khoa Ngoại Ngữ',
      role: 'Giảng viên',
      is_active: true,
      created_at: new Date().toISOString().split('T')[0]
    };

    teachersList.unshift(newTeacher);
    alert("✅ Đã thêm tài khoản Giảng viên mới thành công!");
  }

  closeTeacherModal();
  renderTeachersList();
}

// 5. MỞ / KHÓA TÀI KHOẢN GIẢNG VIÊN
export function toggleTeacherStatus(id) {
  const t = teachersList.find(item => item.id === id);
  if (!t) return;
  t.is_active = !t.is_active;
  alert(`Đã ${t.is_active ? 'mở khóa' : 'khóa'} tài khoản giảng viên ${t.name}!`);
  renderTeachersList();
}

// 6. XÓA GIẢNG VIÊN
export function deleteTeacher(id) {
  const t = teachersList.find(item => item.id === id);
  if (!t) return;
  if (confirm(`Bạn có chắc chắn muốn xóa tài khoản giảng viên "${t.name}" không?`)) {
    teachersList = teachersList.filter(item => item.id !== id);
    alert("Đã xóa tài khoản giảng viên!");
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
