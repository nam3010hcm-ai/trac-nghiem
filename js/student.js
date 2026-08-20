import { initData, state, $, KEYS, shuffle, getPool, esc, mediaHTML, audioHTML, videoHTML, renderRich, typesetMath, isCorrect, formatAnswer, splitBlanks } from './common.js';
import { populateExamSelect, updateExamDesc } from './exams.js';
import { saveResult } from './results.js';
import { recordAuthEvent, recordStudyTime } from './auth-logs.js';

const db = () => window.supabaseClient;

const STUDENT_AUTH_KEY = 'quiz_student_auth_session_v1';
let qState = {};
const STORE_KEY = 'quiz_current_attempt_v2';
let activeCohortsData = {}; 
let uiState = { multiSelected: {} }; 

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(id);
  if (target) target.classList.add('active');
}

function persist(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify({...qState, timer:null})); }catch{} }
function clearPersist(){ localStorage.removeItem(STORE_KEY); }

// ==============================================================
// 1. XÁC THỰC HỌC VIÊN & ANTI-DDOS (STUDENT AUTH)
// ==============================================================
export function getAuthenticatedStudent() {
  try {
    const raw = sessionStorage.getItem(STUDENT_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function toggleStudentPassVisible() {
  const input = $('st-login-pass');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

export async function loginStudent() {
  const inputEl = $('st-login-email') || $('s-email');
  const passEl = $('st-login-pass') || $('s-pass');
  const errBox = $('st-login-err') || $('s-err');
  const btn = $('btn-student-login') || $('btn-s-login');

  const userInput = inputEl ? inputEl.value.trim() : '';
  const pass = passEl ? passEl.value.trim() : '';

  if (errBox) errBox.style.display = 'none';

  if (!userInput || !pass) {
    if (errBox) {
      errBox.textContent = '⚠️ Vui lòng nhập Mã Sinh Viên (ID) hoặc Gmail/Email và Mật khẩu!';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Đang xác thực...'; }

  try {
    let data = null;
    if (db()) {
      // 1. Thử tìm kiếm theo Mã sinh viên (id) hoặc Email (không phân biệt hoa/thường)
      try {
        const { data: students, error } = await db()
          .from('students')
          .select('*')
          .or(`email.ilike."${userInput}",id.ilike."${userInput}"`)
          .eq('password', pass);

        if (students && students.length > 0) {
          data = students[0];
        }
      } catch (e) {
        console.warn("Lỗi truy vấn OR trong Supabase, chuyển sang truy vấn fallback:", e);
      }

      // Fallback: Nếu OR không tìm thấy hoặc bị lỗi syntax, tìm tuần tự theo ID rồi theo Email
      if (!data) {
        // Thử theo Mã sinh viên (ID)
        const resId = await db().from('students').select('*').ilike('id', userInput).eq('password', pass).maybeSingle();
        if (resId.data) {
          data = resId.data;
        } else {
          // Thử theo Email
          const resEmail = await db().from('students').select('*').ilike('email', userInput).eq('password', pass).maybeSingle();
          if (resEmail.data) {
            data = resEmail.data;
          }
        }
      }
    }

    if (!data) {
      if (errBox) {
        errBox.textContent = '❌ Mã Sinh Viên (ID) / Email hoặc Mật khẩu không chính xác!';
        errBox.style.display = 'block';
      }
      return;
    }

    if (data.is_active === false) {
      if (errBox) {
        errBox.textContent = '⛔ Tài khoản học viên của bạn đã bị khóa. Vui lòng liên hệ Giáo viên/Quản trị viên!';
        errBox.style.display = 'block';
      }
      return;
    }

    // Đăng nhập thành công -> lưu session & ghi nhận login event
    const stPayload = { sid: data.id, name: data.full_name || data.id, class_name: data.class_name || '', email: data.email || '' };
    localStorage.setItem('st_user', JSON.stringify(stPayload));
    sessionStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(data));
    sessionStorage.setItem('st_session_start', Date.now().toString());

    // Ghi nhận sự kiện Login vào Supabase
    recordAuthEvent(data.email, 'student', 'login', 0, data.id, data.full_name || data.id, data.class_name || '');

    renderStudentPortal(data);
  } catch (err) {
    console.error("Lỗi đăng nhập học viên:", err);
    if (errBox) {
      errBox.textContent = '❌ Lỗi kết nối máy chủ: ' + (err.message || '');
      errBox.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng Nhập Phòng Thi & Học Tập →'; }
  }
}

export function renderStudentPortal(student) {
  if ($('st-auth-welcome')) $('st-auth-welcome').textContent = `Xin chào, ${student.full_name || student.id} 👋`;
  if ($('st-auth-id')) $('st-auth-id').textContent = student.id || '';
  if ($('st-auth-class')) $('st-auth-class').textContent = student.class_name || '';

  showScreen('sc-portal');
  populatePracticeCategories();
  populatePracticeExamSelect();
  loadActiveCohorts();
  switchExamMode('practice');
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

export function renderStudentAssignedTasks() {
  const container = document.getElementById('student-assigned-tasks-list');
  if (!container) return;

  const savedAsg = localStorage.getItem('educore_assignments_data');
  let tasks = [];
  if (savedAsg) {
    try { tasks = JSON.parse(savedAsg); } catch(e){}
  }
  if (!tasks || tasks.length === 0) {
    tasks = [
      { id: 'asg_1', title: '📝 Kiểm tra Giữa Kỳ 1 — Anh Văn 10', contentType: 'exam', dueAt: '2026-08-25 23:59', durationMinutes: 45, maxAttempts: 1 },
      { id: 'asg_2', title: '🎬 Video Roleplay: Hotel Check-in & Inquiry (A & B)', contentType: 'video_roleplay', dueAt: '2026-08-30 23:59', durationMinutes: 0, maxAttempts: 0 }
    ];
  }

  container.innerHTML = tasks.map(t => `
    <div class="card" style="margin-bottom:12px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <strong style="font-size:15px;color:#0f172a;display:block;margin-bottom:4px">${esc(t.title)}</strong>
        <div style="font-size:12px;color:#64748b">
          ⏱️ Thời gian: <b>${t.durationMinutes ? t.durationMinutes + ' phút' : 'Vô hạn'}</b> • 
          ⏰ Hạn nộp: <b style="color:#dc2626">${t.dueAt ? t.dueAt.replace('T',' ') : 'Không có'}</b>
        </div>
      </div>
      <div>
        ${t.contentType === 'video_roleplay' 
          ? `<a href="learn.html" class="btn btn-sm btn-p">🎬 Vào Luyện Roleplay</a>` 
          : `<button class="btn btn-sm btn-p" onclick="window.switchExamMode('practice')">✍️ Làm Bài Thi</button>`}
      </div>
    </div>
  `).join('');
}

export function populatePracticeCategories() {
  const catSelect = $('s-practice-cat');
  if (!catSelect) return;
  const cats = Object.keys(state.SUBCATS || {});
  catSelect.innerHTML = '<option value="">(Tất cả Môn học / Chủ đề)</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

export function populatePracticeExamSelect() {
  const catSelect = $('s-practice-cat');
  const examSelect = $('s-practice-exam');
  if (!examSelect) return;

  const currentCat = catSelect ? catSelect.value : '';
  let exams = (state.exams || []).filter(e => !e.isHidden);
  if (currentCat) {
    exams = exams.filter(e => e.cat === currentCat);
  }

  if (exams.length === 0) {
    examSelect.innerHTML = '<option value="" disabled selected>-- Không có đề ôn tập nào --</option>';
  } else {
    examSelect.innerHTML = '<option value="" disabled selected>-- Chọn đề thi ôn tập --</option>' +
      exams.map(e => `<option value="${e.id}">${esc(e.name)} (${e.count || 10} câu${e.timeLimit ? ` • ${e.timeLimit} phút` : ''})</option>`).join('');
  }
  updatePracticeExamDesc();
}

export function updatePracticeExamDesc() {
  const examSelect = $('s-practice-exam');
  const descEl = $('s-practice-exam-desc');
  if (!descEl) return;
  const eid = parseInt(examSelect?.value);
  const exam = (state.exams || []).find(e => e.id === eid);
  if (exam) {
    descEl.textContent = `📖 ${exam.desc || 'Đề ôn luyện kiến thức'} • Số câu: ${exam.count || 10}${exam.timeLimit ? ` • Thời gian: ${exam.timeLimit} phút` : ' • Không giới hạn thời gian'}`;
  } else {
    descEl.textContent = '';
  }
}

export async function startPracticeExam() {
  const currentStudent = getAuthenticatedStudent();
  if (!currentStudent) {
    alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!");
    logoutStudent();
    return;
  }

  const eid = parseInt($('s-practice-exam')?.value);
  if (!eid) {
    alert("⚠️ Vui lòng chọn một đề thi để bắt đầu ôn tập!");
    return;
  }

  const exam = (state.exams || []).find(e => e.id === eid);
  if (!exam) {
    alert("Không tìm thấy đề thi đã chọn!");
    return;
  }

  const pool = getPool(exam);
  let qs = (exam.qIds && exam.qIds.length > 0) ? pool : shuffle(pool).sort((a, b) => (a.subcat || '').localeCompare(b.subcat || ''));
  qs = qs.slice(0, Math.min(exam.count, pool.length));
  if (!qs.length) {
    alert("Đề thi này hiện chưa có câu hỏi nào!");
    return;
  }

  // Gom nhóm câu hỏi theo Part
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
    student: {
      name: currentStudent.full_name || currentStudent.id,
      id: currentStudent.id,
      class_name: currentStudent.class_name || '',
      academic_year: currentStudent.academic_year || '',
      email: currentStudent.email || '',
      cohort: 'Ôn Thi & Luyện Tập'
    },
    qs,
    parts,
    partIdx: 0,
    answers: [],
    startTime: Date.now(),
    timer: null,
    mode: 'practice'
  };

  persist();
  startTimer();
  showStudentBadge();
  showScreen('sc-quiz');
  renderPart();
}

export function logoutStudent() {
  const currentStudent = getAuthenticatedStudent();
  const sessionStart = parseInt(sessionStorage.getItem('st_session_start') || '0', 10);
  const duration = sessionStart > 0 ? Math.round((Date.now() - sessionStart) / 1000) : 0;

  if (currentStudent && currentStudent.email) {
    recordAuthEvent(currentStudent.email, 'student', 'logout', duration, currentStudent.id, currentStudent.full_name, currentStudent.class_name);
  }

  sessionStorage.removeItem(STUDENT_AUTH_KEY);
  sessionStorage.removeItem('st_session_start');
  if ($('st-login-pass')) $('st-login-pass').value = '';
  if ($('st-login-err')) $('st-login-err').style.display = 'none';
  showScreen('sc-login');
}

function checkStudentAuth() {
  const currentStudent = getAuthenticatedStudent();
  if (currentStudent && currentStudent.id) {
    renderStudentPortal(currentStudent);
  } else {
    showScreen('sc-login');
  }
}

window.loginStudent = loginStudent;
window.logoutStudent = logoutStudent;
window.toggleStudentPassVisible = toggleStudentPassVisible;
window.switchExamMode = switchExamMode;
window.populatePracticeCategories = populatePracticeCategories;
window.populatePracticeExamSelect = populatePracticeExamSelect;
window.updatePracticeExamDesc = updatePracticeExamDesc;
window.startPracticeExam = startPracticeExam;

function showStudentBadge(){
  const s = qState.student;
  $('q-student').textContent = `${s.id || ''} - ${s.name || ''} (${s.class_name || ''}) • ${qState.mode === 'practice' ? '💡 Ôn thi' : `Ca thi: ${s.cohort || ''}`} • ${qState.exam?.name || ''}`;
}

async function loadActiveCohorts() {
  const selectEl = $('s-cohort');
  if (!selectEl) return;
  try {
      const { data: cohorts, error } = await db().from('cohorts').select('*').eq('status', 'active');
      if (error) throw error;

      selectEl.innerHTML = '<option value="" disabled selected>-- Vui lòng chọn ca thi --</option>';
      let hasActiveCohort = false;
      (cohorts || []).forEach((data) => {
          hasActiveCohort = true;
          activeCohortsData[data.name] = {
            ...data,
            startTime: data.start_time || data.startTime,
            endTime: data.end_time || data.endTime,
            allowedExams: data.allowed_exams || data.allowedExams || []
          }; 
          selectEl.insertAdjacentHTML('beforeend', `<option value="${data.name}">${data.name}</option>`);
      });
      if (!hasActiveCohort) selectEl.innerHTML = '<option value="" disabled selected>Hiện không có ca thi đang mở</option>';
  } catch (e) { 
      console.error("Lỗi loadActiveCohorts:", e);
      selectEl.innerHTML = '<option value="" disabled selected>Lỗi tải dữ liệu!</option>'; 
  }
}

async function startExam(){
  const currentStudent = getAuthenticatedStudent();
  if (!currentStudent) {
    alert("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!");
    logoutStudent();
    return;
  }

  const name = currentStudent.full_name;
  const studentId = currentStudent.id;
  const className = currentStudent.class_name;
  const academicYear = currentStudent.academic_year;
  const email = currentStudent.email;
  const cohortName = $('s-cohort')?.value;

  if(!cohortName){ alert('Vui lòng chọn Ca thi / Lớp học!'); return; }

  const cohort = activeCohortsData[cohortName];
  if (cohort) {
      const codeInput = $('s-cohort-code')?.value.trim().toUpperCase() || '';
      if (codeInput !== cohort.code) { alert('❌ Mã truy cập ca thi không chính xác!'); return; }

      const now = new Date();
      if (cohort.startTime && new Date(cohort.startTime) > now) { alert('⏳ Ca thi chưa mở!'); return; }
      if (cohort.endTime && new Date(cohort.endTime) < now) { alert('⌛ Ca thi đã kết thúc!'); return; }

      const eid = parseInt($('s-exam').value);
      if (cohort.allowedExams && cohort.allowedExams.length > 0 && !cohort.allowedExams.includes(eid)) {
          alert('❌ Đề thi này không được phép làm trong Ca thi này!'); return;
      }
      
      // Thi chính thức -> kiểm tra học viên đã làm bài ca này chưa
      $('btn-start').disabled = true; $('btn-start').textContent = 'Đang kiểm tra lịch sử...';
      try {
          const { data: results, error } = await db().from('results').select('id').eq('cohort', cohortName).eq('sid', studentId);
          if (results && results.length > 0) {
              alert('❌ Bạn đã thi Ca này rồi. Bài thi chính thức chỉ cho phép làm 1 lần duy nhất!');
              $('btn-start').disabled = false; $('btn-start').textContent = 'Bắt đầu làm bài thi →';
              return;
          }
      } catch (error) {
          console.warn("Lỗi kiểm tra lịch sử thi:", error);
      }
      $('btn-start').disabled = false; $('btn-start').textContent = 'Bắt đầu làm bài thi →';
  }

  const eid = parseInt($('s-exam').value);
  const exam = state.exams.find(e => e.id === eid);
  if(!exam) { alert('Vui lòng chọn đề thi hợp lệ!'); return; }
  
  const pool = getPool(exam);
  let qs = (exam.qIds && exam.qIds.length > 0) ? pool : shuffle(pool).sort((a, b) => (a.subcat || '').localeCompare(b.subcat || ''));
  qs = qs.slice(0, Math.min(exam.count, pool.length));
  if(!qs.length){ alert('Đề thi trống!'); return; }

  // THUẬT TOÁN GOM NHÓM (GROUP BY PART)
  let parts = [];
  let currentPart = null;
  qs.forEach((q, i) => {
      q.globalIdx = i; // Gắn ID toàn cục cho câu hỏi
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
  
  persist(); startTimer(); showStudentBadge(); showScreen('sc-quiz'); renderPart();
}

function startTimer(){
  clearInterval(qState.timer);
  const tl = (qState.exam.timeLimit || 0) * 60;
  qState.timer = setInterval(() => {
    const el = Math.floor((Date.now() - qState.startTime) / 1000);
    const t = $('q-timer');
    if(tl > 0){
      const rem = tl - el;
      if(rem <= 0){ clearInterval(qState.timer); alert('Hết thời gian làm bài!'); finishExam(); return; }
      const m = String(Math.floor(rem/60)).padStart(2,'0'), s = String(rem%60).padStart(2,'0');
      t.textContent = `⏱ ${m}:${s}`;
      t.className = 'timer-badge' + (rem < 60 ? ' warn' : '');
    }else{
      const m = String(Math.floor(el/60)).padStart(2,'0'), s = String(el%60).padStart(2,'0');
      t.textContent = `⏱ ${m}:${s}`;
    }
  }, 1000);
}

// RENDER TOÀN BỘ CÂU HỎI TRONG PART HIỆN TẠI
function renderPart() {
  const currentPart = qState.parts[qState.partIdx];
  if (!currentPart) return;

  // Cập nhật tiêu đề Part
  $('q-progress').textContent = `${currentPart.name} (${qState.partIdx + 1}/${qState.parts.length})`;
  $('q-pbar').style.width = `${((qState.partIdx + 1) / qState.parts.length) * 100}%`;

  const container = $('part-container');
  container.innerHTML = ''; // Xóa nội dung Part cũ

  // Render từng câu hỏi trong Part
  currentPart.questions.forEach((q, idxInPart) => {
      const gIdx = q.globalIdx; // Vị trí câu hỏi trong toàn bộ đề
      const type = q.type || 'mcq_single';
      const qCard = document.createElement('div');
      qCard.className = 'card';
      qCard.style.marginBottom = '20px';

      let bodyHtml = '';
      if(type === 'mcq_single' || type === 'mcq_multi'){
          bodyHtml = renderMCQ(q, gIdx, type);
      } else if(type === 'fill_blank'){
          bodyHtml = renderFillBlank(q, gIdx);
      } else if(type === 'drag_drop'){
          bodyHtml = renderDragDrop(q, gIdx);
      } else if(type === 'matching'){
          bodyHtml = renderMatching(q, gIdx);
      } else if(type === 'essay'){
          bodyHtml = renderEssay(q, gIdx);
      }

      qCard.innerHTML = `
          <div style="font-size:15px; font-weight:700; color:#1e293b; margin-bottom:12px;">
              Câu ${gIdx + 1}: ${renderRich(q.text)}
          </div>
          ${mediaHTML(q.image)}
          ${audioHTML(q.audio, gIdx, qState.mode)}
          ${videoHTML(q.video, gIdx, qState.mode)}
          <div style="margin-top:14px;">${bodyHtml}</div>
      `;
      container.appendChild(qCard);

      // Gắn sự kiện đặc thù cho từng dạng câu hỏi sau khi đã vẽ HTML
      bindEventsForQuestion(q, gIdx, type, qCard);
  });

  // Điều khiển ẩn hiện nút điều hướng Part
  $('btn-prev').style.display = qState.partIdx > 0 ? 'block' : 'none';
  if (qState.partIdx === qState.parts.length - 1) {
      $('btn-next').style.display = 'none';
      $('btn-finish').style.display = 'block';
  } else {
      $('btn-next').style.display = 'block';
      $('btn-finish').style.display = 'none';
  }

  typesetMath(container);
}

function renderMCQ(q, gIdx, type) {
  const isMulti = type === 'mcq_multi';
  const savedAns = qState.answers[gIdx];
  return `
      <div style="display:flex; flex-direction:column; gap:8px;">
          ${(q.opts || []).map((opt, i) => {
              let isSelected = false;
              if (isMulti) {
                  const arr = uiState.multiSelected[gIdx] || (Array.isArray(savedAns) ? savedAns : []);
                  isSelected = arr.includes(i);
              } else {
                  isSelected = savedAns === i;
              }
              return `
                  <button class="opt ${isSelected ? 'selected' : ''}" data-gidx="${gIdx}" data-optidx="${i}">
                      <span class="okey">${KEYS[i]}</span>
                      <span>${renderRich(opt)}</span>
                  </button>
              `;
          }).join('')}
      </div>
  `;
}

function renderFillBlank(q, gIdx) {
  const parts = splitBlanks(q.text);
  const savedAns = qState.answers[gIdx] || [];
  let html = '<div class="fillblank-sentence">';
  parts.forEach((p, i) => {
      html += `<span>${renderRich(p)}</span>`;
      if (i < parts.length - 1) {
          const val = savedAns[i] || '';
          html += `<input type="text" class="blank-input" data-gidx="${gIdx}" data-blankidx="${i}" value="${esc(val)}" placeholder="...">`;
      }
  });
  html += '</div>';
  return html;
}

function renderDragDrop(q, gIdx) {
  const parts = splitBlanks(q.text);
  const savedAns = qState.answers[gIdx] || [];
  const bank = q.bank || [];
  
  let html = '<div class="fillblank-sentence" style="margin-bottom:15px;">';
  parts.forEach((p, i) => {
      html += `<span>${renderRich(p)}</span>`;
      if (i < parts.length - 1) {
          const val = savedAns[i] || '';
          html += `<button class="drop-slot ${val ? 'filled' : ''}" data-gidx="${gIdx}" data-slotidx="${i}">${val ? esc(val) : '⬚'}</button>`;
      }
  });
  html += '</div>';

  html += '<div style="display:flex; gap:8px; flex-wrap:wrap; padding:10px; background:#f8fafc; border-radius:8px;">';
  bank.forEach((word, i) => {
      const isUsed = savedAns.includes(word);
      html += `<button class="bank-chip ${isUsed ? 'used' : ''}" data-gidx="${gIdx}" data-word="${esc(word)}" ${isUsed ? 'disabled' : ''}>${esc(word)}</button>`;
  });
  html += '</div>';
  return html;
}

function renderMatching(q, gIdx) {
  const pairs = q.pairs || [];
  const savedAns = qState.answers[gIdx] || {}; 
  const leftItems = pairs.map((p, i) => ({ text: p.left, id: i }));
  const rightItems = pairs.map((p, i) => ({ text: p.right, id: i })).sort(() => Math.random() - 0.5);

  let html = '<div class="match-cols">';
  html += '<div class="match-col">';
  leftItems.forEach(l => {
      const isPaired = savedAns[l.id] !== undefined;
      html += `<button class="match-item ${isPaired ? 'paired' : ''}" data-gidx="${gIdx}" data-side="left" data-id="${l.id}">
          <span class="match-badge">${l.id + 1}</span>${esc(l.text)}
      </button>`;
  });
  html += '</div><div class="match-col">';
  rightItems.forEach(r => {
      const isPaired = Object.values(savedAns).includes(r.id);
      html += `<button class="match-item ${isPaired ? 'paired' : ''}" data-gidx="${gIdx}" data-side="right" data-id="${r.id}">
          ${esc(r.text)}
      </button>`;
  });
  html += '</div></div>';
  return html;
}

function renderEssay(q, gIdx) {
  const savedAns = qState.answers[gIdx] || '';
  return `
      <div>
          <textarea class="designer-textarea" data-gidx="${gIdx}" placeholder="Nhập bài làm tự luận của bạn tại đây..." style="min-height:140px;">${esc(savedAns)}</textarea>
      </div>
  `;
}

function bindEventsForQuestion(q, gIdx, type, qCard) {
  if (type === 'mcq_single') {
      qCard.querySelectorAll('.opt').forEach(btn => {
          btn.addEventListener('click', () => {
              const optIdx = parseInt(btn.dataset.optidx);
              qState.answers[gIdx] = optIdx;
              qCard.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              persist();
          });
      });
  } else if (type === 'mcq_multi') {
      qCard.querySelectorAll('.opt').forEach(btn => {
          btn.addEventListener('click', () => {
              const optIdx = parseInt(btn.dataset.optidx);
              if (!uiState.multiSelected[gIdx]) uiState.multiSelected[gIdx] = [];
              const arr = uiState.multiSelected[gIdx];
              const idxInArr = arr.indexOf(optIdx);
              if (idxInArr >= 0) arr.splice(idxInArr, 1);
              else arr.push(optIdx);
              
              qState.answers[gIdx] = [...arr];
              btn.classList.toggle('selected');
              persist();
          });
      });
  } else if (type === 'fill_blank') {
      qCard.querySelectorAll('.blank-input').forEach(inp => {
          inp.addEventListener('input', () => {
              const bIdx = parseInt(inp.dataset.blankidx);
              if (!qState.answers[gIdx]) qState.answers[gIdx] = [];
              qState.answers[gIdx][bIdx] = inp.value.trim();
              persist();
          });
      });
  } else if (type === 'essay') {
      const ta = qCard.querySelector('textarea');
      if (ta) {
          ta.addEventListener('input', () => {
              qState.answers[gIdx] = ta.value;
              persist();
          });
      }
  }
}

async function finishExam() {
  if(!confirm('Bạn có chắc chắn muốn kết thúc và nộp bài thi?')) return;
  clearInterval(qState.timer);

  const { exam, student, qs, answers, parts } = qState;

  // TÍNH ĐIỂM CHUẨN XÁC
  let cor = 0;
  let autoScore = 0;
  let totalMaxScore = 0;
  let hasPartWeight = false;

  // 1. Kiểm tra xem đề thi có định dạng điểm riêng theo từng Part [X điểm] không
  (parts || []).forEach(part => {
      const match = (part.name || '').match(/\[([0-9.]+)\s*điểm\]/i);
      if (match) {
          hasPartWeight = true;
          totalMaxScore += parseFloat(match[1]);
      }
  });

  const objQuestions = (qs || []).filter(q => q.type !== 'essay');
  const totalObjQs = objQuestions.length || 1;

  if (hasPartWeight && totalMaxScore > 0) {
      // Trường hợp đề thi có cấu hình thang điểm riêng từng phần
      parts.forEach(part => {
          const match = (part.name || '').match(/\[([0-9.]+)\s*điểm\]/i);
          const partPoints = match ? parseFloat(match[1]) : 0;
          const objQuestionsInPart = (part.questions || []).filter(q => q.type !== 'essay');
          const totalObjInPart = objQuestionsInPart.length;

          let correctInPart = 0;
          objQuestionsInPart.forEach(q => {
              const gIdx = q.globalIdx !== undefined ? q.globalIdx : qs.indexOf(q);
              if (isCorrect(q, answers[gIdx])) {
                  correctInPart++;
                  cor++;
              }
          });

          if (totalObjInPart > 0 && partPoints > 0) {
              const earnedInPart = (correctInPart / totalObjInPart) * partPoints;
              autoScore += earnedInPart;
          }
      });
  } else {
      // Trường hợp đề thi tiêu chuẩn (thang điểm 10)
      totalMaxScore = 10;
      objQuestions.forEach((q, idx) => {
          const gIdx = q.globalIdx !== undefined ? q.globalIdx : qs.indexOf(q);
          const ua = answers[gIdx];
          if (isCorrect(q, ua)) {
              cor++;
          }
      });
      autoScore = (cor / totalObjQs) * 10;
  }

  const score = Math.round(autoScore * 100) / 100;
  const pct = Math.round((cor / totalObjQs) * 100);
  const elapsed = Math.round((Date.now() - qState.startTime) / 1000);
  
  const result = {
    student: student.name,
    sid: student.id,
    class_name: student.class_name || '',
    academic_year: student.academic_year || '',
    email: student.email || '',
    cohort: student.cohort,
    exam: exam.name, 
    correct: cor,
    total: totalObjQs,
    score,
    manualScore: 0,
    pct,
    time: elapsed, 
    at: new Date().toLocaleString('vi-VN'),
    timestamp: Date.now(),
    answers: answers
  };

  await saveResult(result); 
  
  // Tích lũy thời gian làm bài thi và điểm XP vào bảng thống kê tuần
  recordStudyTime(student.id, student.name, student.class_name, elapsed, Math.round(score * 10));

  clearPersist();

  // HIỂN THỊ KẾT QUẢ
  $('r-name').innerHTML = `
    <div style="font-size: 15px; font-weight: 500; line-height: 1.6; color: #334155; margin-top: 8px;">
        Mã HV: <b style="color: #0f172a;">${student.id}</b> • Lớp: <b>${student.class_name || ''}</b><br>
        Họ tên: <b style="color: #0f172a;">${student.name}</b><br>
        Phân loại: <b style="color: ${qState.mode === 'exam' ? '#dc2626' : '#2563eb'};">${qState.mode === 'exam' ? `Ca thi: ${student.cohort || 'Thi chính thức'}` : 'Ôn Thi & Luyện Tập'}</b>
    </div>`;
  $('r-score').textContent = score; 
  
  const lbl = document.querySelector('.score-lbl');
  if(lbl) lbl.textContent = `điểm / ${totalMaxScore}`;

  $('r-cor').textContent = cor; $('r-wrg').textContent = totalObjQs - cor;
  $('r-time').textContent = (elapsed>=60 ? Math.floor(elapsed/60)+'p ' : '') + (elapsed%60) + 's';
  $('r-pct').textContent = pct + '%';

  const reviewCard = $('r-review-card');
  if (qState.mode === 'exam') {
    $('r-msg').innerHTML = "<span style='color:#dc2626;font-weight:700;'>🛡️ Bài thi chính thức đã nộp thành công!</span><br><span style='font-size:12.5px;color:#64748b;font-weight:normal;'>Điểm số đã được ghi nhận vào hệ thống. Theo quy định phòng thi, đáp án chi tiết không được hiển thị.</span>";
    $('btn-retake').style.display = 'none';
    if (reviewCard) reviewCard.style.display = 'none';
    $('r-review').innerHTML = '';
  } else {
    $('r-msg').innerHTML = "<span style='color:#16a34a;font-weight:700;'>🎉 Hoàn thành bài ôn thi!</span><br><span style='font-size:12.5px;color:#64748b;font-weight:normal;'>Bạn có thể xem lại chi tiết đáp án đúng và lời giải thích cho từng câu hỏi bên dưới.</span>";
    $('btn-retake').style.display = 'block';
    if (reviewCard) reviewCard.style.display = 'block';

    $('r-review').innerHTML = qs.map((q, i) => {
      const ua = answers[i];
      const correct = isCorrect(q, ua);
      let expHtml = q.explain ? `<div style="margin-top:8px; font-size:13px; color:#1e40af; background:#eff6ff; padding:10px 12px; border-radius:8px; border-left:3px solid #3b82f6;">💡 <b>Giải thích chi tiết:</b><br>${renderRich(q.explain)}</div>` : '';
      let correctAnsHtml = `<div style="font-size:13px; color:#15803d; margin-top:4px;"><b>Đáp án đúng:</b> ${formatAnswer(q, undefined, true)}</div>`;

      return `
        <div class="ri" style="padding:14px 16px; margin-bottom:14px; border-radius:10px; border-left:4px solid ${correct ? '#16a34a' : '#ef4444'}; background:${correct ? '#f0fdf4' : '#fef2f2'}; border-top:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; text-align:left;">
          <div style="font-size:14.5px; font-weight:700; color:#0f172a; margin-bottom:8px;">
            Câu ${i+1}: ${renderRich(q.text)}
          </div>
          <div style="font-size:13px; color:#334155; margin-bottom:4px;">
            Bạn đã chọn: <b style="color:${correct ? '#16a34a' : '#dc2626'}">${q.type==='essay' ? `<pre style="white-space:pre-wrap; background:#fff; padding:8px; border:1px solid #e2e8f0; border-radius:6px; margin-top:4px;">${esc(ua || '(Chưa viết bài luận)')}</pre>` : formatAnswer(q, ua, false)}</b>
            <span style="font-weight:700; color:${correct ? '#16a34a' : '#dc2626'}; margin-left:6px;">${correct ? '✅ (Chính xác)' : '❌ (Chưa đúng)'}</span>
          </div>
          ${!correct ? correctAnsHtml : ''}
          ${expHtml}
        </div>
      `;
    }).join('');
  }

  showScreen('sc-result');
  typesetMath($('sc-result'));
}

async function initStudentApp() {
  if (window._studentAppInitialized) return;
  window._studentAppInitialized = true;

  try {
    await initData(false);
  } catch(e) {
    console.error("Lỗi initData student:", e);
  }

  checkStudentAuth();

  const raw = localStorage.getItem(STORE_KEY);
  if(raw) {
    try{
      const saved = JSON.parse(raw);
      if(saved?.qs?.length && confirm('Phát hiện bài làm chưa hoàn thành. Bạn có muốn tiếp tục không?')){
        qState = saved; startTimer(); showStudentBadge(); showScreen('sc-quiz'); renderPart();
      }
    }catch{ clearPersist(); }
  }

  // Enter key trigger for student login
  const loginInput = $('st-login-email') || $('s-email');
  const loginPass = $('st-login-pass') || $('s-pass');
  if (loginInput) loginInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginStudent(); });
  if (loginPass) loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginStudent(); });

  if ($('s-cohort')) {
    $('s-cohort').addEventListener('change', () => {
        const cohortName = $('s-cohort').value;
        const codeInput = $('s-cohort-code')?.value.trim().toUpperCase() || '';
        const examSelect = $('s-exam');
        if (!examSelect) return;
        examSelect.innerHTML = '<option value="" disabled selected>-- Nhập đúng mã ca thi để tải đề --</option>';
        if ($('s-exam-desc')) $('s-exam-desc').textContent = '';
        if (!cohortName) return;
        const cohort = activeCohortsData[cohortName];
        if (cohort && codeInput === cohort.code) {
            const allowed = cohort.allowedExams || [];
            const availableExams = state.exams.filter(e => allowed.includes(e.id) && !e.isHidden);
            examSelect.innerHTML = availableExams.length === 0 ? '<option value="" disabled selected>-- Chưa có đề thi --</option>' : '<option value="" disabled selected>-- Chọn đề thi --</option>' + availableExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        }
    });
  }
  
  if ($('s-cohort-code')) {
    $('s-cohort-code').addEventListener('input', () => $('s-cohort')?.dispatchEvent(new Event('change')));
  }
  if ($('s-exam')) $('s-exam').addEventListener('change', updateExamDesc);
  if ($('btn-start')) $('btn-start').addEventListener('click', startExam);
  if ($('btn-next')) $('btn-next').addEventListener('click', () => { qState.partIdx++; persist(); renderPart(); window.scrollTo(0,0); });
  if ($('btn-prev')) $('btn-prev').addEventListener('click', () => { qState.partIdx--; persist(); renderPart(); window.scrollTo(0,0); });
  if ($('btn-finish')) $('btn-finish').addEventListener('click', finishExam);
  if ($('btn-home')) $('btn-home').addEventListener('click', () => { clearInterval(qState.timer); clearPersist(); showScreen('sc-portal'); });
  if ($('btn-retake')) {
    $('btn-retake').addEventListener('click', () => {
        qState.partIdx = 0; qState.answers = []; qState.startTime = Date.now();
        persist(); startTimer(); showScreen('sc-quiz'); renderPart();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudentApp);
} else {
  initStudentApp();
}
