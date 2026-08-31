/**
 * MODULE LEARN PAST VERBS (js/learn/learn-past-verbs.js)
 * Bảng tra cứu & thực hành điền Động từ Quá khứ bất quy tắc (Past Simple Form V2)
 */
import { esc } from '../common.js';
import { playSuccessSound, playWrongSound, addXP } from './learn-common.js';

export function renderPastFormVerbsView(verbs) {
  if (!verbs || !verbs.length) return '<div class="empty">Chưa có bảng động từ quá khứ trong Unit này.</div>';

  return `
    <div class="past-form-table-wrap" style="max-width:800px;margin:0 auto">
      <div style="padding:16px 20px;background:#f8fafc;border-bottom:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:800;font-size:16px;color:#1e293b">📝 Exercise 1. Fill in the Past Form</div>
          <div style="font-size:12.5px;color:#64748b">Gõ dạng Quá khứ đơn (Past Simple V2) cho mỗi động từ:</div>
        </div>
        <button class="btn btn-p" onclick="window.checkAllPastFormVerbs()">✅ Kiểm tra toàn bảng</button>
      </div>

      <table class="past-form-table">
        <thead>
          <tr>
            <th style="width:50px;text-align:center">#</th>
            <th>Động từ nguyên thể (Infinitive)</th>
            <th>Dạng quá khứ (Past Form V2)</th>
            <th>Nghĩa tiếng Việt</th>
          </tr>
        </thead>
        <tbody>
          ${verbs.map((v, idx) => `
            <tr id="verb-row-${idx}">
              <td style="text-align:center;font-weight:800;color:#6366f1">${idx + 1}</td>
              <td style="font-weight:700;color:#1e293b;font-size:15px"><b>${esc(v.infinitive || '')}</b></td>
              <td>
                <input type="text" class="verb-input-cell" id="verb-inp-${idx}" data-correct="${esc(v.past || '')}" placeholder="Nhập dạng V2...">
              </td>
              <td style="color:#475569;font-size:13.5px">${esc(v.meaning || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="padding:16px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <button class="btn btn-p" onclick="window.checkAllPastFormVerbs()">✅ Kiểm tra toàn bảng</button>
        <div id="verbs-table-fb" class="fb" style="display:none;margin:0"></div>
      </div>
    </div>
  `;
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.checkAllPastFormVerbs = function() {
    const inputs = document.querySelectorAll('[id^="verb-inp-"]');
    const fb = document.getElementById('verbs-table-fb');
    if (!inputs.length || !fb) return;

    let correctCount = 0;
    inputs.forEach((inp) => {
      const val = inp.value.trim().toLowerCase();
      const correct = (inp.dataset.correct || '').trim().toLowerCase();
      if (val && val === correct) {
        inp.className = 'verb-input-cell correct';
        correctCount++;
      } else {
        inp.className = 'verb-input-cell wrong';
      }
    });

    fb.style.display = 'block';
    if (correctCount === inputs.length) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Hoàn hảo!</b> Bạn đã điền chính xác toàn bộ ${correctCount}/${inputs.length} động từ thì quá khứ.`;
      playSuccessSound();
      addXP(25, 'Điền đúng bảng động từ quá khứ');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `⚠️ <b>Kết quả:</b> Bạn đã điền đúng ${correctCount}/${inputs.length} động từ. Hãy xem các ô màu đỏ để sửa lại nhé!`;
      playWrongSound();
    }
  };
}
