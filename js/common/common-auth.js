/**
 * MODULE COMMON AUTH & IDENTITY MANAGEMENT (js/common/common-auth.js)
 * Quản lý danh tính người dùng (Họ và Tên), Audit Logs CRUD và phiên đăng nhập
 */
import { state, esc } from './common-exam.js';

export const ROOT_ADMIN_EMAIL = 'nam3010hcm@gmail.com';

// HỌ VÀ TÊN HIỂN THỊ CỦA TÁC GIẢ / NGƯỜI THỰC HIỆN
export function getAuthorDisplayName(emailOrId) {
  if (!emailOrId) return 'Quản Trị Viên';
  const target = String(emailOrId).trim().toLowerCase();
  
  // 1. Kiểm tra danh sách Giảng viên
  const teachers = (state && state.teachers) || window.teachersList || [];
  const matchedTeacher = teachers.find(t => 
    (t.email && t.email.toLowerCase() === target) || 
    (t.id && t.id.toLowerCase() === target)
  );
  if (matchedTeacher) {
    return matchedTeacher.teacher_name || matchedTeacher.name || matchedTeacher.email;
  }

  // 2. Kiểm tra Root Admin mặc định
  if (target === ROOT_ADMIN_EMAIL.toLowerCase() || target === 't001') {
    return 'Thầy Nam (Root Admin)';
  }

  // 3. Kiểm tra danh sách Học viên
  const students = (state && state.students) || window.studentsList || [];
  const matchedStudent = students.find(s => 
    (s.email && s.email.toLowerCase() === target) || 
    (s.id && s.id.toLowerCase() === target)
  );
  if (matchedStudent) {
    return matchedStudent.full_name || matchedStudent.name;
  }

  // 4. Kiểm tra user hiện tại trong localStorage
  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      if ((u.email && u.email.toLowerCase() === target) || (u.id && u.id.toLowerCase() === target)) {
        return u.teacher_name || u.name || u.email;
      }
    }
    const stRaw = localStorage.getItem('st_user');
    if (stRaw) {
      const u = JSON.parse(stRaw);
      if ((u.email && u.email.toLowerCase() === target) || (u.id && u.id.toLowerCase() === target) || (u.sid && u.sid.toLowerCase() === target)) {
        return u.full_name || u.name;
      }
    }
  } catch(e){}

  return emailOrId.includes('@') ? emailOrId.split('@')[0] : emailOrId;
}

// LƯU VẾT THAO TÁC CRUD CỦA GIẢNG VIÊN (AUDIT / ACTIVITY LOG)
export async function logTeacherActivity(actionType, targetType, targetName, targetId = '', details = '') {
  let actorEmail = (state && state.currentUserEmail) || '';
  let actorName = (state && state.currentUserName) || '';
  let actorRole = 'teacher';

  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      if (!actorEmail) actorEmail = u.email || '';
      if (!actorName) actorName = u.teacher_name || u.name || '';
      if (u.role) actorRole = u.role;
    }
  } catch(e){}

  if (!actorEmail) actorEmail = ROOT_ADMIN_EMAIL;
  if (!actorName) actorName = getAuthorDisplayName(actorEmail);

  const timestamp = new Date().toISOString();
  const logItem = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    actor_email: actorEmail,
    actor_name: actorName, // HỌ VÀ TÊN ĐẦY ĐỦ
    actor_role: actorRole,
    action_type: actionType, // 'Tạo mới', 'Cập nhật', 'Xóa', 'Kích hoạt / Khóa'
    target_type: targetType, // 'Đề thi', 'Câu hỏi', 'Học viên', 'Bài học', 'Nhiệm vụ', 'Ca thi'
    target_name: targetName || '',
    target_id: targetId || '',
    details: details || '',
    timestamp: timestamp
  };

  // 1. Lưu vào localStorage cache
  try {
    const raw = localStorage.getItem('educore_teacher_activity_logs');
    let logs = raw ? JSON.parse(raw) : [];
    logs.unshift(logItem);
    if (logs.length > 500) logs = logs.slice(0, 500);
    localStorage.setItem('educore_teacher_activity_logs', JSON.stringify(logs));
  } catch(e){}

  // 2. Ghi nhận vào Supabase
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('user_auth_logs').insert([{
        user_email: actorEmail,
        user_type: 'teacher',
        event_type: 'crud_action',
        timestamp: timestamp
      }]);
    }
  } catch(e){}

  // 3. Thông báo re-render nếu bảng đang mở
  if (typeof window.renderTeacherActivityLogsTable === 'function') {
    window.renderTeacherActivityLogsTable();
  }
}

