/**
 * MODULE LEARN LANGUAGE FOCUS (js/learn/learn-lang-focus.js)
 * Điều phối các phân hệ nhỏ trong Language Focus: Match puzzle, Grammar quiz, Spelling, Past verbs & Flashcards 3D
 */
import { typesetMath } from '../common.js';
import { currentUnit, getUnitSkillObj, safeArray } from './learn-common.js';
import { currentCardIdx, renderFlashcardsView } from './learn-flashcards.js';
import { renderMatchPuzzleView } from './learn-match-puzzle.js';
import { renderGrammarQuizView } from './learn-grammar-quiz.js';
import { renderPastFormVerbsView } from './learn-past-verbs.js';
import { renderLfSpellingView } from './learn-spelling-game.js';

export function initLanguageFocus() {
  if (typeof window !== 'undefined' && !window._langTab) {
    window._langTab = 'past_form';
  }
  loadLanguageFocusView();
}

export function loadLanguageFocusView() {
  const workspace = document.getElementById('lang-workspace');
  if (!workspace || !currentUnit) return;

  const tab = (typeof window !== 'undefined' ? window._langTab : 'match') || 'match';
  const langObj = getUnitSkillObj(currentUnit, 'languageFocus') || currentUnit?.languageFocus || currentUnit?.language_focus || {};

  let bodyContent = '';
  if (tab === 'match') {
    bodyContent = renderMatchPuzzleView();
  } else if (tab === 'quiz') {
    bodyContent = renderGrammarQuizView();
  } else if (tab === 'spelling') {
    bodyContent = renderLfSpellingView();
  } else if (tab === 'past_form') {
    const verbs = langObj?.pastFormVerbs || [
      { infinitive: 'go', past: 'went', meaning: 'đi' },
      { infinitive: 'see', past: 'saw', meaning: 'thấy' },
      { infinitive: 'buy', past: 'bought', meaning: 'mua' }
    ];
    bodyContent = renderPastFormVerbsView(verbs);
  } else if (tab === 'cards') {
    let fCards = safeArray(langObj?.flashcards, []);
    if (!fCards.length && currentUnit?.vocabulary && typeof currentUnit.vocabulary === 'object') {
      fCards = Object.entries(currentUnit.vocabulary).map(([word, info], idx) => ({
        id: `fc_auto_${idx}`,
        word,
        pos: info?.pos || 'vocabulary',
        ipa: info?.ipa || '',
        meaning: info?.meaning || info?.definition || '',
        example: info?.example || '',
        synonyms: info?.synonyms || '',
        image: info?.image || ''
      }));
    }
    const safeIdx = Math.min(Math.max(0, currentCardIdx), Math.max(0, fCards.length - 1));
    const currentCard = fCards[safeIdx] || (fCards.length ? fCards[0] : null);
    bodyContent = renderFlashcardsView(currentCard, fCards.length);
  }

  workspace.innerHTML = `
    <div class="skill-subnav-bar" style="justify-content:center;flex-wrap:wrap;gap:6px;">
      <button class="skill-subnav-btn ${tab === 'match' ? 'active' : ''}" onclick="window.switchLangSubTab('match')">🧩 Ex 1. Nối Từ & Định Nghĩa (Match)</button>
      <button class="skill-subnav-btn ${tab === 'quiz' ? 'active' : ''}" onclick="window.switchLangSubTab('quiz')">⚡ Ex 2. Chọn A, B, C, D (Quiz)</button>
      <button class="skill-subnav-btn ${tab === 'spelling' ? 'active' : ''}" onclick="window.switchLangSubTab('spelling')">🔤 Ex 3. Backward Spelling</button>
      <button class="skill-subnav-btn ${tab === 'past_form' ? 'active' : ''}" onclick="window.switchLangSubTab('past_form')">📝 Động Từ Quá Khứ (Past Form)</button>
      <button class="skill-subnav-btn ${tab === 'cards' ? 'active' : ''}" onclick="window.switchLangSubTab('cards')">🎴 Thẻ Từ Vựng 3D</button>
    </div>

    <div id="lang-subtab-container">
      ${bodyContent}
    </div>
  `;
  typesetMath(workspace);
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.switchLangSubTab = function(tab) {
    window._langTab = tab;
    loadLanguageFocusView();
  };
}
