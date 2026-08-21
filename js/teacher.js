import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  uploadMediaFile
} from './supabase.js';

import { showToast } from './ui-components.js';
import { initData, state, $, esc, isRootUser } from './common.js';
import { populateCategoryDropdowns, updateFltSubcat, updateQFormSubcat, updateEFormSubcat, addParentCategory, deleteParentCategory, addSubCategory, deleteSubCategory, editSubCategory, restoreDefaultCategories, renderCatManagementList } from './categories.js';
import { openQForm, closeQForm, saveQ, deleteQ, renderQuestions, deleteSelectedQuestions } from './questions.js';
import { openEForm, closeEForm, saveExam, deleteExam, toggleExamVisibility, renderExams, renderPracticeExams, populateExamSelect } from './exams.js';
import { renderResults, clearResults, exportCSV } from './results.js';
import { loadUnits, renderUnitsList, openUnitEditor, closeUnitEditor, switchDesignerSkillTab, saveUnit, deleteUnit, toggleUnitVisibility } from './units.js';
import { loadStudents, renderStudentsList, openStudentModal, closeStudentModal, saveStudent, toggleStudentStatus, deleteStudent, openBulkStudentModal, closeBulkStudentModal, saveBulkStudents, exportStudentsCSV } from './students-mgr.js';
import { loadTeachers, renderTeachersList, openTeacherModal, closeTeacherModal, saveTeacher, toggleTeacherStatus, deleteTeacher } from './teachers-mgr.js';
import { renderCurriculumTree, openSubjectModal, closeSubjectModal, saveSubject, loadCurriculumFromSupabase } from './curriculum.js';
import { calculateAndRenderTop10, loadAuthLogs, renderAuthLogsTable, openStudentReportModal, closeStudentReportModal, recordAuthEvent } from './auth-logs.js';

import { loadClasses, renderClassesList, saveClassItem, openClassModal, saveClassFromModal, deleteClassItem } from './classes-mgr.js';
import { loadAssignments, renderAssignmentsList, saveAssignmentItem, openAssignmentModal, saveAssignmentFromModal, deleteAssignmentItem, previewAssignment } from './assignments-mgr.js';
import { loadPendingSubmissions, renderGradingQueueTable, openGradeModal, saveGradeResult } from './grading-center.js';
import { loadAnalyticsData, renderAnalyticsDashboard } from './lms-analytics.js';
import { loadClassPosts, renderClassStream, submitStreamPost, submitPostComment } from './class-stream.js';
import {
  openPdfImportModal, closePdfImportModal, handlePdfFileUpload, testWithSamplePdf,
  updateParsedQuestionText, updateParsedQuestionOption, setParsedQuestionAnswer, saveParsedExamToSupabase,
  deleteParsedQuestion, addBlankQuestionToParsed, filterParsedQuestionsPreview,
  togglePdfEngineMode, saveGeminiApiKeyFromInput, getStoredGeminiApiKey
} from './pdf-parser.js';

window.openPdfImportModal = openPdfImportModal;
window.closePdfImportModal = closePdfImportModal;
window.handlePdfFileUpload = handlePdfFileUpload;
window.testWithSamplePdf = testWithSamplePdf;
window.updateParsedQuestionText = updateParsedQuestionText;
window.updateParsedQuestionOption = updateParsedQuestionOption;
window.setParsedQuestionAnswer = setParsedQuestionAnswer;
window.saveParsedExamToSupabase = saveParsedExamToSupabase;
window.deleteParsedQuestion = deleteParsedQuestion;
window.addBlankQuestionToParsed = addBlankQuestionToParsed;
window.filterParsedQuestionsPreview = filterParsedQuestionsPreview;
window.togglePdfEngineMode = togglePdfEngineMode;
window.saveGeminiApiKeyFromInput = saveGeminiApiKeyFromInput;
window.getStoredGeminiApiKey = getStoredGeminiApiKey;

window.loadClasses = loadClasses;
window.renderClassesList = renderClassesList;
window.saveClassItem = saveClassItem;
window.openClassModal = openClassModal;
window.saveClassFromModal = saveClassFromModal;
window.deleteClassItem = deleteClassItem;

