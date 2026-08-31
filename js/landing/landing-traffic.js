/**
 * MODULE LANDING TRAFFIC & LMS ANALYTICS CHART (js/landing/landing-traffic.js)
 * Vẽ và đồng bộ biểu đồ xu hướng học tập & lưu lượng truy cập LMS
 */
export const TRAFFIC_DATASETS = {
  daily: {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
    values: [120, 60, 420, 580, 640, 920, 450],
    peakIndex: 5,
    unit: 'Học viên'
  },
  weekly: {
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'],
    values: [350, 440, 590, 520, 850, 660, 740],
    peakIndex: 4,
    unit: 'Học viên'
  },
  monthly: {
    labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
    values: [1850, 2460, 3280, 2920],
    peakIndex: 2,
    unit: 'Lượt học viên'
  }
};

let currentActivePeriod = 'weekly';
let currentHoveredPointIdx = null;

export function getSmoothSvgPath(points, isArea = false, bottomY = 145) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  if (isArea) {
    const last = points[points.length - 1];
    const first = points[0];
    d += ` L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`;
  }

  return d;
}

export function renderTrafficAnalyticsChart(period = 'weekly', hoverIdx = null) {
  currentActivePeriod = period;
  const container = document.getElementById('lms-traffic-chart-container');
  if (!container) return;

  const dataset = TRAFFIC_DATASETS[period] || TRAFFIC_DATASETS.weekly;
  const labels = dataset.labels;
  const values = dataset.values;
  const activeIdx = (hoverIdx !== null) ? hoverIdx : (currentHoveredPointIdx !== null ? currentHoveredPointIdx : dataset.peakIndex);

  const n = values.length;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = (maxVal - minVal) || 1;

  const leftPad = 30;
  const rightPad = 670;
  const topPad = 32;
  const bottomPad = 125;
  const availableWidth = rightPad - leftPad;
  const availableHeight = bottomPad - topPad;

  // Tính tọa độ pixel (x, y) cho từng điểm
  const points = values.map((val, i) => {
    const x = leftPad + (i * (availableWidth / (n - 1)));
    const norm = (val - minVal) / valRange;
    const y = bottomPad - (norm * availableHeight);
    return { x, y, val, label: labels[i], idx: i };
  });

  const areaPathD = getSmoothSvgPath(points, true, 145);
  const linePathD = getSmoothSvgPath(points, false);

  const activePoint = points[activeIdx] || points[dataset.peakIndex];
  const tooltipText = `${activePoint.val.toLocaleString('vi-VN')} ${dataset.unit}`;
  const tooltipWidth = Math.max(92, tooltipText.length * 8.2);
  let tooltipX = activePoint.x - (tooltipWidth / 2);
  if (tooltipX < 10) tooltipX = 10;
  if (tooltipX + tooltipWidth > 690) tooltipX = 690 - tooltipWidth;
  const tooltipY = Math.max(4, activePoint.y - 32);

  container.innerHTML = `
    <svg viewBox="0 0 700 160" style="width:100%;height:100%;user-select:none;">
      <defs>
        <linearGradient id="lmsChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
        </linearGradient>
        <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#6366f1" flood-opacity="0.45"/>
        </filter>
      </defs>

      <!-- Đường kẻ ngang phụ (Grid Lines) -->
      <line x1="10" y1="30" x2="690" y2="30" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="10" y1="75" x2="690" y2="75" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="10" y1="120" x2="690" y2="120" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="4"/>

      <!-- Vùng diện tích mờ (Area Fill) -->
      <path d="${areaPathD}" fill="url(#lmsChartGrad)"/>

      <!-- Đường đồ thị lượn sóng (Line Path) -->
      <path d="${linePathD}" fill="none" stroke="#6366f1" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Các điểm dữ liệu (Data Points) -->
      ${points.map((p, i) => {
        const isSelected = (i === activeIdx);
        return `
          <g>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isSelected ? '7' : '4.5'}" fill="${isSelected ? '#6366f1' : '#ffffff'}" stroke="${isSelected ? '#ffffff' : '#6366f1'}" stroke-width="${isSelected ? '3' : '2.5'}" filter="${isSelected ? 'url(#pointGlow)' : 'none'}" style="transition:all 0.2s ease;"/>
            <!-- Vùng tương tác di chuột (Invisible Hit Target) -->
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="22" fill="transparent" style="cursor:pointer;" onmouseenter="window.onChartPointHover(${i})" onmouseleave="window.onChartPointLeave()"/>
          </g>
        `;
      }).join('')}

      <!-- Tooltip hiển thị số lượng học viên tại điểm chọn -->
      <g style="transition:transform 0.2s ease;">
        <rect x="${tooltipX.toFixed(1)}" y="${tooltipY.toFixed(1)}" width="${tooltipWidth.toFixed(1)}" height="24" rx="8" fill="#090d16" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"/>
        <text x="${(tooltipX + tooltipWidth / 2).toFixed(1)}" y="${(tooltipY + 16.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="700" font-family="system-ui, -apple-system, sans-serif">${tooltipText}</text>
      </g>

      <!-- Nhãn trục hoành X-Axis -->
      ${points.map((p, i) => {
        const isSelected = (i === activeIdx);
        return `
          <text x="${p.x.toFixed(1)}" y="158" font-size="${isSelected ? '11.5' : '11'}" font-weight="${isSelected ? '800' : '600'}" fill="${isSelected ? '#6366f1' : '#94a3b8'}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" style="cursor:pointer;transition:all 0.2s ease;" onclick="window.onChartPointHover(${i})">
            ${p.label}
          </text>
        `;
      }).join('')}
    </svg>
  `;
}

export function onChartPointHover(idx) {
  currentHoveredPointIdx = idx;
  renderTrafficAnalyticsChart(currentActivePeriod, idx);
}

export function onChartPointLeave() {
  currentHoveredPointIdx = null;
  renderTrafficAnalyticsChart(currentActivePeriod, null);
}

if (typeof window !== 'undefined') {
  window.onChartPointHover = onChartPointHover;
  window.onChartPointLeave = onChartPointLeave;
  window.renderTrafficAnalyticsChart = renderTrafficAnalyticsChart;
}
