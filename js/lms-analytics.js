// ============================================================================
// EDUCORE LMS — LEARNING ANALYTICS MODULE (lms-analytics.js)
// School-wide Active Rates, Score Distribution & Question Item Analysis
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';

export let analyticsSummaryData = {
  activeRateSchool: 88.5,
  totalExamsTaken: 1420,
  averageScoreSchool: 7.8,
  pendingGradingCount: 2,
  gradeDistribution: {
    excellent: 35, // 8.5 - 10
    good: 42,      // 7.0 - 8.4
    average: 18,   // 5.0 - 6.9
    poor: 5        // < 5.0
  },
  hardestQuestions: [
    { id: 'q_102', topic: 'Grammar - Inversion & Conditional Type 3', questionText: 'Had I known about the schedule change, I _____ you earlier.', errorRate: 68 },
    { id: 'q_204', topic: 'Vocabulary - Academic Collocations', questionText: 'The government took decisive action to _____ the crisis.', errorRate: 54 },
    { id: 'q_309', topic: 'Listening - Connected Speech & Assimilation', questionText: 'Identify the assimilation of /t/ to /p/ in fast speech.', errorRate: 49 }
  ]
};

/**
 * Load Analytics Data
 */
export async function loadAnalyticsData() {
  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('results').select('*');
      if (!error && data && data.length > 0) {
        calculateAnalyticsFromResults(data);
      }
    }
  } catch(e) {}
  return analyticsSummaryData;
}

function calculateAnalyticsFromResults(results) {
  let totalScore = 0;
  let dist = { excellent: 0, good: 0, average: 0, poor: 0 };
  results.forEach(r => {
    const s = r.score || 0;
    totalScore += s;
    if (s >= 8.5) dist.excellent++;
    else if (s >= 7.0) dist.good++;
    else if (s >= 5.0) dist.average++;
    else dist.poor++;
  });

  const count = results.length;
  analyticsSummaryData.totalExamsTaken = count;
  analyticsSummaryData.averageScoreSchool = count ? (totalScore / count).toFixed(1) : 7.8;
  const totalDist = (dist.excellent + dist.good + dist.average + dist.poor) || 1;
  analyticsSummaryData.gradeDistribution = {
    excellent: Math.round((dist.excellent / totalDist) * 100),
    good: Math.round((dist.good / totalDist) * 100),
    average: Math.round((dist.average / totalDist) * 100),
    poor: Math.round((dist.poor / totalDist) * 100)
  };
}

/**
 * Render Analytics Dashboard View
 */
export function renderAnalyticsDashboard() {
  const container = document.getElementById('analytics-view-container');
  if (!container) return;

  const dist = analyticsSummaryData.gradeDistribution;

  container.innerHTML = `
    <!-- TOP METRICS GRID -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px">
      <div class="kpi-card" style="border-left:4px solid #2563eb">
        <div class="kpi-title">📊 Tỷ Lệ Hoạt Động Cả Trường</div>
        <div class="kpi-value">${analyticsSummaryData.activeRateSchool}%</div>
        <div class="kpi-trend up">↑ 4.2% so với tuần trước</div>
      </div>
      <div class="kpi-card" style="border-left:4px solid #10b981">
        <div class="kpi-title">⭐ Điểm Trung Bình Hệ Thống</div>
        <div class="kpi-value">${analyticsSummaryData.averageScoreSchool} <span style="font-size:14px;color:#64748b">/ 10</span></div>
        <div class="kpi-trend up">Xếp loại: Khá - Giỏi</div>
      </div>
      <div class="kpi-card" style="border-left:4px solid #8b5cf6">
        <div class="kpi-title">📝 Tổng Lượt Làm Bài Thi</div>
        <div class="kpi-value">${analyticsSummaryData.totalExamsTaken}</div>
        <div class="kpi-trend">Đã hoàn thành</div>
      </div>
    </div>

    <!-- GRADE DISTRIBUTION BAR CHART & ITEM ANALYSIS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- PHỔ ĐIỂM HỌC SINH -->
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:14px">📈 Phổ Điểm & Biểu Đồ Phân Loại Năng Lực</h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>🌟 Giỏi (8.5 - 10.0)</span>
              <strong>${dist.excellent}%</strong>
            </div>
            <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden">
              <div style="background:#10b981;width:${dist.excellent}%;height:100%"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>👍 Khá (7.0 - 8.4)</span>
              <strong>${dist.good}%</strong>
            </div>
            <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden">
              <div style="background:#3b82f6;width:${dist.good}%;height:100%"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>👌 Trung Bình (5.0 - 6.9)</span>
              <strong>${dist.average}%</strong>
            </div>
            <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden">
              <div style="background:#f59e0b;width:${dist.average}%;height:100%"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>⚠️ Yếu / Cần Phụ Đạo (< 5.0)</span>
              <strong>${dist.poor}%</strong>
            </div>
            <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden">
              <div style="background:#ef4444;width:${dist.poor}%;height:100%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- MA TRẬN CÂU HỎI SAI NHIỀU NHẤT (ITEM ANALYSIS) -->
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:14px">🧠 Top Câu Hỏi Có Tỷ Lệ Sai Cao Nhất (Item Analysis)</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${analyticsSummaryData.hardestQuestions.map(q => `
            <div style="padding:10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span class="badge-lms badge-lms-danger">Tỷ lệ sai: ${q.errorRate}%</span>
                <span style="font-size:11px;color:#9f1239;font-weight:600">${esc(q.topic)}</span>
              </div>
              <div style="font-size:13px;font-weight:600;color:#0f172a">"${esc(q.questionText)}"</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
