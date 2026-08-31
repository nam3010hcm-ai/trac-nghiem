/**
 * MODULE TEACHER ADMIN WORKSPACE (js/teacher.js)
 * Barrel module trang quản trị giảng viên, tích hợp phân quyền, ca thi, đề thi & media gallery
 */
import {
  showTeacherPanel,
  updateDashboardKPICounts,
  togglePasswordVisibility,
  doLogin,
  doLogout,
  applyUserRolePermissions,
  switchTTab,
  toggleSidebar,
  initTeacherApp
} from './teacher/teacher-auth.js';

import {
  allCohortsData,
  editingCohortId,
  populateCohortExams,
  loadCohorts,
  editCohort,
  cancelEditCohort,
  addCohort,
  changeCohortCode,
  toggleCohort,
  deleteCohort
} from './teacher/teacher-cohorts.js';

import {
  currentEqmExamId,
  openExamQuestionManager,
  renderEqmLists,
  moveQ,
  addQToExam,
  removeQFromExam
} from './teacher/teacher-eqm.js';

import {
  imageGallery,
  loadGallery,
  renderGallery,
  openSelectGalleryModal,
  quickUploadToGalleryFromModal,
  deleteGalleryItem,
  selectGalleryImage
} from './teacher/teacher-gallery.js';

export {
  showTeacherPanel,
  updateDashboardKPICounts,
  togglePasswordVisibility,
  doLogin,
  doLogout,
  applyUserRolePermissions,
  switchTTab,
  toggleSidebar,
  initTeacherApp,
  allCohortsData,
  editingCohortId,
  populateCohortExams,
  loadCohorts,
  editCohort,
  cancelEditCohort,
  addCohort,
  changeCohortCode,
  toggleCohort,
  deleteCohort,
  currentEqmExamId,
  openExamQuestionManager,
  renderEqmLists,
  moveQ,
  addQToExam,
  removeQFromExam,
  imageGallery,
  loadGallery,
  renderGallery,
  openSelectGalleryModal,
  quickUploadToGalleryFromModal,
  deleteGalleryItem,
  selectGalleryImage
};

// Window global bindings
if (typeof window !== 'undefined') {
  window.initTeacherPanelDirect = showTeacherPanel;
  window.updateDashboardKPICounts = updateDashboardKPICounts;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.doLoginManual = doLogin;
  window.doLogout = doLogout;
  window.applyUserRolePermissions = applyUserRolePermissions;
  window.switchTTab = switchTTab;
  window._teacherModuleSwitchTab = switchTTab;
  window.toggleSidebar = toggleSidebar;
  window.populateCohortExams = populateCohortExams;
  window.editCohort = editCohort;
  window.cancelEditCohort = cancelEditCohort;
  window.addCohort = addCohort;
  window.changeCohortCode = changeCohortCode;
  window.toggleCohort = toggleCohort;
  window.deleteCohort = deleteCohort;
  window.loadCohorts = loadCohorts;
  window.openExamQuestionManager = openExamQuestionManager;
  window.moveQ = moveQ;
  window.addQToExam = addQToExam;
  window.removeQFromExam = removeQFromExam;
  window.loadGallery = loadGallery;
  window.renderGallery = renderGallery;
  window.openSelectGalleryModal = openSelectGalleryModal;
  window.quickUploadToGalleryFromModal = quickUploadToGalleryFromModal;
  window.deleteGalleryItem = deleteGalleryItem;
  window.selectGalleryImage = selectGalleryImage;
}
