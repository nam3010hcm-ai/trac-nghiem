/**
 * MODULE STUDENT WORKSPACE & EXAM PORTAL (js/student.js)
 * Barrel module phòng thi học viên, tích hợp xác thực, topbar ma trận & giao diện làm bài
 */
import {
  STUDENT_AUTH_KEY,
  getAuthenticatedStudent,
  toggleStudentPassVisible,
  loginStudent,
  logoutStudent,
  renderStudentPortal,
  checkStudentAuth
} from './student/student-auth.js';

import {
  isQuestionAnswered,
  renderQuizTopbar,
  updateQuizStats,
  jumpToQuestion,
  toggleQuestionMatrix,
  renderQuestionMatrixBody,
  showStudentBadge
} from './student/student-topbar.js';

import {
  uiState,
  renderPart,
  renderMCQ,
  renderFillBlank,
  renderDragDrop,
  renderMatching,
  renderEssay,
  bindEventsForQuestion
} from './student/student-renderer.js';

import {
  qState,
  STORE_KEY,
  activeCohortsData,
  showScreen,
  persist,
  clearPersist,
  switchExamMode,
  renderStudentAssignedTasks,
  populatePracticeCategories,
  populatePracticeExamSelect,
  updatePracticeExamDesc,
  startPracticeExam,
  loadActiveCohorts,
  startExam,
  startTimer,
  finishExam,
  initStudentApp
} from './student/student-exam.js';

export {
  STUDENT_AUTH_KEY,
  getAuthenticatedStudent,
  toggleStudentPassVisible,
  loginStudent,
  logoutStudent,
  renderStudentPortal,
  checkStudentAuth,
  isQuestionAnswered,
  renderQuizTopbar,
  updateQuizStats,
  jumpToQuestion,
  toggleQuestionMatrix,
  renderQuestionMatrixBody,
  showStudentBadge,
  uiState,
  renderPart,
  renderMCQ,
  renderFillBlank,
  renderDragDrop,
  renderMatching,
  renderEssay,
  bindEventsForQuestion,
  qState,
  STORE_KEY,
  activeCohortsData,
  showScreen,
  persist,
  clearPersist,
  switchExamMode,
  renderStudentAssignedTasks,
  populatePracticeCategories,
  populatePracticeExamSelect,
  updatePracticeExamDesc,
  startPracticeExam,
  loadActiveCohorts,
  startExam,
  startTimer,
  finishExam,
  initStudentApp
};

// Window global bindings
if (typeof window !== 'undefined') {
  window.loginStudent = loginStudent;
  window.logoutStudent = logoutStudent;
  window.toggleStudentPassVisible = toggleStudentPassVisible;
  window.switchExamMode = switchExamMode;
  window.populatePracticeCategories = populatePracticeCategories;
  window.populatePracticeExamSelect = populatePracticeExamSelect;
  window.updatePracticeExamDesc = updatePracticeExamDesc;
  window.startPracticeExam = startPracticeExam;
  window.jumpToQuestion = jumpToQuestion;
  window.toggleQuestionMatrix = toggleQuestionMatrix;
}
