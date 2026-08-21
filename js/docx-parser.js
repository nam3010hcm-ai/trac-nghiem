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
// 2. BỘ TRÍCH XUẤT STREAM "EQUATION NATIVE" TỪ TỆP OLE COMPOUND FILE
// ==============================================================
export function extractOleMiniFatStream(oleBytes, targetStreamName = "Equation Native") {
  if (!oleBytes || oleBytes.length < 512) return oleBytes;
  
  // Kiểm tra chữ ký OLE Compound File Header: 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1
  if (oleBytes[0] !== 0xD0 || oleBytes[1] !== 0xCF || oleBytes[2] !== 0x11 || oleBytes[3] !== 0xE0) {
    return oleBytes;
  }

  try {
    const view = new DataView(oleBytes.buffer, oleBytes.byteOffset, oleBytes.byteLength);
    const secSize = 1 << view.getUint16(30, true); // Thường là 512 byte
    const miniSecSize = 1 << view.getUint16(32, true); // 64 byte
    const firstDirSec = view.getUint32(48, true);
    const firstMiniFatSec = view.getUint32(60, true);
    const miniStreamCutoff = view.getUint32(56, true); // 4096 byte

    // 1. Đọc bảng FAT chính
    const fat = [];
    for (let i = 0; i < 109; i++) {
      const sid = view.getUint32(76 + i * 4, true);
      if (sid < 0xFFFFFFFD) {
        const off = (sid + 1) * secSize;
        const numEntries = secSize / 4;
        for (let j = 0; j < numEntries; j++) {
          fat.push(view.getUint32(off + j * 4, true));
        }
      }
    }

    // 2. Đọc các Directory Entries
    let dirSid = firstDirSec;
    const dirBytes = [];
    while (dirSid < 0xFFFFFFFD && dirSid < fat.length) {
      const off = (dirSid + 1) * secSize;
      for (let b = 0; b < secSize; b++) {
        dirBytes.push(oleBytes[off + b]);
      }
      dirSid = fat[dirSid];
    }
    const dirU8 = new Uint8Array(dirBytes);
    const dirView = new DataView(dirU8.buffer);

    // Root Entry là Directory Entry 0
    const rootStartSec = dirView.getUint32(116, true);
    const rootStreamLen = dirView.getUint32(120, true);

    // Đọc Mini Stream container từ FAT chính
    const miniContainerBytes = [];
    let curSid = rootStartSec;
    while (curSid < 0xFFFFFFFD && curSid < fat.length) {
      const off = (curSid + 1) * secSize;
      for (let b = 0; b < secSize; b++) {
        miniContainerBytes.push(oleBytes[off + b]);
      }
      curSid = fat[curSid];
    }
    const miniContainer = new Uint8Array(miniContainerBytes.slice(0, rootStreamLen));

    // Đọc Mini FAT từ FAT chính
    const minifat = [];
    let mfSid = firstMiniFatSec;
    while (mfSid < 0xFFFFFFFD && mfSid < fat.length) {
      const off = (mfSid + 1) * secSize;
      const numEntries = secSize / 4;
      for (let j = 0; j < numEntries; j++) {
        minifat.push(view.getUint32(off + j * 4, true));
      }
      mfSid = fat[mfSid];
    }

    // 3. Tìm Directory Entry của "Equation Native"
    for (let i = 128; i < dirU8.length; i += 128) {
      const nameLen = dirView.getUint16(i + 64, true);
      if (nameLen > 0) {
        let name = '';
        for (let c = 0; c < nameLen - 2; c += 2) {
          name += String.fromCharCode(dirView.getUint16(i + c, true));
        }
        const startSec = dirView.getUint32(i + 116, true);
        const streamLen = dirView.getUint32(i + 120, true);

        if (name.includes(targetStreamName) || name.includes("Equation") || name.includes("Native")) {
          if (streamLen < miniStreamCutoff && miniContainer.length > 0) {
            // Đọc qua Mini FAT (Mini Stream)
            const streamBytes = [];
            let curMfSid = startSec;
            while (curMfSid < 0xFFFFFFFD && curMfSid < minifat.length) {
              const off = curMfSid * miniSecSize;
              for (let b = 0; b < miniSecSize; b++) {
                if (off + b < miniContainer.length) {
                  streamBytes.push(miniContainer[off + b]);
                }
              }
              curMfSid = minifat[curMfSid];
            }
            return new Uint8Array(streamBytes.slice(0, streamLen));
          } else {
            // Đọc qua FAT chính
            const streamBytes = [];
            let curRegSid = startSec;
            while (curRegSid < 0xFFFFFFFD && curRegSid < fat.length) {
              const off = (curRegSid + 1) * secSize;
              for (let b = 0; b < secSize; b++) {
                streamBytes.push(oleBytes[off + b]);
              }
              curRegSid = fat[curRegSid];
            }
            return new Uint8Array(streamBytes.slice(0, streamLen));
          }
        }
      }
    }
  } catch (e) {
    console.warn("Lỗi phân tích OLE CFB MiniFAT:", e);
  }

  return oleBytes;
}

