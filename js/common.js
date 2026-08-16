import { uploadMediaFile } from './supabase.js';
import { showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge } from './ui-components.js';

const db = () => window.supabaseClient;

export const KEYS = ['A','B','C','D'];
export { uploadMediaFile, showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge };




export const DEFAULT_SUBCATS = {
  "Word":["Word/Phần 1 - Định dạng ký tự","Word/Phần 2 - Định dạng đoạn văn","Word/Phần 3 - Định dạng trang & lề","Word/Phần 4 - Bảng biểu","Word/Phần 5 - Hình ảnh & đối tượng","Word/Phần 6 - Header, Footer & số trang","Word/Phần 7 - Styles & Heading","Word/Phần 8 - Tiện ích & phím tắt"],
  "Excel":["Excel/Phần 1 - Nhập liệu & định dạng ô","Excel/Phần 2 - Hàm tính toán cơ bản","Excel/Phần 3 - Hàm điều kiện & logic","Excel/Phần 4 - Hàm tra cứu (VLOOKUP, HLOOKUP)","Excel/Phần 5 - Hàm văn bản & ngày tháng","Excel/Phần 6 - Biểu đồ","Excel/Phần 7 - Lọc, sắp xếp & PivotTable","Excel/Phần 8 - Tiện ích & phím tắt"],
  "PowerPoint":["PowerPoint/Phần 1 - Tạo & quản lý slide","PowerPoint/Phần 2 - Định dạng văn bản & hình ảnh","PowerPoint/Phần 3 - Hiệu ứng chuyển slide","PowerPoint/Phần 4 - Hiệu ứng đối tượng (Animation)","PowerPoint/Phần 5 - Trình chiếu & xuất file"],
  "Internet & Email":["Internet & Email/Phần 1 - Trình duyệt & tìm kiếm","Internet & Email/Phần 2 - Email cơ bản","Internet & Email/Phần 3 - Bảo mật & an toàn mạng"],
  "Kiến thức chung":["Kiến thức chung/Phần 1 - Phím tắt Windows","Kiến thức chung/Phần 2 - Quản lý file & thư mục","Kiến thức chung/Phần 3 - Khái niệm tin học cơ bản"],
  "Toán":["Toán/Phần 1 - Số học","Toán/Phần 2 - Đại số","Toán/Phần 3 - Hình học","Toán/Phần 4 - Hàm số","Toán/Phần 5 - Phương trình","Toán/Phần 6 - Bất phương trình","Toán/Phần 7 - Xác suất - Thống kê"]
};

export const DEFAULT_QUESTIONS = [
  {id:1,cat:"Word",subcat:"Word/Phần 1 - Định dạng ký tự",text:"Phím tắt nào dùng để in đậm văn bản trong Word?",opts:["Ctrl+I","Ctrl+B","Ctrl+U","Ctrl+D"],ans:1},
  {id:2,cat:"Excel",subcat:"Excel/Phần 2 - Hàm tính toán cơ bản",text:"Hàm nào dùng để tính tổng trong Excel?",opts:["=COUNT()","=AVERAGE()","=SUM()","=MAX()"],ans:2},
  {id:3,cat:"Toán",subcat:"Toán/Phần 1 - Số học",text:"Tính giá trị của biểu thức $2^5 + 3^2$",opts:["$32$","$41$","$25$","$64$"],ans:1}
];

export const DEFAULT_EXAMS = [
  {id:1,name:"Đề tổng hợp cơ bản",desc:"Kiểm tra kiến thức Word, Excel, PowerPoint",count:10,cat:"",subcat:"",timeLimit:0,isHidden:false},
  {id:2,name:"Chuyên đề Word",desc:"Kiểm tra chuyên sâu Microsoft Word",count:8,cat:"Word",subcat:"",timeLimit:0,isHidden:false},
  {id:3,name:"Chuyên đề Excel",desc:"Kiểm tra chuyên sâu Microsoft Excel",count:6,cat:"Excel",subcat:"",timeLimit:0,isHidden:false},
  {id:4,name:"Chuyên đề Toán",desc:"Kiểm tra câu hỏi Toán có LaTeX",count:10,cat:"Toán",subcat:"",timeLimit:0,isHidden:false}
];

export const ROOT_ADMIN_EMAIL = 'nam3010hcm@gmail.com';

export function isRootUser(email) {
  if (!email) return false;
  return String(email).trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
}

