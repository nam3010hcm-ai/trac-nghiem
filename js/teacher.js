import {
  supabase,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  uploadMediaFile
} from './supabase.js';

import { initData, state, $, esc } from './common.js';
import { populateCategoryDropdowns, updateFltSubcat, updateQFormSubcat, updateEFormSubcat, addParentCategory, deleteParentCategory, addSubCategory, deleteSubCategory, editSubCategory, restoreDefaultCategories, renderCatManagementList } from './categories.js';
import { openQForm, closeQForm, saveQ, deleteQ, renderQuestions } from './questions.js';
import { openEForm, closeEForm, saveExam, deleteExam, toggleExamVisibility, renderExams, populateExamSelect } from './exams.js';
import { renderResults, clearResults, exportCSV } from './results.js';

async function showTeacherPanel(user) {
  $('t-login').style.display = 'none';
  $('t-panel').style.display = 'block';

  if ($('current-user-email')) {
    $('current-user-email').innerText = user?.email || 'Quản trị viên';
  }

  try {
    await initData(true);
  } catch(e) {
    console.error("Lỗi khi nạp dữ liệu:", e);
  }

  try {
    populateCategoryDropdowns();
    updateFltSubcat();
    updateQFormSubcat();
    updateEFormSubcat();
    populateExamSelect();

    renderQuestions();
    renderExams();
    renderResults();
    renderCatManagementList();
    loadCohorts(); 
    if (typeof window.populateCohortExams === 'function') {
      window.populateCohortExams(); 
    }
  } catch(e) {
    console.error("Lỗi khi hiển thị giao diện quản trị:", e);
  }
}

async function doLogin() {
  const email = $('t-email').value.trim();
  const pass = $('t-pass').value.trim();

  if (!email || !pass) {
    $('t-err').style.display = 'block';
    $('t-err').innerText = '❌ Vui lòng nhập email và mật khẩu!';
    return;
  }

  const btn = $('btn-login');
  if(btn) { btn.disabled = true; btn.innerText = 'Đang xác thực...'; }

  try {
    const data = await signInWithEmailAndPassword(email, pass);
    $('t-err').style.display = 'none';
    if (data?.user) await showTeacherPanel(data.user);
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);

    let errMsg = error.message || 'Email hoặc mật khẩu không đúng!';
    if (errMsg.includes('Email not confirmed')) {
      errMsg = 'Tài khoản chưa được kích hoạt! Hãy vào Supabase Dashboard -> Authentication -> Users và bấm Confirm user.';
    } else if (errMsg.includes('Invalid login credentials')) {
      errMsg = 'Sai email hoặc mật khẩu! Vui lòng kiểm tra lại thông tin tài khoản Supabase.';
    }
    
    $('t-err').style.display = 'block';
    $('t-err').innerText = '❌ ' + errMsg;
  } finally {
    if(btn) { btn.disabled = false; btn.innerText = 'Đăng nhập'; }
  }
}

async function doLogout() {
  try { await signOut(); } catch(e){}

  $('t-pass').value = '';
  $('t-err').style.display = 'none';
  $('t-login').style.display = 'block';
  $('t-panel').style.display = 'none';

  if ($('current-user-email')) {
    $('current-user-email').innerText = '';
  }
}

function togglePasswordVisibility() {
  const passInput = $('t-pass');
  const btn = $('btn-toggle-pass');

  if (!passInput || !btn) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    btn.innerText = '🙈 Ẩn';
  } else {
    passInput.type = 'password';
    btn.innerText = '👁 Hiện';
  }
}

function switchTTab(t) {
  ['q', 'e', 'r', 'c', 'cohort', 'img'].forEach(x => {
    const content = $('tc-' + x);
    if(content) content.classList.toggle('active', x === t);
    
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${x}"]`);
    if(tabBtn) tabBtn.classList.toggle('active', x === t);
  });

  if (t === 'r') renderResults();
  if (t === 'c') renderCatManagementList();
  if (t === 'img' && typeof window.loadGallery === 'function') window.loadGallery();
  if (t === 'cohort') {
      loadCohorts(); 
      if (typeof window.populateCohortExams === 'function') {
          window.populateCohortExams(); 
      }
  }
}

