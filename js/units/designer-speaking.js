/**
 * MODULE DESIGNER SPEAKING (js/units/designer-speaking.js)
 * Studio biên soạn Kỹ năng Speaking tương tác: Video Roleplay đa nhân vật, Luyện phát âm câu đơn & Phỏng vấn phản xạ
 */
import { esc } from '../common.js';

export function renderSpeakingDesigner(unit = {}) {
  const speakingList = Array.isArray(unit.speaking) ? unit.speaking : [];
  const s1 = speakingList[0] || {};
  const isRoleplay = s1.type === 'video_roleplay' || Boolean(s1.characterA && s1.characterB) || Boolean(s1.characters && s1.characters.length) || Boolean(s1.dialogue && s1.dialogue.length);

  const characters = s1.characters || [
    s1.characterA || { code: 'A', id: 'A', name: 'Emma (Lễ tân khách sạn)', avatar: '👩‍💼', roleTitle: 'Hotel Receptionist', color: '#2563eb', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    s1.characterB || { code: 'B', id: 'B', name: 'David (Du khách check-in)', avatar: '🧑‍🦱', roleTitle: 'Guest / Traveler', color: '#059669', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' }
  ];

  const dialogue = s1.dialogue || [
    {
      id: 'dlg_1',
      speaker: 'A',
      speakerName: 'Emma (Lễ tân)',
      text: 'Good morning! Welcome to Grand Palace Hotel. How may I help you today?',
      ipa: '/ɡʊd ˈmɔː.nɪŋ! ˈwel.kəm tuː ɡrænd ˈpæl.ɪs həʊˈtel. haʊ meɪ aɪ help juː təˈdeɪ?/',
      meaning: 'Chào buổi sáng! Chào mừng quý khách đến khách sạn Grand Palace. Tôi có thể giúp gì cho quý khách?',
      tip: 'Nhấn trọng âm rõ ràng ở "morning", "welcome", "Palace Hotel". Nối âm nhẹ giữa "help" và "you".',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    },
    {
      id: 'dlg_2',
      speaker: 'B',
      speakerName: 'David (Du khách)',
      text: 'Hi! I have a reservation under the name David Miller for two nights.',
      ipa: '/haɪ! aɪ hæv ə ˌrez.əˈveɪ.ʃən ˈʌn.dər ðə neɪm ˈdeɪ.vɪd ˈmɪl.ər fɔːr tuː naɪts/',
      meaning: 'Chào bạn! Tôi có đặt phòng trước dưới tên David Miller cho hai đêm.',
      tip: 'Phát âm chuẩn âm đuôi /ts/ trong "nights" và trọng âm chính trong /ˌrez.əˈveɪ.ʃən/.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    }
  ];

  const phrases = (s1.phrases && s1.phrases.length) ? s1.phrases : (speakingList.find(s => s.type === 'phrases')?.phrases || [
    {
      text: 'It goes without saying that practice makes perfect.',
      ipa: '/ɪt ɡəʊz wɪðˈaʊt ˈseɪ.ɪŋ ðæt ˈpræk.tɪs meɪks ˈpɜː.fɪkt/',
      meaning: 'Dĩ nhiên là rèn luyện nhiều sẽ tạo nên sự hoàn hảo.',
      tip: 'Chú ý nối âm "goes-without", phát âm chuẩn âm /s/ trong "practice" và "makes".',
      image: ''
    },
    {
      text: 'Could you please give me a hand with this suitcase?',
      ipa: '/kʊd juː pliːz ɡɪv miː ə hænd wɪð ðɪs ˈsuːt.keɪs/',
      meaning: 'Bạn có thể giúp tôi một tay với chiếc vali này được không?',
      tip: 'Cụm "give me a hand" nghĩa là giúp đỡ. Giữ ngữ điệu lên giọng nhẹ ở cuối câu hỏi Yes/No.',
      image: ''
    }
  ]);

  return `
    <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:18px; margin-bottom:16px;">
      <!-- TOOLBAR HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px; border-bottom:1.5px solid #e2e8f0; padding-bottom:12px;">
        <div>
          <div style="font-weight:800; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
            <span>🗣️ Phân Hệ Luyện Nói & Video Roleplay (Speaking Studio)</span>
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">
            Biên soạn kịch bản Video Roleplay đóng vai hội thoại đa chiều, câu luyện phát âm Web Speech AI & phản xạ giao tiếp.
          </div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn btn-sm" onclick="window.loadSampleSpeakingLesson()" style="background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; font-weight:700;">
            ✨ Nạp kịch bản mẫu chuẩn
          </button>
          <button type="button" class="btn btn-sm btn-danger" onclick="window.clearAllSpeakingLessons()" style="font-weight:700;">
            🗑️ Xóa hết
          </button>
        </div>
      </div>

      <!-- COMMON LESSON INFO -->
      <div class="card" style="margin:0 0 16px 0; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
        <div class="grid2" style="margin-bottom:10px;">
          <div class="fg" style="margin:0;">
            <label style="font-size:12px; font-weight:700;">Tiêu đề bài luyện nói *</label>
            <input type="text" id="ud-spk-lesson-title" value="${esc(s1.title || '🎬 Video Roleplay: Hotel Check-in & Inquiry')}" placeholder="VD: 🎬 Video Roleplay: Hotel Check-in">
          </div>
          <div class="fg" style="margin:0;">
            <label style="font-size:12px;">Chủ đề giao tiếp (Topic)</label>
            <input type="text" id="ud-spk-lesson-topic" value="${esc(s1.topic || 'Travel & Hospitality')}" placeholder="VD: Daily Conversation / Business Meeting">
          </div>
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:12px;">Mô tả mục tiêu / Tình huống hội thoại</label>
          <input type="text" id="ud-spk-lesson-desc" value="${esc(s1.description || 'Mô phỏng hội thoại video tương tác đóng vai nhân vật để luyện phát âm và phản xạ.')}" placeholder="Tóm tắt tình huống giao tiếp...">
        </div>
      </div>

      <!-- SECTION 1: CHARACTERS SETUP -->
      <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:800; font-size:13.5px; color:#1e40af; display:flex; align-items:center; gap:6px;">
            <span>👥 Thiết Lập Nhân Vật Đóng Vai (Roleplay Characters)</span>
            <span id="badge-spk-chars" style="background:#eff6ff; color:#1d4ed8; font-size:11.5px; padding:2px 8px; border-radius:6px; font-weight:700;">${characters.length} nhân vật</span>
          </div>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addSpeakingCharacter()" style="font-size:11.5px; padding:3px 8px; font-weight:700;">➕ Thêm Nhân Vật Mới</button>
        </div>

        <div id="ud-spk-characters-container" style="display:flex; flex-direction:column; gap:10px;">
          ${characters.map((c, cIdx) => renderCharacterCard(c, cIdx)).join('')}
        </div>
      </div>

      <!-- SECTION 2: DIALOGUE TURNS SCRIPT -->
      <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-weight:800; font-size:13.5px; color:#0f766e; display:flex; align-items:center; gap:6px;">
              <span>🎬 Kịch Bản Lời Thoại Từng Lượt (Dialogue Script)</span>
              <span id="badge-spk-turns" style="background:#f0fdfa; color:#0f766e; font-size:11.5px; padding:2px 8px; border-radius:6px; font-weight:700;">${dialogue.length} lượt thoại</span>
            </div>
            <div style="font-size:11.5px; color:#64748b; margin-top:2px;">
              Từng câu thoại sẽ tự động phát video/audio tương ứng hoặc phát âm qua Web Speech AI.
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm" onclick="window.toggleSpeakingDialogueQuickPaste()" style="font-size:11.5px; padding:3px 8px; background:#f0fdfa; border:1px solid #99f6e4; color:#0f766e; font-weight:700;">⚡ Dán nhanh kịch bản</button>
            <button type="button" class="btn btn-sm btn-p" onclick="window.addSpeakingDialogueTurn()" style="font-size:11.5px; padding:3px 8px; font-weight:700;">➕ Thêm lượt thoại</button>
          </div>
        </div>

        <!-- QUICK PASTE DRAWER -->
        <div id="ud-spk-quick-drawer" style="display:none; background:#f8fafc; border:1.5px dashed #14b8a6; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="font-size:12px; font-weight:700; color:#0f766e; margin-bottom:4px;">📥 Nhập hoặc dán kịch bản thoại (Định dạng: A: Câu thoại tiếng Anh - /IPA/ - Nghĩa tiếng Việt):</div>
          <textarea id="ud-spk-quick-input" placeholder="VD:&#10;A: Good morning! Welcome to our hotel. - /ɡʊd ˈmɔː.nɪŋ/ - Chào buổi sáng!&#10;B: Hi, I have a reservation. - /haɪ aɪ hæv/ - Tôi có đặt phòng." style="width:100%; min-height:80px; font-size:12px; font-family:monospace; margin-bottom:6px;"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button type="button" class="btn btn-sm" onclick="window.toggleSpeakingDialogueQuickPaste()">Đóng</button>
            <button type="button" class="btn btn-sm btn-p" onclick="window.processSpeakingDialogueQuickPaste()">⚡ Chuyển đổi & Nạp vào kịch bản</button>
          </div>
        </div>

        <!-- DIALOGUE LIST -->
        <div id="ud-spk-dialogue-container" style="display:flex; flex-direction:column; gap:10px;">
          ${dialogue.map((d, dIdx) => renderDialogueTurnCard(d, dIdx, characters)).join('')}
        </div>
      </div>

      <!-- SECTION 3: PRONUNCIATION PHRASES & IDIOMS -->
      <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-weight:800; font-size:13.5px; color:#be123c; display:flex; align-items:center; gap:6px;">
              <span>🗣️ Câu Luyện Phát Âm & Thành Ngữ Trọng Tâm (Pronunciation Phrases)</span>
              <span id="badge-spk-phrases" style="background:#fff1f2; color:#be123c; font-size:11.5px; padding:2px 8px; border-radius:6px; font-weight:700;">${phrases.length} câu</span>
            </div>
            <div style="font-size:11.5px; color:#64748b; margin-top:2px;">
              Học viên bấm micro để nói, hệ thống Web Speech AI nhận diện và chấm điểm phát âm trực tiếp.
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-p" onclick="window.addSpeakingPhraseRow()" style="font-size:11.5px; padding:3px 8px; font-weight:700; background:#e11d48; border-color:#e11d48;">➕ Thêm câu mới</button>
        </div>

        <div id="ud-spk-phrases-container" style="display:flex; flex-direction:column; gap:10px;">
          ${phrases.map((p, pIdx) => renderPhraseCard(p, pIdx)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCharacterCard(c = {}, cIdx = 0) {
  const code = c.code || String.fromCharCode(65 + cIdx);
  const color = c.color || (cIdx === 0 ? '#2563eb' : (cIdx === 1 ? '#db2777' : '#059669'));

  return `
    <div class="spk-character-card" data-cidx="${cIdx}" style="background:#f8fafc; border:1.5px solid ${color}44; border-radius:8px; padding:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="background:${color}; color:#ffffff; font-size:12px; font-weight:800; padding:2px 8px; border-radius:4px;">Nhân vật ${code}</span>
          <input type="text" class="spk-char-code" value="${esc(code)}" style="display:none;">
        </div>
        <button type="button" class="btn-icon-del" onclick="window.removeSpeakingCharacter(this)" title="Xóa nhân vật này">🗑️</button>
      </div>

      <div class="grid2" style="gap:8px; margin-bottom:6px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:11.5px;">Tên nhân vật *</label>
          <input type="text" class="spk-char-name" value="${esc(c.name || '')}" placeholder="VD: Emma (Lễ tân)" style="font-size:12px;">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11.5px;">Vai trò (Role Title)</label>
          <input type="text" class="spk-char-role" value="${esc(c.roleTitle || '')}" placeholder="VD: Hotel Receptionist" style="font-size:12px;">
        </div>
      </div>

      <div class="grid2" style="gap:8px;">
        <div style="display:flex; gap:6px; align-items:center;">
          <div class="fg" style="margin:0; flex:1;">
            <label style="font-size:11.5px;">Avatar (Icon/Emoji)</label>
            <input type="text" class="spk-char-avatar" value="${esc(c.avatar || '👩‍💼')}" placeholder="VD: 👩‍💼, 👨‍💼, ☕" style="font-size:12px; text-align:center;">
          </div>
          <div class="fg" style="margin:0; flex:1;">
            <label style="font-size:11.5px;">Màu sắc nhận diện</label>
            <input type="color" class="spk-char-color" value="${color}" style="height:36px; padding:2px; border-radius:6px; border:1px solid #cbd5e1; width:100%; cursor:pointer;">
          </div>
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11.5px;">Link Video/Audio nhân vật (tùy chọn)</label>
          <input type="text" class="spk-char-video" value="${esc(c.videoUrl || '')}" placeholder="https://...mp4" style="font-size:12px;">
        </div>
      </div>
    </div>
  `;
}

function renderDialogueTurnCard(d = {}, dIdx = 0, characters = []) {
  const speaker = d.speaker || 'A';
  const charObj = characters.find(c => (c.code || c.id) === speaker) || {};
  const charColor = charObj.color || (speaker === 'A' ? '#2563eb' : (speaker === 'B' ? '#db2777' : '#059669'));

  return `
    <div class="spk-dialogue-card" data-didx="${dIdx}" style="background:#ffffff; border:1.5px solid #cbd5e1; border-left:4px solid ${charColor}; border-radius:8px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11.5px; font-weight:700; color:#64748b;">#${dIdx + 1}</span>
          <select class="spk-dlg-speaker" onchange="this.closest('.spk-dialogue-card').style.borderLeftColor = this.value === 'A' ? '#2563eb' : (this.value === 'B' ? '#db2777' : '#059669');" style="padding:3px 8px; border-radius:6px; font-weight:700; font-size:12px; border:1px solid #cbd5e1;">
            <option value="A" ${speaker === 'A' ? 'selected' : ''}>👤 Nhân vật A</option>
            <option value="B" ${speaker === 'B' ? 'selected' : ''}>👤 Nhân vật B</option>
            <option value="C" ${speaker === 'C' ? 'selected' : ''}>👤 Nhân vật C</option>
          </select>
          <input type="text" class="spk-dlg-speaker-name" value="${esc(d.speakerName || '')}" placeholder="Tên người nói (tùy chọn)" style="font-size:11.5px; width:140px;">
        </div>
        <button type="button" class="btn-icon-del" onclick="window.removeSpeakingDialogueTurn(this)" title="Xóa lượt thoại này">🗑️</button>
      </div>

      <div class="fg" style="margin-bottom:6px;">
        <label style="font-size:11.5px; font-weight:700;">Câu thoại tiếng Anh *</label>
        <input type="text" class="spk-dlg-text" value="${esc(d.text || '')}" placeholder="VD: Good morning! Welcome to our hotel." style="font-size:12.5px; font-weight:600;">
      </div>

      <div class="grid2" style="gap:8px; margin-bottom:6px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Phiên âm IPA</label>
          <input type="text" class="spk-dlg-ipa" value="${esc(d.ipa || '')}" placeholder="VD: /ɡʊd ˈmɔː.nɪŋ/" style="font-size:11.5px; font-family:monospace;">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Dịch nghĩa tiếng Việt *</label>
          <input type="text" class="spk-dlg-meaning" value="${esc(d.meaning || '')}" placeholder="VD: Chào buổi sáng! Chào mừng quý khách." style="font-size:11.5px;">
        </div>
      </div>

      <div class="grid2" style="gap:8px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">🎯 Mẹo phát âm & Ngữ điệu (Pronunciation Tip)</label>
          <input type="text" class="spk-dlg-tip" value="${esc(d.tip || '')}" placeholder="VD: Nhấn trọng âm ở morning, lên giọng ở cuối câu..." style="font-size:11.5px;">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Video/Audio URL riêng cho câu thoại (tùy chọn)</label>
          <input type="text" class="spk-dlg-video" value="${esc(d.videoUrl || '')}" placeholder="https://...mp4" style="font-size:11.5px;">
        </div>
      </div>
    </div>
  `;
}

function renderPhraseCard(p = {}, pIdx = 0) {
  return `
    <div class="spk-phrase-card" data-pidx="${pIdx}" style="background:#ffffff; border:1.5px solid #cbd5e1; border-left:4px solid #e11d48; border-radius:8px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:12px; font-weight:700; color:#e11d48;">Câu #${pIdx + 1}</span>
        <button type="button" class="btn-icon-del" onclick="window.removeSpeakingPhraseRow(this)" title="Xóa câu này">🗑️</button>
      </div>

      <div class="fg" style="margin-bottom:6px;">
        <label style="font-size:11.5px; font-weight:700;">Câu luyện nói tiếng Anh *</label>
        <input type="text" class="spk-phr-text" value="${esc(p.text || '')}" placeholder="VD: It goes without saying that practice makes perfect." style="font-size:12.5px; font-weight:600;">
      </div>

      <div class="grid2" style="gap:8px; margin-bottom:6px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Phiên âm IPA</label>
          <input type="text" class="spk-phr-ipa" value="${esc(p.ipa || '')}" placeholder="VD: /ɪt ɡəʊz wɪðˈaʊt ˈseɪ.ɪŋ/" style="font-size:11.5px; font-family:monospace;">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Dịch nghĩa tiếng Việt</label>
          <input type="text" class="spk-phr-meaning" value="${esc(p.meaning || '')}" placeholder="VD: Dĩ nhiên rèn luyện nhiều sẽ tạo nên sự hoàn hảo." style="font-size:11.5px;">
        </div>
      </div>

      <div class="grid2" style="gap:8px;">
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Mẹo phát âm (Tip)</label>
          <input type="text" class="spk-phr-tip" value="${esc(p.tip || '')}" placeholder="VD: Chú ý nối âm, âm đuôi /s/..." style="font-size:11.5px;">
        </div>
        <div class="fg" style="margin:0;">
          <label style="font-size:11px;">Hình ảnh minh họa URL (tùy chọn)</label>
          <input type="text" class="spk-phr-image" value="${esc(p.image || '')}" placeholder="https://..." style="font-size:11.5px;">
        </div>
      </div>
    </div>
  `;
}

// BÓC TÁCH DỮ LIỆU TỪ DOM LÊN OBJECT STATE
export function extractSpeakingFromDOM(existingSpeaking = []) {
  const lessonTitle = document.getElementById('ud-spk-lesson-title')?.value.trim() || '🎬 Video Roleplay Lesson';
  const lessonTopic = document.getElementById('ud-spk-lesson-topic')?.value.trim() || 'General Conversation';
  const lessonDesc = document.getElementById('ud-spk-lesson-desc')?.value.trim() || '';

  // 1. Characters
  const charCards = document.querySelectorAll('#ud-spk-characters-container .spk-character-card');
  const characters = [];
  charCards.forEach((c, idx) => {
    const code = c.querySelector('.spk-char-code')?.value.trim() || String.fromCharCode(65 + idx);
    const name = c.querySelector('.spk-char-name')?.value.trim() || `Character ${code}`;
    const roleTitle = c.querySelector('.spk-char-role')?.value.trim() || '';
    const avatar = c.querySelector('.spk-char-avatar')?.value.trim() || '👤';
    const color = c.querySelector('.spk-char-color')?.value || '#2563eb';
    const videoUrl = c.querySelector('.spk-char-video')?.value.trim() || '';

    characters.push({ code, id: code, name, roleTitle, avatar, color, videoUrl });
  });

  // 2. Dialogue Turns
  const dlgCards = document.querySelectorAll('#ud-spk-dialogue-container .spk-dialogue-card');
  const dialogue = [];
  dlgCards.forEach((d, idx) => {
    const text = d.querySelector('.spk-dlg-text')?.value.trim() || '';
    if (text) {
      const speaker = d.querySelector('.spk-dlg-speaker')?.value || 'A';
      const speakerName = d.querySelector('.spk-dlg-speaker-name')?.value.trim() || '';
      const ipa = d.querySelector('.spk-dlg-ipa')?.value.trim() || '';
      const meaning = d.querySelector('.spk-dlg-meaning')?.value.trim() || '';
      const tip = d.querySelector('.spk-dlg-tip')?.value.trim() || '';
      const videoUrl = d.querySelector('.spk-dlg-video')?.value.trim() || '';

      dialogue.push({
        id: `dlg_${idx + 1}`,
        speaker,
        speakerName,
        text,
        ipa,
        meaning,
        tip,
        videoUrl
      });
    }
  });

  // 3. Pronunciation Phrases
  const phrCards = document.querySelectorAll('#ud-spk-phrases-container .spk-phrase-card');
  const phrases = [];
  phrCards.forEach(p => {
    const text = p.querySelector('.spk-phr-text')?.value.trim() || '';
    if (text) {
      const ipa = p.querySelector('.spk-phr-ipa')?.value.trim() || '';
      const meaning = p.querySelector('.spk-phr-meaning')?.value.trim() || '';
      const tip = p.querySelector('.spk-phr-tip')?.value.trim() || '';
      const image = p.querySelector('.spk-phr-image')?.value.trim() || '';

      phrases.push({ text, ipa, meaning, tip, image });
    }
  });

  const result = [];

  // Main Roleplay Lesson
  if (dialogue.length || characters.length) {
    const roleplayObj = {
      id: existingSpeaking[0]?.id || `spk_rp_${Date.now()}`,
      type: 'video_roleplay',
      title: lessonTitle,
      topic: lessonTopic,
      description: lessonDesc,
      characters: characters.length ? characters : undefined,
      characterA: characters[0],
      characterB: characters[1],
      dialogue: dialogue,
      phrases: phrases.length ? phrases : undefined
    };
    result.push(roleplayObj);
  }

  // Phrases standalone lesson if needed
  if (phrases.length && (!result.length || !result[0].phrases)) {
    result.push({
      id: `spk_phrases_${Date.now()}`,
      type: 'phrases',
      title: '🗣️ Luyện Phát Âm Câu Đơn & Thành Ngữ',
      topic: lessonTopic,
      phrases: phrases
    });
  }

  return result;
}

// SAMPLE SPEAKING GENERATOR
export function getPedagogicalSampleSpeakingData() {
  return [
    {
      id: 'spk_video_1',
      type: 'video_roleplay',
      title: '🎬 Video Roleplay: Hotel Check-in & Inquiry',
      topic: 'Travel & Hospitality Simulation',
      level: 'A2 - B1',
      description: 'Mô phỏng hội thoại video tương tác giữa Lễ tân khách sạn (Emma) và Du khách (David).',
      characters: [
        {
          code: 'A',
          id: 'A',
          name: 'Emma (Lễ tân khách sạn)',
          avatar: '👩‍💼',
          roleTitle: 'Hotel Receptionist',
          color: '#2563eb',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        {
          code: 'B',
          id: 'B',
          name: 'David (Du khách check-in)',
          avatar: '🧑‍🦱',
          roleTitle: 'Guest / Traveler',
          color: '#059669',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        }
      ],
      characterA: {
        id: 'A',
        name: 'Emma (Lễ tân khách sạn)',
        avatar: '👩‍💼',
        roleTitle: 'Hotel Receptionist',
        color: '#2563eb',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      },
      characterB: {
        id: 'B',
        name: 'David (Du khách check-in)',
        avatar: '🧑‍🦱',
        roleTitle: 'Guest / Traveler',
        color: '#059669',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
      },
      dialogue: [
        {
          id: 'dlg_1',
          speaker: 'A',
          speakerName: 'Emma (Lễ tân)',
          text: 'Good morning! Welcome to Grand Palace Hotel. How may I help you today?',
          ipa: '/ɡʊd ˈmɔː.nɪŋ! ˈwel.kəm tuː ɡrænd ˈpæl.ɪs həʊˈtel. haʊ meɪ aɪ help juː təˈdeɪ?/',
          meaning: 'Chào buổi sáng! Chào mừng quý khách đến khách sạn Grand Palace. Tôi có thể giúp gì cho quý khách?',
          tip: 'Nhấn trọng âm rõ ràng ở "morning", "welcome", "Palace Hotel". Nối âm nhẹ giữa "help" và "you".',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        {
          id: 'dlg_2',
          speaker: 'B',
          speakerName: 'David (Du khách)',
          text: 'Hi! I have a reservation under the name David Miller for two nights.',
          ipa: '/haɪ! aɪ hæv ə ˌrez.əˈveɪ.ʃən ˈʌn.dər ðə neɪm ˈdeɪ.vɪd ˈmɪl.ər fɔːr tuː naɪts/',
          meaning: 'Chào bạn! Tôi có đặt phòng trước dưới tên David Miller cho hai đêm.',
          tip: 'Phát âm chuẩn âm đuôi /ts/ trong "nights" và trọng âm chính trong /ˌrez.əˈveɪ.ʃən/.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        },
        {
          id: 'dlg_3',
          speaker: 'A',
          speakerName: 'Emma (Lễ tân)',
          text: 'Thank you, Mr. Miller. Could you please show me your passport and credit card for verification?',
          ipa: '/θæŋk juː, ˈmɪs.tər ˈmɪl.ər. kʊd juː pliːz ʃəʊ miː jɔːr ˈpɑːs.pɔːt ænd ˈkred.ɪt kɑːd fɔːr ˌver.ɪ.fɪˈkeɪ.ʃən?/',
          meaning: 'Cảm ơn ông Miller. Ông có thể vui lòng xuất trình hộ chiếu và thẻ tín dụng để xác nhận được không ạ?',
          tip: 'Lên giọng ở cuối câu hỏi Yes/No "...for verification?". Chú ý âm /θ/ trong "Thank you".',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        {
          id: 'dlg_4',
          speaker: 'B',
          speakerName: 'David (Du khách)',
          text: 'Sure, here is my passport and card. Does the booking include complimentary breakfast?',
          ipa: '/ʃɔːr, hɪər ɪz maɪ ˈpɑːs.pɔːt ænd kɑːd. dʌz ðə ˈbʊk.ɪŋ ɪnˈkluːd ˌkɒm.plɪˈmen.tər.i ˈbrek.fəst?/',
          meaning: 'Chắc chắn rồi, đây là hộ chiếu và thẻ của tôi. Việc đặt phòng có bao gồm bữa sáng miễn phí không?',
          tip: 'Cụm "complimentary breakfast" mang nghĩa bữa sáng miễn phí kèm theo. Nhấn trọng âm /ˌkɒm.plɪˈmen.tər.i/.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        }
      ],
      phrases: [
        {
          text: 'It goes without saying that practice makes perfect.',
          ipa: '/ɪt ɡəʊz wɪðˈaʊt ˈseɪ.ɪŋ ðæt ˈpræk.tɪs meɪks ˈpɜː.fɪkt/',
          meaning: 'Dĩ nhiên là rèn luyện nhiều sẽ tạo nên sự hoàn hảo.',
          tip: 'Chú ý nối âm "goes-without", phát âm chuẩn âm /s/ trong "practice" và "makes".',
          image: ''
        },
        {
          text: 'Could you please give me a hand with this suitcase?',
          ipa: '/kʊd juː pliːz ɡɪv miː ə hænd wɪð ðɪs ˈsuːt.keɪs/',
          meaning: 'Bạn có thể giúp tôi một tay với chiếc vali này được không?',
          tip: 'Cụm "give me a hand" nghĩa là giúp đỡ. Giữ ngữ điệu lên giọng nhẹ ở cuối câu hỏi Yes/No.',
          image: ''
        }
      ]
    }
  ];
}

// GLOBAL WINDOW HANDLERS FOR TEACHER ACTIONS
if (typeof window !== 'undefined') {
  window.loadSampleSpeakingLesson = function() {
    if (!confirm('Nạp kịch bản Video Roleplay và danh sách phát âm mẫu?')) return;
    const samples = getPedagogicalSampleSpeakingData();
    if (window._currentDraftUnit) {
      window._currentDraftUnit.speaking = samples;
    }
    const contentWrap = document.getElementById('ud-skill-content') || document.getElementById('ud-skill-content-wrap');
    if (contentWrap && window._currentDraftUnit) {
      contentWrap.innerHTML = renderSpeakingDesigner(window._currentDraftUnit);
    }
  };

  window.clearAllSpeakingLessons = function() {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ kịch bản Speaking?')) return;
    if (window._currentDraftUnit) {
      window._currentDraftUnit.speaking = [];
    }
    const contentWrap = document.getElementById('ud-skill-content') || document.getElementById('ud-skill-content-wrap');
    if (contentWrap && window._currentDraftUnit) {
      contentWrap.innerHTML = renderSpeakingDesigner(window._currentDraftUnit);
    }
  };

  window.addSpeakingCharacter = function() {
    const container = document.getElementById('ud-spk-characters-container');
    if (!container) return;
    const count = container.querySelectorAll('.spk-character-card').length;
    const code = String.fromCharCode(65 + count);
    const color = count === 0 ? '#2563eb' : (count === 1 ? '#db2777' : (count === 2 ? '#059669' : '#d97706'));

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderCharacterCard({ code, name: `Nhân vật ${code}`, avatar: '👤', roleTitle: '', color }, count);
    container.appendChild(tempDiv.firstElementChild);

    const badge = document.getElementById('badge-spk-chars');
    if (badge) badge.innerText = `${count + 1} nhân vật`;
  };

  window.removeSpeakingCharacter = function(btn) {
    const card = btn.closest('.spk-character-card');
    if (card) {
      card.remove();
      const container = document.getElementById('ud-spk-characters-container');
      const count = container ? container.querySelectorAll('.spk-character-card').length : 0;
      const badge = document.getElementById('badge-spk-chars');
      if (badge) badge.innerText = `${count} nhân vật`;
    }
  };

  window.addSpeakingDialogueTurn = function() {
    const container = document.getElementById('ud-spk-dialogue-container');
    if (!container) return;
    const count = container.querySelectorAll('.spk-dialogue-card').length;
    const speaker = count % 2 === 0 ? 'A' : 'B';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderDialogueTurnCard({ speaker, text: '', ipa: '', meaning: '', tip: '' }, count, []);
    container.appendChild(tempDiv.firstElementChild);

    const badge = document.getElementById('badge-spk-turns');
    if (badge) badge.innerText = `${count + 1} lượt thoại`;
  };

  window.removeSpeakingDialogueTurn = function(btn) {
    const card = btn.closest('.spk-dialogue-card');
    if (card) {
      card.remove();
      const container = document.getElementById('ud-spk-dialogue-container');
      const count = container ? container.querySelectorAll('.spk-dialogue-card').length : 0;
      const badge = document.getElementById('badge-spk-turns');
      if (badge) badge.innerText = `${count} lượt thoại`;
    }
  };

  window.toggleSpeakingDialogueQuickPaste = function() {
    const drawer = document.getElementById('ud-spk-quick-drawer');
    if (drawer) drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  };

  window.processSpeakingDialogueQuickPaste = function() {
    const input = document.getElementById('ud-spk-quick-input');
    const container = document.getElementById('ud-spk-dialogue-container');
    if (!input || !container) return;

    const text = input.value.trim();
    if (!text) {
      alert('Vui lòng nhập kịch bản hội thoại!');
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    container.innerHTML = '';

    lines.forEach((line, idx) => {
      let speaker = 'A';
      let cleanLine = line;
      if (/^[A-Za-z]\s*:\s*/.test(line)) {
        speaker = line.charAt(0).toUpperCase();
        cleanLine = line.replace(/^[A-Za-z]\s*:\s*/, '').trim();
      }

      const parts = cleanLine.split(/\s*[-–—]\s*/);
      const textEn = parts[0]?.trim() || '';
      let ipa = '';
      let meaning = '';

      if (parts[1]?.startsWith('/')) {
        ipa = parts[1].trim();
        meaning = parts.slice(2).join(' - ').trim();
      } else {
        meaning = parts.slice(1).join(' - ').trim();
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = renderDialogueTurnCard({ speaker, text: textEn, ipa, meaning }, idx, []);
      container.appendChild(tempDiv.firstElementChild);
    });

    const badge = document.getElementById('badge-spk-turns');
    if (badge) badge.innerText = `${lines.length} lượt thoại`;

    input.value = '';
    window.toggleSpeakingDialogueQuickPaste();
  };

  window.addSpeakingPhraseRow = function() {
    const container = document.getElementById('ud-spk-phrases-container');
    if (!container) return;
    const count = container.querySelectorAll('.spk-phrase-card').length;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderPhraseCard({ text: '', ipa: '', meaning: '', tip: '' }, count);
    container.appendChild(tempDiv.firstElementChild);

    const badge = document.getElementById('badge-spk-phrases');
    if (badge) badge.innerText = `${count + 1} câu`;
  };

  window.removeSpeakingPhraseRow = function(btn) {
    const card = btn.closest('.spk-phrase-card');
    if (card) {
      card.remove();
      const container = document.getElementById('ud-spk-phrases-container');
      const count = container ? container.querySelectorAll('.spk-phrase-card').length : 0;
      const badge = document.getElementById('badge-spk-phrases');
      if (badge) badge.innerText = `${count} câu`;
    }
  };
}
