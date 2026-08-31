/**
 * MODULE UNIT DESIGNER SAVE & SYNC (js/units/designer-save.js)
 * Đồng bộ dữ liệu bản nháp từ DOM và lưu Unit bài học vào Supabase
 */
import { $, state, logTeacherActivity } from '../common.js';
import { unitsState, editingUnitId, currentDesignerSkill, safeUpsertUnit } from './units-state.js';
import { updateDatalists, renderUnitsList, populateUnitFilters } from './units-list.js';
import { extractListeningExercisesFromDOM } from './designer-listening.js';
import { extractReadingExercisesFromDOM } from './designer-reading-exercises.js';
import { closeUnitEditor } from './designer-core.js';

export function syncCurrentDesignerSkillToDraft() {
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
    const exercises = extractReadingExercisesFromDOM(unit.reading?.[0]?.exercises || []);

    if (!unit.reading) unit.reading = [];
    if (!unit.reading[0]) unit.reading[0] = { id: 'read_1', exercises: [] };

    if (passage !== undefined) unit.reading[0].passage = passage;
    unit.reading[0].image = image || '';

    const vocabRows = document.querySelectorAll('#ud-read-vocab-tbody tr.read-vocab-row');
    if (vocabRows.length > 0) {
      const vocabObj = {};
      vocabRows.forEach(row => {
        const word = (row.querySelector('.read-vocab-word')?.value || '').trim().toLowerCase();
        const ipa = (row.querySelector('.read-vocab-ipa')?.value || '').trim();
        const pos = row.querySelector('.read-vocab-pos')?.value || 'noun';
        const meaning = (row.querySelector('.read-vocab-meaning')?.value || '').trim();
        if (word && meaning) {
          vocabObj[word] = { ipa: ipa || '', pos: pos || 'noun', meaning: meaning || '' };
        }
      });
      unit.reading[0].vocabulary = vocabObj;
    }
    if (exercises.length) unit.reading[0].exercises = exercises;
  } else if (currentDesignerSkill === 'speaking') {
    const text = $('ud-spk-text')?.value.trim();
    const ipa = $('ud-spk-ipa')?.value.trim();
    const meaning = $('ud-spk-meaning')?.value.trim();
    const image = $('ud-spk-image')?.value.trim();

    if (!unit.speaking) unit.speaking = [];
    if (!unit.speaking[0]) unit.speaking[0] = { id: 'spk_1', phrases: [] };
    unit.speaking[0].type = 'phrases';
    if (text) {
      unit.speaking[0].phrases = [{ text, ipa: ipa || '', meaning: meaning || '', image: image || '', tip: 'Luyện phát âm chuẩn âm cuối.' }];
    }
  } else if (currentDesignerSkill === 'writing') {
    const tfOrig = $('ud-wrt-tf-orig')?.value.trim();
    const tfNeg = $('ud-wrt-tf-neg')?.value.trim();
    const tfQues = $('ud-wrt-tf-ques')?.value.trim();
    const tfHint = $('ud-wrt-tf-hint')?.value.trim();
    const scSentence = $('ud-wrt-scramble-sentence')?.value.trim();
    const scHint = $('ud-wrt-scramble-hint')?.value.trim();

    const newWrtList = [];
    if (tfOrig) {
      newWrtList.push({
        id: 'wrt_transform',
        title: 'Exercise 3. Make these sentences a) Negative and b) Question',
        category: 'transformation',
        items: [{ id: 'tf_1', originalSentence: tfOrig, negativeAnswer: tfNeg || '', questionAnswer: tfQues || '', hint: tfHint || '' }]
      });
    }
    if (scSentence) {
      newWrtList.push({
        id: 'wrt_scramble',
        title: 'Exercise 4. Reorder the words to make meaningful sentences',
        category: 'scramble',
        items: [{ id: 'sc_1', words: scSentence.split(/\s+/), correctSentence: scSentence, hint: scHint || '' }]
      });
    }
    if (newWrtList.length) unit.writing = newWrtList;
  } else if (currentDesignerSkill === 'languageFocus') {
    if (!unit.languageFocus) unit.languageFocus = {};

    // 1. Past verbs
    const verbRows = document.querySelectorAll('#ud-lf-verbs-tbody tr.lf-verb-row');
    if (verbRows.length > 0) {
      const vList = [];
      verbRows.forEach(r => {
        const inf = (r.querySelector('.lf-verb-inf')?.value || '').trim();
        const past = (r.querySelector('.lf-verb-past')?.value || '').trim();
        const meaning = (r.querySelector('.lf-verb-meaning')?.value || '').trim();
        if (inf || past) {
          vList.push({ infinitive: inf, past: past, meaning: meaning });
        }
      });
      unit.languageFocus.pastVerbs = vList;
    }

    // 2. Grammar challenge
    const gCards = document.querySelectorAll('#ud-lf-grammar-list .lf-grammar-card');
    if (gCards.length > 0) {
      const gList = [];
      gCards.forEach((c, idx) => {
        const q = (c.querySelector('.lf-g-q')?.value || '').trim();
        const optA = (c.querySelector('.lf-g-opt0')?.value || '').trim();
        const optB = (c.querySelector('.lf-g-opt1')?.value || '').trim();
        const optC = (c.querySelector('.lf-g-opt2')?.value || '').trim();
        const optD = (c.querySelector('.lf-g-opt3')?.value || '').trim();
        const ans = (c.querySelector('.lf-g-ans')?.value || 'A').trim();
        const exp = (c.querySelector('.lf-g-exp')?.value || '').trim();
        if (q) {
          gList.push({
            id: 'g_' + (idx + 1),
            question: q,
            options: [optA, optB, optC, optD].filter(Boolean),
            answer: ans,
            explanation: exp
          });
        }
      });
      unit.languageFocus.grammarChallenge = gList;
    }

    // 3. Backward spelling
    const spCards = document.querySelectorAll('#ud-lf-spelling-list .lf-spelling-card');
    if (spCards.length > 0) {
      const spList = [];
      spCards.forEach((c, idx) => {
        const target = (c.querySelector('.lf-sp-target')?.value || '').trim().toUpperCase();
        const scrambled = (c.querySelector('.lf-sp-scrambled')?.value || '').trim().toUpperCase();
        const clue = (c.querySelector('.lf-sp-clue')?.value || '').trim();
        const hint = (c.querySelector('.lf-sp-hint')?.value || '').trim();
        if (target) {
          spList.push({
            id: 'sp_' + (idx + 1),
            targetWord: target,
            scrambled: scrambled || target.split('').reverse().join(''),
            clue: clue,
            hint: hint
          });
        }
      });
      unit.languageFocus.backwardSpelling = spList;
    }

    // 4. Match pairs
    const pairRows = document.querySelectorAll('#ud-lf-pairs-tbody tr.lf-pair-row');
    if (pairRows.length > 0) {
      const pList = [];
      pairRows.forEach((r, idx) => {
        const left = (r.querySelector('.lf-pair-left')?.value || '').trim();
        const right = (r.querySelector('.lf-pair-right')?.value || '').trim();
        if (left && right) {
          pList.push({ id: 'p_' + (idx + 1), left, right });
        }
      });
      unit.languageFocus.matchPairs = pList;
    }

    // 5. Flashcards
    const fcCards = document.querySelectorAll('#ud-lf-cards-list .lf-flashcard-card');
    if (fcCards.length > 0) {
      const fcList = [];
      fcCards.forEach((c, idx) => {
        const front = (c.querySelector('.lf-fc-front')?.value || '').trim();
        const ipa = (c.querySelector('.lf-fc-ipa')?.value || '').trim();
        const pos = (c.querySelector('.lf-fc-pos')?.value || 'noun').trim();
        const back = (c.querySelector('.lf-fc-back')?.value || '').trim();
        const example = (c.querySelector('.lf-fc-example')?.value || '').trim();
        if (front) {
          fcList.push({
            id: 'fc_' + (idx + 1),
            front,
            ipa,
            pos,
            back,
            example
          });
        }
      });
      unit.languageFocus.flashcards = fcList;
    }
  }
}

