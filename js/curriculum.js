/**
 * =========================================================================
 * MODULE QUẢN LÝ PHÂN CẤP HỌC TẬP (curriculum.js)
 * Cấu trúc chuẩn: Môn học (Subject) ➔ Học phần (Module / Course) ➔ Unit Bài học (5 Kỹ năng)
 * =========================================================================
 */

import { $, esc, isRootUser } from './common.js';
import { unitsState } from './units.js';

export let subjectsList = [
  { id: 'SUB_ENG', code: 'ENG', name: '🇬🇧 Tiếng Anh', icon: '🇬🇧', description: 'Tiếng Anh giao tiếp & Học thuật 5 kỹ năng', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_MATH', code: 'MATH', name: '📐 Toán Học', icon: '📐', description: 'Đại số, Giải tích & Hình học không gian', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_PHYS', code: 'PHYS', name: '⚡ Vật Lý', icon: '⚡', description: 'Cơ học, Điện từ học & Vật lý hiện đại', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_CHEM', code: 'CHEM', name: '🧪 Hóa Học', icon: '🧪', description: 'Hóa học Đại cương, Vô cơ & Hữu cơ', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_CS', code: 'CS', name: '💻 Tin Học', icon: '💻', description: 'Lập trình Python, Web & Cấu trúc dữ liệu', created_by: 'nam3010hcm@gmail.com' }
];

