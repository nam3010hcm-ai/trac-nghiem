/**
 * MODULE PDF & AI VISION PARSER ENGINE (js/pdf-parser.js)
 * Barrel module bóc tách đề thi PDF, nhận diện công thức toán LaTeX & đồng bộ Supabase
 */
import {
  SAMPLE_2_TRANG_PDF_DATA,
  loadPdfJs,
  getStoredGeminiApiKey,
  saveGeminiApiKey,
  saveGeminiApiKeyFromInput,
  togglePdfEngineMode,
  parsePdfWithGeminiVision,
  parsePdfDocument
} from './pdf/pdf-engine.js';

import {
  cleanMathFormulas,
  repairVietnameseAccents,
  findBestOptionSequence,
  parseOfflineQuestionBlock,
  fallbackExtractQuestions,
  parsePdfDocumentOffline
} from './pdf/pdf-rules.js';

import {
  currentParsedExam,
  openPdfImportModal,
  closePdfImportModal,
  populatePdfCatSelects,
  updatePdfSubcatSelect,
  handlePdfFileUpload,
  testWithSamplePdf,
  runPdfParsingWorkflow,
  renderParsedExamPreview,
  filterParsedQuestionsPreview,
  deleteParsedQuestion,
  addBlankQuestionToParsed,
  updateParsedQuestionText,
  updateParsedQuestionOption,
  setParsedQuestionAnswer
} from './pdf/pdf-preview.js';

import {
  saveParsedExamToSupabase
} from './pdf/pdf-saver.js';

export {
  SAMPLE_2_TRANG_PDF_DATA,
  loadPdfJs,
  getStoredGeminiApiKey,
  saveGeminiApiKey,
  saveGeminiApiKeyFromInput,
  togglePdfEngineMode,
  parsePdfWithGeminiVision,
  parsePdfDocument,
  cleanMathFormulas,
  repairVietnameseAccents,
  findBestOptionSequence,
  parseOfflineQuestionBlock,
  fallbackExtractQuestions,
  parsePdfDocumentOffline,
  currentParsedExam,
  openPdfImportModal,
  closePdfImportModal,
  populatePdfCatSelects,
  updatePdfSubcatSelect,
  handlePdfFileUpload,
  testWithSamplePdf,
  runPdfParsingWorkflow,
  renderParsedExamPreview,
  filterParsedQuestionsPreview,
  deleteParsedQuestion,
  addBlankQuestionToParsed,
  updateParsedQuestionText,
  updateParsedQuestionOption,
  setParsedQuestionAnswer,
  saveParsedExamToSupabase
};
