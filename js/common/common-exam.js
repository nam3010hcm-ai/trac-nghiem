/**
 * MODULE COMMON EXAM & QUESTION UTILS (js/common/common-exam.js)
 * Cấu trúc State, đánh giá đáp án câu hỏi, danh mục và load dữ liệu ban đầu
 */
const db = () => window.supabaseClient;

export const KEYS = ['A','B','C','D'];
if (typeof window !== 'undefined') { window.KEYS = KEYS; }

export const state = { SUBCATS:{}, questions:[], exams:[], results:[], teachers:[], students:[], nextQId:100, nextEId:10, currentUserEmail: '', currentUserName: '' };
export const $ = id => document.getElementById(id);
if (typeof window !== 'undefined') { window.$ = $; }
export const clone = obj => JSON.parse(JSON.stringify(obj));
export const shuffle = a => a.slice().sort(() => Math.random() - .5);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[m]));
if (typeof window !== 'undefined') { window.esc = esc; }

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
export function normAns(s){ return String(s ?? '').trim().toLowerCase(); }

// So khớp 1 câu trả lời của học viên với đáp án đúng của câu hỏi q, theo từng loại (type)
export function isCorrect(q, userAns){
  if (!q) return false;
  const type = q.type || 'mcq_single';

  if(type === 'mcq_single'){
    if (userAns === undefined || userAns === null || userAns === '') return false;
    let expected = q.ans;
    if (typeof expected === 'string' && /^[ABCDabcd]$/.test(expected.trim())) {
      expected = ['A', 'B', 'C', 'D'].indexOf(expected.trim().toUpperCase());
    }
    let actual = userAns;
    if (typeof actual === 'string' && /^[ABCDabcd]$/.test(actual.trim())) {
      actual = ['A', 'B', 'C', 'D'].indexOf(actual.trim().toUpperCase());
    }
    return Number(actual) === Number(expected);
  }

  if(type === 'mcq_multi'){
    if (!Array.isArray(userAns)) return false;
    const normalizeAns = val => {
      if (typeof val === 'string' && /^[ABCDabcd]$/.test(val.trim())) {
        return ['A', 'B', 'C', 'D'].indexOf(val.trim().toUpperCase());
      }
      return Number(val);
    };
    const ua = (userAns || []).map(normalizeAns).sort((a, b) => a - b);
    const ca = (Array.isArray(q.ans) ? q.ans : [q.ans]).map(normalizeAns).sort((a, b) => a - b);
    return ua.length === ca.length && ua.every((v,i) => v === ca[i]);
  }

  if(type === 'fill_blank' || type === 'drag_drop'){
    const ua = Array.isArray(userAns) ? userAns : [];
    if (!q.blanks || !q.blanks.length) return false;
    return q.blanks.every((accepted, i) => {
      const opts = String(accepted || '').split('|').map(normAns).filter(Boolean);
      return opts.includes(normAns(ua[i]));
    });
  }

  if(type === 'matching'){
    const ua = userAns && typeof userAns === 'object' ? userAns : {};
    if (!q.pairs || !q.pairs.length) return false;
    return q.pairs.every((_, i) => Number(ua[i]) === Number(i));
  }

  return false;
}

// Hiển thị đáp án (của học viên hoặc đáp án đúng) dạng text để show ở màn hình kết quả
export function formatAnswer(q, userAns, showCorrect=false){
  if (!q) return 'Chưa làm';
  const type = q.type || 'mcq_single';

  if(type === 'mcq_single'){
    let target = showCorrect ? q.ans : userAns;
    if (typeof target === 'string' && /^[ABCDabcd]$/.test(target.trim())) {
      target = ['A', 'B', 'C', 'D'].indexOf(target.trim().toUpperCase());
    }
    const i = Number(target);
    return (isNaN(i) || i < 0 || !q.opts?.[i]) ? 'Chưa chọn' : `${KEYS[i] || '?'}. ${q.opts[i]}`;
  }

  if(type === 'mcq_multi'){
    const rawArr = showCorrect ? (Array.isArray(q.ans) ? q.ans : [q.ans]) : (Array.isArray(userAns) ? userAns : []);
    if(!rawArr.length) return 'Chưa chọn';
    const normalizeAns = val => {
      if (typeof val === 'string' && /^[ABCDabcd]$/.test(val.trim())) {
        return ['A', 'B', 'C', 'D'].indexOf(val.trim().toUpperCase());
      }
      return Number(val);
    };
    return rawArr
      .map(normalizeAns)
      .filter(i => !isNaN(i) && q.opts?.[i])
      .sort((a,b)=>a-b)
      .map(i => `${KEYS[i] || '?'}. ${q.opts[i]}`)
      .join('; ');
  }

  if(type === 'fill_blank' || type === 'drag_drop'){
    const arr = showCorrect ? (q.blanks || []) : (Array.isArray(userAns) ? userAns : []);
    if(!arr.length) return 'Chưa điền';
    return arr.map((x,i) => `#${i+1}: ${x || '___'}`).join(' | ');
  }

  if(type === 'matching'){
    if(showCorrect){
      return (q.pairs || []).map(p => `${p.left} = ${p.right}`).join('; ');
    }
    const map = userAns || {};
    const keys = Object.keys(map);
    if(!keys.length) return 'Chưa ghép';
    return keys.map(lIdx => {
      const rIdx = map[lIdx];
      const leftText = q.pairs?.[lIdx]?.left || `Mục ${Number(lIdx)+1}`;
      const rightText = q.pairs?.[rIdx]?.right || `Mục ${Number(rIdx)+1}`;
      return `${leftText} → ${rightText}`;
    }).join('; ');
  }

  return String(userAns || 'Chưa làm');
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

  // 5. Tải danh sách Giảng viên (Teachers) để hiển thị Họ và Tên tác giả
  try {
    const { data: tRows } = await db().from('teachers').select('id, email, teacher_name, department, role');
    if (tRows && tRows.length > 0) {
      state.teachers = tRows;
      window.teachersList = tRows;
    }
  } catch(e){}

  // 6. Tải danh sách Học viên (Students) để hiển thị Họ và Tên
  try {
    const { data: sRows } = await db().from('students').select('id, email, full_name, class_name, academic_year, total_xp');
    if (sRows && sRows.length > 0) {
      state.students = sRows;
      window.studentsList = sRows;
    }
  } catch(e){}
}

export function fillSubcatSelect(selId, cat, addAll=true, allLabel='(Tất cả phần)'){
  const sel = $(selId);
  if(!sel) return;
  const scs = state.SUBCATS[cat] || [];
  sel.innerHTML = (addAll ? `<option value="">${esc(allLabel)}</option>` : '') +
    scs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}
