/**
 * MODULE LEARN READING EVALUATION (js/learn/learn-reading-eval.js)
 * Chấm điểm tương tác các dạng bài tập đọc hiểu: Group MCQ, Scanning, Matching, True/False, Summary, Sequencing
 */
import { playSuccessSound, playWrongSound, addXP } from './learn-common.js';

if (typeof window !== 'undefined') {
  window.togglePreReadingHint = function(exIdx) {
    const box = document.getElementById(`preread-hint-box-${exIdx}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
  };

  window.checkReadGroupMCQ = function(exIdx, qIdx, chosenIdx, correctIdx) {
    const fb = document.getElementById(`read-g-fb-${exIdx}-${qIdx}`);
    const btn = document.getElementById(`read-g-opt-${exIdx}-${qIdx}-${chosenIdx}`);
    if (!fb || !btn) return;
    document.querySelectorAll(`[id^="read-g-opt-${exIdx}-${qIdx}-"]`).forEach(b => (b.disabled = true));
    if (chosenIdx === correctIdx) {
      btn.classList.add('correct');
      fb.className = 'fb fb-ok';
      fb.innerHTML = '🎉 <b>Chính xác!</b>';
      fb.style.display = 'block';
      playSuccessSound();
      addXP(15, 'Đọc hiểu đúng');
    } else {
      btn.classList.add('wrong');
      const correctBtn = document.getElementById(`read-g-opt-${exIdx}-${qIdx}-${correctIdx}`);
      if (correctBtn) correctBtn.classList.add('correct');
      fb.className = 'fb fb-bad';
      fb.innerHTML = '❌ <b>Chưa đúng.</b>';
      fb.style.display = 'block';
      playWrongSound();
    }
  };

  window.checkScanningTable = function(exIdx) {
    const inputs = document.querySelectorAll(`[id^="scan-inp-${exIdx}-"]`);
    const fb = document.getElementById(`scan-fb-${exIdx}`);
    if (!inputs.length || !fb) return;
    let correctCount = 0;
    inputs.forEach((input, rIdx) => {
      const status = document.getElementById(`scan-status-${exIdx}-${rIdx}`);
      const row = document.getElementById(`scan-row-${exIdx}-${rIdx}`);
      const userVal = (input.value || '').trim().toLowerCase();
      if (userVal.length >= 2) {
        correctCount++;
        if (row) row.className = 'scanning-row correct';
        if (status) status.innerHTML = '<span style="color:#16a34a;font-weight:700;font-size:12px">✅ Đúng</span>';
      } else {
        if (row) row.className = 'scanning-row wrong';
        if (status) status.innerHTML = '<span style="color:#dc2626;font-weight:700;font-size:12px">❌ Chưa đúng</span>';
      }
    });
    fb.style.display = 'block';
    if (correctCount === inputs.length) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Xuất sắc!</b> Đúng thông tin Scanning (${correctCount}/${inputs.length}).`;
      playSuccessSound();
      addXP(25, 'Hoàn thành Scanning');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `📊 Kết quả: Đúng ${correctCount}/${inputs.length} mục.`;
      playWrongSound();
    }
  };

  window.revealScanningAnswers = function(exIdx) {
    const inputs = document.querySelectorAll(`[id^="scan-inp-${exIdx}-"]`);
    inputs.forEach((input, rIdx) => {
      const status = document.getElementById(`scan-status-${exIdx}-${rIdx}`);
      const row = document.getElementById(`scan-row-${exIdx}-${rIdx}`);
      if (input && !input.value) input.value = 'Specific Info';
      if (row) row.className = 'scanning-row correct';
      if (status) status.innerHTML = '<span style="color:#059669;font-weight:700;font-size:12px">🔑 Chuẩn</span>';
    });
  };

  window.checkReadTrueFalse = function(exIdx, itemIdx, userChoice, correctChoice) {
    const btnT = document.getElementById(`tf-btn-t-${exIdx}-${itemIdx}`);
    const btnF = document.getElementById(`tf-btn-f-${exIdx}-${itemIdx}`);
    const expBox = document.getElementById(`tf-explain-${exIdx}-${itemIdx}`);
    if (!btnT || !btnF) return;
    btnT.classList.remove('selected');
    btnF.classList.remove('selected');
    if (userChoice === true) btnT.classList.add('selected');
    else btnF.classList.add('selected');
    btnT.disabled = true;
    btnF.disabled = true;
    if (expBox) {
      expBox.style.display = 'block';
      if (userChoice === correctChoice) {
        expBox.style.background = '#f0fdf4';
        expBox.style.color = '#15803d';
        expBox.innerHTML = `✅ <b>Chính xác!</b>`;
        playSuccessSound();
        addXP(10, 'True/False đúng');
      } else {
        expBox.style.background = '#fef2f2';
        expBox.style.color = '#b91c1c';
        expBox.innerHTML = `❌ <b>Chưa đúng!</b>`;
        playWrongSound();
      }
    }
  };

  window.checkReadingSummaryCloze = function(exIdx) {
    const selects = document.querySelectorAll(`[id^="sum-sel-${exIdx}-"]`);
    const fb = document.getElementById(`sum-fb-${exIdx}`);
    if (!selects.length || !fb) return;
    let correctCount = 0;
    selects.forEach(sel => {
      const userVal = (sel.value || '').trim().toLowerCase();
      const correctVal = (sel.dataset.correct || '').trim().toLowerCase();
      if (userVal && userVal === correctVal) {
        correctCount++;
        sel.className = 'summary-select correct';
      } else if (userVal) {
        sel.className = 'summary-select wrong';
      }
    });
    fb.style.display = 'block';
    if (correctCount === selects.length) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Tuyệt vời!</b> Điền đúng ${correctCount}/${selects.length} từ khóa.`;
      playSuccessSound();
      addXP(30, 'Tóm tắt bài đọc');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `⚠️ <b>Kết quả:</b> Đúng ${correctCount}/${selects.length} từ.`;
      playWrongSound();
    }
  };

  window.checkReadingSequencing = function(exIdx) {
    const selects = document.querySelectorAll(`[id^="seq-sel-${exIdx}-"]`);
    const fb = document.getElementById(`seq-fb-${exIdx}`);
    if (!selects.length || !fb) return;
    let correctCount = 0;
    selects.forEach(sel => {
      const userVal = (sel.value || '').trim();
      const correctVal = (sel.dataset.correct || '').trim();
      if (userVal && userVal === correctVal) {
        correctCount++;
        sel.style.borderColor = '#16a34a';
      } else if (userVal) {
        sel.style.borderColor = '#ef4444';
      }
    });
    fb.style.display = 'block';
    if (correctCount === selects.length) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Hoàn hảo!</b> Sắp xếp đúng 100% dòng thời gian.`;
      playSuccessSound();
      addXP(25, 'Sắp xếp trình tự đúng');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `⚠️ <b>Kết quả:</b> Đúng ${correctCount}/${selects.length} sự kiện.`;
      playWrongSound();
    }
  };

  window.checkReadingMatching = function(exIdx) {
    const selects = document.querySelectorAll(`[id^="read-match-sel-${exIdx}-"]`);
    const fb = document.getElementById(`read-match-fb-${exIdx}`);
    if (!selects.length || !fb) return;
    let correctCount = 0;
    selects.forEach((sel, i) => {
      const row = document.getElementById(`read-match-row-${exIdx}-${i}`);
      const userVal = (sel.value || '').trim().toLowerCase();
      const correctVal = (sel.dataset.correct || '').trim().toLowerCase();
      if (userVal && userVal === correctVal) {
        correctCount++;
        if (row) row.className = 'matching-row correct';
      } else if (userVal) {
        if (row) row.className = 'matching-row wrong';
      }
    });
    fb.style.display = 'block';
    if (correctCount === selects.length) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Hoàn hảo!</b> Nối đúng ${correctCount}/${selects.length} cặp từ.`;
      playSuccessSound();
      addXP(25, 'Nối từ đọc hiểu đúng');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `⚠️ <b>Kết quả:</b> Đúng ${correctCount}/${selects.length} cặp.`;
      playWrongSound();
    }
  };

  window.checkReadMCQ = function(exIdx, chosenIdx, correctIdx) {
    const fb = document.getElementById(`read-fb-${exIdx}`);
    const btn = document.getElementById(`read-opt-${exIdx}-${chosenIdx}`);
    if (!fb || !btn) return;
    document.querySelectorAll(`[id^="read-opt-${exIdx}-"]`).forEach(b => (b.disabled = true));
    if (chosenIdx === correctIdx) {
      btn.classList.add('correct');
      fb.className = 'fb fb-ok';
      fb.innerHTML = '🎉 <b>Chính xác!</b>';
      fb.style.display = 'block';
      playSuccessSound();
      addXP(15, 'Đọc hiểu đúng');
    } else {
      btn.classList.add('wrong');
      const correctBtn = document.getElementById(`read-opt-${exIdx}-${correctIdx}`);
      if (correctBtn) correctBtn.classList.add('correct');
      fb.className = 'fb fb-bad';
      fb.innerHTML = '❌ <b>Chưa đúng.</b>';
      fb.style.display = 'block';
      playWrongSound();
    }
  };

  window.checkReadTFNG = function(exIdx, itemIdx, userChoice, correctChoice, evidence) {
    const btnT = document.getElementById(`tfng-btn-t-${exIdx}-${itemIdx}`);
    const btnF = document.getElementById(`tfng-btn-f-${exIdx}-${itemIdx}`);
    const btnNG = document.getElementById(`tfng-btn-ng-${exIdx}-${itemIdx}`);
    const expBox = document.getElementById(`tfng-explain-${exIdx}-${itemIdx}`);
    if (!btnT || !btnF || !btnNG) return;

    btnT.disabled = true;
    btnF.disabled = true;
    btnNG.disabled = true;

    const chosenBtn = userChoice === 'T' ? btnT : (userChoice === 'F' ? btnF : btnNG);
    chosenBtn.classList.add('selected');

    if (expBox) {
      expBox.style.display = 'block';
      const isCorrect = userChoice.toUpperCase() === (correctChoice || 'T').toUpperCase();
      if (isCorrect) {
        expBox.style.background = '#f0fdf4';
        expBox.style.color = '#15803d';
        expBox.innerHTML = `✅ <b>Chính xác!</b> ${evidence ? `<div style="font-size:12px;margin-top:2px;">📌 ${evidence}</div>` : ''}`;
        playSuccessSound();
        addXP(15, 'T/F/NG đúng');
      } else {
        expBox.style.background = '#fef2f2';
        expBox.style.color = '#b91c1c';
        expBox.innerHTML = `❌ <b>Chưa đúng!</b> Đáp án chuẩn: <b>${correctChoice}</b>. ${evidence ? `<div style="font-size:12px;margin-top:2px;">📌 ${evidence}</div>` : ''}`;
        playWrongSound();
      }
    }
  };

  window.checkReadSpellingItem = function(exIdx, itIdx, targetWord) {
    const input = document.getElementById(`read-sp-ans-${exIdx}-${itIdx}`);
    const fb = document.getElementById(`read-sp-fb-${exIdx}-${itIdx}`);
    if (!input || !fb) return;

    const userVal = (input.value || '').trim().toUpperCase();
    const correctVal = (targetWord || '').trim().toUpperCase();

    fb.style.display = 'block';
    if (userVal === correctVal) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Chính xác!</b> Chúc mừng bạn đã xếp đúng từ: <b>${correctVal}</b>`;
      input.disabled = true;
      playSuccessSound();
      addXP(15, 'Xếp từ vựng đọc hiểu');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `❌ <b>Chưa chính xác!</b> Hãy thử sắp xếp lại các chữ cái.`;
      playWrongSound();
    }
  };
}
