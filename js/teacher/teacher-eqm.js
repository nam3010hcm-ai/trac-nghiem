/**
 * MODULE EXAM QUESTION MANAGER (EQM) (js/teacher/teacher-eqm.js)
 * Tính năng chọn câu hỏi thủ công, sắp xếp thứ tự và gắn vào đề thi
 */
import { state, $ } from '../common.js';
import { renderExams, renderPracticeExams } from '../exams.js';

const db = () => window.supabaseClient;

export let currentEqmExamId = null;

export function openExamQuestionManager(examId) {
  currentEqmExamId = examId;
  const exam = state.exams.find(e => e.id === examId);
  if (!exam) return;

  const eqm = document.getElementById('exam-q-manager');
  if (!eqm) return;

  const isPracticeTab = $('tc-practice') && $('tc-practice').style.display !== 'none';
  if (isPracticeTab) {
    const pList = $('practice-e-list');
    if (pList && eqm.parentNode !== $('tc-practice')) {
      $('tc-practice').insertBefore(eqm, pList);
    }
  } else {
    const eList = $('e-list');
    if (eList && eqm.parentNode !== $('tc-e')) {
      $('tc-e').insertBefore(eqm, eList);
    }
  }

  const eForm = document.getElementById('eform');
  if(eForm) eForm.style.display = 'none'; 

  eqm.style.display = 'block';
  document.getElementById('eqm-name').textContent = exam.name;

  if (!exam.qIds) exam.qIds = [];

  const cats = Object.keys(state.SUBCATS || {}).sort();
  document.getElementById('eqm-filter-cat').innerHTML = '<option value="">(Tất cả chủ đề)</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

  renderEqmLists();
  eqm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderEqmLists() {
  if (!currentEqmExamId) return;
  const exam = state.exams.find(e => e.id === currentEqmExamId);
  if (!exam) return;

  const filterCat = document.getElementById('eqm-filter-cat')?.value || '';
  const qIds = exam.qIds || [];

  const countEl = document.getElementById('eqm-selected-count');
  if (countEl) countEl.textContent = qIds.length;

  const selectedQs = qIds.map(id => state.questions.find(q => q.id === id)).filter(Boolean);
  const availableQs = state.questions.filter(q => !qIds.includes(q.id) && (filterCat === '' || q.cat === filterCat));

  const renderSelectedQItem = (q, index, total) => `
    <div style="background:#fff; border:1px solid #a7f3d0; border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:start; gap:10px; transition: 0.2s; margin-bottom: 8px;">
      <div style="font-size:13px; color:#334155; flex:1;">
        <b style="color:#059669">[Câu ${index + 1}]</b> ${q.text.substring(0, 60)}${q.text.length > 60 ? '...' : ''}
      </div>
      <div style="display:flex; gap:4px;">
        <button class="btn btn-sm" onclick="window.moveQ(${index}, -1)" ${index === 0 ? 'disabled' : ''} style="padding:2px 6px;">⬆️</button>
        <button class="btn btn-sm" onclick="window.moveQ(${index}, 1)" ${index === total - 1 ? 'disabled' : ''} style="padding:2px 6px;">⬇️</button>
        <button class="btn btn-sm" onclick="window.removeQFromExam(${q.id})" style="background:#fee2e2; color:#ef4444; border:none; padding:2px 6px; font-weight:bold;">✖</button>
      </div>
    </div>
  `;

  const renderAvailableQItem = (q) => `
    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:start; gap:10px; transition: 0.2s; margin-bottom: 8px;">
      <div style="font-size:13px; color:#334155; flex:1;">
        <b style="color:#64748b">[${q.subcat || q.cat || 'Chưa phân loại'}]</b> ${q.text.substring(0, 60)}${q.text.length > 60 ? '...' : ''}
      </div>
      <button class="btn btn-sm" onclick="window.addQToExam(${q.id})" style="background:#e0e7ff; color:#4f46e5; border:none; padding:4px 8px; font-weight:bold; cursor:pointer;">➕ Thêm</button>
    </div>
  `;

  const selList = document.getElementById('eqm-selected-list');
  const availList = document.getElementById('eqm-available-list');

  if (selList) selList.innerHTML = selectedQs.length ? selectedQs.map((q, i) => renderSelectedQItem(q, i, selectedQs.length)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Đề thi chưa có câu hỏi nào</div>';
  if (availList) availList.innerHTML = availableQs.length ? availableQs.map(q => renderAvailableQItem(q)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Không có câu hỏi phù hợp</div>';
}

export async function moveQ(index, direction) {
  const exam = state.exams.find(e => e.id === currentEqmExamId);
  if(!exam || !exam.qIds) return;
  
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= exam.qIds.length) return;
  
  const temp = exam.qIds[index];
  exam.qIds[index] = exam.qIds[newIndex];
  exam.qIds[newIndex] = temp;
  
  await db().from('exams').update({ q_ids: exam.qIds }).eq('id', exam.id);
  renderEqmLists();
}

export async function addQToExam(qId) {
  const exam = state.exams.find(e => e.id === currentEqmExamId);
  if(!exam) return;
  if(!exam.qIds) exam.qIds = [];
  
  if(!exam.qIds.includes(qId)) {
    exam.qIds.push(qId);
    exam.count = exam.qIds.length;
    await db().from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
    renderEqmLists();
    renderExams();
    renderPracticeExams();
  }
}

export async function removeQFromExam(qId) {
  const exam = state.exams.find(e => e.id === currentEqmExamId);
  if(!exam) return;
  if(!exam.qIds) exam.qIds = [];
  
  exam.qIds = exam.qIds.filter(id => id !== qId);
  exam.count = exam.qIds.length;
  await db().from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
  renderEqmLists();
  renderExams();
  renderPracticeExams();
}

if (typeof window !== 'undefined') {
  window.openExamQuestionManager = openExamQuestionManager;
  window.moveQ = moveQ;
  window.addQToExam = addQToExam;
  window.removeQFromExam = removeQFromExam;
}
