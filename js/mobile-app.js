/**
 * MODULE GIAO TIẾP & ĐỒNG BỘ APP DI ĐỘNG BOOKVOCAB (js/mobile-app.js)
 * Phục vụ kết nối 2 chiều giữa Nền tảng Web EduCore và App Android BookVocabApp:
 * 1. Phân phối & Cài đặt APK
 * 2. Xuất gói bài học từ vựng cho BookVocabApp (JSON & QR)
 * 3. Sinh mã QR Ghép nối / Đăng nhập 1-chạm cho Học viên
 * 4. Tiếp nhận & Phê duyệt từ vựng quét từ sách giáo trình
 * 5. Giám sát đồng bộ đám mây Supabase
 */

const db = () => window.supabaseClient;
const STORAGE_SCANNED_VOCAB = 'educore_scanned_vocab_submissions';

// Dữ liệu mẫu ban đầu nếu chưa có bài nộp từ vựng
const SEED_SCANNED_VOCAB = [
  {
    id: 'scan_001',
    word: 'biodiversity',
    ipa: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
    definition: 'đa dạng sinh học, sự phong phú về loài trong hệ sinh thái',
    cefrLevel: 'B2',
    scannedFrom: 'Sách Tiếng Anh Chuyên Ngành Môi Trường - Trang 42',
    studentId: 'SV001',
    studentName: 'Nguyễn Văn An',
    scannedAt: '2026-09-05 15:30',
    status: 'pending' // pending | approved | rejected
  },
  {
    id: 'scan_002',
    word: 'sustainable',
    ipa: '/səˈsteɪ.nə.bəl/',
    definition: 'bền vững, có thể duy trì lâu dài mà không hủy hoại tài nguyên',
    cefrLevel: 'B1',
    scannedFrom: 'Giáo trình Kỹ Thuật Công Trình - Bài 3',
    studentId: 'SV002',
    studentName: 'Trần Thị Mai',
    scannedAt: '2026-09-05 16:15',
    status: 'approved'
  },
  {
    id: 'scan_003',
    word: 'infrastructure',
    ipa: '/ˈɪn.frəˌstrʌk.tʃər/',
    definition: 'cơ sở hạ tầng (đường sá, cầu cống, mạng lưới cấp điện)',
    cefrLevel: 'B2',
    scannedFrom: 'Tài liệu Tiếng Anh Kỹ thuật - Trang 88',
    studentId: 'SV003',
    studentName: 'Lê Hoàng Nam',
    scannedAt: '2026-09-06 08:20',
    status: 'pending'
  }
];

