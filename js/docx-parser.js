import { state, $, esc, typesetMath } from './common.js';
import { showToast } from './ui-components.js';
import { renderQuestions } from './questions.js';
import { renderExams, populateExamSelect } from './exams.js';

const db = () => window.supabaseClient;

// ==============================================================
// 1. TẢI THƯ VIỆN JSZIP ĐỘNG TỪ CDN
// ==============================================================
let jszipLoaded = false;
export async function loadJsZip() {
  if (window.JSZip) {
    jszipLoaded = true;
    return window.JSZip;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      jszipLoaded = true;
      resolve(window.JSZip);
    };
    script.onerror = () => reject(new Error("Không thể tải thư viện JSZip để đọc file Word (.docx)."));
    document.head.appendChild(script);
  });
}

// ==============================================================
// 2. BỘ CHUYỂN ĐỔI CÔNG THỨC TOÁN OMML (WORD EQUATION) SANG LATEX
// ==============================================================
export function ommlNodeToLatex(node) {
  if (!node) return '';
  const nodeName = node.localName || node.nodeName || '';

  // 1. Text trong công thức toán: <m:t>
  if (nodeName === 't' || nodeName === 'm:t') {
    let t = node.textContent || '';
    return t.replace(/´/g, ' \\times ')
            .replace(/¹/g, ' \\neq ')
            .replace(/£/g, ' \\le ')
            .replace(/³/g, ' \\ge ')
            .replace(/–/g, '-');
  }

  // 2. Run trong công thức toán: <m:r>
  if (nodeName === 'r' || nodeName === 'm:r') {
    let res = '';
    for (const child of node.children) {
      res += ommlNodeToLatex(child);
    }
    return res;
  }

  // 3. Phân số: <m:f> -> <m:num> (tử) và <m:den> (mẫu)
  if (nodeName === 'f' || nodeName === 'm:f') {
    let num = '', den = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'num' || cName === 'm:num') {
        num = ommlNodeToLatex(child).trim();
      } else if (cName === 'den' || cName === 'm:den') {
        den = ommlNodeToLatex(child).trim();
      }
    }
    return `\\frac{${num || '1'}}{${den || '1'}}`;
  }

  // 4. Số mũ / Lũy thừa / Nghịch đảo: <m:sSup> -> <m:e> (cơ số) và <m:sup> (mũ)
  if (nodeName === 'sSup' || nodeName === 'm:sSup') {
    let base = '', sup = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'e' || cName === 'm:e') {
        base = ommlNodeToLatex(child).trim();
      } else if (cName === 'sup' || cName === 'm:sup') {
        sup = ommlNodeToLatex(child).trim();
      }
    }
    if (base.startsWith('(') && base.endsWith(')')) {
      return `${base}^{${sup}}`;
    }
    return `${base}^{${sup}}`;
  }

  // 5. Chỉ số dưới (Subscript): <m:sSub> -> <m:e> và <m:sub>
  if (nodeName === 'sSub' || nodeName === 'm:sSub') {
    let base = '', sub = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'e' || cName === 'm:e') {
        base = ommlNodeToLatex(child).trim();
      } else if (cName === 'sub' || cName === 'm:sub') {
        sub = ommlNodeToLatex(child).trim();
      }
    }
    return `${base}_{${sub}}`;
  }

  // 6. Cả chỉ số dưới và trên: <m:sSubSup>
  if (nodeName === 'sSubSup' || nodeName === 'm:sSubSup') {
    let base = '', sub = '', sup = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'e' || cName === 'm:e') base = ommlNodeToLatex(child).trim();
      else if (cName === 'sub' || cName === 'm:sub') sub = ommlNodeToLatex(child).trim();
      else if (cName === 'sup' || cName === 'm:sup') sup = ommlNodeToLatex(child).trim();
    }
    return `${base}_{${sub}}^{${sup}}`;
  }

  // 7. Căn thức: <m:rad> -> <m:deg> (bậc căn) và <m:e> (biểu thức)
  if (nodeName === 'rad' || nodeName === 'm:rad') {
    let base = '', deg = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'e' || cName === 'm:e') base = ommlNodeToLatex(child).trim();
      else if (cName === 'deg' || cName === 'm:deg') deg = ommlNodeToLatex(child).trim();
    }
    if (deg) return `\\sqrt[${deg}]{${base}}`;
    return `\\sqrt{${base}}`;
  }

  // 8. Dấu ngoặc / Định thức: <m:d> -> <m:e>
  if (nodeName === 'd' || nodeName === 'm:d') {
    let begChr = '(';
    let endChr = ')';
    let content = '';

    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'dPr' || cName === 'm:dPr') {
        for (const pr of child.children) {
          const prName = pr.localName || pr.nodeName;
          if (prName === 'begChr' || prName === 'm:begChr') begChr = pr.getAttribute('m:val') || begChr;
          if (prName === 'endChr' || prName === 'm:endChr') endChr = pr.getAttribute('m:val') || endChr;
        }
      } else if (cName === 'e' || cName === 'm:e') {
        content += ommlNodeToLatex(child);
      }
    }

    if (begChr === '[' && endChr === ']') return `\\left[${content}\\right]`;
    if (begChr === '{' && endChr === '}') return `\\left\\{${content}\\right\\}`;
    if (begChr === '|' && endChr === '|') return `\\left|${content}\\right|`;
    return `\\left(${content}\\right)`;
  }

  // 9. Ma trận: <m:m> -> <m:mr> (hàng) -> <m:e> (ô)
  if (nodeName === 'm' || nodeName === 'm:m') {
    const rows = [];
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'mr' || cName === 'm:mr') {
        const cells = [];
        for (const cell of child.children) {
          const cellName = cell.localName || cell.nodeName;
          if (cellName === 'e' || cellName === 'm:e') {
            cells.push(ommlNodeToLatex(cell).trim());
          }
        }
        rows.push(cells.join(' & '));
      }
    }
    return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
  }

  // 10. Tích phân / Tổng Sigma: <m:nary>
  if (nodeName === 'nary' || nodeName === 'm:nary') {
    let chr = '\\int', sub = '', sup = '', e = '';
    for (const child of node.children) {
      const cName = child.localName || child.nodeName;
      if (cName === 'naryPr' || cName === 'm:naryPr') {
        for (const pr of child.children) {
          if ((pr.localName || pr.nodeName).includes('chr')) chr = pr.getAttribute('m:val') || chr;
        }
      } else if (cName === 'sub' || cName === 'm:sub') sub = ommlNodeToLatex(child).trim();
      else if (cName === 'sup' || cName === 'm:sup') sup = ommlNodeToLatex(child).trim();
      else if (cName === 'e' || cName === 'm:e') e = ommlNodeToLatex(child).trim();
    }
    let op = chr === '∑' ? '\\sum' : (chr === '∏' ? '\\prod' : '\\int');
    if (sub && sup) return `${op}_{${sub}}^{${sup}}{${e}}`;
    if (sub) return `${op}_{${sub}}{${e}}`;
    return `${op}{${e}}`;
  }

  // 11. Duyệt đệ quy mặc định
  let result = '';
  for (const child of node.children) {
    result += ommlNodeToLatex(child);
  }
  return result;
}

