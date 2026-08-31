/**
 * MODULE K7 EDUHUB LMS DASHBOARD (js/index.js)
 * Barrel module trang chủ, tích hợp Bảng vinh danh, Khóa học, Biểu đồ & Nhắc nhở
 */
import {
  getWeeklyPeriod,
  formatStudyTime,
  loadWeeklyLeaderboards
} from './landing/landing-leaderboard.js';

import {
  loadFeaturedCoursesCatalog,
  loadSubjectEvaluationAnalytics,
  openSubjectAnalyticsModal,
  closeSubjectAnalyticsModal,
  openAuthModal,
  closeAuthModal,
  SUBJECT_CONFIGS
} from './landing/landing-catalog.js';

import {
  renderTrafficAnalyticsChart,
  onChartPointHover,
  onChartPointLeave,
  TRAFFIC_DATASETS
} from './landing/landing-traffic.js';

import {
  handleRemindDeadline,
  submitAssignmentReminder,
  openTeacherAuthRequiredModal,
  closeTeacherAuthRequiredModal,
  closeAssignmentReminderModal,
  viewAllDeadlines
} from './landing/landing-reminders.js';

export {
  getWeeklyPeriod,
  formatStudyTime,
  loadWeeklyLeaderboards,
  loadFeaturedCoursesCatalog,
  loadSubjectEvaluationAnalytics,
  openSubjectAnalyticsModal,
  closeSubjectAnalyticsModal,
  openAuthModal,
  closeAuthModal,
  SUBJECT_CONFIGS,
  renderTrafficAnalyticsChart,
  onChartPointHover,
  onChartPointLeave,
  TRAFFIC_DATASETS,
  handleRemindDeadline,
  submitAssignmentReminder,
  openTeacherAuthRequiredModal,
  closeTeacherAuthRequiredModal,
  closeAssignmentReminderModal,
  viewAllDeadlines
};

function initDashboardInteractions() {
  const courseSearchInput = document.getElementById('course-filter-search');
  if (courseSearchInput) {
    courseSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#courses-table tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  // Chuyển đổi tab thời gian biểu đồ (Ngày / Tuần này / Tháng)
  const periodTabs = document.querySelectorAll('.period-tab');
  periodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      periodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const period = tab.getAttribute('data-period') || 'weekly';
      renderTrafficAnalyticsChart(period);
    });
  });

  // Global search input
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearchInput.value.trim();
        if (query) {
          openAuthModal();
        }
      }
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadWeeklyLeaderboards();
      loadFeaturedCoursesCatalog();
      loadSubjectEvaluationAnalytics();
      renderTrafficAnalyticsChart('weekly');
      initDashboardInteractions();
    });
  } else {
    loadWeeklyLeaderboards();
    loadFeaturedCoursesCatalog();
    loadSubjectEvaluationAnalytics();
    renderTrafficAnalyticsChart('weekly');
    initDashboardInteractions();
  }
}

