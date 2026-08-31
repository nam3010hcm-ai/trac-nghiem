/**
 * MODULE LEARN SPELLING GAME (js/learn/learn-spelling-game.js)
 * Trò chơi giải đố xếp chữ cái ngược (Backward Spelling Game)
 */
import { esc } from '../common.js';
import { currentUnit, getUnitSkillObj, safeArray, playSuccessSound, playWrongSound, addXP } from './learn-common.js';
import { speakVocab } from './learn-reading-engine.js';

export function renderLfSpellingView() {
  const langObj = getUnitSkillObj(currentUnit, 'languageFocus') || currentUnit?.languageFocus || currentUnit?.language_focus || {};
  let puzzles = safeArray(langObj?.backwardSpelling, []);
  
  if (!puzzles.length) {
    puzzles = [
      {
        id: 'sp_def_1',
        targetWord: 'PROPAGANDA',
        scrambled: 'ADNAGAPORP',
        clue: 'This includes ideas or statements that may be false or present only one side of an argument that are used in order to gain support for a political leader, party, etc.',
        hint: '10 chữ cái • Bắt đầu bằng chữ P • Nghĩa: Tuyên truyền'
      },
      {
        id: 'sp_def_2',
        targetWord: 'ESTABLISH',
        scrambled: 'HSILBATSE',
        clue: 'This means to start or create an organization, a system, or a relationship.',
        hint: '9 chữ cái • Bắt đầu bằng chữ E • Nghĩa: Thành lập, thiết lập'
      }
    ];
  }

  return `
    <div style="display:flex;flex-direction:column;gap:18px;max-width:780px;margin:0 auto">
      <div style="background:#ffffff;padding:16px 20px;border-radius:14px;border:1.5px solid #e2e8f0;box-shadow:0 2px 10px rgba(0,0,0,0.03);">
        <div style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:4px;">
          🔤 Exercise 3. Backward Spelling & Word Puzzle
        </div>
        <div style="font-size:13px;color:#64748b;margin-bottom:8px;">
          Sắp xếp các chữ cái ngược / xáo trộn để tạo thành từ vựng tiếng Anh chính xác:
        </div>
      </div>

      ${puzzles.map((pz, idx) => {
        const target = (pz.targetWord || '').toUpperCase().trim();
        const chars = target.split('');
        const scrambledChars = (pz.scrambled ? pz.scrambled.toUpperCase().split('') : [...chars].sort(() => Math.random() - 0.5));
        const shuffledTiles = scrambledChars.map((c, i) => ({ id: i, char: c }));

        return `
          <div class="spelling-puzzle-card" style="margin:0;padding:20px;background:#ffffff;border-radius:14px;border:1.5px solid #e2e8f0;box-shadow:0 2px 10px rgba(0,0,0,0.03);" id="lf-spelling-card-${idx}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
              <span style="font-weight:800;font-size:13px;background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:6px;">
                Từ vựng #${idx + 1}
              </span>
              ${pz.scrambled ? `
                <div style="font-size:12px;font-weight:700;color:#64748b;">
                  Ký tự đảo: <code style="background:#f1f5f9;color:#0f172a;padding:2px 6px;border-radius:4px;letter-spacing:1.5px;">${esc(pz.scrambled)}</code>
                </div>
              ` : ''}
            </div>

            <div style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:6px;line-height:1.45;">
              💡 Định nghĩa/Gợi ý: <span style="color:#0369a1">${esc(pz.clue || '')}</span>
            </div>
            ${pz.hint ? `<div style="font-size:12.5px;color:#64748b;margin-bottom:12px;">🔑 <i>${esc(pz.hint)}</i></div>` : ''}

            <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;text-align:center;">Chữ cái bạn đã xếp:</div>
            <div class="spelling-assembled-row" id="lf-spelling-assembled-${idx}">
              <span style="color:#94a3b8;font-size:13px" id="lf-spelling-ph-${idx}">(Bấm các ô chữ cái bên dưới để ghép từ)</span>
            </div>

            <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;text-align:center;">Ngân hàng chữ cái:</div>
            <div class="spelling-tiles-container" id="lf-spelling-pool-${idx}">
              ${shuffledTiles.map(tile => `
                <button type="button" class="spelling-char-tile" id="lf-sp-tile-${idx}-${tile.id}" onclick="window.placeLfSpellingTile(${idx}, ${tile.id}, '${tile.char}')">${tile.char}</button>
              `).join('')}
            </div>

            <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
              <button type="button" class="btn btn-p" onclick="window.checkLfSpellingPuzzle(${idx}, '${target}')">✅ Kiểm tra từ vựng</button>
              <button type="button" class="btn btn-sm" onclick="window.resetLfSpellingPuzzle(${idx})" style="background:#f8fafc;border:1px solid #cbd5e1;color:#475569;">🔄 Xếp lại</button>
              <button type="button" class="btn btn-sm" onclick="window.speakVocab('${target}')" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;">🔊 Nghe phát âm</button>
            </div>
            <div id="lf-spelling-fb-${idx}" class="fb" style="display:none;margin-top:12px;"></div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Window global bindings
if (typeof window !== 'undefined') {
  window.placeLfSpellingTile = function(pIdx, tileId, char) {
    const tile = document.getElementById(`lf-sp-tile-${pIdx}-${tileId}`);
    const assembled = document.getElementById(`lf-spelling-assembled-${pIdx}`);
    const placeholder = document.getElementById(`lf-spelling-ph-${pIdx}`);
    if (!tile || !assembled) return;
    if (placeholder) placeholder.style.display = 'none';
    tile.style.display = 'none';

    const placed = document.createElement('button');
    placed.type = 'button';
    placed.className = 'spelling-placed-tile';
    placed.textContent = char;
    placed.title = 'Bấm để xóa chữ cái này';
    placed.onclick = function() {
      placed.remove();
      tile.style.display = 'inline-flex';
      if (!assembled.querySelector('.spelling-placed-tile') && placeholder) {
        placeholder.style.display = 'inline';
      }
    };
    assembled.appendChild(placed);
  };

  window.checkLfSpellingPuzzle = function(pIdx, targetWord) {
    const assembled = document.getElementById(`lf-spelling-assembled-${pIdx}`);
    const fb = document.getElementById(`lf-spelling-fb-${pIdx}`);
    if (!assembled || !fb) return;

    const placedTiles = assembled.querySelectorAll('.spelling-placed-tile');
    const userWord = Array.from(placedTiles).map(t => t.textContent.trim()).join('').toUpperCase();

    fb.style.display = 'block';
    if (userWord === targetWord.toUpperCase()) {
      fb.className = 'fb fb-ok';
      fb.innerHTML = `🎉 <b>Chính xác!</b> Từ vựng đúng là: <strong style="font-size:15px;color:#15803d;">${targetWord}</strong>.`;
      playSuccessSound();
      addXP(15, 'Ghép từ Backward Spelling đúng');
    } else {
      fb.className = 'fb fb-bad';
      fb.innerHTML = `❌ <b>Chưa đúng:</b> Từ bạn ghép là "<b>${userWord || '(trống)'}</b>". Hãy thử xếp lại nhé!`;
      playWrongSound();
    }
  };

  window.resetLfSpellingPuzzle = function(pIdx) {
    const assembled = document.getElementById(`lf-spelling-assembled-${pIdx}`);
    const pool = document.getElementById(`lf-spelling-pool-${pIdx}`);
    const fb = document.getElementById(`lf-spelling-fb-${pIdx}`);
    const placeholder = document.getElementById(`lf-spelling-ph-${pIdx}`);
    if (assembled) {
      assembled.querySelectorAll('.spelling-placed-tile').forEach(t => t.remove());
      if (placeholder) placeholder.style.display = 'inline';
    }
    if (pool) {
      pool.querySelectorAll('.spelling-char-tile').forEach(t => t.style.display = 'inline-flex');
    }
    if (fb) fb.style.display = 'none';
  };
}
