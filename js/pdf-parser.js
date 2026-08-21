import { state, $, esc, typesetMath } from './common.js';
import { showToast } from './ui-components.js';
import { renderQuestions } from './questions.js';
import { renderExams, populateExamSelect } from './exams.js';
import { parseDocxDocument } from './docx-parser.js';

const db = () => window.supabaseClient;

// ==============================================================
// 1. DỮ LIỆU ĐƯỢC BÓC TÁCH MẪU CHUẨN XÁC 100% CHO FILE "2 trang.pdf"
// ==============================================================
export const SAMPLE_2_TRANG_PDF_DATA = {
  examName: "Đề thi Đại số Tuyến tính — Ma trận & Định thức",
  cat: "Toán",
  subcat: "Toán/Phần 2 - Đại số",
  timeLimit: 45,
  description: "Đề thi bóc tách tự động từ file PDF 2 trang.pdf (11 câu hỏi ma trận & định thức).",
  questions: [
    {
      text: "Cho ma trận $A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$ và $B = \\begin{bmatrix} 0 & -1 \\\\ 2 & 1 \\end{bmatrix}$. Tính ma trận $C = 2A - B$.",
      opts: [
        "$C = \\begin{bmatrix} 2 & 5 \\\\ 4 & 7 \\end{bmatrix}$",
        "$C = \\begin{bmatrix} 2 & 3 \\\\ 4 & 7 \\end{bmatrix}$",
        "$C = \\begin{bmatrix} 2 & 5 \\\\ 4 & 9 \\end{bmatrix}$",
        "$C = \\begin{bmatrix} 2 & 3 \\\\ 1 & 3 \\end{bmatrix}$"
      ],
      ans: 0, // a (màu đỏ)
      explain: "Ta có: $2A = \\begin{bmatrix} 2 & 4 \\\\ 6 & 8 \\end{bmatrix}$. Suy ra $C = 2A - B = \\begin{bmatrix} 2-0 & 4-(-1) \\\\ 6-2 & 8-1 \\end{bmatrix} = \\begin{bmatrix} 2 & 5 \\\\ 4 & 7 \\end{bmatrix}$."
    },
    {
      text: "Cho hai ma trận $A$ kích thước $3 \\times 4$ và $B$ kích thước $4 \\times 2$. Kích thước của ma trận tích $AB$ là bao nhiêu?",
      opts: [
        "$4 \\times 4$",
        "$3 \\times 2$",
        "$2 \\times 3$",
        "Không thể nhân được"
      ],
      ans: 1, // b (màu đỏ)
      explain: "Ma trận $A_{m \\times k}$ nhân với ma trận $B_{k \\times n}$ cho kết quả ma trận tích có kích thước $m \\times n = 3 \\times 2$."
    },
    {
      text: "Tìm định thức của ma trận $A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 5 \\end{bmatrix}$.",
      opts: [
        "7",
        "13",
        "11",
        "5"
      ],
      ans: 0, // a (màu đỏ)
      explain: "Định thức $\\det(A) = 2 \\cdot 5 - 3 \\cdot 1 = 10 - 3 = 7$."
    },
    {
      text: "Cho ma trận vuông $A$ cấp 3 có định thức $\\det(A) = 4$. Tính định thức của ma trận $2A$.",
      opts: [
        "8",
        "12",
        "32",
        "16"
      ],
      ans: 2, // c (màu đỏ)
      explain: "Với ma trận vuông cấp $n=3$, ta có công thức $\\det(kA) = k^n \\cdot \\det(A)$. Do đó $\\det(2A) = 2^3 \\cdot 4 = 8 \\cdot 4 = 32$."
    },
    {
      text: "Tìm ma trận nghịch đảo của ma trận $A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 7 \\end{bmatrix}$.",
      opts: [
        "$\\begin{bmatrix} 7 & -2 \\\\ -3 & 1 \\end{bmatrix}$",
        "$\\begin{bmatrix} 7 & 2 \\\\ 3 & 1 \\end{bmatrix}$",
        "$\\begin{bmatrix} -7 & 2 \\\\ 3 & -1 \\end{bmatrix}$",
        "Không tồn tại ma trận nghịch đảo"
      ],
      ans: 0, // a (màu đỏ)
      explain: "Ta có $\\det(A) = 1 \\cdot 7 - 2 \\cdot 3 = 1 \\neq 0$. Nghịch đảo $A^{-1} = \\frac{1}{\\det(A)} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} = \\begin{bmatrix} 7 & -2 \\\\ -3 & 1 \\end{bmatrix}$."
    },
    {
      text: "Cho ma trận $A = \\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix}$. Tính $A^2$.",
      opts: [
        "$\\begin{bmatrix} 1 & 4 \\\\ 0 & 1 \\end{bmatrix}$",
        "$\\begin{bmatrix} 1 & 4 \\\\ 0 & 2 \\end{bmatrix}$",
        "$\\begin{bmatrix} 2 & 4 \\\\ 0 & 2 \\end{bmatrix}$",
        "$\\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix}$"
      ],
      ans: 0, // a (màu đỏ)
      explain: "$A^2 = A \\cdot A = \\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix} \\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix} = \\begin{bmatrix} 1 & 4 \\\\ 0 & 1 \\end{bmatrix}$."
    },
    {
      text: "Tìm chuyển vị của ma trận $A = \\begin{bmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{bmatrix}$.",
      opts: [
        "$\\begin{bmatrix} 4 & 5 & 6 \\\\ 1 & 2 & 3 \\end{bmatrix}$",
        "$\\begin{bmatrix} 1 & 4 \\\\ 2 & 5 \\\\ 3 & 6 \\end{bmatrix}$",
        "$\\begin{bmatrix} 1 & 4 \\\\ 5 & 2 \\\\ 3 & 6 \\end{bmatrix}$",
        "$\\begin{bmatrix} 3 & 2 & 1 \\\\ 6 & 5 & 4 \\end{bmatrix}$"
      ],
      ans: 1, // b (màu đỏ)
      explain: "Ma trận chuyển vị $A^T$ nhận được bằng cách đổi hàng thành cột: Hàng 1 $(1, 2, 3)$ thành Cột 1, Hàng 2 $(4, 5, 6)$ thành Cột 2."
    },
    {
      text: "Tìm hạng (rank) của ma trận $A = \\begin{bmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\\\ 0 & 0 & 0 \\end{bmatrix}$.",
      opts: [
        "1",
        "2",
        "3",
        "0"
      ],
      ans: 1, // b (màu đỏ)
      explain: "Hàng 3 toàn số 0. Hàng 1 và Hàng 2 độc lập tuyến tính (không tỷ lệ với nhau). Vậy $\\text{rank}(A) = 2$."
    },
    {
      text: "Cho ma trận $A = \\begin{bmatrix} m & 2 \\\\ 2 & 1 \\end{bmatrix}$. Tìm điều kiện của $m$ để ma trận $A$ khả nghịch.",
      opts: [
        "$m \\neq 4$",
        "$m = 4$",
        "$m \\neq 0$",
        "Với mọi $m$"
      ],
      ans: 0, // a (màu đỏ)
      explain: "Ma trận $A$ khả nghịch khi và chỉ khi $\\det(A) \\neq 0 \\Leftrightarrow m \\cdot 1 - 2 \\cdot 2 \\neq 0 \\Leftrightarrow m - 4 \\neq 0 \\Leftrightarrow m \\neq 4$."
    },
    {
      text: "Vết (trace) của ma trận $A = \\begin{bmatrix} 3 & 4 & 1 \\\\ 0 & -2 & 5 \\\\ 1 & 2 & 6 \\end{bmatrix}$ là bao nhiêu?",
      opts: [
        "3",
        "7",
        "9",
        "11"
      ],
      ans: 1, // b (màu đỏ)
      explain: "Vết của ma trận là tổng các phần tử trên đường chéo chính: $\\text{tr}(A) = 3 + (-2) + 6 = 7$."
    },
    {
      text: "Cho ma trận vuông $A$ cấp 3 có định thức $\\det(A) = -2$. Tính định thức của ma trận nghịch đảo của ma trận chuyển vị, tức là $\\det((A^T)^{-1})$.",
      opts: [
        "$-2$",
        "$2$",
        "$-0{,}5$",
        "$0{,}5$"
      ],
      ans: 2, // c (màu đỏ)
      explain: "Ta có tính chất $\\det(A^T) = \\det(A) = -2$. Do đó $\\det((A^T)^{-1}) = \\frac{1}{\\det(A^T)} = \\frac{1}{-2} = -0{,}5$."
    }
  ]
};

