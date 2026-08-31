// ============================================================================
// EDUCORE LMS — GRADING CENTER MODULE (grading-center.js)
// Pending Grading Queue, Audio/Essay Feedback & Resubmission Workflow
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';

export let pendingSubmissionsList = [];

// Demo Pending Submissions awaiting manual teacher grading
export const DEFAULT_PENDING_SUBMISSIONS = [
  {
    id: 'sub_101',
    studentId: 'st_01',
    studentName: 'Nguyễn Văn An',
    studentCode: 'HS1001',
    assignmentTitle: '🎬 Video Roleplay: Hotel Check-in & Inquiry',
    submissionType: 'audio_recording',
    submittedAt: '2026-08-15T14:30',
    audioUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    accuracyScore: 82,
    score: null,
    status: 'submitted',
    feedback: ''
  },
  {
    id: 'sub_102',
    studentId: 'st_02',
    studentName: 'Trần Thị Bích',
    studentCode: 'HS1002',
    assignmentTitle: '✍️ Tự luận Tiếng Anh: Write an Essay about Environment',
    submissionType: 'essay',
    submittedAt: '2026-08-16T09:15',
    essayText: 'Global warming is one of the most serious problems facing our planet today. We should plant more trees, reduce plastic waste, and use renewable energy sources to protect mother nature.',
    score: null,
    status: 'submitted',
    feedback: ''
  }
];

/**
 * Load Pending Submissions Queue
 */
export async function loadPendingSubmissions() {
  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('submissions').select('*').eq('status', 'submitted');
      if (!error && data && data.length > 0) {
        pendingSubmissionsList = data;
        return pendingSubmissionsList;
      }
    }
  } catch(e) {}

  const saved = localStorage.getItem('educore_pending_submissions');
  if (saved) {
    try { pendingSubmissionsList = JSON.parse(saved); } catch(e) { pendingSubmissionsList = DEFAULT_PENDING_SUBMISSIONS; }
  } else {
    pendingSubmissionsList = DEFAULT_PENDING_SUBMISSIONS;
    savePendingToLocal();
  }
  return pendingSubmissionsList;
}

function savePendingToLocal() {
  try {
    localStorage.setItem('educore_pending_submissions', JSON.stringify(pendingSubmissionsList));
  } catch(e){}
}

/**
 * Render Grading Queue Table
 */