export function getScannedVocabList() {
  try {
    const raw = localStorage.getItem(STORAGE_SCANNED_VOCAB);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(STORAGE_SCANNED_VOCAB, JSON.stringify(SEED_SCANNED_VOCAB));
  return SEED_SCANNED_VOCAB;
}

export function saveScannedVocabList(list) {
  try {
    localStorage.setItem(STORAGE_SCANNED_VOCAB, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Khởi tạo dữ liệu Tab Mobile App trên Teacher Admin
 */
export async function initMobileAppTab() {
  await updateCloudSyncStats();
  populateMobileUnitSelector();
  await populateMobileStudentSelector();
  renderScannedVocabTable();
}

/**
 * Cập nhật số liệu thống kê liên thông đám mây
 */
export async function updateCloudSyncStats() {
  let unitCount = 0;
  let studentCount = 0;
  let teacherCount = 0;

  try {
    if (db()) {
      const [resUnits, resStudents, resTeachers] = await Promise.all([
        db().from('learning_units').select('id', { count: 'exact', head: true }),
        db().from('students').select('id', { count: 'exact', head: true }),
        db().from('teachers').select('id', { count: 'exact', head: true })
      ]);
      unitCount = resUnits.count || 0;
      studentCount = resStudents.count || 0;
      teacherCount = resTeachers.count || 0;
    }
  } catch (err) {
    console.warn('Lỗi đọc stats từ Supabase:', err);
  }

  // Cập nhật lên UI
  const elUnit = document.getElementById('mobile-stat-units');
  const elStudent = document.getElementById('mobile-stat-students');
  const elTeacher = document.getElementById('mobile-stat-teachers');
  const elScanned = document.getElementById('mobile-stat-scanned');

  const scannedList = getScannedVocabList();

  if (elUnit) elUnit.textContent = `${unitCount > 0 ? unitCount : (window.unitsState?.length || 7)} Units`;
  if (elStudent) elStudent.textContent = `${studentCount > 0 ? studentCount : 35} Học viên`;
  if (elTeacher) elTeacher.textContent = `${teacherCount > 0 ? teacherCount : 5} Giảng viên`;
  if (elScanned) elScanned.textContent = `${scannedList.length} Từ vựng`;
}

/**
 * Nạp danh sách Unit vào dropdown bộ xuất từ vựng
 */
export function populateMobileUnitSelector() {
  const sel = document.getElementById('mobile-unit-export-select');
  if (!sel) return;

  const units = window.unitsState || [];
  sel.innerHTML = '<option value="">-- Chọn Unit bài học cần xuất sang App --</option>';

  units.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    const title = u.title || 'Unit Không Tên';
    const sub = u.subject || 'Tiếng Anh';
    const mod = u.module || 'B1';
    opt.textContent = `[${sub}] ${mod} ➔ ${title}`;
    sel.appendChild(opt);
  });
}

/**
 * Nạp danh sách Học viên vào dropdown cấp mã QR ghép nối
 */
export async function populateMobileStudentSelector() {
  const sel = document.getElementById('mobile-student-pair-select');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Chọn Học viên để cấp mã QR ghép nối --</option>';

  try {
    let list = [];
    if (db()) {
      const { data } = await db().from('students').select('id, full_name, class_name, email, total_xp').order('id', { ascending: true });
      if (data && data.length > 0) list = data;
    }

    if (!list || list.length === 0) {
      list = [
        { id: 'SV001', full_name: 'Nguyễn Văn An', class_name: 'Lớp 10A1 - Tiếng Anh', email: 'sv001@hoctap-k7.edu.vn', total_xp: 1450 },
        { id: 'SV002', full_name: 'Trần Thị Mai', class_name: 'Lớp 10A1 - Tiếng Anh', email: 'sv002@hoctap-k7.edu.vn', total_xp: 1200 },
        { id: 'SV003', full_name: 'Lê Hoàng Nam', class_name: 'Lớp 10A2 - Tiếng Anh', email: 'sv003@hoctap-k7.edu.vn', total_xp: 980 }
      ];
    }

    list.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.setAttribute('data-student', JSON.stringify(st));
      opt.textContent = `${st.id} - ${st.full_name} (${st.class_name || 'Lớp tiêu chuẩn'})`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.warn('Lỗi nạp danh sách học sinh ghép nối:', err);
  }
}

/**
 * Xuất Gói Bài Học Từ Vựng sang chuẩn BookVocabApp
 */
export function exportSelectedUnitVocab() {
  const sel = document.getElementById('mobile-unit-export-select');
  const unitId = sel ? sel.value : null;

  if (!unitId) {
    alert('⚠️ Vui lòng chọn một Unit bài học để xuất gói từ vựng!');
    return;
  }

  const units = window.unitsState || [];
  const unit = units.find(u => String(u.id) === String(unitId));

  if (!unit) {
    alert('⚠️ Không tìm thấy thông tin Unit trong hệ thống!');
    return;
  }

  // Bóc tách toàn bộ từ vựng từ Language Focus
  const vocabItems = [];
  const langFocus = unit.language_focus || {};

  // 1. Flashcards
  if (Array.isArray(langFocus.flashcards)) {
    langFocus.flashcards.forEach(fc => {
      if (fc.word && fc.word.trim()) {
        vocabItems.push({
          word: fc.word.trim(),
          ipa: fc.ipa || '',
          pos: fc.pos || 'vocab',
          meaning: fc.meaning || '',
          example: fc.example || '',
          source: 'flashcards'
        });
      }
    });
  }

  // 2. Match Pairs
  if (Array.isArray(langFocus.matchPairs)) {
    langFocus.matchPairs.forEach(mp => {
      if (mp.left && mp.left.trim()) {
        vocabItems.push({
          word: mp.left.trim(),
          ipa: '',
          pos: 'phrase',
          meaning: mp.right || '',
          example: '',
          source: 'matchPairs'
        });
      }
    });
  }

  // 3. Past Verbs
  if (Array.isArray(langFocus.pastFormVerbs)) {
    langFocus.pastFormVerbs.forEach(pv => {
      if (pv.infinitive && pv.infinitive.trim()) {
        vocabItems.push({
          word: pv.infinitive.trim(),
          ipa: '',
          pos: 'v.',
          meaning: `${pv.meaning || ''} [V2: ${pv.past || ''}]`,
          example: '',
          source: 'pastVerbs'
        });
      }
    });
  }

  // 4. Backward Spelling
  if (Array.isArray(langFocus.backwardSpelling)) {
    langFocus.backwardSpelling.forEach(bs => {
      if (bs.targetWord && bs.targetWord.trim()) {
        vocabItems.push({
          word: bs.targetWord.trim(),
          ipa: '',
          pos: 'vocab',
          meaning: `${bs.hint || ''} - ${bs.clue || ''}`,
          example: '',
          source: 'spelling'
        });
      }
    });
  }

  // 5. Reading Vocabulary nếu có
  if (Array.isArray(unit.reading)) {
    unit.reading.forEach(r => {
      if (Array.isArray(r.vocabulary)) {
        r.vocabulary.forEach(rv => {
          if (rv.word && rv.word.trim()) {
            vocabItems.push({
              word: rv.word.trim(),
              ipa: rv.ipa || '',
              pos: rv.pos || '',
              meaning: rv.meaning || '',
              example: rv.example || '',
              source: 'reading'
            });
          }
        });
      }
    });
  }

  // Khử trùng lặp từ theo chữ cái viết thường
  const uniqueWords = [];
  const seenWords = new Set();
  vocabItems.forEach(item => {
    const key = item.word.toLowerCase();
    if (!seenWords.has(key)) {
      seenWords.add(key);
      uniqueWords.push(item);
    }
  });

  const exportPayload = {
    app: 'BookVocabApp',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sourceSystem: 'EduCore Enterprise LMS',
    unit: {
      id: unit.id,
      subject: unit.subject || '🇬🇧 Tiếng Anh',
      module: unit.module || 'English B1 - General & Academic Skills',
      title: unit.title || 'Unit Bài Học',
      level: unit.level || 'A2 - B1',
      icon: unit.icon || '📖',
      description: unit.description || '',
      totalWords: uniqueWords.length,
      words: uniqueWords
    }
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);

  // Hiển thị Preview Modal
  const previewBox = document.getElementById('mobile-export-preview-box');
  const previewContent = document.getElementById('mobile-export-json-content');
  const previewSummary = document.getElementById('mobile-export-summary');

  if (previewSummary) {
    previewSummary.innerHTML = `
      ✅ <b>${unit.title}</b> (${unit.module})<br>
      📊 Tổng số từ vựng bóc tách: <b>${uniqueWords.length} từ</b> (Gồm Flashcards, Ghép từ, Động từ bất quy tắc & Đọc hiểu).
    `;
  }

  if (previewContent) {
    previewContent.value = jsonString;
  }

  if (previewBox) {
    previewBox.style.display = 'block';
    previewBox.scrollIntoView({ behavior: 'smooth' });
  }

  // Lưu tạm để tải file
  window._lastExportedVocabPayload = exportPayload;
  window._lastExportedUnitTitle = unit.title || 'unit_vocab';
}

/**
 * Tải file JSON gói từ vựng đã xuất
 */
export function downloadExportedVocabJson() {
  if (!window._lastExportedVocabPayload) {
    alert('⚠️ Vui lòng xuất gói bài học trước khi tải file!');
    return;
  }

  const jsonStr = JSON.stringify(window._lastExportedVocabPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanTitle = (window._lastExportedUnitTitle || 'unit_vocab').replace(/[^a-zA-Z0-9_-]/g, '_');

  const a = document.createElement('a');
  a.href = url;
  a.download = `BookVocab_${cleanTitle}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sao chép JSON gói bài học vào Clipboard
 */
export function copyExportedVocabJson() {
  const previewContent = document.getElementById('mobile-export-json-content');
  if (!previewContent || !previewContent.value) {
    alert('⚠️ Không có dữ liệu để sao chép!');
    return;
  }

  navigator.clipboard.writeText(previewContent.value).then(() => {
    alert('📋 Đã sao chép toàn bộ gói từ vựng vào bộ nhớ tạm! Bạn có thể dán trực tiếp vào BookVocabApp.');
  }).catch(err => {
    previewContent.select();
    document.execCommand('copy');
    alert('📋 Đã sao chép vào bộ nhớ tạm!');
  });
}

/**
 * Sinh mã QR Ghép Nối Nhanh Cho Học Viên
 */
export function generateStudentPairingCode() {
  const sel = document.getElementById('mobile-student-pair-select');
  if (!sel || !sel.value) {
    alert('⚠️ Vui lòng chọn một học viên trong danh sách để sinh mã ghép nối!');
    return;
  }

  const opt = sel.options[sel.selectedIndex];
  const stDataStr = opt.getAttribute('data-student');
  let student = null;
  try {
    if (stDataStr) student = JSON.parse(stDataStr);
  } catch (e) {}

  if (!student) {
    student = {
      id: sel.value,
      full_name: 'Học viên ' + sel.value,
      class_name: 'Lớp Tiếng Anh K7',
      email: `${sel.value.toLowerCase()}@hoctap-k7.edu.vn`,
      total_xp: 1200
    };
  }

  // Sinh mã PIN 6 số ngẫu nhiên
  const pin = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 24 * 3600 * 1000; // 24 giờ

  const pairingPayload = {
    action: 'EDUCORE_STUDENT_SSO_PAIR',
    version: '1.0',
    studentId: student.id,
    fullName: student.full_name,
    className: student.class_name || 'Lớp Tiêu Chuẩn',
    email: student.email || '',
    totalXp: student.total_xp || 0,
    pin: String(pin),
    expiresAt: expiresAt,
    supabase: {
      url: 'https://xuioxmjufpfdblecjvuv.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aW94bWp1ZnBmZGJsZWNqdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDk0NDIsImV4cCI6MjEwMjMyNTQ0Mn0.udJ9W9Y_6WgqENT6j2xSXGZg2pEKfvnMTWfzKR_3gfY'
    }
  };

  const payloadString = JSON.stringify(pairingPayload);

  // Hiển thị lên UI
  const qrContainer = document.getElementById('mobile-qr-pairing-box');
  const qrImg = document.getElementById('mobile-pairing-qr-img');
  const pinText = document.getElementById('mobile-pairing-pin-val');
  const nameText = document.getElementById('mobile-pairing-name-val');
  const codeText = document.getElementById('mobile-pairing-code-val');

  if (qrImg) {
    const encoded = encodeURIComponent(payloadString);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&margin=8`;
  }

  if (pinText) pinText.textContent = String(pin);
  if (nameText) nameText.textContent = student.full_name;
  if (codeText) codeText.textContent = student.id;

  if (qrContainer) {
    qrContainer.style.display = 'block';
    qrContainer.scrollIntoView({ behavior: 'smooth' });
  }

  window._currentPairingPayloadString = payloadString;
}

/**
 * Sao chép mã PIN và Token ghép nối
 */
export function copyPairingPayload() {
  if (!window._currentPairingPayloadString) {
    alert('⚠️ Chưa có thông tin mã ghép nối!');
    return;
  }

  navigator.clipboard.writeText(window._currentPairingPayloadString).then(() => {
    alert('📋 Đã sao chép mã Token ghép nối! Học viên có thể dán vào BookVocabApp để đăng nhập.');
  }).catch(() => {
    alert('📋 Đã sao chép!');
  });
}

/**
 * Render Bảng Danh Sách Từ Vựng Quét Từ Sách Giáo Khoa
 */
export function renderScannedVocabTable() {
  const tbody = document.getElementById('mobile-scanned-vocab-tbody');
  if (!tbody) return;

  const list = getScannedVocabList();
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">Chưa có từ vựng nào được quét từ sách gửi lên.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((item, idx) => {
    const badgeColor = item.cefrLevel === 'B2' ? '#f59e0b' : item.cefrLevel === 'C1' ? '#ef4444' : '#10b981';
    const statusHtml = item.status === 'approved'
      ? '<span class="cat-badge" style="background:#dcfce7;color:#15803d;">✅ Đã duyệt</span>'
      : item.status === 'rejected'
      ? '<span class="cat-badge" style="background:#fee2e2;color:#b91c1c;">❌ Bị loại</span>'
      : '<span class="cat-badge" style="background:#fef3c7;color:#b45309;">⏳ Chờ duyệt</span>';

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px;font-weight:700;color:#64748b;">#${idx + 1}</td>
        <td style="padding:12px;">
          <div style="font-weight:800;font-size:15px;color:#0f172a;">${item.word}</div>
          <div style="font-size:12px;color:#6366f1;font-family:monospace;">${item.ipa || ''}</div>
        </td>
        <td style="padding:12px;">
          <span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;color:#fff;background:${badgeColor};">
            ${item.cefrLevel || 'A2'}
          </span>
        </td>
        <td style="padding:12px;max-width:280px;font-size:13px;color:#334155;">
          <div>${item.definition}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">📖 Nguồn: ${item.scannedFrom || 'Sách giáo khoa'}</div>
        </td>
        <td style="padding:12px;font-size:12.5px;">
          <div style="font-weight:700;color:#1e293b;">${item.studentName || 'Học viên'}</div>
          <div style="font-size:11px;color:#64748b;">Mã: ${item.studentId || 'SV'} • ${item.scannedAt || ''}</div>
        </td>
        <td style="padding:12px;text-align:center;">
          ${statusHtml}
        </td>
        <td style="padding:12px;text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            ${item.status !== 'approved' ? `
              <button class="btn btn-sm" onclick="window.approveScannedVocab('${item.id}')" style="background:#16a34a;color:#fff;border:none;padding:4px 10px;font-size:11px;font-weight:700;" title="Duyệt và đưa vào Unit bài học">
                ✔ Duyệt
              </button>
            ` : `
              <button class="btn btn-sm" onclick="window.addScannedWordToUnitEditor('${item.word}', '${item.ipa}', '${item.definition.replace(/'/g, "\\'")}')" style="background:#6366f1;color:#fff;border:none;padding:4px 10px;font-size:11px;font-weight:700;" title="Chèn vào Unit Designer">
                ➕ Chèn Unit
              </button>
            `}
            <button class="btn btn-sm" onclick="window.deleteScannedVocab('${item.id}')" style="background:#f1f5f9;color:#ef4444;border:1px solid #fecaca;padding:4px 8px;font-size:11px;" title="Xóa">
              🗑
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Duyệt từ vựng quét từ sách
 */
export function approveScannedVocab(id) {
  const list = getScannedVocabList();
  const item = list.find(x => x.id === id);
  if (!item) return;

  item.status = 'approved';
  saveScannedVocabList(list);
  renderScannedVocabTable();
  alert(`✅ Đã phê duyệt từ "${item.word}"! Bạn có thể bấm nút "➕ Chèn Unit" để đưa vào bài học.`);
}

/**
 * Xóa từ vựng quét
 */
export function deleteScannedVocab(id) {
  if (!confirm('Bạn có chắc muốn xóa từ vựng này khỏi danh sách tiếp nhận?')) return;
  let list = getScannedVocabList();
  list = list.filter(x => x.id !== id);
  saveScannedVocabList(list);
  renderScannedVocabTable();
}

/**
 * Chèn trực tiếp từ đã quét vào Unit Designer
 */
export function addScannedWordToUnitEditor(word, ipa, def) {
  if (typeof window.openUnitEditor === 'function') {
    window.switchTTab('unit');
    setTimeout(() => {
      alert(`💡 Gợi ý: Hãy mở Unit bạn muốn thêm và dán từ vựng:\n- Từ: ${word}\n- IPA: ${ipa}\n- Nghĩa: ${def}`);
    }, 400);
  }
}

/**
 * Nhập từ vựng quét từ file JSON do BookVocabApp xuất ra
 */
export function importScannedJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      let importedCount = 0;
      const currentList = getScannedVocabList();

      const items = Array.isArray(parsed) ? parsed : (parsed.words || (parsed.unit && parsed.unit.words) || []);

      items.forEach(it => {
        const w = it.word || it.term;
        if (w && !currentList.some(x => x.word.toLowerCase() === w.toLowerCase())) {
          currentList.unshift({
            id: 'scan_import_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            word: w.trim(),
            ipa: it.ipa || '',
            definition: it.definition || it.meaning || '',
            cefrLevel: it.cefrLevel || 'B1',
            scannedFrom: it.source || file.name,
            studentId: it.studentId || 'SV_APP',
            studentName: it.studentName || 'BookVocab User',
            scannedAt: new Date().toLocaleString(),
            status: 'pending'
          });
          importedCount++;
        }
      });

      saveScannedVocabList(currentList);
      renderScannedVocabTable();
      updateCloudSyncStats();
      alert(`🎉 Đã nhập thành công ${importedCount} từ vựng mới từ file BookVocabApp!`);
    } catch (err) {
      alert('❌ Lỗi định dạng file JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.initMobileAppTab = initMobileAppTab;
  window.exportSelectedUnitVocab = exportSelectedUnitVocab;
  window.downloadExportedVocabJson = downloadExportedVocabJson;
  window.copyExportedVocabJson = copyExportedVocabJson;
  window.generateStudentPairingCode = generateStudentPairingCode;
  window.copyPairingPayload = copyPairingPayload;
  window.approveScannedVocab = approveScannedVocab;
  window.deleteScannedVocab = deleteScannedVocab;
  window.addScannedWordToUnitEditor = addScannedWordToUnitEditor;
  window.importScannedJsonFile = importScannedJsonFile;
}
