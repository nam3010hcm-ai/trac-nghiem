/**
 * MODULE LEARN READING (js/learn/learn-reading.js)
 * Barrel module quản lý kỹ năng Reading: Đoạn văn, tra từ tương tác và 10 dạng bài tập
 */
import {
  currentReadLesson,
  setCurrentReadLesson,
  initReading,
  renderReadingLessons,
  selectReadingLesson,
  loadReadingLesson,
  showVocabLookup,
  hideVocabLookup,
  speakVocab
} from './learn-reading-engine.js';

import {
  renderReadingExercises
} from './learn-reading-exercises.js';

export {
  currentReadLesson,
  setCurrentReadLesson,
  initReading,
  renderReadingLessons,
  selectReadingLesson,
  loadReadingLesson,
  showVocabLookup,
  hideVocabLookup,
  speakVocab,
  renderReadingExercises
};
