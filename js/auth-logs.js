/**
 * MODULE AUTH LOGS & MONITORING BARREL (js/auth-logs.js)
 * Tự động ghi vết phiên làm việc, phân tích thời lượng và quản trị bảo mật
 */
import {
  getWeeklyPeriod,
  recordAuthEvent,
  recordStudyTime,
  formatDuration
} from './auth/auth-tracker.js';

import {
  authLogsList,
  weeklyStatsList,
  currentAuthLogTab,
  loadAuthLogs,
  renderAuthLogsAnalytics,
  renderAuthLogsTable,
  renderUserActivitySummaryTable,
  switchAuthLogsSubTab
} from './auth/auth-logs-ui.js';

import {
  renderTeacherActivityLogsTable,
  exportAuthLogsCSV
} from './auth/auth-logs-crud.js';

import {
  calculateAndRenderTop10,
  openStudentReportModal,
  closeStudentReportModal
} from './auth/student-reports.js';

export {
  getWeeklyPeriod,
  recordAuthEvent,
  recordStudyTime,
  formatDuration,
  authLogsList,
  weeklyStatsList,
  currentAuthLogTab,
  loadAuthLogs,
  renderAuthLogsAnalytics,
  renderAuthLogsTable,
  renderUserActivitySummaryTable,
  renderTeacherActivityLogsTable,
  switchAuthLogsSubTab,
  exportAuthLogsCSV,
  calculateAndRenderTop10,
  openStudentReportModal,
  closeStudentReportModal
};

if (typeof window !== 'undefined') {
  window.recordAuthEvent = recordAuthEvent;
  window.recordStudyTime = recordStudyTime;
  window.formatDuration = formatDuration;
}
