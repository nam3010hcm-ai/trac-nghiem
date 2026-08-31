/**
 * =========================================================================
 * MODULE QUẢN LÝ TÀI KHOẢN HỌC VIÊN (students-mgr.js)
 * Student Account Management & Anti-DDoS Verification Engine
 * =========================================================================
 */

import { $, esc, isRootUser, state, getAuthorDisplayName, logTeacherActivity } from './common.js';

const db = () => window.supabaseClient;

export let studentsList = [];
let editingStudentId = null;

export const DEFAULT_STUDENTS = [
  {
    id: 'HS1001',
    student_code: 'HS1001',
    full_name: 'Nguyễn Văn An',
    class_name: 'Lớp 10A1 - Anh Văn Chuyên',
    academic_year: '2025 - 2026',
    email: 'an.nguyen@student.edu.vn',
    password: '123',
    is_active: true,
    total_xp: 350,
    role: 'student',
    created_at: Date.now()
  },
  {
    id: 'HS1002',
    student_code: 'HS1002',
    full_name: 'Trần Thị Bích',
    class_name: 'Lớp 10A1 - Anh Văn Chuyên',
    academic_year: '2025 - 2026',
    email: 'bich.tran@student.edu.vn',
    password: '123',
    is_active: true,
    total_xp: 280,
    role: 'student',
    created_at: Date.now()
  },
  {
    id: 'HS1101',
    student_code: 'HS1101',
    full_name: 'Lê Hoàng Nam',
    class_name: 'Lớp 11B2 - Luyện Thi IELTS & B2',
    academic_year: '2025 - 2026',
    email: 'nam.le@student.edu.vn',
    password: '123',
    is_active: true,
    total_xp: 520,
    role: 'student',
    created_at: Date.now()
  }
];

function saveStudentsToLocal() {
  try {
    localStorage.setItem('educore_students_cache', JSON.stringify(studentsList));
  } catch(e){}
}