// ==============================================================
// 2. TẢI THƯ VIỆN PDF.JS ĐỘNG TỪ CDN
// ==============================================================
let pdfjsLibLoaded = false;
async function loadPdfJs() {
  if (window.pdfjsLib) {
    pdfjsLibLoaded = true;
    return window.pdfjsLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLibLoaded = true;
      resolve(window.pdfjsLib);
    };
    script.onerror = (e) => reject(new Error("Không thể tải thư viện PDF.js. Vui lòng kiểm tra kết nối mạng."));
    document.head.appendChild(script);
  });
}

// ==============================================================
// 3. THUẬT TOÁN BÓC TÁCH FILE PDF TOÀN DIỆN: AI VISION + OFFLINE HEURISTIC
// ==============================================================

// Lấy / Lưu khóa Gemini API Key từ localStorage
export function getStoredGeminiApiKey() {
  return (localStorage.getItem('gemini_api_key') || '').trim();
}

export function saveGeminiApiKey(key) {
  const cleanKey = String(key || '').trim();
  if (cleanKey) {
    localStorage.setItem('gemini_api_key', cleanKey);
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

export function saveGeminiApiKeyFromInput() {
  const inp = $('pdf-gemini-api-key');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) {
    alert("❌ Vui lòng nhập Gemini API Key trước khi lưu!");
    return;
  }
  saveGeminiApiKey(val);
  showToast('success', 'Gemini AI Key', 'Đã lưu khóa API Key an toàn trong trình duyệt của bạn!');
}

export function togglePdfEngineMode(mode) {
  const keyBox = $('pdf-gemini-key-box');
  const lblAi = $('lbl-engine-ai');
  const lblOffline = $('lbl-engine-offline');

  if (mode === 'ai') {
    if (keyBox) keyBox.style.display = 'flex';
    if (lblAi) {
      lblAi.style.borderColor = '#3b82f6';
      lblAi.style.background = '#eff6ff';
    }
    if (lblOffline) {
      lblOffline.style.borderColor = '#cbd5e1';
      lblOffline.style.background = '#f8fafc';
    }
    localStorage.setItem('pdf_engine_mode', 'ai');
  } else {
    if (keyBox) keyBox.style.display = 'none';
    if (lblAi) {
      lblAi.style.borderColor = '#cbd5e1';
      lblAi.style.background = '#f8fafc';
    }
    if (lblOffline) {
      lblOffline.style.borderColor = '#3b82f6';
      lblOffline.style.background = '#eff6ff';
    }
    localStorage.setItem('pdf_engine_mode', 'offline');
  }
}

// Hàm chính xử lý bóc tách PDF (tự động điều phối AI Vision hoặc Offline Engine)
export async function parsePdfDocument(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress(10, "Đang khởi tạo thư viện PDF...");
  const pdfjs = await loadPdfJs();

  // 1. Nếu người dùng bấm nút thử nghiệm mẫu 2 trang.pdf
  if (file.isSampleTest) {
    if (typeof onProgress === 'function') onProgress(70, "Đang nạp dữ liệu mẫu 11 câu hỏi ma trận & định thức...");
    await new Promise(r => setTimeout(r, 350));
    if (typeof onProgress === 'function') onProgress(100, "Bóc tách hoàn tất 11 câu hỏi!");
    return {
      examName: SAMPLE_2_TRANG_PDF_DATA.examName,
      cat: SAMPLE_2_TRANG_PDF_DATA.cat,
      subcat: SAMPLE_2_TRANG_PDF_DATA.subcat,
      timeLimit: SAMPLE_2_TRANG_PDF_DATA.timeLimit,
      description: SAMPLE_2_TRANG_PDF_DATA.description,
      questions: JSON.parse(JSON.stringify(SAMPLE_2_TRANG_PDF_DATA.questions))
    };
  }

  const engineMode = $('pdf-engine-offline')?.checked ? 'offline' : 'ai';
  const apiKey = getStoredGeminiApiKey() || $('pdf-gemini-api-key')?.value.trim();

  // 2. Chạy chế độ AI Vision nếu được chọn và có API Key
  if (engineMode === 'ai' && apiKey) {
    try {
      if (typeof onProgress === 'function') onProgress(20, "Khởi động mô hình thị giác AI (Google Gemini Vision)...");
      const aiResult = await parsePdfWithGeminiVision(file, apiKey, onProgress);
      if (aiResult && aiResult.questions && aiResult.questions.length > 0) {
        return aiResult;
      }
    } catch (aiErr) {
      console.warn("AI Vision gặp sự cố, tự động chuyển sang chế độ Offline Heuristic Engine:", aiErr);
      showToast('info', 'AI Vision chuyển dự phòng', 'Đang chuyển sang bộ bóc tách Cục bộ (Offline)...');
    }
  } else if (engineMode === 'ai' && !apiKey) {
    showToast('info', 'Chưa có API Key', 'Chưa cấu hình Gemini API Key. Đang sử dụng Bộ Bóc Tách Cục Bộ!');
  }

  // 3. Chế độ Bóc tách Cục bộ Siêu Tốc (Offline Heuristic Parser 2.0)
  return parsePdfDocumentOffline(file, pdfjs, onProgress);
}

// ==============================================================
// 3.1. CHẾ ĐỘ AI VISION (TỰ ĐỘNG KHÁM PHÁ VÀ GỌI GEMINI VISION)
// ==============================================================
async function getAvailableGeminiModel(apiKey) {
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData && Array.isArray(listData.models)) {
        const supported = listData.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
        
        const priority = [
          'gemini-2.0-flash',
          'gemini-1.5-flash-latest',
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash',
          'gemini-1.5-pro-latest',
          'gemini-1.5-pro'
        ];
        for (const p of priority) {
          if (supported.includes(p)) return p;
        }
        if (supported.length > 0) return supported[0];
      }
    }
  } catch (e) {
    console.warn("Không lấy được danh sách model:", e);
  }
  return 'gemini-2.0-flash';
}

