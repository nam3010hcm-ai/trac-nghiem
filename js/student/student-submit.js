/**
 * MODULE STUDENT SUBMIT & RESULTS (js/student/student-submit.js)
 * Chấm điểm bài thi, lưu kết quả vào Supabase và hiển thị màn hình Review
 */
import { $, esc, renderRich, typesetMath, isCorrect, formatAnswer } from '../common.js';
import { saveResult } from '../results.js';
import { recordStudyTime } from '../auth-logs.js';
import { qState, clearPersist, showScreen } from './student-exam.js';

export async function finishExam() {
  if (!confirm('Bạn có chắc chắn muốn kết thúc và nộp bài thi?')) return;
  clearInterval(qState.timer);

  const { exam, student, qs, answers, parts } = qState;

  let cor = 0;
  let autoScore = 0;
  let totalMaxScore = 0;
  let hasPartWeight = false;

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
    totalMaxScore = 10;
    objQuestions.forEach((q) => {
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
  recordStudyTime(student.id, student.name, student.class_name, elapsed, Math.round(score * 10));
  clearPersist();

  $('r-name').innerHTML = `
    <div style="font-size: 15px; font-weight: 500; line-height: 1.6; color: #334155; margin-top: 8px;">
        Mã HV: <b style="color: #0f172a;">${student.id}</b> • Lớp: <b>${student.class_name || ''}</b><br>
        Họ tên: <b style="color: #0f172a;">${student.name}</b><br>
        Phân loại: <b style="color: ${qState.mode === 'exam' ? '#dc2626' : '#2563eb'};">${qState.mode === 'exam' ? `Ca thi: ${student.cohort || 'Thi chính thức'}` : 'Ôn Thi & Luyện Tập'}</b>
    </div>`;
  $('r-score').textContent = score; 
  
  const lbl = document.querySelector('.score-lbl');
  if (lbl) lbl.textContent = `điểm / ${totalMaxScore}`;

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
