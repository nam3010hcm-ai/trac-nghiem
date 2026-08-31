/**
 * MODULE DOCX OMML EQUATION PARSER (js/docx/docx-omml.js)
 * Chuyển đổi cây XML công thức Office Math Markup Language (OMML) sang LaTeX
 */

// BỘ CHUYỂN ĐỔI CÔNG THỨC TOÁN OMML (WORD EQUATION) SANG LATEX
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
