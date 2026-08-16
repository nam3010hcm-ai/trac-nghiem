// ============================================================================
// EDUCORE LMS — ASSIGNMENT ENGINE MODULE (assignments-mgr.js)
// Task Configuration, Due Dates, Target Class/Group, Shuffle & Preview Mode
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';
import { classesList } from './classes-mgr.js';

export let assignmentsList = [];

// Default demo assignments
export const DEFAULT_ASSIGNMENTS = [
  {
    id: 'asg_1',
    title: '📝 Kiểm tra Giữa Kỳ 1 — Anh Văn 10 (Ma trận 40 câu)',
    classId: 'cls_10a1',
    className: 'Lớp 10A1 - Anh Văn Chuyên',
    contentType: 'exam',
    contentId: 'ex_giau_ky_1',
    startAt: '2026-08-10T08:00',
    dueAt: '2026-08-25T23:59',
    durationMinutes: 45,
    maxAttempts: 1,
    isShuffleQuestions: true,
    isShuffleOptions: true,
    showAnswersMode: 'after_due',
    status: 'active',
    submittedCount: 24,
    totalStudents: 35
  },
  {
    id: 'asg_2',
    title: '🎬 Video Roleplay: Hotel Check-in & Inquiry (A & B)',
    classId: 'cls_11b2',
    className: 'Lớp 11B2 - Luyện Thi IELTS & B2',
    contentType: 'video_roleplay',
    contentId: 'spk_video_1',
    startAt: '2026-08-12T00:00',
    dueAt: '2026-08-30T23:59',
    durationMinutes: 0,
    maxAttempts: 0,
    isShuffleQuestions: false,
    isShuffleOptions: false,
    showAnswersMode: 'immediate',
    status: 'active',
    submittedCount: 18,
    totalStudents: 28
  }
];

/**
 * Load assignments list
 */
export async function loadAssignments() {
  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('assignments').select('*');
      if (!error && data && data.length > 0) {
        assignmentsList = data;
        return assignmentsList;
      }
    }
  } catch (err) {
    console.warn('[Assignments] Supabase fetch warning:', err);
  }

  const saved = localStorage.getItem('educore_assignments_data');
  if (saved) {
    try { assignmentsList = JSON.parse(saved); } catch(e) { assignmentsList = DEFAULT_ASSIGNMENTS; }
  } else {
    assignmentsList = DEFAULT_ASSIGNMENTS;
    saveAssignmentsToLocal();
  }
  return assignmentsList;
}

function saveAssignmentsToLocal() {
  try {
    localStorage.setItem('educore_assignments_data', JSON.stringify(assignmentsList));
  } catch(e){}
}

/**
 * Render Assignments Management List in Admin
 */
