/**
 * MODULE LEARN FLASHCARDS 3D (js/learn/learn-flashcards.js)
 * Thẻ ghi nhớ từ vựng 3D cao cấp, hiệu ứng lật thẻ 360/180 độ, phát âm IPA tự nhiên & điều hướng thông minh
 */
import { currentUnit, addXP, speakText } from './learn-common.js';

export let currentCardIdx = 0;

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderFlashcardsView(card, total) {
  if (!card) {
    return `
      <div class="card" style="text-align:center;padding:36px 20px;max-width:520px;margin:0 auto">
        <div style="font-size:40px;margin-bottom:12px">📭</div>
        <div style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:6px">Chưa có thẻ từ vựng trong Unit này</div>
        <div style="font-size:14px;color:#64748b">Thầy cô có thể thêm thẻ từ vựng trong mục Soạn Thảo Unit (Language Focus Studio).</div>
      </div>
    `;
  }

  const safeWord = String(card.word || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const progressPercent = Math.round(((currentCardIdx + 1) / (total || 1)) * 100);

  return `
    <div class="flashcard-3d-wrapper">
      <!-- Top Progress Bar & Counter -->
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13.5px;color:#475569;font-weight:700">
          <span>🎴 Thẻ từ vựng ${currentCardIdx + 1} / ${total}</span>
          <span style="color:#2563eb">💡 Bấm vào thẻ để lật 3D xem nghĩa</span>
        </div>
        <div style="height:6px;background:#e2e8f0;border-radius:9999px;overflow:hidden">
          <div style="height:100%;width:${progressPercent}%;background:linear-gradient(90deg, #4f46e5, #2563eb);border-radius:9999px;transition:width 0.3s ease"></div>
        </div>
      </div>
      
      <!-- 3D Flipping Card Scene -->
      <div class="flashcard-3d-scene" id="flashcard-scene" onclick="window.toggleCardFlip()" title="Bấm để lật thẻ">
        <div class="flashcard-3d-inner">
          <!-- MẶT TRƯỚC (FRONT) -->
          <div class="flashcard-face flashcard-front">
            <div class="fc-top-bar">
              <span class="fc-pos-tag">${esc(card.pos || 'vocabulary')}</span>
              <span class="fc-index-badge">Mặt trước</span>
            </div>

            <div class="fc-main-body">
              ${card.image ? `
                <div style="margin-bottom:8px;border-radius:10px;overflow:hidden;max-height:85px;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,0.05)">
                  <img src="${card.image}" style="width:120px;height:75px;object-fit:cover;display:block" alt="${esc(card.word)}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
              ` : ''}
              <div class="flashcard-word">${esc(card.word || '')}</div>
              ${card.ipa ? `<div class="flashcard-ipa">${esc(card.ipa)}</div>` : ''}
              <button type="button" class="fc-speak-btn" onclick="event.stopPropagation(); window.speakVocabWord('${safeWord}')" title="Phát âm từ này">
                <span>🔊</span> <span>Nghe phát âm</span>
              </button>
            </div>

            <div class="fc-flip-hint">
              <span>🔄</span> <span>Bấm thẻ để lật xem định nghĩa</span>
            </div>
          </div>

          <!-- MẶT SAU (BACK) -->
          <div class="flashcard-face flashcard-back">
            <div class="fc-top-bar">
              <span class="fc-pos-tag">${esc(card.pos || 'meaning')}</span>
              <span class="fc-index-badge">Mặt sau</span>
            </div>

            <div class="fc-main-body">
              <div class="flashcard-meaning">${esc(card.meaning || '')}</div>
              ${card.example ? `
                <div class="flashcard-example-box">
                  <div class="flashcard-example-text">"${esc(card.example)}"</div>
                </div>
              ` : ''}
              ${card.synonyms ? `
                <div class="flashcard-synonyms">
                  <b>Đồng nghĩa:</b> ${esc(card.synonyms)}
                </div>
              ` : ''}
            </div>

            <div class="fc-flip-hint">
              <span>🔄</span> <span>Bấm thẻ để lật lại từ vựng</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Control Actions -->
      <div class="fc-controls-bar">
        <button type="button" class="fc-nav-btn" onclick="window.prevFlashcard()" ${currentCardIdx === 0 ? 'disabled' : ''} title="Từ vựng trước (Phím ←)">
          ← Từ trước
        </button>
        <button type="button" class="fc-nav-btn fc-flip-action-btn" onclick="window.toggleCardFlip()" title="Lật thẻ (Phím Space)">
          🔄 Lật thẻ
        </button>
        <button type="button" class="fc-nav-btn primary" onclick="window.nextFlashcard()" ${currentCardIdx >= total - 1 ? 'disabled' : ''} title="Từ vựng tiếp theo (Phím →)">
          Từ tiếp theo →
        </button>
      </div>
    </div>
  `;
}

export function toggleCardFlip() {
  const scene = document.getElementById('flashcard-scene');
  if (scene) {
    scene.classList.toggle('flipped');
  }
}

export function speakVocabWord(word) {
  if (!word) return;
  speakText(word, { lang: 'en-US', rate: 0.9 });
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

export function resetFlashcards() {
  currentCardIdx = 0;
  if (typeof window.switchLangSubTab === 'function') {
    window.switchLangSubTab('cards');
  }
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.toggleCardFlip = toggleCardFlip;
  window.speakVocabWord = speakVocabWord;
  window.prevFlashcard = prevFlashcard;
  window.nextFlashcard = nextFlashcard;
  window.resetFlashcards = resetFlashcards;

  // Keyboard navigation support for Flashcards
  if (!window._fcKeyboardBound) {
    window._fcKeyboardBound = true;
    window.addEventListener('keydown', (e) => {
      if (window._langTab !== 'cards') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      
      if (e.key === 'ArrowLeft') {
        prevFlashcard();
      } else if (e.key === 'ArrowRight') {
        nextFlashcard();
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggleCardFlip();
      }
    });
  }
}