window.loadAssignments = loadAssignments;
window.renderAssignmentsList = renderAssignmentsList;
window.saveAssignmentItem = saveAssignmentItem;
window.openAssignmentModal = openAssignmentModal;
window.saveAssignmentFromModal = saveAssignmentFromModal;
window.deleteAssignmentItem = deleteAssignmentItem;
window.previewAssignment = previewAssignment;

window.loadPendingSubmissions = loadPendingSubmissions;
window.renderGradingQueueTable = renderGradingQueueTable;
window.openGradeModal = openGradeModal;
window.saveGradeResult = saveGradeResult;

window.loadAnalyticsData = loadAnalyticsData;
window.renderAnalyticsDashboard = renderAnalyticsDashboard;

window.loadClassPosts = loadClassPosts;
window.renderClassStream = renderClassStream;
window.submitStreamPost = submitStreamPost;
window.submitPostComment = submitPostComment;

window.loadTeachers = loadTeachers;
window.renderTeachersList = renderTeachersList;
window.openTeacherModal = openTeacherModal;
window.closeTeacherModal = closeTeacherModal;
window.saveTeacher = saveTeacher;
window.toggleTeacherStatus = toggleTeacherStatus;
window.deleteTeacher = deleteTeacher;

window.loadStudents = loadStudents;
window.renderStudentsList = renderStudentsList;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.saveStudent = saveStudent;
window.toggleStudentStatus = toggleStudentStatus;
window.deleteStudent = deleteStudent;
window.openBulkStudentModal = openBulkStudentModal;
window.closeBulkStudentModal = closeBulkStudentModal;
window.saveBulkStudents = saveBulkStudents;
window.exportStudentsCSV = exportStudentsCSV;

const db = () => window.supabaseClient;

async function showTeacherPanel(user) {
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

    // Ghi nhận sự kiện Login của Giảng viên vào bảng nhật ký
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
    loadCurriculumFromSupabase().then(() => renderCurriculumTree());
    loadUnits().then(() => renderUnitsList());
    loadStudents().then(() => {
      renderStudentsList();
      updateDashboardKPICounts();
    });
    loadTeachers().then(() => renderTeachersList());
    loadClasses().then(() => renderClassesList());
    loadAssignments().then(() => renderAssignmentsList());
    loadPendingSubmissions().then(() => renderGradingQueueTable());
    if (typeof window.populateCohortExams === 'function') {
      window.populateCohortExams(); 
    }
    updateDashboardKPICounts();
  } catch(e) {
    console.error("Lỗi khi hiển thị giao diện quản trị:", e);
  }
}

export function updateDashboardKPICounts() {
  const qEl = document.getElementById('dash-kpi-q-count');
  const eEl = document.getElementById('dash-kpi-exam-count');
  const sEl = document.getElementById('dash-kpi-student-count');

  if (qEl && state?.questions) qEl.textContent = state.questions.length.toLocaleString('vi-VN');
  if (eEl && state?.exams) eEl.textContent = state.exams.length.toLocaleString('vi-VN');
  if (sEl && state?.students) sEl.textContent = state.students.length.toLocaleString('vi-VN');
}
window.updateDashboardKPICounts = updateDashboardKPICounts;

window.initTeacherPanelDirect = showTeacherPanel;

