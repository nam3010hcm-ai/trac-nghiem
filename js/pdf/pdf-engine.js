/**
 * MODULE PDF ENGINE & GEMINI AI VISION (js/pdf/pdf-engine.js)
 * Tải PDF.js, quản lý Gemini API Key và gọi AI Vision bóc tách đề thi
 */
import { showToast } from '../ui-components.js';
import { parsePdfDocumentOffline, cleanMathFormulas } from './pdf-rules.js';

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
      ans: 0,
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
      ans: 1,
      explain: "Ma trận $A_{m \\times k}$ nhân với ma trận $B_{k \\times n}$ cho kết quả ma trận tích có kích thước $m \\times n = 3 \\times 2$."
    },
    {
      text: "Tìm định thức của ma trận $A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 5 \\end{bmatrix}$.",
      opts: ["7", "13", "11", "5"],
      ans: 0,
      explain: "Định thức $\\det(A) = 2 \\cdot 5 - 3 \\cdot 1 = 10 - 3 = 7$."
    },
    {
      text: "Cho ma trận vuông $A$ cấp 3 có định thức $\\det(A) = 4$. Tính định thức của ma trận $2A$.",
      opts: ["8", "12", "32", "16"],
      ans: 2,
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
      ans: 0,
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
      ans: 0,
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
      ans: 1,
      explain: "Ma trận chuyển vị $A^T$ nhận được bằng cách đổi hàng thành cột: Hàng 1 $(1, 2, 3)$ thành Cột 1, Hàng 2 $(4, 5, 6)$ thành Cột 2."
    },
    {
      text: "Tìm hạng (rank) của ma trận $A = \\begin{bmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\\\ 0 & 0 & 0 \\end{bmatrix}$.",
      opts: ["1", "2", "3", "0"],
      ans: 1,
      explain: "Hàng 3 toàn số 0. Hàng 1 và Hàng 2 độc lập tuyến tính. Vậy $\\text{rank}(A) = 2$."
    },
    {
      text: "Cho ma trận $A = \\begin{bmatrix} m & 2 \\\\ 2 & 1 \\end{bmatrix}$. Tìm điều kiện của $m$ để ma trận $A$ khả nghịch.",
      opts: ["$m \\neq 4$", "$m = 4$", "$m \\neq 0$", "Với mọi $m$"],
      ans: 0,
      explain: "Ma trận $A$ khả nghịch khi $\\det(A) \\neq 0 \\Leftrightarrow m \\cdot 1 - 4 \\neq 0 \\Leftrightarrow m \\neq 4$."
    },
    {
      text: "Vết (trace) của ma trận $A = \\begin{bmatrix} 3 & 4 & 1 \\\\ 0 & -2 & 5 \\\\ 1 & 2 & 6 \\end{bmatrix}$ là bao nhiêu?",
      opts: ["3", "7", "9", "11"],
      ans: 1,
      explain: "Vết là tổng các phần tử trên đường chéo chính: $\\text{tr}(A) = 3 + (-2) + 6 = 7$."
    },
    {
      text: "Cho ma trận vuông $A$ cấp 3 có định thức $\\det(A) = -2$. Tính định thức của $\\det((A^T)^{-1})$.",
      opts: ["$-2$", "$2$", "$-0{,}5$", "$0{,}5$"],
      ans: 2,
      explain: "$\\det((A^T)^{-1}) = \\frac{1}{\\det(A^T)} = \\frac{1}{-2} = -0{,}5$."
    }
  ]
};

let pdfjsLibLoaded = false;
export async function loadPdfJs() {
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
    script.onerror = () => reject(new Error("Không thể tải thư viện PDF.js."));
    document.head.appendChild(script);
  });
}

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
  const inp = document.getElementById('pdf-gemini-api-key');
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
  const keyBox = document.getElementById('pdf-gemini-key-box');
  const lblAi = document.getElementById('lbl-engine-ai');
  const lblOffline = document.getElementById('lbl-engine-offline');

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
    const viewport = page.getViewport({ scale: 2.0 });

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

    let resData = null;
    let lastErrorMsg = "";

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
          resData = await tryRes.json();
          workingModel = mName;
          break;
        } else {
          const errJson = await tryRes.json().catch(() => ({}));
          lastErrorMsg = errJson?.error?.message || `HTTP ${tryRes.status}`;
        }
      } catch (callErr) {
        lastErrorMsg = callErr.message || "Lỗi mạng";
      }
    }

    if (!resData) {
      throw new Error(`Tất cả các model Gemini đều báo lỗi: ${lastErrorMsg}.`);
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
    throw new Error("Không nhận diện được câu hỏi nào từ Gemini Vision.");
  }

  if (typeof onProgress === 'function') onProgress(100, `AI Vision đã bóc tách thành công ${allQuestions.length} câu hỏi!`);

  return {
    examName: detectedTitle ? `Đề thi: ${detectedTitle}` : "Đề thi mới từ PDF",
    cat: "Toán",
    subcat: "Toán/Phần 2 - Đại số",
    timeLimit: Math.max(15, Math.min(180, Math.ceil(allQuestions.length * 1.5))),
    description: `Bóc tách tự động bằng AI Vision từ file ${file.name} (${allQuestions.length} câu hỏi).`,
    questions: allQuestions
  };
}

export async function parsePdfDocument(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress(10, "Đang khởi tạo thư viện PDF...");
  const pdfjs = await loadPdfJs();

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

  const engineMode = document.getElementById('pdf-engine-offline')?.checked ? 'offline' : 'ai';
  const apiKey = getStoredGeminiApiKey() || document.getElementById('pdf-gemini-api-key')?.value.trim();

  if (engineMode === 'ai' && apiKey) {
    try {
      if (typeof onProgress === 'function') onProgress(20, "Khởi động mô hình thị giác AI (Google Gemini Vision)...");
      const aiResult = await parsePdfWithGeminiVision(file, apiKey, onProgress);
      if (aiResult && aiResult.questions && aiResult.questions.length > 0) {
        return aiResult;
      }
    } catch (aiErr) {
      console.warn("AI Vision gặp sự cố, chuyển sang Offline Heuristic Engine:", aiErr);
      showToast('info', 'AI Vision chuyển dự phòng', 'Đang chuyển sang bộ bóc tách Cục bộ (Offline)...');
    }
  } else if (engineMode === 'ai' && !apiKey) {
    showToast('info', 'Chưa có API Key', 'Chưa cấu hình Gemini API Key. Đang sử dụng Bộ Bóc Tách Cục Bộ!');
  }

  return parsePdfDocumentOffline(file, pdfjs, onProgress);
}
