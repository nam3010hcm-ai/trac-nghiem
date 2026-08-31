/**
 * MODULE UNIT DESIGNER CORE (js/units/designer-core.js)
 * Điều phối mở/đóng modal thiết kế, chuyển đổi 5 kỹ năng, đồng bộ bản nháp và hiển thị form
 */
import { clone, esc, state, isRootUser, $ } from '../common.js';
import { unitsState, editingUnitId, setEditingUnitId, currentDesignerSkill, setCurrentDesignerSkill } from './units-state.js';
import { renderListeningDesignerExercises } from './designer-listening.js';
import { renderReadingVocabularyDesigner } from './designer-reading-vocab.js';
import { renderReadingDesignerExercises } from './designer-reading-exercises.js';
import { renderLanguageFocusDesigner } from './designer-lang-focus.js';
import { syncCurrentDesignerSkillToDraft, saveUnit } from './designer-save.js';

export function autoFitAllDesignerTextareas() {
  const tas = document.querySelectorAll('.designer-textarea');
  tas.forEach(ta => {
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight + 6, 90) + 'px';
  });
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

export function openUnitEditor(id = null) {
  setEditingUnitId(id);
  const modal = document.getElementById('unit-designer-modal') || document.getElementById('modal-unit-designer');
  if (!modal) return;

  let unit = null;
  if (id) {
    const found = unitsState.find(u => u.id === id);
    if (found) unit = clone(found);
  }

  if (!unit) {
    const curSub = $('flt-unit-subject')?.value || $('filter-unit-subject')?.value;
    const curMod = $('flt-unit-module')?.value || $('filter-unit-module')?.value;

    unit = {
      id: 'unit_' + Date.now(),
      subject: (curSub && curSub !== 'all') ? curSub : '🇬🇧 Tiếng Anh',
      module: (curMod && curMod !== 'all') ? curMod : 'English B1 - General & Academic Skills',
      title: 'Unit ' + (unitsState.length + 1) + ': New Lesson',
      topic: 'General Topic',
      level: 'A2 - B1',
      icon: '📖',
      description: 'Mô tả bài học tương tác 5 kỹ năng',
      listening: [],
      reading: [],
      speaking: [],
      writing: [],
      languageFocus: {}
    };
  }

  window._currentDraftUnit = unit;

  if ($('ud-title')) $('ud-title').value = unit.title || '';
  if ($('ud-subject')) $('ud-subject').value = unit.subject || '';
  if ($('ud-module')) $('ud-module').value = unit.module || '';
  if ($('ud-topic')) $('ud-topic').value = unit.topic || '';
  if ($('ud-level')) $('ud-level').value = unit.level || 'A2 - B1';
  if ($('ud-icon')) $('ud-icon').value = unit.icon || '📖';
  if ($('ud-desc')) $('ud-desc').value = unit.description || '';

  updateDesignerSubjectLabels(unit.subject);
  switchDesignerSkillTab('listening');
  modal.style.display = 'flex';
}

export function closeUnitEditor() {
  const modal = document.getElementById('unit-designer-modal') || document.getElementById('modal-unit-designer');
  if (modal) modal.style.display = 'none';
  window._currentDraftUnit = null;
  setEditingUnitId(null);
}

export function switchDesignerSkillTab(skill) {
  setCurrentDesignerSkill(skill);
  document.querySelectorAll('.ud-skill-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.skill === skill);
  });
  renderCurrentDesignerSkillBody();
}