// ==============================================================
// 3. THUẬT TOÁN BÓC TÁCH FILE WORD (.DOCX) TOÀN DIỆN
// ==============================================================
export async function parseDocxDocument(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress(15, "Đang giải nén cấu trúc file Word (.docx)...");
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Không tìm thấy nội dung văn bản (word/document.xml) trong file Word này!");
  }

  if (typeof onProgress === 'function') onProgress(35, "Đang phân tích cấu trúc XML và công thức OMML...");
  const xmlContent = await docXmlFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  const rawLines = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const pResult = extractParagraphData(p);
    if (pResult.text.trim()) {
      rawLines.push(pResult);
    }
  }

  if (typeof onProgress === 'function') onProgress(75, "Đang nhận diện các câu hỏi, 4 phương án và đáp án đúng...");
  const questions = parseQuestionsFromDocxLines(rawLines);

  if (!questions.length) {
    throw new Error("Không tìm thấy câu hỏi trắc nghiệm nào trong file Word này. Vui lòng kiểm tra định dạng đề thi (Câu 1: ... a. b. c. d.)");
  }

  const detectedTitle = (file.name || "Đề thi Word").replace(/\.[^/.]+$/, "");

  if (typeof onProgress === 'function') onProgress(100, `Bóc tách thành công ${questions.length} câu hỏi hoàn hảo!`);

  return {
    examName: `Đề thi: ${detectedTitle}`,
    cat: "Toán",
    subcat: "Toán/Phần 2 - Đại số",
    timeLimit: Math.max(15, Math.min(180, Math.ceil(questions.length * 1.5))),
    description: `Bóc tách tự động từ file Word ${file.name} (${questions.length} câu hỏi).`,
    questions: questions
  };
}

