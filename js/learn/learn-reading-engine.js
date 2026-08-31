/**
 * MODULE LEARN READING ENGINE (js/learn/learn-reading-engine.js)
 * Hiển thị bài đọc hiểu có gán thẻ tra từ, modal popover từ điển tương tác & phát âm IPA
 */
import { esc, typesetMath } from '../common.js';
import { currentUnit, getUnitSkillList, speakText } from './learn-common.js';
import { renderReadingExercises } from './learn-reading-exercises.js';

export let currentReadLesson = null;

export function setCurrentReadLesson(l) {
  currentReadLesson = l;
}

export function initReading() {
  const list = getUnitSkillList(currentUnit, 'reading');
  currentReadLesson = list[0] || null;
  renderReadingLessons();
  if (currentReadLesson) loadReadingLesson(currentReadLesson.id);
  else {
    const ws = document.getElementById('read-workspace');
    if (ws) ws.innerHTML = '<div class="empty">Chưa có bài đọc trong Unit này.</div>';
  }
}

export function renderReadingLessons() {
  const container = document.getElementById('read-lesson-list');
  const list = getUnitSkillList(currentUnit, 'reading');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;width:100%">📭 Chưa có bài đọc trong Unit này.</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = currentReadLesson && item.id === currentReadLesson.id;
    return `
      <div class="lesson-card ${isSelected ? 'active' : ''}" onclick="window.selectReadingLesson('${item.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="lesson-badge">${item.level || currentUnit.level || 'A2 - B1'}</span>
          ${isSelected ? '<span class="active-badge">✓ Đang chọn</span>' : ''}
        </div>
        <div class="lesson-title">📖 ${item.title}</div>
        <div class="lesson-meta">🎯 Chủ đề: ${item.topic || currentUnit.topic || 'General'}</div>
      </div>
    `;
  }).join('');
}

export function selectReadingLesson(id) {
  const list = getUnitSkillList(currentUnit, 'reading');
  const found = list.find(r => r.id === id);
  if (found) {
    currentReadLesson = found;
    renderReadingLessons();
    loadReadingLesson(id);
  }
}