// ==============================================================
// 3. BỘ GIẢI MÃ MATHTYPE (MTEF / WMF / OLE BINARY) SANG LATEX CHUẨN
// ==============================================================
export function parseMathTypeBinaryToLatex(rawBuf) {
  if (!rawBuf || rawBuf.length < 10) return '';

  // 1. Trích xuất luồng nhị phân liên tục từ tệp OLE
  const stream = extractOleMiniFatStream(rawBuf);
  if (!stream || stream.length < 10) return '';

  // 2. Cắt bỏ Header 28 byte của MathType nếu có
  let buf = (stream[0] === 28 && stream[1] === 0) ? stream.subarray(28) : stream;

  // 3. Tìm vị trí bắt đầu thực sự của phương trình toán học
  let rootPos = -1;
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 10 && buf[i+1] === 1 && buf[i+2] === 0) {
      rootPos = i + 1; // Nhảy qua tag 10 FULL size
      break;
    }
  }
  if (rootPos === -1) {
    for (let i = 0; i < buf.length - 3; i++) {
      if (buf[i] === 1 && buf[i+1] === 0 && [2, 3, 5, 11, 12].includes(buf[i+2])) {
        rootPos = i;
        break;
      }
    }
  }
  if (rootPos === -1) rootPos = 0;

  let offset = rootPos;

  function parseItem() {
    if (offset >= buf.length) return '';
    const tag = buf[offset++];
    if (tag === 0) return ''; // END tag

    // 1: LINE (0x01)
    if (tag === 1) {
      const lineOpt = buf[offset++];
      if (lineOpt & 0x08) offset += 2; // nudge
      const items = [];
      while (offset < buf.length) {
        if (buf[offset] === 0) {
          offset++; // consume END tag của LINE
          break;
        }
        const val = parseItem();
        if (val) items.push(val);
      }
      return items.join('');
    }

    // 2: CHAR (0x02)
    if (tag === 2) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2; // nudge
      if (opt & 0x04) offset += 2; // custom space
      const typeface = buf[offset++];
      let code = buf[offset++];
      if (opt & 0x02) code |= (buf[offset++] << 8); // 16-bit unicode
      if (offset < buf.length && buf[offset] === 0) offset++;
      let ch = String.fromCharCode(code);
      if (ch === '´') return ' \\times ';
      if (ch === '¹') return ' \\neq ';
      if (ch === '£') return ' \\le ';
      if (ch === '³') return ' \\ge ';
      if (ch === '–' || ch === '—' || ch === '−') return '-';
      if (ch === '[' || ch === ']') return ''; // Bỏ qua dấu ngoặc đơn nếu lồng trong ma trận
      return ch;
    }

    // 3: TMPL (0x03)
    if (tag === 3) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2; // nudge
      if (opt & 0x04) offset += 2; // custom space
      const tc = buf[offset++];
      const var1 = buf[offset++];
      offset++; // MT5 2nd byte of variation
      const topt = buf[offset++];

      // Phân số (Fractions: tmplCode 0, 1, 11, 12, 13)
      if (tc === 0 || tc === 1 || tc === 11 || tc === 12 || tc === 13) {
        const num = parseItem();
        const den = parseItem();
        return `\\frac{${num || '1'}}{${den || '1'}}`;
      }
      // Căn bậc 2 (tmplCode 2, 19)
      if (tc === 2 || tc === 19) {
        const body = parseItem();
        return `\\sqrt{${body}}`;
      }
      // Căn bậc n (tmplCode 20)
      if (tc === 20) {
        const deg = parseItem();
        const body = parseItem();
        return `\\sqrt[${deg}]{${body}}`;
      }
      // Ma trận đóng ngoặc vuông (tmplCode 3, 5)
      if (tc === 3 || tc === 5) {
        const content = parseItem();
        if (content.includes('\\begin{bmatrix}') || content.includes('\\begin{matrix}')) {
          return content;
        }
        return `\\left[${content}\\right]`;
      }
      // Dấu ngoặc tròn (tmplCode 4)
      if (tc === 4) return `\\left(${parseItem()}\\right)`;
      // Dấu ngoặc nhọn (tmplCode 6)
      if (tc === 6) return `\\left\\{${parseItem()}\\right\\}`;
      // Trị tuyệt đối (tmplCode 7)
      if (tc === 7) return `\\left|${parseItem()}\\right|`;
      // Chỉ số dưới (tmplCode 27)
      if (tc === 27) {
        const body = parseItem();
        return body ? `_{${body}}` : '';
      }
      // Chỉ số trên / Lũy thừa (tmplCode 28)
      if (tc === 28) {
        const body = parseItem();
        return body ? `^{${body}}` : '';
      }
      // Cả chỉ số dưới và trên (tmplCode 29)
      if (tc === 29) {
        const sub = parseItem();
        const sup = parseItem();
        return `_{${sub}}^{${sup}}`;
      }
      return parseItem();
    }

    // 5: MATRIX (0x05)
    if (tag === 5) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      else offset += 3;
      const rows = buf[offset++];
      const cols = buf[offset++];
      const h = buf[offset++];
      const v = buf[offset++];
      if (offset < buf.length && buf[offset] === 0) offset++;

      const matrixRows = [];
      for (let r = 0; r < rows; r++) {
        const rowCells = [];
        for (let c = 0; c < cols; c++) {
          rowCells.push(parseItem().trim());
        }
        matrixRows.push(rowCells.join(' & '));
      }
      if (offset < buf.length && buf[offset] === 0) offset++;
      return `\\begin{bmatrix} ${matrixRows.join(' \\\\ ')} \\end{bmatrix}`;
    }

    // 11 & 13: SUB (Chỉ số dưới)
    if (tag === 11 || tag === 13) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      const body = parseItem();
      return body ? `_{${body}}` : '';
    }

    // 12 & 14: SUP (Chỉ số trên / Lũy thừa)
    if (tag === 12 || tag === 14) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      const body = parseItem();
      return body ? `^{${body}}` : '';
    }

    // 6: EMBELL (Dấu phẩy, mũ, vector)
    if (tag === 6) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      const emb = buf[offset++];
      if (emb === 1) return "'";
      if (emb === 2) return "''";
      if (emb === 3) return "'''";
      if (emb === 4) return "^*";
      return '';
    }

    return '';
  }

  const out = [];
  while (offset < buf.length) {
    const item = parseItem();
    if (item) out.push(item);
  }

  let clean = out.join('').trim();
  clean = clean.replace(/\^{}/g, '').replace(/_{}/g, '').replace(/\\left\[\\right\]/g, '');
  if (clean) {
    return `$${clean}$`;
  }
  return '';
}