function loadStudentsFromLocal() {
  try {
    const saved = localStorage.getItem('educore_students_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e){}
  return DEFAULT_STUDENTS;
}

// 1. NẠP DANH SÁCH HỌC VIÊN TỪ SUPABASE
export async function loadStudents() {
  try {
    if (!studentsList || studentsList.length === 0) {
      studentsList = loadStudentsFromLocal();
      renderStudentsList();
    }

    if (!db()) return studentsList;

    let { data, error } = await db().from('students').select('*');
    if (error) {
      console.warn("[Students] Supabase select warning:", error);
    } else if (Array.isArray(data) && data.length > 0) {
      studentsList = data.map(st => ({
        ...st,
        id: st.id || st.student_code,
        student_code: st.student_code || st.id,
        full_name: st.full_name || st.name || st.student_name || 'Học viên',
        class_name: st.class_name || 'Lớp 10A1',
        academic_year: st.academic_year || '2025 - 2026',
        email: st.email || '',
        password: st.password || '123456',
        is_active: st.is_active !== false,
        total_xp: st.total_xp || 0
      }));
      saveStudentsToLocal();
      renderStudentsList();
      return studentsList;
    }
  } catch (err) {
    console.warn("[Students] Lỗi loadStudents:", err);
  }

  if (!studentsList || studentsList.length === 0) {
    studentsList = loadStudentsFromLocal();
    renderStudentsList();
  }
  return studentsList;
}

// 2. RENDER DANH SÁCH HỌC VIÊN LÊN BẢNG
export function renderStudentsList() {
  const container = document.getElementById('students-table-body');
  const countEl = document.getElementById('student-count-badge');
  const searchInput = document.getElementById('flt-student-search');
  const filterClass = document.getElementById('flt-student-class');

  if (countEl) countEl.textContent = studentsList.length;
  if (!container) return;

  const q = (searchInput?.value || '').trim().toLowerCase();
  const cls = (filterClass?.value || '').trim().toLowerCase();

  let filtered = studentsList.filter(st => {
    const matchQ = !q || (st.id || '').toLowerCase().includes(q) ||
                          (st.full_name || '').toLowerCase().includes(q) ||
                          (st.email || '').toLowerCase().includes(q);
    const matchCls = !cls || (st.class_name || '').toLowerCase() === cls;
    return matchQ && matchCls;
  });

  // Cập nhật dropdown bộ lọc lớp
  if (filterClass && filterClass.options.length <= 1) {
    const uniqueClasses = [...new Set(studentsList.map(s => s.class_name).filter(Boolean))];
    uniqueClasses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.toLowerCase();
      opt.textContent = `Lớp: ${c}`;
      filterClass.appendChild(opt);
    });
  }

  if (!filtered.length) {
    container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">📭 Chưa có học viên nào phù hợp. Bấm "+ Thêm Học Viên" hoặc "📥 Nhập Hàng Loạt" để cấp tài khoản.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map((st, idx) => {
    const isActive = st.is_active !== false;

    // Tính toán kết quả học tập của học viên từ window.state.results
    const stResults = (window.state?.results || []).filter(r => String(r.sid || '').toLowerCase() === String(st.id || '').toLowerCase());
    const totalExams = stResults.length;
    const avgScore = totalExams > 0 ? (stResults.reduce((acc, curr) => acc + (parseFloat(curr.manual_score ?? curr.score) || 0), 0) / totalExams).toFixed(1) : 'N/A';
    
    const loginTime = st.last_login_at ? new Date(st.last_login_at).toLocaleString('vi-VN') : 'Chưa có';
    const logoutTime = st.last_logout_at ? new Date(st.last_logout_at).toLocaleString('vi-VN') : '—';

    return `
      <tr style="${isActive ? '' : 'background:#fef2f2;opacity:0.8'}">
        <td style="font-weight:700;color:#1e293b">${idx + 1}</td>
        <td><span class="abadge" style="background:#e0f2fe;color:#0369a1;font-weight:700">${esc(st.id)}</span></td>
        <td style="font-weight:700;color:#0f172a">
          <div>${esc(st.full_name || st.student_name)}</div>
          <div style="font-size:11px;color:#64748b;font-weight:normal;">Lần đăng nhập: ${loginTime}</div>
        </td>
        <td><span class="abadge" style="background:#f1f5f9;color:#334155">${esc(st.class_name || 'K7')}</span></td>
        <td>
          <div style="font-size:12px;color:#0f172a;">
            <div><b>📝 ${totalExams}</b> Bài thi</div>
            <div><b>⭐ ĐTB: ${avgScore}</b></div>
            <div style="color:#16a34a;font-weight:700;">⚡ ${st.total_xp || 0} XP</div>
          </div>
        </td>
        <td style="font-family:monospace;color:#2563eb;font-size:13px">${esc(st.email)}</td>
        <td>
          <span style="font-family:monospace;background:#f8fafc;padding:3px 6px;border-radius:4px;border:1px solid #e2e8f0;font-size:12px">
            ${esc(st.password || '••••••')}
          </span>
        </td>
        <td>
          <span class="badge-status ${isActive ? 'status-active' : 'status-hidden'}">
            ${isActive ? '🟢 Đang hoạt động' : '🔴 Đã khóa'}
          </span>
        </td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-sm" onclick="if(window.openStudentReportModal) window.openStudentReportModal('${esc(st.id)}')" title="Xem báo cáo kết quả & thời gian học" style="padding:4px 8px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">📊 Hồ sơ</button>
          <button class="btn btn-sm" onclick="window.openStudentModal('${esc(st.id)}')" title="Sửa thông tin" style="padding:4px 8px">✏️</button>
          <button class="btn btn-sm ${isActive ? 'btn-warn' : 'btn-p'}" onclick="window.toggleStudentStatus('${esc(st.id)}')" title="${isActive ? 'Khóa tài khoản' : 'Mở khóa'}" style="padding:4px 8px">
            ${isActive ? '🔒' : '🔓'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.deleteStudent('${esc(st.id)}')" title="Xóa tài khoản" style="padding:4px 8px">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. MỞ MODAL THÊM / SỬA HỌC VIÊN ĐƠN LẺ
export function openStudentModal(studentId = null) {
  editingStudentId = studentId;
  const modal = document.getElementById('student-modal');
  if (!modal) return;

  const st = studentId ? studentsList.find(s => s.id === studentId) : null;

  $('stm-title').textContent = st ? 'Sửa thông tin Học viên' : 'Thêm Học viên mới (Cấp tài khoản)';
  $('stm-id').value = st ? st.id : '';
  $('stm-id').disabled = !!st; // Không đổi ID khi sửa
  $('stm-name').value = st ? st.full_name : '';
  $('stm-class').value = st ? st.class_name : '';
  $('stm-year').value = st ? st.academic_year : '2025 - 2026';
  $('stm-email').value = st ? st.email : '';
  $('stm-pass').value = st ? st.password : '123456';
  $('stm-active').checked = st ? (st.is_active !== false) : true;

  modal.style.display = 'flex';
}

export function closeStudentModal() {
  const modal = document.getElementById('student-modal');
  if (modal) modal.style.display = 'none';
  editingStudentId = null;
}

// 4. LƯU HỌC VIÊN LÊN SUPABASE
export async function saveStudent() {
  const id = $('stm-id')?.value.trim();
  const full_name = $('stm-name')?.value.trim();
  const class_name = $('stm-class')?.value.trim();
  const academic_year = $('stm-year')?.value.trim();
  const email = $('stm-email')?.value.trim().toLowerCase();
  const password = $('stm-pass')?.value.trim();
  const is_active = $('stm-active')?.checked ?? true;

  if (!id || !full_name || !class_name || !email || !password) {
    alert("Vui lòng điền đầy đủ các thông tin: Mã học viên, Họ và tên, Lớp, Email và Mật khẩu!");
    return;
  }

  // Validate format email
  if (!email.includes('@')) {
    alert("Địa chỉ Gmail/Email không hợp lệ!");
    return;
  }

  const saveBtn = $('btn-save-student');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...'; }

  try {
    const authorEmail = (state && state.currentUserEmail) || 'nam3010hcm@gmail.com';
    const payload = {
      id,
      full_name,
      class_name,
      academic_year: academic_year || '2025 - 2026',
      email,
      password,
      is_active,
      created_at: Date.now(),
      created_by: authorEmail
    };

    const { error } = await db().from('students').upsert([payload], { onConflict: 'id' });
    if (error) throw error;

    const existingIdx = studentsList.findIndex(s => s.id === id);
    if (existingIdx >= 0) {
      studentsList[existingIdx] = payload;
    } else {
      studentsList.unshift(payload);
    }

    await logTeacherActivity(existingIdx >= 0 ? 'Cập nhật' : 'Tạo mới', 'Học viên', `${full_name} (${id})`, id, `Lớp: ${class_name}, Email: ${email}`);

    saveStudentsToLocal();
    closeStudentModal();
    renderStudentsList();
    alert("✅ Đã lưu tài khoản học viên thành công!");
  } catch (err) {
    console.error("Lỗi khi lưu học viên:", err);
    alert("❌ Lỗi: " + (err.message || 'Không thể lưu học viên.'));
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Lưu học viên'; }
  }
}

// 5. KHÓA / MỞ KHÓA TÀI KHOẢN HỌC VIÊN
export async function toggleStudentStatus(studentId) {
  const st = studentsList.find(s => s.id === studentId);
  if (!st) return;

  const nextStatus = !(st.is_active !== false);
  st.is_active = nextStatus;
  saveStudentsToLocal();
  renderStudentsList();

  try {
    const { error } = await db().from('students').update({ is_active: nextStatus }).eq('id', studentId);
    if (error) throw error;
    await logTeacherActivity(nextStatus ? 'Mở khóa tài khoản' : 'Khóa tài khoản', 'Học viên', `${st.full_name || st.id} (${studentId})`, studentId, '');
  } catch (e) {
    console.error("Lỗi toggleStudentStatus:", e);
  }
}

// 6. XÓA TÀI KHOẢN HỌC VIÊN
export async function deleteStudent(studentId) {
  const st = studentsList.find(s => s.id === studentId);
  if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa tài khoản học viên [${studentId}]?`)) return;

  studentsList = studentsList.filter(s => s.id !== studentId);
  saveStudentsToLocal();
  renderStudentsList();

  try {
    const { error } = await db().from('students').delete().eq('id', studentId);
    if (error) throw error;
    await logTeacherActivity('Xóa tài khoản', 'Học viên', `${st?.full_name || studentId} (${studentId})`, studentId, '');
    alert("✅ Đã xóa tài khoản học viên!");
  } catch (e) {
    console.error("Lỗi xóa học viên:", e);
  }
}