// Bóc tách nội dung của 1 đoạn văn <w:p>
function extractParagraphData(pNode) {
  let fullText = "";
  let hasRed = false;
  let hasBold = false;
  let runs = [];

  for (const child of pNode.childNodes) {
    const nodeName = child.localName || child.nodeName || '';

    // 1. Khối công thức Toán học: <m:oMath> hoặc <m:oMathPara>
    if (nodeName === 'oMath' || nodeName === 'm:oMath' || nodeName === 'oMathPara' || nodeName === 'm:oMathPara') {
      const latex = ommlNodeToLatex(child).trim();
      if (latex) {
        const mathStr = `$${latex}$`;
        fullText += (fullText.endsWith(' ') ? '' : ' ') + mathStr + ' ';
        runs.push({ text: mathStr, isRed: false, isBold: false });
      }
    }
    // 2. Khối văn bản thông thường: <w:r>
    else if (nodeName === 'r' || nodeName === 'w:r') {
      let rText = "";
      let rIsRed = false;
      let rIsBold = false;

      // Đọc thuộc tính định dạng <w:rPr>
      const rPr = child.querySelector('rPr, w\\:rPr');
      if (rPr) {
        // Kiểm tra màu chữ đỏ: <w:color w:val="FF0000"/>
        const colorNode = rPr.querySelector('color, w\\:color');
        if (colorNode) {
          const cVal = (colorNode.getAttribute('w:val') || colorNode.getAttribute('val') || '').toLowerCase();
          if (['ff0000', 'ee0000', 'dc2626', 'c00000', 'ef4444', 'red', 'darkred'].includes(cVal) || cVal.startsWith('ff0') || cVal.startsWith('ee0') || cVal.startsWith('dc2')) {
            rIsRed = true;
            hasRed = true;
          }
        }
        // Kiểm tra in đậm: <w:b/>
        const bNode = rPr.querySelector('b, w\\:b');
        if (bNode) {
          const bVal = bNode.getAttribute('w:val') || bNode.getAttribute('val');
          if (bVal !== 'false' && bVal !== '0') {
            rIsBold = true;
            hasBold = true;
          }
        }
      }

      // Đọc chữ trong thẻ <w:t>
      const tNodes = child.querySelectorAll('t, w\\:t');
      tNodes.forEach(t => {
        rText += t.textContent;
      });

      if (rText) {
        fullText += rText;
        runs.push({ text: rText, isRed: rIsRed, isBold: rIsBold });
      }
    }
  }

  return {
    text: fullText.trim(),
    hasRed,
    hasBold,
    runs
  };
}

// Bóc tách danh sách câu hỏi từ các dòng Word
function parseQuestionsFromDocxLines(lines) {
  const fullDocumentText = lines.map(l => l.text).join('\n');
  const answerKeyMap = extractAnswerKeyTable(fullDocumentText);

  const qHeaders = [];
  const qRegex = /(?:^|\n)\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*(\d+)(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|(\d{1,3})[\s.:\-\/)](?=\s+[A-ZÀ-Ỹa-zà-ỹ0-9$]))/gi;

  let match;
  while ((match = qRegex.exec(fullDocumentText)) !== null) {
    const qNum = parseInt(match[1] || match[2], 10);
    qHeaders.push({ qNum, startIdx: match.index });
  }

  if (!qHeaders.length) {
    return fallbackExtractQuestionsFromLines(lines);
  }

  const questions = [];

  for (let i = 0; i < qHeaders.length; i++) {
    const cur = qHeaders[i];
    const nextStart = (i + 1 < qHeaders.length) ? qHeaders[i + 1].startIdx : fullDocumentText.length;
    let blockText = fullDocumentText.slice(cur.startIdx, nextStart).trim();

    // Cắt bỏ bảng đáp án nếu ở cuối
    const ansTableIdx = blockText.search(/(?:B[ẢAảa]NG\s*Đ[ÁAáa]P\s*[ÁAáa]N|ANSWER\s*KEY)/i);
    if (ansTableIdx !== -1 && i === qHeaders.length - 1) {
      blockText = blockText.slice(0, ansTableIdx).trim();
    }

    const parsedQ = parseSingleDocxQuestionBlock(blockText, cur.qNum, lines);
    if (parsedQ) {
      if (parsedQ.ans === null || parsedQ.ans === undefined || parsedQ._ansSource === 'default') {
        if (answerKeyMap[cur.qNum] !== undefined) {
          parsedQ.ans = answerKeyMap[cur.qNum];
        }
      }
      delete parsedQ._ansSource;
      questions.push(parsedQ);
    }
  }

  return questions;
}

