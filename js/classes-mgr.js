// ============================================================================
// EDUCORE LMS — SCHOOL & CLASS MANAGEMENT MODULE (classes-mgr.js)
// Class Lifecycle, Academic Years, Invite Codes & Student Enrollment
// ============================================================================

import { showToast, renderLMSBadge, renderSkeletonTableRows } from './ui-components.js';

export let classesList = [];
export let activeClassId = null;

// Default demo classes if database is empty
export const DEFAULT_CLASSES = [
  { id: 'cls_10a1', name: 'Lớp 10A1 - Anh Văn Chuyên', school: 'Trường THPT Chuyên EduCore', grade: 10, academicYear: '2025-2026', inviteCode: 'ENG10A', studentCount: 35, status: 'active' },
  { id: 'cls_11b2', name: 'Lớp 11B2 - Luyện Thi IELTS & B2', school: 'Trường THPT Chuyên EduCore', grade: 11, academicYear: '2025-2026', inviteCode: 'IELTS11', studentCount: 28, status: 'active' },
  { id: 'cls_12c3', name: 'Lớp 12C3 - Ôn Thi Tốt Nghiệp THPT', school: 'Trường THPT Chuyên EduCore', grade: 12, academicYear: '2025-2026', inviteCode: 'THPT12', studentCount: 42, status: 'active' }
];

/**
 * Load classes list from Supabase or fallback to LocalStorage/Default
 */
export async function loadClasses() {
  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('classes').select('*');
      if (!error && data && data.length > 0) {
        classesList = data;
        return classesList;
      }
    }
  } catch (err) {
    console.warn('[Classes] Supabase fetch warning, using local state:', err);
  }

  // Fallback to localStorage or defaults
  const saved = localStorage.getItem('educore_classes_data');
  if (saved) {
    try { classesList = JSON.parse(saved); } catch(e) { classesList = DEFAULT_CLASSES; }
  } else {
    classesList = DEFAULT_CLASSES;
    saveClassesToLocal();
  }
  return classesList;
}

function saveClassesToLocal() {
  try {
    localStorage.setItem('educore_classes_data', JSON.stringify(classesList));
  } catch(e){}
}

/**
 * Render Class Management Table
 */
export function renderClassesList() {
  const container = document.getElementById('classes-table-tbody');
  if (!container) return;

  if (!classesList || classesList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:30px;color:#64748b">
          📂 Chưa có lớp học nào trong hệ thống. Bấm <b>"+ Tạo Lớp Mới"</b> để bắt đầu.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = classesList.map(cls => `
    <tr>
      <td>
        <strong style="color:#0f172a">${esc(cls.name)}</strong>
        <div style="font-size:12px;color:#64748b">${esc(cls.school || 'Trường THPT EduCore')}</div>
      </td>
      <td><span class="badge-lms badge-lms-info">Khối ${cls.grade || 10}</span></td>
      <td>${esc(cls.academicYear || '2025-2026')}</td>
      <td>
        <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-weight:700;color:#2563eb">${esc(cls.inviteCode || 'CODE')}</code>
        <button class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText('${cls.inviteCode}');window.showToast('info','Mã Lớp','Đã sao chép mã mời ${cls.inviteCode}!')" title="Sao chép mã mời">📋</button>
      </td>
      <td><strong>${cls.studentCount || 0}</strong> học sinh</td>
      <td>${cls.status === 'archived' ? renderLMSBadge('neutral', 'Lưu trữ') : renderLMSBadge('success', 'Hoạt động')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-ghost" onclick="window.editClassModal('${cls.id}')" title="Chỉnh sửa lớp">✏️ Sửa</button>
          <button class="btn btn-sm btn-ghost" style="color:#dc2626" onclick="window.deleteClassItem('${cls.id}')" title="Xóa lớp">🗑️ Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Add or Save Class Item
 */
export async function saveClassItem(classData) {
  if (!classData.name) {
    showToast('error', 'Thiếu Thông Tin', 'Vui lòng nhập tên lớp học!');
    return false;
  }

  const existingIdx = classesList.findIndex(c => c.id === classData.id);
  if (existingIdx >= 0) {
    classesList[existingIdx] = { ...classesList[existingIdx], ...classData };
    showToast('success', 'Cập Nhật Lớp', `Đã cập nhật thông tin lớp ${classData.name}`);
  } else {
    const newClass = {
      id: 'cls_' + Date.now(),
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      studentCount: 0,
      status: 'active',
      ...classData
    };
    classesList.unshift(newClass);
    showToast('success', 'Tạo Lớp Thành Công', `Đã tạo lớp ${newClass.name} với Mã mời: ${newClass.inviteCode}`);
  }

  saveClassesToLocal();
  renderClassesList();
  populateClassSelectDropdowns();

  // Try sync with Supabase if available
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('classes').upsert(classData);
    }
  } catch(e){}

  return true;
}

/**
 * Delete Class Item
 */
export function deleteClassItem(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa lớp học này? Dữ liệu nhiệm vụ liên quan sẽ bị lưu trữ.')) return;

  classesList = classesList.filter(c => c.id !== id);
  saveClassesToLocal();
  renderClassesList();
  populateClassSelectDropdowns();
  showToast('info', 'Xóa Lớp', 'Đã xóa lớp khỏi danh sách.');
}

/**
 * Populate Class Select dropdowns across LMS forms
 */
export function populateClassSelectDropdowns() {
  const selects = document.querySelectorAll('.class-select-dropdown');
  selects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Chọn Lớp Học --</option>' + 
      classesList.map(c => `<option value="${c.id}">${esc(c.name)} (${c.inviteCode})</option>`).join('');
    if (currentVal) select.value = currentVal;
  });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.editClassModal = function(id) {
  const cls = classesList.find(c => c.id === id);
  if (!cls) return;
  const name = prompt('Sửa tên lớp học:', cls.name);
  if (name && name.trim()) {
    saveClassItem({ ...cls, name: name.trim() });
  }
};

window.deleteClassItem = deleteClassItem;
window.showToast = showToast;