function togglePasswordVisibility() {
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

async function doLogin() {
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

window.doLoginManual = doLogin;
window.togglePasswordVisibility = togglePasswordVisibility;

async function doLogout() {
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
window.applyUserRolePermissions = applyUserRolePermissions;

function switchTTab(t) {
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

  // Tự động đóng sidebar trên mobile sau khi chọn tab
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
      if (typeof window.populateCohortExams === 'function') {
          window.populateCohortExams(); 
      }
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

window.toggleSidebar = toggleSidebar;
window.switchTTab = switchTTab;
window._teacherModuleSwitchTab = switchTTab;
window.doLogout = doLogout;
window.openStudentReportModal = openStudentReportModal;
window.closeStudentReportModal = closeStudentReportModal;
window.calculateAndRenderTop10 = calculateAndRenderTop10;
window.loadAuthLogs = loadAuthLogs;
window.renderAuthLogsTable = renderAuthLogsTable;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.saveStudent = saveStudent;
window.toggleStudentStatus = toggleStudentStatus;
window.deleteStudent = deleteStudent;
window.openBulkStudentModal = openBulkStudentModal;
window.closeBulkStudentModal = closeBulkStudentModal;
window.saveBulkStudents = saveBulkStudents;
window.exportStudentsCSV = exportStudentsCSV;
window.renderStudentsList = renderStudentsList;
window.loadTeachers = loadTeachers;
window.renderTeachersList = renderTeachersList;
window.openTeacherModal = openTeacherModal;
window.closeTeacherModal = closeTeacherModal;
window.saveTeacher = saveTeacher;
window.toggleTeacherStatus = toggleTeacherStatus;
window.deleteTeacher = deleteTeacher;
window.openUnitEditor = openUnitEditor;
window.closeUnitEditor = closeUnitEditor;
window.switchDesignerSkillTab = switchDesignerSkillTab;
window.saveUnit = saveUnit;
window.deleteUnit = deleteUnit;
window.toggleUnitVisibility = toggleUnitVisibility;
window.renderUnitsList = renderUnitsList;
window.openQForm = openQForm;
window.closeQForm = closeQForm;
window.saveQ = saveQ;
window.deleteQ = deleteQ;
window.deleteSelectedQuestions = deleteSelectedQuestions;
window.renderQuestions = renderQuestions;
window.updateFltSubcat = updateFltSubcat;
window.updateQFormSubcat = updateQFormSubcat;
window.updateEFormSubcat = updateEFormSubcat;
window.populateCategoryDropdowns = populateCategoryDropdowns;
window.openEForm = openEForm;
window.closeEForm = closeEForm;
window.saveExam = saveExam;
window.deleteExam = deleteExam;
window.toggleExamVisibility = toggleExamVisibility;
window.renderExams = renderExams;
window.renderResults = renderResults;
window.clearResults = clearResults;
window.exportCSV = exportCSV;
window.addParentCategory = addParentCategory;
window.deleteParentCategory = deleteParentCategory;
window.addSubCategory = addSubCategory;
window.deleteSubCategory = deleteSubCategory;
window.editSubCategory = editSubCategory;
window.restoreDefaultCategories = restoreDefaultCategories;
window.renderCatManagementList = renderCatManagementList;

function initTeacherApp() {
  if (window._teacherAppInitialized) return;
  window._teacherAppInitialized = true;

  // Khôi phục trạng thái sidebar đã lưu trên Desktop
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

  if ($('q-list')) {
    $('q-list').addEventListener('click', e => {
      const btn = e.target.closest('.q-action');
      if (!btn) return;

      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === 'edit') openQForm(id);
      if (btn.dataset.action === 'delete') deleteQ(id);
    });
  }

  if ($('btn-open-eform')) $('btn-open-eform').addEventListener('click', openEForm);
  if ($('btn-close-eform')) $('btn-close-eform').addEventListener('click', closeEForm);
  if ($('btn-save-exam')) $('btn-save-exam').addEventListener('click', saveExam);

  const handleExamActionClick = e => {
    const btn = e.target.closest('.e-action');
    if (!btn) return;

    const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);

    if (btn.dataset.action === 'toggle') {
        toggleExamVisibility(id);
    } else if (btn.dataset.action === 'delete') {
        deleteExam(id);
    } else if (btn.dataset.action === 'edit') {
        openEForm(id); 
    } else if (btn.dataset.action === 'manage-q') {
        window.openExamQuestionManager(id);
    }
  };

  if ($('e-list')) $('e-list').addEventListener('click', handleExamActionClick);
  if ($('practice-e-list')) $('practice-e-list').addEventListener('click', handleExamActionClick);

  if ($('btn-add-parent')) $('btn-add-parent').addEventListener('click', addParentCategory);
  if ($('btn-add-sub')) $('btn-add-sub').addEventListener('click', addSubCategory);
  if ($('btn-restore')) $('btn-restore').addEventListener('click', restoreDefaultCategories);

  if ($('cat-management-list')) {
    $('cat-management-list').addEventListener('click', e => {
      const btn = e.target.closest('.cat-action');
      if (!btn) return;

      const parent = btn.dataset.parent;
      const sub = btn.dataset.sub;

      if (btn.dataset.action === 'delete-parent') deleteParentCategory(parent);
      if (btn.dataset.action === 'edit-sub') editSubCategory(parent, sub);
      if (btn.dataset.action === 'delete-sub') deleteSubCategory(parent, sub);
    });
  }

  if ($('btn-export')) $('btn-export').addEventListener('click', exportCSV);
  if ($('btn-clear-results')) $('btn-clear-results').addEventListener('click', clearResults);

  // Gallery file upload
  const galFile = document.getElementById('gal-file');
  let selectedGalFile = null;

  if (galFile) {
      galFile.addEventListener('change', e => {
          selectedGalFile = e.target.files[0];
          if (!selectedGalFile) {
              document.getElementById('gal-preview').innerHTML = '';
              return;
          }
          const objectUrl = URL.createObjectURL(selectedGalFile);
          document.getElementById('gal-preview').innerHTML = `<img src="${objectUrl}" style="max-height:150px; border-radius:6px; border:1px solid #cbd5e1;">`;
      });
  }

  const btnUploadGal = document.getElementById('btn-upload-gal');
  if (btnUploadGal) {
      btnUploadGal.addEventListener('click', async () => {
          const name = document.getElementById('gal-name').value.trim();
          if (!name) { alert("Vui lòng nhập tên gợi nhớ cho ảnh!"); return; }
          if (!selectedGalFile) { alert("Vui lòng chọn 1 file ảnh!"); return; }

          btnUploadGal.disabled = true;
          btnUploadGal.textContent = "Đang tải lên Supabase Storage...";
          try {
              const downloadURL = await uploadMediaFile(selectedGalFile, 'image-bank', (pct) => {
                  btnUploadGal.textContent = `Đang tải lên: ${pct}%...`;
              });
              const { error } = await db().from('gallery').insert([{ name: name, url: downloadURL, created_at: Date.now() }]);
              if(error) throw error;
              alert("Đã lưu ảnh vào thư viện đám mây!");
              document.getElementById('gal-name').value = '';
              document.getElementById('gal-file').value = '';
              document.getElementById('gal-preview').innerHTML = '';
              selectedGalFile = null;
              if (window.loadGallery) window.loadGallery();
          } catch (e) { console.error(e); alert("Lỗi khi tải ảnh lên: " + (e.message || '')); }
          btnUploadGal.disabled = false;
          btnUploadGal.textContent = "Tải lên Thư viện";
      });
  }

  // Chấm bài tự luận
  let currentGradeResultId = null;

  window.openGradeModal = function(resultId) {
      const modal = document.getElementById('grade-modal');
      if (!modal) return;
      const res = state.results.find(r => String(r.id) === String(resultId));
      if (!res) return;

      currentGradeResultId = resultId;
      document.getElementById('grade-student-info').innerHTML = `Học viên: <b>${esc(res.student)}</b> (${esc(res.sid || '')}) | Đề: <b>${esc(res.exam)}</b>`;
      
      let essayHtml = '';
      if (Array.isArray(res.answers)) {
          res.answers.forEach((ans, i) => {
              if (typeof ans === 'string' && ans.length > 5) {
                  essayHtml += `<div style="margin-bottom:10px;"><b>Bài làm câu ${i+1}:</b><div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #cbd5e1; margin-top:4px;">${esc(ans)}</div></div>`;
              }
          });
      }
      document.getElementById('grade-essay-content').innerHTML = essayHtml || '<i>Học viên không có phần trả lời tự luận hoặc đã nộp trống.</i>';
      document.getElementById('grade-score-input').value = res.manualScore || 0;
      modal.style.display = 'flex';
  };

  document.getElementById('btn-close-grade')?.addEventListener('click', () => {
      document.getElementById('grade-modal').style.display = 'none';
      currentGradeResultId = null;
  });

  document.getElementById('btn-save-grade')?.addEventListener('click', async () => {
      if (!currentGradeResultId) return;
      const scoreVal = parseFloat(document.getElementById('grade-score-input').value) || 0;
      const res = state.results.find(r => String(r.id) === String(currentGradeResultId));
      if (res) {
          res.manualScore = scoreVal;
          const { error } = await db().from('results').update({ manual_score: scoreVal }).eq('id', currentGradeResultId);
          if(error) console.error("Lỗi lưu điểm tự luận:", error);
          renderResults();
      }
      document.getElementById('grade-modal').style.display = 'none';
      alert("✅ Đã cập nhật điểm tự luận thành công!");
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTeacherApp);
} else {
  initTeacherApp();
}

// ==========================================
// QUẢN LÝ CA THI / LỚP HỌC (COHORTS)
// ==========================================

// Hàm hiển thị danh sách đề thi dạng Checkbox cho Form tạo / sửa Ca thi
window.populateCohortExams = function() {
    const container = document.getElementById("t-cohort-exams");
    if (!container) return;
    
    // Kiểm tra xem dữ liệu đề thi đã được tải về chưa
    if (typeof state === 'undefined' || !state.exams) {
        container.innerHTML = '<div style="color:#ef4444; font-size:13px;">Lỗi: Chưa tải được dữ liệu đề thi. Vui lòng F5 lại trang!</div>';
        return;
    }

    // LỌC ĐỀ THI: Chỉ lấy những đề KHÔNG BỊ ẨN
    const visibleExams = state.exams.filter(e => !e.isHidden);

    if (visibleExams.length === 0) {
        container.innerHTML = '<div style="color:#64748b; font-size:13px; text-align:center; padding: 10px;">Không có đề thi nào đang ở chế độ HIỆN!</div>';
        return;
    }

    // RENDER GIAO DIỆN
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
                ${e.name}
            </span>
        </label>
    `).join('');
};

window.allCohortsData = {}; 
let editingCohortId = null; 

// 1. Hàm tải danh sách ca thi
async function loadCohorts() {
    const tbody = document.getElementById("t-cohort-list");
    if (!tbody) return;

    try {
        const { data: cohorts, error } = await db().from('cohorts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        tbody.innerHTML = "";
        window.allCohortsData = {};

        if (!cohorts || cohorts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px;">Chưa có ca thi nào</td></tr>';
            return;
        }

        cohorts.forEach(data => {
            const id = String(data.id);
            window.allCohortsData[id] = {
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

// Hàm đẩy dữ liệu lên Form để Sửa
window.editCohort = (id) => {
    const data = window.allCohortsData[id];
    if (!data) return;

    editingCohortId = id;
    document.getElementById("t-cohort-name").value = data.name || '';
    document.getElementById("t-cohort-code").value = data.code || '';
    document.getElementById("t-cohort-start").value = data.startTime || '';
    document.getElementById("t-cohort-end").value = data.endTime || '';
    
    const modeSelect = document.getElementById("t-cohort-mode");
    if(modeSelect) modeSelect.value = data.mode || 'practice';

    // Đánh dấu các đề thi đã chọn
    const allowed = data.allowedExams || [];
    document.querySelectorAll('.cohort-exam-cb').forEach(cb => {
        cb.checked = allowed.includes(parseInt(cb.value));
    });

    const btn = document.getElementById("btn-add-cohort");
    btn.textContent = "💾 Cập nhật Ca thi";
    btn.style.background = "#f59e0b";
    
    let cancelBtn = document.getElementById("btn-cancel-edit-cohort");
    if (!cancelBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.id = "btn-cancel-edit-cohort";
        cancelBtn.className = "btn";
        cancelBtn.style.marginTop = "10px";
        cancelBtn.style.marginLeft = "8px";
        cancelBtn.textContent = "Hủy sửa";
        cancelBtn.onclick = () => window.cancelEditCohort();
        btn.parentNode.insertBefore(cancelBtn, btn.nextSibling);
    }
    cancelBtn.style.display = "inline-block";
    document.getElementById("t-cohort-name").scrollIntoView({ behavior: 'smooth' });
};

// Hàm Hủy chế độ Sửa và làm sạch Form
window.cancelEditCohort = () => {
    editingCohortId = null;
    document.getElementById("t-cohort-name").value = "";
    document.getElementById("t-cohort-code").value = "";
    document.getElementById("t-cohort-start").value = "";
    document.getElementById("t-cohort-end").value = "";
    document.querySelectorAll('.cohort-exam-cb').forEach(cb => cb.checked = false);
    
    const btn = document.getElementById("btn-add-cohort");
    if(btn) {
        btn.textContent = "✅ Tạo Ca thi";
        btn.style.background = "";
    }
    
    const cancelBtn = document.getElementById("btn-cancel-edit-cohort");
    if(cancelBtn) cancelBtn.style.display = "none";
};

// 2. Bắt sự kiện Thêm hoặc Cập nhật ca thi
window.addCohort = async () => {
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
        
        window.cancelEditCohort();
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
};

const btnAddCohort = document.getElementById("btn-add-cohort");
if (btnAddCohort) {
    btnAddCohort.addEventListener("click", window.addCohort);
}

// 3. Hàm đổi mã bảo mật
window.changeCohortCode = async (id, oldCode) => {
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
};

// 4. Bật tắt ca thi và Xóa
window.toggleCohort = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    const { error } = await db().from('cohorts').update({ status: newStatus }).eq('id', id);
    if(error) console.error("Lỗi toggleCohort:", error);
    loadCohorts();
};

window.deleteCohort = async (id) => {
    if (confirm("Xóa ca thi này? Điểm của học viên đã thi sẽ KHÔNG bị mất.")) {
        const { error } = await db().from('cohorts').delete().eq('id', id);
        if(error) console.error("Lỗi deleteCohort:", error);
        loadCohorts();
    }
};

// ==========================================
// TÍNH NĂNG CHỌN CÂU HỎI THỦ CÔNG CHO ĐỀ THI
// ==========================================
let currentEqmExamId = null;

window.openExamQuestionManager = function(examId) {
    currentEqmExamId = examId;
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;

    const eqm = document.getElementById('exam-q-manager');
    if (!eqm) return;

    const isPracticeTab = $('tc-practice') && $('tc-practice').style.display !== 'none';
    if (isPracticeTab) {
        const pList = $('practice-e-list');
        if (pList && eqm.parentNode !== $('tc-practice')) {
            $('tc-practice').insertBefore(eqm, pList);
        }
    } else {
        const eList = $('e-list');
        if (eList && eqm.parentNode !== $('tc-e')) {
            $('tc-e').insertBefore(eqm, eList);
        }
    }

    const eForm = document.getElementById('eform');
    if(eForm) eForm.style.display = 'none'; 

    eqm.style.display = 'block';
    document.getElementById('eqm-name').textContent = exam.name;

    if (!exam.qIds) exam.qIds = [];

    const cats = Object.keys(state.SUBCATS).sort();
    document.getElementById('eqm-filter-cat').innerHTML = '<option value="">(Tất cả chủ đề)</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

    renderEqmLists();
    eqm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.getElementById('btn-close-eqm')?.addEventListener('click', () => {
    document.getElementById('exam-q-manager').style.display = 'none';
});

document.getElementById('eqm-filter-cat')?.addEventListener('change', () => {
    renderEqmLists();
});

function renderEqmLists() {
    if (!currentEqmExamId) return;
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if (!exam) return;

    const filterCat = document.getElementById('eqm-filter-cat').value;
    const qIds = exam.qIds || [];

    document.getElementById('eqm-selected-count').textContent = qIds.length;

    const selectedQs = qIds.map(id => state.questions.find(q => q.id === id)).filter(Boolean);
    const availableQs = state.questions.filter(q => !qIds.includes(q.id) && (filterCat === '' || q.cat === filterCat));

    const renderSelectedQItem = (q, index, total) => `
        <div style="background:#fff; border:1px solid #a7f3d0; border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:start; gap:10px; transition: 0.2s; margin-bottom: 8px;">
            <div style="font-size:13px; color:#334155; flex:1;">
                <b style="color:#059669">[Câu ${index + 1}]</b> ${q.text.substring(0, 60)}${q.text.length > 60 ? '...' : ''}
            </div>
            <div style="display:flex; gap:4px;">
                <button class="btn btn-sm" onclick="window.moveQ(${index}, -1)" ${index === 0 ? 'disabled' : ''} style="padding:2px 6px;">⬆️</button>
                <button class="btn btn-sm" onclick="window.moveQ(${index}, 1)" ${index === total - 1 ? 'disabled' : ''} style="padding:2px 6px;">⬇️</button>
                <button class="btn btn-sm" onclick="window.removeQFromExam(${q.id})" style="background:#fee2e2; color:#ef4444; border:none; padding:2px 6px; font-weight:bold;">✖</button>
            </div>
        </div>
    `;

    const renderAvailableQItem = (q) => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:start; gap:10px; transition: 0.2s; margin-bottom: 8px;">
            <div style="font-size:13px; color:#334155; flex:1;">
                <b style="color:#64748b">[${q.subcat || q.cat || 'Chưa phân loại'}]</b> ${q.text.substring(0, 60)}${q.text.length > 60 ? '...' : ''}
            </div>
            <button class="btn btn-sm" onclick="window.addQToExam(${q.id})" style="background:#e0e7ff; color:#4f46e5; border:none; padding:4px 8px; font-weight:bold; cursor:pointer;">➕ Thêm</button>
        </div>
    `;

    document.getElementById('eqm-selected-list').innerHTML = selectedQs.length ? selectedQs.map((q, i) => renderSelectedQItem(q, i, selectedQs.length)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Đề thi chưa có câu hỏi nào</div>';
    document.getElementById('eqm-available-list').innerHTML = availableQs.length ? availableQs.map(q => renderAvailableQItem(q)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Không có câu hỏi phù hợp</div>';
}

window.moveQ = async (index, direction) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam || !exam.qIds) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exam.qIds.length) return;
    
    const temp = exam.qIds[index];
    exam.qIds[index] = exam.qIds[newIndex];
    exam.qIds[newIndex] = temp;
    
    await db().from('exams').update({ q_ids: exam.qIds }).eq('id', exam.id);
    renderEqmLists();
};

window.addQToExam = async (qId) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam) return;
    if(!exam.qIds) exam.qIds = [];
    
    if(!exam.qIds.includes(qId)) {
        exam.qIds.push(qId);
        exam.count = exam.qIds.length;
        await db().from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
        renderEqmLists();
        renderExams();
        renderPracticeExams();
    }
};

