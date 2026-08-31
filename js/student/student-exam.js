/**
 * MODULE STUDENT EXAM ENGINE & TIMING (js/student/student-exam.js)
 * Bộ đếm giờ làm bài, chọn câu, giao diện bài thi và quản lý ca thi
 */
import { initData, state, $, shuffle, getPool, esc, typesetMath } from '../common.js';
import { updateExamDesc } from '../exams.js';
import { getAuthenticatedStudent, checkStudentAuth, loginStudent } from './student-auth.js';
import { renderQuizTopbar, showStudentBadge } from './student-topbar.js';
import { renderPart } from './student-renderer.js';
import { finishExam } from './student-submit.js';

const db = () => window.supabaseClient;

export let qState = {};
export const STORE_KEY = 'quiz_current_attempt_v2';
export let activeCohortsData = {};

export { finishExam };

export function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(id);
  if (target) target.classList.add('active');
}

export function persist(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify({...qState, timer:null})); }catch{}
}

export function clearPersist(){
  localStorage.removeItem(STORE_KEY);
}

export function switchExamMode(mode = 'assigned') {
  const btnAssigned = $('tab-mode-assigned');
  const btnPractice = $('tab-mode-practice');
  const btnOfficial = $('tab-mode-official');

  const panelAssigned = $('panel-mode-assigned');
  const panelPractice = $('panel-mode-practice');
  const panelOfficial = $('panel-mode-official');

  [btnAssigned, btnPractice, btnOfficial].forEach(b => {
    if (b) { b.style.background = 'transparent'; b.style.color = '#475569'; b.classList.remove('active'); }
  });
  [panelAssigned, panelPractice, panelOfficial].forEach(p => {
    if (p) p.style.display = 'none';
  });

  if (mode === 'assigned') {
    if (btnAssigned) { btnAssigned.style.background = '#6366f1'; btnAssigned.style.color = '#ffffff'; btnAssigned.classList.add('active'); }
    if (panelAssigned) panelAssigned.style.display = 'block';
    renderStudentAssignedTasks();
  } else if (mode === 'practice') {
    if (btnPractice) { btnPractice.style.background = '#6366f1'; btnPractice.style.color = '#ffffff'; btnPractice.classList.add('active'); }
    if (panelPractice) panelPractice.style.display = 'block';
  } else {
    if (btnOfficial) { btnOfficial.style.background = '#dc2626'; btnOfficial.style.color = '#ffffff'; btnOfficial.classList.add('active'); }
    if (panelOfficial) panelOfficial.style.display = 'block';
  }
}

export function populatePracticeCategories() {
  const select = $('s-practice-category');
  if (!select) return;
  const cats = [...new Set(state.exams.map(e => e.subject).filter(Boolean))];
  select.innerHTML = '<option value="">-- Tất cả môn học --</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

export function populatePracticeExamSelect() {
  const select = $('s-exam');
  if (!select) return;
  const available = state.exams.filter(e => !e.isHidden);
  select.innerHTML = '<option value="" disabled selected>-- Chọn đề thi để bắt đầu --</option>' + available.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
}

export function updatePracticeExamDesc() {
  updateExamDesc();
}

export function startPracticeExam() {
  startExam();
}

export async function loadActiveCohorts() {
  const select = $('s-cohort');
  if (!select) return;
  try {
    if (db()) {
      const { data } = await db().from('cohorts').select('*').eq('status', 'active');
      if (data) {
        activeCohortsData = {};
        data.forEach(c => { activeCohortsData[c.name] = c; });
        select.innerHTML = '<option value="">-- Chọn ca thi --</option>' + data.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
      }
    }
  } catch (e) {
    console.error("Lỗi load cohorts:", e);
  }
}

export async function renderStudentAssignedTasks() {
  const container = $('student-assigned-tasks-list');
  if (!container) return;

  const st = getAuthenticatedStudent();
  if (!st || !st.id) {
    container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;">Vui lòng đăng nhập để xem nhiệm vụ được giao.</div>';
    return;
  }

  container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px;text-align:center;">⏳ Đang tải nhiệm vụ được giao...</div>';

  try {
    let assignments = [];
    if (db()) {
      const { data, error } = await db()
        .from('assignments')
        .select('*')
        .eq('status', 'active')
        .order('due_at', { ascending: true });
      if (!error && data) assignments = data;
    }

    if (!assignments.length) {
      container.innerHTML = '<div style="color:#64748b;font-size:13px;padding:20px;text-align:center;background:#f8fafc;border-radius:10px;">🎉 Hiện tại bạn không có nhiệm vụ bài tập nào chưa hoàn thành!</div>';
      return;
    }

    container.innerHTML = assignments.map(a => `
      <div class="card" style="margin:0;padding:16px;border-left:4px solid #6366f1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:800;font-size:15px;color:#0f172a;margin-bottom:4px;">${esc(a.title)}</div>
          <div style="font-size:12px;color:#64748b;">
            ⏱️ Hạn chót: <b>${a.due_at ? new Date(a.due_at).toLocaleString('vi-VN') : 'Không giới hạn'}</b> • Thời gian: <b>${a.duration_minutes || 45} phút</b>
          </div>
        </div>
        <button class="btn btn-p" onclick="window.startStudentAssignment('${a.id}', '${a.content_id}')">Làm bài ngay →</button>
      </div>
    `).join('');
  } catch(e) {
    console.error("Lỗi renderStudentAssignedTasks:", e);
  }
}

export function startTimer() {
  if (qState.timer) clearInterval(qState.timer);
  const timeLimitSeconds = (qState.exam?.time || 45) * 60;
  
  qState.timer = setInterval(() => {
    const elapsed = Math.round((Date.now() - qState.startTime) / 1000);
    const remaining = Math.max(0, timeLimitSeconds - elapsed);

    const timerEl = $('quiz-timer');
    if (timerEl) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (remaining <= 300) timerEl.style.color = '#dc2626';
    }

    if (remaining <= 0) {
      clearInterval(qState.timer);
      alert('⏰ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài thi của bạn.');
      finishExam();
    }
  }, 1000);
}