export async function logUserAuthEvent(userEmail, userType = 'teacher', eventType = 'login') {
  if (!userEmail) return;
  const nowStr = new Date().toISOString();
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('user_auth_logs').insert([{
        user_email: userEmail,
        user_type: userType,
        event_type: eventType,
        timestamp: nowStr
      }]);

      const targetTable = userType === 'student' ? 'students' : 'teachers';
      const payload = eventType === 'login' ? { last_login_at: nowStr } : { last_logout_at: nowStr };
      await client.from(targetTable).update(payload).eq('email', userEmail);
    }
  } catch (e) {
    console.warn("Lỗi logUserAuthEvent:", e);
  }
}

export async function globalLogout() {
  const stUserRaw = localStorage.getItem('st_user');
  const tcUserRaw = localStorage.getItem('teacher_user');

  try {
    let email = '';
    let userType = 'teacher';
    if (stUserRaw) {
      try { email = JSON.parse(stUserRaw).email || JSON.parse(stUserRaw).sid; userType = 'student'; } catch(e){}
    } else if (tcUserRaw) {
      try { email = JSON.parse(tcUserRaw).email; userType = 'teacher'; } catch(e){}
    }

    if (email) {
      await logUserAuthEvent(email, userType, 'logout');
    }

    if (window.supabaseClient && window.supabaseClient.auth) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (e) {
    console.warn("SignOut error:", e);
  }
  localStorage.removeItem('st_user');
  localStorage.removeItem('teacher_user');
  sessionStorage.clear();
  alert('🔒 Đã đăng xuất khỏi tài khoản EduCore!');
  window.location.href = 'index.html';
}

window.globalLogout = globalLogout;

export function canEditItem(item, currentUserEmail) {
  if (!currentUserEmail) return true;
  if (isRootUser(currentUserEmail)) return true;
  const creator = item?.created_by || item?.createdBy;
  if (!creator) return false;
  return String(creator).trim().toLowerCase() === String(currentUserEmail).trim().toLowerCase();
}

export const state = { SUBCATS:{}, questions:[], exams:[], results:[], nextQId:100, nextEId:10, currentUserEmail: '' };
export const $ = id => document.getElementById(id);
export const clone = obj => JSON.parse(JSON.stringify(obj));
export const shuffle = a => a.slice().sort(() => Math.random() - .5);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[m]));

export function mediaHTML(url, cls='q-img'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:image\//i.test(u)) return '';
  return `<img class="${cls}" src="${esc(u)}" alt="Hình minh họa" loading="lazy">`;
}

export function audioHTML(url, qIdx = null, mode = 'practice'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:audio\//i.test(u)) return '';
  const idAttr = qIdx !== null ? `id="q-audio-${qIdx}" data-qidx="${qIdx}"` : '';
  const badgeId = qIdx !== null ? `id="audio-limit-${qIdx}"` : '';
  return `
    <div class="audio-player-card">
      <div class="audio-header">
        <span class="audio-badge">🎧 Bài nghe (Listening)</span>
        ${mode === 'exam' ? `<span class="audio-limit-badge" ${badgeId}>Số lần nghe: 0 / 2</span>` : `<span class="audio-hint-badge">Chế độ Ôn luyện</span>`}
      </div>
      <audio class="q-audio" ${idAttr} controls ${mode === 'exam' ? 'controlsList="nodownload"' : ''} preload="metadata" src="${esc(u)}">Trình duyệt không hỗ trợ phát audio.</audio>
    </div>`;
}

export const TYPE_LABELS = {
  mcq_single: 'Trắc nghiệm - 1 đáp án',
  mcq_multi: 'Trắc nghiệm - nhiều đáp án',
  fill_blank: 'Điền từ vào chỗ trống',
  drag_drop: 'Kéo-thả vào chỗ trống',
  matching: 'Ghép cặp'
};

// Tách nội dung câu hỏi điền-từ theo dấu ___ thành các đoạn text xen kẽ chỗ trống
export function splitBlanks(text){
  return String(text || '').split(/_{3,}/);
}
export function countBlanks(text){
  return Math.max(0, splitBlanks(text).length - 1);
}
function normAns(s){ return String(s ?? '').trim().toLowerCase(); }

