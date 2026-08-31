/**
 * MODULE LEARN FLASHCARDS 3D (js/learn/learn-flashcards.js)
 * Thẻ ghi nhớ từ vựng 3D, lật thẻ xem nghĩa, phát âm IPA và điều hướng
 */
import { currentUnit, addXP } from './learn-common.js';
import { speakVocab } from './learn-reading-engine.js';

export let currentCardIdx = 0;

export function renderFlashcardsView(card, total) {
  if (!card) return '<div class="empty">Chưa có thẻ từ vựng trong Unit này.</div>';
  return `
    <div style="text-align:center;max-width:480px;margin:0 auto">
      <div style="text-align:center;margin-bottom:10px">
        <span style="font-size:13px;color:#64748b;font-weight:600">Thẻ ${currentCardIdx + 1} / ${total} • Bấm thẻ để lật 3D xem nghĩa</span>
      </div>
      
      <div class="flashcard-3d-scene" id="flashcard-scene" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-3d-inner">
          <div class="flashcard-face flashcard-front">
            ${card.image ? `
              <div class="fc-img-wrap">
                <img src="${card.image}" class="flashcard-img" alt="${card.word}" loading="lazy" onerror="this.parentElement.style.display='none'">
              </div>
            ` : ''}
            <div class="fc-pos-tag">${card.pos || 'word'}</div>
            <div class="flashcard-word">${card.word || ''}</div>
            <div class="flashcard-ipa">${card.ipa || ''}</div>
            <button class="btn btn-sm btn-p" onclick="event.stopPropagation(); window.speakVocab('${card.word}')" style="background:#f59e0b;border-color:#f59e0b;margin-top:4px">🔊 Nghe phát âm</button>
          </div>

          <div class="flashcard-face flashcard-back">
            <div class="flashcard-meaning">${card.meaning || ''}</div>
            <div class="flashcard-example">"${card.example || ''}"</div>
            ${card.synonyms ? `<div style="font-size:12.5px;color:#047857;margin-top:10px;font-weight:600"><b>Đồng nghĩa:</b> ${card.synonyms}</div>` : ''}
            ${card.image ? `
              <div style="margin-top:10px;opacity:0.85">
                <img src="${card.image}" style="width:70px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1" onerror="this.style.display='none'">
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:18px">
        <button class="btn" onclick="window.prevFlashcard()" ${currentCardIdx === 0 ? 'disabled' : ''}>← Từ trước</button>
        <button class="btn btn-p" onclick="window.nextFlashcard()" ${currentCardIdx >= total - 1 ? 'disabled' : ''}>Từ tiếp theo →</button>
      </div>
    </div>
  `;
}

export function prevFlashcard() {
  if (currentCardIdx > 0) {
    currentCardIdx--;
    if (typeof window.switchLangSubTab === 'function') {
      window.switchLangSubTab('cards');
    }
  }
}

export function nextFlashcard() {
  const fCards = currentUnit?.languageFocus?.flashcards || [];
  if (currentCardIdx < fCards.length - 1) {
    currentCardIdx++;
    addXP(5, 'Học từ vựng mới');
    if (typeof window.switchLangSubTab === 'function') {
      window.switchLangSubTab('cards');
    }
  }
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.prevFlashcard = prevFlashcard;
  window.nextFlashcard = nextFlashcard;
}
