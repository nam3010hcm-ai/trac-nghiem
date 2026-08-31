/**
 * MODULE TEACHER AUTH & LMS PANEL NAVIGATION (js/teacher/teacher-auth.js)
 * Đăng nhập, đăng xuất, phân quyền Root Admin, quản lý thanh điều hướng tab & sidebar
 */
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from '../supabase.js';

import { showToast } from '../ui-components.js';
import { initData, state, $, esc, isRootUser } from '../common.js';
import { populateCategoryDropdowns, updateFltSubcat, updateQFormSubcat, updateEFormSubcat, renderCatManagementList } from '../categories.js';
import { renderQuestions, openQForm, closeQForm, saveQ } from '../questions.js';
import { renderExams, renderPracticeExams, populateExamSelect, openEForm, closeEForm, saveExam } from '../exams.js';
import { renderResults, exportCSV, clearResults } from '../results.js';
import { loadUnits, renderUnitsList } from '../units.js';
import { loadStudents, renderStudentsList } from '../students-mgr.js';
import { loadTeachers, renderTeachersList } from '../teachers-mgr.js';
import { renderCurriculumTree, loadCurriculumFromSupabase } from '../curriculum.js';
import { recordAuthEvent } from '../auth-logs.js';
import { loadClasses, renderClassesList } from '../classes-mgr.js';
import { loadAssignments, renderAssignmentsList } from '../assignments-mgr.js';
import { loadPendingSubmissions, renderGradingQueueTable } from '../grading-center.js';
import { loadAnalyticsData, renderAnalyticsDashboard } from '../lms-analytics.js';
import { loadClassPosts, renderClassStream } from '../class-stream.js';
import { loadCohorts, populateCohortExams } from './teacher-cohorts.js';

export function updateDashboardKPICounts() {
  const qEl = document.getElementById('dash-kpi-q-count');
  const eEl = document.getElementById('dash-kpi-exam-count');
  const sEl = document.getElementById('dash-kpi-student-count');

  if (qEl && state?.questions) qEl.textContent = state.questions.length.toLocaleString('vi-VN');
  if (eEl && state?.exams) eEl.textContent = state.exams.length.toLocaleString('vi-VN');
  if (sEl && state?.students) sEl.textContent = state.students.length.toLocaleString('vi-VN');
}

export function applyUserRolePermissions(isRoot) {
  const secUsers = document.getElementById('sidebar-sec-users');
  if (secUsers) {
    secUsers.style.display = isRoot ? 'block' : 'none';
  }

  const userMgmtElements = document.querySelectorAll('.user-mgmt-only, #tab-btn-teachers, #tab-btn-students, #tab-btn-authlogs');
  userMgmtElements.forEach(el => {
    el.style.display = isRoot ? '' : 'none';
  });
}