window.removeQFromExam = async (qId) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam) return;
    if(!exam.qIds) exam.qIds = [];
    
    exam.qIds = exam.qIds.filter(id => id !== qId);
    exam.count = exam.qIds.length;
    await db().from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
    renderEqmLists();
    renderExams();
    renderPracticeExams();
};

// ==========================================
// QUẢN LÝ THƯ VIỆN ẢNH (GALLERY)
// ==========================================
// THƯ VIỆN HÌNH ẢNH (MEDIA GALLERY ENGINE)
// ==========================================
window.imageGallery = [];

window.loadGallery = async function() {
    const list = document.getElementById("gallery-list");
    const modalList = document.getElementById("modal-gallery-list");
    if (!list && !modalList) return;

    try {
        const { data: items, error } = await db().from('gallery').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        window.imageGallery = items || [];
        try { localStorage.setItem('app_gallery_cache', JSON.stringify(window.imageGallery)); } catch(e){}
    } catch (e) {
        console.warn("[Gallery Warning] Không tải được từ Supabase, nạp từ bộ nhớ đệm:", e);
        try {
            const cached = localStorage.getItem('app_gallery_cache');
            if (cached) window.imageGallery = JSON.parse(cached);
        } catch(err){}
    }
    renderGallery();
};

function renderGallery() {
    const list = document.getElementById("gallery-list");
    const modalList = document.getElementById("modal-gallery-list");
    
    if (!window.imageGallery.length) {
        const emptyMsg = "<div style='color:#64748b; font-size:13.5px; padding:16px 0; width:100%; text-align:center;'>📭 Chưa có ảnh nào trong thư viện. Bạn có thể chọn file và tải lên ngay phía trên!</div>";
        if(list) list.innerHTML = emptyMsg;
        if(modalList) modalList.innerHTML = emptyMsg;
        return;
    }

    const html = window.imageGallery.map(img => {
        const src = img.url || img.base64;
        return `
        <div style="border:1.5px solid #cbd5e1; border-radius:8px; padding:10px; width:160px; text-align:center; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
            <img src="${src}" style="max-width:100%; height:95px; object-fit:contain; margin-bottom:8px; border-radius:4px; border:1px solid #f1f5f9; display:block; margin:0 auto 8px;">
            <div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(img.name)}">${esc(img.name)}</div>
            <button class="btn btn-sm btn-danger" onclick="window.deleteGalleryItem('${img.id}')" style="width:100%; font-size:11.5px; padding:3px 0;">🗑 Xóa</button>
        </div>
    `}).join('');
    
    const modalHtml = window.imageGallery.map(img => {
        const src = img.url || img.base64;
        return `
        <div style="border:1.5px solid #cbd5e1; border-radius:8px; padding:10px; width:150px; text-align:center; background:#fff; cursor:pointer; transition:all 0.15s ease; box-shadow:0 1px 4px rgba(0,0,0,0.05);" onclick="window.selectGalleryImage('${src}')" onmouseover="this.style.borderColor='#1e40af'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.transform='';">
            <img src="${src}" style="max-width:100%; height:90px; object-fit:contain; margin:0 auto 8px; display:block;">
            <div style="font-size:11.5px; font-weight:700; color:#1e40af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(img.name)}">${esc(img.name)}</div>
            <div style="font-size:10px; color:#16a34a; font-weight:600; margin-top:2px;">✔ Chọn ảnh này</div>
        </div>
    `}).join('');

    if(list) list.innerHTML = html;
    if(modalList) modalList.innerHTML = modalHtml;
}