function initTeacherApp() {
  if (window._teacherAppInitialized) return;
  window._teacherAppInitialized = true;

  if ($('btn-login')) $('btn-login').addEventListener('click', doLogin);
  if ($('btn-toggle-pass')) {
    $('btn-toggle-pass').addEventListener('click', togglePasswordVisibility);
  }

  if ($('t-email')) {
    $('t-email').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }

  if ($('t-pass')) {
    $('t-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }

  if ($('btn-logout')) $('btn-logout').addEventListener('click', doLogout);

  onAuthStateChanged(async user => {
    if (user) {
      showTeacherPanel(user);
    } else {
      $('t-login').style.display = 'block';
      $('t-panel').style.display = 'none';
      if ($('current-user-email')) $('current-user-email').innerText = '';
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTTab(btn.dataset.tab))
  );

  if ($('flt-cat')) {
    $('flt-cat').addEventListener('change', () => {
      updateFltSubcat();

      const cat = $('flt-cat').value;
      if ($('qf-cat')) $('qf-cat').value = cat;
      updateQFormSubcat();

      const subcat = $('flt-subcat')?.value;
      if (subcat && $('qf-subcat')) $('qf-subcat').value = subcat;
    });
  }

  if ($('qf-cat')) $('qf-cat').addEventListener('change', updateQFormSubcat);
  if ($('ef-cat')) $('ef-cat').addEventListener('change', updateEFormSubcat);
  if ($('flt-r-cohort')) $('flt-r-cohort').addEventListener('change', renderResults);
  
  if ($('btn-filter-q')) {
    $('btn-filter-q').addEventListener('click', () => {
      renderQuestions();

      const cat = $('flt-cat')?.value;
      const subcat = $('flt-subcat')?.value;

      if (cat && $('qf-cat')) {
        $('qf-cat').value = cat;
        updateQFormSubcat();
      }

      if (subcat && $('qf-subcat')) {
        $('qf-subcat').value = subcat;
      }
    });
  }

  if ($('btn-open-qform')) {
    $('btn-open-qform').addEventListener('click', () => {
      openQForm();

      const cat = $('flt-cat')?.value;
      const subcat = $('flt-subcat')?.value;

      if (cat && $('qf-cat')) {
        $('qf-cat').value = cat;
        updateQFormSubcat();
      }

      if (subcat && $('qf-subcat')) {
        $('qf-subcat').value = subcat;
      }
    });
  }

  if ($('btn-close-qform')) $('btn-close-qform').addEventListener('click', closeQForm);
  if ($('btn-save-q')) $('btn-save-q').addEventListener('click', saveQ);

  if ($('q-list')) {
    $('q-list').addEventListener('click', e => {
      const btn = e.target.closest('.q-action');
      if (!btn) return;

      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === 'edit') openQForm(id);
      if (btn.dataset.action === 'delete') deleteQ(id);
    });
  }

  if ($('btn-open-eform')) $('btn-open-eform').addEventListener('click', openEForm);
  if ($('btn-close-eform')) $('btn-close-eform').addEventListener('click', closeEForm);
  if ($('btn-save-exam')) $('btn-save-exam').addEventListener('click', saveExam);

  if ($('e-list')) {
    $('e-list').addEventListener('click', e => {
      const btn = e.target.closest('.e-action');
      if (!btn) return;

      const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);

      if (btn.dataset.action === 'toggle') {
          toggleExamVisibility(id);
      } else if (btn.dataset.action === 'delete') {
          deleteExam(id);
      } else if (btn.dataset.action === 'edit') {
          openEForm(id); 
      } else if (btn.dataset.action === 'manage-q') {
          window.openExamQuestionManager(id);
      }
    });
  }

  if ($('btn-add-parent')) $('btn-add-parent').addEventListener('click', addParentCategory);
  if ($('btn-add-sub')) $('btn-add-sub').addEventListener('click', addSubCategory);
  if ($('btn-restore')) $('btn-restore').addEventListener('click', restoreDefaultCategories);

  if ($('cat-management-list')) {
    $('cat-management-list').addEventListener('click', e => {
      const btn = e.target.closest('.cat-action');
      if (!btn) return;

      const parent = btn.dataset.parent;
      const sub = btn.dataset.sub;

      if (btn.dataset.action === 'delete-parent') deleteParentCategory(parent);
      if (btn.dataset.action === 'edit-sub') editSubCategory(parent, sub);
      if (btn.dataset.action === 'delete-sub') deleteSubCategory(parent, sub);
    });
  }

  if ($('btn-export')) $('btn-export').addEventListener('click', exportCSV);
  if ($('btn-clear-results')) $('btn-clear-results').addEventListener('click', clearResults);

  // Gallery file upload
  const galFile = document.getElementById('gal-file');
  let selectedGalFile = null;

  if (galFile) {
      galFile.addEventListener('change', e => {
          selectedGalFile = e.target.files[0];
          if (!selectedGalFile) {
              document.getElementById('gal-preview').innerHTML = '';
              return;
          }
          const objectUrl = URL.createObjectURL(selectedGalFile);
          document.getElementById('gal-preview').innerHTML = `<img src="${objectUrl}" style="max-height:150px; border-radius:6px; border:1px solid #cbd5e1;">`;
      });
  }

  const btnUploadGal = document.getElementById('btn-upload-gal');
  if (btnUploadGal) {
      btnUploadGal.addEventListener('click', async () => {
          const name = document.getElementById('gal-name').value.trim();
          if (!name) { alert("Vui lòng nhập tên gợi nhớ cho ảnh!"); return; }
          if (!selectedGalFile) { alert("Vui lòng chọn 1 file ảnh!"); return; }

          btnUploadGal.disabled = true;
          btnUploadGal.textContent = "Đang tải lên Supabase Storage...";
          try {
              const downloadURL = await uploadMediaFile(selectedGalFile, 'image-bank', (pct) => {
                  btnUploadGal.textContent = `Đang tải lên: ${pct}%...`;
              });
              const { error } = await supabase.from('gallery').insert([{ name: name, url: downloadURL, created_at: Date.now() }]);
              if(error) throw error;
              alert("Đã lưu ảnh vào thư viện đám mây!");
              document.getElementById('gal-name').value = '';
              document.getElementById('gal-file').value = '';
              document.getElementById('gal-preview').innerHTML = '';
              selectedGalFile = null;
              if (window.loadGallery) window.loadGallery();
          } catch (e) { console.error(e); alert("Lỗi khi tải ảnh lên: " + (e.message || '')); }
          btnUploadGal.disabled = false;
          btnUploadGal.textContent = "Tải lên Thư viện";
      });
  }

  // Chấm bài tự luận
  let currentGradeResultId = null;

  window.openGradeModal = function(resultId) {
      const modal = document.getElementById('grade-modal');
      if (!modal) return;
      const res = state.results.find(r => String(r.id) === String(resultId));
      if (!res) return;

      currentGradeResultId = resultId;
      document.getElementById('grade-student-info').innerHTML = `Học viên: <b>${esc(res.student)}</b> (${esc(res.sid || '')}) | Đề: <b>${esc(res.exam)}</b>`;
      
      let essayHtml = '';
      if (Array.isArray(res.answers)) {
          res.answers.forEach((ans, i) => {
              if (typeof ans === 'string' && ans.length > 5) {
                  essayHtml += `<div style="margin-bottom:10px;"><b>Bài làm câu ${i+1}:</b><div style="background:#fff; padding:10px; border-radius:6px; border:1px solid #cbd5e1; margin-top:4px;">${esc(ans)}</div></div>`;
              }
          });
      }
      document.getElementById('grade-essay-content').innerHTML = essayHtml || '<i>Học viên không có phần trả lời tự luận hoặc đã nộp trống.</i>';
      document.getElementById('grade-score-input').value = res.manualScore || 0;
      modal.style.display = 'flex';
  };

  document.getElementById('btn-close-grade')?.addEventListener('click', () => {
      document.getElementById('grade-modal').style.display = 'none';
      currentGradeResultId = null;
  });

  document.getElementById('btn-save-grade')?.addEventListener('click', async () => {
      if (!currentGradeResultId) return;
      const scoreVal = parseFloat(document.getElementById('grade-score-input').value) || 0;
      const res = state.results.find(r => String(r.id) === String(currentGradeResultId));
      if (res) {
          res.manualScore = scoreVal;
          const { error } = await supabase.from('results').update({ manual_score: scoreVal }).eq('id', currentGradeResultId);
          if(error) console.error("Lỗi lưu điểm tự luận:", error);
          renderResults();
      }
      document.getElementById('grade-modal').style.display = 'none';
      alert("✅ Đã cập nhật điểm tự luận thành công!");
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTeacherApp);
} else {
  initTeacherApp();
}

// ==========================================
// QUẢN LÝ CA THI / LỚP HỌC (COHORTS)
// ==========================================

// Hàm hiển thị danh sách đề thi dạng Checkbox cho Form tạo / sửa Ca thi
window.populateCohortExams = function() {
    const container = document.getElementById("t-cohort-exams");
    if (!container) return;
    
    // Kiểm tra xem dữ liệu đề thi đã được tải về chưa
    if (typeof state === 'undefined' || !state.exams) {
        container.innerHTML = '<div style="color:#ef4444; font-size:13px;">Lỗi: Chưa tải được dữ liệu đề thi. Vui lòng F5 lại trang!</div>';
        return;
    }

    // LỌC ĐỀ THI: Chỉ lấy những đề KHÔNG BỊ ẨN
    const visibleExams = state.exams.filter(e => !e.isHidden);

    if (visibleExams.length === 0) {
        container.innerHTML = '<div style="color:#64748b; font-size:13px; text-align:center; padding: 10px;">Không có đề thi nào đang ở chế độ HIỆN!</div>';
        return;
    }

    // RENDER GIAO DIỆN
    container.innerHTML = visibleExams.map(e => `
        <label style="
            display: flex !important; 
            justify-content: flex-start !important; 
            align-items: center !important; 
            text-align: left !important; 
            gap: 12px; 
            margin-bottom: 8px; 
            padding: 10px 12px; 
            background: #ffffff; 
            border: 1px solid #cbd5e1; 
            border-radius: 6px; 
            cursor: pointer; 
            width: 100%; 
            box-sizing: border-box;
            transition: all 0.2s;
        ">
            <input type="checkbox" class="cohort-exam-cb" value="${e.id}" style="
                margin: 0 !important; 
                width: 18px !important; 
                height: 18px !important; 
                flex-shrink: 0; 
                cursor: pointer;
            "> 
            <span style="
                font-weight: 500; 
                font-size: 14px; 
                color: #334155; 
                word-break: break-word;
                line-height: 1.4;
            ">
                ${e.name}
            </span>
        </label>
    `).join('');
};

window.allCohortsData = {}; 
let editingCohortId = null; 

// 1. Hàm tải danh sách ca thi
async function loadCohorts() {
    const tbody = document.getElementById("t-cohort-list");
    if (!tbody) return;

    try {
        const { data: cohorts, error } = await supabase.from('cohorts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        tbody.innerHTML = "";
        window.allCohortsData = {};

        if (!cohorts || cohorts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px;">Chưa có ca thi nào</td></tr>';
            return;
        }

        cohorts.forEach(data => {
            const id = String(data.id);
            window.allCohortsData[id] = {
              ...data,
              startTime: data.start_time || data.startTime,
              endTime: data.end_time || data.endTime,
              allowedExams: data.allowed_exams || data.allowedExams || []
            };
            const isActive = data.status === 'active';
            const modeText = data.mode === 'exam' ? '📝 Thi thật' : '📖 Ôn luyện';
            const sTime = data.start_time ? new Date(data.start_time).toLocaleString('vi-VN') : 'Không giới hạn';
            const eTime = data.end_time ? new Date(data.end_time).toLocaleString('vi-VN') : 'Không giới hạn';
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700; color:#1e293b;">${esc(data.name)}</div>
                    <div style="font-size:12px; color:#f59e0b; font-weight:600; margin-top:4px;">Chế độ: ${modeText}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">Từ: ${sTime}</div>
                    <div style="font-size:12px; color:#64748b;">Đến: ${eTime}</div>
                    <div style="font-size:12px; color:#10b981; font-weight:600; margin-top:4px;">
                        Mã truy cập: <span style="background:#d1fae5; padding:2px 6px; border-radius:4px; color:#065f46;">${esc(data.code)}</span>
                        <button onclick="window.changeCohortCode('${id}', '${esc(data.code)}')" style="border:none; background:none; cursor:pointer; color:#3b82f6; text-decoration:underline;">(Đổi mã)</button>
                    </div>
                </td>
                <td>
                    <span style="color: ${isActive ? '#1D9E75' : '#ef4444'}; font-weight: 600; font-size: 13px;">
                        ${isActive ? 'Đang mở' : 'Đã đóng'}
                    </span>
                </td>
                <td style="display: flex; gap: 5px; flex-direction:column;">
                    <button class="btn" onclick="window.editCohort('${id}')" style="padding: 4px 10px; font-size: 12px; background: #e0e7ff; color: #4f46e5;">
                        ✏️ Sửa
                    </button>
                    <button class="btn" onclick="window.toggleCohort('${id}', '${data.status}')" style="padding: 4px 10px; font-size: 12px; background: #f1f5f9; color: #334155;">
                        ${isActive ? 'Khóa ca thi' : 'Mở lại'}
                    </button>
                    <button class="btn" onclick="window.deleteCohort('${id}')" style="padding: 4px 10px; font-size: 12px; background: #fee2e2; color: #ef4444;">
                        Xóa
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Lỗi tải danh sách ca thi:", error);
    }
}

// Hàm đẩy dữ liệu lên Form để Sửa
window.editCohort = (id) => {
    const data = window.allCohortsData[id];
    if (!data) return;

    editingCohortId = id;
    document.getElementById("t-cohort-name").value = data.name || '';
    document.getElementById("t-cohort-code").value = data.code || '';
    document.getElementById("t-cohort-start").value = data.startTime || '';
    document.getElementById("t-cohort-end").value = data.endTime || '';
    
    const modeSelect = document.getElementById("t-cohort-mode");
    if(modeSelect) modeSelect.value = data.mode || 'practice';

    // Đánh dấu các đề thi đã chọn
    const allowed = data.allowedExams || [];
    document.querySelectorAll('.cohort-exam-cb').forEach(cb => {
        cb.checked = allowed.includes(parseInt(cb.value));
    });

    const btn = document.getElementById("btn-add-cohort");
    btn.textContent = "💾 Cập nhật Ca thi";
    btn.style.background = "#f59e0b";
    
    let cancelBtn = document.getElementById("btn-cancel-edit-cohort");
    if (!cancelBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.id = "btn-cancel-edit-cohort";
        cancelBtn.className = "btn";
        cancelBtn.style.marginTop = "10px";
        cancelBtn.style.marginLeft = "8px";
        cancelBtn.textContent = "Hủy sửa";
        cancelBtn.onclick = () => window.cancelEditCohort();
        btn.parentNode.insertBefore(cancelBtn, btn.nextSibling);
    }
    cancelBtn.style.display = "inline-block";
    document.getElementById("t-cohort-name").scrollIntoView({ behavior: 'smooth' });
};

// Hàm Hủy chế độ Sửa và làm sạch Form
window.cancelEditCohort = () => {
    editingCohortId = null;
    document.getElementById("t-cohort-name").value = "";
    document.getElementById("t-cohort-code").value = "";
    document.getElementById("t-cohort-start").value = "";
    document.getElementById("t-cohort-end").value = "";
    document.querySelectorAll('.cohort-exam-cb').forEach(cb => cb.checked = false);
    
    const btn = document.getElementById("btn-add-cohort");
    if(btn) {
        btn.textContent = "✅ Tạo Ca thi";
        btn.style.background = "";
    }
    
    const cancelBtn = document.getElementById("btn-cancel-edit-cohort");
    if(cancelBtn) cancelBtn.style.display = "none";
};

// 2. Bắt sự kiện Thêm hoặc Cập nhật ca thi
const btnAddCohort = document.getElementById("btn-add-cohort");
if (btnAddCohort) {
    btnAddCohort.addEventListener("click", async () => {
        const name = document.getElementById("t-cohort-name").value.trim();
        const mode = document.getElementById("t-cohort-mode") ? document.getElementById("t-cohort-mode").value : 'practice';
        let code = document.getElementById("t-cohort-code").value.trim();
        const startTime = document.getElementById("t-cohort-start").value;
        const endTime = document.getElementById("t-cohort-end").value;
        
        const checkedExams = Array.from(document.querySelectorAll('.cohort-exam-cb:checked')).map(cb => parseInt(cb.value));

        if (!name) { alert("Vui lòng nhập tên ca thi!"); return; }
        if (!startTime || !endTime) { alert("Vui lòng chọn thời gian bắt đầu và kết thúc!"); return; }
        if (new Date(startTime) >= new Date(endTime)) { alert("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!"); return; }
        if (checkedExams.length === 0) { alert("Vui lòng chọn ít nhất 1 đề thi cho ca này!"); return; }

        if (!code) code = Math.random().toString(36).substring(2, 8).toUpperCase();

        btnAddCohort.disabled = true;
        btnAddCohort.textContent = "Đang lưu...";
        
        try {
            if (editingCohortId) {
                const { error } = await supabase.from('cohorts').update({
                    name: name,
                    code: code,
                    start_time: startTime,
                    end_time: endTime,
                    allowed_exams: checkedExams,
                    mode: mode
                }).eq('id', editingCohortId);
                if (error) throw error;
                alert("Đã cập nhật ca thi thành công!");
            } else {
                const { error } = await supabase.from('cohorts').insert([{
                    name: name,
                    code: code,
                    start_time: startTime,
                    end_time: endTime,
                    allowed_exams: checkedExams,
                    mode: mode,
                    status: "active",
                    created_at: Date.now()
                }]);
                if (error) throw error;
                alert(`Tạo ca thi thành công!\nMã truy cập cho học viên là: ${code}`);
            }
            
            window.cancelEditCohort();
            loadCohorts(); 
        } catch (error) {
            console.error("Lỗi khi lưu ca thi:", error);
            alert("Đã có lỗi xảy ra: " + (error.message || ''));
        } finally {
            btnAddCohort.disabled = false;
            btnAddCohort.textContent = editingCohortId ? "💾 Cập nhật Ca thi" : "✅ Tạo Ca thi";
        }
    });
}

// 3. Hàm đổi mã bảo mật
window.changeCohortCode = async (id, oldCode) => {
    const newCode = prompt(`Nhập mã truy cập mới (Mã hiện tại: ${oldCode}):`, oldCode);
    if (newCode && newCode.trim() !== oldCode) {
        try {
            const { error } = await supabase.from('cohorts').update({ code: newCode.trim().toUpperCase() }).eq('id', id);
            if (error) throw error;
            loadCohorts();
            alert("Đã đổi mã bảo mật thành công!");
        } catch (error) {
            console.error(error);
            alert("Lỗi khi đổi mã!");
        }
    }
};

// 4. Bật tắt ca thi và Xóa
window.toggleCohort = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    const { error } = await supabase.from('cohorts').update({ status: newStatus }).eq('id', id);
    if(error) console.error("Lỗi toggleCohort:", error);
    loadCohorts();
};

window.deleteCohort = async (id) => {
    if (confirm("Xóa ca thi này? Điểm của học viên đã thi sẽ KHÔNG bị mất.")) {
        const { error } = await supabase.from('cohorts').delete().eq('id', id);
        if(error) console.error("Lỗi deleteCohort:", error);
        loadCohorts();
    }
};

// ==========================================
// TÍNH NĂNG CHỌN CÂU HỎI THỦ CÔNG CHO ĐỀ THI
// ==========================================
let currentEqmExamId = null;

window.openExamQuestionManager = function(examId) {
    currentEqmExamId = examId;
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;

    const eForm = document.getElementById('eform');
    if(eForm) eForm.style.display = 'none'; 
    document.getElementById('exam-q-manager').style.display = 'block';
    document.getElementById('eqm-name').textContent = exam.name;

    if (!exam.qIds) exam.qIds = [];

    const cats = Object.keys(state.SUBCATS).sort();
    document.getElementById('eqm-filter-cat').innerHTML = '<option value="">(Tất cả chủ đề)</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

    renderEqmLists();
};

document.getElementById('btn-close-eqm')?.addEventListener('click', () => {
    document.getElementById('exam-q-manager').style.display = 'none';
});

document.getElementById('eqm-filter-cat')?.addEventListener('change', () => {
    renderEqmLists();
});

function renderEqmLists() {
    if (!currentEqmExamId) return;
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if (!exam) return;

    const filterCat = document.getElementById('eqm-filter-cat').value;
    const qIds = exam.qIds || [];

    document.getElementById('eqm-selected-count').textContent = qIds.length;

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

    document.getElementById('eqm-selected-list').innerHTML = selectedQs.length ? selectedQs.map((q, i) => renderSelectedQItem(q, i, selectedQs.length)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Đề thi chưa có câu hỏi nào</div>';
    document.getElementById('eqm-available-list').innerHTML = availableQs.length ? availableQs.map(q => renderAvailableQItem(q)).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center;">Không có câu hỏi phù hợp</div>';
}

window.moveQ = async (index, direction) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam || !exam.qIds) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exam.qIds.length) return;
    
    const temp = exam.qIds[index];
    exam.qIds[index] = exam.qIds[newIndex];
    exam.qIds[newIndex] = temp;
    
    await supabase.from('exams').update({ q_ids: exam.qIds }).eq('id', exam.id);
    renderEqmLists();
};

window.addQToExam = async (qId) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam) return;
    if(!exam.qIds) exam.qIds = [];
    
    if(!exam.qIds.includes(qId)) {
        exam.qIds.push(qId);
        exam.count = exam.qIds.length;
        await supabase.from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
        renderEqmLists();
        renderExams();
    }
};