export async function showTeacherPanel(user) {
  $('t-login').style.display = 'none';
  $('t-panel').style.display = 'flex';

  state.currentUserEmail = user?.email || 'nam3010hcm@gmail.com';
  const isRoot = isRootUser(state.currentUserEmail);
  applyUserRolePermissions(isRoot);

  let teacherName = user?.teacher_name || user?.name;
  if (!teacherName) {
    try {
      const tcRaw = localStorage.getItem('teacher_user');
      if (tcRaw) {
        const parsed = JSON.parse(tcRaw);
        teacherName = parsed.teacher_name || parsed.name;
      }
    } catch(e){}
  }
  if (!teacherName && isRoot) teacherName = 'Thầy Nam (Root Admin)';
  if (!teacherName) teacherName = state.currentUserEmail.split('@')[0];

  state.currentUserName = teacherName;

  try {
    localStorage.setItem('teacher_user', JSON.stringify({
      id: user?.id || 'T001',
      email: state.currentUserEmail,
      name: teacherName,
      teacher_name: teacherName,
      department: user?.department || (isRoot ? 'Quản Trị Hệ Thống' : 'Khoa Ngoại Ngữ'),
      role: isRoot ? 'root' : (user?.role || 'teacher'),
      login_timestamp: Date.now()
    }));

    recordAuthEvent(state.currentUserEmail, 'teacher', 'login', 0, user?.id || '', teacherName, '');
  } catch(e){}

  if ($('current-user-name')) {
    $('current-user-name').innerText = teacherName;
  }
  if ($('current-user-email')) {
    $('current-user-email').innerText = state.currentUserEmail;
  }

  const roleBadge = $('user-role-badge');
  if (roleBadge) {
    if (isRoot) {
      roleBadge.style.background = '#fef3c7';
      roleBadge.style.color = '#92400e';
      roleBadge.style.border = '1px solid #fde68a';
      roleBadge.innerHTML = '👑 Root Admin';
    } else {
      roleBadge.style.background = '#e0f2fe';
      roleBadge.style.color = '#0369a1';
      roleBadge.style.border = '1px solid #bae6fd';
      roleBadge.innerHTML = '👨‍🏫 Giáo viên';
    }
  }

  if (typeof window.renderGlobalHeaderProfile === 'function') {
    window.renderGlobalHeaderProfile();
  }

  await initData();

  const validTabs = ['dash', 'curriculum', 'q', 'practice', 'e', 'unit', 'teachers', 'students', 'r', 'c', 'cohort', 'img', 'classes', 'assignments', 'grading', 'stream', 'analytics', 'authlogs'];
  const hashTab = (window.location.hash || '').replace('#', '').trim();
  let savedTab = null;
  try { savedTab = localStorage.getItem('active_teacher_tab'); } catch(e){}
  let targetTab = validTabs.includes(hashTab) ? hashTab : (validTabs.includes(savedTab) ? savedTab : 'dash');
  if (!isRoot && ['teachers', 'students', 'authlogs'].includes(targetTab)) {
    targetTab = 'dash';
  }
  switchTTab(targetTab);

  initTeacherApp();

  try {
    await initData(true);
  } catch(e) {
    console.error("Lỗi khi nạp dữ liệu:", e);
  }

  try {
    populateCategoryDropdowns();
    updateFltSubcat();
    updateQFormSubcat();
    updateEFormSubcat();
    populateExamSelect();

    renderQuestions();
    renderExams();
    renderResults();
    renderCatManagementList();
    loadCohorts(); 
    loadUnits().then(() => {
      renderUnitsList();
      return loadCurriculumFromSupabase();
    }).then(() => {
      renderCurriculumTree();
    });
    loadStudents().then(() => {
      renderStudentsList();
      updateDashboardKPICounts();
    });
    loadTeachers().then(() => renderTeachersList());
    loadClasses().then(() => renderClassesList());
    loadAssignments().then(() => renderAssignmentsList());
    loadPendingSubmissions().then(() => renderGradingQueueTable());
    populateCohortExams();
    updateDashboardKPICounts();
  } catch(e) {
    console.error("Lỗi khi hiển thị giao diện quản trị:", e);
  }
}

export function togglePasswordVisibility() {
  const passInput = $('t-pass');
  const btn = $('btn-toggle-pass');

  if (!passInput || !btn) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    btn.innerText = '🙈 Ẩn';
  } else {
    passInput.type = 'password';
    btn.innerText = '👁 Hiện';
  }
}

export async function doLogin() {
  const email = $('t-email')?.value?.trim() || '';
  const pass = $('t-pass')?.value?.trim() || '';

  if (!email || !pass) {
    if ($('t-err')) {
      $('t-err').style.display = 'block';
      $('t-err').innerText = '❌ Vui lòng nhập email và mật khẩu!';
    }
    alert('Vui lòng nhập đầy đủ Email và Mật khẩu!');
    return;
  }

  const btn = $('btn-login');
  if(btn) { btn.disabled = true; btn.innerText = 'Đang xác thực...'; }

  try {
    const data = await signInWithEmailAndPassword(email, pass);
    if ($('t-err')) $('t-err').style.display = 'none';
    if (data?.user) {
      await showTeacherPanel(data.user);
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);

    let errMsg = error.message || 'Email hoặc mật khẩu không đúng!';
    if (errMsg.includes('Email not confirmed')) {
      errMsg = 'Tài khoản chưa được kích hoạt! Hãy vào Supabase Dashboard -> Authentication -> Users và bấm Confirm user.';
    } else if (errMsg.includes('Invalid login credentials')) {
      errMsg = 'Sai email hoặc mật khẩu! Vui lòng kiểm tra lại thông tin tài khoản Supabase.';
    }
    
    if ($('t-err')) {
      $('t-err').style.display = 'block';
      $('t-err').innerText = '❌ ' + errMsg;
    }
    alert('❌ ' + errMsg);
  } finally {
    if(btn) { btn.disabled = false; btn.innerText = 'Đăng nhập'; }
  }
}

