/**
 * MODULE COMMON & SYSTEM UTILITIES (js/common.js)
 * Barrel module tái xuất khẩu toàn bộ tiện ích từ js/common/*
 */
import { uploadMediaFile } from './supabase.js';
import { showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge } from './ui-components.js';

export { uploadMediaFile, showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge };

// 1. Quản lý danh tính, quyền hạn và audit logs
export {
  ROOT_ADMIN_EMAIL,
  getAuthorDisplayName,
  logTeacherActivity,
  renderGlobalHeaderProfile,
  isRootUser,
  logUserAuthEvent,
  globalLogout,
  canEditItem
} from './common/common-auth.js';

// 2. Định dạng MathJax, LaTeX, Media HTML và Audio/Video
export {
  mediaHTML,
  audioHTML,
  videoHTML,
  renderRich,
  typesetMath
} from './common/common-math.js';

// 3. State hệ thống, chấm điểm câu hỏi, phân loại và tải dữ liệu Supabase
export {
  KEYS,
  state,
  $,
  clone,
  shuffle,
  esc,
  DEFAULT_SUBCATS,
  DEFAULT_QUESTIONS,
  DEFAULT_EXAMS,
  TYPE_LABELS,
  splitBlanks,
  countBlanks,
  normAns,
  isCorrect,
  formatAnswer,
  getPool,
  initData,
  fillSubcatSelect
} from './common/common-exam.js';