window.removeQFromExam = async (qId) => {
    const exam = state.exams.find(e => e.id === currentEqmExamId);
    if(!exam) return;
    if(!exam.qIds) exam.qIds = [];
    
    exam.qIds = exam.qIds.filter(id => id !== qId);
    exam.count = exam.qIds.length;
    await supabase.from('exams').update({ q_ids: exam.qIds, count: exam.count }).eq('id', exam.id);
    renderEqmLists();
    renderExams();
};

// ==========================================
// QUẢN LÝ THƯ VIỆN ẢNH (GALLERY)
// ==========================================
window.imageGallery = [];

window.loadGallery = async function() {
    const list = document.getElementById("gallery-list");
    if (!list) return;
    try {
        const { data: items, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
        if(error) throw error;
        window.imageGallery = items || [];
        renderGallery();
    } catch (e) {
        console.error(e);
        list.innerHTML = "Lỗi tải thư viện.";
    }
};

function renderGallery() {
    const list = document.getElementById("gallery-list");
    const modalList = document.getElementById("modal-gallery-list");
    
    if (!window.imageGallery.length) {
        const emptyMsg = "<div style='color:#64748b; font-size:14px;'>Chưa có ảnh nào trong thư viện.</div>";
        if(list) list.innerHTML = emptyMsg;
        if(modalList) modalList.innerHTML = emptyMsg;
        return;
    }

    const html = window.imageGallery.map(img => {
        const src = img.url || img.base64;
        return `
        <div style="border:1px solid #cbd5e1; border-radius:8px; padding:10px; width:160px; text-align:center; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <img src="${src}" style="max-width:100%; height:100px; object-fit:contain; margin-bottom:8px; border-radius:4px; border:1px solid #f1f5f9;">
            <div style="font-size:12px; font-weight:600; color:#334155; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.name}">${img.name}</div>
            <button class="btn btn-sm btn-danger" onclick="window.deleteGalleryItem('${img.id}')" style="width:100%;">🗑 Xóa</button>
        </div>
    `}).join('');
    
    const modalHtml = window.imageGallery.map(img => {
        const src = img.url || img.base64;
        return `
        <div style="border:1px solid #cbd5e1; border-radius:8px; padding:10px; width:160px; text-align:center; background:#fff; cursor:pointer; transition:0.2s;" onclick="window.selectGalleryImage('${src}')" onmouseover="this.style.borderColor='#7c3aed'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.transform='';">
            <img src="${src}" style="max-width:100%; height:100px; object-fit:contain; margin-bottom:8px;">
            <div style="font-size:12px; font-weight:600; color:#7c3aed; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.name}">${img.name}</div>
        </div>
    `}).join('');

    if(list) list.innerHTML = html;
    if(modalList) modalList.innerHTML = modalHtml;
}



window.deleteGalleryItem = async function(id) {
    if (!confirm("Xóa ảnh này khỏi thư viện?\nLưu ý: Các câu hỏi đang dùng ảnh này không bị ảnh hưởng, nhưng ảnh sẽ biến mất khỏi thư viện.")) return;
    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if(error) console.error("Lỗi deleteGalleryItem:", error);
    if (window.loadGallery) window.loadGallery();
};

window.selectGalleryImage = function(src) {
    const qfImage = document.getElementById('qf-image');
    const imgPreview = document.getElementById('image-preview');
    
    if (qfImage) qfImage.value = src;
    if (imgPreview) imgPreview.innerHTML = `<img src="${src}" style="max-width:100%; max-height:200px; border-radius:8px; margin-top:10px; border: 1px solid #e2e8f0;">`;
    if (document.getElementById('btn-clear-image')) document.getElementById('btn-clear-image').style.display = 'inline-block';
    
    const modal = document.getElementById('modal-select-gallery');
    if (modal) modal.style.display = 'none';
};