export function loadReadingLesson(id) {
  const r = currentReadLesson;
  const workspace = document.getElementById('read-workspace');
  if (!workspace || !r) return;

  let annotatedPassage = r.passage || '';
  if (r.vocabulary) {
    const sortedWords = Object.keys(r.vocabulary).sort((a, b) => b.length - a.length);
    sortedWords.forEach(word => {
      const safeRegexStr = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${safeRegexStr})\\b`, 'gi');
      const safeWordEsc = word.replace(/'/g, "\\'");
      annotatedPassage = annotatedPassage.replace(regex, `<span class="vocab-tag" onclick="window.showVocabLookup('${safeWordEsc}', event)" title="Bấm để tra từ '${word}'">$1</span>`);
    });
  }

  workspace.innerHTML = `
    <div class="reading-split-view">
      <div class="reading-passage-box">
        ${r.image ? `
          <div style="margin-bottom:14px;border-radius:12px;overflow:hidden;max-height:220px;border:1.5px solid #cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
            <img src="${r.image}" style="width:100%;height:180px;object-fit:cover;display:block" alt="${esc(r.title)}" onerror="this.style.display='none'">
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;flex-wrap:wrap;gap:10px">
          <h3 style="margin:0;font-size:22px;font-weight:800;color:#0f172a">📖 ${esc(r.title)}</h3>
          <span style="font-size:13.5px;color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd;padding:4px 12px;border-radius:20px;font-weight:700;display:inline-flex;align-items:center;gap:6px">
            💡 Nhấp vào từ màu xanh để tra từ & nghe phát âm
          </span>
        </div>
        <div style="white-space:pre-wrap;line-height:2.0;font-size:17.5px;color:#1e293b">${annotatedPassage}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;max-height:560px;overflow-y:auto;padding-right:6px">
        ${renderReadingExercises(r.exercises || [])}
      </div>
    </div>
  `;
  typesetMath(workspace);
}

export function showVocabLookup(word, event) {
  if (event) event.stopPropagation();
  if (!word) return;

  let data = null;
  let matchedWord = word;

  if (currentReadLesson && currentReadLesson.vocabulary) {
    const key = Object.keys(currentReadLesson.vocabulary).find(k => k.toLowerCase() === word.toLowerCase());
    if (key) {
      data = currentReadLesson.vocabulary[key];
      matchedWord = key;
    }
  }

  if (!data && currentUnit && currentUnit.vocabulary) {
    const key = Object.keys(currentUnit.vocabulary).find(k => k.toLowerCase() === word.toLowerCase());
    if (key) {
      data = currentUnit.vocabulary[key];
      matchedWord = key;
    }
  }

  if (!data) {
    data = { pos: 'word', ipa: '', meaning: 'Tra cứu nhanh từ vựng' };
  }

  let modal = document.getElementById('vocab-lookup-card');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vocab-lookup-card';
    modal.className = 'vocab-modal-card';
    document.body.appendChild(modal);
  }

  const safeWord = esc(matchedWord);
  const posClean = (data.pos || 'word').toLowerCase().replace(/[^a-z]/g, '');
  const posLabel = data.pos || 'word';

  modal.innerHTML = `
    <div class="vocab-modal-header">
      <div class="vocab-modal-title-group">
        <span class="vocab-modal-word">${safeWord}</span>
        <span class="vocab-pos-badge pos-${posClean}">${esc(posLabel)}</span>
      </div>
      <button class="vocab-modal-close-btn" onclick="window.hideVocabLookup(event)" title="Đóng (Esc)">✕</button>
    </div>

    ${data.ipa ? `
      <div class="vocab-ipa-row">
        <div class="vocab-ipa-badge">
          <span class="vocab-ipa-icon">🗣️</span>
          <span class="vocab-ipa-text">${esc(data.ipa)}</span>
          <button class="vocab-mini-audio-btn" onclick="window.speakVocab('${safeWord.replace(/'/g, "\\'")}', this)" title="Nghe phát âm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </button>
        </div>
      </div>
    ` : ''}

    <div class="vocab-meaning-box">
      <div class="vocab-meaning-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        Ý nghĩa / Định nghĩa
      </div>
      <div class="vocab-meaning-text">${esc(data.meaning || '')}</div>
    </div>

    ${data.example ? `
      <div class="vocab-example-box">
        <div class="vocab-example-label">💡 Ví dụ câu:</div>
        <div class="vocab-example-text">"${esc(data.example)}"</div>
      </div>
    ` : ''}

    <div class="vocab-actions-row">
      <button class="vocab-speak-btn" id="vocab-main-speak-btn" onclick="window.speakVocab('${safeWord.replace(/'/g, "\\'")}', this)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <span>Phát Âm Chuẩn (US/UK)</span>
      </button>
    </div>
  `;

  modal.style.display = 'block';
  document.querySelectorAll('.vocab-tag.active-lookup').forEach(el => el.classList.remove('active-lookup'));

  if (event && (event.target || event.currentTarget)) {
    const elem = event.currentTarget || event.target;
    elem.classList.add('active-lookup');
    const rect = elem.getBoundingClientRect();
    const modalWidth = 340;
    const modalHeight = modal.offsetHeight || 220;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (viewportWidth > 640) {
      let left = rect.left + (rect.width / 2) - (modalWidth / 2);
      left = Math.max(16, Math.min(left, viewportWidth - modalWidth - 16));
      let top;
      if (rect.bottom + modalHeight + 14 < viewportHeight) {
        top = rect.bottom + 8;
      } else if (rect.top - modalHeight - 14 > 0) {
        top = rect.top - modalHeight - 8;
      } else {
        top = Math.max(80, (viewportHeight - modalHeight) / 2);
      }
      modal.style.top = top + 'px';
      modal.style.left = left + 'px';
      modal.style.bottom = 'auto';
      modal.style.right = 'auto';
      modal.style.transform = 'none';
    } else {
      modal.style.top = 'auto';
      modal.style.bottom = '20px';
      modal.style.left = '16px';
      modal.style.right = '16px';
      modal.style.transform = 'none';
    }
  }
}

export function hideVocabLookup(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('vocab-lookup-card');
  if (modal) modal.style.display = 'none';
  document.querySelectorAll('.vocab-tag.active-lookup').forEach(el => el.classList.remove('active-lookup'));
}

export function speakVocab(word, btnElement) {
  if (btnElement) btnElement.classList.add('speaking-active');
  const mainBtn = document.getElementById('vocab-main-speak-btn');
  if (mainBtn) mainBtn.classList.add('speaking-active');

  speakText(word, {
    rate: 0.9,
    lang: 'en-US',
    onEnd: () => {
      if (btnElement) btnElement.classList.remove('speaking-active');
      if (mainBtn) mainBtn.classList.remove('speaking-active');
    }
  });
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.selectReadingLesson = selectReadingLesson;
  window.showVocabLookup = showVocabLookup;
  window.hideVocabLookup = hideVocabLookup;
  window.speakVocab = speakVocab;
  
  if (!window._vocabLookupGlobalListenerAdded) {
    window._vocabLookupGlobalListenerAdded = true;
    document.addEventListener('click', function(e) {
      const modal = document.getElementById('vocab-lookup-card');
      if (modal && modal.style.display === 'block') {
        if (!modal.contains(e.target) && !e.target.closest('.vocab-tag')) {
          window.hideVocabLookup();
        }
      }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') window.hideVocabLookup();
    });
  }
}
