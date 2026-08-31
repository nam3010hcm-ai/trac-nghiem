/**
 * MODULE STUDENT AUTH & PORTAL (js/student/student-auth.js)
 * Xác thực tài khoản học viên, quản lý phiên đăng nhập và hiển thị thông tin học viên
 */
import { $, renderGlobalHeaderProfile } from '../common.js';
import { recordAuthEvent } from '../auth-logs.js';
import { showScreen, populatePracticeCategories, populatePracticeExamSelect, loadActiveCohorts, switchExamMode } from './student-exam.js';

const db = () => window.supabaseClient;

export const STUDENT_AUTH_KEY = 'quiz_student_auth_session_v1';

export function getAuthenticatedStudent() {
  try {
    const raw = sessionStorage.getItem(STUDENT_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function toggleStudentPassVisible(btnEl) {
  const input = $('st-login-pass');
  const btn = btnEl || $('btn-toggle-st-pass') || (typeof event !== 'undefined' && event?.currentTarget);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

export async function loginStudent() {
  const inputEl = $('st-login-email') || $('s-email');
  const passEl = $('st-login-pass') || $('s-pass');
  const errBox = $('st-login-err') || $('s-err');
  const btn = $('btn-student-login') || $('btn-s-login');

  const userInput = inputEl ? inputEl.value.trim() : '';
  const pass = passEl ? passEl.value.trim() : '';

  if (errBox) errBox.style.display = 'none';

  if (!userInput || !pass) {
    if (errBox) {
      errBox.textContent = '⚠️ Vui lòng nhập Mã Sinh Viên (ID) hoặc Gmail/Email và Mật khẩu!';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Đang xác thực...'; }

  try {
    let data = null;
    if (db()) {
      try {
        const { data: students, error } = await db()
          .from('students')
          .select('*')
          .or(`email.ilike."${userInput}",id.ilike."${userInput}"`)
          .eq('password', pass);

        if (students && students.length > 0) {
          data = students[0];
        }
      } catch (e) {
        console.warn("Lỗi truy vấn OR trong Supabase, chuyển sang truy vấn fallback:", e);
      }

      if (!data) {
        const resId = await db().from('students').select('*').ilike('id', userInput).eq('password', pass).maybeSingle();
        if (resId.data) {
          data = resId.data;
        } else {
          const resEmail = await db().from('students').select('*').ilike('email', userInput).eq('password', pass).maybeSingle();
          if (resEmail.data) {
            data = resEmail.data;
          }
        }
      }
    }

    if (!data) {
      if (errBox) {
        errBox.textContent = '❌ Mã Sinh Viên (ID) / Email hoặc Mật khẩu không chính xác!';
        errBox.style.display = 'block';
      }
      return;
    }

    if (data.is_active === false) {
      if (errBox) {
        errBox.textContent = '⛔ Tài khoản học viên của bạn đã bị khóa. Vui lòng liên hệ Giáo viên/Quản trị viên!';
        errBox.style.display = 'block';
      }
      return;
    }

    const stPayload = { 
      sid: data.id, 
      id: data.id,
      name: data.full_name || data.id, 
      full_name: data.full_name || data.id, 
      class_name: data.class_name || '', 
      email: data.email || '',
      role: 'student'
    };
    localStorage.setItem('st_user', JSON.stringify(stPayload));
    sessionStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(data));
    sessionStorage.setItem('st_session_start', Date.now().toString());

    recordAuthEvent(data.email, 'student', 'login', 0, data.id, data.full_name || data.id, data.class_name || '');

    renderStudentPortal(data);
  } catch (err) {
    console.error("Lỗi đăng nhập học viên:", err);
    if (errBox) {
      errBox.textContent = '❌ Lỗi kết nối máy chủ: ' + (err.message || '');
      errBox.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng Nhập Phòng Thi & Học Tập →'; }
  }
}

export function renderStudentPortal(student) {
  if ($('st-auth-welcome')) $('st-auth-welcome').textContent = `Xin chào, ${student.full_name || student.id} 👋`;
  if ($('st-auth-id')) $('st-auth-id').textContent = student.id || '';
  if ($('st-auth-class')) $('st-auth-class').textContent = student.class_name || '';

  if (typeof window.renderGlobalHeaderProfile === 'function') {
    window.renderGlobalHeaderProfile();
  }

  showScreen('sc-portal');
  populatePracticeCategories();
  populatePracticeExamSelect();
  loadActiveCohorts();
  switchExamMode('practice');
}

export function logoutStudent() {
  const currentStudent = getAuthenticatedStudent();
  const sessionStart = parseInt(sessionStorage.getItem('st_session_start') || '0', 10);
  const duration = sessionStart > 0 ? Math.round((Date.now() - sessionStart) / 1000) : 0;

  if (currentStudent && currentStudent.email) {
    recordAuthEvent(currentStudent.email, 'student', 'logout', duration, currentStudent.id, currentStudent.full_name, currentStudent.class_name);
  }

  sessionStorage.removeItem(STUDENT_AUTH_KEY);
  sessionStorage.removeItem('st_session_start');
  if ($('st-login-pass')) $('st-login-pass').value = '';
  if ($('st-login-err')) $('st-login-err').style.display = 'none';
  showScreen('sc-login');
}

export function checkStudentAuth() {
  const currentStudent = getAuthenticatedStudent();
  if (currentStudent && currentStudent.id) {
    renderStudentPortal(currentStudent);
  } else {
    showScreen('sc-login');
  }
}