// So khớp 1 câu trả lời của học viên với đáp án đúng của câu hỏi q, theo từng loại (type)
export function isCorrect(q, userAns){
  const type = q.type || 'mcq_single';
  if(type === 'mcq_single'){
    return userAns === q.ans;
  }
  if(type === 'mcq_multi'){
    const ua = Array.isArray(userAns) ? userAns.slice().sort() : [];
    const ca = (q.ans || []).slice().sort();
    return ua.length === ca.length && ua.every((v,i) => v === ca[i]);
  }
  if(type === 'fill_blank' || type === 'drag_drop'){
    const ua = Array.isArray(userAns) ? userAns : [];
    return (q.blanks || []).every((accepted, i) => {
      const opts = String(accepted || '').split('|').map(normAns).filter(Boolean);
      return opts.includes(normAns(ua[i]));
    });
  }
  if(type === 'matching'){
    const ua = Array.isArray(userAns) ? userAns : [];
    return (q.pairs || []).every((_, i) => ua[i] === i);
  }
  return false;
}

// Hiển thị đáp án (của học viên hoặc đáp án đúng) dạng text để show ở màn hình kết quả
export function formatAnswer(q, userAns, showCorrect=false){
  const type = q.type || 'mcq_single';
  if(type === 'mcq_single'){
    const i = showCorrect ? q.ans : userAns;
    return (i === undefined || i === null || !q.opts?.[i]) ? 'Chưa chọn' : `${KEYS[i]}. ${q.opts[i]}`;
  }
  if(type === 'mcq_multi'){
    const arr = showCorrect ? (q.ans || []) : (Array.isArray(userAns) ? userAns : []);
    if(!arr.length) return 'Chưa chọn';
    return arr.slice().sort().map(i => `${KEYS[i]}. ${q.opts[i]}`).join('; ');
  }
  if(type === 'fill_blank' || type === 'drag_drop'){
    if(showCorrect) return (q.blanks || []).map(b => String(b||'').split('|')[0]).join(', ');
    const arr = Array.isArray(userAns) ? userAns : [];
    return arr.length ? arr.map(v => v || '(bỏ trống)').join(', ') : 'Chưa điền';
  }
  if(type === 'matching'){
    const pairs = q.pairs || [];
    if(!pairs.length) return '';
    const ua = showCorrect ? pairs.map((_,i)=>i) : (Array.isArray(userAns) ? userAns : []);
    return pairs.map((p,i) => {
      const r = ua[i];
      const rightText = (r === undefined || r === null || r === -1 || !pairs[r]) ? '(chưa ghép)' : pairs[r].right;
      return `${p.left} → ${rightText}`;
    }).join('; ');
  }
  return '';
}

