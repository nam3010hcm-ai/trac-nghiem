// ============================================================================
// EDUCORE LMS — ASSIGNMENT ENGINE MODULE (assignments-mgr.js)
// Complete CRUD: Task Configuration, Due Dates, Target Class, Timer & Preview Mode
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
 * Render Assignments Management List
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
        <td><span class="badge-lms badge-lms-info">${esc(asg.className || 'Lớp 10A1')}</span></td>
        <td>
          <div style="font-size:13px">⏱️ ${asg.durationMinutes ? asg.durationMinutes + ' phút' : 'Không giới hạn'}</div>
          <div style="font-size:12px;color:#64748b">Tối đa: ${asg.maxAttempts ? asg.maxAttempts + ' lần' : 'Vô hạn'}</div>
        </td>
        <td>
          <div style="font-size:12px">📅 Từ: ${formatDateTime(asg.startAt)}</div>
          <div style="font-size:12px;color:#dc2626">⏰ Hạn: ${formatDateTime(asg.dueAt)}</div>
        </td>
        <td>
          <strong>${asg.submittedCount || 0} / ${asg.totalStudents || 35}</strong>
          <div style="font-size:11px;color:#64748b">Đã nộp bài</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost" onclick="window.previewAssignment('${asg.id}')" title="Xem trước làm thử">👁️ Làm thử</button>
            <button class="btn btn-sm btn-ghost" onclick="window.openAssignmentModal('${asg.id}')" title="Sửa nhiệm vụ">✏️ Sửa</button>
            <button class="btn btn-sm btn-ghost" style="color:#dc2626" onclick="window.deleteAssignmentItem('${asg.id}')" title="Xóa nhiệm vụ">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Open Modal Dialog for Create/Edit Assignment
 */
