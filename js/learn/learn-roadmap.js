/**
 * MODULE LEARN ROADMAP & NAVIGATION (js/learn/learn-roadmap.js)
 * Bộ chọn đa cấp: Môn học (Subject) ➔ Học phần (Module) ➔ Unit bài học & Điều hướng 5 Kỹ năng
 */
import { DEFAULT_UNITS } from '../learn-data.js';
import {
  allUnits, setAllUnits,
  currentUnit, setCurrentUnit,
  currentSkillTab, setCurrentSkillTab,
  currentSubject, setCurrentSubject,
  currentModule, setCurrentModule,
  safeArray, safeObj
} from './learn-common.js';

import {
  getAuthenticatedStudent,
  initAuthenticatedLearn,
  logoutLearnStudent
} from './learn-auth.js';

import { initListening } from './learn-listening.js';
import { initReading } from './learn-reading.js';
import { initSpeaking } from './learn-speaking.js';
import { initWriting } from './learn-writing.js';
import { initLanguageFocus } from './learn-lang-focus.js';

const db = () => window.supabaseClient;

export function selectUnitTile(unitId) {
  const chosen = allUnits.find(u => u.id === unitId);
  if (chosen) {
    setCurrentUnit(chosen);
    updateBreadcrumbs();
    loadCurrentUnitView();
  }
}

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
  if (m.toLowerCase().includes('công binh') || m.toLowerCase().includes('military engineering')) {
    return 'Tiếng Anh Chuyên Ngành Công Binh';
  }
  if (m.includes('Tiếng Anh cơ bản 1') || m.includes('Basic English Module 1') || m.includes('Tiếng Anh cơ bản')) {
    return 'English B1 - General & Academic Skills';
  }
  return m;
}

export async function loadUnitsData() {
  let loaded = [];
  try {
    if (db()) {
      const { data, error } = await db().from('learning_units').select('*').eq('is_hidden', false).order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        loaded = data.map(u => {
          const defMatch = DEFAULT_UNITS.find(d => d.id === u.id) || DEFAULT_UNITS[0];
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
            listening: safeArray(u.listening, defMatch?.listening || []),
            reading: safeArray(u.reading, defMatch?.reading || []),
            speaking: safeArray(u.speaking, defMatch?.speaking || []),
            writing: safeArray(u.writing, defMatch?.writing || []),
            languageFocus: safeObj(u.language_focus || u.languageFocus, defMatch?.languageFocus || {})
          };
        });

        DEFAULT_UNITS.forEach(defUnit => {
          if (!loaded.some(u => u.id === defUnit.id)) {
            loaded.push({ ...defUnit });
          }
        });
      } else {
        loaded = DEFAULT_UNITS.filter(u => !u.isHidden);
      }
    } else {
      loaded = DEFAULT_UNITS.filter(u => !u.isHidden);
    }
  } catch (err) {
    console.warn("Lỗi tải units:", err);
    loaded = DEFAULT_UNITS.filter(u => !u.isHidden);
  }

  if (!loaded.length) loaded = DEFAULT_UNITS;
  setAllUnits(loaded);

  const urlParams = new URLSearchParams(window.location.search);
  const paramSub = urlParams.get('subject');
  if (paramSub) {
    const matched = loaded.find(u => (u.subject || '').toLowerCase().includes(paramSub.toLowerCase()));
    if (matched) setCurrentSubject(matched.subject);
  }

  const initialUnit = loaded.find(u => !currentSubject || u.subject === currentSubject) || loaded[0];
  setCurrentUnit(initialUnit);

  renderCascadingSelectors();
  loadCurrentUnitView();
}

export function renderCascadingSelectors() {
  const subSel = document.getElementById('learn-subject-select');
  const modSel = document.getElementById('learn-module-select');
  const unitSel = document.getElementById('learn-unit-select');
  if (!subSel || !modSel || !unitSel) return;

  const subjects = [...new Set(allUnits.map(u => u.subject || '🇬🇧 Tiếng Anh'))];
  if (!currentSubject || !subjects.includes(currentSubject)) {
    setCurrentSubject(currentUnit?.subject || subjects[0] || '🇬🇧 Tiếng Anh');
  }

  subSel.innerHTML = subjects.map(s => `
    <option value="${s}" ${s === currentSubject ? 'selected' : ''}>📚 ${s}</option>
  `).join('');

  const unitsInSubject = allUnits.filter(u => (u.subject || '🇬🇧 Tiếng Anh') === currentSubject);
  const modules = [...new Set(unitsInSubject.map(u => u.module || 'Học phần cơ bản'))];
  
  if (!currentModule || !modules.includes(currentModule)) {
    setCurrentModule((currentUnit?.module && modules.includes(currentUnit.module)) ? currentUnit.module : (modules[0] || ''));
  }

  modSel.innerHTML = modules.map(m => `
    <option value="${m}" ${m === currentModule ? 'selected' : ''}>📦 ${m}</option>
  `).join('');

  const unitsInModule = unitsInSubject.filter(u => (u.module || 'Học phần cơ bản') === currentModule);
  
  if (!currentUnit || !unitsInModule.some(u => u.id === currentUnit.id)) {
    setCurrentUnit(unitsInModule[0] || unitsInSubject[0] || allUnits[0]);
  }

  unitSel.innerHTML = unitsInModule.map(u => `
    <option value="${u.id}" ${currentUnit && u.id === currentUnit.id ? 'selected' : ''}>
      ${u.icon || '📖'} ${u.title} (${u.level || 'A2'})
    </option>
  `).join('');

  updateBreadcrumbs();
  updateSubjectUI(currentSubject);
}

