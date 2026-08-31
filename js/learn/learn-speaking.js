/**
 * MODULE LEARN SPEAKING (js/learn/learn-speaking.js)
 * Barrel module cho kỹ năng Speaking (Phát âm đơn lẻ & Video Roleplay Studio)
 */
import {
  currentSpkLesson,
  isRecording,
  speechRecognizer,
  initSpeaking,
  renderSpeakingLessons,
  selectSpeakingLesson,
  loadSpeakingLesson,
  speakPronunciation,
  togglePronunciationRecording
} from './learn-speaking-engine.js';

import {
  currentRpLesson,
  currentRpRole,
  currentRpTurnIdx,
  rpScores,
  isRpRecording,
  rpPlaybackSpeed,
  renderRoleSelectionView,
  startRoleplayAsRole,
  renderActiveRoleplayView,
  playCurrentRpTurn,
  speakLineWithTTS,
  showRoleplayCompletionSummary
} from './learn-speaking-roleplay.js';

export {
  currentSpkLesson,
  isRecording,
  speechRecognizer,
  initSpeaking,
  renderSpeakingLessons,
  selectSpeakingLesson,
  loadSpeakingLesson,
  speakPronunciation,
  togglePronunciationRecording,
  currentRpLesson,
  currentRpRole,
  currentRpTurnIdx,
  rpScores,
  isRpRecording,
  rpPlaybackSpeed,
  renderRoleSelectionView,
  startRoleplayAsRole,
  renderActiveRoleplayView,
  playCurrentRpTurn,
  speakLineWithTTS,
  showRoleplayCompletionSummary
};