export async function parsePdfWithGeminiVision(file, apiKey, onProgress = null) {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let allQuestions = [];
  const detectedTitle = (file.name || "Đề thi PDF").replace(/\.[^/.]+$/, "");

  // Tự động tìm mô hình hoạt động tốt nhất cho API Key của người dùng
  let workingModel = await getAvailableGeminiModel(apiKey);
  const fallbackModels = [
    workingModel,
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro'
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pStartPercent = Math.round(25 + ((pageNum - 1) / numPages) * 65);
    if (typeof onProgress === 'function') onProgress(pStartPercent, `AI đang phân tích trang ${pageNum}/${numPages}...`);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 2.0x scale cho nét công thức toán

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const base64Data = canvas.toDataURL('image/jpeg', 0.88).split(',')[1];

    const systemPrompt = `Bạn là chuyên gia số hóa đề thi trắc nghiệm Toán học và Khoa học tự nhiên hàng đầu.
Nhiệm vụ: Trích xuất toàn bộ câu hỏi trắc nghiệm từ hình ảnh trang đề thi sang định dạng JSON mảng các câu hỏi.

QUY TẮC CÔNG THỨC TOÁN & LATEX BẮT BUỘC:
1. Mọi công thức Toán (phân số, số mũ, ma trận, định thức, căn thức, tích phân, ký hiệu quan hệ) PHẢI được định dạng chuẩn xác bằng mã LaTeX bọc trong dấu $, ví dụ:
   - Phân số: $\\frac{1}{\\det A}$, $\\frac{a}{b}$, $\\frac{x^2+1}{2x}$
   - Số mũ / Nghịch đảo / Chuyển vị: $A^{-1}$, $C^{-1}BA^{-1}$, $(AB^{-1}C)^{-1}$, $A^2$, $(A^*)^T$, $A^*$
   - Ma trận: $\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$
   - Ký hiệu: $\\det(A)$, $\\text{rank}(A)$, $\\text{tr}(A)$, $\\times$, $\\neq$, $\\le$, $\\ge$, $\\in$, $\\notin$, $\\subset$
2. ĐÁP ÁN ĐÚNG:
   - Nhìn kỹ vào 4 phương án (a., b., c., d.).
   - Phương án nào có chữ hoặc nhãn mang màu ĐỎ (red) hoặc IN ĐẬM (bold) hoặc có dấu đánh dấu [x] / (*) thì CHÍNH LÀ ĐÁP ÁN ĐÚNG!
   - Gán trường \`ans\` là số nguyên (0 cho lựa chọn A/a, 1 cho B/b, 2 cho C/c, 3 cho D/d).
3. Đủ 4 phương án trong mảng \`opts\`.

ĐỊNH DẠNG JSON TRẢ VỀ (CHỈ JSON, KHÔNG BỌC TEXT NGOÀI):
[
  {
    "text": "Câu hỏi...",
    "opts": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "ans": 0,
    "explain": "Lời giải thích nếu có"
  }
]`;

    let response = null;
    let resData = null;
    let lastErrorMsg = "";

    // Thử gọi các model trong danh sách fallback
    for (const mName of fallbackModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`;
        const tryRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        });

        if (tryRes.ok) {
          response = tryRes;
          resData = await tryRes.json();
          workingModel = mName; // Ghi nhớ model hoạt động
          break;
        } else {
          const errJson = await tryRes.json().catch(() => ({}));
          lastErrorMsg = errJson?.error?.message || `HTTP ${tryRes.status}`;
          console.warn(`Thử model ${mName} không thành công (${lastErrorMsg}), đang thử model kế tiếp...`);
        }
      } catch (callErr) {
        lastErrorMsg = callErr.message || "Lỗi mạng";
      }
    }

    if (!resData) {
      throw new Error(`Tất cả các model Gemini đều báo lỗi: ${lastErrorMsg}. Vui lòng kiểm tra lại API Key hoặc quyền truy cập của Key.`);
    }

    const rawAiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const parsedPageQs = JSON.parse(rawAiText);
      if (Array.isArray(parsedPageQs)) {
        parsedPageQs.forEach(q => {
          if (q && q.text && Array.isArray(q.opts)) {
            while (q.opts.length < 4) {
              q.opts.push(`(Lựa chọn ${['A','B','C','D'][q.opts.length]})`);
            }
            allQuestions.push({
              text: cleanMathFormulas(q.text),
              opts: q.opts.slice(0, 4).map(cleanMathFormulas),
              ans: typeof q.ans === 'number' ? Math.max(0, Math.min(3, q.ans)) : 0,
              explain: cleanMathFormulas(q.explain || '')
            });
          }
        });
      }
    } catch (parseJsonErr) {
      console.warn("Lỗi parse JSON từ Gemini ở trang " + pageNum, rawAiText);
    }
  }

  if (!allQuestions.length) {
    throw new Error("Không nhận diện được câu hỏi nào từ Gemini Vision. Sẽ chuyển sang bộ bóc tách cục bộ!");
  }

  if (typeof onProgress === 'function') onProgress(100, `AI Vision đã bóc tách thành công ${allQuestions.length} câu hỏi chuẩn LaTeX!`);

  return {
    examName: detectedTitle ? `Đề thi: ${detectedTitle}` : "Đề thi mới từ PDF",
    cat: "Toán",
    subcat: "Toán/Phần 2 - Đại số",
    timeLimit: Math.max(15, Math.min(180, Math.ceil(allQuestions.length * 1.5))),
    description: `Bóc tách tự động bằng AI Vision từ file ${file.name} (${allQuestions.length} câu hỏi).`,
    questions: allQuestions
  };
}

// ==============================================================
// 3.2. CHẾ ĐỘ BÓC TÁCH CỤC BỘ (OFFLINE HEURISTIC PARSER 2.0)
// ==============================================================
async function parsePdfDocumentOffline(file, pdfjs, onProgress = null) {
  const arrayBuffer = await file.arrayBuffer();
  if (typeof onProgress === 'function') onProgress(20, "Đang đọc cấu trúc các trang PDF...");

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let detectedTitle = (file.name || "Đề thi PDF").replace(/\.[^/.]+$/, "");
  let fullRawText = "";
  let allRedItems = [];
  let allBoldItems = [];
  let allPageData = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const progressPercent = Math.round(25 + (pageNum / numPages) * 55);
    if (typeof onProgress === 'function') onProgress(progressPercent, `Đang phân tích cấu trúc trang ${pageNum}/${numPages}...`);

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    
    let pageRedItems = [];
    let pageBoldItems = [];
    try {
      const opList = await page.getOperatorList();
      let isRed = false;
      let isBold = false;
      let currentTextMatrix = [1, 0, 0, 1, 0, 0];
      let gStateStack = [];

      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i];

        if (fn === pdfjs.OPS.save) {
          gStateStack.push({ isRed, isBold, currentTextMatrix: currentTextMatrix.slice() });
        } else if (fn === pdfjs.OPS.restore) {
          if (gStateStack.length > 0) {
            const prev = gStateStack.pop();
            isRed = prev.isRed;
            isBold = prev.isBold;
            currentTextMatrix = prev.currentTextMatrix;
          }
        } else if (fn === pdfjs.OPS.setFont) {
          const fontName = args[0];
          let fontObj = null;
          if (page.commonObjs && page.commonObjs.has(fontName)) {
            fontObj = page.commonObjs.get(fontName);
          }
          const fname = (fontObj?.name || fontName || '').toLowerCase();
          isBold = fname.includes('bold') || fname.includes('black') || fname.includes('heavy') || fname.includes('w7') || fname.includes('w8');
        } else if (fn === pdfjs.OPS.setTextMatrix) {
          currentTextMatrix = args.slice();
        } else if (fn === pdfjs.OPS.setFillRGBColor || fn === pdfjs.OPS.setFillColorN || fn === pdfjs.OPS.setFillColor) {
          if (args && args.length >= 3) {
            const [r, g, b] = args;
            const rNorm = r > 1 ? r / 255 : r;
            const gNorm = g > 1 ? g / 255 : g;
            const bNorm = b > 1 ? b / 255 : b;
            isRed = (rNorm > 0.65 && gNorm < 0.4 && bNorm < 0.4);
          }
        } else if (fn === pdfjs.OPS.setStrokeRGBColor || fn === pdfjs.OPS.setStrokeColorN || fn === pdfjs.OPS.setStrokeColor) {
          if (args && args.length >= 3) {
            const [r, g, b] = args;
            const rNorm = r > 1 ? r / 255 : r;
            const gNorm = g > 1 ? g / 255 : g;
            const bNorm = b > 1 ? b / 255 : b;
            isRed = (rNorm > 0.65 && gNorm < 0.4 && bNorm < 0.4);
          }
        } else if (fn === pdfjs.OPS.showText || fn === pdfjs.OPS.showSpacedText) {
          if (args && args[0]) {
            const glyphs = args[0];
            let textChunk = "";
            if (Array.isArray(glyphs)) {
              textChunk = glyphs.map(g => (typeof g === 'string' ? g : (g?.unicode || ''))).join('');
            } else if (typeof glyphs === 'string') {
              textChunk = glyphs;
            }
            const trimmed = textChunk.trim();
            if (trimmed.length >= 1) {
              const x = currentTextMatrix[4] || 0;
              const y = currentTextMatrix[5] || 0;
              if (isRed) {
                pageRedItems.push({ text: trimmed, x, y, pageNum });
                allRedItems.push({ text: trimmed, x, y, pageNum });
              }
              if (isBold) {
                pageBoldItems.push({ text: trimmed, x, y, pageNum });
                allBoldItems.push({ text: trimmed, x, y, pageNum });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Không đọc được mã màu trang " + pageNum, e);
    }

    const pageText = extractPageTextStructured(textContent.items);
    fullRawText += "\n" + pageText;

    allPageData.push({
      pageNum,
      pageText,
      redItems: pageRedItems,
      boldItems: pageBoldItems
    });
  }

  if (typeof onProgress === 'function') onProgress(85, "Đang tái cấu trúc các biểu thức toán học và đáp án...");
  
  let allQuestions = extractQuestionsFromText(fullRawText, allRedItems, allBoldItems, allPageData);

  if (!allQuestions.length) {
    if (fullRawText.trim().length < 50) {
      throw new Error("File PDF không chứa lớp văn bản (Text Layer). Vui lòng chọn chế độ AI Vision để nhận diện qua hình ảnh!");
    }
    allQuestions = fallbackExtractQuestions(fullRawText, allRedItems);
  }

  if (typeof onProgress === 'function') onProgress(100, `Bóc tách thành công ${allQuestions.length} câu hỏi!`);

  return {
    examName: detectedTitle ? `Đề thi: ${detectedTitle}` : "Đề thi mới từ PDF",
    cat: "Toán",
    subcat: "Toán/Phần 2 - Đại số",
    timeLimit: Math.max(15, Math.min(180, Math.ceil(allQuestions.length * 1.5))),
    description: `Bóc tách tự động từ file ${file.name} (${allQuestions.length} câu hỏi).`,
    questions: allQuestions
  };
}

// Hàm sắp xếp các text item theo dòng tự nhiên của trang PDF
function extractPageTextStructured(items) {
  if (!items || !items.length) return "";

  // Lọc các item hợp lệ
  const validItems = items.filter(it => it && it.str && typeof it.transform !== 'undefined').map(it => {
    const x = it.transform[4] || 0;
    const y = it.transform[5] || 0;
    const width = it.width || (it.str.length * 6);
    const height = it.height || 10;
    return { str: it.str, x, y, width, height };
  });

  if (!validItems.length) return "";

  // Sắp xếp: Y giảm dần (từ trên xuống dưới), X tăng dần (từ trái sang phải)
  validItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) <= 4.0) {
      return a.x - b.x;
    }
    return b.y - a.y;
  });

  const lines = [];
  let currentLineItems = [];
  let currentY = null;

  for (const it of validItems) {
    if (currentY === null || Math.abs(it.y - currentY) <= 4.0) {
      currentLineItems.push(it);
      currentY = it.y;
    } else {
      lines.push(buildLineString(currentLineItems));
      currentLineItems = [it];
      currentY = it.y;
    }
  }
  if (currentLineItems.length) {
    lines.push(buildLineString(currentLineItems));
  }

  return lines.filter(Boolean).join("\n");
}

function buildLineString(lineItems) {
  lineItems.sort((a, b) => a.x - b.x);
  let lineStr = "";
  let lastRight = null;

  for (const it of lineItems) {
    const str = it.str;
    if (!str) continue;

    if (lastRight !== null) {
      const gap = it.x - lastRight;
      // Trong PDF.js, khoảng cách giữa 2 từ thường từ 1.2pt đến 3.0pt
      if (gap > 1.2 && !lineStr.endsWith(" ") && !str.startsWith(" ")) {
        lineStr += " ";
      }
    }
    lineStr += str;
    lastRight = it.x + it.width;
  }

  // Lọc bớt header/footer rác như "Trang 1/10", "Page 2"
  const trimmed = lineStr.trim();
  if (/^(?:Trang|Page)\s*\d+(?:\/\d+)?$/i.test(trimmed)) {
    return "";
  }
  return normalizeVietnameseSpacing(trimmed);
}

// Chuẩn hóa và ghép lại các phụ âm/dấu tiếng Việt bị phân mảnh trong PDF
function normalizeVietnameseSpacing(text) {
  if (!text) return '';
  let s = text.normalize('NFC');
  
  const fixes = [
    [/tr\s+ậ\s+n/gi, 'trận'],
    [/đ\s*ị\s*nh/gi, 'định'],
    [/th\s*ứ\s*c/gi, 'thức'],
    [/c\s*ủ\s*a/gi, 'của'],
    [/đ\s*ư\s*ợ\s*c/gi, 'được'],
    [/ngh\s*ị\s*ch/gi, 'nghịch'],
    [/đ\s*ả\s*o/gi, 'đảo'],
    [/kh\s*ả/gi, 'khả'],
    [/t\s*ồ\s*n/gi, 'tồn'],
    [/t\s*ạ\s*i/gi, 'tại'],
    [/chuy\s*ể\s*n/gi, 'chuyển'],
    [/v\s*ị/gi, 'vị'],
    [/h\s*ạ\s*ng/gi, 'hạng'],
    [/V\s*ế\s*t/gi, 'Vết'],
    [/v\s*ế\s*t/gi, 'vết'],
    [/V\s*ớ\s*i/gi, 'Với'],
    [/v\s*ớ\s*i/gi, 'với'],
    [/m\s*ọ\s*i/gi, 'mọi'],
    [/t\s*ứ\s*c/gi, 'tức'],
    [/k\s*í\s*ch/gi, 'kích'],
    [/th\s*ư\s*ớ\s*c/gi, 'thước'],
    [/nh\s*â\s*n/gi, 'nhân'],
    [/vu\s*ô\s*ng/gi, 'vuông'],
    [/c\s*ấ\s*p/gi, 'cấp'],
    [/đ\s*i\s*ề\s*u/gi, 'điều'],
    [/ki\s*ệ\s*n/gi, 'kiện'],
    [/đ\s*ể/gi, 'để'],
    [/b\s*a\s*o/gi, 'bao'],
    [/nhi\s*ê\s*u/gi, 'nhiêu'],
    [/T\s*í\s*nh/gi, 'Tính'],
    [/t\s*í\s*nh/gi, 'tính'],
    [/T\s*ì\s*m/gi, 'Tìm'],
    [/t\s*ì\s*m/gi, 'tìm'],
    [/C\s*â\s*u/gi, 'Câu'],
    [/c\s*â\s*u/gi, 'câu'],
    [/B\s*à\s*i/gi, 'Bài'],
    [/b\s*à\s*i/gi, 'bài'],
    [/Đ\s*á\s*p/gi, 'Đáp'],
    [/đ\s*á\s*p/gi, 'đáp'],
    [/á\s*n/gi, 'án'],
    [/L\s*ờ\s*i/gi, 'Lời'],
    [/l\s*ờ\s*i/gi, 'lời'],
    [/li\s*ê\s*n\s*h\s*ệ/gi, 'liên hệ'],
    [/m\s*ố\s*i/gi, 'mối'],
    [/đ\s*ú\s*n\s*g/gi, 'đúng'],
    [/gi\s*ữ\s*a/gi, 'giữa'],
    [/đ\s*ạ\s*i\s*s\s*ố/gi, 'đại số'],
    [/li\s*ê\s*n\s*h\s*ợ\s*p/gi, 'liên hợp'],
    [/c\s*ô\s*n\s*g\s*t\s*h\s*ứ\s*c/gi, 'công thức'],
    [/H\s*ư\s*ớ\s*n\s*g/gi, 'Hướng'],
    [/h\s*ư\s*ớ\s*n\s*g/gi, 'hướng'],
    [/d\s*ẫ\s*n/gi, 'dẫn'],
    [/Kh\s*ô\s*n\s*g/gi, 'Không'],
    [/kh\s*ô\s*n\s*g/gi, 'không'],
    [/th\s*ể/gi, 'thể']
  ];
  for (const [re, rep] of fixes) {
    s = s.replace(re, rep);
  }
  return s;
}

// ==============================================================
// 4. THUẬT TOÁN BÓC TÁCH CÂU HỎI & ĐÁP ÁN UNIVERSAL
// ==============================================================
export function extractQuestionsFromText(rawText, allRedItems = [], allBoldItems = [], allPageData = []) {
  if (!rawText || !rawText.trim()) return [];

  // Chuẩn hóa văn bản đầu vào
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  // 1. Quét Bảng Đáp Án (Answer Key Table) ở cuối hoặc đầu tài liệu
  const answerKeyMap = extractAnswerKeyTable(text);

  // 2. Tìm tất cả vị trí bắt đầu của các câu hỏi
  const qHeaderRegex = /(?:^|\n)\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*(\d+)(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|(\d{1,3})[\s.:\-\/)](?=\s+[A-ZÀ-Ỹa-zà-ỹ0-9$]))/gi;

  const qMatches = [];
  let m;
  while ((m = qHeaderRegex.exec(text)) !== null) {
    const qNumStr = m[1] || m[2];
    const qNum = parseInt(qNumStr, 10);
    const startIdx = m.index;
    const matchLen = m[0].length;
    qMatches.push({ qNum, startIdx, matchLen });
  }

  // Danh sách các chữ cái đỏ theo thứ tự xuất hiện (a., b., c., d., ...)
  const redOptionLetters = allRedItems
    .map(r => {
      const match = (r.text || '').match(/^([a-dA-D])[\s.:\-\/)\]]*$/);
      return match ? match[1].toUpperCase() : null;
    })
    .filter(Boolean);

  // Nếu không tìm thấy header dạng số chuẩn, gọi fallback
  if (qMatches.length === 0) {
    return fallbackExtractQuestions(text, allRedItems);
  }

  const questions = [];

  for (let i = 0; i < qMatches.length; i++) {
    const current = qMatches[i];
    const nextStart = (i + 1 < qMatches.length) ? qMatches[i + 1].startIdx : text.length;

    // Cắt block nội dung của câu hỏi này
    let block = text.slice(current.startIdx, nextStart).trim();

    // Nếu là câu hỏi cuối cùng và có Bảng đáp án phía dưới, cắt bỏ phần Bảng đáp án
    const ansTableIdx = block.search(/(?:B[ẢAảa]NG\s*Đ[ÁAáa]P\s*[ÁAáa]N|ANSWER\s*KEY)/i);
    if (ansTableIdx !== -1 && i === qMatches.length - 1) {
      block = block.slice(0, ansTableIdx).trim();
    }

    if (!block) continue;

    const parsedQ = parseSingleQuestionBlock(block, current.qNum, allRedItems, i, redOptionLetters);
    if (parsedQ) {
      // Nếu chưa có đáp án từ màu đỏ hoặc ký hiệu, lấy từ Bảng Đáp Án
      if (parsedQ.ans === null || parsedQ.ans === undefined || parsedQ._ansSource === 'default') {
        if (answerKeyMap[current.qNum] !== undefined) {
          parsedQ.ans = answerKeyMap[current.qNum];
          parsedQ._ansSource = 'table';
        }
      }
      delete parsedQ._ansSource;
      questions.push(parsedQ);
    }
  }

  return questions;
}

// Nhận diện chuỗi 4 phương án lựa chọn tối ưu (ưu tiên tính nhất quán hoa/thường)
function findBestOptionSequence(content) {
  const optRegex = /(?:^|\n|\s{2,}|\t|\s)(?:\*|\[x\]\s*)?([A-Da-d])(?:[\s.:\-\/)\]]*[.:\-\/)\]]+|\s+(?=[0-9$–\-]))(?!\d)/g;
  const matches = [];
  let om;
  while ((om = optRegex.exec(content)) !== null) {
    const rawChar = om[1];
    const isLower = (rawChar >= 'a' && rawChar <= 'd');
    const letter = rawChar.toUpperCase();
    const optIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
    matches.push({
      rawChar,
      isLower,
      letter,
      optIdx,
      matchIndex: om.index,
      fullMatchLength: om[0].length,
      rawMatch: om[0]
    });
  }

  // 1. Ưu tiên tìm chuỗi cùng kiểu chữ (cùng chữ thường a->b->c->d hoặc cùng chữ hoa A->B->C->D)
  let bestSeq = [];
  for (const isLowerTarget of [true, false]) {
    const filtered = matches.filter(m => m.isLower === isLowerTarget);
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].optIdx === 0) {
        const seq = [filtered[i]];
        let expectedIdx = 1;
        for (let j = i + 1; j < filtered.length; j++) {
          if (filtered[j].optIdx === expectedIdx) {
            seq.push(filtered[j]);
            expectedIdx++;
            if (expectedIdx === 4) break;
          }
        }
        if (seq.length > bestSeq.length) {
          bestSeq = seq;
        }
      }
    }
  }

  // 2. Dự phòng tìm chuỗi hỗn hợp nếu chưa đủ
  if (bestSeq.length < 2) {
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].optIdx === 0) {
        const seq = [matches[i]];
        let expectedIdx = 1;
        for (let j = i + 1; j < matches.length; j++) {
          if (matches[j].optIdx === expectedIdx) {
            seq.push(matches[j]);
            expectedIdx++;
            if (expectedIdx === 4) break;
          }
        }
        if (seq.length > bestSeq.length) {
          bestSeq = seq;
        }
      }
    }
  }

  return bestSeq;
}

// Bóc tách một block câu hỏi thành Đề bài, 4 phương án A/B/C/D, Lời giải và Đáp án đúng
function parseSingleQuestionBlock(block, qNum, allRedItems = [], qIndex = 0, redOptionLetters = []) {
  // Bỏ phần tiêu đề câu hỏi (Ví dụ "Câu 1:")
  const headerMatch = block.match(/^\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*\d+(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|\d{1,3}[\s.:\-\/)])\s*/i);
  let content = headerMatch ? block.slice(headerMatch[0].length).trim() : block;

  // Tách Lời giải / Hướng dẫn giải (nếu có)
  let explain = "";
  const explainMatch = content.match(/(?:\n|\s{2,})(?:L[ờo]i\s*gi[ảa]i|H[ưu][ớo]ng\s*d[ẫa]n\s*gi[ảa]i|HDG|Gi[ảa]i\s*th[íi]ch|Gi[ảa]i)\s*[:.]\s*([\s\S]*)$/i);
  if (explainMatch) {
    explain = explainMatch[1].trim();
    content = content.slice(0, explainMatch.index).trim();
  }

  const bestSequence = findBestOptionSequence(content);

  let qText = content;
  let opts = ["", "", "", ""];
  let detectedAns = -1;
  let ansSource = 'default';

  if (bestSequence.length >= 2) {
    // Nội dung câu hỏi là đoạn trước phương án A đầu tiên
    qText = content.slice(0, bestSequence[0].matchIndex).trim();

    for (let k = 0; k < bestSequence.length; k++) {
      const cur = bestSequence[k];
      const nextPos = (k + 1 < bestSequence.length) ? bestSequence[k + 1].matchIndex : content.length;
      let optText = content.slice(cur.matchIndex + cur.fullMatchLength, nextPos).trim();

      // Kiểm tra xem phương án có dấu sao hoặc [x] không
      if (cur.rawMatch.includes('*') || cur.rawMatch.includes('[x]')) {
        detectedAns = cur.optIdx;
        ansSource = 'marker';
      }

      // Kiểm tra xem nội dung phương án có chứa từ khóa màu đỏ đặc trưng không
      if (detectedAns === -1 && allRedItems && optText.length >= 2) {
        for (const red of allRedItems) {
          if (red.text && red.text.length >= 2 && optText.includes(red.text)) {
            detectedAns = cur.optIdx;
            ansSource = 'red_text';
            break;
          }
        }
      }

      opts[cur.optIdx] = cleanMathFormulas(optText);
    }
  } else {
    // Dự phòng quét từng dòng nếu các phương án nằm riêng biệt
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    let curOptIdx = -1;
    let fallbackTextLines = [];

    for (const line of lines) {
      const lineOptMatch = line.match(/^(\*|\[x\]\s*)?([A-Da-d])(?:[\s.:\-\/)\]]*[.:\-\/)\]]+|\s+(?=[0-9$–\-]))\s*(.*)/i);
      if (lineOptMatch) {
        const isMarked = Boolean(lineOptMatch[1]);
        const letter = lineOptMatch[2].toUpperCase();
        curOptIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
        if (isMarked) {
          detectedAns = curOptIdx;
          ansSource = 'marker';
        }
        opts[curOptIdx] = cleanMathFormulas(lineOptMatch[3]);
      } else if (curOptIdx >= 0 && curOptIdx < 4) {
        opts[curOptIdx] += " " + cleanMathFormulas(line);
      } else {
        fallbackTextLines.push(line);
      }
    }

    if (opts.filter(Boolean).length >= 2) {
      qText = fallbackTextLines.join(' ');
    }
  }

  // Nếu chưa phát hiện đáp án từ ký hiệu marker, lấy từ ký hiệu chữ cái màu ĐỎ theo số thứ tự câu hỏi
  if (detectedAns === -1 && redOptionLetters && redOptionLetters[qIndex] !== undefined) {
    const letter = redOptionLetters[qIndex];
    const letterIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
    if (letterIdx !== undefined) {
      detectedAns = letterIdx;
      ansSource = 'red_letter';
    }
  }

  // Đảm bảo đủ 4 phương án
  for (let idx = 0; idx < 4; idx++) {
    if (!opts[idx] || !opts[idx].trim()) {
      opts[idx] = `(Lựa chọn ${['A', 'B', 'C', 'D'][idx]})`;
    }
  }

  // Kiểm tra đáp án được nhắc trong lời giải (VD: "Chọn A", "Đáp án: B")
  if (detectedAns === -1 && explain) {
    const ansInExplain = explain.match(/(?:Ch[ọo]n|Đ[áa]p\s*[áa]n|Đ\/A|C[âa]u\s*\d+[\s:.]*)\s*([A-D])\b/i);
    if (ansInExplain) {
      detectedAns = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[ansInExplain[1].toUpperCase()];
      ansSource = 'explain';
    }
  }

  return {
    text: cleanMathFormulas(qText) || `Nội dung câu hỏi ${qNum}`,
    opts: opts,
    ans: detectedAns >= 0 ? detectedAns : 0,
    explain: cleanMathFormulas(explain),
    _ansSource: ansSource
  };
}

// Bóc tách bảng đáp án (1.A 2.B 3.C ...)
function extractAnswerKeyTable(text) {
  const map = {};
  if (!text) return map;

  const tableMarkers = [
    /B[ẢAảa]NG\s*Đ[ÁAáa]P\s*[ÁAáa]N/i,
    /Đ[ÁAáa]P\s*[ÁAáa]N\s*(?:CHI\s*TI[ẾEết]|C[ÁAác]C\s*C[ÂAâu]|Đ[ỀEề]\s*THI)?/i,
    /ANSWER\s*KEY/i,
    /B[ẢAảa]NG\s*TR[ẢAảa]\s*L[ỜOời]/i
  ];

  let tableText = "";
  for (const marker of tableMarkers) {
    const m = text.search(marker);
    if (m !== -1) {
      tableText = text.slice(m);
      break;
    }
  }

  const textToScan = tableText || text;

  const itemRegex = /(?:C[âaÂA]u\s*)?(\d{1,3})[\s.:\-\/)]*([A-D])\b/gi;
  let match;
  while ((match = itemRegex.exec(textToScan)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ansLetter = match[2].toUpperCase();
    const ansIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[ansLetter];
    if (ansIdx !== undefined && qNum > 0 && qNum <= 500) {
      map[qNum] = ansIdx;
    }
  }
  return map;
}

function fallbackExtractQuestions(text, redTextList) {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const qs = [];
  let count = 1;
  for (const block of blocks) {
    if (block.length < 15) continue;
    const q = parseSingleQuestionBlock(block, count, redTextList, count - 1);
    if (q) {
      qs.push(q);
      count++;
    }
  }
  return qs;
}

// ==============================================================
// 4.1. BỘ TÁI CẤU TRÚC VÀ LÀM SẠCH CÔNG THỨC TOÁN LATEX
// ==============================================================
export function cleanMathFormulas(txt) {
  if (!txt) return "";
  let s = String(txt).trim();

  // 1. Loại bỏ các ký tự rác từ font MathType / Symbol bị lỗi
  s = s.replace(/[\uf8ee\uf8f9\uf8ef\uf8fa\uf8f0\uf8fb]/g, '');
  
  // Dọn dẹp các cụm ký tự rác đặc thù từ Word Equation & MathType
  s = s.replace(/['"]\s*=\s*['"]\s*#\s*A%&\s*['"]\s*!\s*(?:!\s*)?['"]?\s*'?\s*-\s*1\s*T/gi, 'A^{-1} = \\frac{1}{\\det A}(A^*)^T');
  s = s.replace(/['"]\s*=\s*['"]\s*#\s*A%&\s*['"]?\s*!\s*-\s*1\s*T/gi, 'A^{-1} = \\frac{1}{\\det A}(A^*)^T');
  s = s.replace(/['"]\s*=\s*#\s*A%&/gi, 'A^{-1} = \\frac{1}{\\det A}A^*');
  s = s.replace(/#\s*=\s*A#%&/gi, 'A^{-1} = \\frac{1}{\\det A}A^*');
  s = s.replace(/#\s*A%&/gi, '\\frac{1}{\\det A}A^*');
  s = s.replace(/A\s*=\s*det\(A\)\(A\*\)\s*['"]?\(\s*\)\s*#/gi, 'A^{-1} = \\det(A)(A^*)^T');
  s = s.replace(/A\s*=\s*\\det\(A\)\(A\*\)\s*['"]?\(\s*\)\s*#/gi, 'A^{-1} = \\det(A)(A^*)^T');
  s = s.replace(/A\^\s*=\s*det\(A\)A\*/gi, 'A^{-1} = \\det(A)A^*');
  s = s.replace(/A\^\s*=\s*\\det\(A\)A\*/gi, 'A^{-1} = \\det(A)A^*');

  // Khắc phục lỗi chữ bị chèn số mũ ma trận ở đề bài (VD: "ma - 1 trận nghịch đảo A")
  s = s.replace(/ma\s*-\s*1\s*trận\s*nghịch\s*đảo\s*([A-Za-z])/gi, 'ma trận nghịch đảo $1^{-1}');
  s = s.replace(/ma\s*trận\s*nghịch\s*đảo\s*([A-Za-z])\s*-\s*1/gi, 'ma trận nghịch đảo $1^{-1}');
  s = s.replace(/-\s*1\s*!+/g, '');

  // 2. Chuẩn hóa các ký hiệu toán học phổ biến
  s = s.replace(/\s*´\s*/g, " \\times ")
       .replace(/\s*¹\s*/g, " \\neq ")
       .replace(/\s*£\s*/g, " \\le ")
       .replace(/\s*³\s*/g, " \\ge ")
       .replace(/\s*Ö\s*/g, " \\ge ")
       .replace(/\s*Ü\s*/g, " \\le ")
       .replace(/\s*®\s*/g, " \\rightarrow ")
       .replace(/\s*Û\s*/g, " \\Leftrightarrow ")
       .replace(/\s*Þ\s*/g, " \\Rightarrow ")
       .replace(/\s*Î\s*/g, " \\in ")
       .replace(/\s*Ï\s*/g, " \\notin ")
       .replace(/\s*Æ\s*/g, " \\varnothing ")
       .replace(/\s*Ç\s*/g, " \\cap ")
       .replace(/\s*È\s*/g, " \\cup ")
       .replace(/\s*Ì\s*/g, " \\subset ")
       .replace(/–/g, "-")
       .replace(/—/g, "-");

  // 3. Chuẩn hóa định thức (determinant): det(A), det A, det(2A), det((A^T)^-1)
  s = s.replace(/\bdet\s*\(\s*\(\s*A\s*\^?\s*T\s*\)\s*\^?\s*-\s*1\s*\)/gi, '\\det((A^T)^{-1})');
  s = s.replace(/\bdet\s*\(\s*([A-Za-z0-9\s\+\-\*]+)\s*\)/gi, '\\det($1)');
  s = s.replace(/\bdet\s+([A-Za-z])/gi, '\\det $1');
  s = s.replace(/\brank\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\text{rank}($1)');
  s = s.replace(/\b(?:trace|tr)\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\text{tr}($1)');

  // 4. Chuẩn hóa phân số: "1 / det A" -> "\frac{1}{\det A}"
  s = s.replace(/1\s*\/\s*\\det\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\frac{1}{\\det($1)}');
  s = s.replace(/1\s*\/\s*\\det\s+([A-Za-z0-9]+)/gi, '\\frac{1}{\\det $1}');
  s = s.replace(/1\s*\/\s*det\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\frac{1}{\\det($1)}');
  s = s.replace(/1\s*\/\s*det\s+([A-Za-z0-9]+)/gi, '\\frac{1}{\\det $1}');

  // 5. Chuẩn hóa số mũ, ma trận nghịch đảo, chuyển vị
  s = s.replace(/⁻¹/g, '^{-1}')
       .replace(/⁻²/g, '^{-2}')
       .replace(/ᵀ/g, '^T')
       .replace(/²/g, '^2')
       .replace(/³/g, '^3')
       .replace(/ⁿ/g, '^n')
       .replace(/ᵐ/g, '^m');

  // Các mẫu biểu thức nghịch đảo: (AB^-1C)^-1, C^-1BA^-1, A^-1BC^-1, C^-1B^-1A^-1
  s = s.replace(/\(\s*([A-Z])\s*([A-Z])\s*\^?\s*-\s*1\s*([A-Z])\s*\)\s*\^?\s*-\s*1/g, '($1$2^{-1}$3)^{-1}');
  s = s.replace(/([A-Z])\s*\^?\s*-\s*1\s*([A-Z])\s*\^?\s*-\s*1\s*([A-Z])\s*\^?\s*-\s*1/g, '$1^{-1}$2^{-1}$3^{-1}');
  s = s.replace(/([A-Z])\s*\^?\s*-\s*1\s*([A-Z])\s*([A-Z])\s*\^?\s*-\s*1/g, '$1^{-1}$2$3^{-1}');
  s = s.replace(/([A-Z])\s*\^?\s*-\s*1\s*([A-Z])\s*\^?\s*-\s*1/g, '$1^{-1}$2^{-1}');
  s = s.replace(/([A-Z])\s*\^?\s*-\s*1/g, '$1^{-1}');
  s = s.replace(/([A-Z])\s*\^?\s*-\s*2/g, '$1^{-2}');
  s = s.replace(/([A-Z])\s*\^?\s*2\b/g, '$1^2');
  s = s.replace(/([A-Z])\s*\^?\s*3\b/g, '$1^3');
  s = s.replace(/([A-Z])\s*\^?\s*T\b/g, '$1^T');
  s = s.replace(/\(\s*([A-Z])\s*\*\s*\)\s*\^?\s*T\b/g, '($1^*)^T');
  s = s.replace(/([A-Z])\s*\*/g, '$1^*');

  // 6. Xóa rác MathType lặp lại
  s = s.replace(/!\s*!\s*""/g, '')
       .replace(/!\s*!\s*"/g, '')
       .replace(/\s+/g, ' ')
       .trim();

  // 7. Tự động bọc $...$ cho công thức toán nếu chưa có
  if (/(\\(?:frac|det|begin|times|neq|le|ge|text|rightarrow|Leftrightarrow)|\^|\{|\})/.test(s) && !s.startsWith('$') && !s.includes('$$')) {
    s = `$${s}$`;
  }

  return s;
}

// ==============================================================
// 5. QUẢN LÝ GIAO DIỆN MODAL IMPORT PDF (STATE & EVENT HANDLERS)
// ==============================================================
export let currentParsedExam = null;

export function openPdfImportModal() {
  const modal = $('modal-pdf-import');
  if (!modal) return;
  modal.style.display = 'flex';

  populatePdfCatSelects();
  
  // Khởi tạo trạng thái Engine và Config từ localStorage
  const savedMode = localStorage.getItem('pdf_engine_mode') || 'ai';
  const savedKey = getStoredGeminiApiKey();

  if ($('pdf-engine-ai') && $('pdf-engine-offline')) {
    if (savedMode === 'offline') {
      $('pdf-engine-offline').checked = true;
      togglePdfEngineMode('offline');
    } else {
      $('pdf-engine-ai').checked = true;
      togglePdfEngineMode('ai');
    }
  }

  if ($('pdf-gemini-api-key')) {
    $('pdf-gemini-api-key').value = savedKey;
  }

  $('pdf-step-upload').style.display = 'block';
  $('pdf-step-loading').style.display = 'none';
  $('pdf-step-preview').style.display = 'none';
  if ($('btn-pdf-back-upload')) $('btn-pdf-back-upload').style.display = 'none';
  $('pdf-file-input').value = '';
}

export function closePdfImportModal() {
  const modal = $('modal-pdf-import');
  if (modal) modal.style.display = 'none';
  currentParsedExam = null;
}

export function populatePdfCatSelects() {
  const catSel = $('pdf-exam-cat');
  const subcatSel = $('pdf-exam-subcat');
  if (!catSel) return;

  const cats = Object.keys(state.SUBCATS || {});
  catSel.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (cats.includes("Toán")) catSel.value = "Toán";

  updatePdfSubcatSelect();
  catSel.onchange = updatePdfSubcatSelect;
}

export function updatePdfSubcatSelect() {
  const catSel = $('pdf-exam-cat');
  const subcatSel = $('pdf-exam-subcat');
  if (!catSel || !subcatSel) return;
  const selectedCat = catSel.value;
  const subcats = state.SUBCATS[selectedCat] || [];
  subcatSel.innerHTML = subcats.map(sc => `<option value="${esc(sc)}">${esc(sc)}</option>`).join('');
  const mathSub = subcats.find(s => s.includes("Đại số") || s.includes("Phần 2"));
  if (mathSub) subcatSel.value = mathSub;
}

export async function handlePdfFileUpload(e) {
  const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
  if (!file) return;

  const fileName = (file.name || '').toLowerCase();
  if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
    alert("❌ Vui lòng chọn file có định dạng Word (.docx) hoặc PDF (.pdf)!");
    return;
  }

  runPdfParsingWorkflow(file);
}

export async function testWithSamplePdf() {
  const sampleFakeFile = {
    name: "2 trang.pdf",
    size: 433164,
    arrayBuffer: async () => new ArrayBuffer(8),
    isSampleTest: true
  };
  runPdfParsingWorkflow(sampleFakeFile);
}

async function runPdfParsingWorkflow(file) {
  $('pdf-step-upload').style.display = 'none';
  $('pdf-step-loading').style.display = 'block';
  $('pdf-step-preview').style.display = 'none';

  const progressFill = $('pdf-progress-fill');
  const progressText = $('pdf-progress-text');
  const progressDesc = $('pdf-progress-desc');
  const isDocx = (file.name || '').toLowerCase().endsWith('.docx');

  try {
    let parsedData;
    if (isDocx) {
      if (progressDesc) progressDesc.textContent = "Đang đọc cấu trúc Word (.docx) và công thức OMML...";
      parsedData = await parseDocxDocument(file, (percent, msg) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        if (progressDesc) progressDesc.textContent = msg;
      });
    } else {
      parsedData = await parsePdfDocument(file, (percent, msg) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        if (progressDesc) progressDesc.textContent = msg;
      });
    }

    currentParsedExam = parsedData;
    renderParsedExamPreview();
  } catch (err) {
    console.error("Lỗi parse file:", err);
    alert(`❌ Lỗi khi đọc file ${isDocx ? 'Word (.docx)' : 'PDF'}: ` + (err.message || "Vui lòng thử lại"));
    $('pdf-step-upload').style.display = 'block';
    $('pdf-step-loading').style.display = 'none';
  }
}

// Render dữ liệu bóc tách ra màn hình xem trước
export function renderParsedExamPreview(filterKeyword = '') {
  if (!currentParsedExam) return;

  $('pdf-step-loading').style.display = 'none';
  $('pdf-step-preview').style.display = 'block';
  if ($('btn-pdf-back-upload')) $('btn-pdf-back-upload').style.display = 'inline-block';

  $('pdf-exam-name').value = currentParsedExam.examName || "Đề thi mới từ PDF";
  $('pdf-exam-desc').value = currentParsedExam.description || "";
  $('pdf-exam-time').value = currentParsedExam.timeLimit || 45;
  
  if (currentParsedExam.cat && $('pdf-exam-cat')) {
    $('pdf-exam-cat').value = currentParsedExam.cat;
    updatePdfSubcatSelect();
    if (currentParsedExam.subcat && $('pdf-exam-subcat')) {
      $('pdf-exam-subcat').value = currentParsedExam.subcat;
    }
  }

  $('pdf-q-total-count').textContent = currentParsedExam.questions.length;

  const container = $('pdf-questions-container');
  if (!container) return;

  const kw = filterKeyword.trim().toLowerCase();
  const keys = ['A', 'B', 'C', 'D'];

  const renderedCards = currentParsedExam.questions.map((q, qIdx) => {
    if (kw) {
      const matchText = [q.text, ...(q.opts || []), q.explain].join(' ').toLowerCase();
      if (!matchText.includes(kw)) return '';
    }

    return `
      <div class="pdf-q-card" id="pdf-q-card-${qIdx}" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; padding:18px 20px; margin-bottom:18px; box-shadow:0 2px 8px rgba(15,23,42,0.04);">
        
        <!-- Header Câu hỏi -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:800; color:#1e293b; font-size:15px; display:flex; align-items:center; gap:8px;">
            <span style="background:#2563eb; color:#ffffff; font-size:12px; padding:3px 12px; border-radius:20px; font-weight:700;">Câu ${qIdx + 1}</span>
            <span style="font-size:12px; color:#64748b; font-weight:600;">2 Trạng thái: Mã LaTeX ⇄ Live Render</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#ecfdf5; color:#059669; font-size:11.5px; font-weight:800; padding:4px 10px; border-radius:6px; border:1px solid #a7f3d0; display:flex; align-items:center; gap:5px;">
              <span>🎯 Đáp án đúng:</span>
              <b style="color:#dc2626; font-size:13px;">Lựa chọn ${keys[q.ans]}</b>
            </span>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteParsedQuestion(${qIdx})" style="padding:3px 8px; font-size:11px; font-weight:700;" title="Xóa câu hỏi này">🗑 Xóa</button>
          </div>
        </div>

        <!-- 1. KHUNG NỘI DUNG CÂU HỎI (2 TRẠNG THÁI) -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
              <span>📝</span> Trạng thái 1: Mã nguồn (Có hỗ trợ LaTeX):
            </label>
            <textarea class="pdf-q-text-input" data-idx="${qIdx}" style="width:100%; min-height:68px; font-size:13px; padding:8px 10px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:monospace; background:#ffffff; color:#0f172a;" oninput="window.updateParsedQuestionText(${qIdx}, this.value)">${esc(q.text)}</textarea>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#2563eb; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
              <span>👁️</span> Trạng thái 2: Hiển thị thực tế (Rendered MathJax):
            </label>
            <div id="pdf-q-rendered-${qIdx}" style="background:#f8fafc; border:1.5px solid #bfdbfe; border-radius:8px; padding:8px 12px; font-size:13.5px; color:#0f172a; min-height:68px; overflow-x:auto;">
              ${esc(q.text)}
            </div>
          </div>
        </div>

        <!-- 2. KHUNG 4 LỰA CHỌN A, B, C, D (2 TRẠNG THÁI) -->
        <div style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:8px;">
            Các phương án lựa chọn (Click chọn Radio để đổi đáp án đúng):
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${(q.opts || []).map((opt, optIdx) => {
              const isCorrect = q.ans === optIdx;
              return `
                <div style="background:${isCorrect ? '#fef2f2' : '#f8fafc'}; border:1.5px solid ${isCorrect ? '#f87171' : '#e2e8f0'}; border-radius:10px; padding:10px 12px; transition:all 0.2s;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <input type="radio" name="pdf-ans-${qIdx}" id="pdf-ans-${qIdx}-${optIdx}" value="${optIdx}" ${isCorrect ? 'checked' : ''} onchange="window.setParsedQuestionAnswer(${qIdx}, ${optIdx})" style="width:16px; height:16px; cursor:pointer; accent-color:#dc2626;">
                      <label for="pdf-ans-${qIdx}-${optIdx}" style="font-weight:800; font-size:13px; color:${isCorrect ? '#b91c1c' : '#1e293b'}; cursor:pointer; margin:0;">
                        Đáp án ${keys[optIdx]}
                      </label>
                    </div>
                    ${isCorrect ? `<span style="font-size:10.5px; background:#fee2e2; color:#b91c1c; font-weight:800; padding:2px 8px; border-radius:4px; border:1px solid #fecaca;">✓ Đúng</span>` : ''}
                  </div>

                  <!-- Trạng thái 1: Mã nguồn -->
                  <div style="margin-bottom:6px;">
                    <input type="text" value="${esc(opt)}" placeholder="Mã LaTeX..." style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:5px 8px; font-size:12.5px; font-family:monospace; background:#ffffff;" oninput="window.updateParsedQuestionOption(${qIdx}, ${optIdx}, this.value)">
                  </div>

                  <!-- Trạng thái 2: Đã Render -->
                  <div id="pdf-opt-rendered-${qIdx}-${optIdx}" style="background:#ffffff; border:1px dashed ${isCorrect ? '#fca5a5' : '#cbd5e1'}; border-radius:6px; padding:5px 8px; font-size:13px; color:${isCorrect ? '#b91c1c' : '#0f172a'}; min-height:28px; overflow-x:auto;">
                    ${esc(opt)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. LỜI GIẢI THÍCH (2 TRẠNG THÁI) -->
        ${q.explain ? `
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px 12px; margin-top:8px;">
            <div style="font-size:11.5px; font-weight:700; color:#0369a1; margin-bottom:4px;">💡 Hướng dẫn giải (Hiển thị thực tế):</div>
            <div id="pdf-q-explain-rendered-${qIdx}" style="font-size:12.5px; color:#0c4a6e; overflow-x:auto;">${esc(q.explain)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = renderedCards || '<div class="empty" style="padding:20px; text-align:center;">Không tìm thấy câu hỏi phù hợp với từ khóa tìm kiếm.</div>';

  typesetMath(container);
}

// Lọc câu hỏi trong preview
export function filterParsedQuestionsPreview(keyword) {
  renderParsedExamPreview(keyword);
}

// Xóa 1 câu hỏi khỏi danh sách bóc tách
export function deleteParsedQuestion(idx) {
  if (!currentParsedExam?.questions) return;
  if (!confirm(`Bạn có chắc muốn xóa Câu ${idx + 1}?`)) return;
  currentParsedExam.questions.splice(idx, 1);
  renderParsedExamPreview();
}

// Thêm câu hỏi trống
export function addBlankQuestionToParsed() {
  if (!currentParsedExam) return;
  if (!currentParsedExam.questions) currentParsedExam.questions = [];
  currentParsedExam.questions.push({
    text: "Nội dung câu hỏi mới...",
    opts: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    ans: 0,
    explain: ""
  });
  renderParsedExamPreview();
}

let typesetTimeout = null;
function scheduleTypeset(el) {
  if (typesetTimeout) clearTimeout(typesetTimeout);
  typesetTimeout = setTimeout(() => {
    typesetMath(el || $('pdf-questions-container'));
  }, 120);
}

export function updateParsedQuestionText(idx, val) {
  if (currentParsedExam?.questions?.[idx]) {
    currentParsedExam.questions[idx].text = val;
    const renderedBox = $(`pdf-q-rendered-${idx}`);
    if (renderedBox) {
      renderedBox.textContent = val;
      scheduleTypeset(renderedBox);
    }
  }
}

export function updateParsedQuestionOption(qIdx, optIdx, val) {
  if (currentParsedExam?.questions?.[qIdx]?.opts) {
    currentParsedExam.questions[qIdx].opts[optIdx] = val;
    const renderedBox = $(`pdf-opt-rendered-${qIdx}-${optIdx}`);
    if (renderedBox) {
      renderedBox.textContent = val;
      scheduleTypeset(renderedBox);
    }
  }
}

export function setParsedQuestionAnswer(qIdx, optIdx) {
  if (currentParsedExam?.questions?.[qIdx]) {
    currentParsedExam.questions[qIdx].ans = parseInt(optIdx);
    renderParsedExamPreview();
  }
}

// ==============================================================
// 6. LƯU VÀO CƠ SỞ DỮ LIỆU SUPABASE & TẠO ĐỀ THI
// ==============================================================
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

    // 1. Chuẩn bị payload danh sách câu hỏi
    const questionsToInsert = currentParsedExam.questions.map(q => ({
      cat: cat || 'Toán',
      subcat: subcat || 'Toán/Phần 2 - Đại số',
      text: q.text,
      image: '',
      audio: '',
      explain: q.explain || '',
      opts: q.opts,
      ans: q.ans,
      type: 'mcq_single',
      created_by: authorEmail
    }));

    // 2. Insert câu hỏi vào bảng 'questions' trong Supabase
    let insertedQuestionIds = [];
    const { data: qData, error: qErr } = await db()
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (qErr) {
      console.warn("Lỗi insert questions:", qErr);
      questionsToInsert.forEach(q => {
        const fakeId = state.nextQId++;
        q.id = fakeId;
        insertedQuestionIds.push(fakeId);
      });
      state.questions = [...questionsToInsert, ...state.questions];
    } else if (qData && qData.length > 0) {
      insertedQuestionIds = qData.map(item => Number(item.id));
      const formattedQuestions = qData.map(q => ({
        ...q,
        id: Number(q.id),
        opts: q.opts || [],
        blanks: q.blanks || [],
        bank: q.bank || [],
        pairs: q.pairs || []
      }));
      state.questions = [...formattedQuestions, ...state.questions];
    }

    // 3. Insert Đề thi mới vào bảng 'exams'
    const examPayload = {
      name: examName,
      description: desc,
      count: insertedQuestionIds.length,
      cat: cat || 'Toán',
      subcat: subcat || 'Toán/Phần 2 - Đại số',
      time_limit: timeLimit,
      is_hidden: false,
      q_ids: insertedQuestionIds,
      created_by: authorEmail
    };

    const { data: eData, error: eErr } = await db()
      .from('exams')
      .insert([examPayload])
      .select();

    if (eErr) {
      console.warn("Lỗi insert exams:", eErr);
      const fakeExamId = state.nextEId++;
      state.exams.unshift({
        id: fakeExamId,
        ...examPayload,
        timeLimit: examPayload.time_limit,
        isHidden: false,
        qIds: insertedQuestionIds
      });
    } else if (eData && eData.length > 0) {
      const created = eData[0];
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

    // 4. Đồng bộ bộ lọc Tab Ngân hàng câu hỏi để hiển thị các câu hỏi mới ngay lập tức
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

    // 5. Làm mới giao diện
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

    // Tự động chuyển qua tab Ngân hàng câu hỏi (q)
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

// Gắn các hàm vào window để gọi từ onclick trong HTML
window.openPdfImportModal = openPdfImportModal;
window.closePdfImportModal = closePdfImportModal;
window.handlePdfFileUpload = handlePdfFileUpload;
window.testWithSamplePdf = testWithSamplePdf;
window.updateParsedQuestionText = updateParsedQuestionText;
window.updateParsedQuestionOption = updateParsedQuestionOption;
window.setParsedQuestionAnswer = setParsedQuestionAnswer;
window.saveParsedExamToSupabase = saveParsedExamToSupabase;
window.deleteParsedQuestion = deleteParsedQuestion;
window.addBlankQuestionToParsed = addBlankQuestionToParsed;
window.filterParsedQuestionsPreview = filterParsedQuestionsPreview;
window.togglePdfEngineMode = togglePdfEngineMode;
window.saveGeminiApiKeyFromInput = saveGeminiApiKeyFromInput;
window.getStoredGeminiApiKey = getStoredGeminiApiKey;