export function updateSubjectUI(subject) {
  const isEng = !subject || subject.includes('Tiếng Anh') || subject.includes('English');
  const unitLabel = document.getElementById('lbl-unit-select');
  if (unitLabel) {
    unitLabel.textContent = isEng ? '3. UNIT BÀI HỌC (5 KỸ NĂNG)' : '3. BÀI HỌC TƯƠNG TÁC (INTERACTIVE LESSON)';
  }

  const navRow = document.getElementById('learn-skill-nav-row');
  if (navRow) {
    if (isEng) {
      navRow.innerHTML = `
        <button class="skill-tab-btn ${currentSkillTab === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchSkillTab('listening')">
          <span class="tab-icon">🎧</span>
          <span class="tab-label">1. LISTENING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">📖</span>
          <span class="tab-label">2. READING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span class="tab-label">3. SPEAKING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span class="tab-label">4. WRITING</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🔍</span>
          <span class="tab-label">5. LANGUAGE FOCUS</span>
        </button>
      `;
    } else {
      navRow.innerHTML = `
        <button class="skill-tab-btn ${currentSkillTab === 'listening' ? 'active' : ''}" data-skill="listening" onclick="window.switchSkillTab('listening')">
          <span class="tab-icon">📖</span>
          <span class="tab-label">1. LÝ THUYẾT & BÀI GIẢNG</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'reading' ? 'active' : ''}" data-skill="reading" onclick="window.switchSkillTab('reading')">
          <span class="tab-icon">💡</span>
          <span class="tab-label">2. VÍ DỤ MINH HỌA</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'speaking' ? 'active' : ''}" data-skill="speaking" onclick="window.switchSkillTab('speaking')">
          <span class="tab-icon">🗣️</span>
          <span class="tab-label">3. ĐỌC CÔNG THỨC / CODE</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'writing' ? 'active' : ''}" data-skill="writing" onclick="window.switchSkillTab('writing')">
          <span class="tab-icon">✍️</span>
          <span class="tab-label">4. BÀI TẬP TỰ LUYỆN</span>
        </button>
        <button class="skill-tab-btn ${currentSkillTab === 'languageFocus' ? 'active' : ''}" data-skill="languageFocus" onclick="window.switchSkillTab('languageFocus')">
          <span class="tab-icon">🧠</span>
          <span class="tab-label">5. CÔNG THỨC & TRẮC NGHIỆM</span>
        </button>
      `;
    }
  }
}

export function updateBreadcrumbs() {
  const bcSub = document.getElementById('bc-subject');
  const bcMod = document.getElementById('bc-module');
  const bcUnit = document.getElementById('bc-unit');

  if (bcSub) bcSub.textContent = currentSubject || '🇬🇧 Tiếng Anh';
  if (bcMod) bcMod.textContent = currentModule || 'Học phần cơ bản';
  if (bcUnit) bcUnit.textContent = currentUnit?.title || 'Unit bài học';
}

export function loadCurrentUnitView() {
  if (!currentUnit) return;
  const iconEl = document.getElementById('current-unit-icon');
  const descEl = document.getElementById('current-unit-desc');

  if (iconEl) iconEl.textContent = currentUnit.icon || '📖';
  if (descEl) descEl.textContent = currentUnit.description || `Chủ đề: ${currentUnit.topic || 'General'} • Trình độ: ${currentUnit.level || 'A2'}`;

  switchSkillTab(currentSkillTab);
}

export function switchSkillTab(skill) {
  if (!skill) return;
  setCurrentSkillTab(skill);

  document.querySelectorAll('#learn-skill-nav-row .skill-tab-btn, #learn-skill-nav-row .subject-tab, .skill-tab-btn, .subject-tab').forEach(btn => {
    const btnSkill = btn.dataset.skill || btn.getAttribute('data-skill');
    btn.classList.toggle('active', btnSkill === skill);
  });

  const panelIds = ['skill-panel-listening', 'skill-panel-reading', 'skill-panel-speaking', 'skill-panel-writing', 'skill-panel-languageFocus'];
  panelIds.forEach(pId => {
    const panel = document.getElementById(pId);
    if (panel) {
      const isTarget = pId === `skill-panel-${skill}`;
      panel.classList.toggle('active', isTarget);
      panel.style.display = isTarget ? 'block' : 'none';
    }
  });

  try {
    if (skill === 'listening') initListening();
    else if (skill === 'reading') initReading();
    else if (skill === 'speaking') initSpeaking();
    else if (skill === 'writing') initWriting();
    else if (skill === 'languageFocus') initLanguageFocus();
  } catch (err) {
    console.error("Lỗi khi chuyển sang tab " + skill + ":", err);
  }
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.selectUnitTile = selectUnitTile;
  window.switchSkillTab = switchSkillTab;
  window.loadUnitsData = loadUnitsData;
  window.onLearnSubjectChange = function() {
    const subSel = document.getElementById('learn-subject-select');
    if (!subSel) return;
    setCurrentSubject(subSel.value);
    setCurrentModule('');
    renderCascadingSelectors();
    loadCurrentUnitView();
  };
  window.onLearnModuleChange = function() {
    const modSel = document.getElementById('learn-module-select');
    if (!modSel) return;
    setCurrentModule(modSel.value);
    renderCascadingSelectors();
    loadCurrentUnitView();
  };
  window.onLearnUnitChange = function() {
    const unitSel = document.getElementById('learn-unit-select');
    if (!unitSel) return;
    const chosen = allUnits.find(u => u.id === unitSel.value);
    if (chosen) {
      setCurrentUnit(chosen);
      updateBreadcrumbs();
      loadCurrentUnitView();
    }
  };
}