export async function doLogout() {
  const teacherUserRaw = localStorage.getItem('teacher_user');
  if (teacherUserRaw) {
    try {
      const u = JSON.parse(teacherUserRaw);
      const sessionStart = u.login_timestamp || Date.now();
      const duration = Math.round((Date.now() - sessionStart) / 1000);
      await recordAuthEvent(u.email, 'teacher', 'logout', duration, u.id || '', u.name || u.email, '');
    } catch(e){}
  }

  try { await signOut(); } catch(e){}

  localStorage.removeItem('teacher_user');
  sessionStorage.clear();

  if ($('t-pass')) $('t-pass').value = '';
  if ($('t-err')) $('t-err').style.display = 'none';
  if ($('t-login')) $('t-login').style.display = 'block';
  if ($('t-panel')) $('t-panel').style.display = 'none';

  if ($('current-user-email')) {
    $('current-user-email').innerText = '';
  }
}

export function switchTTab(t) {
  const userMgmtTabs = ['teachers', 'students', 'authlogs'];
  const isRoot = isRootUser(state.currentUserEmail);
  if (userMgmtTabs.includes(t) && !isRoot) {
    showToast('warning', 'Hạn chế quyền', 'Phân hệ Quản Lý Người Dùng chỉ dành riêng cho tài khoản Root Admin!');
    t = 'dash';
  }

  const tabs = ['dash', 'curriculum', 'q', 'practice', 'e', 'unit', 'teachers', 'students', 'r', 'c', 'cohort', 'img', 'classes', 'assignments', 'grading', 'stream', 'analytics', 'authlogs'];
  if (!tabs.includes(t)) t = 'dash';

  try {
    localStorage.setItem('active_teacher_tab', t);
    if (window.location.hash !== '#' + t) {
      history.replaceState(null, '', '#' + t);
    }
  } catch(e) {}

  if (window.innerWidth <= 992) {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  tabs.forEach(x => {
    const content = $('tc-' + x);
    if(content) {
      content.classList.toggle('active', x === t);
      content.style.display = (x === t) ? 'block' : 'none';
    }
    
    const sidebarItems = document.querySelectorAll(`[data-tab="${x}"]`);
    sidebarItems.forEach(item => item.classList.toggle('active', x === t));
  });

  if (t === 'classes') loadClasses().then(renderClassesList);
  if (t === 'assignments') loadAssignments().then(renderAssignmentsList);
  if (t === 'grading') loadPendingSubmissions().then(renderGradingQueueTable);
  if (t === 'stream') loadClassPosts().then(renderClassStream);
  if (t === 'analytics') loadAnalyticsData().then(renderAnalyticsDashboard);

  if (t === 'curriculum' && typeof window.renderCurriculumTree === 'function') window.renderCurriculumTree();
  if (t === 'unit') renderUnitsList();
  if (t === 'practice') renderPracticeExams();
  if (t === 'e') renderExams();
  if (t === 'teachers') {
    renderTeachersList();
    loadTeachers().then(renderTeachersList);
  }
  if (t === 'students') {
    renderStudentsList();
    loadStudents().then(renderStudentsList);
  }
  if (t === 'r') {
    renderResults();
    if (typeof window.calculateAndRenderTop10 === 'function') window.calculateAndRenderTop10();
    if (typeof window.loadAuthLogs === 'function') window.loadAuthLogs().then(window.renderAuthLogsTable);
  }
  if (t === 'c') renderCatManagementList();
  if (t === 'img' && typeof window.loadGallery === 'function') window.loadGallery();
  if (t === 'cohort') {
      loadCohorts(); 
      populateCohortExams();
  }
  if (t === 'authlogs') {
    if (typeof window.loadAuthLogs === 'function') {
      window.loadAuthLogs().then(() => {
        if (typeof window.renderAuthLogsAnalytics === 'function') window.renderAuthLogsAnalytics();
        if (typeof window.renderAuthLogsTable === 'function') window.renderAuthLogsTable();
        if (typeof window.renderUserActivitySummaryTable === 'function') window.renderUserActivitySummaryTable();
      });
    }
  }
}

export function toggleSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  if (!sidebar) return;
  const isMobile = window.innerWidth <= 992;
  const backdrop = document.getElementById('sidebar-backdrop');

  if (isMobile) {
    const isOpen = sidebar.classList.toggle('open');
    if (backdrop) {
      if (isOpen) backdrop.classList.add('active');
      else backdrop.classList.remove('active');
    }
  } else {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    try {
      localStorage.setItem('admin_sidebar_collapsed', isCollapsed ? '1' : '0');
    } catch(e){}
  }
}