export function startExam() {
  const name = $('s-name')?.value.trim();
  const studentId = $('s-id')?.value.trim();
  const className = $('s-class')?.value.trim();
  const academicYear = $('s-year')?.value || '2025-2026';
  const email = $('s-email')?.value.trim() || '';
  const examId = $('s-exam')?.value;
  const cohortName = $('s-cohort')?.value || '';

  if (!name || !studentId || !examId) {
    alert('Vui lòng nhập đầy đủ Họ tên, Mã học viên và Chọn đề thi!');
    return;
  }

  const exam = state.exams.find(e => e.id === examId);
  if (!exam) { alert('Không tìm thấy đề thi!'); return; }

  const pool = getPool(exam.subject, exam.category);
  let qs = exam.isShuffle ? shuffle(pool) : [...pool];
  qs = qs.slice(0, Math.min(exam.count, pool.length));
  if (!qs.length) { alert('Đề thi trống!'); return; }

  let parts = [];
  let currentPart = null;
  qs.forEach((q, i) => {
    q.globalIdx = i;
    const pName = q.subcat || 'General Part';
    if (!currentPart || currentPart.name !== pName) {
      currentPart = { name: pName, questions: [] };
      parts.push(currentPart);
    }
    currentPart.questions.push(q);
  });

  qState = { 
    exam, 
    student: { name, id: studentId, class_name: className, academic_year: academicYear, email, cohort: cohortName }, 
    qs, parts, partIdx: 0, answers: [], startTime: Date.now(), timer: null,
    mode: 'exam'
  };
  
  persist();
  startTimer();
  showStudentBadge();
  showScreen('sc-quiz');
  renderQuizTopbar();
  renderPart();
}

export async function initStudentApp() {
  if (typeof window !== 'undefined' && window._studentAppInitialized) return;
  if (typeof window !== 'undefined') window._studentAppInitialized = true;

  try {
    await initData(false);
  } catch(e) {
    console.error("Lỗi initData student:", e);
  }

  checkStudentAuth();

  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved?.qs?.length && confirm('Phát hiện bài làm chưa hoàn thành. Bạn có muốn tiếp tục không?')) {
        qState = saved; startTimer(); showStudentBadge(); showScreen('sc-quiz'); renderQuizTopbar(); renderPart();
      }
    } catch { clearPersist(); }
  }

  const loginInput = $('st-login-email') || $('s-email');
  const loginPass = $('st-login-pass') || $('s-pass');
  if (loginInput) loginInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginStudent(); });
  if (loginPass) loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginStudent(); });

  if ($('s-exam')) $('s-exam').addEventListener('change', updateExamDesc);
  if ($('btn-start')) $('btn-start').addEventListener('click', startExam);
  if ($('btn-next')) $('btn-next').addEventListener('click', () => { qState.partIdx++; persist(); renderPart(); window.scrollTo(0,0); });
  if ($('btn-prev')) $('btn-prev').addEventListener('click', () => { qState.partIdx--; persist(); renderPart(); window.scrollTo(0,0); });
  if ($('btn-finish')) $('btn-finish').addEventListener('click', finishExam);
  if ($('btn-home')) $('btn-home').addEventListener('click', () => { clearInterval(qState.timer); clearPersist(); showScreen('sc-portal'); });
  if ($('btn-retake')) {
    $('btn-retake').addEventListener('click', () => {
      qState.partIdx = 0; qState.answers = []; qState.startTime = Date.now();
      persist(); startTimer(); showScreen('sc-quiz'); renderQuizTopbar(); renderPart();
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudentApp);
  } else {
    initStudentApp();
  }
}