// Bóc tách 1 câu hỏi từ khối văn bản Word
function parseSingleDocxQuestionBlock(block, qNum, allLines = []) {
  const headerMatch = block.match(/^\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*\d+(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|\d{1,3}[\s.:\-\/)])\s*/i);
  let content = headerMatch ? block.slice(headerMatch[0].length).trim() : block;

  let explain = "";
  const explainMatch = content.match(/(?:\n|\s{2,})(?:L[ờo]i\s*gi[ảa]i|H[ưu][ớo]ng\s*d[ẫa]n\s*gi[ảa]i|HDG|Gi[ảa]i\s*th[íi]ch|Gi[ảa]i)\s*[:.]\s*([\s\S]*)$/i);
  if (explainMatch) {
    explain = explainMatch[1].trim();
    content = content.slice(0, explainMatch.index).trim();
  }

  // Tìm 4 phương án a., b., c., d. hoặc A., B., C., D.
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
      fullMatchLength: om[0].length
    });
  }

  // Tìm chuỗi phương án liên tiếp
  let bestSeq = [];
  for (const isLowerTarget of [true, false]) {
    const filtered = matches.filter(m => m.isLower === isLowerTarget);
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].optIdx === 0) {
        const seq = [filtered[i]];
        let exp = 1;
        for (let j = i + 1; j < filtered.length; j++) {
          if (filtered[j].optIdx === exp) {
            seq.push(filtered[j]);
            exp++;
            if (exp === 4) break;
          }
        }
        if (seq.length > bestSeq.length) bestSeq = seq;
      }
    }
  }

  let qText = content;
  let opts = ["", "", "", ""];
  let detectedAns = -1;
  let ansSource = 'default';

  if (bestSeq.length >= 2) {
    qText = content.slice(0, bestSeq[0].matchIndex).trim();

    for (let i = 0; i < bestSeq.length; i++) {
      const cur = bestSeq[i];
      const startIdx = cur.matchIndex + cur.fullMatchLength;
      const endIdx = (i + 1 < bestSeq.length) ? bestSeq[i + 1].matchIndex : content.length;
      let optText = content.slice(startIdx, endIdx).trim();

      opts[cur.optIdx] = optText;

      // Kiểm tra màu Đỏ từ các dòng Word trùng khớp
      if (detectedAns === -1) {
        for (const line of allLines) {
          if (line.hasRed && (line.text.includes(optText) || line.text.includes(cur.rawChar + '.'))) {
            detectedAns = cur.optIdx;
            ansSource = 'red_word';
            break;
          }
        }
      }
    }
  }

  // Đảm bảo đủ 4 phương án
  for (let idx = 0; idx < 4; idx++) {
    if (!opts[idx] || !opts[idx].trim()) {
      opts[idx] = `(Lựa chọn ${['A', 'B', 'C', 'D'][idx]})`;
    }
  }

  return {
    text: qText || `Nội dung câu hỏi ${qNum}`,
    opts: opts,
    ans: detectedAns >= 0 ? detectedAns : 0,
    explain: explain,
    _ansSource: ansSource
  };
}

function extractAnswerKeyTable(text) {
  const map = {};
  if (!text) return map;
  const itemRegex = /(?:C[âaÂA]u\s*)?(\d{1,3})[\s.:\-\/)]*([A-D])\b/gi;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ansIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[match[2].toUpperCase()];
    if (ansIdx !== undefined && qNum > 0) {
      map[qNum] = ansIdx;
    }
  }
  return map;
}

function fallbackExtractQuestionsFromLines(lines) {
  const qs = [];
  let count = 1;
  for (const l of lines) {
    if (l.text.length > 20) {
      qs.push({
        text: l.text,
        opts: ["A", "B", "C", "D"],
        ans: 0,
        explain: ""
      });
      count++;
    }
  }
  return qs;
}