export function initTeacherApp() {
  if (typeof window !== 'undefined' && window._teacherAppInitialized) return;
  if (typeof window !== 'undefined') window._teacherAppInitialized = true;

  try {
    const isCollapsed = localStorage.getItem('admin_sidebar_collapsed') === '1';
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && window.innerWidth > 992 && isCollapsed) {
      sidebar.classList.add('collapsed');
    }
  } catch(e){}

  if ($('btn-login')) $('btn-login').addEventListener('click', doLogin);
  if ($('btn-toggle-pass')) {
    $('btn-toggle-pass').addEventListener('click', togglePasswordVisibility);
  }

  if ($('t-email')) {
    $('t-email').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }

  if ($('t-pass')) {
    $('t-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }

  if ($('btn-logout')) $('btn-logout').addEventListener('click', doLogout);

  onAuthStateChanged(async user => {
    if (user) {
      showTeacherPanel(user);
    } else {
      $('t-login').style.display = 'block';
      $('t-panel').style.display = 'none';
      if ($('current-user-email')) $('current-user-email').innerText = '';
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTTab(btn.dataset.tab))
  );

  if ($('flt-cat')) {
    $('flt-cat').addEventListener('change', () => {
      updateFltSubcat();

      const cat = $('flt-cat').value;
      if ($('qf-cat')) $('qf-cat').value = cat;
      updateQFormSubcat();

      const subcat = $('flt-subcat')?.value;
      if (subcat && $('qf-subcat')) $('qf-subcat').value = subcat;
    });
  }

  if ($('qf-cat')) $('qf-cat').addEventListener('change', updateQFormSubcat);
  if ($('ef-cat')) $('ef-cat').addEventListener('change', updateEFormSubcat);
  if ($('flt-r-cohort')) $('flt-r-cohort').addEventListener('change', renderResults);
  
  if ($('btn-filter-q')) {
    $('btn-filter-q').addEventListener('click', () => {
      renderQuestions();

      const cat = $('flt-cat')?.value;
      const subcat = $('flt-subcat')?.value;

      if (cat && $('qf-cat')) {
        $('qf-cat').value = cat;
        updateQFormSubcat();
      }

      if (subcat && $('qf-subcat')) {
        $('qf-subcat').value = subcat;
      }
    });
  }

  if ($('btn-open-qform')) {
    $('btn-open-qform').addEventListener('click', () => {
      openQForm();
      const cat = $('flt-cat')?.value;
      const subcat = $('flt-subcat')?.value;
      if (cat && $('qf-cat')) {
        $('qf-cat').value = cat;
        updateQFormSubcat();
      }
      if (subcat && $('qf-subcat')) {
        $('qf-subcat').value = subcat;
      }
    });
  }

  if ($('btn-close-qform')) $('btn-close-qform').addEventListener('click', closeQForm);
  if ($('btn-save-q')) $('btn-save-q').addEventListener('click', saveQ);

  if ($('btn-open-eform')) $('btn-open-eform').addEventListener('click', openEForm);
  if ($('btn-close-eform')) $('btn-close-eform').addEventListener('click', closeEForm);
  if ($('btn-save-exam')) $('btn-save-exam').addEventListener('click', saveExam);

  if ($('btn-export')) $('btn-export').addEventListener('click', exportCSV);
  if ($('btn-clear-results')) $('btn-clear-results').addEventListener('click', clearResults);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTeacherApp);
  } else {
    initTeacherApp();
  }
}
