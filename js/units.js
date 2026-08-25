/**
 * =========================================================================
 * MODULE QUẢN LÝ & THIẾT KẾ UNIT BÀI HỌC (units.js)
 * Teacher Learning Units & 5-Skills Designer Engine
 * =========================================================================
 */

import { DEFAULT_UNITS } from './learn-data.js';
import { state, $, esc, clone, canEditItem, isRootUser, getAuthorDisplayName, logTeacherActivity } from './common.js';
import { subjectsList, modulesList } from './curriculum.js';
import { uploadMediaFile } from './supabase.js';

const db = () => window.supabaseClient;

export let unitsState = [];
let editingUnitId = null;
let currentDesignerSkill = 'listening';

// HELPER TỰ ĐỘNG XỬ LÝ NẾU BẢNG SUPABASE THIẾU CỘT MỚI (MODULE / SUBJECT / CREATED_BY)
async function safeUpsertUnit(payload) {
  let list = Array.isArray(payload) ? payload.map(p => ({ ...p })) : [{ ...payload }];
  let { error } = await db().from('learning_units').upsert(list, { onConflict: 'id' });
  
  if (error && error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
    console.warn("[Units] Supabase schema mismatch, retrying without missing columns:", error.message);
    const msg = error.message.toLowerCase();
    list = list.map(item => {
      const cleaned = { ...item };
      if (msg.includes('module')) delete cleaned.module;
      if (msg.includes('subject')) delete cleaned.subject;
      if (msg.includes('created_by')) delete cleaned.created_by;
      return cleaned;
    });

    let retryResult = await db().from('learning_units').upsert(list, { onConflict: 'id' });
    if (!retryResult.error) return retryResult;

    // Fallback: Xóa cả 3 cột mới nếu Supabase chưa được ALTER TABLE
    list = list.map(item => {
      const cleaned = { ...item };
      delete cleaned.module;
      delete cleaned.subject;
      delete cleaned.created_by;
      return cleaned;
    });
    return await db().from('learning_units').upsert(list, { onConflict: 'id' });
  }
  return { error };
}

// HÀM CHUẨN HÓA TÊN MÔN HỌC & HỌC PHẦN (LOẠI BỎ TRIỆT ĐỂ TÊN CŨ TRÊN CƠ SỞ DỮ LIỆU)
export function normalizeSubjectName(sub) {
  if (!sub) return '🇬🇧 Tiếng Anh';
  const s = String(sub).trim();
  const clean = s.toLowerCase().replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim();
  if (clean.includes('tiếng anh') || clean.includes('english') || clean.includes('eng')) return '🇬🇧 Tiếng Anh';
  if (clean.includes('toán') || clean.includes('math')) return '📐 Toán Học';
  if (clean.includes('vật lý') || clean.includes('vật lí') || clean.includes('phys')) return '⚡ Vật Lý';
  if (clean.includes('hóa') || clean.includes('chem')) return '🧪 Hóa Học';
  if (clean.includes('tin') || clean.includes('công nghệ thông tin') || clean.includes('it') || clean.includes('cs') || clean.includes('python')) return '💻 Tin Học';
  return s;
}

export function normalizeModuleName(mod) {
  if (!mod) return 'English B1 - General & Academic Skills';
  const m = String(mod).trim();
  if (m.includes('Tiếng Anh cơ bản 1') || m.includes('Basic English Module 1') || m.includes('Tiếng Anh cơ bản')) {
    return 'English B1 - General & Academic Skills';
  }
  return m;
}

// 1. TẢI DANH SÁCH UNIT TỪ SUPABASE
export async function loadUnits() {
  try {
    const { data, error } = await db().from('learning_units').select('*').order('created_at', { ascending: true });
    if (error) {
      console.warn("Chưa có bảng learning_units hoặc lỗi:", error);
      unitsState = clone(DEFAULT_UNITS);
    } else if (!data || data.length === 0) {
      unitsState = clone(DEFAULT_UNITS);
      // Chèn các Unit mặc định lên Supabase
      const inserts = DEFAULT_UNITS.map((u, i) => ({
        id: u.id,
        subject: normalizeSubjectName(u.subject),
        module: normalizeModuleName(u.module),
        title: u.title,
        topic: u.topic || '',
        level: u.level || 'A2 - B1',
        icon: u.icon || '📖',
        description: u.description || '',
        is_hidden: u.isHidden || false,
        listening: u.listening || [],
        reading: u.reading || [],
        speaking: u.speaking || [],
        writing: u.writing || [],
        language_focus: u.languageFocus || {},
        created_at: Date.now() + i
      }));
      await safeUpsertUnit(inserts);
    } else {
      unitsState = data.map(u => {
        const defUnit = DEFAULT_UNITS.find(d => d.id === u.id);
        let spk = u.speaking || [];
        if (!spk.length && defUnit?.speaking) {
          spk = clone(defUnit.speaking);
        } else if (defUnit?.speaking) {
          defUnit.speaking.forEach(defItem => {
            if (!spk.some(s => s.id === defItem.id || s.title === defItem.title)) {
              spk.unshift(clone(defItem));
            }
          });
        }

        return {
          id: u.id,
          subject: normalizeSubjectName(u.subject),
          module: normalizeModuleName(u.module),
          title: u.title,
          topic: u.topic || '',
          level: u.level || 'A2 - B1',
          icon: u.icon || '📖',
          description: u.description || '',
          isHidden: u.is_hidden ?? false,
          listening: (u.listening && u.listening.length) ? u.listening : (defUnit?.listening || []),
          reading: (u.reading && u.reading.length) ? u.reading : (defUnit?.reading || []),
          speaking: spk,
          writing: (u.writing && u.writing.length) ? u.writing : (defUnit?.writing || []),
          languageFocus: u.language_focus || u.languageFocus || defUnit?.languageFocus || {}
        };
      });

      // Bổ sung các unit mẫu mặc định nếu chưa có
      DEFAULT_UNITS.forEach(defUnit => {
        if (!unitsState.some(u => u.id === defUnit.id)) {
          unitsState.push(clone(defUnit));
        }
      });
    }
  } catch (err) {
    console.error("Lỗi loadUnits:", err);
    unitsState = clone(DEFAULT_UNITS);
  }
  populateUnitFilters();
}

// Cập nhật các lựa chọn cho Bộ lọc Môn học & Học phần trên bảng giáo viên
export function populateUnitFilters() {
  const subSel = document.getElementById('flt-unit-subject');
  if (!subSel) return;

  const currentSub = subSel.value;

  // Lấy toàn bộ danh sách Môn học từ subjectsList + unitsState (tất cả đều chuẩn hóa)
  const subjectsMap = new Map();
  
  // 1. Thêm từ subjectsList trong curriculum.js
  (subjectsList || []).forEach(s => {
    const norm = normalizeSubjectName(s.name);
    subjectsMap.set(norm, norm);
  });

  // 2. Thêm từ các units hiện có
  unitsState.forEach(u => {
    if (u.subject) {
      const norm = normalizeSubjectName(u.subject);
      u.subject = norm;
      subjectsMap.set(norm, norm);
    }
  });

  const uniqueSubjects = Array.from(subjectsMap.values());

  subSel.innerHTML = '<option value="">✓ Tất cả Môn học</option>' + uniqueSubjects.map(s => `
    <option value="${esc(s)}" ${s === currentSub ? 'selected' : ''}>${esc(s)}</option>
  `).join('');

  updateModuleFilterOptions();
  updateDatalists();
}

export function updateModuleFilterOptions() {
  const subSel = document.getElementById('flt-unit-subject');
  const modSel = document.getElementById('flt-unit-module');
  if (!modSel) return;

  const selSubject = subSel?.value;
  const currentMod = modSel.value;
  const modulesMap = new Map();

  if (!selSubject) {
    // Nếu chọn Tất cả Môn: Lấy toàn bộ modules từ modulesList + unitsState
    (modulesList || []).forEach(m => modulesMap.set(m.title, m.title));
    unitsState.forEach(u => {
      if (u.module) modulesMap.set(u.module, u.module);
    });
  } else {
    // Lấy modules thuộc môn học đã chọn
    const matchedSub = (subjectsList || []).find(s => 
      s.name === selSubject || 
      selSubject.includes(s.code) || 
      selSubject.toLowerCase().includes(s.name.toLowerCase().replace(/^[^\w\s\u00C0-\u1EF9]+/u, '').trim())
    );

    if (matchedSub) {
      (modulesList || []).filter(m => m.subject_id === matchedSub.id).forEach(m => {
        modulesMap.set(m.title, m.title);
      });
    }

    unitsState.filter(u => matchSubject(u.subject, selSubject)).forEach(u => {
      if (u.module) modulesMap.set(u.module, u.module);
    });
  }

  const uniqueModules = Array.from(modulesMap.values());
  modSel.innerHTML = '<option value="">✓ Tất cả Học phần</option>' + uniqueModules.map(m => `
    <option value="${esc(m)}" ${m === currentMod ? 'selected' : ''}>${esc(m)}</option>
  `).join('');
}

// Cập nhật Datalist cho Modal Designer
export function updateDatalists() {
  const dlSubjects = document.getElementById('dl-subjects');
  const dlModules = document.getElementById('dl-modules');

  if (dlSubjects) {
    const subs = new Set();
    (subjectsList || []).forEach(s => subs.add(s.name));
    unitsState.forEach(u => { if (u.subject) subs.add(u.subject); });
    dlSubjects.innerHTML = Array.from(subs).map(s => `<option value="${esc(s)}">`).join('');
  }

  if (dlModules) {
    const mods = new Set();
    (modulesList || []).forEach(m => mods.add(m.title));
    unitsState.forEach(u => { if (u.module) mods.add(u.module); });
    dlModules.innerHTML = Array.from(mods).map(m => `<option value="${esc(m)}">`).join('');
  }
}

function matchSubject(unitSub, targetSub) {
  if (!targetSub) return true;
  if (!unitSub) return false;
  if (unitSub === targetSub) return true;
  const cleanU = unitSub.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/gu, '').trim();
  const cleanT = targetSub.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/gu, '').trim();
  return cleanU.includes(cleanT) || cleanT.includes(cleanU);
}

function matchModule(unitMod, targetMod) {
  if (!targetMod) return true;
  if (!unitMod) return false;
  if (unitMod === targetMod) return true;
  const cleanU = unitMod.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/gu, '').trim();
  const cleanT = targetMod.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/gu, '').trim();
  return cleanU.includes(cleanT) || cleanT.includes(cleanU);
}

window.onUnitFilterChange = function() {
  updateModuleFilterOptions();
  renderUnitsList();
};

