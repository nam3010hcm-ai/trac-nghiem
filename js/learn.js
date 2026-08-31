/**
 * MODULE INTERACTIVE LEARNING HUB (js/learn.js)
 * Barrel module cho hệ thống học tập 5 kỹ năng (Listening, Reading, Speaking, Writing, Language Focus)
 */
import {
  allUnits,
  currentUnit,
  currentSkillTab,
  currentSubject,
  currentModule,
  userProfile,
  playSuccessSound,
  playWrongSound,
  playLevelUpSound,
  speakText,
  getBestNaturalVoice,
  triggerConfetti,
  addXP
} from './learn/learn-common.js';

import {
  getWeeklyPeriod,
  formatStudyTime,
  getAuthenticatedStudent,
  loginLearnStudent,
  loginGuestStudent,
  logoutLearnStudent,
  toggleLearnPassVisible,
  updateAvatarFromURL,
  clearAvatar,
  initAuthenticatedLearn
} from './learn/learn-auth.js';

import {
  loadUnitsData,
  selectUnitTile,
  switchSkillTab,
  updateSubjectUI,
  updateBreadcrumbs,
  renderCascadingSelectors,
  loadCurrentUnitView
} from './learn/learn-roadmap.js';

import {
  currentLisLesson,
  currentPlaybackSpeed,
  initListening,
  renderListeningLessons,
  selectListeningLesson,
  loadListeningLesson
} from './learn/learn-listening.js';

import {
  currentReadLesson,
  initReading,
  renderReadingLessons,
  selectReadingLesson,
  loadReadingLesson,
  showVocabLookup,
  hideVocabLookup,
  speakVocab
} from './learn/learn-reading.js';

import {
  currentSpkLesson,
  initSpeaking,
  renderSpeakingLessons,
  selectSpeakingLesson,
  loadSpeakingLesson,
  speakPronunciation
} from './learn/learn-speaking.js';

import {
  currentWrtCategory,
  initWriting,
  selectWritingTab,
  loadWritingView
} from './learn/learn-writing.js';

import {
  initLanguageFocus,
  loadLanguageFocusView
} from './learn/learn-lang-focus.js';

export {
  allUnits,
  currentUnit,
  currentSkillTab,
  currentSubject,
  currentModule,
  userProfile,
  playSuccessSound,
  playWrongSound,
  playLevelUpSound,
  speakText,
  getBestNaturalVoice,
  triggerConfetti,
  addXP,
  getWeeklyPeriod,
  formatStudyTime,
  getAuthenticatedStudent,
  loginLearnStudent,
  loginGuestStudent,
  logoutLearnStudent,
  toggleLearnPassVisible,
  updateAvatarFromURL,
  clearAvatar,
  loadUnitsData,
  selectUnitTile,
  switchSkillTab,
  updateSubjectUI,
  updateBreadcrumbs,
  renderCascadingSelectors,
  loadCurrentUnitView,
  initListening,
  renderListeningLessons,
  selectListeningLesson,
  loadListeningLesson,
  initReading,
  renderReadingLessons,
  selectReadingLesson,
  loadReadingLesson,
  showVocabLookup,
  hideVocabLookup,
  speakVocab,
  initSpeaking,
  renderSpeakingLessons,
  selectSpeakingLesson,
  loadSpeakingLesson,
  speakPronunciation,
  initWriting,
  selectWritingTab,
  loadWritingView,
  initLanguageFocus,
  loadLanguageFocusView
};

async function initLearnApp() {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('#learn-skill-nav-row button, .skill-tab-btn, .subject-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const skill = btn.dataset.skill || btn.getAttribute('data-skill');
      if (skill) switchSkillTab(skill);
    });
  });

  const student = getAuthenticatedStudent();
  if (student && student.id) {
    await initAuthenticatedLearn();
  } else {
    logoutLearnStudent();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLearnApp);
  } else {
    initLearnApp();
  }
}
