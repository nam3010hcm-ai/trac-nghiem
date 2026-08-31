/**
 * MODULE PDF EXAM SUPABASE PERSISTENCE (js/pdf/pdf-saver.js)
 * Lưu câu hỏi và đề thi bóc tách từ PDF vào cơ sở dữ liệu Supabase
 */
import { state, $, logTeacherActivity } from '../common.js';
import { showToast } from '../ui-components.js';
import { renderQuestions } from '../questions.js';
import { renderExams, populateExamSelect } from '../exams.js';
import { currentParsedExam, closePdfImportModal } from './pdf-preview.js';

const db = () => window.supabaseClient;

export async function saveParsedExamToSupabase() {
  if (!currentParsedExam || !currentParsedExam.questions.length) {
    alert("❌ Không có câu hỏi nào để lưu!");
    return;
  }

  const examName = $('pdf-exam-name').value.trim();
  if (!examName) {
    alert("❌ Vui lòng nhập Tên Đề Thi!");
    $('pdf-exam-name').focus();
    return;
  }

  const cat = $('pdf-exam-cat').value;
  const subcat = $('pdf-exam-subcat').value;
  const desc = $('pdf-exam-desc').value.trim();
  const timeLimit = parseInt($('pdf-exam-time').value) || 45;

  const saveBtn = $('btn-save-pdf-exam');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Đang lưu vào Supabase...';
  }

  try {
    const authorEmail = state.currentUserEmail || 'nam3010hcm@gmail.com';

    const questionsToInsert = currentParsedExam.questions.map(q => ({
      type: 'mcq_single',
      cat: cat || 'Toán',
      subcat: subcat || 'Toán/Phần 2 - Đại số',
      text: String(q.text || '').trim(),
      audio: '',
      image: '',
      opts: Array.isArray(q.opts) ? q.opts : ["A", "B", "C", "D"],
      ans: typeof q.ans === 'number' ? q.ans : (parseInt(q.ans, 10) || 0),
      blanks: [],
      bank: [],
      pairs: [],
      explain: q.explain ? String(q.explain).trim() : '',
      created_by: authorEmail,
      difficulty: 'medium',
      skill: 'reading'
    }));

    let insertedQuestionIds = [];
    let qResult = await db().from('questions').insert(questionsToInsert).select();

    if (qResult.error) {
      console.warn("Lần 1 insert questions gặp lỗi, thử lại:", qResult.error);
      const minimalPayload = questionsToInsert.map(q => ({
        cat: q.cat,
        subcat: q.subcat,
        text: q.text,
        opts: q.opts,
        ans: q.ans,
        explain: q.explain,
        created_by: authorEmail
      }));
      qResult = await db().from('questions').insert(minimalPayload).select();
    }

    if (qResult.error) {
      console.warn("Lỗi insert questions Supabase:", qResult.error);
      questionsToInsert.forEach(q => {
        const fakeId = state.nextQId++;
        q.id = fakeId;
        insertedQuestionIds.push(fakeId);
      });
      state.questions = [...questionsToInsert, ...state.questions];
    } else if (qResult.data && qResult.data.length > 0) {
      insertedQuestionIds = qResult.data.map(item => Number(item.id));
      const formattedQuestions = qResult.data.map(q => ({
        ...q,
        id: Number(q.id),
        opts: q.opts || [],
        blanks: q.blanks || [],
        bank: q.bank || [],
        pairs: q.pairs || []
      }));
      state.questions = [...formattedQuestions, ...state.questions];
    }

    const examPayload = {
      name: examName,
      description: desc || '',
      count: insertedQuestionIds.length,
      cat: cat || 'Toán',
      subcat: subcat || 'Toán/Phần 2 - Đại số',
      time_limit: parseInt(timeLimit, 10) || 45,
      is_hidden: false,
      q_ids: insertedQuestionIds,
      created_by: authorEmail,
      passing_score: 5.0
    };

    let eResult = await db().from('exams').insert([examPayload]).select();

    if (eResult.error) {
      console.warn("Lỗi insert exams:", eResult.error);
      const fakeExamId = state.nextEId++;
      state.exams.unshift({
        id: fakeExamId,
        ...examPayload,
        timeLimit: examPayload.time_limit,
        isHidden: false,
        qIds: insertedQuestionIds
      });
    } else if (eResult.data && eResult.data.length > 0) {
      const created = eResult.data[0];
      state.exams.unshift({
        id: Number(created.id),
        name: created.name,
        desc: created.description || '',
        count: created.count || insertedQuestionIds.length,
        cat: created.cat || cat,
        subcat: created.subcat || subcat,
        timeLimit: created.time_limit ?? timeLimit,
        isHidden: created.is_hidden ?? false,
        qIds: created.q_ids || insertedQuestionIds,
        created_by: created.created_by || authorEmail
      });
    }

    await logTeacherActivity('Import Đề thi & Câu hỏi', 'Đề thi & Câu hỏi', `${examName} (${insertedQuestionIds.length} câu)`, '', `Môn: ${cat || ''} / ${subcat || ''}`);

    if ($('flt-cat')) {
      $('flt-cat').value = cat || '';
      if (typeof window.updateFltSubcat === 'function') {
        window.updateFltSubcat();
      }
      if ($('flt-subcat') && subcat) {
        $('flt-subcat').value = subcat;
      }
    }
    if ($('q-search')) $('q-search').value = '';
    window.qPage = 1;

    renderQuestions();
    renderExams();
    if (typeof window.renderPracticeExams === 'function') {
      window.renderPracticeExams();
    }
    populateExamSelect();
    if (typeof window.populateCohortExams === 'function') {
      window.populateCohortExams();
    }

    closePdfImportModal();
    showToast('success', 'Nhập Đề PDF', `Đã lưu thành công ${insertedQuestionIds.length} câu hỏi vào Ngân hàng câu hỏi!`);
    alert(`✅ Thành công!\nĐã lưu ${insertedQuestionIds.length} câu hỏi vào Ngân hàng câu hỏi và tạo Đề thi: "${examName}".\nHệ thống đã tự động chuyển bạn đến mục Ngân Hàng Câu Hỏi để kiểm tra.`);

    if (typeof window.switchTTab === 'function') {
      window.switchTTab('q');
    }
  } catch (error) {
    console.error("Lỗi khi lưu đề thi từ PDF:", error);
    alert("❌ Lỗi khi lưu: " + (error.message || "Kiểm tra Console để biết chi tiết."));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '💾 Lưu Ngân Hàng & Tạo Đề Thi';
    }
  }
}
