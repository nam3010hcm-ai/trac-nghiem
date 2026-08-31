/**
 * MODULE DOCX OLE MATHTYPE DECODER (js/docx/docx-ole.js)
 * Tải JSZip và giải mã luồng nhị phân OLE Compound File / MathType MTEF sang LaTeX
 */
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

// BỘ TRÍCH XUẤT STREAM "EQUATION NATIVE" TỪ TỆP OLE COMPOUND FILE
export function extractOleMiniFatStream(oleBytes, targetStreamName = "Equation Native") {
  if (!oleBytes || oleBytes.length < 512) return oleBytes;
  
  if (oleBytes[0] !== 0xD0 || oleBytes[1] !== 0xCF || oleBytes[2] !== 0x11 || oleBytes[3] !== 0xE0) {
    return oleBytes;
  }

  try {
    const view = new DataView(oleBytes.buffer, oleBytes.byteOffset, oleBytes.byteLength);
    const secSize = 1 << view.getUint16(30, true);
    const miniSecSize = 1 << view.getUint16(32, true);
    const firstDirSec = view.getUint32(48, true);
    const firstMiniFatSec = view.getUint32(60, true);
    const miniStreamCutoff = view.getUint32(56, true);

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

    const rootStartSec = dirView.getUint32(116, true);
    const rootStreamLen = dirView.getUint32(120, true);

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

// BỘ GIẢI MÃ MATHTYPE (MTEF / WMF / OLE BINARY) SANG LATEX CHUẨN
export function parseMathTypeBinaryToLatex(rawBuf) {
  if (!rawBuf || rawBuf.length < 10) return '';

  const stream = extractOleMiniFatStream(rawBuf);
  if (!stream || stream.length < 10) return '';

  let buf = (stream[0] === 28 && stream[1] === 0) ? stream.subarray(28) : stream;

  let rootPos = -1;
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 10 && buf[i+1] === 1 && buf[i+2] === 0) {
      rootPos = i + 1;
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
    if (tag === 0) return '';

    if (tag === 1) {
      const lineOpt = buf[offset++];
      if (lineOpt & 0x08) offset += 2;
      const items = [];
      while (offset < buf.length) {
        if (buf[offset] === 0) {
          offset++;
          break;
        }
        const val = parseItem();
        if (val) items.push(val);
      }
      return items.join('');
    }

    if (tag === 2) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      if (opt & 0x04) offset += 2;
      const typeface = buf[offset++];
      let code = buf[offset++];
      if (opt & 0x02) code |= (buf[offset++] << 8);
      if (offset < buf.length && buf[offset] === 0) offset++;
      let ch = String.fromCharCode(code);
      if (ch === '´') return ' \\times ';
      if (ch === '¹') return ' \\neq ';
      if (ch === '£') return ' \\le ';
      if (ch === '³') return ' \\ge ';
      if (ch === '–' || ch === '—' || ch === '−') return '-';
      if (ch === '[' || ch === ']') return '';
      return ch;
    }

    if (tag === 3) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      if (opt & 0x04) offset += 2;
      const tc = buf[offset++];
      const var1 = buf[offset++];
      const var2 = buf[offset++];

      if (tc === 0 || tc === 1 || tc === 11 || tc === 12 || tc === 13) {
        const num = parseItem();
        const den = parseItem();
        return `\\frac{${num || '1'}}{${den || '1'}}`;
      }
      if (tc === 27 || tc === 28 || tc === 29) {
        const topt = buf[offset++];
        if (tc === 27) {
          const body = parseItem();
          return body ? `_{${body}}` : '';
        }
        if (tc === 28) {
          const body = parseItem();
          return body ? `^{${body}}` : '';
        }
        if (tc === 29) {
          const sub = parseItem();
          const sup = parseItem();
          return `_{${sub}}^{${sup}}`;
        }
      }
      if (tc === 2 || tc === 19) {
        const body = parseItem();
        return `\\sqrt{${body}}`;
      }
      if (tc === 20) {
        const deg = parseItem();
        const body = parseItem();
        return `\\sqrt[${deg}]{${body}}`;
      }
      if (tc === 3 || tc === 5) {
        const content = parseItem();
        if (content.includes('\\begin{bmatrix}') || content.includes('\\begin{matrix}')) {
          return content;
        }
        return `\\left[${content}\\right]`;
      }
      if (tc === 4) return `\\left(${parseItem()}\\right)`;
      if (tc === 6) return `\\left\\{${parseItem()}\\right\\}`;
      if (tc === 7) return `\\left|${parseItem()}\\right|`;
      return parseItem();
    }

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

    if (tag === 11 || tag === 13) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      const body = parseItem();
      return body ? `_{${body}}` : '';
    }

    if (tag === 12 || tag === 14) {
      const opt = buf[offset++];
      if (opt & 0x08) offset += 2;
      const body = parseItem();
      return body ? `^{${body}}` : '';
    }

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
  clean = clean.replace(/det\s*([A-Za-z])/g, '\\det($1)')
               .replace(/det\(([^)]+)\)/g, '\\det($1)')
               .replace(/\(A\*\)/g, '(A^*)')
               .replace(/A\*/g, 'A^*');
  if (clean) {
    return `$${clean}$`;
  }
  return '';
}