window.openSelectGalleryModal = function(targetInputId = 'qf-image', previewContainerId = null) {
    window._activeGalleryTargetInputId = targetInputId;
    window._activeGalleryPreviewId = previewContainerId || (targetInputId === 'qf-image' ? 'image-preview' : null);
    
    const modal = document.getElementById('modal-select-gallery');
    if (modal) {
        modal.style.display = 'flex';
        window.loadGallery();
    }
};

window.quickUploadToGalleryFromModal = async function() {
    const fileInput = document.getElementById('modal-quick-upload-file');
    const file = fileInput?.files?.[0];
    if (!file) {
        alert("Vui lòng chọn 1 file ảnh từ máy tính!");
        return;
    }

    const btn = document.getElementById('btn-modal-quick-upload');
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Đang tải ảnh lên...";
    }

    try {
        const downloadURL = await uploadMediaFile(file, 'image-bank');
        const imgName = file.name.replace(/\.[^/.]+$/, "");
        const newItem = { id: 'gal_' + Date.now(), name: imgName, url: downloadURL, created_at: Date.now() };

        try {
            await db().from('gallery').insert([newItem]);
        } catch (dbErr) {
            console.warn("Không lưu được vào DB gallery:", dbErr);
        }

        window.imageGallery.unshift(newItem);
        try { localStorage.setItem('app_gallery_cache', JSON.stringify(window.imageGallery)); } catch(e){}

        renderGallery();
        window.selectGalleryImage(downloadURL);
        if (fileInput) fileInput.value = '';
    } catch (err) {
        console.error(err);
        alert("Lỗi tải ảnh: " + (err.message || err));
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = "⬆ Tải lên & Chọn luôn";
    }
};

