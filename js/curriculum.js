/**
 * =========================================================================
 * MODULE QUẢN LÝ PHÂN CẤP HỌC TẬP (curriculum.js)
 * Cấu trúc chuẩn: Môn học (Subject) ➔ Học phần (Module / Course) ➔ Unit Bài học (5 Kỹ năng)
 * Đồng bộ hai chiều thời gian thực với Supabase database & Quản lý Unit
 * =========================================================================
 */

import { $, esc, isRootUser, state } from './common.js';
import { unitsState, normalizeSubjectName, normalizeModuleName } from './units.js';

const db = () => window.supabaseClient;

const STORE_SUBJECTS_KEY = 'educore_curriculum_subjects_v2';
const STORE_MODULES_KEY = 'educore_curriculum_modules_v2';

export const DEFAULT_SUBJECTS = [
  { id: 'SUB_ENG', code: 'ENG', name: '🇬🇧 Tiếng Anh', icon: '🇬🇧', description: 'Tiếng Anh giao tiếp, Học thuật & Chuyên ngành Quân sự / Công Binh', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_MATH', code: 'MATH', name: '📐 Toán Học', icon: '📐', description: 'Đại số, Giải tích & Hình học không gian', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_PHYS', code: 'PHYS', name: '⚡ Vật Lý', icon: '⚡', description: 'Cơ học, Điện từ học & Vật lý hiện đại', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_CHEM', code: 'CHEM', name: '🧪 Hóa Học', icon: '🧪', description: 'Hóa học Đại cương, Vô cơ & Hữu cơ', created_by: 'nam3010hcm@gmail.com' },
  { id: 'SUB_CS', code: 'CS', name: '💻 Tin Học', icon: '💻', description: 'Lập trình Python, Web & Cấu trúc dữ liệu', created_by: 'nam3010hcm@gmail.com' }
];

export const DEFAULT_MODULES = [
  { id: 'MOD_ENG_1', subject_id: 'SUB_ENG', code: 'ENG-B1', title: 'English B1 - General & Academic Skills', description: 'Học phần luyện 5 kỹ năng Tiếng Anh trình độ B1', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_ENG_CB', subject_id: 'SUB_ENG', code: 'ENG-CB', title: 'Tiếng Anh Chuyên Ngành Công Binh', description: 'Học phần Tiếng Anh chuyên ngành Kỹ thuật & Công Binh (Military Engineering)', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_MATH_1', subject_id: 'SUB_MATH', code: 'MATH-ALG', title: 'Học phần 1: Đại Số & Hàm Số K7', description: 'Phương trình, Bất phương trình & Hàm số', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_MATH_2', subject_id: 'SUB_MATH', code: 'MATH-GEO', title: 'Học phần 2: Hình Học Không Gian & Lượng Giác', description: 'Hình học 3D, Vectơ & Phương trình lượng giác', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_PHYS_1', subject_id: 'SUB_PHYS', code: 'PHYS-MEC', title: 'Học phần 1: Cơ Học & Động Lực Học K7', description: 'Động học, Các định luật Newton & Năng lượng', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_CHEM_1', subject_id: 'SUB_CHEM', code: 'CHEM-GEN', title: 'Học phần 1: Hóa Học Đại Cương & Vô Cơ', description: 'Cấu tạo nguyên tử, Bảng tuần hoàn & Phản ứng Oxi hóa', created_by: 'nam3010hcm@gmail.com' },
  { id: 'MOD_CS_1', subject_id: 'SUB_CS', code: 'CS-PY', title: 'Học phần 1: Lập Trình Python Cơ Bản', description: 'Cấu trúc dữ liệu Python, Vòng lặp & Hàm', created_by: 'nam3010hcm@gmail.com' }
];

export let subjectsList = [...DEFAULT_SUBJECTS];
export let modulesList = [...DEFAULT_MODULES];

let targetSubjectForModule = null;

function saveCurriculumToLocal() {
  try {
    localStorage.setItem(STORE_SUBJECTS_KEY, JSON.stringify(subjectsList));
    localStorage.setItem(STORE_MODULES_KEY, JSON.stringify(modulesList));
  } catch (e) {}
}

function loadCurriculumFromLocal() {
  try {
    const s = localStorage.getItem(STORE_SUBJECTS_KEY);
    if (s) {
      const parsedS = JSON.parse(s);
      if (Array.isArray(parsedS) && parsedS.length > 0) {
        parsedS.forEach(sub => {
          if (!subjectsList.some(x => x.id === sub.id || x.code === sub.code)) {
            subjectsList.push(sub);
          }
        });
      }
    }
    const m = localStorage.getItem(STORE_MODULES_KEY);
    if (m) {
      const parsedM = JSON.parse(m);
      if (Array.isArray(parsedM) && parsedM.length > 0) {
        parsedM.forEach(mod => {
          if (!modulesList.some(x => x.id === mod.id || (x.title || '').toLowerCase() === (mod.title || '').toLowerCase())) {
            modulesList.push(mod);
          }
        });
      }
    }
  } catch (e) {}
}

/**
 * TỰ ĐỘNG ĐỒNG BỘ CÁC MÔN HỌC & HỌC PHẦN TỪ UNITSSTATE (SUPABASE) VÀO CÂY CURRICULUM
 */
export function syncCurriculumWithUnits() {
  const currentUnits = Array.isArray(unitsState) ? unitsState : [];
  if (!currentUnits.length) return;

  currentUnits.forEach(u => {
    if (!u) return;
    const rawSub = u.subject || '🇬🇧 Tiếng Anh';
    const subName = normalizeSubjectName(rawSub);
    const modTitle = normalizeModuleName(u.module || '');

    // 1. Đồng bộ Môn học nếu chưa có
    let matchedSub = subjectsList.find(s => 
      s.name === subName || 
      subName.includes(s.code) || 
      s.name.toLowerCase().includes(subName.toLowerCase().replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim())
    );

    if (!matchedSub) {
      const code = subName.replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim().substring(0, 4).toUpperCase() || 'SUB';
      matchedSub = {
        id: 'SUB_' + code + '_' + Date.now(),
        code: code,
        name: subName,
        icon: subName.startsWith('📐') ? '📐' : (subName.startsWith('⚡') ? '⚡' : (subName.startsWith('🧪') ? '🧪' : (subName.startsWith('💻') ? '💻' : '📘'))),
        description: `Môn học ${subName}`,
        created_by: 'nam3010hcm@gmail.com'
      };
      subjectsList.push(matchedSub);
    }

    // 2. Đồng bộ Học phần nếu chưa có
    if (modTitle) {
      let matchedMod = modulesList.find(m => 
        (m.title || '').toLowerCase().trim() === modTitle.toLowerCase().trim() ||
        normalizeModuleName(m.title || '').toLowerCase().trim() === modTitle.toLowerCase().trim()
      );

      if (!matchedMod) {
        const code = modTitle.replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim().substring(0, 6).toUpperCase() || 'MOD';
        matchedMod = {
          id: 'MOD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          subject_id: matchedSub.id,
          code: code,
          title: modTitle,
          description: `Học phần ${modTitle} thuộc ${matchedSub.name}`,
          created_by: 'nam3010hcm@gmail.com'
        };
        modulesList.push(matchedMod);
      } else if (!matchedMod.subject_id) {
        matchedMod.subject_id = matchedSub.id;
      }
    }
  });

  saveCurriculumToLocal();
}

// TẢI DỮ LIỆU TỪ SUPABASE
export async function loadCurriculumFromSupabase() {
  loadCurriculumFromLocal();

  try {
    const { data: dbCourses } = await db().from('courses').select('*');
    if (dbCourses && dbCourses.length > 0) {
      dbCourses.forEach(c => {
        if (!subjectsList.some(s => s.code === c.course_code || s.name === c.title)) {
          subjectsList.push({
            id: 'SUB_' + c.course_code,
            code: c.course_code,
            name: c.title,
            icon: '📘',
            description: c.description || 'Môn học EduCore LMS',
            created_by: 'nam3010hcm@gmail.com'
          });
        }
      });
    }
  } catch (e) {
    console.warn("[Curriculum] Supabase fetch fallback:", e);
  }

  syncCurriculumWithUnits();
}

// RENDER CÂY PHÂN CẤP HỌC TẬP (MÔN HỌC ➔ HỌC PHẦN ➔ UNIT BÀI HỌC)
export function renderCurriculumTree() {
  const container = document.getElementById('curriculum-tree-container');
  const subjectFilter = document.getElementById('flt-curriculum-subject');

  if (!container) return;

  // Luôn đồng bộ dữ liệu thời gian thực với unitsState
  syncCurriculumWithUnits();

  // Cập nhật bộ lọc môn học nếu có
  if (subjectFilter) {
    const curVal = subjectFilter.value;
    subjectFilter.innerHTML = '<option value="">✓ Tất cả Môn học</option>' + subjectsList.map(s => `
      <option value="${s.id}" ${s.id === curVal ? 'selected' : ''}>${esc(s.name)}</option>
    `).join('');
  }

  const selectedSubId = subjectFilter ? subjectFilter.value : '';
  let filteredSubjects = subjectsList.filter(sub => !selectedSubId || sub.id === selectedSubId);

  if (filteredSubjects.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#94a3b8;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
        Chưa có môn học nào phù hợp với lựa chọn. Bấm "➕ Thêm Môn Học Mới" để tạo môn học mới.
      </div>
    `;
    return;
  }

  const allCurrentUnits = Array.isArray(unitsState) ? unitsState : [];

  container.innerHTML = filteredSubjects.map(sub => {
    // Lấy các học phần thuộc môn này
    const subModules = modulesList.filter(mod => mod.subject_id === sub.id);
    
    // Tìm tất cả các units thuộc môn này
    const allUnitsOfSub = allCurrentUnits.filter(u => {
      const uSubNorm = normalizeSubjectName(u.subject || '');
      const sNameNorm = normalizeSubjectName(sub.name || '');
      return uSubNorm === sNameNorm ||
             (u.subject || '').toLowerCase().includes(sub.code.toLowerCase()) || 
             sub.name.toLowerCase().includes((u.subject || '').toLowerCase().trim());
    });

    const renderedUnitIds = new Set();

    return `
      <div class="card" style="margin-bottom:20px;padding:20px;border:1px solid #cbd5e1;border-radius:14px;background:#ffffff;box-shadow:0 4px 12px rgba(15,23,42,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:28px;">${sub.icon}</div>
            <div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;">
                ${esc(sub.name)} 
                <span style="font-size:12px;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:9999px;">Mã Môn: ${esc(sub.code)}</span>
                <span style="font-size:12px;color:#059669;background:#ecfdf5;padding:2px 8px;border-radius:9999px;margin-left:4px;">${allUnitsOfSub.length} Units</span>
              </div>
              <div style="font-size:12.5px;color:#64748b;margin-top:2px;">${esc(sub.description)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="action-btn-sm" style="background:#0284c7;color:#fff;border:none;" onclick="window.openModuleModal('${sub.id}')">➕ Thêm Học Phần Mới</button>
            <button class="action-btn-sm" style="background:#ef4444;color:#fff;border:none;" onclick="window.deleteSubject('${sub.id}')">🗑️ Xóa Môn</button>
          </div>
        </div>

        <!-- DANH SÁCH HỌC PHẦN (MODULES / COURSES) -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${subModules.length === 0 && allUnitsOfSub.length === 0 ? `
            <div style="padding:14px;background:#f8fafc;border-radius:8px;font-size:12.5px;color:#94a3b8;border:1px dashed #cbd5e1;">
              Chưa có học phần nào được tạo cho môn ${esc(sub.name)}. Bấm "➕ Thêm Học Phần Mới" để bắt đầu.
            </div>
          ` : subModules.map(mod => {
            const modUnits = allUnitsOfSub.filter(u => {
              const uModNorm = normalizeModuleName(u.module || '');
              const curModNorm = normalizeModuleName(mod.title || '');
              return uModNorm.toLowerCase().trim() === curModNorm.toLowerCase().trim() ||
                     (u.module || '').toLowerCase().trim() === (mod.title || '').toLowerCase().trim();
            });

            modUnits.forEach(u => renderedUnitIds.add(u.id));

            return `
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                  <div style="font-weight:700;font-size:14px;color:#0369a1;display:flex;align-items:center;gap:6px;">
                    <span>📚</span> ${esc(mod.title)}
                    <span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">Mã: ${esc(mod.code)} • ${modUnits.length} Units</span>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="action-btn-sm" style="background:#2563eb;color:#ffffff;border:none;" onclick="window.switchTTab('unit'); if(window.openUnitEditor) window.openUnitEditor(null, '${esc(sub.name)}', '${esc(mod.title)}');">
                      ➕ Thêm Unit 5 Kỹ Năng
                    </button>
                    <button class="action-btn-sm" style="background:#dc2626;color:#ffffff;border:none;" onclick="window.deleteModule('${mod.id}')">
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:10px;">${esc(mod.description)}</div>

                <!-- CÁC UNIT BÀI HỌC THUỘC HỌC PHẦN -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:10px;">
                  ${modUnits.length === 0 ? `
                    <div style="font-size:12px;color:#94a3b8;grid-column:1/-1;">Chưa có Unit bài học nào. Bấm "+ Thêm Unit 5 Kỹ Năng" để thiết kế bài học.</div>
                  ` : modUnits.map(u => `
                    <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px;cursor:pointer;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.04);" onclick="window.switchTTab('unit'); if(window.openUnitEditor) window.openUnitEditor('${u.id}');" title="Bấm để chỉnh sửa Unit này">
                      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                        <span>${u.icon || '📖'}</span> ${esc(u.title)}
                      </div>
                      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${esc(u.topic || 'General Topic')} • ${esc(u.level || 'A2')}</div>
                      <div style="font-size:11px;color:#64748b;display:flex;gap:4px;flex-wrap:wrap;">
                        <span style="background:#eff6ff;color:#1d4ed8;padding:1px 5px;border-radius:4px;">🎧 ${Array.isArray(u.listening) ? u.listening.length : (u.listening ? 1 : 0)} Lis</span>
                        <span style="background:#f0fdf4;color:#15803d;padding:1px 5px;border-radius:4px;">📖 ${Array.isArray(u.reading) ? u.reading.length : (u.reading ? 1 : 0)} Read</span>
                        <span style="background:#faf5ff;color:#7e22ce;padding:1px 5px;border-radius:4px;">🗣️ ${Array.isArray(u.speaking) ? u.speaking.length : (u.speaking ? 1 : 0)} Spk</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <!-- HIỂN THỊ CÁC UNIT CHƯA PHÂN NHÓM HỌC PHẦN (NẾU CÓ) -->
          ${(() => {
            const unassignedUnits = allUnitsOfSub.filter(u => !renderedUnitIds.has(u.id));
            if (!unassignedUnits.length) return '';
            return `
              <div style="background:#fffbeb;border:1px dashed #f59e0b;border-radius:10px;padding:14px;">
                <div style="font-weight:700;font-size:13.5px;color:#b45309;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                  <span>📌</span> Các Bài Học Khác Thuộc Môn ${esc(sub.name)} (${unassignedUnits.length} Units)
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:10px;">
                  ${unassignedUnits.map(u => `
                    <div style="background:#ffffff;border:1px solid #fde68a;border-radius:8px;padding:10px;cursor:pointer;" onclick="window.switchTTab('unit'); if(window.openUnitEditor) window.openUnitEditor('${u.id}');">
                      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">
                        <span>${u.icon || '📖'}</span> ${esc(u.title)}
                      </div>
                      <div style="font-size:11px;color:#92400e;">Học phần: ${esc(u.module || 'Mặc định')}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          })()}
        </div>
      </div>
    `;
  }).join('');
}

// 1. MÔN HỌC (SUBJECT) CRUD
export function openSubjectModal() {
  const modal = document.getElementById('modal-subject');
  if (modal) modal.style.display = 'flex';
}

export function closeSubjectModal() {
  const modal = document.getElementById('modal-subject');
  if (modal) modal.style.display = 'none';
}

export async function saveSubject() {
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
    description: desc || 'Môn học EduCore LMS',
    created_by: state.currentUserEmail || 'nam3010hcm@gmail.com'
  };

  subjectsList.push(newSub);
  saveCurriculumToLocal();

  let teacherDisplayName = 'Thầy Nam (Root Admin)';
  try {
    const rawUser = localStorage.getItem('teacher_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.name) teacherDisplayName = u.name;
    }
  } catch(e){}

  // Sync với Supabase bảng courses
  try {
    await db().from('courses').upsert({
      course_code: code.toUpperCase(),
      title: `${icon} ${name}`,
      description: desc || 'Môn học EduCore LMS',
      instructor_name: teacherDisplayName
    }, { onConflict: 'course_code' });
  } catch (e) {
    console.warn("Supabase course sync error:", e);
  }

  if (typeof window.populateUnitFilters === 'function') {
    window.populateUnitFilters();
  }

  alert("✅ Đã tạo Môn Học mới và lưu vào CSDL Supabase!");
  closeSubjectModal();
  renderCurriculumTree();
}

export function deleteSubject(subId) {
  if (!confirm("⚠️ Bạn có chắc chắn muốn xóa Môn học này?")) return;
  subjectsList = subjectsList.filter(s => s.id !== subId);
  modulesList = modulesList.filter(m => m.subject_id !== subId);
  saveCurriculumToLocal();
  if (typeof window.populateUnitFilters === 'function') {
    window.populateUnitFilters();
  }
  renderCurriculumTree();
}

// 2. HỌC PHẦN (MODULE / COURSE) CRUD
export function openModuleModal(subId) {
  targetSubjectForModule = subId;
  const modal = document.getElementById('modal-module');
  if (modal) modal.style.display = 'flex';
}

export function closeModuleModal() {
  const modal = document.getElementById('modal-module');
  if (modal) modal.style.display = 'none';
}

export async function saveModule() {
  const title = ($('mod-mod-title')?.value || '').trim();
  const code = ($('mod-mod-code')?.value || '').trim();
  const desc = ($('mod-mod-desc')?.value || '').trim();

  if (!title || !code) {
    alert("❌ Vui lòng nhập Tên học phần và Mã học phần!");
    return;
  }

  const newMod = {
    id: 'MOD_' + Date.now(),
    subject_id: targetSubjectForModule || 'SUB_ENG',
    code: code.toUpperCase(),
    title: title,
    description: desc || 'Học phần EduCore',
    created_by: state.currentUserEmail || 'nam3010hcm@gmail.com'
  };

  modulesList.push(newMod);
  saveCurriculumToLocal();

  if (typeof window.populateUnitFilters === 'function') {
    window.populateUnitFilters();
  }

  alert("✅ Đã tạo Học Phần mới thành công!");
  closeModuleModal();
  renderCurriculumTree();
}

export function deleteModule(modId) {
  if (!confirm("⚠️ Bạn có chắc chắn muốn xóa Học Phần này?")) return;
  modulesList = modulesList.filter(m => m.id !== modId);
  saveCurriculumToLocal();
  if (typeof window.populateUnitFilters === 'function') {
    window.populateUnitFilters();
  }
  renderCurriculumTree();
}

// Global Exports
window.renderCurriculumTree = renderCurriculumTree;
window.syncCurriculumWithUnits = syncCurriculumWithUnits;
window.openSubjectModal = openSubjectModal;
window.closeSubjectModal = closeSubjectModal;
window.saveSubject = saveSubject;
window.deleteSubject = deleteSubject;
window.openModuleModal = openModuleModal;
window.closeModuleModal = closeModuleModal;
window.saveModule = saveModule;
window.deleteModule = deleteModule;

