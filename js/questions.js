/**
 * MODULE QUESTION BANK MANAGEMENT (js/questions.js)
 * Barrel module quản lý ngân hàng câu hỏi, form tạo/sửa, danh sách & import
 */
import {
  editQId,
  updateQFormSubcat,
  insertFormat,
  initRichTextEditors,
  applyQTypeUI,
  renderBlankInputs,
  updateQFormPreviews,
  openQForm,
  closeQForm,
  saveQ
} from './questions/questions-form.js';

import {
  selectedQIds,
  qPage,
  updateSelectedCountLabel,
  deleteSelectedQuestions,
  deleteQ,
  getPageSize,
  getSearch,
  filteredQuestions,
  toggleQLatexSource,
  ensureQuestionTools,
  renderQuestions
} from './questions/questions-list.js';

import {
  downloadTemplateCSV,
  loadSheetJS,
  importQuestionsFromFile
} from './questions/questions-import.js';

export {
  editQId,
  updateQFormSubcat,
  insertFormat,
  initRichTextEditors,
  applyQTypeUI,
  renderBlankInputs,
  updateQFormPreviews,
  openQForm,
  closeQForm,
  saveQ,
  selectedQIds,
  qPage,
  updateSelectedCountLabel,
  deleteSelectedQuestions,
  deleteQ,
  getPageSize,
  getSearch,
  filteredQuestions,
  toggleQLatexSource,
  ensureQuestionTools,
  renderQuestions,
  downloadTemplateCSV,
  loadSheetJS,
  importQuestionsFromFile
};

// Window global bindings cho các hàm gọi trực tiếp từ HTML inline onclick
if (typeof window !== 'undefined') {
  window.openQForm = openQForm;
  window.closeQForm = closeQForm;
  window.saveQ = saveQ;
  window.deleteQ = deleteQ;
  window.deleteSelectedQuestions = deleteSelectedQuestions;
  window.renderQuestions = renderQuestions;
  window.updateQFormPreviews = updateQFormPreviews;
  window.toggleQLatexSource = toggleQLatexSource;
  window.insertFormat = insertFormat;
}