export function renderGradingQueueTable() {
  const container = document.getElementById('grading-queue-tbody');
  const countBadge = document.getElementById('pending-grading-count');
  if (countBadge) {
    const pendingCount = pendingSubmissionsList.filter(s => s.status === 'submitted').length;
    countBadge.innerText = pendingCount;
    countBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  if (!container) return;

  if (!pendingSubmissionsList || pendingSubmissionsList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:30px;color:#15803d;background:#f0fdf4">
          🎉 <b>Hoàn tất!</b> Không có bài nộp nào đang chờ chấm chữa.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = pendingSubmissionsList.map(sub => `
    <tr>
      <td>
        <strong style="color:#0f172a">${esc(sub.studentName)}</strong>
        <div style="font-size:12px;color:#64748b">Mã HS: ${esc(sub.studentCode)}</div>
      </td>
      <td>
        <div style="font-weight:600">${esc(sub.assignmentTitle)}</div>
        <div style="font-size:12px;color:#64748b">${sub.submissionType === 'audio_recording' ? '🎙️ Ghi âm phát âm' : '✍️ Bài viết tự luận'}</div>
      </td>
      <td>${formatDateTime(sub.submittedAt)}</td>
      <td>
        ${sub.status === 'graded' 
          ? `<strong style="color:#16a34a;font-size:15px">${sub.score} / 10.0</strong>` 
          : renderLMSBadge('warning', 'Chờ chấm bài')}
      </td>
      <td>
        <button class="btn btn-sm btn-p" onclick="window.openGradeModal('${sub.id}')">✍️ Chấm Bài & Nhận Xét</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Open Grade Submission Modal Dialog
 */
export function openGradeModal(submissionId) {
  const sub = pendingSubmissionsList.find(s => s.id === submissionId);
  if (!sub) return;

  let modal = document.getElementById('grade-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'grade-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const contentHTML = sub.submissionType === 'audio_recording'
    ? `<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px">
        <label style="font-weight:600;display:block;margin-bottom:4px">🎙️ Bài Ghi Âm Của Học Sinh:</label>
        <audio controls src="${sub.audioUrl}" style="width:100%"></audio>
        <div style="margin-top:6px;font-size:13px;color:#2563eb">Độ chuẩn xác máy tính (AI): <strong>${sub.accuracyScore}%</strong></div>
       </div>`
    : `<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px">
        <label style="font-weight:600;display:block;margin-bottom:4px">✍️ Nội Dung Bài Viết Tự Luận:</label>
        <div style="font-style:italic;background:#fff;padding:10px;border:1px solid #e2e8f0;border-radius:6px;max-height:160px;overflow-y:auto">"${esc(sub.essayText)}"</div>
       </div>`;

  modal.innerHTML = `
    <div class="modal-card" style="max-width:550px">
      <div class="modal-header">
        <h3>✍️ Chấm Bài: ${esc(sub.studentName)} (${esc(sub.studentCode)})</h3>
        <button onclick="document.getElementById('grade-modal').style.display='none'" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div style="font-size:13px;color:#64748b;margin-bottom:12px">Bài nộp: <strong>${esc(sub.assignmentTitle)}</strong></div>
        ${contentHTML}
        
        <div style="margin-bottom:12px">
          <label style="font-weight:600;display:block;margin-bottom:4px">Điểm số (Thang điểm 10.0):</label>
          <input type="number" step="0.5" min="0" max="10" id="grade-score-input" value="${sub.score !== null ? sub.score : '8.5'}" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:16px;font-weight:700" />
        </div>

        <div style="margin-bottom:16px">
          <label style="font-weight:600;display:block;margin-bottom:4px">Lời Nhận Xét & Phản Hồi:</label>
          <textarea id="grade-feedback-input" rows="3" placeholder="Nhập lời khuyên, mẹo sửa lỗi cho học sinh..." style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px">${esc(sub.feedback || 'Bài làm tốt! Cần chú ý nhấn đúng trọng âm và phát âm chuẩn các âm đuôi /s/ và /t/.')}</textarea>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify:space-between;gap:8px">
        <button class="btn btn-ghost" style="color:#dc2626" onclick="window.saveGradeResult('${sub.id}', 'resubmit_required')">🔄 Yêu Cầu Làm Lại</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="document.getElementById('grade-modal').style.display='none'">Hủy</button>
          <button class="btn btn-p" onclick="window.saveGradeResult('${sub.id}', 'graded')">💾 Chấm Bài & Lưu</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

/**
 * Save Grade Result
 */
export async function saveGradeResult(submissionId, newStatus = 'graded') {
  const scoreInput = document.getElementById('grade-score-input');
  const feedbackInput = document.getElementById('grade-feedback-input');

  const score = scoreInput ? parseFloat(scoreInput.value) : 8.5;
  const feedback = feedbackInput ? feedbackInput.value.trim() : '';

  const subIdx = pendingSubmissionsList.findIndex(s => s.id === submissionId);
  if (subIdx >= 0) {
    pendingSubmissionsList[subIdx].score = score;
    pendingSubmissionsList[subIdx].feedback = feedback;
    pendingSubmissionsList[subIdx].status = newStatus;

    savePendingToLocal();
    renderGradingQueueTable();

    const modal = document.getElementById('grade-modal');
    if (modal) modal.style.display = 'none';

    // Sync to Supabase submissions
    try {
      const client = window.supabaseClient;
      if (client && submissionId && submissionId.includes('-')) {
        await client.from('submissions').update({
          score: score,
          feedback: feedback,
          status: newStatus,
          graded_at: new Date().toISOString()
        }).eq('id', submissionId);
      }
    } catch(e){}

    if (newStatus === 'resubmit_required') {
      showToast('warning', 'Yêu Cầu Làm Lại', `Đã gửi yêu cầu nộp lại bài cho học sinh ${pendingSubmissionsList[subIdx].studentName}!`);
    } else {
      showToast('success', 'Chấm Bài Thành Công', `Đã lưu điểm ${score}/10.0 cho học sinh ${pendingSubmissionsList[subIdx].studentName}!`);
    }
  }
}

function formatDateTime(dtStr) {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch(e) { return dtStr; }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

if (typeof window !== 'undefined') {
  window.openGradeModal = openGradeModal;
  window.saveGradeResult = saveGradeResult;
}

