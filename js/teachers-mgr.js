/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN GIẢNG VIÊN / NGƯỜI DẠY (teachers-mgr.js)
 * EduCore LMS Teachers Management Subsystem
 * =========================================================================
 */

import { $, esc, isRootUser, ROOT_ADMIN_EMAIL, state, getAuthorDisplayName, logTeacherActivity } from './common.js';
import { createEphemeralAuthUser } from './supabase.js';

export const DEFAULT_TEACHERS = [
  {
    id: 'T001',
    email: 'nam3010hcm@gmail.com',
    teacher_name: 'Thầy Nam (Root Admin)',
    name: 'Thầy Nam (Root Admin)',
    department: 'Quản Trị Hệ Thống',
    role: 'admin',
    is_active: true,
    password: '123',
    teacher_code: 'T001'
  },
  {
    id: 'KT01',
    email: 'khaothi@k7.edu.vn',
    teacher_name: 'Thầy Hoàng (Cán Bộ Khảo Thí)',
    name: 'Thầy Hoàng (Cán Bộ Khảo Thí)',
    department: 'Ban Khảo Thí & ĐBCL',
    role: 'examination_officer',
    is_active: true,
    password: '123',
    teacher_code: 'KT01'
  },
  {
    id: 'QL01',
    email: 'quanlyhocvien@k7.edu.vn',
    teacher_name: 'Cô Mai (Quản Lý Học Viên)',
    name: 'Cô Mai (Quản Lý Học Viên)',
    department: 'Phòng Công Tác Học Sinh & Đào Tạo',
    role: 'student_manager',
    is_active: true,
    password: '123',
    teacher_code: 'QL01'
  },
  {
    id: 'T002',
    email: 'chen.lms@k7.edu.vn',
    teacher_name: 'Dr. Chen',
    name: 'Dr. Chen',
    department: 'Khoa Ngoại Ngữ',
    role: 'teacher',
    is_active: true,
    password: '123',
    teacher_code: 'T002'
  },
  {
    id: 'T004',
    email: 'alice@example.com',
    teacher_name: 'Alice',
    name: 'Alice',
    department: 'Khoa Testing',
    role: 'teacher',
    is_active: true,
    password: '123',
    teacher_code: 'T004'
  },
  {
    id: 'T005',
    email: 'nam84hcm@gmail.com',
    teacher_name: 'Lê Văn Nam',
    name: 'Lê Văn Nam',
    department: 'Khoa Khoa học cơ bản/ Ngoại ngữ',
    role: 'teacher',
    is_active: true,
    password: '123',
    teacher_code: 'T005'
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
  // 1. Render tức thì từ bộ nhớ đệm / danh sách mặc định để không bị kẹt giao diện
  if (!teachersList || teachersList.length === 0) {
    teachersList = loadTeachersFromLocal();
    if (!teachersList || teachersList.length === 0) {
      teachersList = [...DEFAULT_TEACHERS];
    }
  }
  renderTeachersList();

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
          password: t.password || '123',
          department: t.department || 'Bộ Môn Chung',
          is_active: t.is_active !== false,
          role: t.role || 'teacher'
        }));

        // Đảm bảo Root Admin luôn có trong danh sách
        const rootExists = teachersList.some(t => (t.email || '').toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase());
        if (!rootExists) {
          teachersList.unshift(DEFAULT_TEACHERS[0]);
        }

        saveTeachersToLocal();
        renderTeachersList();
        return teachersList;
      } else if (!error && Array.isArray(data) && data.length === 0) {
        teachersList = [...DEFAULT_TEACHERS];
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

  if (!teachersList || teachersList.length === 0) {
    teachersList = loadTeachersFromLocal();
    if (!teachersList || teachersList.length === 0) {
      teachersList = [...DEFAULT_TEACHERS];
    }
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

    let roleBadgeHtml = `<span style="background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">👨‍🏫 Giảng viên</span>`;
    let avatarIcon = '👨‍🏫';
    let avatarBg = '#e0f2fe';
    let avatarColor = '#0284c7';

    if (isRoot) {
      roleBadgeHtml = `<span style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">👑 Root Admin</span>`;
      avatarIcon = '👑';
      avatarBg = '#fef3c7';
      avatarColor = '#92400e';
    } else if (t.role === 'examination_officer') {
      roleBadgeHtml = `<span style="background:#e0e7ff;color:#4338ca;border:1px solid #c7d2fe;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">⚖️ Cán bộ Khảo thí</span>`;
      avatarIcon = '⚖️';
      avatarBg = '#e0e7ff';
      avatarColor = '#4338ca';
    } else if (t.role === 'student_manager') {
      roleBadgeHtml = `<span style="background:#d1fae5;color:#047857;border:1px solid #a7f3d0;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">👥 Quản lý Học viên</span>`;
      avatarIcon = '👥';
      avatarBg = '#d1fae5';
      avatarColor = '#047857';
    }

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
            <div style="width:36px;height:36px;border-radius:10px;background:${avatarBg};color:${avatarColor};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;">
              ${avatarIcon}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${esc(teacherName)}</span>
                ${roleBadgeHtml}
              </div>
              <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Mã: <b>${esc(t.id || 'GV')}</b></div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:700;color:#0f172a">${esc(t.email)}</div>
          <div style="margin-top:4px;">
            <span style="font-family:monospace;background:#f8fafc;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;font-size:11.5px;color:#2563eb">
              🔑 ${esc(t.password || '••••••')}
            </span>
          </div>
        </td>
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

// 3. MỞ MODAL THÊM / SỬA GIẢNG VIÊN & CÁN BỘ
export function openTeacherModal(id = null) {
  editingTeacherId = id;
  const modal = document.getElementById('modal-teacher');
  const title = document.getElementById('modal-teacher-title');

  if (!modal) return;

  if (id) {
    const t = (teachersList || []).find(item => item.id === id);
    if (!t) return;
    const isRoot = isRootUser(t.email);
    if (title) title.textContent = '✏️ Cập Nhật Tài Khoản Cán Bộ / Giảng Viên';
    if ($('t-mod-email')) { $('t-mod-email').value = t.email || ''; $('t-mod-email').disabled = true; }
    if ($('t-mod-name')) $('t-mod-name').value = t.teacher_name || t.name || t.full_name || '';
    if ($('t-mod-dept')) $('t-mod-dept').value = t.department || '';
    if ($('t-mod-pass')) $('t-mod-pass').value = t.password || '';
    if ($('t-mod-role')) {
      $('t-mod-role').value = t.role || 'teacher';
      $('t-mod-role').disabled = isRoot;
    }
  } else {
    if (title) title.textContent = '➕ Thêm Tài Khoản Cán Bộ / Giảng Viên Mới';
    if ($('t-mod-email')) { $('t-mod-email').value = ''; $('t-mod-email').disabled = false; }
    if ($('t-mod-name')) $('t-mod-name').value = '';
    if ($('t-mod-dept')) $('t-mod-dept').value = '';
    if ($('t-mod-pass')) $('t-mod-pass').value = '123456';
    if ($('t-mod-role')) {
      $('t-mod-role').value = 'teacher';
      $('t-mod-role').disabled = false;
    }
  }

  modal.style.display = 'flex';
}

export function closeTeacherModal() {
  const modal = document.getElementById('modal-teacher');
  if (modal) modal.style.display = 'none';
  editingTeacherId = null;
}

// 4. LƯU TÀI KHOẢN GIẢNG VIÊN / CÁN BỘ LÊN SUPABASE
export async function saveTeacher() {
  const email = ($('t-mod-email')?.value || '').trim().toLowerCase();
  const name = ($('t-mod-name')?.value || '').trim();
  const dept = ($('t-mod-dept')?.value || '').trim();
  const password = ($('t-mod-pass')?.value || '').trim();
  let role = $('t-mod-role')?.value || 'teacher';

  if (!email || !name) {
    alert("❌ Vui lòng nhập đầy đủ Email và Họ tên!");
    return;
  }

  if (!editingTeacherId && !password) {
    alert("❌ Vui lòng nhập mật khẩu cho tài khoản mới!");
    return;
  }

  if (isRootUser(email)) {
    role = 'admin';
  }

  const client = window.supabaseClient;

  if (editingTeacherId) {
    const updatePayload = {
      teacher_name: name,
      department: dept || 'Khoa Ngoại Ngữ',
      role: role
    };

    if (password) {
      updatePayload.password = password;
    }

    try {
      if (client) {
        const { error } = await client.from('teachers').update(updatePayload).eq('id', editingTeacherId);
        if (error) {
          console.error("Cập nhật Supabase teachers error:", error);
          alert("⚠️ Lỗi CSDL Supabase: " + (error.message || JSON.stringify(error)));
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
      t.role = role;
      if (password) {
        t.password = password;
      }
    }
    await logTeacherActivity('Cập nhật', 'Giảng viên / Cán bộ', `${name} (${editingTeacherId})`, editingTeacherId, `Bộ môn: ${dept || 'Khoa Ngoại Ngữ'}, Vai trò: ${role}`);
    saveTeachersToLocal();
    closeTeacherModal();
    renderTeachersList();
    alert("✅ Đã cập nhật thông tin tài khoản thành công!");
  } else {
    const exists = (teachersList || []).some(t => (t.email || '').toLowerCase() === email.toLowerCase());
    if (exists) {
      alert("❌ Email này đã tồn tại trên hệ thống!");
      return;
    }

    const newId = generateNextTeacherId();
    let authUserId = null;

    // 1. Tạo tài khoản Supabase Auth độc lập (KHÔNG làm thay đổi phiên làm việc của Root Admin hiện tại)
    if (password) {
      try {
        const { data: authData, error: authError } = await createEphemeralAuthUser(email, password, {
          teacher_name: name,
          name: name,
          role: role
        });
        if (!authError && authData?.user?.id) {
          authUserId = authData.user.id;
        } else if (authError) {
          console.warn("[Teachers] Ephemeral SignUp info:", authError.message || authError);
        }
      } catch (authErr) {
        console.warn("[Teachers] Ephemeral SignUp exception:", authErr);
      }
    }

    // 2. Chèn vào bảng teachers với đầy đủ mật khẩu và role
    const dbPayload = {
      id: newId,
      email: email,
      teacher_name: name,
      department: dept || (role === 'examination_officer' ? 'Ban Khảo Thí & ĐBCL' : (role === 'student_manager' ? 'Phòng Công Tác Học Sinh' : 'Khoa Ngoại Ngữ')),
      password: password,
      role: role,
      is_active: true,
      teacher_code: newId
    };

    if (authUserId) {
      dbPayload.user_id = authUserId;
    }

    try {
      if (client) {
        const { data, error } = await client.from('teachers').insert([dbPayload]).select();
        if (error) {
          console.error("Lỗi insert Supabase teachers:", error);
          alert("⚠️ Lỗi lưu CSDL Supabase: " + (error.message || JSON.stringify(error)));
        } else {
          console.log("✅ Đã lưu thành công cán bộ/giảng viên vào Supabase:", data);
        }
      }
    } catch(e) {
      console.warn("Lỗi sync Supabase:", e);
    }

    const localItem = {
      ...dbPayload,
      name: name
    };
    teachersList.unshift(localItem);
    await logTeacherActivity('Tạo mới', 'Giảng viên / Cán bộ', `${name} (${newId})`, newId, `Bộ môn: ${dbPayload.department}, Vai trò: ${role}, Email: ${email}`);
    saveTeachersToLocal();
    closeTeacherModal();
    renderTeachersList();
    alert("✅ Đã thêm tài khoản mới thành công!");
  }
}
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
    await logTeacherActivity(nextStatus ? 'Mở khóa tài khoản' : 'Khóa tài khoản', 'Giảng viên', `${t.teacher_name || t.name || t.email} (${id})`, id, '');
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
    await logTeacherActivity('Xóa tài khoản', 'Giảng viên', `${teacherDisplayName} (${id})`, id, '');
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
if (typeof window !== 'undefined') {
  window.loadTeachers = loadTeachers;
  window.renderTeachersList = renderTeachersList;
  window.openTeacherModal = openTeacherModal;
  window.closeTeacherModal = closeTeacherModal;
  window.saveTeacher = saveTeacher;
  window.toggleTeacherStatus = toggleTeacherStatus;
  window.deleteTeacher = deleteTeacher;
}