window.deleteGalleryItem = async function(id) {
    if (!confirm("Xóa ảnh này khỏi danh mục thư viện?")) return;
    try {
        await db().from('gallery').delete().eq('id', id);
    } catch(e){}
    window.imageGallery = window.imageGallery.filter(img => String(img.id) !== String(id));
    try { localStorage.setItem('app_gallery_cache', JSON.stringify(window.imageGallery)); } catch(e){}
    renderGallery();
};

window.selectGalleryImage = function(src) {
    const targetId = window._activeGalleryTargetInputId || 'qf-image';
    const targetInput = document.getElementById(targetId);
    
    if (targetInput) {
        targetInput.value = src;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const previewId = window._activeGalleryPreviewId || (targetId === 'qf-image' ? 'image-preview' : null);
    if (previewId) {
        const imgPreview = document.getElementById(previewId);
        if (imgPreview) {
            imgPreview.innerHTML = `<img src="${src}" style="max-width:100%; max-height:160px; border-radius:8px; margin-top:8px; border: 1.5px solid #cbd5e1; display:block;">`;
        }
    }

    if (targetId === 'qf-image') {
        const btnClear = document.getElementById('btn-clear-image');
        if (btnClear) btnClear.style.display = 'inline-block';
    }

    const modal = document.getElementById('modal-select-gallery');
    if (modal) modal.style.display = 'none';

    // Tự động đồng bộ vào bản nháp nếu đang mở Trình thiết kế Unit
    if (typeof window.syncCurrentDesignerSkillToDraft === 'function') {
        window.syncCurrentDesignerSkillToDraft();
    }
};


