/**
 * MODULE DOCX XML PARSER & RUN EXTRACTOR (js/docx/docx-xml.js)
 * Bóc tách đoạn văn <w:p>, màu sắc đỏ, hình ảnh DrawingML/VML và công thức từ document.xml
 */
import { ommlNodeToLatex } from './docx-omml.js';

// Kiểm tra mã màu hex có phải màu đỏ không (hỗ trợ mọi biến thể Word)
export function isColorRedHex(cVal) {
  if (!cVal) return false;
  const c = String(cVal).toLowerCase().trim();
  if (['ff0000', 'ee0000', 'dc2626', 'c00000', 'ef4444', 'red', 'darkred', 'crimson', 'firebrick', 'ed1c24', 'fe0000', 'e00000', 'cc0000', 'd00000', 'b91c1c', 'e11d48'].includes(c)) {
    return true;
  }
  if (c.startsWith('ff0') || c.startsWith('ee0') || c.startsWith('dc2') || c.startsWith('c00') || c.startsWith('ed1') || c.startsWith('fe0') || c.startsWith('e00')) {
    return true;
  }
  if (c.length === 6) {
    try {
      const r = parseInt(c.slice(0, 2), 16);
      const g = parseInt(c.slice(2, 4), 16);
      const b = parseInt(c.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        if ((r >= 150 && g <= 120 && b <= 120) || (r >= 160 && (r - g >= 40) && (r - b >= 40))) {
          return true;
        }
      }
    } catch (e) {}
  }
  return false;
}