// 7. NHẬP HỌC VIÊN HÀNG LOẠT (BULK IMPORT)
export function openBulkStudentModal() {
  const modal = document.getElementById('student-bulk-modal');
  if (modal) modal.style.display = 'flex';
}

export function closeBulkStudentModal() {
  const modal = document.getElementById('student-bulk-modal');
  if (modal) modal.style.display = 'none';
}

export async function saveBulkStudents() {
  const rawText = $('stm-bulk-text')?.value.trim();
  if (!rawText) {
    alert("Vui lòng dán danh sách học viên vào khung nhập liệu!");
    return;
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = [];
  const authorEmail = (state && state.currentUserEmail) || 'nam3010hcm@gmail.com';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Bỏ qua dòng tiêu đề nếu có
    if (i === 0 && (line.toLowerCase().includes('mã') || line.toLowerCase().includes('email') || line.toLowerCase().includes('họ và tên'))) {
      continue;
    }

    // Tách theo tab (\t) hoặc dấu phẩy (,) hoặc dấu chấm phẩy (;)
    let parts = line.includes('\t') ? line.split('\t') : (line.includes(';') ? line.split(';') : line.split(','));
    parts = parts.map(p => p.trim());

    if (parts.length >= 4) {
      // Định dạng: ID | Tên | Lớp | Niên khóa | Email | Mật khẩu
      const id = parts[0];
      const full_name = parts[1];
      const class_name = parts[2];
      const academic_year = parts[3] || '2025 - 2026';
      const email = (parts[4] || `${id.toLowerCase()}@student.edu.vn`).toLowerCase();
      const password = parts[5] || '123456';

      if (id && full_name) {
        parsed.push({
          id,
          full_name,
          class_name,
          academic_year,
          email,
          password,
          is_active: true,
          created_at: Date.now() + i,
          created_by: authorEmail
        });
      }
    }
  }

  if (!parsed.length) {
    alert("Không tìm thấy dòng học viên hợp lệ nào! Định dạng mỗi dòng: Mã SV, Họ tên, Lớp, Niên khóa, Email, Mật khẩu");
    return;
  }

  const btn = $('btn-save-bulk-students');
  if (btn) { btn.disabled = true; btn.textContent = `Đang nạp ${parsed.length} học viên...`; }

  try {
    const { error } = await db().from('students').upsert(parsed, { onConflict: 'id' });
    if (error) throw error;

    await logTeacherActivity('Nhập hàng loạt', 'Học viên', `Nhập ${parsed.length} tài khoản học viên`, '', `Lớp: ${parsed[0]?.class_name || ''}`);

    await loadStudents();
    renderStudentsList();
    closeBulkStudentModal();
    alert(`🎉 Đã nhập thành công ${parsed.length} tài khoản học viên lên hệ thống!`);
  } catch (e) {
    console.error("Lỗi bulk import:", e);
    alert("❌ Lỗi khi nhập hàng loạt: " + (e.message || ''));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📥 Tiến hành Nạp Danh Sách'; }
  }
}

// 8. XUẤT DANH SÁCH HỌC VIÊN RA CSV
export function exportStudentsCSV() {
  if (!studentsList.length) { alert("Chưa có dữ liệu học viên để xuất!"); return; }

  let csv = "Mã Học Viên,Họ và Tên,Lớp,Niên Khóa,Gmail/Email,Mật Khẩu,Trạng Thái\n";
  studentsList.forEach(s => {
    csv += `"${s.id}","${s.full_name}","${s.class_name}","${s.academic_year}","${s.email}","${s.password}","${s.is_active !== false ? 'Hoạt động' : 'Đã khóa'}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Danh_sach_Hoc_vien_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

if (typeof window !== 'undefined') {
  window.openStudentModal = openStudentModal;
  window.closeStudentModal = closeStudentModal;
  window.saveStudent = saveStudent;
  window.toggleStudentStatus = toggleStudentStatus;
  window.deleteStudent = deleteStudent;
  window.openBulkStudentModal = openBulkStudentModal;
  window.closeBulkStudentModal = closeBulkStudentModal;
  window.saveBulkStudents = saveBulkStudents;
  window.exportStudentsCSV = exportStudentsCSV;
  window.renderStudentsList = renderStudentsList;
}