export function renderRich(txt) {
    if (!txt) return '';
    
    // 1. Tự mã hóa HTML an toàn
    let s = String(txt)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 2. Mở khóa và ÉP CSS nội tuyến để chống lại CSS Reset
    s = s.replace(/&lt;b&gt;/gi, '<b style="font-weight: bold !important;">').replace(/&lt;\/b&gt;/gi, '</b>');
    s = s.replace(/&lt;i&gt;/gi, '<i style="font-style: italic !important;">').replace(/&lt;\/i&gt;/gi, '</i>');
    s = s.replace(/&lt;u&gt;/gi, '<u style="text-decoration: underline !important;">').replace(/&lt;\/u&gt;/gi, '</u>');
    
    // 3. Mở khóa thẻ SPAN đổi màu
    s = s.replace(/&lt;span style=(&#39;|&quot;|&apos;|"|')color:\s*([a-zA-Z0-9#]+)\1&gt;/gi, '<span style="color:$2 !important;">');
    s = s.replace(/&lt;\/span&gt;/gi, '</span>');
    
    // 4. Trả lại thẻ xuống dòng
    return s.replace(/\n/g, '<br>');
}

export function typesetMath(root=document.body){
  if(window.MathJax?.typesetPromise){
    window.MathJax.typesetPromise([root]).catch(console.error);
  }
}

export function getPool(exam){
  // 1. NẾU GIÁO VIÊN SOẠN THỦ CÔNG -> Trích xuất chính xác theo mảng thứ tự qIds
  if(exam.qIds && exam.qIds.length > 0){
      return exam.qIds.map(id => state.questions.find(q => q.id === id)).filter(Boolean);
  }
  
  // 2. NẾU LÀ ĐỀ TỰ ĐỘNG -> Lọc tất cả từ trong kho
  let pool = state.questions.slice();
  if(exam.subcat) pool = pool.filter(q => q.subcat === exam.subcat);
  else if(exam.cat) pool = pool.filter(q => q.cat === exam.cat);
  return pool;
}

export async function initData(loadResults = false){
  // 1. Tải Danh mục (Categories)
  try {
    const { data: catRows, error: catErr } = await db().from('categories').select('*');
    if (catErr) {
      console.warn("Lỗi tải categories từ Supabase:", catErr);
      state.SUBCATS = clone(DEFAULT_SUBCATS);
    } else if (!catRows || catRows.length === 0) {
      state.SUBCATS = clone(DEFAULT_SUBCATS);
      const inserts = Object.keys(DEFAULT_SUBCATS).map(k => ({ name: k, subcategories: DEFAULT_SUBCATS[k] }));
      try { await db().from('categories').upsert(inserts, { onConflict: 'name' }); } catch(e){}
    } else {
      state.SUBCATS = {};
      catRows.forEach(r => { state.SUBCATS[r.name] = r.subcategories || []; });
    }
  } catch (err) {
    console.warn("Ngoại lệ tải categories:", err);
    state.SUBCATS = clone(DEFAULT_SUBCATS);
  }

  // 2. Tải Ngân hàng câu hỏi (Questions)
  try {
    const { data: qRows, error: qErr } = await db().from('questions').select('*').order('id', { ascending: true });
    if (qErr) {
      console.warn("Lỗi tải questions từ Supabase:", qErr);
      state.questions = clone(DEFAULT_QUESTIONS);
    } else if (!qRows || qRows.length === 0) {
      state.questions = clone(DEFAULT_QUESTIONS);
      try { await db().from('questions').insert(DEFAULT_QUESTIONS); } catch(e){}
    } else {
      state.questions = qRows.map(q => ({
        ...q,
        id: isNaN(Number(q.id)) ? q.id : Number(q.id),
        opts: q.opts || [],
        blanks: q.blanks || [],
        bank: q.bank || [],
        pairs: q.pairs || []
      }));
    }
  } catch (err) {
    console.warn("Ngoại lệ tải questions:", err);
    state.questions = clone(DEFAULT_QUESTIONS);
  }
  state.nextQId = state.questions.length ? Math.max(...state.questions.map(q => Number(q.id)||0), 99) + 1 : 100;

  // 3. Tải Đề thi (Exams)
  try {
    const { data: eRows, error: eErr } = await db().from('exams').select('*').order('id', { ascending: true });
    if (eErr) {
      console.warn("Lỗi tải exams từ Supabase:", eErr);
      state.exams = clone(DEFAULT_EXAMS);
    } else if (!eRows || eRows.length === 0) {
      state.exams = clone(DEFAULT_EXAMS);
      const examInserts = DEFAULT_EXAMS.map(e => ({
        id: e.id,
        name: e.name,
        description: e.desc || '',
        count: e.count || 10,
        cat: e.cat || '',
        subcat: e.subcat || '',
        time_limit: e.timeLimit || 0,
        is_hidden: e.isHidden || false,
        q_ids: e.qIds || []
      }));
      try { await db().from('exams').insert(examInserts); } catch(e){}
    } else {
      state.exams = eRows.map(e => ({
        id: isNaN(Number(e.id)) ? e.id : Number(e.id),
        name: e.name,
        desc: e.description || e.desc || '',
        count: e.count || 10,
        cat: e.cat || '',
        subcat: e.subcat || '',
        timeLimit: e.time_limit ?? e.timeLimit ?? 0,
        isHidden: e.is_hidden ?? e.isHidden ?? false,
        qIds: e.q_ids || e.qIds || []
      }));
    }
  } catch (err) {
    console.warn("Ngoại lệ tải exams:", err);
    state.exams = clone(DEFAULT_EXAMS);
  }
  state.nextEId = state.exams.length ? Math.max(...state.exams.map(e => Number(e.id)||0), 9) + 1 : 10;

  // 4. Tải Kết quả thi (Results)
  if (loadResults) {
    try {
      const { data: rRows, error: rErr } = await db().from('results').select('*').order('id', { ascending: false });
      if (rErr) console.warn("Lỗi tải results:", rErr);
      state.results = (rRows || []).map(r => ({
        ...r,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        manualScore: Number(r.manual_score ?? r.manualScore ?? 0),
        score: Number(r.score ?? 0),
        answers: r.answers || []
      }));
    } catch (err) {
      console.warn("Ngoại lệ tải results:", err);
      state.results = [];
    }
  } else {
    state.results = [];
  }
}

export function fillSubcatSelect(selId, cat, addAll=true, allLabel='(Tất cả phần)'){
  const sel = $(selId);
  if(!sel) return;
  const scs = state.SUBCATS[cat] || [];
  sel.innerHTML = (addAll ? `<option value="">${esc(allLabel)}</option>` : '') +
    scs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}
