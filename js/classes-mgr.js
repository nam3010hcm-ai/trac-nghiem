// ============================================================================
// EDUCORE LMS — SCHOOL & CLASS MANAGEMENT MODULE (classes-mgr.js)
// Complete CRUD: Class Lifecycle, Academic Years, Invite Codes & Student Enrollment
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';

export let classesList = [];

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
          <button class="btn btn-sm btn-ghost" onclick="window.openClassModal('${cls.id}')" title="Chỉnh sửa lớp">✏️ Sửa</button>
          <button class="btn btn-sm btn-ghost" style="color:#dc2626" onclick="window.deleteClassItem('${cls.id}')" title="Xóa lớp">🗑️ Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Open Modal Dialog for Create/Edit Class
 */
export function openClassModal(classId = null) {
  const cls = classesList.find(c => c.id === classId) || {
    id: '',
    name: '',
    school: 'Trường THPT Chuyên EduCore',
    grade: 10,
    academicYear: '2025-2026',
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    status: 'active'
  };

  let modal = document.getElementById('class-crud-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'class-crud-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px;padding:24px;background:#ffffff;border-radius:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
        <h3 style="margin:0;color:#0f172a;font-size:18px">${cls.id ? '✏️ Chỉnh Sửa Thông Tin Lớp Học' : '🏫 Tạo Lớp Học Mới'}</h3>
        <button onclick="document.getElementById('class-crud-modal').style.display='none'" class="btn-close" style="background:none;border:none;font-size:20px;cursor:pointer">&times;</button>
      </div>

      <input type="hidden" id="cls-input-id" value="${cls.id || ''}">

      <div class="fg" style="margin-bottom:12px">
        <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Tên Lớp Học *</label>
        <input type="text" id="cls-input-name" placeholder="VD: Lớp 10A2 - Anh Văn Nâng Cao" value="${esc(cls.name)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
      </div>

      <div class="fg" style="margin-bottom:12px">
        <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Trường / Cơ Sở Giáo Dục</label>
        <input type="text" id="cls-input-school" placeholder="Tên trường..." value="${esc(cls.school)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Khối Lớp *</label>
          <select id="cls-input-grade" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="10" ${cls.grade == 10 ? 'selected' : ''}>Khối 10</option>
            <option value="11" ${cls.grade == 11 ? 'selected' : ''}>Khối 11</option>
            <option value="12" ${cls.grade == 12 ? 'selected' : ''}>Khối 12</option>
          </select>
        </div>

        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Niên Khóa *</label>
          <select id="cls-input-year" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="2025-2026" ${cls.academicYear == '2025-2026' ? 'selected' : ''}>2025 - 2026</option>
            <option value="2026-2027" ${cls.academicYear == '2026-2027' ? 'selected' : ''}>2026 - 2027</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Mã Mời Học Sinh</label>
          <input type="text" id="cls-input-code" value="${esc(cls.inviteCode)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;text-transform:uppercase">
        </div>

        <div class="fg">
          <label style="font-weight:700;font-size:13px;display:block;margin-bottom:4px">Trạng Thái</label>
          <select id="cls-input-status" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="active" ${cls.status === 'active' ? 'selected' : ''}>🟢 Hoạt động</option>
            <option value="archived" ${cls.status === 'archived' ? 'selected' : ''}>⚪ Lưu trữ</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-secondary" onclick="document.getElementById('class-crud-modal').style.display='none'">Hủy</button>
        <button class="btn btn-p" onclick="window.saveClassFromModal()">💾 Lưu Lớp Học</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

/**
 * Save Class from Modal Inputs
 */
export async function saveClassFromModal() {
  const id = document.getElementById('cls-input-id')?.value;
  const name = document.getElementById('cls-input-name')?.value?.trim();
  const school = document.getElementById('cls-input-school')?.value?.trim() || 'Trường THPT Chuyên EduCore';
  const grade = parseInt(document.getElementById('cls-input-grade')?.value) || 10;
  const academicYear = document.getElementById('cls-input-year')?.value || '2025-2026';
  const inviteCode = (document.getElementById('cls-input-code')?.value?.trim() || Math.random().toString(36).substring(2, 8)).toUpperCase();
  const status = document.getElementById('cls-input-status')?.value || 'active';

  if (!name) {
    showToast('error', 'Lỗi Nhập Liệu', 'Vui lòng nhập tên lớp học!');
    return;
  }

  const classData = {
    id: id || ('cls_' + Date.now()),
    name,
    school,
    grade,
    academicYear,
    inviteCode,
    status,
    studentCount: id ? (classesList.find(c => c.id === id)?.studentCount || 30) : 0
  };

  const existingIdx = classesList.findIndex(c => c.id === classData.id);
  if (existingIdx >= 0) {
    classesList[existingIdx] = classData;
    showToast('success', 'Cập Nhật Thành Công', `Đã cập nhật thông tin lớp ${classData.name}`);
  } else {
    classesList.unshift(classData);
    showToast('success', 'Tạo Lớp Thành Công', `Đã tạo lớp ${classData.name} với Mã mời: ${classData.inviteCode}`);
  }

  saveClassesToLocal();
  renderClassesList();

  const modal = document.getElementById('class-crud-modal');
  if (modal) modal.style.display = 'none';

  // Sync to Supabase
  try {
    const client = window.supabaseClient;
    if (client) await client.from('classes').upsert(classData);
  } catch(e){}
}

/**
 * Delete Class Item
 */
export function deleteClassItem(id) {
  const cls = classesList.find(c => c.id === id);
  if (!cls) return;

  if (!confirm(`Bạn có chắc chắn muốn xóa lớp "${cls.name}"? Dữ liệu nhiệm vụ sẽ được chuyển sang lưu trữ.`)) return;

  classesList = classesList.filter(c => c.id !== id);
  saveClassesToLocal();
  renderClassesList();
  showToast('info', 'Đã Xóa Lớp', `Đã xóa lớp "${cls.name}" khỏi danh sách.`);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.openClassModal = openClassModal;
window.saveClassFromModal = saveClassFromModal;
window.deleteClassItem = deleteClassItem;