// ==============================================================
// 4. BỘ CHUYỂN ĐỔI CÔNG THỨC TOÁN OMML (WORD EQUATION) SANG LATEX
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
// 5. THUẬT TOÁN BÓC TÁCH FILE WORD (.DOCX) TOÀN DIỆN
// ==============================================================
export async function parseDocxDocument(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress(15, "Đang giải nén cấu trúc file Word (.docx)...");
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Không tìm thấy nội dung văn bản (word/document.xml) trong file Word này!");
  }

  // 1. Đọc tệp liên kết Relationships (word/_rels/document.xml.rels)
  if (typeof onProgress === 'function') onProgress(25, "Đang nạp bảng liên kết công thức & hình ảnh...");
  const relsMap = {};
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (relsFile) {
    const relsXml = await relsFile.async("string");
    const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g;
    let match;
    while ((match = relRegex.exec(relsXml)) !== null) {
      let target = match[2];
      if (target.startsWith('/')) target = target.slice(1);
      if (!target.startsWith('word/')) target = 'word/' + target.replace(/^\.\.\//, '');
      relsMap[match[1]] = target;
    }
  }

  // 2. Nạp và chuyển đổi toàn bộ MathType OLE / WMF sang LaTeX
  if (typeof onProgress === 'function') onProgress(45, "Đang giải mã toàn bộ công thức MathType OLE sang LaTeX...");
  const mediaCache = {};
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/embeddings/') || fileName.startsWith('word/media/')) {
      try {
        const ext = fileName.split('.').pop().toLowerCase();
        
        // Nếu là file nhúng OLE MathType (.bin) hoặc WMF (.wmf, .emf)
        if (ext === 'bin' || ext === 'wmf' || ext === 'emf') {
          const uint8 = await zip.file(fileName).async('uint8array');
          const latexMath = parseMathTypeBinaryToLatex(uint8);
          if (latexMath) {
            mediaCache[fileName] = { type: 'latex', content: latexMath };
          } else {
            mediaCache[fileName] = { type: 'text', content: '' };
          }
        } 
        // Nếu là file hình ảnh chuẩn (PNG, JPEG, GIF, SVG)
        else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
          let mime = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
          else if (ext === 'gif') mime = 'image/gif';
          else if (ext === 'svg') mime = 'image/svg+xml';

          const base64 = await zip.file(fileName).async('base64');
          mediaCache[fileName] = { type: 'image', content: `data:${mime};base64,${base64}` };
        }
      } catch (e) {
        console.warn("Lỗi đọc media:", fileName, e);
      }
    }
  }

  // 3. Phân tích nội dung XML của document.xml
  if (typeof onProgress === 'function') onProgress(65, "Đang phân tích cấu trúc văn bản và thẻ Toán học...");
  const xmlContent = await docXmlFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  const body = xmlDoc.getElementsByTagName("w:body")[0];
  const rawLines = [];

  if (body) {
    for (const el of body.childNodes) {
      const elName = el.localName || el.nodeName || '';
      if (elName === 'p' || elName === 'w:p') {
        const pResult = extractParagraphData(el, relsMap, mediaCache);
        if (pResult.text.trim()) {
          rawLines.push(pResult);
        }
      } else if (elName === 'tbl' || elName === 'w:tbl') {
        const rows = el.getElementsByTagName('w:tr');
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].getElementsByTagName('w:tc');
          for (let c = 0; c < cells.length; c++) {
            const cellPs = cells[c].getElementsByTagName('w:p');
            for (let cp = 0; cp < cellPs.length; cp++) {
              const pResult = extractParagraphData(cellPs[cp], relsMap, mediaCache);
              if (pResult.text.trim()) {
                rawLines.push(pResult);
              }
            }
          }
        }
      }
    }
  }

  if (typeof onProgress === 'function') onProgress(85, "Đang bóc tách danh sách 30 câu hỏi và phương án...");
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
function extractParagraphData(pNode, relsMap = {}, mediaCache = {}) {
  let fullText = "";
  let hasRed = false;
  let hasBold = false;
  let runs = [];

  function processNode(node) {
    const nodeName = node.localName || node.nodeName || '';

    // 1. Khối công thức Toán học OMML: <m:oMath> hoặc <m:oMathPara>
    if (nodeName === 'oMath' || nodeName === 'm:oMath' || nodeName === 'oMathPara' || nodeName === 'm:oMathPara') {
      const latex = ommlNodeToLatex(node).trim();
      if (latex) {
        const mathStr = `$${latex}$`;
        fullText += (fullText.endsWith(' ') ? '' : ' ') + mathStr + ' ';
        runs.push({ text: mathStr, isRed: false, isBold: false });
      }
      return;
    }

    // 2. Khối hình ảnh / DrawingML: <w:drawing>
    if (nodeName === 'drawing' || nodeName === 'w:drawing') {
      const blip = node.querySelector('blip, a\\:blip, svgBlip, asvg\\:svgBlip');
      if (blip) {
        const rId = blip.getAttribute('r:embed') || blip.getAttribute('embed') || blip.getAttribute('r:link');
        const targetPath = relsMap[rId];
        const media = targetPath ? mediaCache[targetPath] : null;
        if (media && media.content) {
          if (media.type === 'latex') {
            fullText += (fullText.endsWith(' ') ? '' : ' ') + media.content + ' ';
            runs.push({ text: media.content, isRed: false, isBold: false });
          } else if (media.type === 'image') {
            const imgTag = `<img src="${media.content}" class="docx-math-img" style="vertical-align:middle;max-height:48px;display:inline-block;margin:0 4px;" />`;
            fullText += ' ' + imgTag + ' ';
            runs.push({ text: imgTag, isRed: false, isBold: false });
          }
          return;
        }
      }
    }

    // 3. Khối hình ảnh VML / MathType OLE Object: <w:pict> hoặc <w:object>
    if (nodeName === 'pict' || nodeName === 'w:pict' || nodeName === 'object' || nodeName === 'w:object') {
      const oleData = node.querySelector('OLEObject, o\\:OLEObject');
      const imgData = node.querySelector('imagedata, v\\:imagedata');

      // ƯU TIÊN 1: File OLE Object (.bin) trong word/embeddings/
      let media = null;
      if (oleData) {
        const oleRId = oleData.getAttribute('r:id') || oleData.getAttribute('id');
        if (oleRId && relsMap[oleRId] && mediaCache[relsMap[oleRId]] && mediaCache[relsMap[oleRId]].content) {
          media = mediaCache[relsMap[oleRId]];
        }
      }

      // ƯU TIÊN 2: File imagedata (.wmf, .png)
      if (!media && imgData) {
        const imgRId = imgData.getAttribute('r:id') || imgData.getAttribute('id') || imgData.getAttribute('r:href');
        if (imgRId && relsMap[imgRId] && mediaCache[relsMap[imgRId]] && mediaCache[relsMap[imgRId]].content) {
          media = mediaCache[relsMap[imgRId]];
        }
      }

      if (media && media.content) {
        if (media.type === 'latex') {
          fullText += (fullText.endsWith(' ') ? '' : ' ') + media.content + ' ';
          runs.push({ text: media.content, isRed: false, isBold: false });
        } else if (media.type === 'image') {
          const imgTag = `<img src="${media.content}" class="docx-math-img" style="vertical-align:middle;max-height:48px;display:inline-block;margin:0 4px;" />`;
          fullText += ' ' + imgTag + ' ';
          runs.push({ text: imgTag, isRed: false, isBold: false });
        }
        return;
      }
    }

    // 4. Khối văn bản thông thường: <w:r>
    if (nodeName === 'r' || nodeName === 'w:r') {
      let rText = "";
      let rIsRed = false;
      let rIsBold = false;

      // Đọc thuộc tính định dạng <w:rPr>
      const rPr = node.querySelector('rPr, w\\:rPr');
      if (rPr) {
        // Kiểm tra màu chữ đỏ: <w:color w:val="FF0000"/>
        const colorNode = rPr.querySelector('color, w\\:color');
        if (colorNode) {
          const cVal = (colorNode.getAttribute('w:val') || colorNode.getAttribute('val') || '').toLowerCase();
          if (['ff0000', 'ee0000', 'dc2626', 'c00000', 'ef4444', 'red', 'darkred'].includes(cVal) || cVal.startsWith('ff0') || cVal.startsWith('ee0') || cVal.startsWith('dc2') || cVal.startsWith('c00')) {
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

      // Kiểm tra xem bên trong <w:r> có chứa drawing/pict/oMath không
      for (const rChild of node.childNodes) {
        const rcName = rChild.localName || rChild.nodeName || '';
        if (rcName === 't' || rcName === 'w:t') {
          rText += rChild.textContent;
        } else if (rcName === 'drawing' || rcName === 'w:drawing' || rcName === 'pict' || rcName === 'w:pict' || rcName === 'object' || rcName === 'w:object') {
          processNode(rChild);
        } else if (rcName === 'oMath' || rcName === 'm:oMath') {
          processNode(rChild);
        }
      }

      if (rText) {
        const trimmed = rText.trim();
        if (/^[a-dA-D][.:\-\/)]/.test(trimmed) && fullText && !fullText.endsWith(' ')) {
          fullText += ' ';
        }
        fullText += rText;
        runs.push({ text: rText, isRed: rIsRed, isBold: rIsBold });
      }
      return;
    }

    // Duyệt đệ quy nếu có các thẻ con khác
    for (const child of node.childNodes) {
      processNode(child);
    }
  }

  for (const child of pNode.childNodes) {
    processNode(child);
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

  // Regex tìm 4 phương án a., b., c., d. hoặc A., B., C., D.
  const optRegex = /(?:^|\n|\s{2,}|\t|\s|[*$)}\]])(?:\*|\[x\]\s*)?([A-Da-d])(?:[\s.:\-\/)\]]*[.:\-\/)\]]+|\s*(?=<img|\$|[0-9–\-]))(?!\d)/g;
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

  // Tìm chuỗi phương án liên tiếp ưu tiên cùng kiểu chữ thường hoặc hoa
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

  // Nếu chuỗi liên tiếp không đủ, lấy toàn bộ danh sách các chữ cái khác nhau xuất hiện theo thứ tự
  if (bestSeq.length < 2) {
    const seen = new Set();
    const seq = [];
    for (const m of matches) {
      if (!seen.has(m.optIdx)) {
        seen.add(m.optIdx);
        seq.push(m);
      }
    }
    if (seq.length >= 2) {
      seq.sort((a, b) => a.matchIndex - b.matchIndex);
      bestSeq = seq;
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

      // Kiểm tra màu ĐỎ từ các dòng Word trùng khớp
      if (detectedAns === -1) {
        for (const line of allLines) {
          if (line.hasRed) {
            const hasOptionLabel = line.runs && line.runs.some(r => r.isRed && (r.text.includes(cur.rawChar + '.') || r.text.includes(cur.letter + '.')));
            if (hasOptionLabel || line.text.includes(cur.rawChar + '.') || line.text.includes(cur.letter + '.') || (optText && optText.length >= 2 && line.text.includes(optText))) {
              detectedAns = cur.optIdx;
              ansSource = 'red_word';
              break;
            }
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
