/**
 * MODULE PDF MATH CLEANER (js/pdf/pdf-math-cleaner.js)
 * Bộ dọn dẹp ký tự toán học, ma trận và biểu thức LaTeX từ PDF
 */

export function cleanMathFormulas(txt) {
  if (!txt) return "";
  let s = String(txt).trim();

  s = s.replace(/[\uf8ee\uf8f9\uf8ef\uf8fa\uf8f0\uf8fb]/g, '');
  
  s = s.replace(/['"]\s*=\s*['"]\s*#\s*A%&\s*['"]\s*!\s*(?:!\s*)?['"]?\s*'?\s*-\s*1\s*T/gi, 'A^{-1} = \\frac{1}{\\det A}(A^*)^T');
  s = s.replace(/['"]\s*=\s*['"]\s*#\s*A%&\s*['"]?\s*!\s*-\s*1\s*T/gi, 'A^{-1} = \\frac{1}{\\det A}(A^*)^T');
  s = s.replace(/['"]\s*=\s*#\s*A%&/gi, 'A^{-1} = \\frac{1}{\\det A}A^*');
  s = s.replace(/#\s*=\s*A#%&/gi, 'A^{-1} = \\frac{1}{\\det A}A^*');
  s = s.replace(/#\s*A%&/gi, '\\frac{1}{\\det A}A^*');
  s = s.replace(/A\s*=\s*det\(A\)\(A\*\)\s*['"]?\(\s*\)\s*#/gi, 'A^{-1} = \\det(A)(A^*)^T');
  s = s.replace(/A\s*=\s*\\det\(A\)\(A\*\)\s*['"]?\(\s*\)\s*#/gi, 'A^{-1} = \\det(A)(A^*)^T');
  s = s.replace(/A\^\s*=\s*det\(A\)A\*/gi, 'A^{-1} = \\det(A)A^*');
  s = s.replace(/A\^\s*=\s*\\det\(A\)A\*/gi, 'A^{-1} = \\det(A)A^*');

  s = s.replace(/ma\s*-\s*1\s*trận\s*nghịch\s*đảo\s*([A-Za-z])/gi, 'ma trận nghịch đảo $1^{-1}');
  s = s.replace(/ma\s*trận\s*nghịch\s*đảo\s*([A-Za-z])\s*-\s*1/gi, 'ma trận nghịch đảo $1^{-1}');
  s = s.replace(/-\s*1\s*!+/g, '');

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

  s = s.replace(/\bdet\s*\(\s*\(\s*A\s*\^?\s*T\s*\)\s*\^?\s*-\s*1\s*\)/gi, '\\det((A^T)^{-1})');
  s = s.replace(/\bdet\s*\(\s*([A-Za-z0-9\s\+\-\*]+)\s*\)/gi, '\\det($1)');
  s = s.replace(/\bdet\s+([A-Za-z])/gi, '\\det $1');
  s = s.replace(/\brank\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\text{rank}($1)');
  s = s.replace(/\b(?:trace|tr)\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\text{tr}($1)');

  s = s.replace(/1\s*\/\s*\\det\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\frac{1}{\\det($1)}');
  s = s.replace(/1\s*\/\s*\\det\s+([A-Za-z0-9]+)/gi, '\\frac{1}{\\det $1}');
  s = s.replace(/1\s*\/\s*det\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, '\\frac{1}{\\det($1)}');
  s = s.replace(/1\s*\/\s*det\s+([A-Za-z0-9]+)/gi, '\\frac{1}{\\det $1}');

  s = s.replace(/⁻¹/g, '^{-1}')
       .replace(/⁻²/g, '^{-2}')
       .replace(/ᵀ/g, '^T')
       .replace(/²/g, '^2')
       .replace(/³/g, '^3')
       .replace(/ⁿ/g, '^n')
       .replace(/₁/g, '_1')
       .replace(/₂/g, '_2')
       .replace(/₃/g, '_3')
       .replace(/₄/g, '_4')
       .replace(/₅/g, '_5')
       .replace(/₆/g, '_6')
       .replace(/₇/g, '_7')
       .replace(/₈/g, '_8')
       .replace(/₉/g, '_9')
       .replace(/₀/g, '_0');

  s = s.replace(/\b([A-Za-z])\s*\^\s*([0-9\+\-Tnkmij]+)/g, '$1^{$2}');
  s = s.replace(/\b([A-Za-z])\s*_\s*([0-9\+\-Tnkmij]+)/g, '$1_{$2}');

  s = s.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (match, inner) => {
    let cleanInner = inner.replace(/[\n\r]+/g, ' ')
                          .replace(/\s*&\s*/g, ' & ')
                          .replace(/\s*\\\\\s*/g, ' \\\\ ')
                          .replace(/\s+/g, ' ')
                          .trim();
    return `\\begin{pmatrix} ${cleanInner} \\end{pmatrix}`;
  });

  return s;
}
