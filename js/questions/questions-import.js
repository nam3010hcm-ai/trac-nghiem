/**
 * MODULE QUESTIONS IMPORT & EXPORT (js/questions/questions-import.js)
 * Nhập câu hỏi từ file Excel / CSV thông qua thư viện SheetJS
 */
import { state } from '../common.js';
import { renderQuestions } from './questions-list.js';

const db = () => window.supabaseClient;

export function downloadTemplateCSV(){
  const csv = '\uFEFFcat,subcat,text,image,A,B,C,D,ans\nToán,Toán/Phần 1 - Số học,"Tính $2^5+3^2$",,"$32$","$41$","$25$","$64$",B';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'mau_import_cau_hoi.csv';
  a.click();
}

export async function loadSheetJS(){
  if(window.XLSX) return window.XLSX;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.XLSX;
}

export async function importQuestionsFromFile(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const XLSX = await loadSheetJS();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, {type:'array'});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
    const newQs = [];
    for(const r of rows){
      const cat = String(r.cat || r.Cat || r['Chủ đề'] || r['Chu de'] || '').trim();
      const subcat = String(r.subcat || r.Subcat || r['Phần'] || r['Phan'] || '').trim();
      const text = String(r.text || r.Question || r.question || r['Câu hỏi'] || r['Cau hoi'] || '').trim();
      const image = String(r.image || r.Image || r['Hình ảnh'] || '').trim();
      const explain = String(r.explain || r.Explain || r['Giải thích'] || '').trim();
      const opts = ['A','B','C','D'].map(k => String(r[k] || r[k.toLowerCase()] || '').trim());
      let ansRaw = String(r.ans || r.Answer || r.answer || r['Đáp án'] || r['Dap an'] || 'A').trim().toUpperCase();
      let ans = ['A','B','C','D'].indexOf(ansRaw);
      if(ans < 0 && /^[0-3]$/.test(ansRaw)) ans = parseInt(ansRaw);
      if(!cat || !text || opts.some(x=>!x) || ans < 0) continue;
      const q = { id: state.nextQId++, cat, subcat, text, image, explain, opts, ans };
      state.questions.push(q);
      newQs.push(q);
    }
    if (newQs.length > 0) {
      const { error } = await db().from('questions').insert(newQs);
      if(error) console.error("Lỗi insert questions:", error);
    }
    alert(`✅ Đã import ${newQs.length} câu hỏi.`);
    e.target.value = '';
    renderQuestions();
  }catch(err){
    console.error(err);
    alert('Không import được file. Hãy kiểm tra định dạng cột hoặc kết nối mạng để tải thư viện XLSX.');
  }
}
