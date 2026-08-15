/**
 * =========================================================================
 * MODULE QUẢN LÝ & THIẾT KẾ UNIT BÀI HỌC (units.js)
 * Teacher Learning Units & 5-Skills Designer Engine
 * =========================================================================
 */

import { DEFAULT_UNITS } from './learn-data.js';
import { $, esc, clone } from './common.js';

const db = () => window.supabaseClient;

export let unitsState = [];
let editingUnitId = null;
let currentDesignerSkill = 'listening';

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
      await db().from('learning_units').upsert(inserts, { onConflict: 'id' });
    } else {
      unitsState = data.map(u => ({
        id: u.id,
        title: u.title,
        topic: u.topic || '',
        level: u.level || 'A2 - B1',
        icon: u.icon || '📖',
        description: u.description || '',
        isHidden: u.is_hidden ?? false,
        listening: u.listening || [],
        reading: u.reading || [],
        speaking: u.speaking || [],
        writing: u.writing || [],
        languageFocus: u.language_focus || u.languageFocus || {}
      }));
    }
  } catch (err) {
    console.error("Lỗi loadUnits:", err);
    unitsState = clone(DEFAULT_UNITS);
  }
}

// 2. RENDER DANH SÁCH UNIT TRÊN BẢNG ĐIỀU KHIỂN
export function renderUnitsList() {
  const container = document.getElementById('unit-management-list');
  const countEl = document.getElementById('unit-count-badge');
  if (!container) return;

  if (countEl) countEl.textContent = unitsState.length;

  if (!unitsState.length) {
    container.innerHTML = '<div class="empty">📭 Chưa có Unit bài học nào. Bấm "+ Tạo Unit Mới" để bắt đầu thiết kế!</div>';
    return;
  }

  container.innerHTML = unitsState.map((u, idx) => {
    const isHidden = u.isHidden;
    const lisCount = (u.listening || []).length;
    const readCount = (u.reading || []).length;
    const spkCount = (u.speaking || []).length;
    const wrtCount = (u.writing || []).length;
    const fcCount = (u.languageFocus?.flashcards || []).length;

    return `
      <div class="qitem" style="border-left: 4px solid ${isHidden ? '#94a3b8' : '#3b82f6'};">
        <div class="qrow">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span style="font-size:20px">${u.icon || '📖'}</span>
              <span style="font-size:16px;font-weight:700;color:#1e293b">${esc(u.title)}</span>
              <span class="cat-badge" style="background:#e0f2fe;color:#0369a1">${esc(u.level || 'A2')}</span>
              <span class="badge-status ${isHidden ? 'status-hidden' : 'status-active'}">${isHidden ? 'Đã ẩn' : 'Đang mở'}</span>
            </div>
            <div style="font-size:13px;color:#64748b;margin-bottom:8px">${esc(u.description || u.topic || '')}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:12px">
              <span class="abadge">🎧 Listening (${lisCount})</span>
              <span class="abadge">📖 Reading (${readCount})</span>
              <span class="abadge">🗣️ Speaking (${spkCount})</span>
              <span class="abadge">✍️ Writing (${wrtCount})</span>
              <span class="abadge">🔍 Flashcards (${fcCount})</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end">
            <button class="btn btn-sm" onclick="window.openUnitEditor('${u.id}')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">
              🎛️ Thiết kế 5 Kỹ năng
            </button>
            <button class="btn btn-sm ${isHidden ? 'btn-warn' : 'btn-p'}" onclick="window.toggleUnitVisibility('${u.id}')">
              ${isHidden ? '👁️ Mở Unit' : '🙈 Ẩn Unit'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteUnit('${u.id}')">
              🗑️ Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. MỞ MODAL THIẾT KẾ UNIT & 5 KỸ NĂNG
export function openUnitEditor(unitId = null) {
  editingUnitId = unitId;
  const modal = document.getElementById('unit-designer-modal');
  if (!modal) return;

  const unit = unitId ? unitsState.find(u => u.id === unitId) : {
    id: 'unit_' + Date.now(),
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
  $('ud-title').value = unit.title || '';
  $('ud-topic').value = unit.topic || '';
  $('ud-level').value = unit.level || 'A2 - B1';
  $('ud-icon').value = unit.icon || '📖';
  $('ud-desc').value = unit.description || '';

  // Lưu tạm unit đang chỉnh sửa vào window._currentDraftUnit
  window._currentDraftUnit = clone(unit);

  // Mở tab kỹ năng mặc định
  switchDesignerSkillTab('listening');
  modal.style.display = 'flex';
}

export function closeUnitEditor() {
  const modal = document.getElementById('unit-designer-modal');
  if (modal) modal.style.display = 'none';
  editingUnitId = null;
  window._currentDraftUnit = null;
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
      <div class="card" style="margin:0;padding:16px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px;color:#1e293b">🎧 1. Lời Thoại Đoạn Nghe (Audio Script / Text-to-Speech)</div>
        <textarea id="ud-lis-text" class="dictation-textarea" style="min-height:90px" placeholder="Nhập đoạn hội thoại hoặc văn bản tiếng Anh để hệ thống tự phát âm chuẩn...">${esc(lis.audioText || '')}</textarea>
        
        <div style="font-weight:700;margin:14px 0 8px;color:#1e293b">✍️ 2. Câu Nghe Chép Chính Tả (Dictation)</div>
        <input type="text" id="ud-lis-dictation" style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px" placeholder="VD: Gate 24B starts boarding at 10:30." value="${esc(lis.exercises?.find(e => e.type === 'dictation')?.targetSentence || '')}">

        <div style="font-weight:700;margin:14px 0 8px;color:#1e293b">📝 3. Câu Hỏi Trắc Nghiệm Nghe Hiểu</div>
        <div class="fg">
          <label>Nội dung câu hỏi</label>
          <input type="text" id="ud-lis-q" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.question || 'Where is the passenger flying to?')}">
        </div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>Đáp án A</label><input id="ud-lis-a" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.options?.[0] || 'London')}"></div>
          <div class="fg" style="margin:0"><label>Đáp án B</label><input id="ud-lis-b" value="${esc(lis.exercises?.find(e => e.type === 'mcq')?.options?.[1] || 'New York')}"></div>
        </div>
      </div>
    `;
  } else if (skill === 'reading') {
    const read = (unit.reading && unit.reading[0]) || { passage: '', vocabulary: {} };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:16px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px;color:#1e293b">📖 1. Đoạn Văn Đọc Hiểu (Reading Passage)</div>
        <textarea id="ud-read-passage" class="dictation-textarea" style="min-height:120px" placeholder="Nhập nội dung bài đọc...">${esc(read.passage || '')}</textarea>

        <div style="font-weight:700;margin:14px 0 8px;color:#1e293b">🔤 2. Danh Mục Tra Từ Nhanh (JSON format: word -> {ipa, pos, meaning})</div>
        <textarea id="ud-read-vocab" class="dictation-textarea" style="min-height:80px;font-family:monospace;font-size:12px">${esc(JSON.stringify(read.vocabulary || {}, null, 2))}</textarea>
      </div>
    `;
  } else if (skill === 'speaking') {
    const spk = (unit.speaking && unit.speaking[0]) || { phrases: [] };
    const p1 = spk.phrases?.[0] || { text: 'Practice makes perfect.', ipa: '', meaning: 'Rèn luyện tạo nên sự hoàn hảo' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:16px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px;color:#1e293b">🗣️ Câu Luyện Nói & Chấm Điểm Phát Âm (Micro AI)</div>
        <div class="fg">
          <label>Câu mẫu tiếng Anh</label>
          <input type="text" id="ud-spk-text" value="${esc(p1.text || '')}">
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
      </div>
    `;
  } else if (skill === 'writing') {
    const wrt = (unit.writing && unit.writing[0]) || { items: [] };
    const it1 = wrt.items?.[0] || { correctSentence: 'Learning English is fun and useful.', hint: 'Bắt đầu bằng Learning...' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:16px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px;color:#1e293b">✍️ Bài Tập Xếp Từ Thành Câu (Scramble)</div>
        <div class="fg">
          <label>Câu hoàn chỉnh (Hệ thống sẽ tự động xáo trộn từ cho học sinh)</label>
          <input type="text" id="ud-wrt-sentence" value="${esc(it1.correctSentence || '')}">
        </div>
        <div class="fg">
          <label>Gợi ý cấu trúc</label>
          <input type="text" id="ud-wrt-hint" value="${esc(it1.hint || '')}">
        </div>
      </div>
    `;
  } else if (skill === 'languageFocus') {
    const lf = unit.languageFocus || { flashcards: [] };
    const fc = lf.flashcards?.[0] || { word: 'Sustainable', pos: 'adjective', ipa: '/səˈsteɪ.nə.bəl/', meaning: 'Bền vững', example: 'Solar energy is sustainable.' };
    contentWrap.innerHTML = `
      <div class="card" style="margin:0;padding:16px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px;color:#1e293b">🎴 Thẻ Từ Vựng 3D (3D Flashcard)</div>
        <div class="grid2">
          <div class="fg" style="margin:0"><label>Từ vựng (Word)</label><input id="ud-fc-word" value="${esc(fc.word || '')}"></div>
          <div class="fg" style="margin:0"><label>Từ loại (noun/verb/adj)</label><input id="ud-fc-pos" value="${esc(fc.pos || '')}"></div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>Phiên âm IPA</label><input id="ud-fc-ipa" value="${esc(fc.ipa || '')}"></div>
          <div class="fg" style="margin:0"><label>Nghĩa tiếng Việt</label><input id="ud-fc-meaning" value="${esc(fc.meaning || '')}"></div>
        </div>
        <div class="fg" style="margin-top:10px">
          <label>Ví dụ thực tế (Example)</label>
          <input id="ud-fc-example" value="${esc(fc.example || '')}">
        </div>
      </div>
    `;
  }
}

// 5. LƯU THAY ĐỔI CỦA SKILL ĐANG SỬA VÀO DRAFT
function syncCurrentDesignerSkillToDraft() {
  if (!window._currentDraftUnit) return;
  const unit = window._currentDraftUnit;

  if (currentDesignerSkill === 'listening') {
    const text = $('ud-lis-text')?.value.trim();
    const dict = $('ud-lis-dictation')?.value.trim();
    const q = $('ud-lis-q')?.value.trim();
    const a = $('ud-lis-a')?.value.trim();
    const b = $('ud-lis-b')?.value.trim();

    if (!unit.listening) unit.listening = [];
    if (!unit.listening[0]) unit.listening[0] = { id: 'lis_1', exercises: [] };
    
    if (text) unit.listening[0].audioText = text;
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
    const vocabRaw = $('ud-read-vocab')?.value.trim();
    if (!unit.reading) unit.reading = [];
    if (!unit.reading[0]) unit.reading[0] = { id: 'read_1', exercises: [] };

    if (passage) unit.reading[0].passage = passage;
    if (vocabRaw) {
      try { unit.reading[0].vocabulary = JSON.parse(vocabRaw); } catch(e){}
    }
  } else if (currentDesignerSkill === 'speaking') {
    const text = $('ud-spk-text')?.value.trim();
    const ipa = $('ud-spk-ipa')?.value.trim();
    const meaning = $('ud-spk-meaning')?.value.trim();

    if (!unit.speaking) unit.speaking = [];
    if (!unit.speaking[0]) unit.speaking[0] = { id: 'spk_1', phrases: [] };
    if (text) {
      unit.speaking[0].phrases = [{ text, ipa: ipa || '', meaning: meaning || '', tip: 'Luyện phát âm chuẩn âm cuối.' }];
    }
  } else if (currentDesignerSkill === 'writing') {
    const sentence = $('ud-wrt-sentence')?.value.trim();
    const hint = $('ud-wrt-hint')?.value.trim();

    if (!unit.writing) unit.writing = [];
    if (!unit.writing[0]) unit.writing[0] = { id: 'wrt_1', items: [] };
    if (sentence) {
      const words = sentence.split(/\s+/);
      unit.writing[0].items = [{ id: 'sc_1', words, correctSentence: sentence, hint: hint || '' }];
    }
  } else if (currentDesignerSkill === 'languageFocus') {
    const word = $('ud-fc-word')?.value.trim();
    const pos = $('ud-fc-pos')?.value.trim();
    const ipa = $('ud-fc-ipa')?.value.trim();
    const meaning = $('ud-fc-meaning')?.value.trim();
    const example = $('ud-fc-example')?.value.trim();

    if (!unit.languageFocus) unit.languageFocus = { flashcards: [], matchPairs: [], grammarChallenge: [] };
    if (word) {
      unit.languageFocus.flashcards = [{ id: 'fc_1', word, pos: pos || 'noun', ipa: ipa || '', meaning: meaning || '', example: example || '' }];
    }
  }
}

// 6. LƯU TOÀN BỘ UNIT LÊN SUPABASE & STATE
export async function saveUnit() {
  syncCurrentDesignerSkillToDraft();
  const unit = window._currentDraftUnit;
  if (!unit) return;

  const title = $('ud-title')?.value.trim();
  if (!title) {
    alert('Vui lòng nhập Tên Unit bài học!');
    return;
  }

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
      created_at: Date.now()
    };

    const { error } = await db().from('learning_units').upsert([payload], { onConflict: 'id' });
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