// CẬP NHẬT HEADER PROFILE TRÊN TẤT CẢ CÁC TRANG VỚI HỌ VÀ TÊN ĐẦY ĐỦ
export function renderGlobalHeaderProfile() {
  let userLabel = '';
  let avatarIcon = '🔑';
  let isLoggedIn = false;
  let subLabel = '';

  const stUserRaw = localStorage.getItem('st_user');
  const tcUserRaw = localStorage.getItem('teacher_user');

  if (stUserRaw) {
    try {
      const parsed = JSON.parse(stUserRaw);
      const fullName = parsed.full_name || parsed.name || 'Học viên';
      userLabel = fullName;
      subLabel = parsed.class_name ? `Lớp ${parsed.class_name}` : 'Học viên EduCore';
      avatarIcon = '🎓';
      isLoggedIn = true;
    } catch(e){}
  } else if (tcUserRaw) {
    try {
      const parsed = JSON.parse(tcUserRaw);
      const isRoot = (parsed.email || '').toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase() || parsed.role === 'root' || parsed.role === 'admin';
      const fullName = parsed.teacher_name || parsed.name || (isRoot ? 'Thầy Nam (Root Admin)' : parsed.email);
      userLabel = fullName;
      subLabel = isRoot ? 'Root Admin' : (parsed.department || 'Giảng viên');
      avatarIcon = isRoot ? '👑' : '👨‍🏫';
      isLoggedIn = true;
    } catch(e){}
  }

  const profileBadges = document.querySelectorAll('.user-profile-badge, #user-header-badge');
  profileBadges.forEach(badge => {
    if (isLoggedIn) {
      badge.innerHTML = `
        <div class="user-avatar-img">${avatarIcon}</div>
        <div style="display:flex;flex-direction:column;line-height:1.2;text-align:left;">
          <span style="font-weight:800;font-size:13px;color:#0f172a;">${esc(userLabel)}</span>
          <span style="font-size:10.5px;color:#2563eb;font-weight:700;text-transform:uppercase;">${esc(subLabel)}</span>
        </div>
      `;
      badge.title = `Tài khoản: ${userLabel} (${subLabel})`;
    } else {
      badge.innerHTML = `
        <div class="user-avatar-img">🔑</div>
        <span>Đăng Nhập Phân Hệ</span>
      `;
      badge.title = "Bấm để đăng nhập";
    }
  });

  const logoutBtns = document.querySelectorAll('.header-logout-btn, #header-logout-btn');
  logoutBtns.forEach(btn => {
    btn.style.display = isLoggedIn ? 'inline-flex' : 'none';
  });
}

if (typeof window !== 'undefined') {
  window.getAuthorDisplayName = getAuthorDisplayName;
  window.logTeacherActivity = logTeacherActivity;
  window.renderGlobalHeaderProfile = renderGlobalHeaderProfile;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderGlobalHeaderProfile);
  } else {
    renderGlobalHeaderProfile();
  }
}

export function isRootUser(email) {
  let targetEmail = email;
  if (!targetEmail && typeof state !== 'undefined' && state.currentUserEmail) {
    targetEmail = state.currentUserEmail;
  }
  if (!targetEmail) {
    try {
      const userRaw = localStorage.getItem('teacher_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.role === 'root' || u.role === 'admin' || String(u.email || '').trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
          return true;
        }
        targetEmail = u.email;
      }
    } catch(e){}
  }
  if (!targetEmail) return false;
  
  const emailStr = String(targetEmail).trim().toLowerCase();
  if (emailStr === ROOT_ADMIN_EMAIL.toLowerCase()) return true;

  try {
    const userRaw = localStorage.getItem('teacher_user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (String(u.email || '').trim().toLowerCase() === emailStr && (u.role === 'root' || u.role === 'admin')) {
        return true;
      }
    }
  } catch(e){}
  
  return false;
}

export async function logUserAuthEvent(userEmail, userType = 'teacher', eventType = 'login', durationSeconds = 0) {
  if (!userEmail) return;
  const nowStr = new Date().toISOString();
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('user_auth_logs').insert([{
        user_email: userEmail,
        user_type: userType,
        event_type: eventType,
        timestamp: nowStr
      }]);

      const targetTable = userType === 'student' ? 'students' : 'teachers';
      const payload = eventType === 'login' ? { last_login_at: nowStr } : { last_logout_at: nowStr };
      await client.from(targetTable).update(payload).eq('email', userEmail);
    }
  } catch (e) {
    console.warn("Lỗi logUserAuthEvent:", e);
  }
}

export async function globalLogout() {
  const stUserRaw = localStorage.getItem('st_user');
  const tcUserRaw = localStorage.getItem('teacher_user');

  try {
    let email = '';
    let userType = 'teacher';
    let duration = 0;

    if (stUserRaw) {
      try {
        const u = JSON.parse(stUserRaw);
        email = u.email || u.sid || '';
        userType = 'student';
        const sessionStart = parseInt(sessionStorage.getItem('st_session_start') || '0', 10);
        if (sessionStart > 0) duration = Math.round((Date.now() - sessionStart) / 1000);
      } catch(e){}
    } else if (tcUserRaw) {
      try {
        const u = JSON.parse(tcUserRaw);
        email = u.email || '';
        userType = 'teacher';
        if (u.login_timestamp) duration = Math.round((Date.now() - u.login_timestamp) / 1000);
      } catch(e){}
    }

    if (email) {
      await logUserAuthEvent(email, userType, 'logout', duration);
    }

    if (window.supabaseClient && window.supabaseClient.auth) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (e) {
    console.warn("SignOut error:", e);
  }
  localStorage.removeItem('st_user');
  localStorage.removeItem('teacher_user');
  sessionStorage.clear();
  alert('🔒 Đã đăng xuất khỏi tài khoản EduCore!');
  window.location.href = 'index.html';
}

if (typeof window !== 'undefined') {
  window.globalLogout = globalLogout;
}

export function canEditItem(item, currentUserEmail) {
  if (!currentUserEmail) return true;
  if (isRootUser(currentUserEmail)) return true;
  const creator = item?.created_by || item?.createdBy;
  if (!creator) return false;
  return String(creator).trim().toLowerCase() === String(currentUserEmail).trim().toLowerCase();
}