export function renderCurrentDesignerSkillBody() {
  const contentWrap = document.getElementById('ud-skill-content-wrap');
  if (!contentWrap || !window._currentDraftUnit) return;

  const unit = window._currentDraftUnit;
  const skill = currentDesignerSkill;

  if (skill === 'listening') {
    const l1 = (unit.listening && unit.listening[0]) ? unit.listening[0] : {};
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:14px">
        <div class="grid2">
          <div class="fg" style="margin:0">
            <label>Loại Media</label>
            <select id="ud-lis-media-type">
              <option value="audio" ${l1.mediaType === 'audio' ? 'selected' : ''}>🎧 Audio MP3 / Web Speech AI</option>
              <option value="video" ${l1.mediaType === 'video' ? 'selected' : ''}>🎬 Video MP4 / YouTube</option>
            </select>
          </div>
          <div class="fg" style="margin:0">
            <label>Tiêu đề phần nghe</label>
            <input type="text" id="ud-lis-title" value="${esc(l1.title || 'Listening Practice')}">
          </div>
        </div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>Audio URL (tùy chọn)</label><input type="text" id="ud-lis-audio-url" value="${esc(l1.audioUrl || '')}"></div>
          <div class="fg" style="margin:0"><label>Video URL (tùy chọn)</label><input type="text" id="ud-lis-video-url" value="${esc(l1.videoUrl || '')}"></div>
        </div>
        <div class="fg" style="margin:0">
          <label>Transcript / Lời thoại phát âm Web Speech AI</label>
          <textarea id="ud-lis-transcript" class="designer-textarea" style="min-height:90px">${esc(l1.transcript || l1.audioText || '')}</textarea>
        </div>
        <div>
          <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:10px">📋 Danh sách câu hỏi nghe hiểu:</div>
          <div id="ud-listening-exercises-container">${renderListeningDesignerExercises(l1.exercises || [])}</div>
        </div>
      </div>
    `;
  } else if (skill === 'reading') {
    const r1 = (unit.reading && unit.reading[0]) ? unit.reading[0] : {};
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:16px">
        <div class="fg" style="margin:0">
          <label>Nội dung đoạn văn (Reading Passage) *</label>
          <textarea id="ud-read-passage" class="designer-textarea" style="min-height:140px">${esc(r1.passage || '')}</textarea>
        </div>
        ${renderReadingVocabularyDesigner(r1.vocabulary || {})}
        <div>
          <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:10px">📋 10 Dạng bài tập đọc hiểu sư phạm:</div>
          <div id="ud-reading-exercises-container">${renderReadingDesignerExercises(r1.exercises || [])}</div>
        </div>
      </div>
    `;
  } else if (skill === 'speaking') {
    const s1 = (unit.speaking && unit.speaking[0]) ? unit.speaking[0] : {};
    const p1 = (s1.phrases && s1.phrases[0]) ? s1.phrases[0] : { text: 'Hello, welcome to Vietnam!', ipa: '/həˈloʊ/', meaning: 'Xin chào, chào mừng đến Việt Nam' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:14px">
        <div class="fg" style="margin:0"><label>Câu luyện phát âm mẫu *</label><input type="text" id="ud-spk-text" value="${esc(p1.text || '')}"></div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>Phiên âm IPA</label><input type="text" id="ud-spk-ipa" value="${esc(p1.ipa || '')}"></div>
          <div class="fg" style="margin:0"><label>Dịch nghĩa</label><input type="text" id="ud-spk-meaning" value="${esc(p1.meaning || '')}"></div>
        </div>
      </div>
    `;
  } else if (skill === 'writing') {
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;gap:14px">
        <div class="fg" style="margin:0"><label>Câu gốc khẳng định (+)</label><input type="text" id="ud-wrt-tf-orig" value="They arrived on time yesterday."></div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>a) Đáp án Phủ định (-)</label><input type="text" id="ud-wrt-tf-neg" value="They did not arrive on time yesterday."></div>
          <div class="fg" style="margin:0"><label>b) Đáp án Nghi vấn (?)</label><input type="text" id="ud-wrt-tf-ques" value="Did they arrive on time yesterday?"></div>
        </div>
      </div>
    `;
  } else if (skill === 'languageFocus') {
    contentWrap.innerHTML = renderLanguageFocusDesigner(unit);
  }

  autoFitAllDesignerTextareas();
}

if (typeof window !== 'undefined') {
  window.openUnitEditor = openUnitEditor;
  window.closeUnitEditor = closeUnitEditor;
  window.switchDesignerSkillTab = (skill) => {
    syncCurrentDesignerSkillToDraft();
    switchDesignerSkillTab(skill);
  };
  window.autoFitAllDesignerTextareas = autoFitAllDesignerTextareas;
  window.updateDesignerSubjectLabels = updateDesignerSubjectLabels;
  window.onDesignerSubjectInput = updateDesignerSubjectLabels;
}