// Bóc tách nội dung của 1 đoạn văn <w:p>
export function extractParagraphData(pNode, relsMap = {}, mediaCache = {}) {
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
        const rStart = fullText.length;
        fullText += (fullText.endsWith(' ') ? '' : ' ') + mathStr + ' ';
        const rEnd = fullText.length;
        runs.push({ text: mathStr, isRed: false, isBold: false, isUnderline: false, range: [rStart, rEnd] });
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
            const rStart = fullText.length;
            fullText += (fullText.endsWith(' ') ? '' : ' ') + media.content + ' ';
            const rEnd = fullText.length;
            runs.push({ text: media.content, isRed: false, isBold: false, isUnderline: false, range: [rStart, rEnd] });
          } else if (media.type === 'image') {
            const imgTag = `<img src="${media.content}" class="docx-math-img" style="vertical-align:middle;max-height:48px;display:inline-block;margin:0 4px;" />`;
            const rStart = fullText.length;
            fullText += ' ' + imgTag + ' ';
            const rEnd = fullText.length;
            runs.push({ text: imgTag, isRed: false, isBold: false, isUnderline: false, range: [rStart, rEnd] });
          }
          return;
        }
      }
    }

    // 3. Khối hình ảnh VML / MathType OLE Object: <w:pict> hoặc <w:object>
    if (nodeName === 'pict' || nodeName === 'w:pict' || nodeName === 'object' || nodeName === 'w:object') {
      const oleData = node.querySelector('OLEObject, o\\:OLEObject');
      const imgData = node.querySelector('imagedata, v\\:imagedata');

      let media = null;
      if (oleData) {
        const oleRId = oleData.getAttribute('r:id') || oleData.getAttribute('id');
        if (oleRId && relsMap[oleRId] && mediaCache[relsMap[oleRId]] && mediaCache[relsMap[oleRId]].content) {
          media = mediaCache[relsMap[oleRId]];
        }
      }

      if (!media && imgData) {
        const imgRId = imgData.getAttribute('r:id') || imgData.getAttribute('id') || imgData.getAttribute('r:href');
        if (imgRId && relsMap[imgRId] && mediaCache[relsMap[imgRId]] && mediaCache[relsMap[imgRId]].content) {
          media = mediaCache[relsMap[imgRId]];
        }
      }

      if (media && media.content) {
        if (media.type === 'latex') {
          const rStart = fullText.length;
          fullText += (fullText.endsWith(' ') ? '' : ' ') + media.content + ' ';
          const rEnd = fullText.length;
          runs.push({ text: media.content, isRed: false, isBold: false, isUnderline: false, range: [rStart, rEnd] });
        } else if (media.type === 'image') {
          const imgTag = `<img src="${media.content}" class="docx-math-img" style="vertical-align:middle;max-height:48px;display:inline-block;margin:0 4px;" />`;
          const rStart = fullText.length;
          fullText += ' ' + imgTag + ' ';
          const rEnd = fullText.length;
          runs.push({ text: imgTag, isRed: false, isBold: false, isUnderline: false, range: [rStart, rEnd] });
        }
        return;
      }
    }

    // 4. Khối văn bản thông thường: <w:r>
    if (nodeName === 'r' || nodeName === 'w:r') {
      let rText = "";
      let rIsRed = false;
      let rIsBold = false;
      let rIsUnderline = false;

      let isSuperscript = false;
      let isSubscript = false;
      const rPr = node.querySelector('rPr, w\\:rPr');
      if (rPr) {
        const colorNode = rPr.querySelector('color, w\\:color');
        if (colorNode) {
          const cVal = (colorNode.getAttribute('w:val') || colorNode.getAttribute('val') || '').toLowerCase();
          if (isColorRedHex(cVal)) {
            rIsRed = true;
            hasRed = true;
          }
        }
        const hlNode = rPr.querySelector('highlight, w\\:highlight');
        if (hlNode) {
          const hlVal = (hlNode.getAttribute('w:val') || hlNode.getAttribute('val') || '').toLowerCase();
          if (['red', 'darkred', 'magenta'].includes(hlVal)) {
            rIsRed = true;
            hasRed = true;
          }
        }
        const shdNode = rPr.querySelector('shd, w\\:shd');
        if (shdNode) {
          const sVal = (shdNode.getAttribute('w:fill') || shdNode.getAttribute('fill') || '').toLowerCase();
          if (isColorRedHex(sVal)) {
            rIsRed = true;
            hasRed = true;
          }
        }
        const bNode = rPr.querySelector('b, w\\:b, bCs, w\\:bCs');
        if (bNode) {
          const bVal = bNode.getAttribute('w:val') || bNode.getAttribute('val');
          if (bVal !== 'false' && bVal !== '0') {
            rIsBold = true;
            hasBold = true;
          }
        }
        const uNode = rPr.querySelector('u, w\\:u');
        if (uNode) {
          const uVal = uNode.getAttribute('w:val') || uNode.getAttribute('val');
          if (uVal !== 'none' && uVal !== 'false' && uVal !== '0') {
            rIsUnderline = true;
          }
        }
        const vertAlignNode = rPr.querySelector('vertAlign, w\\:vertAlign');
        if (vertAlignNode) {
          const vVal = (vertAlignNode.getAttribute('w:val') || vertAlignNode.getAttribute('val') || '').toLowerCase();
          if (vVal === 'superscript') isSuperscript = true;
          if (vVal === 'subscript') isSubscript = true;
        }
      }

      for (const rChild of node.childNodes) {
        const rcName = rChild.localName || rChild.nodeName || '';
        if (rcName === 't' || rcName === 'w:t') {
          rText += rChild.textContent;
        } else if (rcName === 'sym' || rcName === 'w:sym') {
          const charCodeHex = (rChild.getAttribute('w:char') || rChild.getAttribute('char') || '').toUpperCase();
          const font = (rChild.getAttribute('w:font') || rChild.getAttribute('font') || '').toLowerCase();
          const code = parseInt(charCodeHex, 16);
          let symChar = '';
          if (font.includes('symbol') || font.includes('wingdings') || !font) {
            if (charCodeHex.endsWith('B4') || code === 0xF0B4 || code === 0x00B4) symChar = '×';
            else if (charCodeHex.endsWith('B1') || code === 0xF0B1 || code === 0x00B1) symChar = '±';
            else if (charCodeHex.endsWith('B7') || code === 0xF0B7 || code === 0x00B7) symChar = '·';
            else if (charCodeHex.endsWith('B8') || code === 0xF0B8 || code === 0x00B8) symChar = '÷';
            else if (charCodeHex.endsWith('A3') || code === 0xF0A3 || code === 0x00A3) symChar = '≤';
            else if (charCodeHex.endsWith('B3') || code === 0xF0B3 || code === 0x00B3) symChar = '≥';
            else if (charCodeHex.endsWith('B9') || code === 0xF0B9 || code === 0x00B9) symChar = '≠';
            else if (charCodeHex.endsWith('A5') || code === 0xF0A5 || code === 0x00A5) symChar = '∞';
            else if (charCodeHex.endsWith('DE') || code === 0xF0DE || code === 0x00DE) symChar = '→';
            else if (charCodeHex.endsWith('D0') || code === 0xF0D0 || code === 0x00D0) symChar = '∈';
            else if (charCodeHex.endsWith('CE') || code === 0xF0CE || code === 0x00CE) symChar = '∉';
            else if (charCodeHex.endsWith('C7') || code === 0xF0C7 || code === 0x00C7) symChar = '∩';
            else if (charCodeHex.endsWith('C8') || code === 0xF0C8 || code === 0x00C8) symChar = '∪';
            else if (charCodeHex.endsWith('C0') || code === 0xF0C0 || code === 0x00C0) symChar = 'α';
            else if (charCodeHex.endsWith('C1') || code === 0xF0C1 || code === 0x00C1) symChar = 'β';
            else if (charCodeHex.endsWith('C4') || code === 0xF0C4 || code === 0x00C4) symChar = 'Δ';
            else if (charCodeHex.endsWith('70') || code === 0xF070 || code === 0x0070) symChar = 'π';
            else {
              const base = (code & 0xFF);
              if (base >= 32 && base <= 126) symChar = String.fromCharCode(base);
            }
          } else {
            const base = (code & 0xFF);
            if (base >= 32 && base <= 126) symChar = String.fromCharCode(base);
          }
          rText += symChar;
        } else if (rcName === 'drawing' || rcName === 'w:drawing' || rcName === 'pict' || rcName === 'w:pict' || rcName === 'object' || rcName === 'w:object') {
          processNode(rChild);
        } else if (rcName === 'oMath' || rcName === 'm:oMath') {
          processNode(rChild);
        }
      }

      if (rText) {
        let formattedRText = rText;
        if (isSuperscript) formattedRText = `^{${rText}}`;
        else if (isSubscript) formattedRText = `_{${rText}}`;

        const trimmed = formattedRText.trim();
        if (/^[a-dA-D][.:\-\/)]/.test(trimmed) && fullText && !fullText.endsWith(' ')) {
          fullText += ' ';
        }
        const rStart = fullText.length;
        fullText += formattedRText;
        const rEnd = fullText.length;
        runs.push({
          text: formattedRText,
          isRed: rIsRed,
          isBold: rIsBold,
          isUnderline: rIsUnderline,
          range: [rStart, rEnd]
        });
      }
      return;
    }

    for (const child of node.childNodes) {
      processNode(child);
    }
  }

  for (const child of pNode.childNodes) {
    processNode(child);
  }

  let cleanedFullText = fullText.trim()
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/−/g, '-')
    .replace(/\^\{([^}]+)\}\^\{([^}]+)\}/g, '^{$1$2}')
    .replace(/_\{([^}]+)\}_\{([^}]+)\}/g, '_{$1$2}');

  return {
    text: cleanedFullText,
    hasRed,
    hasBold,
    runs
  };
}