// 2. RENDER DANH SÁCH UNIT TRÊN BẢNG ĐIỀU KHIỂN
export function renderUnitsList() {
  const container = document.getElementById('unit-management-list');
  const countEl = document.getElementById('unit-count-badge');
  if (!container) return;

  const selSub = document.getElementById('flt-unit-subject')?.value;
  const selMod = document.getElementById('flt-unit-module')?.value;
  const searchTxt = (document.getElementById('flt-unit-search')?.value || '').toLowerCase().trim();

  let list = unitsState.filter(u => {
    if (selSub && !matchSubject(u.subject, selSub)) return false;
    if (selMod && !matchModule(u.module, selMod)) return false;
    if (searchTxt) {
      const matchTitle = (u.title || '').toLowerCase().includes(searchTxt);
      const matchTopic = (u.topic || '').toLowerCase().includes(searchTxt);
      const matchDesc = (u.description || '').toLowerCase().includes(searchTxt);
      if (!matchTitle && !matchTopic && !matchDesc) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = list.length;

  if (!list.length) {
    container.innerHTML = '<div class="empty" style="text-align:center;padding:30px;color:#94a3b8">📭 Không tìm thấy Unit bài học nào phù hợp với bộ lọc. Bấm "+ Tạo Unit Mới" để thiết kế bài học!</div>';
    return;
  }

  container.innerHTML = list.map((u, idx) => {
    const isHidden = u.isHidden;
    const lisCount = (u.listening || []).length;
    const readCount = (u.reading || []).length;
    const spkCount = (u.speaking || []).length;
    const wrtCount = (u.writing || []).length;
    const fcCount = (u.languageFocus?.flashcards || []).length;
    const canEdit = canEditItem(u, state.currentUserEmail);
    const authorName = getAuthorDisplayName(u.created_by);
    const authorBadge = u.created_by ? `<span class="cat-badge" style="background:#f1f5f9;color:#475569" title="Người tạo: ${esc(authorName)} (${esc(u.created_by)})">👤 ${esc(authorName)}</span>` : '';

    const isEng = (u.subject || '').includes('Tiếng Anh') || (u.subject || '').includes('English');
    const badge1 = isEng ? `🎧 Listening (${lisCount})` : `📖 Lý thuyết (${lisCount})`;
    const badge2 = isEng ? `📖 Reading (${readCount})` : `💡 Ví dụ (${readCount})`;
    const badge3 = isEng ? `🗣️ Speaking (${spkCount})` : `🗣️ Đọc công thức (${spkCount})`;
    const badge4 = isEng ? `✍️ Writing (${wrtCount})` : `✍️ Tự luyện (${wrtCount})`;
    const badge5 = isEng ? `🔍 Flashcards (${fcCount})` : `🧠 Thẻ ghi nhớ (${fcCount})`;
    const editBtnLabel = isEng ? '🎛️ Thiết kế 5 Kỹ năng' : '🎛️ Biên soạn Bài học Tương tác';

    return `
      <div class="qitem" style="border-left: 4px solid ${isHidden ? '#94a3b8' : '#3b82f6'}; margin-bottom:12px;">
        <div class="qrow">
          <div style="flex:1">
            <!-- PHÂN CẤP: MÔN HỌC & HỌC PHẦN -->
            <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
              <span class="cat-badge" style="background:#eff6ff;color:#1e40af;font-weight:700">📚 ${esc(u.subject || '🇬🇧 Tiếng Anh')}</span>
              <span class="cat-badge" style="background:#f0fdf4;color:#166534;font-weight:700">📦 ${esc(u.module || 'English B1 - General & Academic Skills')}</span>
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span style="font-size:20px">${u.icon || '📖'}</span>
              <span style="font-size:16px;font-weight:700;color:#1e293b">${esc(u.title)}</span>
              <span class="cat-badge" style="background:#e0f2fe;color:#0369a1">${esc(u.level || 'A2')}</span>
              ${authorBadge}
              <span class="badge-status ${isHidden ? 'status-hidden' : 'status-active'}">${isHidden ? 'Đã ẩn' : 'Đang mở'}</span>
            </div>
            <div style="font-size:13px;color:#64748b;margin-bottom:8px">${esc(u.description || u.topic || '')}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:12px">
              <span class="abadge">${badge1}</span>
              <span class="abadge">${badge2}</span>
              <span class="abadge">${badge3}</span>
              <span class="abadge">${badge4}</span>
              <span class="abadge">${badge5}</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end">
            ${canEdit ? `
              <button class="btn btn-sm" onclick="window.openUnitEditor('${u.id}')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">
                ${editBtnLabel}
              </button>
              <button class="btn btn-sm ${isHidden ? 'btn-warn' : 'btn-p'}" onclick="window.toggleUnitVisibility('${u.id}')">
                ${isHidden ? '👁️ Mở Unit' : '🙈 Ẩn Unit'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteUnit('${u.id}')">
                🗑️ Xóa
              </button>
            ` : `
              <span style="font-size:12px;color:#94a3b8;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0" title="Chỉ người tạo hoặc Root Admin mới có quyền sửa/xóa">🔒 Chỉ xem</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. MỞ MODAL THIẾT KẾ UNIT & 5 KỸ NĂNG
export function openUnitEditor(unitId = null, defaultSubject = '', defaultModule = '') {
  editingUnitId = unitId;
  const modal = document.getElementById('unit-designer-modal');
  if (!modal) return;

  updateDatalists();

  const unit = unitId ? unitsState.find(u => u.id === unitId) : {
    id: 'unit_' + Date.now(),
    subject: defaultSubject || '🇬🇧 Tiếng Anh',
    module: defaultModule || 'English B1 - General & Academic Skills',
    title: 'Unit ' + (unitsState.length + 1) + ': New Topic',
    topic: 'General Topic',
    level: 'A2 - B1',
    icon: '📚',
    description: '',
    isHidden: false,
    listening: [
      {
        id: 'lis_' + Date.now(),
        title: 'Listening Practice 1',
        topic: 'General',
        level: 'A2',
        audioText: 'Welcome to this lesson. Please listen carefully to the instructions.',
        duration: '30s',
        exercises: [
          {
            type: 'mcq',
            question: 'What is the main topic of the conversation?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: 0,
            explain: 'The audio mentions...'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_' + Date.now(),
        title: 'Reading Comprehension 1',
        topic: 'General',
        level: 'A2',
        passage: 'Reading in English every day helps expand your vocabulary and improve comprehension.',
        vocabulary: {
          'expand': { ipa: '/ɪkˈspænd/', pos: 'verb', meaning: 'Mở rộng, phát triển' },
          'comprehension': { ipa: '/ˌkɒm.prɪˈhen.ʃən/', pos: 'noun', meaning: 'Sự hiểu, khả năng lĩnh hội' }
        },
        exercises: [
          {
            type: 'mcq',
            question: 'What does daily reading help with?',
            options: ['Expanding vocabulary', 'Cooking food', 'Playing sports', 'Fixing cars'],
            answer: 0,
            explain: 'The passage says reading expands vocabulary.'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_' + Date.now(),
        title: 'Speaking Fluency Practice',
        topic: 'Daily Conversation',
        level: 'A2',
        phrases: [
          {
            text: 'Practice makes perfect in English learning.',
            ipa: '/ˈpræk.tɪs meɪks ˈpɜː.fɪkt ɪn ˈɪŋ.ɡlɪʃ ˈlɜː.nɪŋ/',
            meaning: 'Rèn luyện nhiều sẽ tạo nên sự hoàn hảo.',
            tip: 'Chú ý phát âm chuẩn âm cuối /s/.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_scramble_' + Date.now(),
        title: 'Sentence Scramble',
        topic: 'Grammar Structure',
        level: 'A2',
        items: [
          {
            id: 'sc_1',
            words: ['Learning', 'English', 'is', 'fun', 'and', 'useful.'],
            correctSentence: 'Learning English is fun and useful.',
            hint: 'Bắt đầu bằng danh động từ "Learning..."'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_1',
          word: 'Enthusiastic',
          pos: 'adjective',
          ipa: '/ɪnˌθjuː.ziˈæs.tɪk/',
          meaning: 'Hăng hái, nhiệt tình, đầy hứng khởi',
          example: 'She was enthusiastic about learning new foreign languages.',
          synonyms: 'Eager, passionate, excited'
        }
      ],
      matchPairs: [
        { left: 'Piece of cake', right: 'Rất dễ dàng', pairId: 1 }
      ],
      grammarChallenge: [
        {
          id: 'gm_1',
          question: 'She ___ English for five years.',
          options: ['has learned', 'is learning', 'learns', 'learned'],
          answer: 0,
          explain: 'Thì Hiện tại hoàn thành với "for five years".'
        }
      ]
    }
  };

  // Đổ thông tin cơ bản vào form
  const currentSub = unit.subject || defaultSubject || '🇬🇧 Tiếng Anh';
  if ($('ud-subject')) $('ud-subject').value = currentSub;
  if ($('ud-module')) $('ud-module').value = unit.module || defaultModule || 'English B1 - General & Academic Skills';
  if ($('ud-title')) $('ud-title').value = unit.title || '';
  if ($('ud-topic')) $('ud-topic').value = unit.topic || '';
  if ($('ud-level')) $('ud-level').value = unit.level || 'A2 - B1';
  if ($('ud-icon')) $('ud-icon').value = unit.icon || '📖';
  if ($('ud-desc')) $('ud-desc').value = unit.description || '';

  // Cập nhật nhãn và tab theo loại môn học (Tiếng Anh vs Các môn khác)
  updateDesignerSubjectLabels(currentSub);

  // Lưu tạm unit đang chỉnh sửa vào window._currentDraftUnit
  window._currentDraftUnit = clone(unit);

  // Mở tab kỹ năng mặc định và hiển thị modal
  modal.style.display = 'flex';
  switchDesignerSkillTab('listening');
  setTimeout(autoFitAllDesignerTextareas, 60);
}

export function updateDesignerSubjectLabels(sub) {
  const isEng = !sub || sub.includes('Tiếng Anh') || sub.includes('English');
  const titleEl = document.getElementById('ud-modal-title');
  const subTitleEl = document.getElementById('ud-modal-subtitle');
  const sectionLabel = document.getElementById('ud-section-label');
  
  if (titleEl) {
    titleEl.textContent = isEng ? '🎛️ Thiết Kế UNIT Bài Học (5 Kỹ Năng Tiếng Anh)' : `🎛️ Biên Soạn Bài Học Tương Tác (${sub || 'Môn Học'})`;
  }
  if (subTitleEl) {
    subTitleEl.textContent = isEng 
      ? 'Soạn nội dung bài học tương tác: Listening, Reading, Speaking, Writing, Language Focus'
      : 'Soạn nội dung bài học tương tác: Lý thuyết bài giảng, Ví dụ mẫu, Đọc công thức, Bài tập tự luyện, Sổ tay ghi nhớ';
  }
  if (sectionLabel) {
    sectionLabel.textContent = isEng ? '⚙️ CHỌN KỸ NĂNG ĐỂ THIẾT KẾ:' : '⚙️ CHỌN HẠNG MỤC NỘI DUNG TƯƠNG TÁC:';
  }

  const tabRow = document.getElementById('ud-tab-row');
  if (tabRow) {
    if (isEng) {
      tabRow.innerHTML = `
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchDesignerSkillTab('listening')">🎧 1. Listening</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchDesignerSkillTab('reading')">📖 2. Reading</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchDesignerSkillTab('speaking')">🗣️ 3. Speaking</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchDesignerSkillTab('writing')">✍️ 4. Writing</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchDesignerSkillTab('languageFocus')">🔍 5. Language Focus</button>
      `;
    } else {
      tabRow.innerHTML = `
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchDesignerSkillTab('listening')">📖 1. Lý Thuyết & Bài Giảng</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchDesignerSkillTab('reading')">💡 2. Ví Dụ Minh Họa</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchDesignerSkillTab('speaking')">🗣️ 3. Đọc Công Thức / Code</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchDesignerSkillTab('writing')">✍️ 4. Bài Tập Tự Luyện</button>
        <button type="button" class="tab-btn ud-skill-tab ${currentDesignerSkill === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchDesignerSkillTab('languageFocus')">🧠 5. Sổ Tay Ghi Nhớ & Trắc Nghiệm</button>
      `;
    }
  }
}

window.onDesignerSubjectInput = function(val) {
  updateDesignerSubjectLabels(val);
};

export function closeUnitEditor() {
  const modal = document.getElementById('unit-designer-modal');
  if (modal) modal.style.display = 'none';
  editingUnitId = null;
  window._currentDraftUnit = null;
}

// Hàm tự động căn chỉnh chiều cao textarea theo toàn bộ nội dung
export function autoFitAllDesignerTextareas() {
  requestAnimationFrame(() => {
    const textareas = document.querySelectorAll('#unit-designer-modal textarea');
    textareas.forEach(ta => {
      ta.style.height = 'auto';
      const newH = Math.max(ta.scrollHeight + 8, 120);
      ta.style.height = newH + 'px';
      
      ta.oninput = () => {
        ta.style.height = 'auto';
        ta.style.height = Math.max(ta.scrollHeight + 8, 120) + 'px';
      };
    });
  });
}

// 4. CHUYỂN TAB THIẾT KẾ 5 KỸ NĂNG BÊN TRONG MODAL
export function switchDesignerSkillTab(skill) {
  currentDesignerSkill = skill;
  document.querySelectorAll('.ud-skill-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.skill === skill);
  });

  const contentWrap = document.getElementById('ud-skill-content');
  if (!contentWrap || !window._currentDraftUnit) return;

  const unit = window._currentDraftUnit;

  if (skill === 'listening') {
    const lis = (unit.listening && unit.listening[0]) || { audioText: '', exercises: [] };
    const detectedMode = lis.mediaType || (lis.videoUrl ? 'video' : (lis.audioUrl ? 'audio' : 'tts'));

    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:20px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:14px">
        <!-- HEADER PHÂN HỆ LISTENING & VIDEO -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:16px;font-weight:800;color:#0f172a">🎧 Thiết Kế Bài Luyện Nghe & Video (Listening & Video Comprehension)</div>
            <div style="font-size:12px;color:#64748b">Tải file âm thanh/video lên máy chủ hoặc dán đường dẫn trực tiếp kèm bài tập tương tác</div>
          </div>
          <input type="hidden" id="ud-lis-media-type" value="${esc(detectedMode)}">
        </div>

        <!-- 1. BỘ CHỌN LOẠI MEDIA (AUDIO / VIDEO / TTS) -->
        <div class="fg" style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px">1. Định dạng nguồn nội dung (Media Source Type) *</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" id="btn-mode-lis-audio" class="btn btn-sm ${detectedMode === 'audio' ? 'btn-p' : ''}" onclick="window.switchDesignerListeningMediaType('audio')" style="display:flex;align-items:center;gap:6px">
              <span>🎵</span> 1. File Âm Thanh (Audio Upload / URL)
            </button>
            <button type="button" id="btn-mode-lis-video" class="btn btn-sm ${detectedMode === 'video' ? 'btn-p' : ''}" onclick="window.switchDesignerListeningMediaType('video')" style="display:flex;align-items:center;gap:6px">
              <span>🎬</span> 2. Video Clip (.mp4 / .webm / YouTube)
            </button>
            <button type="button" id="btn-mode-lis-tts" class="btn btn-sm ${detectedMode === 'tts' ? 'btn-p' : ''}" onclick="window.switchDesignerListeningMediaType('tts')" style="display:flex;align-items:center;gap:6px">
              <span>🗣️</span> 3. Giọng Đọc AI (Text-to-Speech)
            </button>
          </div>
        </div>

        <!-- 2. KHUNG CẤU HÌNH MEDIA THEO TỪNG LOẠI -->
        <!-- 2.1 SECTION AUDIO -->
        <div id="ud-lis-sec-audio" style="display:${detectedMode === 'audio' ? 'block' : 'none'};background:#f0f9ff;padding:14px;border-radius:10px;border:1.5px solid #bae6fd;margin-bottom:16px">
          <label style="font-size:12.5px;font-weight:700;color:#0369a1;margin-bottom:6px;display:block">🎵 Tải File Âm Thanh Lên Supabase Storage (.mp3, .wav, .m4a, .ogg)</label>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input type="text" id="ud-lis-audio-url" placeholder="VD: https://.../audio.mp3 hoặc bấm Upload tải lên" value="${esc(lis.audioUrl || '')}" style="flex:1" oninput="window.updateListeningAudioPreview(this.value)">
            <input type="file" id="ud-lis-audio-file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac" style="display:none" onchange="window.handleUploadListeningAudio(this)">
            <button type="button" class="btn btn-sm btn-p" onclick="document.getElementById('ud-lis-audio-file').click()" style="white-space:nowrap;display:flex;align-items:center;gap:6px">
              <span>📂</span> Tải Lên Audio
            </button>
          </div>
          <!-- Tiến độ upload Audio -->
          <div id="ud-lis-audio-progress-wrap" style="display:none;margin-bottom:8px">
            <div style="font-size:11.5px;color:#0284c7;font-weight:700;margin-bottom:4px" id="ud-lis-audio-progress-pct">Đang tải lên: 0%</div>
            <div style="height:6px;background:#e0f2fe;border-radius:4px;overflow:hidden">
              <div id="ud-lis-audio-progress-bar" style="height:100%;width:0%;background:#0284c7;transition:width 0.3s"></div>
            </div>
          </div>
          <!-- Audio Preview -->
          <div id="ud-lis-audio-preview">
            ${lis.audioUrl ? `
              <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
                <audio controls src="${esc(lis.audioUrl)}" style="height:36px;flex:1"></audio>
                <button type="button" class="btn btn-sm" onclick="window.clearListeningAudio()" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px">🗑️ Xóa</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 2.2 SECTION VIDEO -->
        <div id="ud-lis-sec-video" style="display:${detectedMode === 'video' ? 'block' : 'none'};background:#fdf2f8;padding:14px;border-radius:10px;border:1.5px solid #fbcfe8;margin-bottom:16px">
          <label style="font-size:12.5px;font-weight:700;color:#9d174d;margin-bottom:6px;display:block">🎬 Tải File Video Lên Supabase Storage (.mp4, .webm, .mov) hoặc dán link YouTube / MP4</label>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input type="text" id="ud-lis-video-url" placeholder="VD: https://.../video.mp4 hoặc https://youtube.com/watch?v=..." value="${esc(lis.videoUrl || '')}" style="flex:1" oninput="window.updateListeningVideoPreview(this.value)">
            <input type="file" id="ud-lis-video-file" accept="video/*,.mp4,.webm,.mov" style="display:none" onchange="window.handleUploadListeningVideo(this)">
            <button type="button" class="btn btn-sm btn-p" onclick="document.getElementById('ud-lis-video-file').click()" style="white-space:nowrap;display:flex;align-items:center;gap:6px">
              <span>📂</span> Tải Lên Video
            </button>
          </div>
          <!-- Tiến độ upload Video -->
          <div id="ud-lis-video-progress-wrap" style="display:none;margin-bottom:8px">
            <div style="font-size:11.5px;color:#db2777;font-weight:700;margin-bottom:4px" id="ud-lis-video-progress-pct">Đang tải video: 0%</div>
            <div style="height:6px;background:#fce7f3;border-radius:4px;overflow:hidden">
              <div id="ud-lis-video-progress-bar" style="height:100%;width:0%;background:#db2777;transition:width 0.3s"></div>
            </div>
          </div>
          <!-- Video Preview -->
          <div id="ud-lis-video-preview">
            ${lis.videoUrl ? `
              <div style="margin-top:6px">
                <video controls playsinline src="${esc(lis.videoUrl)}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid #cbd5e1;background:#000;display:block"></video>
                <div style="margin-top:6px"><button type="button" class="btn btn-sm" onclick="window.clearListeningVideo()" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px">🗑️ Xóa Video</button></div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 2.3 SECTION TTS (GIỌNG ĐỌC AI) -->
        <div id="ud-lis-sec-tts" style="display:${detectedMode === 'tts' ? 'block' : 'none'};background:#f5f3ff;padding:14px;border-radius:10px;border:1.5px solid #ddd6fe;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-size:12.5px;font-weight:700;color:#5b21b6">🗣️ Văn Bản Phát Âm Bằng Giọng AI (Web Speech TTS) *</label>
            <button type="button" class="btn btn-sm" onclick="window.testListeningTTS()" style="font-size:11px;padding:3px 8px;background:#fff;border:1px solid #c4b5fd;color:#6d28d9">🔊 Nghe thử AI Voice</button>
          </div>
          <textarea id="ud-lis-text" class="designer-textarea" style="width:100%;min-height:110px;font-size:14px;line-height:1.6" placeholder="Nhập đoạn hội thoại hoặc văn bản tiếng Anh để AI đọc...">${esc(lis.audioText || '')}</textarea>
        </div>

        <!-- 3. THÔNG TIN BÀI HỌC, TRANSCRIPT & HÌNH ẢNH -->
        <div class="grid2" style="margin-bottom:12px">
          <div class="fg" style="margin:0">
            <label style="font-size:12px;font-weight:700">Tiêu đề bài nghe / video *</label>
            <input type="text" id="ud-lis-title" value="${esc(lis.title || '🎧 Audio: Luyện Nghe Giao Tiếp')}" placeholder="VD: 🎧 Audio: A Conversation at the Airport">
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:12px;font-weight:700">Thời lượng ước tính</label>
            <input type="text" id="ud-lis-duration" value="${esc(lis.duration || '45s')}" placeholder="VD: 45s, 1m 30s">
          </div>
        </div>

        <div class="fg" style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:700;color:#1e293b">📝 Kịch Bản Văn Bản / Phụ Đề Chi Tiết (Transcript) (Tùy chọn)</label>
          <div style="font-size:11px;color:#64748b;margin-bottom:4px">Học sinh có thể nhấn nút "Hiện Transcript" để xem lại sau khi nghe/xem video:</div>
          <textarea id="ud-lis-transcript" class="designer-textarea" style="width:100%;min-height:100px;font-size:13.5px;line-height:1.6" placeholder="Nhập lời thoại chi tiết theo từng người nói...">${esc(lis.transcript || lis.audioText || '')}</textarea>
        </div>

        <div class="fg" style="margin-bottom:16px">
          <label style="font-size:12px;font-weight:700;color:#1e293b">🖼️ Hình ảnh minh họa (Thumbnail / Poster)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="ud-lis-image" placeholder="VD: https://images.unsplash.com/... hoặc chọn từ thư viện" value="${esc(lis.image || '')}">
            <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-lis-image', 'ud-lis-img-preview')" style="white-space:nowrap">📂 Thư viện ảnh</button>
          </div>
          <div id="ud-lis-img-preview" style="margin-top:6px">${lis.image ? `<img src="${esc(lis.image)}" style="max-height:120px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
        </div>

        <!-- 4. BỘ SOẠN CÂU HỎI TƯƠNG TÁC (INTERACTIVE EXERCISES BUILDER) -->
        <div style="margin-top:20px;padding-top:16px;border-top:1.5px solid #e2e8f0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:14px;font-weight:800;color:#0f172a">📝 4. Danh Sách Câu Hỏi & Bài Tập Tương Tác</div>
              <div style="font-size:11.5px;color:#64748b">Học viên sẽ trả lời các câu hỏi này sau khi nghe hoặc xem video</div>
            </div>
          </div>

          <!-- DANH SÁCH THẺ BÀI TẬP HIỆN TẠI -->
          <div id="ud-lis-exercises-list" style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
            ${renderListeningDesignerExercises(lis.exercises || [])}
          </div>

          <!-- NÚT BỔ SUNG CÁC DẠNG BÀI TẬP -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;background:#eff6ff;padding:10px 14px;border-radius:10px;border:1px dashed #93c5fd;align-items:center">
            <span style="font-size:12px;font-weight:700;color:#1e40af">➕ Thêm câu hỏi:</span>
            <button type="button" class="btn btn-sm" onclick="window.addListeningDesignerExercise('mcq')" style="background:#fff;border:1px solid #93c5fd;color:#1d4ed8;font-size:12px">🔘 Trắc Nghiệm (MCQ)</button>
            <button type="button" class="btn btn-sm" onclick="window.addListeningDesignerExercise('dictation')" style="background:#fff;border:1px solid #86efac;color:#15803d;font-size:12px">✍️ Chép Chính Tả (Dictation)</button>
            <button type="button" class="btn btn-sm" onclick="window.addListeningDesignerExercise('gap_fill')" style="background:#fff;border:1px solid #fde68a;color:#b45309;font-size:12px">🔤 Điền Chỗ Trống (Gap Fill)</button>
            <button type="button" class="btn btn-sm" onclick="window.addListeningDesignerExercise('true_false')" style="background:#fff;border:1px solid #fbcfe8;color:#be185d;font-size:12px">⚖️ Đúng / Sai (True/False)</button>
            <button type="button" class="btn btn-sm" onclick="window.addListeningDesignerExercise('short_answer')" style="background:#fff;border:1px solid #7dd3fc;color:#0284c7;font-size:12px">💬 Trả Lời Câu Hỏi (Short Answer)</button>
          </div>
        </div>
      </div>
    `;
  } else if (skill === 'reading') {
    const read = (unit.reading && unit.reading[0]) || { passage: '', vocabulary: {}, image: '', exercises: [] };
    const exercises = read.exercises || [];

    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
        <div class="fg">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">📖 1. Đoạn Văn Đọc Hiểu (Reading Passage) *</label>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">Đoạn văn đọc hiểu sẽ hiển thị toàn bộ cho học sinh đọc và tra từ tức thì:</div>
          <textarea id="ud-read-passage" class="designer-textarea" style="width:100%;min-height:180px;font-size:14.5px;line-height:1.6;" placeholder="Nhập nội dung bài đọc...">${esc(read.passage || '')}</textarea>
        </div>

        <div class="fg" style="margin-top:14px">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">🖼️ Hình ảnh minh họa bài đọc (Tùy chọn)</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="ud-read-image" placeholder="VD: https://images.unsplash.com/... hoặc chọn từ thư viện" value="${esc(read.image || '')}">
            <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-read-image', 'ud-read-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
          </div>
          <div id="ud-read-img-preview" style="margin-top:6px">${read.image ? `<img src="${read.image}" style="max-height:140px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
        </div>

        <div class="fg" style="margin-top:14px">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">🔤 2. Danh Mục Tra Từ Nhanh (JSON Dictionary)</label>
          <textarea id="ud-read-vocab" class="designer-textarea" style="width:100%;min-height:100px;font-family:monospace;font-size:13px">${esc(JSON.stringify(read.vocabulary || {}, null, 2))}</textarea>
        </div>

        <!-- BÀI TẬP ĐỌC HIỂU TƯƠNG TÁC (MATCHING, MCQ, BACKWARD SPELLING) -->
        <div style="margin-top:20px;border-top:1.5px solid #cbd5e1;padding-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:14px;font-weight:800;color:#1e293b">🧩 3. Bài Tập Đọc Hiểu Tương Tác (Interactive Exercises)</div>
              <div style="font-size:12px;color:#64748b">Bao gồm Nối từ 1-8 với định nghĩa a-h, Trắc nghiệm MCQ, và Backward Spelling</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn btn-sm" onclick="window.addReadingDesignerExercise('matching')" style="background:#fff;border:1px solid #818cf8;color:#4338ca;font-size:12px;font-weight:700">🧩 1. Nối Từ (Matching)</button>
              <button type="button" class="btn btn-sm" onclick="window.addReadingDesignerExercise('mcq')" style="background:#fff;border:1px solid #93c5fd;color:#1d4ed8;font-size:12px;font-weight:700">🔘 2. Trắc Nghiệm (MCQ)</button>
              <button type="button" class="btn btn-sm" onclick="window.addReadingDesignerExercise('backward_spelling')" style="background:#fff;border:1px solid #c084fc;color:#7e22ce;font-size:12px;font-weight:700">🔤 3. Backward Spelling</button>
            </div>
          </div>

          <div id="ud-read-exercises-list" style="display:flex;flex-direction:column;gap:14px">
            ${renderReadingDesignerExercises(exercises)}
          </div>
        </div>
      </div>
    `;
  } else if (skill === 'speaking') {
    const spk = (unit.speaking && unit.speaking[0]) || { phrases: [] };
    const isVideoRp = spk.type === 'video_roleplay' || (spk.characterA && spk.characterB) || (spk.dialogue && spk.dialogue.length > 0);
    const p1 = spk.phrases?.[0] || { text: 'Practice makes perfect.', ipa: '', meaning: 'Rèn luyện tạo nên sự hoàn hảo', image: '', tip: '' };
    
    const charA = spk.characterA || { name: 'Emma (Lễ tân)', avatar: '👩‍💼', roleTitle: 'Hotel Receptionist', color: '#2563eb' };
    const charB = spk.characterB || { name: 'David (Du khách)', avatar: '🧑‍🦱', roleTitle: 'Guest / Traveler', color: '#059669' };
    const turns = (spk.dialogue && spk.dialogue.length) ? spk.dialogue : [
      { id: 'dlg_1', speaker: 'A', speakerName: charA.name, text: 'Good morning! Welcome to Grand Palace Hotel. How may I help you today?', ipa: '/ɡʊd ˈmɔː.nɪŋ! ˈwel.kəm tuː ɡrænd ˈpæl.ɪs həʊˈtel. haʊ meɪ aɪ help juː təˈdeɪ?/', meaning: 'Chào buổi sáng! Chào mừng quý khách đến khách sạn. Tôi có thể giúp gì cho quý khách?', tip: 'Nối âm help-you, nhấn trọng âm welcome, hotel.', videoUrl: '' },
      { id: 'dlg_2', speaker: 'B', speakerName: charB.name, text: 'Hi! I have a reservation under the name David Miller for two nights.', ipa: '/haɪ! aɪ hæv ə ˌrez.əˈveɪ.ʃən ˈʌn.dər ðə neɪm ˈdeɪ.vɪd ˈmɪl.ər fɔːr tuː naɪts/', meaning: 'Chào bạn! Tôi có đặt phòng dưới tên David Miller trong hai đêm.', tip: 'Âm cuối nights và reservation.', videoUrl: '' }
    ];

    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px">
        <!-- BỘ CHỌN CHẾ ĐỘ PHÁT ÂM -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:15px;font-weight:800;color:#0f172a">🗣️ Thiết Kế Kỹ Năng Speaking</div>
            <div style="font-size:12px;color:#64748b">Chọn định dạng bài học: Luyện Video Roleplay 2 nhân vật A-B hoặc Luyện câu đơn lẻ</div>
          </div>

          <div style="display:flex;gap:6px">
            <button type="button" class="btn btn-sm ${isVideoRp ? 'btn-p' : ''}" id="btn-mode-spk-rp" onclick="window.switchDesignerSpeakingMode('video_roleplay')" style="font-size:12px;font-weight:700">
              🎬 1. Hội thoại Video 2 Nhân Vật (A & B)
            </button>
            <button type="button" class="btn btn-sm ${!isVideoRp ? 'btn-p' : ''}" id="btn-mode-spk-phrase" onclick="window.switchDesignerSpeakingMode('phrases')" style="font-size:12px;font-weight:700">
              🗣️ 2. Luyện câu phát âm đơn
            </button>
          </div>
        </div>

        <input type="hidden" id="ud-spk-type" value="${isVideoRp ? 'video_roleplay' : 'phrases'}">

        <!-- ============================================================== -->
        <!-- FORM 1: HỘI THOẠI VIDEO 2 NHÂN VẬT A & B (ROLEPLAY STUDIO) -->
        <!-- ============================================================== -->
        <div id="ud-spk-roleplay-section" style="${isVideoRp ? '' : 'display:none'}">
          <!-- 1. CẤU HÌNH 2 NHÂN VẬT -->
          <div style="font-weight:800;font-size:13.5px;color:#1e40af;margin-bottom:10px">
            🎭 1. CẤU HÌNH THÔNG TIN 2 NHÂN VẬT ĐỐI THOẠI:
          </div>
          <div class="grid2" style="margin-bottom:16px">
            <!-- NHÂN VẬT A -->
            <div style="background:#eff6ff;padding:14px;border-radius:10px;border:1.5px solid #bfdbfe">
              <div style="font-weight:800;font-size:13px;color:#1d4ed8;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                <span>👩‍💼</span> <span>NHÂN VẬT A (NGƯỜI BẮT ĐẦU / CHỦ ĐỘNG)</span>
              </div>
              <div class="grid2" style="margin:0 0 8px 0">
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#1e40af">Tên nhân vật A *</label><input type="text" id="ud-charA-name" value="${esc(charA.name || 'Emma (Lễ tân)')}"></div>
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#1e40af">Avatar / Emoji</label><input type="text" id="ud-charA-avatar" value="${esc(charA.avatar || '👩‍💼')}"></div>
              </div>
              <div class="grid2" style="margin:0">
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#1e40af">Chức danh / Vai trò</label><input type="text" id="ud-charA-title" value="${esc(charA.roleTitle || 'Hotel Receptionist')}"></div>
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#1e40af">Mã màu đại diện</label><input type="color" id="ud-charA-color" value="${charA.color || '#2563eb'}" style="height:38px;padding:2px"></div>
              </div>
            </div>

            <!-- NHÂN VẬT B -->
            <div style="background:#f0fdf4;padding:14px;border-radius:10px;border:1.5px solid #bbf7d0">
              <div style="font-weight:800;font-size:13px;color:#15803d;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                <span>🧑‍💼</span> <span>NHÂN VẬT B (NGƯỜI PHẢN HỒI)</span>
              </div>
              <div class="grid2" style="margin:0 0 8px 0">
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#15803d">Tên nhân vật B *</label><input type="text" id="ud-charB-name" value="${esc(charB.name || 'David (Du khách)')}"></div>
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#15803d">Avatar / Emoji</label><input type="text" id="ud-charB-avatar" value="${esc(charB.avatar || '🧑‍🦱')}"></div>
              </div>
              <div class="grid2" style="margin:0">
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#15803d">Chức danh / Vai trò</label><input type="text" id="ud-charB-title" value="${esc(charB.roleTitle || 'Guest / Traveler')}"></div>
                <div class="fg" style="margin:0"><label style="font-size:11px;color:#15803d">Mã màu đại diện</label><input type="color" id="ud-charB-color" value="${charB.color || '#059669'}" style="height:38px;padding:2px"></div>
              </div>
            </div>
          </div>

          <!-- 2. DANH SÁCH LƯỢT THOẠI (DIALOGUE TURNS) -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a">
              📋 2. KỊCH BẢN CÁC CÂU THOẠI (A ⇄ B):
            </div>
            <button type="button" class="btn btn-sm btn-p" onclick="window.addRoleplayDesignerTurn()" style="font-size:12px;font-weight:700">
              ➕ Thêm Lượt Thoại Mới
            </button>
          </div>

          <div id="ud-rp-turns-container" style="display:flex;flex-direction:column;gap:12px">
            ${turns.map((t, idx) => `
              <div class="card rp-turn-card" id="rp-turn-card-${idx}" style="margin:0;padding:14px;background:#ffffff;border:1.5px solid ${t.speaker === 'A' ? '#bfdbfe' : '#bbf7d0'};border-radius:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px dashed #cbd5e1;padding-bottom:6px">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-weight:800;font-size:12.5px;color:#0f172a">Lượt ${idx + 1}:</span>
                    <select class="rp-turn-speaker" id="rp-turn-spk-${idx}" style="font-weight:800;font-size:12.5px;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:${t.speaker === 'A' ? '#eff6ff' : '#f0fdf4'}">
                      <option value="A" ${t.speaker === 'A' ? 'selected' : ''}>👩‍💼 Nhân vật A nói</option>
                      <option value="B" ${t.speaker === 'B' ? 'selected' : ''}>🧑‍💼 Nhân vật B nói</option>
                    </select>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button type="button" class="btn btn-sm" onclick="window.testRoleplayDesignerTTS(${idx})" style="background:#fff;font-size:11px;padding:2px 8px" title="Nghe thử giọng đọc câu này">🔊 Nghe thử (TTS)</button>
                    <button type="button" class="btn btn-sm" onclick="window.deleteRoleplayDesignerTurn(${idx})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;padding:2px 8px">🗑️ Xóa</button>
                  </div>
                </div>

                <div class="fg" style="margin-bottom:8px">
                  <label style="font-size:11.5px;font-weight:700">Câu tiếng Anh chuẩn *</label>
                  <input type="text" id="rp-turn-text-${idx}" class="rp-turn-text" style="font-size:14px;font-weight:600" value="${esc(t.text || '')}" placeholder="VD: Good morning! How may I help you?">
                </div>

                <div class="grid2" style="margin-bottom:8px">
                  <div class="fg" style="margin:0"><label style="font-size:11px">Phiên âm IPA</label><input type="text" id="rp-turn-ipa-${idx}" class="rp-turn-ipa" value="${esc(t.ipa || '')}" placeholder="VD: /ɡʊd ˈmɔː.nɪŋ!/"></div>
                  <div class="fg" style="margin:0"><label style="font-size:11px">Nghĩa tiếng Việt *</label><input type="text" id="rp-turn-meaning-${idx}" class="rp-turn-meaning" value="${esc(t.meaning || '')}" placeholder="VD: Chào buổi sáng! Tôi có thể giúp gì?"></div>
                </div>

                <div class="grid2" style="margin:0">
                  <div class="fg" style="margin:0"><label style="font-size:11px">Mẹo phát âm / Trọng âm</label><input type="text" id="rp-turn-tip-${idx}" class="rp-turn-tip" value="${esc(t.tip || '')}" placeholder="VD: Nối âm, nhấn trọng âm..."></div>
                  <div class="fg" style="margin:0">
                    <label style="font-size:11px">🎬 Video Clip URL (MP4 / WebM / Supabase Storage)</label>
                    <div style="display:flex;gap:6px">
                      <input type="text" id="rp-turn-video-${idx}" class="rp-turn-video" value="${esc(t.videoUrl || '')}" placeholder="VD: https://... hoặc tải video lên">
                      <input type="file" id="rp-turn-file-${idx}" accept="video/mp4,video/webm,video/*" style="display:none" onchange="window.handleUploadRoleplayVideo(${idx}, this)">
                      <button type="button" class="btn btn-sm btn-p" onclick="document.getElementById('rp-turn-file-${idx}').click()" style="white-space:nowrap;font-size:11px">📂 Upload</button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <button type="button" class="btn btn-sm btn-p" onclick="window.addRoleplayDesignerTurn()" style="margin-top:12px;width:100%;padding:10px;font-weight:700">
            ➕ Thêm Lượt Thoại Mới Vào Kịch Bản
          </button>
        </div>

        <!-- ============================================================== -->
        <!-- FORM 2: LUYỆN CÂU ĐƠN LẺ TRUYỀN THỐNG (SINGLE PHRASE) -->
        <!-- ============================================================== -->
        <div id="ud-spk-phrase-section" style="${!isVideoRp ? '' : 'display:none'}">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">🗣️ Luyện Phát Âm Câu Đơn Lẻ (Single Phrase Micro AI)</div>
          <div class="fg">
            <label>Câu mẫu tiếng Anh *</label>
            <input type="text" id="ud-spk-text" style="font-size:15px;font-weight:600" value="${esc(p1.text || '')}">
          </div>
          <div class="grid2">
            <div class="fg" style="margin:0">
              <label>Phiên âm IPA</label>
              <input type="text" id="ud-spk-ipa" value="${esc(p1.ipa || '')}">
            </div>
            <div class="fg" style="margin:0">
              <label>Nghĩa tiếng Việt</label>
              <input type="text" id="ud-spk-meaning" value="${esc(p1.meaning || '')}">
            </div>
          </div>
          <div class="fg" style="margin-top:10px">
            <label>🖼️ Hình ảnh minh họa câu nói (Tùy chọn)</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="ud-spk-image" placeholder="VD: https://... hoặc chọn từ thư viện" value="${esc(p1.image || '')}">
              <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-spk-image', 'ud-spk-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
            </div>
            <div id="ud-spk-img-preview" style="margin-top:6px">${p1.image ? `<img src="${p1.image}" style="max-height:140px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
          </div>
        </div>
      </div>
    `;
  } else if (skill === 'writing') {
    const wrtList = unit.writing || [];
    const transformObj = wrtList.find(w => w.category === 'transformation' || w.id?.includes('transform')) || { items: [] };
    const tf1 = transformObj.items?.[0] || { originalSentence: 'They arrived on time yesterday.', negativeAnswer: 'They did not arrive on time yesterday.', questionAnswer: 'Did they arrive on time yesterday?', hint: 'Past simple' };

    const scrambleObj = wrtList.find(w => w.category === 'scramble' || w.id?.includes('scramble')) || wrtList[0] || { items: [] };
    const sc1 = scrambleObj.items?.[0] || { correctSentence: 'Although it rained heavily, we decided to go camping.', hint: 'Bắt đầu bằng Although...', image: '' };

    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:18px">
        <!-- 1. EXERCISE 3: MAKE SENTENCES NEGATIVE AND QUESTION -->
        <div style="padding:14px;background:#ffffff;border:1.5px solid #ddd6fe;border-radius:10px">
          <div style="font-size:14px;font-weight:800;color:#6d28d9;margin-bottom:6px">🔄 Exercise 3. Chuyển Đổi Câu (Make Sentences Negative & Question)</div>
          <div class="fg" style="margin-bottom:8px">
            <label style="font-size:12px;font-weight:700">Câu gốc khẳng định (+)</label>
            <input type="text" id="ud-wrt-tf-orig" value="${esc(tf1.originalSentence || '')}" placeholder="VD: They arrived at the airport on time yesterday.">
          </div>
          <div class="grid2" style="margin-bottom:8px">
            <div class="fg" style="margin:0">
              <label style="font-size:11px;font-weight:700;color:#dc2626">a) Đáp án Phủ định (-)</label>
              <input type="text" id="ud-wrt-tf-neg" value="${esc(tf1.negativeAnswer || '')}" placeholder="VD: They did not arrive...">
            </div>
            <div class="fg" style="margin:0">
              <label style="font-size:11px;font-weight:700;color:#2563eb">b) Đáp án Nghi vấn (?)</label>
              <input type="text" id="ud-wrt-tf-ques" value="${esc(tf1.questionAnswer || '')}" placeholder="VD: Did they arrive...?">
            </div>
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Gợi ý làm bài (Hint)</label>
            <input type="text" id="ud-wrt-tf-hint" value="${esc(tf1.hint || '')}" placeholder="VD: Past Simple with did / didn't">
          </div>
        </div>

        <!-- 2. EXERCISE 4: REORDER WORDS TO MAKE MEANINGFUL SENTENCES -->
        <div style="padding:14px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px">
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px">🧩 Exercise 4. Sắp Xếp Từ Thành Câu (Reorder the Words)</div>
          <div class="fg" style="margin-bottom:8px">
            <label style="font-size:12px;font-weight:700">Câu hoàn chỉnh chuẩn (Hệ thống sẽ tự xáo trộn từ) *</label>
            <input type="text" id="ud-wrt-scramble-sentence" style="font-size:14px" value="${esc(sc1.correctSentence || '')}" placeholder="VD: Although it rained heavily, we decided to go camping.">
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Gợi ý cấu trúc (Hint)</label>
            <input type="text" id="ud-wrt-scramble-hint" value="${esc(sc1.hint || '')}" placeholder="VD: Mệnh đề nhượng bộ bắt đầu bằng Although...">
          </div>
        </div>
      </div>
    `;
  } else if (skill === 'languageFocus') {
    const lf = unit.languageFocus || { pastFormVerbs: [], flashcards: [], matchPairs: [], grammarChallenge: [] };
    const verbs = lf.pastFormVerbs || [
      { infinitive: 'go', past: 'went', meaning: 'đi' },
      { infinitive: 'see', past: 'saw', meaning: 'thấy' },
      { infinitive: 'buy', past: 'bought', meaning: 'mua' }
    ];
    const fc = lf.flashcards?.[0] || { word: 'Sustainable', pos: 'adjective', ipa: '/səˈsteɪ.nə.bəl/', meaning: 'Bền vững', example: 'Solar energy is sustainable.', image: '' };

    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:18px">
        <!-- 1. EXERCISE 1: PAST FORM VERBS TABLE -->
        <div style="padding:14px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px">
          <div style="font-size:14px;font-weight:800;color:#1e40af;margin-bottom:4px">📝 Exercise 1. Fill in the Past Form (Bảng Động Từ Quá Khứ)</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">Định dạng JSON danh sách động từ nguyên thể, quá khứ (V2) và ý nghĩa:</div>
          <textarea id="ud-lf-past-verbs" class="designer-textarea" style="width:100%;min-height:110px;font-family:monospace;font-size:13px">${esc(JSON.stringify(verbs, null, 2))}</textarea>
        </div>

        <!-- 2. 3D FLASHCARDS -->
        <div style="padding:14px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px">
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px">🎴 Thẻ Từ Vựng 3D (Flashcard Minh Họa)</div>
          <div class="grid2">
            <div class="fg" style="margin:0"><label>Từ vựng (Word) *</label><input id="ud-fc-word" value="${esc(fc.word || '')}"></div>
            <div class="fg" style="margin:0"><label>Từ loại (noun/verb/adj)</label><input id="ud-fc-pos" value="${esc(fc.pos || '')}"></div>
          </div>
          <div class="grid2" style="margin-top:8px">
            <div class="fg" style="margin:0"><label>Phiên âm IPA</label><input id="ud-fc-ipa" value="${esc(fc.ipa || '')}"></div>
            <div class="fg" style="margin:0"><label>Nghĩa tiếng Việt *</label><input id="ud-fc-meaning" value="${esc(fc.meaning || '')}"></div>
          </div>
          <div class="fg" style="margin-top:8px">
            <label>🖼️ URL Hình ảnh minh họa cho thẻ 3D</label>
            <div style="display:flex;gap:8px;">
              <input id="ud-fc-image" placeholder="VD: https://images.unsplash.com/... hoặc chọn từ thư viện" value="${esc(fc.image || '')}">
              <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-fc-image', 'ud-fc-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
            </div>
            <div id="ud-fc-img-preview" style="margin-top:6px">${fc.image ? `<img src="${fc.image}" style="max-height:120px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
          </div>
          <div class="fg" style="margin-top:8px">
            <label>Ví dụ câu thực tế (Example)</label>
            <input id="ud-fc-example" value="${esc(fc.example || '')}">
          </div>
        </div>
      </div>
    `;
  }

  // Tự động căn chỉnh chiều cao textareas để hiển thị toàn bộ nội dung
  autoFitAllDesignerTextareas();
}

// -------------------------------------------------------------------------
// HELPER METHODS CHO DESIGNER LISTENING (AUDIO/VIDEO UPLOAD & EXERCISES BUILDER)
// -------------------------------------------------------------------------
export function renderListeningDesignerExercises(exercises = []) {
  if (!exercises || !exercises.length) {
    return `<div style="text-align:center;padding:16px;color:#64748b;font-size:13px;background:#f1f5f9;border-radius:8px">📭 Chưa có câu hỏi tương tác nào. Bấm một trong các nút bên dưới để thêm câu hỏi.</div>`;
  }
  return exercises.map((ex, idx) => {
    const type = ex.type || 'mcq';
    let typeBadge = '';
    let bodyHtml = '';

    if (type === 'mcq') {
      typeBadge = `<span class="ex-badge mcq-badge">🔘 Trắc nghiệm (MCQ)</span>`;
      const opts = ex.options || ['Option A', 'Option B', 'Option C', 'Option D'];
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Nội dung câu hỏi *</label>
          <input type="text" class="lis-ex-q" value="${esc(ex.question || '')}" placeholder="VD: Where is the passenger flying to?">
        </div>
        <div class="grid2" style="margin-bottom:8px">
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án A</label><input type="text" class="lis-ex-opt-0" value="${esc(opts[0] || '')}" placeholder="Lựa chọn A"></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án B</label><input type="text" class="lis-ex-opt-1" value="${esc(opts[1] || '')}" placeholder="Lựa chọn B"></div>
        </div>
        <div class="grid2" style="margin-bottom:8px">
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án C</label><input type="text" class="lis-ex-opt-2" value="${esc(opts[2] || '')}" placeholder="Lựa chọn C"></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án D</label><input type="text" class="lis-ex-opt-3" value="${esc(opts[3] || '')}" placeholder="Lựa chọn D"></div>
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0">
            <label style="font-size:11px;font-weight:700;color:#16a34a">Đáp án đúng *</label>
            <select class="lis-ex-ans" style="padding:6px 10px;border-radius:6px;border:1.5px solid #86efac;background:#f0fdf4;font-weight:700">
              <option value="0" ${ex.answer === 0 ? 'selected' : ''}>A. Phương án 1</option>
              <option value="1" ${ex.answer === 1 ? 'selected' : ''}>B. Phương án 2</option>
              <option value="2" ${ex.answer === 2 ? 'selected' : ''}>C. Phương án 3</option>
              <option value="3" ${ex.answer === 3 ? 'selected' : ''}>D. Phương án 4</option>
            </select>
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Giải thích chi tiết (Explain)</label>
            <input type="text" class="lis-ex-explain" value="${esc(ex.explain || '')}" placeholder="VD: The passenger says: I'm flying to...">
          </div>
        </div>
      `;
    } else if (type === 'dictation') {
      typeBadge = `<span class="ex-badge dict-badge">✍️ Nghe chép chính tả (Dictation)</span>`;
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Câu tiếng Anh chuẩn cần chép *</label>
          <input type="text" class="lis-ex-target" value="${esc(ex.targetSentence || '')}" placeholder="VD: Gate 24B starts boarding at 10:30.">
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0"><label style="font-size:11px">Lời nhắc / Yêu cầu</label><input type="text" class="lis-ex-prompt" value="${esc(ex.prompt || 'Nghe và gõ lại chính xác câu bạn nghe được:')}" placeholder="Lời nhắc"></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">Gợi ý từ đầu (Hint)</label><input type="text" class="lis-ex-hint" value="${esc(ex.hint || '')}" placeholder="VD: Bắt đầu bằng Gate..."></div>
        </div>
      `;
    } else if (type === 'gap_fill') {
      typeBadge = `<span class="ex-badge gap-badge">🔤 Điền từ vào chỗ trống (Gap Fill)</span>`;
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Câu văn có chỗ trống (Dùng ___ cho mỗi vị trí điền) *</label>
          <input type="text" class="lis-ex-sentence" value="${esc(ex.sentence || '')}" placeholder="VD: May I see your ___ and ticket, please? Here is your ___ pass.">
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0">
            <label style="font-size:11px;font-weight:700;color:#16a34a">Các từ đáp án đúng (phân cách bằng dấu phẩy) *</label>
            <input type="text" class="lis-ex-answers" value="${esc((ex.answers || []).join(', '))}" placeholder="VD: passport, boarding">
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Ngân hàng từ gợi ý (phân cách bằng dấu phẩy)</label>
            <input type="text" class="lis-ex-bank" value="${esc((ex.optionsBank || []).join(', '))}" placeholder="VD: passport, boarding, luggage, visa">
          </div>
        </div>
      `;
    } else if (type === 'true_false') {
      typeBadge = `<span class="ex-badge tf-badge">⚖️ Đúng / Sai (True / False)</span>`;
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Mệnh đề khẳng định *</label>
          <input type="text" class="lis-ex-tf-q" value="${esc(ex.question || '')}" placeholder="VD: The passenger chooses a window seat.">
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0">
            <label style="font-size:11px;font-weight:700;color:#16a34a">Đáp án đúng *</label>
            <select class="lis-ex-tf-ans" style="padding:6px 10px;border-radius:6px;border:1.5px solid #cbd5e1;font-weight:700">
              <option value="true" ${ex.answer === true ? 'selected' : ''}>✅ TRUE (Đúng)</option>
              <option value="false" ${ex.answer === false ? 'selected' : ''}>❌ FALSE (Sai)</option>
            </select>
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Giải thích (Explain)</label>
            <input type="text" class="lis-ex-tf-explain" value="${esc(ex.explain || '')}" placeholder="VD: The passenger specifically asked for an aisle seat.">
          </div>
        </div>
      `;
    } else if (type === 'short_answer') {
      typeBadge = `<span class="ex-badge" style="background:#e0f2fe;color:#0369a1;font-weight:800">💬 Trả lời câu hỏi (Short Answer)</span>`;
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Câu hỏi nghe hiểu *</label>
          <input type="text" class="lis-ex-sa-q" value="${esc(ex.question || '')}" placeholder="VD: What time does flight BA178 depart?">
        </div>
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:11px;font-weight:700;color:#16a34a">Đáp án mẫu (Sample Answer) *</label>
          <input type="text" class="lis-ex-sa-sample" value="${esc(ex.sampleAnswer || '')}" placeholder="VD: Flight BA178 departs at 10:30.">
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Từ khóa trọng tâm (phân cách bằng dấu phẩy)</label>
            <input type="text" class="lis-ex-sa-keywords" value="${esc((ex.keywords || []).join(', '))}" placeholder="VD: BA178, 10:30">
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Gợi ý trả lời (Hint)</label>
            <input type="text" class="lis-ex-sa-hint" value="${esc(ex.hint || '')}" placeholder="VD: Chú ý nghe thông tin giờ khởi hành">
          </div>
        </div>
      `;
    }

    return `
      <div class="card ud-lis-ex-card" data-type="${type}" id="ud-lis-ex-${idx}" style="margin:0;padding:14px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px dashed #cbd5e1;padding-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:800;font-size:12px;color:#0f172a">Câu ${idx + 1}:</span>
            ${typeBadge}
          </div>
          <button type="button" class="btn btn-sm" onclick="window.deleteListeningDesignerExercise(${idx})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;padding:2px 8px">🗑️ Xóa</button>
        </div>
        ${bodyHtml}
      </div>
    `;
  }).join('');
}

window.switchDesignerListeningMediaType = function(mode) {
  const typeInp = document.getElementById('ud-lis-media-type');
  if (typeInp) typeInp.value = mode;

  const btnAudio = document.getElementById('btn-mode-lis-audio');
  const btnVideo = document.getElementById('btn-mode-lis-video');
  const btnTts = document.getElementById('btn-mode-lis-tts');

  const secAudio = document.getElementById('ud-lis-sec-audio');
  const secVideo = document.getElementById('ud-lis-sec-video');
  const secTts = document.getElementById('ud-lis-sec-tts');

  if (btnAudio) btnAudio.className = `btn btn-sm ${mode === 'audio' ? 'btn-p' : ''}`;
  if (btnVideo) btnVideo.className = `btn btn-sm ${mode === 'video' ? 'btn-p' : ''}`;
  if (btnTts) btnTts.className = `btn btn-sm ${mode === 'tts' ? 'btn-p' : ''}`;

  if (secAudio) secAudio.style.display = mode === 'audio' ? 'block' : 'none';
  if (secVideo) secVideo.style.display = mode === 'video' ? 'block' : 'none';
  if (secTts) secTts.style.display = mode === 'tts' ? 'block' : 'none';
};

window.handleUploadListeningAudio = async function(inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;

  const progressWrap = document.getElementById('ud-lis-audio-progress-wrap');
  const progressBar = document.getElementById('ud-lis-audio-progress-bar');
  const progressPct = document.getElementById('ud-lis-audio-progress-pct');
  const urlInp = document.getElementById('ud-lis-audio-url');

  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';
  if (progressPct) progressPct.textContent = 'Đang tải lên: 0%';

  try {
    const downloadURL = await uploadMediaFile(file, 'audio-bank', (pct) => {
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPct) progressPct.textContent = `Đang tải lên: ${pct}%...`;
    });

    if (urlInp) urlInp.value = downloadURL;
    if (progressPct) progressPct.textContent = '✅ Đã tải file âm thanh lên 100%';
    window.updateListeningAudioPreview(downloadURL);
  } catch (err) {
    console.error("Lỗi upload audio:", err);
    alert("❌ Lỗi tải audio: " + (err.message || "Vui lòng kiểm tra lại kết nối."));
    if (progressWrap) progressWrap.style.display = 'none';
  }
};

window.handleUploadListeningVideo = async function(inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;

  const progressWrap = document.getElementById('ud-lis-video-progress-wrap');
  const progressBar = document.getElementById('ud-lis-video-progress-bar');
  const progressPct = document.getElementById('ud-lis-video-progress-pct');
  const urlInp = document.getElementById('ud-lis-video-url');

  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBar) progressBar.style.width = '0%';
  if (progressPct) progressPct.textContent = 'Đang tải video: 0%';

  try {
    const downloadURL = await uploadMediaFile(file, 'video-bank', (pct) => {
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPct) progressPct.textContent = `Đang tải video: ${pct}%...`;
    });

    if (urlInp) urlInp.value = downloadURL;
    if (progressPct) progressPct.textContent = '✅ Đã tải video lên 100%';
    window.updateListeningVideoPreview(downloadURL);
  } catch (err) {
    console.error("Lỗi upload video:", err);
    alert("❌ Lỗi tải video: " + (err.message || "Vui lòng kiểm tra lại kết nối."));
    if (progressWrap) progressWrap.style.display = 'none';
  }
};

window.updateListeningAudioPreview = function(url) {
  const previewWrap = document.getElementById('ud-lis-audio-preview');
  if (!previewWrap) return;
  if (url) {
    previewWrap.innerHTML = `
      <audio controls src="${url}" style="width:100%;height:36px;margin-top:4px">
        Trình duyệt không hỗ trợ thẻ audio.
      </audio>
    `;
  } else {
    previewWrap.innerHTML = '';
  }
};

window.clearListeningAudio = function() {
  const urlInp = document.getElementById('ud-lis-audio-url');
  const fileInp = document.getElementById('ud-lis-audio-file');
  const preview = document.getElementById('ud-lis-audio-preview');
  const progressWrap = document.getElementById('ud-lis-audio-progress-wrap');
  if (urlInp) urlInp.value = '';
  if (fileInp) fileInp.value = '';
  if (preview) preview.innerHTML = '';
  if (progressWrap) progressWrap.style.display = 'none';
};

window.updateListeningVideoPreview = function(url) {
  const previewWrap = document.getElementById('ud-lis-video-preview');
  if (!previewWrap) return;
  if (url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      const ytId = match ? match[1] : '';
      previewWrap.innerHTML = ytId ? `
        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen style="border-radius:8px;margin-top:4px"></iframe>
      ` : '<div style="font-size:12px;color:#dc2626">URL YouTube không hợp lệ</div>';
    } else {
      previewWrap.innerHTML = `
        <video controls src="${url}" style="width:100%;max-height:220px;background:#000;border-radius:8px;margin-top:4px">
          Trình duyệt không hỗ trợ thẻ video.
        </video>
      `;
    }
  } else {
    previewWrap.innerHTML = '';
  }
};

window.clearListeningVideo = function() {
  const urlInp = document.getElementById('ud-lis-video-url');
  const fileInp = document.getElementById('ud-lis-video-file');
  const preview = document.getElementById('ud-lis-video-preview');
  const progressWrap = document.getElementById('ud-lis-video-progress-wrap');
  if (urlInp) urlInp.value = '';
  if (fileInp) fileInp.value = '';
  if (preview) preview.innerHTML = '';
  if (progressWrap) progressWrap.style.display = 'none';
};

window.testListeningTTS = function() {
  const text = document.getElementById('ud-lis-text')?.value.trim();
  if (!text) {
    alert("Vui lòng nhập đoạn văn bản tiếng Anh trước khi nghe thử!");
    return;
  }
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
};

function extractListeningExercisesFromDOM() {
  const cards = document.querySelectorAll('.ud-lis-ex-card');
  const exercises = [];
  cards.forEach((card) => {
    const type = card.dataset.type || 'mcq';
    if (type === 'mcq') {
      const q = card.querySelector('.lis-ex-q')?.value.trim() || '';
      const o0 = card.querySelector('.lis-ex-opt-0')?.value.trim() || '';
      const o1 = card.querySelector('.lis-ex-opt-1')?.value.trim() || '';
      const o2 = card.querySelector('.lis-ex-opt-2')?.value.trim() || '';
      const o3 = card.querySelector('.lis-ex-opt-3')?.value.trim() || '';
      const ans = parseInt(card.querySelector('.lis-ex-ans')?.value || '0', 10);
      const exp = card.querySelector('.lis-ex-explain')?.value.trim() || '';
      if (q || o0 || o1) {
        exercises.push({
          id: `ex_mcq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'mcq',
          question: q,
          options: [o0, o1, o2, o3].filter(Boolean),
          answer: isNaN(ans) ? 0 : ans,
          explain: exp
        });
      }
    } else if (type === 'dictation') {
      const target = card.querySelector('.lis-ex-target')?.value.trim() || '';
      const prompt = card.querySelector('.lis-ex-prompt')?.value.trim() || '';
      const hint = card.querySelector('.lis-ex-hint')?.value.trim() || '';
      if (target) {
        exercises.push({
          id: `ex_dict_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'dictation',
          targetSentence: target,
          prompt: prompt,
          hint: hint
        });
      }
    } else if (type === 'gap_fill') {
      const sentence = card.querySelector('.lis-ex-sentence')?.value.trim() || '';
      const answersRaw = card.querySelector('.lis-ex-answers')?.value.trim() || '';
      const bankRaw = card.querySelector('.lis-ex-bank')?.value.trim() || '';
      if (sentence) {
        const answers = answersRaw.split(',').map(s => s.trim()).filter(Boolean);
        const optionsBank = bankRaw ? bankRaw.split(',').map(s => s.trim()).filter(Boolean) : answers;
        exercises.push({
          id: `ex_gap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'gap_fill',
          sentence: sentence,
          answers: answers,
          optionsBank: optionsBank
        });
      }
    } else if (type === 'true_false') {
      const q = card.querySelector('.lis-ex-tf-q')?.value.trim() || '';
      const ans = card.querySelector('.lis-ex-tf-ans')?.value === 'true';
      const exp = card.querySelector('.lis-ex-tf-explain')?.value.trim() || '';
      if (q) {
        exercises.push({
          id: `ex_tf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'true_false',
          question: q,
          answer: ans,
          explain: exp
        });
      }
    } else if (type === 'short_answer') {
      const q = card.querySelector('.lis-ex-sa-q')?.value.trim() || '';
      const sample = card.querySelector('.lis-ex-sa-sample')?.value.trim() || '';
      const kwRaw = card.querySelector('.lis-ex-sa-keywords')?.value.trim() || '';
      const hint = card.querySelector('.lis-ex-sa-hint')?.value.trim() || '';
      if (q || sample) {
        exercises.push({
          id: `ex_sa_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'short_answer',
          title: 'Exercise 3. Answer the question',
          question: q,
          sampleAnswer: sample,
          keywords: kwRaw ? kwRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
          hint: hint
        });
      }
    }
  });
  return exercises;
}

window.addListeningDesignerExercise = function(type) {
  const container = document.getElementById('ud-lis-exercises-list');
  if (!container) return;

  const currentList = extractListeningExercisesFromDOM();
  let newEx = { type };
  if (type === 'mcq') {
    newEx = { type: 'mcq', question: '', options: ['', '', '', ''], answer: 0, explain: '' };
  } else if (type === 'dictation') {
    newEx = { type: 'dictation', targetSentence: '', prompt: 'Nghe và gõ lại chính xác câu bạn nghe được:', hint: '' };
  } else if (type === 'gap_fill') {
    newEx = { type: 'gap_fill', sentence: '', answers: [], optionsBank: [] };
  } else if (type === 'true_false') {
    newEx = { type: 'true_false', question: '', answer: true, explain: '' };
  } else if (type === 'short_answer') {
    newEx = { type: 'short_answer', question: '', sampleAnswer: '', keywords: [], hint: '' };
  }
  currentList.push(newEx);
  container.innerHTML = renderListeningDesignerExercises(currentList);
};

window.deleteListeningDesignerExercise = function(idx) {
  const currentList = extractListeningExercisesFromDOM();
  if (currentList[idx] && confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
    currentList.splice(idx, 1);
    const container = document.getElementById('ud-lis-exercises-list');
    if (container) container.innerHTML = renderListeningDesignerExercises(currentList);
  }
};

// -------------------------------------------------------------------------
// HELPER METHODS CHO DESIGNER READING (MATCHING, MCQ, BACKWARD SPELLING)
// -------------------------------------------------------------------------
export function renderReadingDesignerExercises(exercises = []) {
  if (!exercises || !exercises.length) {
    return `<div style="text-align:center;padding:16px;color:#64748b;font-size:13px;background:#f1f5f9;border-radius:8px">📭 Chưa có bài tập đọc hiểu nào. Bấm nút bên trên để thêm bài tập Nối từ, Trắc nghiệm, hoặc Backward Spelling.</div>`;
  }

  return exercises.map((ex, idx) => {
    const type = ex.type || 'mcq';
    let typeBadge = '';
    let bodyHtml = '';

    if (type === 'matching') {
      typeBadge = `<span class="ex-badge" style="background:#e0e7ff;color:#4338ca;font-weight:800">🧩 Nối Từ với Định Nghĩa (Matching 1-8/1-9)</span>`;
      const pairs = ex.pairs || [
        { id: 1, word: 'confined', letter: 'a', definition: 'limited or restricted to an area' },
        { id: 2, word: 'integral', letter: 'b', definition: 'essential or necessary' }
      ];
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Tiêu đề bài tập</label>
          <input type="text" class="read-ex-match-title" value="${esc(ex.title || 'Exercise 1. Match the words/ phrases (1-8) with their definitions (a-h)')}">
        </div>
        <div class="fg" style="margin:0">
          <label style="font-size:11px;font-weight:700">Danh sách các cặp từ và định nghĩa (JSON Pairs) *</label>
          <textarea class="read-ex-match-pairs" style="width:100%;min-height:90px;font-family:monospace;font-size:12px">${esc(JSON.stringify(pairs, null, 2))}</textarea>
        </div>
      `;
    } else if (type === 'backward_spelling') {
      typeBadge = `<span class="ex-badge" style="background:#f3e8ff;color:#7e22ce;font-weight:800">🔤 Backward Spelling (Đánh vần / Xếp chữ)</span>`;
      bodyHtml = `
        <div class="grid2" style="margin-bottom:8px">
          <div class="fg" style="margin:0">
            <label style="font-size:11px;font-weight:700;color:#16a34a">Từ vựng mục tiêu (Target Word) *</label>
            <input type="text" class="read-ex-spell-target" value="${esc(ex.targetWord || '')}" placeholder="VD: AUTONOMOUS" style="font-weight:800;text-transform:uppercase">
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Gợi ý số chữ cái / ký tự đầu (Hint)</label>
            <input type="text" class="read-ex-spell-hint" value="${esc(ex.hint || '')}" placeholder="VD: 10 chữ cái • Bắt đầu bằng chữ A">
          </div>
        </div>
        <div class="fg" style="margin:0">
          <label style="font-size:11px;font-weight:700">Gợi ý định nghĩa / Ý nghĩa (Clue) *</label>
          <input type="text" class="read-ex-spell-clue" value="${esc(ex.clue || '')}" placeholder="VD: Operating independently without human intervention">
        </div>
      `;
    } else if (type === 'mcq' || type === 'tfng') {
      typeBadge = `<span class="ex-badge mcq-badge">🔘 Trắc nghiệm đọc hiểu (MCQ)</span>`;
      const opts = ex.options || ['Option A', 'Option B', 'Option C', 'Option D'];
      bodyHtml = `
        <div class="fg" style="margin-bottom:8px">
          <label style="font-size:12px;font-weight:700">Nội dung câu hỏi đọc hiểu *</label>
          <input type="text" class="read-ex-q" value="${esc(ex.question || '')}" placeholder="VD: According to paragraph 1, how do streaming services use AI?">
        </div>
        <div class="grid2" style="margin-bottom:8px">
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án A</label><input type="text" class="read-ex-opt-0" value="${esc(opts[0] || '')}"></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án B</label><input type="text" class="read-ex-opt-1" value="${esc(opts[1] || '')}"></div>
        </div>
        <div class="grid2" style="margin-bottom:8px">
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án C</label><input type="text" class="read-ex-opt-2" value="${esc(opts[2] || '')}"></div>
          <div class="fg" style="margin:0"><label style="font-size:11px">Đáp án D</label><input type="text" class="read-ex-opt-3" value="${esc(opts[3] || '')}"></div>
        </div>
        <div class="grid2" style="margin:0">
          <div class="fg" style="margin:0">
            <label style="font-size:11px;font-weight:700;color:#16a34a">Đáp án đúng *</label>
            <select class="read-ex-ans" style="padding:6px 10px;border-radius:6px;border:1.5px solid #86efac;background:#f0fdf4;font-weight:700">
              <option value="0" ${ex.answer === 0 ? 'selected' : ''}>A. Phương án 1</option>
              <option value="1" ${ex.answer === 1 ? 'selected' : ''}>B. Phương án 2</option>
              <option value="2" ${ex.answer === 2 ? 'selected' : ''}>C. Phương án 3</option>
              <option value="3" ${ex.answer === 3 ? 'selected' : ''}>D. Phương án 4</option>
            </select>
          </div>
          <div class="fg" style="margin:0">
            <label style="font-size:11px">Giải thích / Dẫn chứng trong bài</label>
            <input type="text" class="read-ex-explain" value="${esc(ex.explain || '')}" placeholder="VD: Đoạn 1 nêu...">
          </div>
        </div>
      `;
    }

    return `
      <div class="card ud-read-ex-card" data-type="${type}" id="ud-read-ex-${idx}" style="margin:0;padding:14px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px dashed #cbd5e1;padding-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:800;font-size:12px;color:#0f172a">Bài tập ${idx + 1}:</span>
            ${typeBadge}
          </div>
          <button type="button" class="btn btn-sm" onclick="window.deleteReadingDesignerExercise(${idx})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;padding:2px 8px">🗑️ Xóa</button>
        </div>
        ${bodyHtml}
      </div>
    `;
  }).join('');
}

function extractReadingExercisesFromDOM() {
  const cards = document.querySelectorAll('.ud-read-ex-card');
  const exercises = [];

  cards.forEach((card) => {
    const type = card.dataset.type || 'mcq';
    if (type === 'matching') {
      const title = card.querySelector('.read-ex-match-title')?.value.trim() || 'Exercise 1. Match the words with definitions';
      const pairsRaw = card.querySelector('.read-ex-match-pairs')?.value.trim();
      let pairs = [];
      try { pairs = JSON.parse(pairsRaw); } catch(e){}
      if (pairs.length) {
        exercises.push({
          id: `read_match_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'matching',
          title: title,
          pairs: pairs
        });
      }
    } else if (type === 'backward_spelling') {
      const target = card.querySelector('.read-ex-spell-target')?.value.trim().toUpperCase() || '';
      const clue = card.querySelector('.read-ex-spell-clue')?.value.trim() || '';
      const hint = card.querySelector('.read-ex-spell-hint')?.value.trim() || '';
      if (target && clue) {
        exercises.push({
          id: `read_spell_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'backward_spelling',
          title: 'Exercise 3. Backward Spelling (Đánh vần & Giải đố từ vựng)',
          targetWord: target,
          clue: clue,
          hint: hint
        });
      }
    } else if (type === 'mcq') {
      const q = card.querySelector('.read-ex-q')?.value.trim() || '';
      const o0 = card.querySelector('.read-ex-opt-0')?.value.trim() || '';
      const o1 = card.querySelector('.read-ex-opt-1')?.value.trim() || '';
      const o2 = card.querySelector('.read-ex-opt-2')?.value.trim() || '';
      const o3 = card.querySelector('.read-ex-opt-3')?.value.trim() || '';
      const ans = parseInt(card.querySelector('.read-ex-ans')?.value || '0', 10);
      const exp = card.querySelector('.read-ex-explain')?.value.trim() || '';
      if (q || o0 || o1) {
        exercises.push({
          id: `read_mcq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'mcq',
          title: 'Exercise 2. Choose the best answer',
          question: q,
          options: [o0, o1, o2, o3].filter(Boolean),
          answer: isNaN(ans) ? 0 : ans,
          explain: exp
        });
      }
    }
  });

  return exercises;
}

window.addReadingDesignerExercise = function(type) {
  const container = document.getElementById('ud-read-exercises-list');
  if (!container) return;

  const currentList = extractReadingExercisesFromDOM();
  let newEx = { type };
  if (type === 'matching') {
    newEx = {
      type: 'matching',
      title: 'Exercise 1. Match the words/ phrases (1-8) with their definitions (a-h)',
      pairs: [
        { id: 1, word: 'confined', letter: 'a', definition: 'limited or restricted to a particular area' },
        { id: 2, word: 'integral', letter: 'b', definition: 'essential or necessary for completeness' }
      ]
    };
  } else if (type === 'backward_spelling') {
    newEx = {
      type: 'backward_spelling',
      title: 'Exercise 3. Backward Spelling (Đánh vần & Giải đố từ vựng)',
      targetWord: 'AUTONOMOUS',
      clue: 'Operating independently and having the freedom to act',
      hint: '10 chữ cái • Bắt đầu bằng chữ A'
    };
  } else if (type === 'mcq') {
    newEx = {
      type: 'mcq',
      title: 'Exercise 2. Choose the best answer from A, B, C, or D',
      question: '',
      options: ['', '', '', ''],
      answer: 0,
      explain: ''
    };
  }

  currentList.push(newEx);
  container.innerHTML = renderReadingDesignerExercises(currentList);
};

window.deleteReadingDesignerExercise = function(idx) {
  const currentList = extractReadingExercisesFromDOM();
  if (currentList[idx] && confirm("Bạn có chắc muốn xóa bài tập đọc hiểu này?")) {
    currentList.splice(idx, 1);
    const container = document.getElementById('ud-read-exercises-list');
    if (container) container.innerHTML = renderReadingDesignerExercises(currentList);
  }
};

// -------------------------------------------------------------------------
// HELPER METHODS CHO DESIGNER SPEAKING (ROLEPLAY TURNS & VIDEO UPLOAD)
// -------------------------------------------------------------------------
window.switchDesignerSpeakingMode = function(mode) {
  const isRp = mode === 'video_roleplay';
  const typeInp = document.getElementById('ud-spk-type');
  if (typeInp) typeInp.value = mode;

  const btnRp = document.getElementById('btn-mode-spk-rp');
  const btnPhrase = document.getElementById('btn-mode-spk-phrase');
  const secRp = document.getElementById('ud-spk-roleplay-section');
  const secPhrase = document.getElementById('ud-spk-phrase-section');

  if (btnRp) btnRp.className = `btn btn-sm ${isRp ? 'btn-p' : ''}`;
  if (btnPhrase) btnPhrase.className = `btn btn-sm ${!isRp ? 'btn-p' : ''}`;
  if (secRp) secRp.style.display = isRp ? 'block' : 'none';
  if (secPhrase) secPhrase.style.display = !isRp ? 'block' : 'none';
};

window.addRoleplayDesignerTurn = function() {
  const container = document.getElementById('ud-rp-turns-container');
  if (!container) return;

  const idx = container.children.length;
  const nextSpeaker = idx % 2 === 0 ? 'A' : 'B';
  const newTurnEl = document.createElement('div');
  newTurnEl.className = 'card rp-turn-card';
  newTurnEl.id = `rp-turn-card-${idx}`;
  newTurnEl.style.cssText = `margin:0;padding:14px;background:#ffffff;border:1.5px solid ${nextSpeaker === 'A' ? '#bfdbfe' : '#bbf7d0'};border-radius:10px`;

  newTurnEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px dashed #cbd5e1;padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;font-size:12.5px;color:#0f172a">Lượt ${idx + 1}:</span>
        <select class="rp-turn-speaker" id="rp-turn-spk-${idx}" style="font-weight:800;font-size:12.5px;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:${nextSpeaker === 'A' ? '#eff6ff' : '#f0fdf4'}">
          <option value="A" ${nextSpeaker === 'A' ? 'selected' : ''}>👩‍💼 Nhân vật A nói</option>
          <option value="B" ${nextSpeaker === 'B' ? 'selected' : ''}>🧑‍💼 Nhân vật B nói</option>
        </select>
      </div>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn btn-sm" onclick="window.testRoleplayDesignerTTS(${idx})" style="background:#fff;font-size:11px;padding:2px 8px">🔊 Nghe thử (TTS)</button>
        <button type="button" class="btn btn-sm" onclick="window.deleteRoleplayDesignerTurn(${idx})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;padding:2px 8px">🗑️ Xóa</button>
      </div>
    </div>

    <div class="fg" style="margin-bottom:8px">
      <label style="font-size:11.5px;font-weight:700">Câu tiếng Anh chuẩn *</label>
      <input type="text" id="rp-turn-text-${idx}" class="rp-turn-text" style="font-size:14px;font-weight:600" placeholder="VD: Could you please show me your passport?">
    </div>

    <div class="grid2" style="margin-bottom:8px">
      <div class="fg" style="margin:0"><label style="font-size:11px">Phiên âm IPA</label><input type="text" id="rp-turn-ipa-${idx}" class="rp-turn-ipa" placeholder="VD: /kʊd juː pliːz ʃəʊ miː.../"></div>
      <div class="fg" style="margin:0"><label style="font-size:11px">Nghĩa tiếng Việt *</label><input type="text" id="rp-turn-meaning-${idx}" class="rp-turn-meaning" placeholder="VD: Bạn có thể cho tôi xem hộ chiếu?"></div>
    </div>

    <div class="grid2" style="margin:0">
      <div class="fg" style="margin:0"><label style="font-size:11px">Mẹo phát âm / Trọng âm</label><input type="text" id="rp-turn-tip-${idx}" class="rp-turn-tip" placeholder="VD: Lên giọng cuối câu..."></div>
      <div class="fg" style="margin:0">
        <label style="font-size:11px">🎬 Video Clip URL (MP4 / WebM / Supabase Storage)</label>
        <div style="display:flex;gap:6px">
          <input type="text" id="rp-turn-video-${idx}" class="rp-turn-video" placeholder="VD: https://... hoặc tải video lên">
          <input type="file" id="rp-turn-file-${idx}" accept="video/mp4,video/webm,video/*" style="display:none" onchange="window.handleUploadRoleplayVideo(${idx}, this)">
          <button type="button" class="btn btn-sm btn-p" onclick="document.getElementById('rp-turn-file-${idx}').click()" style="white-space:nowrap;font-size:11px">📂 Upload</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(newTurnEl);
};

window.deleteRoleplayDesignerTurn = function(idx) {
  const el = document.getElementById(`rp-turn-card-${idx}`);
  if (el && confirm("Bạn có chắc muốn xóa lượt thoại này?")) {
    el.remove();
  }
};

window.testRoleplayDesignerTTS = function(idx) {
  const txt = document.getElementById(`rp-turn-text-${idx}`)?.value.trim();
  if (!txt) {
    alert("Vui lòng nhập câu tiếng Anh trước khi nghe thử!");
    return;
  }
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(txt);
  utter.lang = 'en-US';
  utter.rate = 0.92;
  window.speechSynthesis.speak(utter);
};

window.handleUploadRoleplayVideo = async function(idx, inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;

  const videoInp = document.getElementById(`rp-turn-video-${idx}`);
  if (!videoInp) return;

  videoInp.value = "⏳ Đang tải video lên Supabase...";
  try {
    const downloadURL = await uploadMediaFile(file, 'video-bank');
    videoInp.value = downloadURL;
    alert("✅ Đã tải video cho lượt thoại " + (idx + 1) + " thành công!");
  } catch (err) {
    console.error("Lỗi upload roleplay video:", err);
    videoInp.value = "";
    alert("❌ Lỗi tải video: " + (err.message || "Vui lòng kiểm tra dung lượng hoặc dán trực tiếp đường dẫn video online."));
  }
};

// 5. LƯU THAY ĐỔI CỦA SKILL ĐANG SỬA VÀO DRAFT
function syncCurrentDesignerSkillToDraft() {
  if (!window._currentDraftUnit) return;
  const unit = window._currentDraftUnit;

  if (currentDesignerSkill === 'listening') {
    const mediaType = $('ud-lis-media-type')?.value || 'audio';
    const audioUrl = $('ud-lis-audio-url')?.value.trim() || '';
    const videoUrl = $('ud-lis-video-url')?.value.trim() || '';
    const audioText = $('ud-lis-text')?.value.trim() || '';
    const transcript = $('ud-lis-transcript')?.value.trim() || '';
    const title = $('ud-lis-title')?.value.trim() || '';
    const duration = $('ud-lis-duration')?.value.trim() || '45s';
    const image = $('ud-lis-image')?.value.trim() || '';
    const exercises = extractListeningExercisesFromDOM();

    if (!unit.listening) unit.listening = [];
    if (!unit.listening[0]) unit.listening[0] = { id: 'lis_1', exercises: [] };

    unit.listening[0].title = title || unit.listening[0].title || 'Listening Practice';
    unit.listening[0].duration = duration;
    unit.listening[0].mediaType = mediaType;
    unit.listening[0].audioUrl = audioUrl;
    unit.listening[0].videoUrl = videoUrl;
    unit.listening[0].audioText = audioText || transcript;
    unit.listening[0].transcript = transcript || audioText;
    unit.listening[0].image = image;
    unit.listening[0].exercises = exercises.length ? exercises : (unit.listening[0].exercises || []);
  } else if (currentDesignerSkill === 'reading') {
    const passage = $('ud-read-passage')?.value.trim();
    const image = $('ud-read-image')?.value.trim();
    const vocabRaw = $('ud-read-vocab')?.value.trim();
    const exercises = extractReadingExercisesFromDOM();

    if (!unit.reading) unit.reading = [];
    if (!unit.reading[0]) unit.reading[0] = { id: 'read_1', exercises: [] };

    if (passage) unit.reading[0].passage = passage;
    unit.reading[0].image = image || '';
    if (vocabRaw) {
      try { unit.reading[0].vocabulary = JSON.parse(vocabRaw); } catch(e){}
    }
    if (exercises.length) {
      unit.reading[0].exercises = exercises;
    }
  } else if (currentDesignerSkill === 'speaking') {
    const mode = $('ud-spk-type')?.value || 'video_roleplay';
    if (!unit.speaking) unit.speaking = [];

    if (mode === 'video_roleplay') {
      const charAName = $('ud-charA-name')?.value.trim() || 'Emma (Lễ tân)';
      const charAAvatar = $('ud-charA-avatar')?.value.trim() || '👩‍💼';
      const charATitle = $('ud-charA-title')?.value.trim() || 'Hotel Receptionist';
      const charAColor = $('ud-charA-color')?.value || '#2563eb';

      const charBName = $('ud-charB-name')?.value.trim() || 'David (Du khách)';
      const charBAvatar = $('ud-charB-avatar')?.value.trim() || '🧑‍🦱';
      const charBTitle = $('ud-charB-title')?.value.trim() || 'Guest / Traveler';
      const charBColor = $('ud-charB-color')?.value || '#059669';

      const turnCards = document.querySelectorAll('.rp-turn-card');
      const turns = [];
      turnCards.forEach((card, i) => {
        const spk = card.querySelector('.rp-turn-speaker')?.value || 'A';
        const txt = card.querySelector('.rp-turn-text')?.value.trim();
        const ipa = card.querySelector('.rp-turn-ipa')?.value.trim() || '';
        const meaning = card.querySelector('.rp-turn-meaning')?.value.trim() || '';
        const tip = card.querySelector('.rp-turn-tip')?.value.trim() || '';
        const video = card.querySelector('.rp-turn-video')?.value.trim() || '';

        if (txt) {
          turns.push({
            id: `dlg_${i + 1}`,
            speaker: spk,
            speakerName: spk === 'A' ? charAName : charBName,
            text: txt,
            ipa: ipa,
            meaning: meaning,
            tip: tip,
            videoUrl: video
          });
        }
      });

      unit.speaking[0] = {
        id: unit.speaking[0]?.id || 'spk_v_1',
        type: 'video_roleplay',
        title: `🎬 Video Roleplay: ${unit.title || 'Hội thoại A & B'}`,
        topic: unit.topic || 'Giao tiếp',
        level: unit.level || 'A2 - B1',
        description: `Mô phỏng hội thoại video tương tác giữa ${charAName} và ${charBName}. Học viên tự do chọn vai A hoặc B để luyện phát âm.`,
        characterA: { id: 'A', name: charAName, avatar: charAAvatar, roleTitle: charATitle, color: charAColor },
        characterB: { id: 'B', name: charBName, avatar: charBAvatar, roleTitle: charBTitle, color: charBColor },
        dialogue: turns
      };
    } else {
      const text = $('ud-spk-text')?.value.trim();
      const ipa = $('ud-spk-ipa')?.value.trim();
      const meaning = $('ud-spk-meaning')?.value.trim();
      const image = $('ud-spk-image')?.value.trim();

      if (!unit.speaking[0]) unit.speaking[0] = { id: 'spk_1', phrases: [] };
      unit.speaking[0].type = 'phrases';
      if (text) {
        unit.speaking[0].phrases = [{ text, ipa: ipa || '', meaning: meaning || '', image: image || '', tip: 'Luyện phát âm chuẩn âm cuối.' }];
      }
    }
  } else if (currentDesignerSkill === 'writing') {
    const tfOrig = $('ud-wrt-tf-orig')?.value.trim();
    const tfNeg = $('ud-wrt-tf-neg')?.value.trim();
    const tfQues = $('ud-wrt-tf-ques')?.value.trim();
    const tfHint = $('ud-wrt-tf-hint')?.value.trim();

    const scSentence = $('ud-wrt-scramble-sentence')?.value.trim();
    const scHint = $('ud-wrt-scramble-hint')?.value.trim();

    if (!unit.writing) unit.writing = [];

    const newWrtList = [];

    if (tfOrig) {
      newWrtList.push({
        id: 'wrt_transform',
        title: 'Exercise 3. Make these sentences a) Negative and b) Question',
        category: 'transformation',
        items: [
          {
            id: 'tf_1',
            originalSentence: tfOrig,
            negativeAnswer: tfNeg || '',
            questionAnswer: tfQues || '',
            hint: tfHint || ''
          }
        ]
      });
    }

    if (scSentence) {
      newWrtList.push({
        id: 'wrt_scramble',
        title: 'Exercise 4. Reorder the words to make meaningful sentences',
        category: 'scramble',
        items: [
          {
            id: 'sc_1',
            words: scSentence.split(/\s+/),
            correctSentence: scSentence,
            hint: scHint || ''
          }
        ]
      });
    }

    if (newWrtList.length) {
      unit.writing = newWrtList;
    }
  } else if (currentDesignerSkill === 'languageFocus') {
    const pastVerbsRaw = $('ud-lf-past-verbs')?.value.trim();
    const word = $('ud-fc-word')?.value.trim();
    const pos = $('ud-fc-pos')?.value.trim();
    const ipa = $('ud-fc-ipa')?.value.trim();
    const meaning = $('ud-fc-meaning')?.value.trim();
    const image = $('ud-fc-image')?.value.trim();
    const example = $('ud-fc-example')?.value.trim();

    if (!unit.languageFocus) unit.languageFocus = { pastFormVerbs: [], flashcards: [], matchPairs: [], grammarChallenge: [] };

    if (pastVerbsRaw) {
      try { unit.languageFocus.pastFormVerbs = JSON.parse(pastVerbsRaw); } catch(e){}
    }

    if (word) {
      unit.languageFocus.flashcards = [{ id: 'fc_1', word, pos: pos || 'noun', ipa: ipa || '', meaning: meaning || '', image: image || '', example: example || '' }];
    }
  }
}

// 6. LƯU TOÀN BỘ UNIT LÊN SUPABASE & STATE
export async function saveUnit() {
  syncCurrentDesignerSkillToDraft();
  const unit = window._currentDraftUnit;
  if (!unit) return;

  if (unit.id && unitsState.some(u => u.id === unit.id)) {
    const existing = unitsState.find(u => u.id === unit.id);
    if (existing && !canEditItem(existing, state.currentUserEmail)) {
      alert("❌ Bạn không có quyền chỉnh sửa Unit bài học của giáo viên khác!");
      return;
    }
  }

  const title = $('ud-title')?.value.trim();
  if (!title) {
    alert('Vui lòng nhập Tên Unit bài học!');
    return;
  }

  unit.subject = $('ud-subject')?.value.trim() || '🇬🇧 Tiếng Anh';
  unit.module = $('ud-module')?.value.trim() || 'English B1 - General & Academic Skills';
  unit.title = title;
  unit.topic = $('ud-topic')?.value.trim() || 'General';
  unit.level = $('ud-level')?.value || 'A2 - B1';
  unit.icon = $('ud-icon')?.value.trim() || '📖';
  unit.description = $('ud-desc')?.value.trim() || '';

  const saveBtn = $('btn-save-unit');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu Unit lên Supabase...';
  }

  try {
    const payload = {
      id: unit.id,
      subject: unit.subject,
      module: unit.module,
      title: unit.title,
      topic: unit.topic,
      level: unit.level,
      icon: unit.icon,
      description: unit.description,
      is_hidden: unit.isHidden || false,
      listening: unit.listening || [],
      reading: unit.reading || [],
      speaking: unit.speaking || [],
      writing: unit.writing || [],
      language_focus: unit.languageFocus || {},
      created_at: Date.now(),
      created_by: unit.created_by || state.currentUserEmail || 'nam3010hcm@gmail.com'
    };

    const { error } = await safeUpsertUnit(payload);
    if (error) throw error;

    const existingIdx = unitsState.findIndex(u => u.id === unit.id);
    if (existingIdx >= 0) {
      unitsState[existingIdx] = clone(unit);
    } else {
      unitsState.push(clone(unit));
    }

    await logTeacherActivity(existingIdx >= 0 ? 'Cập nhật' : 'Tạo mới', 'Bài học Unit', unit.title, unit.id, `Môn: ${unit.subject || ''} / ${unit.module || ''}`);

    closeUnitEditor();
    renderUnitsList();
    alert('✅ Đã lưu Unit bài học thành công!');
  } catch (err) {
    console.error("Lỗi khi lưu Unit:", err);
    alert('❌ Lỗi khi lưu Unit: ' + (err.message || ''));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Lưu Unit & Cập Nhật';
    }
  }
}

// 7. BẬT/TẮT ẨN HIỆN UNIT
export async function toggleUnitVisibility(unitId) {
  const u = unitsState.find(x => x.id === unitId);
  if (!u) return;
  if (!canEditItem(u, state.currentUserEmail)) {
    alert("❌ Bạn không có quyền ẩn/hiện Unit của giáo viên khác!");
    return;
  }

  u.isHidden = !u.isHidden;
  try {
    const { error } = await db().from('learning_units').update({ is_hidden: u.isHidden }).eq('id', unitId);
    if (error) console.error("Lỗi toggleUnitVisibility:", error);
    await logTeacherActivity(u.isHidden ? 'Ẩn bài học' : 'Mở bài học', 'Bài học Unit', u.title, unitId, '');
    renderUnitsList();
  } catch (e) {
    console.error(e);
  }
}

// 8. XÓA UNIT
export async function deleteUnit(unitId) {
  const u = unitsState.find(x => x.id === unitId);
  if (u && !canEditItem(u, state.currentUserEmail)) {
    alert("❌ Bạn không có quyền xóa Unit của giáo viên khác!");
    return;
  }

  if (!confirm("⚠️ Bạn có chắc chắn muốn xóa Unit bài học này?")) return;
  try {
    const { error } = await db().from('learning_units').delete().eq('id', unitId);
    if (error) throw error;
    unitsState = unitsState.filter(u => u.id !== unitId);
    await logTeacherActivity('Xóa bài học', 'Bài học Unit', u?.title || unitId, unitId, '');
    renderUnitsList();
    alert("✅ Đã xóa Unit thành công!");
  } catch (e) {
    console.error("Lỗi xóa Unit:", e);
    alert("❌ Lỗi xóa Unit: " + (e.message || ''));
  }
}

window.openUnitEditor = openUnitEditor;
window.closeUnitEditor = closeUnitEditor;
window.switchDesignerSkillTab = (skill) => {
  syncCurrentDesignerSkillToDraft();
  switchDesignerSkillTab(skill);
};
window.saveUnit = saveUnit;
window.toggleUnitVisibility = toggleUnitVisibility;
window.deleteUnit = deleteUnit;