export function renderAssignmentsList() {
  const container = document.getElementById('assignments-table-tbody');
  if (!container) return;

  if (!assignmentsList || assignmentsList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:30px;color:#64748b">
          📋 Chưa có nhiệm vụ học tập nào được giao. Bấm <b>"+ Giao Nhiệm Vụ Mới"</b> để tạo.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = assignmentsList.map(asg => {
    const isExpired = asg.dueAt && new Date(asg.dueAt) < new Date();
    const statusBadge = isExpired 
      ? renderLMSBadge('danger', 'Đã hết hạn')
      : renderLMSBadge('success', 'Đang mở');

    const typeIcons = {
      exam: '📝 Đề Thi',
      unit: '📖 Bài Học Unit',
      practice: '💡 Luyện Tập',
      video_roleplay: '🎬 Video Roleplay',
      essay: '✍️ Tự Luận'
    };

    return `
      <tr>
        <td>
          <strong style="color:#0f172a">${esc(asg.title)}</strong>
          <div style="font-size:12px;color:#64748b">${typeIcons[asg.contentType] || '📋 Nhiệm vụ'}</div>
        </td>
        <td><span class="badge-lms badge-lms-info">${esc(asg.className || 'Tất cả lớp')}</span></td>
        <td>
          <div style="font-size:13px">⏱️ ${asg.durationMinutes ? asg.durationMinutes + ' phút' : 'Không giới hạn'}</div>
          <div style="font-size:12px;color:#64748b">Tối đa: ${asg.maxAttempts ? asg.maxAttempts + ' lần' : 'Vô hạn'}</div>
        </td>
        <td>
          <div style="font-size:12px">📅 Từ: ${formatDateTime(asg.startAt)}</div>
          <div style="font-size:12px;color:#dc2626">⏰ Hạn: ${formatDateTime(asg.dueAt)}</div>
        </td>
        <td>
          <strong>${asg.submittedCount || 0} / ${asg.totalStudents || 30}</strong>
          <div style="font-size:11px;color:#64748b">Đã nộp bài</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost" onclick="window.previewAssignment('${asg.id}')" title="Xem trước giao diện học sinh">👁️ Làm thử</button>
            <button class="btn btn-sm btn-ghost" style="color:#dc2626" onclick="window.deleteAssignmentItem('${asg.id}')" title="Xóa nhiệm vụ">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Save Assignment
 */
export async function saveAssignmentItem(data) {
  if (!data.title) {
    showToast('error', 'Lỗi Giao Bài', 'Vui lòng nhập tiêu đề nhiệm vụ!');
    return false;
  }

  const newAsg = {
    id: data.id || ('asg_' + Date.now()),
    title: data.title,
    classId: data.classId || '',
    className: data.className || 'Lớp 10A1',
    contentType: data.contentType || 'exam',
    startAt: data.startAt || new Date().toISOString().slice(0,16),
    dueAt: data.dueAt || '',
    durationMinutes: parseInt(data.durationMinutes) || 0,
    maxAttempts: parseInt(data.maxAttempts) || 1,
    isShuffleQuestions: !!data.isShuffleQuestions,
    isShuffleOptions: !!data.isShuffleOptions,
    showAnswersMode: data.showAnswersMode || 'immediate',
    status: 'active',
    submittedCount: 0,
    totalStudents: 35
  };

  const existingIdx = assignmentsList.findIndex(a => a.id === newAsg.id);
  if (existingIdx >= 0) {
    assignmentsList[existingIdx] = newAsg;
    showToast('success', 'Cập Nhật Nhiệm Vụ', `Đã cập nhật cấu hình cho ${newAsg.title}`);
  } else {
    assignmentsList.unshift(newAsg);
    showToast('success', 'Giao Bài Thành Công', `Đã giao nhiệm vụ "${newAsg.title}" tới học sinh!`);
  }

  saveAssignmentsToLocal();
  renderAssignmentsList();
  return true;
}

/**
 * Delete Assignment
 */
export function deleteAssignmentItem(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa nhiệm vụ học tập này?')) return;

  assignmentsList = assignmentsList.filter(a => a.id !== id);
  saveAssignmentsToLocal();
  renderAssignmentsList();
  showToast('info', 'Xóa Nhiệm Vụ', 'Đã xóa nhiệm vụ học tập.');
}

/**
 * Preview Assignment as Student
 */
export function previewAssignment(id) {
  const asg = assignmentsList.find(a => a.id === id);
  if (!asg) return;

  showToast('info', 'Chế Độ Làm Thử', `Đang xem trước nhiệm vụ: "${asg.title}" dưới vai trò học sinh...`);
  if (asg.contentType === 'video_roleplay') {
    window.location.href = 'learn.html?unit=' + (asg.contentId || 'u1');
  } else {
    window.location.href = 'student.html';
  }
}

function formatDateTime(dtStr) {
  if (!dtStr) return 'Không có';
  try {
    const d = new Date(dtStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch(e) { return dtStr; }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.previewAssignment = previewAssignment;
window.deleteAssignmentItem = deleteAssignmentItem;