export let modulesList = [
  { id: 'MOD_ENG_1', subject_id: 'SUB_ENG', code: 'ENG-B1', title: 'English B1 - General & Academic Skills', description: 'Học phần luyện 5 kỹ năng Tiếng Anh trình độ B1', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_MATH_1', subject_id: 'SUB_MATH', code: 'MATH-ALG', title: 'Học phần 1: Đại Số & Hàm Số K7', description: 'Phương trình, Bất phương trình & Hàm số', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_MATH_2', subject_id: 'SUB_MATH', code: 'MATH-GEO', title: 'Học phần 2: Hình Học Không Gian & Lượng Giác', description: 'Hình học 3D, Vectơ & Phương trình lượng giác', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_PHYS_1', subject_id: 'SUB_PHYS', code: 'PHYS-MEC', title: 'Học phần 1: Cơ Học & Động Lực Học K7', description: 'Động học, Các định luật Newton & Năng lượng', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_CHEM_1', subject_id: 'SUB_CHEM', code: 'CHEM-GEN', title: 'Học phần 1: Hóa Học Đại Cương & Vô Cơ', description: 'Cấu tạo nguyên tử, Bảng tuần hoàn & Phản ứng Oxi hóa', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_CS_1', subject_id: 'SUB_CS', code: 'CS-PY', title: 'Học phần 1: Lập Trình Python Cơ Bản', description: 'Cấu trúc dữ liệu Python, Vòng lặp & Hàm', created_by: 'nam3010hcm@gmail.com' }
];

// RENDER CÂY PHÂN CẤP HỌC TẬP (MÔN HỌC -> HỌC PHẦN -> UNIT)
export function renderCurriculumTree() {
  const container = document.getElementById('curriculum-tree-container');
  const subjectFilter = document.getElementById('flt-curriculum-subject');

  if (!container) return;

  const selectedSubId = subjectFilter ? subjectFilter.value : '';

  let filteredSubjects = subjectsList.filter(sub => !selectedSubId || sub.id === selectedSubId);

  if (filteredSubjects.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#94a3b8;">
        Chưa có môn học nào phù hợp với lựa chọn.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSubjects.map(sub => {
    // Lấy danh sách Học phần (Module / Course) thuộc Môn học này
    const subModules = modulesList.filter(mod => mod.subject_id === sub.id);

    return `
      <div class="card" style="margin-bottom:20px;padding:20px;border:1px solid #cbd5e1;border-radius:14px;background:#ffffff;box-shadow:0 4px 12px rgba(15,23,42,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:28px;">${sub.icon}</div>
            <div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;">${esc(sub.name)} <span style="font-size:12px;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:9999px;">Mã Môn: ${esc(sub.code)}</span></div>
              <div style="font-size:12.5px;color:#64748b;margin-top:2px;">${esc(sub.description)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="action-btn-sm" onclick="window.openModuleModal('${sub.id}')">➕ Thêm Học Phần Mới</button>
          </div>
        </div>

        <!-- DANH SÁCH HỌC PHẦN (MODULES / COURSES) -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${subModules.length === 0 ? `
            <div style="padding:14px;background:#f8fafc;border-radius:8px;font-size:12.5px;color:#94a3b8;">
              Chưa có học phần nào được tạo cho môn ${esc(sub.name)}. Bấm "➕ Thêm Học Phần Mới" để bắt đầu.
            </div>
          ` : subModules.map(mod => {
            // Lấy danh sách Units thuộc Học phần này
            const modUnits = (unitsState || []).filter(u => 
              (u.module || '').toLowerCase() === (mod.title || '').toLowerCase() || 
              (u.subject || '').toLowerCase() === (sub.name || '').toLowerCase()
            );

            return `
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div style="font-weight:700;font-size:14px;color:#0369a1;display:flex;align-items:center;gap:6px;">
                    <span>📚</span> ${esc(mod.title)}
                    <span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">${modUnits.length} Units</span>
                  </div>
                  <button class="action-btn-sm" style="background:#2563eb;color:#ffffff;border:none;" onclick="window.switchTTab('unit'); window.openUnitEditor();">
                    ➕ Thêm Unit 5 Kỹ Năng
                  </button>
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:10px;">${esc(mod.description)}</div>

                <!-- CÁC UNIT BÀI HỌC THUỘC HỌC PHẦN -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:10px;">
                  ${modUnits.length === 0 ? `
                    <div style="font-size:12px;color:#94a3b8;grid-column:1/-1;">Chưa có Unit nào.</div>
                  ` : modUnits.map(u => `
                    <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px;">
                      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">
                        Unit ${u.unit_number || 1}: ${esc(u.title)}
                      </div>
                      <div style="font-size:11.5px;color:#64748b;display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                        <span style="background:#f0f9ff;color:#0369a1;padding:1px 6px;border-radius:4px;">📖 Reading</span>
                        <span style="background:#ecfdf5;color:#047857;padding:1px 6px;border-radius:4px;">🎧 Audio</span>
                        <span style="background:#fef3c7;color:#b45309;padding:1px 6px;border-radius:4px;">🗣️ AI Speaking</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// MODAL THÊM MÔN HỌC MỚI
export function openSubjectModal() {
  const modal = document.getElementById('modal-subject');
  if (modal) modal.style.display = 'flex';
}
export function closeSubjectModal() {
  const modal = document.getElementById('modal-subject');
  if (modal) modal.style.display = 'none';
}

export function saveSubject() {
  const name = ($('sub-mod-name')?.value || '').trim();
  const code = ($('sub-mod-code')?.value || '').trim();
  const icon = ($('sub-mod-icon')?.value || '').trim() || '📘';
  const desc = ($('sub-mod-desc')?.value || '').trim();

  if (!name || !code) {
    alert("❌ Vui lòng nhập Tên môn học và Mã môn học!");
    return;
  }

  const newSub = {
    id: 'SUB_' + code.toUpperCase(),
    code: code.toUpperCase(),
    name: `${icon} ${name}`,
    icon,
    description: desc || 'Môn học LMS K7',
    created_by: 'nam3010hcm@gmail.com'
  };

  subjectsList.push(newSub);
  alert("✅ Đã thêm Môn Học mới thành công!");
  closeSubjectModal();
  renderCurriculumTree();
}

// Gán lên window object
window.renderCurriculumTree = renderCurriculumTree;
window.openSubjectModal = openSubjectModal;
window.closeSubjectModal = closeSubjectModal;
window.saveSubject = saveSubject;
