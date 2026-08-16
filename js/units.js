/**
 * =========================================================================
 * MODULE QUẢN LÝ & THIẾT KẾ UNIT BÀI HỌC (units.js)
 * Teacher Learning Units & 5-Skills Designer Engine
 * =========================================================================
 */

import { DEFAULT_UNITS } from './learn-data.js';
import { state, $, esc, clone, canEditItem, isRootUser } from './common.js';
import { subjectsList, modulesList } from './curriculum.js';

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
        } else if (defUnit?.speaking && !spk.some(s => s.type === 'video_roleplay')) {
          const defRps = defUnit.speaking.filter(s => s.type === 'video_roleplay');
          if (defRps.length) spk = [...clone(defRps), ...spk];
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
    const authorBadge = u.created_by ? `<span class="cat-badge" style="background:#f1f5f9;color:#475569" title="Người tạo: ${esc(u.created_by)}">👤 ${esc(u.created_by.split('@')[0])}</span>` : '';

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
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
        <div class="fg">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">🎧 1. Lời Thoại Đoạn Nghe (Audio Script / Text-to-Speech) *</label>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">Hệ thống sẽ dùng đoạn văn bản này để phát âm chuẩn giọng bản ngữ (US/UK) cho học sinh:</div>
          <textarea id="ud-lis-text" class="designer-textarea" style="width:100%;min-height:130px;font-size:14.5px;line-height:1.6;" placeholder="Nhập đoạn hội thoại hoặc văn bản tiếng Anh...">${esc(lis.audioText || '')}</textarea>
        </div>

        <div class="fg" style="margin-top:14px">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">🖼️ Hình ảnh minh họa đoạn nghe (Tùy chọn)</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="ud-lis-image" placeholder="VD: https://images.unsplash.com/... hoặc chọn từ thư viện" value="${esc(lis.image || '')}">
            <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-lis-image', 'ud-lis-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
          </div>
          <div id="ud-lis-img-preview" style="margin-top:6px">${lis.image ? `<img src="${lis.image}" style="max-height:140px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
        </div>
        
        <div class="fg" style="margin-top:14px">
          <label style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">✍️ 2. Câu Nghe Chép Chính Tả (Dictation)</label>
          <input type="text" id="ud-lis-dictation" style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px" placeholder="VD: Gate 24B starts boarding at 10:30." value="${esc(lis.exercises?.find(e => e.type === 'dictation')?.targetSentence || '')}">
        </div>

        <div style="margin-top:18px;padding-top:14px;border-top:1px dashed #cbd5e1">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#1e293b">📝 3. Câu Hỏi Trắc Nghiệm Nghe Hiểu</div>
          <div class="fg">
            <label>Nội dung câu hỏi</label>
            <input type="text" id="ud-lis-q" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.question || 'Where is the passenger flying to?')}">
          </div>
          <div class="grid2">
            <div class="fg" style="margin:0"><label>Đáp án A</label><input id="ud-lis-a" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.options?.[0] || 'London')}"></div>
            <div class="fg" style="margin:0"><label>Đáp án B</label><input id="ud-lis-b" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.options?.[1] || 'New York')}"></div>
          </div>
        </div>
      </div>
    `;
  } else if (skill === 'reading') {
    const read = (unit.reading && unit.reading[0]) || { passage: '', vocabulary: {}, image: '' };
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
    const wrt = (unit.writing && unit.writing[0]) || { items: [] };
    const it1 = wrt.items?.[0] || { correctSentence: 'Learning English is fun and useful.', hint: 'Bắt đầu bằng Learning...', image: '' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">✍️ Bài Tập Xếp Từ Thành Câu (Sentence Scramble)</div>
        <div class="fg">
          <label>Câu hoàn chỉnh (Hệ thống sẽ tự động xáo trộn từ cho học sinh) *</label>
          <input type="text" id="ud-wrt-sentence" style="font-size:15px" value="${esc(it1.correctSentence || '')}">
        </div>
        <div class="fg">
          <label>Gợi ý cấu trúc</label>
          <input type="text" id="ud-wrt-hint" value="${esc(it1.hint || '')}">
        </div>
        <div class="fg">
          <label>🖼️ Hình ảnh minh họa bài tập (Tùy chọn)</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="ud-wrt-image" placeholder="VD: https://... hoặc chọn từ thư viện" value="${esc(it1.image || '')}">
            <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-wrt-image', 'ud-wrt-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
          </div>
          <div id="ud-wrt-img-preview" style="margin-top:6px">${it1.image ? `<img src="${it1.image}" style="max-height:140px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
        </div>
      </div>
    `;
  } else if (skill === 'languageFocus') {
    const lf = unit.languageFocus || { flashcards: [] };
    const fc = lf.flashcards?.[0] || { word: 'Sustainable', pos: 'adjective', ipa: '/səˈsteɪ.nə.bəl/', meaning: 'Bền vững', example: 'Solar energy is sustainable.', image: '' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">🎴 Thẻ Từ Vựng 3D (3D Flashcard với Hình Ảnh Minh Họa)</div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>Từ vựng (Word) *</label><input id="ud-fc-word" value="${esc(fc.word || '')}"></div>
          <div class="fg" style="margin:0"><label>Từ loại (noun/verb/adj)</label><input id="ud-fc-pos" value="${esc(fc.pos || '')}"></div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>Phiên âm IPA</label><input id="ud-fc-ipa" value="${esc(fc.ipa || '')}"></div>
          <div class="fg" style="margin:0"><label>Nghĩa tiếng Việt *</label><input id="ud-fc-meaning" value="${esc(fc.meaning || '')}"></div>
        </div>
        <div class="fg" style="margin-top:10px">
          <label>🖼️ URL Hình ảnh minh họa cho thẻ 3D</label>
          <div style="display:flex;gap:8px;">
            <input id="ud-fc-image" placeholder="VD: https://images.unsplash.com/photo-... hoặc chọn từ thư viện" value="${esc(fc.image || '')}">
            <button type="button" class="btn btn-sm btn-p" onclick="window.openSelectGalleryModal('ud-fc-image', 'ud-fc-img-preview')" style="white-space:nowrap;">📂 Thư viện ảnh</button>
          </div>
          <div id="ud-fc-img-preview" style="margin-top:6px">${fc.image ? `<img src="${fc.image}" style="max-height:140px;border-radius:6px;border:1px solid #cbd5e1">` : ''}</div>
        </div>
        <div class="fg" style="margin-top:10px">
          <label>Ví dụ thực tế (Example)</label>
          <input id="ud-fc-example" value="${esc(fc.example || '')}">
        </div>
      </div>
    `;
  }

  // Tự động căn chỉnh chiều cao textareas để hiển thị toàn bộ nội dung
  autoFitAllDesignerTextareas();
}

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
  const card = document.getElementById(`rp-turn-card-${idx}`);
  if (card && confirm("Bạn có chắc chắn muốn xóa lượt thoại này?")) {
    card.remove();
  }
};

window.testRoleplayDesignerTTS = function(idx) {
  const textInp = document.getElementById(`rp-turn-text-${idx}`);
  const text = textInp?.value.trim();
  if (!text) {
    alert("Vui lòng nhập câu tiếng Anh trước khi nghe thử!");
    return;
  }
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
};

window.handleUploadRoleplayVideo = async function(idx, inputEl) {
  const file = inputEl.files?.[0];
  if (!file) return;

  const videoInp = document.getElementById(`rp-turn-video-${idx}`);
  if (!videoInp) return;

  try {
    videoInp.value = "⏳ Đang tải video lên máy chủ...";
    const downloadURL = await uploadMediaFile(file, 'audio-bank'); // bucket video/audio
    videoInp.value = downloadURL;
    alert("✅ Đã tải video lên thành công!");
  } catch (err) {
    console.error("Lỗi upload video:", err);
    videoInp.value = "";
    alert("❌ Lỗi tải video: " + (err.message || "Vui lòng kiểm tra dung lượng hoặc dán trực tiếp đường dẫn video online."));
  }
};

// 5. LƯU THAY ĐỔI CỦA SKILL ĐANG SỬA VÀO DRAFT
function syncCurrentDesignerSkillToDraft() {
  if (!window._currentDraftUnit) return;
  const unit = window._currentDraftUnit;

  if (currentDesignerSkill === 'listening') {
    const text = $('ud-lis-text')?.value.trim();
    const image = $('ud-lis-image')?.value.trim();
    const dict = $('ud-lis-dictation')?.value.trim();
    const q = $('ud-lis-q')?.value.trim();
    const a = $('ud-lis-a')?.value.trim();
    const b = $('ud-lis-b')?.value.trim();

    if (!unit.listening) unit.listening = [];
    if (!unit.listening[0]) unit.listening[0] = { id: 'lis_1', exercises: [] };
    
    if (text) unit.listening[0].audioText = text;
    unit.listening[0].image = image || '';
    unit.listening[0].exercises = [
      {
        type: 'mcq',
        question: q || 'What is the main topic?',
        options: [a || 'Option A', b || 'Option B', 'Option C', 'Option D'],
        answer: 0
      },
      {
        type: 'dictation',
        prompt: 'Nghe và gõ lại chính xác câu:',
        targetSentence: dict || 'Please listen carefully.'
      }
    ];
  } else if (currentDesignerSkill === 'reading') {
    const passage = $('ud-read-passage')?.value.trim();
    const image = $('ud-read-image')?.value.trim();
    const vocabRaw = $('ud-read-vocab')?.value.trim();
    if (!unit.reading) unit.reading = [];
    if (!unit.reading[0]) unit.reading[0] = { id: 'read_1', exercises: [] };

    if (passage) unit.reading[0].passage = passage;
    unit.reading[0].image = image || '';
    if (vocabRaw) {
      try { unit.reading[0].vocabulary = JSON.parse(vocabRaw); } catch(e){}
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
    const sentence = $('ud-wrt-sentence')?.value.trim();
    const hint = $('ud-wrt-hint')?.value.trim();
    const image = $('ud-wrt-image')?.value.trim();

    if (!unit.writing) unit.writing = [];
    if (!unit.writing[0]) unit.writing[0] = { id: 'wrt_1', items: [] };
    if (sentence) {
      const words = sentence.split(/\s+/);
      unit.writing[0].items = [{ id: 'sc_1', words, correctSentence: sentence, hint: hint || '', image: image || '' }];
    }
  } else if (currentDesignerSkill === 'languageFocus') {
    const word = $('ud-fc-word')?.value.trim();
    const pos = $('ud-fc-pos')?.value.trim();
    const ipa = $('ud-fc-ipa')?.value.trim();
    const meaning = $('ud-fc-meaning')?.value.trim();
    const image = $('ud-fc-image')?.value.trim();
    const example = $('ud-fc-example')?.value.trim();

    if (!unit.languageFocus) unit.languageFocus = { flashcards: [], matchPairs: [], grammarChallenge: [] };
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