export async function saveUnit() {
  syncCurrentDesignerSkillToDraft();

  const title = $('ud-title')?.value.trim();
  const subject = $('ud-subject')?.value.trim() || '🇬🇧 Tiếng Anh';
  const module = $('ud-module')?.value.trim() || 'English B1 - General & Academic Skills';
  const topic = $('ud-topic')?.value.trim() || '';
  const level = $('ud-level')?.value.trim() || 'A2 - B1';
  const icon = $('ud-icon')?.value.trim() || '📖';
  const desc = $('ud-desc')?.value.trim() || '';

  if (!title) {
    alert("Vui lòng nhập Tiêu đề Unit (Unit Title)!");
    $('ud-title')?.focus();
    return;
  }

  const draft = window._currentDraftUnit || {};
  const unitId = editingUnitId || draft.id || ('unit_' + Date.now());

  const fullContent = {
    subject,
    module,
    listening: draft.listening || [],
    reading: draft.reading || [],
    speaking: draft.speaking || [],
    writing: draft.writing || [],
    languageFocus: draft.languageFocus || draft.language_focus || {}
  };

  const payload = {
    id: unitId,
    subject: subject,
    module: module,
    title: title,
    topic: topic,
    level: level,
    icon: icon,
    description: desc,
    is_hidden: draft.isHidden || false,
    listening: fullContent.listening,
    reading: fullContent.reading,
    speaking: fullContent.speaking,
    writing: fullContent.writing,
    language_focus: fullContent.languageFocus,
    content: JSON.stringify(fullContent),
    created_by: state.currentUserEmail || 'nam3010hcm@gmail.com',
    created_at: editingUnitId ? (draft.created_at || Date.now()) : Date.now(),
    updated_at: Date.now()
  };

  const btnSave = $('btn-save-unit');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '⏳ Đang lưu...';
  }

  try {
    const { error } = await safeUpsertUnit(payload);
    if (error) throw error;

    const existingIdx = unitsState.findIndex(u => u.id === unitId);
    const updatedLocal = {
      id: unitId,
      subject,
      module,
      title,
      topic,
      level,
      icon,
      description: desc,
      isHidden: draft.isHidden || false,
      created_by: payload.created_by,
      listening: fullContent.listening,
      reading: fullContent.reading,
      speaking: fullContent.speaking,
      writing: fullContent.writing,
      languageFocus: fullContent.languageFocus
    };

    if (existingIdx >= 0) {
      unitsState[existingIdx] = updatedLocal;
    } else {
      unitsState.unshift(updatedLocal);
    }

    populateUnitFilters();
    updateDatalists();
    renderUnitsList();
    closeUnitEditor();

    await logTeacherActivity(editingUnitId ? 'Cập nhật Unit' : 'Tạo Unit mới', 'Bài học & Khung chương trình', `Unit: ${title}`, `ID: ${unitId}`);
    alert("✅ Đã lưu Unit thành công!");
  } catch (e) {
    console.error("Lỗi khi lưu Unit:", e);
    alert("❌ Lỗi khi lưu Unit: " + (e.message || ''));
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = '💾 Lưu Lên Hệ Thống';
    }
  }
}

if (typeof window !== 'undefined') {
  window.saveUnit = saveUnit;
  window.syncCurrentDesignerSkillToDraft = syncCurrentDesignerSkillToDraft;
}
