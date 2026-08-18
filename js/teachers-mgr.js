/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN GIẢNG VIÊN / NGƯỜI DẠY (teachers-mgr.js)
 * EduCore LMS Teachers Management Subsystem
 * =========================================================================
 */

import { $, esc, isRootUser, ROOT_ADMIN_EMAIL } from './common.js';
import { updateCurrentUserPassword } from './supabase.js';

const db = () => window.supabaseClient;

export let teachersList = [];

let editingTeacherId = null;

function getTeacherKey(t) {
  return t?.user_id || t?.id || '';
}

function getTeacherCode(t) {
  if (t?.teacher_code) return String(t.teacher_code);
  if (typeof t?.id === 'string' && /^T\d+$/i.test(t.id)) return t.id;
  if (typeof t?.id === 'string' && t.id.trim()) return t.id;
  return 'GV';
}

function generateNextTeacherCode() {
  const nums = (teachersList || [])
    .map(t => {
      const code = getTeacherCode(t);
      const match = String(code).match(/\d+/);
      return match ? Number(match[0]) : 0;
    })
    .filter(n => !Number.isNaN(n));

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return 'T' + String(max + 1).padStart(3, '0');
}

async function insertTeacherProfile(profile) {
  const client = db();
  if (!client) throw new Error('Supabase client chưa được khởi tạo.');

  const payloadCandidates = [
    {
      user_id: profile.user_id,
      teacher_code: profile.teacher_code,
      email: profile.email,
      teacher_name: profile.teacher_name,
      department: profile.department,
      role: profile.role,
      is_active: profile.is_active,
      created_at: profile.created_at
    },
    {
      id: profile.teacher_code,
      user_id: profile.user_id,
      teacher_code: profile.teacher_code,
      email: profile.email,
      teacher_name: profile.teacher_name,
      department: profile.department,
      role: profile.role,
      is_active: profile.is_active,
      created_at: profile.created_at
    },
    {
      user_id: profile.user_id,
      email: profile.email,
      teacher_name: profile.teacher_name,
      department: profile.department,
      role: profile.role,
      is_active: profile.is_active,
      created_at: profile.created_at
    },
    {
      id: profile.teacher_code,
      user_id: profile.user_id,
      email: profile.email,
      teacher_name: profile.teacher_name,
      department: profile.department,
      role: profile.role,
      is_active: profile.is_active,
      created_at: profile.created_at
    }
  ];

  let lastError = null;

  for (const payload of payloadCandidates) {
    try {
      const { data, error } = await client.from('teachers').insert([payload]).select();
      if (!error) {
        return data && data[0] ? data[0] : payload;
      }

      lastError = error;
      const message = String(error?.message || '');
      const isUnknownColumn = /column .* does not exist|does not exist/i.test(message);
      if (!isUnknownColumn) {
        throw error;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể lưu profile giảng viên vào bảng teachers.');
}

// 1. NẠP DANH SÁCH GIẢNG VIÊN TỪ SUPABASE
export async function loadTeachers() {
  try {
    if (!db()) return;
    let { data, error } = await db().from('teachers').select('*').order('created_at', { ascending: false });
    if (error) {
      const res = await db().from('teachers').select('*');
      data = res.data;
      error = res.error;
    }
    if (error) {
      console.warn('Lỗi truy vấn bảng teachers trên Supabase:', error);
    } else if (data) {
      teachersList = data.map(t => ({
        ...t,
        teacher_code: t.teacher_code || getTeacherCode(t),
        name: t.teacher_name || t.name || t.full_name || t.email
      }));
      renderTeachersList();
    }
  } catch (err) {
    console.warn('Lỗi khi loadTeachers từ Supabase:', err);
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
    const tName = (t.teacher_name || t.name || t.full_name || '').toLowerCase();
    const tEmail = (t.email || '').toLowerCase();
    const tDept = (t.department || '').toLowerCase();
    const tCode = String(getTeacherCode(t)).toLowerCase();
    return !q || tCode.includes(q) || tName.includes(q) || tEmail.includes(q) || tDept.includes(q);
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
    const teacherCode = getTeacherCode(t);
    const teacherKey = getTeacherKey(t);

    const questionsCount = (window.state?.questions || []).filter(q => (q.created_by || q.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const examsCount = (window.state?.exams || []).filter(e => (e.created_by || e.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;
    const unitsCount = (window.state?.units || []).filter(u => (u.created_by || u.createdBy || '').toLowerCase() === (t.email || '').toLowerCase()).length;

    const loginTime = t.last_login_at ? new Date(t.last_login_at).toLocaleString('vi-VN') : 'Chưa có nhật ký';
    const logoutTime = t.last_logout_at ? new Date(t.last_logout_at).toLocaleString('vi-VN') : 'Đang online / Chưa xuất';

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:${isRoot ? '#fef3c7' : '#e0f2fe'};color:${isRoot ? '#92400e' : '#0284c7'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">
              ${isRoot ? '👑' : '👨‍🏫'}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${esc(teacherName)}</div>
              <div style="font-size:11.5px;color:#64748b;">Mã GV: ${esc(teacherCode)}</div>
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
            <button class="action-btn-sm" onclick="window.openTeacherModal('${esc(teacherKey)}')">✏️ Sửa</button>
            <button class="action-btn-sm" style="color:${isActive ? '#d97706' : '#16a34a'}" onclick="window.toggleTeacherStatus('${esc(teacherKey)}')">
              ${isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
            </button>
            ${!isRoot ? `<button class="action-btn-sm" style="color:#ef4444" onclick="window.deleteTeacher('${esc(teacherKey)}')">🗑️ Xóa</button>` : ''}
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
    const t = teachersList.find(item => getTeacherKey(item) === id);
    if (!t) return;
    if (title) title.textContent = '✏️ Cập Nhật Tài Khoản Giảng Viên';
    if ($('t-mod-email')) { $('t-mod-email').value = t.email || ''; $('t-mod-email').disabled = true; }
    if ($('t-mod-name')) $('t-mod-name').value = t.teacher_name || t.name || t.full_name || '';
    if ($('t-mod-dept')) $('t-mod-dept').value = t.department || '';
    if ($('t-mod-pass')) {
      $('t-mod-pass').value = '';
      $('t-mod-pass').placeholder = 'Không thay đổi mật khẩu ở đây';
      $('t-mod-pass').disabled = true;
    }
  } else {
    if (title) title.textContent = '➕ Thêm Tài Khoản Giảng Viên Mới';
    if ($('t-mod-email')) { $('t-mod-email').value = ''; $('t-mod-email').disabled = false; }
    if ($('t-mod-name')) $('t-mod-name').value = '';
    if ($('t-mod-dept')) $('t-mod-dept').value = '';
    if ($('t-mod-pass')) {
      $('t-mod-pass').value = '';
      $('t-mod-pass').placeholder = 'Nhập mật khẩu khởi tạo...';
      $('t-mod-pass').disabled = false;
    }
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
    alert('❌ Vui lòng nhập đầy đủ Email và Họ tên giảng viên!');
    return;
  }

  if (editingTeacherId) {
    const updatePayload = {
      teacher_name: name,
      department: dept || 'Khoa Ngoại Ngữ'
    };

    try {
      if (password) {
        const currentUser = db() ? await db().auth.getUser() : null;
        const currentEmail = currentUser?.data?.user?.email || null;
        const targetTeacher = teachersList.find(item => getTeacherKey(item) === editingTeacherId);
        const targetEmail = (targetTeacher?.email || '').toLowerCase();

        if (currentEmail && targetEmail && currentEmail.toLowerCase() === targetEmail) {
          await updateCurrentUserPassword(password);
        } else if (currentEmail && targetEmail && currentEmail.toLowerCase() !== targetEmail) {
          alert('⚠️ Chỉ có thể đổi mật khẩu cho tài khoản đang đăng nhập. Với tài khoản khác, hãy dùng tính năng reset mật khẩu của Supabase Auth.');
        }
      }

      if (db()) {
        const { error } = await db().from('teachers').update(updatePayload).eq('user_id', editingTeacherId);
        if (error) {
          const fallback = await db().from('teachers').update(updatePayload).eq('id', editingTeacherId);
          if (fallback.error) {
            console.error('Lỗi cập nhật giảng viên Supabase:', fallback.error);
            alert('❌ Lỗi cập nhật lên Supabase: ' + (fallback.error.message || ''));
            return;
          }
        }
      }
    } catch (e) {
      console.error('Lỗi sync Supabase:', e);
      alert('❌ Lỗi kết nối Supabase: ' + e.message);
      return;
    }

    const t = teachersList.find(item => getTeacherKey(item) === editingTeacherId);
    if (t) {
      t.teacher_name = name;
      t.name = name;
      t.department = dept || 'Khoa Ngoại Ngữ';
    }
    alert('✅ Đã cập nhật thông tin Giảng viên thành công!');
  } else {
    const exists = teachersList.some(t => (t.email || '').toLowerCase() === email.toLowerCase());
    if (exists) {
      alert('❌ Email giảng viên này đã tồn tại trên hệ thống!');
      return;
    }

    if (!password || password.length < 6) {
      alert('❌ Mật khẩu khởi tạo phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      const client = db();
      if (!client) throw new Error('Supabase client chưa được khởi tạo.');

      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password
      });

      if (authError) {
        console.error('Lỗi tạo auth user:', authError);
        alert('❌ Không thể tạo tài khoản auth: ' + (authError.message || ''));
        return;
      }

      if (!authData?.user?.id) {
        throw new Error('Supabase trả về user rỗng sau khi signUp.');
      }

      // Thử tự động xác nhận email/tài khoản bằng endpoint admin (cần chạy server có SUPABASE_SERVICE_ROLE_KEY)
      try {
        await fetch('/api/admin/confirm-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user.id })
        });
      } catch (err) {
        // Không block luồng — nếu xác thực admin thất bại thì vẫn tiếp tục tạo profile.
        console.warn('Auto-confirm user failed:', err?.message || err);
      }

      const teacherCode = generateNextTeacherCode();
      const profile = {
        user_id: authData.user.id,
        teacher_code: teacherCode,
        email: email,
        teacher_name: name,
        department: dept || 'Khoa Ngoại Ngữ',
        role: isRootUser(email) ? 'admin' : 'teacher',
        is_active: true,
        created_at: new Date().toISOString()
      };

      const savedProfile = await insertTeacherProfile(profile);
      const newTeacher = {
        ...savedProfile,
        teacher_code: savedProfile?.teacher_code || teacherCode,
        email: savedProfile?.email || email,
        teacher_name: savedProfile?.teacher_name || name,
        department: savedProfile?.department || (dept || 'Khoa Ngoại Ngữ'),
        role: savedProfile?.role || (isRootUser(email) ? 'admin' : 'teacher'),
        is_active: savedProfile?.is_active ?? true,
        name: savedProfile?.teacher_name || name
      };

      teachersList.unshift(newTeacher);
      alert('✅ Đã tạo tài khoản giảng viên mới trên Supabase Auth và profile teacher thành công!');
    } catch (e) {
      console.error('Lỗi tạo giảng viên mới:', e);
      alert('❌ Lỗi tạo tài khoản giảng viên: ' + (e.message || ''));
      return;
    }
  }

  closeTeacherModal();
  renderTeachersList();
}

// 5. MỞ / KHÓA TÀI KHOẢN GIẢNG VIÊN TRÊN SUPABASE
export async function toggleTeacherStatus(id) {
  const t = teachersList.find(item => getTeacherKey(item) === id);
  if (!t) return;

  const nextStatus = !(t.is_active !== false);

  try {
    if (db()) {
      const { error } = await db().from('teachers').update({ is_active: nextStatus }).eq('user_id', id);
      if (error) {
        const fallback = await db().from('teachers').update({ is_active: nextStatus }).eq('id', id);
        if (fallback.error) {
          alert('❌ Lỗi cập nhật trạng thái trên Supabase: ' + fallback.error.message);
          return;
        }
      }
    }

    t.is_active = nextStatus;
    alert(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản giảng viên ${t.teacher_name || t.name || t.email}!`);
    renderTeachersList();
  } catch (e) {
    console.error('Lỗi toggle status:', e);
    alert('❌ Lỗi: ' + e.message);
  }
}

// 6. XÓA GIẢNG VIÊN TRÊN SUPABASE
export async function deleteTeacher(id) {
  const t = teachersList.find(item => getTeacherKey(item) === id);
  if (!t) return;

  const teacherDisplayName = t.teacher_name || t.name || t.email;
  if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản giảng viên "${teacherDisplayName}" không?`)) return;

  try {
    if (db()) {
      const { error } = await db().from('teachers').delete().eq('user_id', id);
      if (error) {
        const fallback = await db().from('teachers').delete().eq('id', id);
        if (fallback.error) {
          alert('❌ Lỗi xóa giảng viên trên Supabase: ' + fallback.error.message);
          return;
        }
      }
    }

    teachersList = teachersList.filter(item => getTeacherKey(item) !== id);
    alert('✅ Đã xóa tài khoản giảng viên khỏi Supabase thành công!');
    renderTeachersList();
  } catch (e) {
    console.error('Lỗi xóa giảng viên:', e);
    alert('❌ Lỗi: ' + e.message);
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

