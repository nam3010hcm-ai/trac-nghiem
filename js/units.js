/**
 * MODULE UNITS & CURRICULUM DESIGNER (js/units.js)
 * Barrel module quản lý bài học 5 kỹ năng (Listening, Reading, Speaking, Writing, Language Focus)
 */
import {
  unitsState,
  editingUnitId,
  currentDesignerSkill,
  _currentLfSubTab,
  safeUpsertUnit,
  normalizeSubjectName,
  normalizeModuleName,
  matchSubject,
  matchModule
} from './units/units-state.js';

import {
  loadUnits,
  populateUnitFilters,
  updateModuleFilterOptions,
  updateDatalists,
  renderUnitsList,
  toggleUnitVisibility,
  deleteUnit
} from './units/units-list.js';

import {
  openUnitEditor,
  closeUnitEditor,
  updateDesignerSubjectLabels,
  autoFitAllDesignerTextareas,
  switchDesignerSkillTab
} from './units/designer-core.js';

import {
  syncCurrentDesignerSkillToDraft,
  saveUnit
} from './units/designer-save.js';

import {
  renderListeningDesignerExercises,
  extractListeningExercisesFromDOM
} from './units/designer-listening.js';

import {
  renderReadingVocabularyDesigner
} from './units/designer-reading-vocab.js';

import {
  renderReadingDesignerExercises,
  extractReadingExercisesFromDOM
} from './units/designer-reading-exercises.js';

import {
  renderSpeakingDesigner,
  extractSpeakingFromDOM
} from './units/designer-speaking.js';

import {
  renderLanguageFocusDesigner
} from './units/designer-lang-focus.js';

import './units/designer-handlers.js';

export {
  unitsState,
  editingUnitId,
  currentDesignerSkill,
  _currentLfSubTab,
  safeUpsertUnit,
  normalizeSubjectName,
  normalizeModuleName,
  matchSubject,
  matchModule,
  loadUnits,
  populateUnitFilters,
  updateModuleFilterOptions,
  updateDatalists,
  renderUnitsList,
  toggleUnitVisibility,
  deleteUnit,
  openUnitEditor,
  closeUnitEditor,
  updateDesignerSubjectLabels,
  autoFitAllDesignerTextareas,
  switchDesignerSkillTab,
  syncCurrentDesignerSkillToDraft,
  saveUnit,
  renderListeningDesignerExercises,
  extractListeningExercisesFromDOM,
  renderReadingVocabularyDesigner,
  renderReadingDesignerExercises,
  extractReadingExercisesFromDOM,
  renderSpeakingDesigner,
  extractSpeakingFromDOM,
  renderLanguageFocusDesigner
};

// Global bindings
if (typeof window !== 'undefined') {
  window.loadUnits = loadUnits;
  window.populateUnitFilters = populateUnitFilters;
  window.updateModuleFilterOptions = updateModuleFilterOptions;
  window.updateDatalists = updateDatalists;
  window.renderUnitsList = renderUnitsList;
  window.toggleUnitVisibility = toggleUnitVisibility;
  window.deleteUnit = deleteUnit;
  window.openUnitEditor = openUnitEditor;
  window.closeUnitEditor = closeUnitEditor;
  window.saveUnit = saveUnit;
  window.updateDesignerSubjectLabels = updateDesignerSubjectLabels;
  window.onDesignerSubjectInput = updateDesignerSubjectLabels;
  window.autoFitAllDesignerTextareas = autoFitAllDesignerTextareas;
  window.switchDesignerSkillTab = (skill) => {
    syncCurrentDesignerSkillToDraft();
    switchDesignerSkillTab(skill);
  };
  window.onUnitFilterChange = function() {
    updateModuleFilterOptions();
    renderUnitsList();
  };
  window.onUnitSearchInput = function() {
    renderUnitsList();
  };
}