export function openAssignmentModal(assignmentId = null) {
  const asg = assignmentsList.find(a => a.id === assignmentId) || {
    id: '',
    title: '',
    classId: classesList[0]?.id || 'cls_10a1',
    className: classesList[0]?.name || 'Lớp 10A1 - Anh Văn Chuyên',
    contentType: 'exam',
    contentId: 'ex_giau_ky_1',
    startAt: new Date().toISOString().slice(0, 16),
    dueAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    durationMinutes: 45,
    maxAttempts: 1,
    isShuffleQuestions: true,
    isShuffleOptions: true,
    showAnswersMode: 'after_due'
  };

  let modal = document.getElementById('assignment-crud-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assignment-crud-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const classOptionsHTML = (classesList && classesList.length > 0)
    ? classesList.map(c => `<option value="${c.id}" ${c.id === asg.classId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')
    : `<option value="cls_10a1">Lớp 10A1 - Anh Văn Chuyên</option>`;

  modal.innerHTML = `
    <div class="modal-card" style="max-width:580px;padding:24px;background:#ffffff;border-radius:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
        <h3 style="margin:0;color:#0f172a;font-size:18px">${asg.id ? '✏️ Chỉnh Sửa Cấu Hình Nhiệm Vụ' : '📋 Giao Nhiệm Vụ Học Tập Mới'}</h3>
        <button onclick="document.getElementById('assignment-crud-modal').style.display='none'" class="btn-close" style="background:none;border:none;font-size:20px;cursor:pointer">&times;</button>
      </div>

      <input type="hidden" id="asg-input-id" value="${asg.id || ''}">

      <div class="fg" style="margin-bottom:12px">
        <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Tiêu Đề Nhiệm Vụ *</label>
        <input type="text" id="asg-input-title" placeholder="VD: Kiểm tra Giữa Kỳ 1 — Anh Văn 10" value="${esc(asg.title)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Loại Nhiệm Vụ *</label>
          <select id="asg-input-type" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="exam" ${asg.contentType === 'exam' ? 'selected' : ''}>📝 Đề Thi Trắc Nghiệm</option>
            <option value="video_roleplay" ${asg.contentType === 'video_roleplay' ? 'selected' : ''}>🎬 Video Roleplay A & B</option>
            <option value="unit" ${asg.contentType === 'unit' ? 'selected' : ''}>📖 Bài Học Unit 5 Kỹ Năng</option>
            <option value="essay" ${asg.contentType === 'essay' ? 'selected' : ''}>✍️ Bài Tập Tự Luận</option>
          </select>
        </div>

        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Lớp Học Nhận Bài *</label>
          <select id="asg-input-class" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            ${classOptionsHTML}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Ngày Mở Bài</label>
          <input type="datetime-local" id="asg-input-start" value="${asg.startAt ? asg.startAt.slice(0,16) : ''}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
        </div>

        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Hạn Nộp Bài</label>
          <input type="datetime-local" id="asg-input-due" value="${asg.dueAt ? asg.dueAt.slice(0,16) : ''}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Thời Gian Làm (Phút)</label>
          <input type="number" min="0" id="asg-input-duration" value="${asg.durationMinutes !== undefined ? asg.durationMinutes : 45}" placeholder="0 = Không giới hạn" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
        </div>

        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Số Lần Làm Tối Đa</label>
          <input type="number" min="0" id="asg-input-attempts" value="${asg.maxAttempts !== undefined ? asg.maxAttempts : 1}" placeholder="0 = Vô hạn" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
        </div>
      </div>

      <div style="background:#f8fafc;padding:12px 16px;border-radius:10px;margin-bottom:20px;border:1px solid #e2e8f0">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#0f172a">⚙️ Nâng Cao & Bảo Mật Thi:</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="asg-chk-shuffle-q" ${asg.isShuffleQuestions ? 'checked' : ''}> Đảo Thứ Tự Câu Hỏi
          </label>
          <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="asg-chk-shuffle-opt" ${asg.isShuffleOptions ? 'checked' : ''}> Đảo Phương Án Trả Lời
          </label>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-secondary" onclick="document.getElementById('assignment-crud-modal').style.display='none'">Hủy</button>
        <button class="btn btn-p" onclick="window.saveAssignmentFromModal()">🚀 Giao Bài Ngay</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

/**
 * Save Assignment from Modal Inputs
 */
export async function saveAssignmentFromModal() {
  const id = document.getElementById('asg-input-id')?.value;
  const title = document.getElementById('asg-input-title')?.value?.trim();
  const contentType = document.getElementById('asg-input-type')?.value || 'exam';
  const classSelect = document.getElementById('asg-input-class');
  const classId = classSelect?.value || 'cls_10a1';
  const className = classSelect?.options[classSelect.selectedIndex]?.text || 'Lớp 10A1';

  const startAt = document.getElementById('asg-input-start')?.value || new Date().toISOString().slice(0,16);
  const dueAt = document.getElementById('asg-input-due')?.value || '';
  const durationMinutes = parseInt(document.getElementById('asg-input-duration')?.value) || 0;
  const maxAttempts = parseInt(document.getElementById('asg-input-attempts')?.value) || 1;
  const isShuffleQuestions = !!document.getElementById('asg-chk-shuffle-q')?.checked;
  const isShuffleOptions = !!document.getElementById('asg-chk-shuffle-opt')?.checked;

  if (!title) {
    showToast('error', 'Thiếu Thông Tin', 'Vui lòng nhập tiêu đề nhiệm vụ!');
    return;
  }

  const asgData = {
    id: id || ('asg_' + Date.now()),
    title,
    classId,
    className,
    contentType,
    contentId: 'ex_giau_ky_1',
    startAt,
    dueAt,
    durationMinutes,
    maxAttempts,
    isShuffleQuestions,
    isShuffleOptions,
    showAnswersMode: 'after_due',
    status: 'active',
    submittedCount: id ? (assignmentsList.find(a => a.id === id)?.submittedCount || 0) : 0,
    totalStudents: 35
  };

  const existingIdx = assignmentsList.findIndex(a => a.id === asgData.id);
  if (existingIdx >= 0) {
    assignmentsList[existingIdx] = asgData;
    showToast('success', 'Cập Nhật Nhiệm Vụ', `Đã cập nhật cấu hình cho nhiệm vụ "${asgData.title}"`);
  } else {
    assignmentsList.unshift(asgData);
    showToast('success', 'Giao Bài Thành Công', `Đã giao nhiệm vụ "${asgData.title}" tới ${className}!`);
  }

  saveAssignmentsToLocal();
  renderAssignmentsList();

  const modal = document.getElementById('assignment-crud-modal');
  if (modal) modal.style.display = 'none';

  // Sync to Supabase
  try {
    const client = window.supabaseClient;
    if (client) await client.from('assignments').upsert(asgData);
  } catch(e){}
}

/**
 * Delete Assignment Item
 */
export function deleteAssignmentItem(id) {
  const asg = assignmentsList.find(a => a.id === id);
  if (!asg) return;

  if (!confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ "${asg.title}"?`)) return;

  assignmentsList = assignmentsList.filter(a => a.id !== id);
  saveAssignmentsToLocal();
  renderAssignmentsList();
  showToast('info', 'Đã Xóa Nhiệm Vụ', 'Đã xóa nhiệm vụ học tập khỏi danh sách.');
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

window.openAssignmentModal = openAssignmentModal;
window.saveAssignmentFromModal = saveAssignmentFromModal;
window.deleteAssignmentItem = deleteAssignmentItem;
window.previewAssignment = previewAssignment;
