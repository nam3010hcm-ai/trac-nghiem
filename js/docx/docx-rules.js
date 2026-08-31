/**
 * MODULE DOCX QUESTIONS & EXAM EXTRACTOR (js/docx/docx-rules.js)
 * Thuật toán bóc tách câu hỏi, phương án, đáp án đúng (Chữ đỏ) và tạo đề thi từ file Word (.docx)
 */
import { loadJsZip, parseMathTypeBinaryToLatex } from './docx-ole.js';
import { extractParagraphData } from './docx-xml.js';

export function autoWrapMathTokens(text) {
  if (!text) return '';

  const existingMath = [];
  let s = String(text).replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, (m) => {
    const idx = existingMath.length;
    existingMath.push(m);
    return `\uFFF0MATH${idx}\uFFF1`;
  });

  s = s.replace(/((?:\([A-Za-z0-9\s^_{}+\-*–—−]+\)|[A-Za-z0-9*–—−])+(?:\^\{[^{}]+\}|_\{[^{}]+\}|(?:\^[A-Za-z0-9*–—−]+)|(?:_[A-Za-z0-9]+))+(?:[A-Za-z0-9()^_{}+\-*–—−]|\s*[=+\-]\s*[A-Za-z0-9()^_{}+\-*–—−]+)*)/g, (match) => {
    let clean = match.trim()
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/−/g, '-');
    return `$${clean}$`;
  });

  s = s.replace(/\uFFF0MATH(\d+)\uFFF1/g, (_, idx) => {
    return existingMath[parseInt(idx, 10)] || '';
  });

  s = s.replace(/\$\$+/g, '$');

  return s;
}

export function extractAnswerKeyTable(text) {
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

export function parseSingleDocxQuestionBlock(block, qNum, qLines = [], answerKeyMap = {}) {
  const headerMatch = block.match(/^\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*\d+(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|\d{1,3}[\s.:\-\/)])\s*/i);
  let content = headerMatch ? block.slice(headerMatch[0].length).trim() : block;

  content = content.replace(/^\s*(?:C[âaÂA]u|B[àaÀA]i|Question|Q)\s*\d+[\s.:\-\/)]*\s*/i, '');

  let explain = "";
  const explainMatch = content.match(/(?:\n|\s{2,})(?:L[ờo]i\s*gi[ảa]i|H[ưu][ớo]ng\s*d[ẫa]n\s*gi[ảa]i|HDG|Gi[ảa]i\s*th[íi]ch|Gi[ảa]i)\s*[:.]\s*([\s\S]*)$/i);
  if (explainMatch) {
    explain = explainMatch[1].trim();
    content = content.slice(0, explainMatch.index).trim();
  }

  const optRegex = /(?:^|\s+|[*$)}\]])(?:\*|\[x\]\s*)?([A-Da-d])(?:[.:\-\/)\]]+|\s*(?=[0-9–\-$]|\\begin|\\frac|det))(?!\d)/g;
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
  const optScores = [0, 0, 0, 0];
  let boldLabelsCount = 0;

  if (bestSeq.length >= 2) {
    qText = content.slice(0, bestSeq[0].matchIndex).trim();

    for (let i = 0; i < bestSeq.length; i++) {
      const cur = bestSeq[i];
      const startIdx = cur.matchIndex + cur.fullMatchLength;
      const endIdx = (i + 1 < bestSeq.length) ? bestSeq[i + 1].matchIndex : content.length;
      let optText = content.slice(startIdx, endIdx).trim();

      if (!optText.startsWith('$') && (optText.includes('^') || optText.includes('_') || optText.includes('\\begin') || optText.includes('\\frac') || optText.includes('det(') || optText.includes('A*') || optText.includes('A-1') || optText.includes('A–1'))) {
        let cleanOpt = optText.replace(/det\(([^)]+)\)/g, '\\det($1)')
                              .replace(/det\s+([A-Za-z])/g, '\\det($1)')
                              .replace(/\(A\*\)/g, '(A^*)')
                              .replace(/A\*/g, 'A^*');
        optText = `$${cleanOpt}$`;
      }

      opts[cur.optIdx] = autoWrapMathTokens(optText);

      if (cur.rawMatch && (cur.rawMatch.includes('*') || cur.rawMatch.includes('[x]'))) {
        optScores[cur.optIdx] += 90;
      }
    }
  }

  for (const line of qLines) {
    const lText = line.text || '';
    const lRuns = line.runs || [];

    const lineOptRegex = /(?:^|\s+|[*$)}\]])(?:\*|\[x\]\s*)?([A-Da-d])(?:[.:\-\/)\]]+|\s*(?=[0-9–\-$]|\\begin|\\frac|det))(?!\d)/g;
    const lineMatches = [];
    let lm;
    while ((lm = lineOptRegex.exec(lText)) !== null) {
      const letter = lm[1].toUpperCase();
      const optIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
      lineMatches.push({
        letter,
        optIdx,
        start: lm.index,
        end: lm.index + lm[0].length,
        rawMatch: lm[0]
      });
    }

    for (let mi = 0; mi < lineMatches.length; mi++) {
      const curMatch = lineMatches[mi];
      const optIdx = curMatch.optIdx;
      const labelStart = curMatch.start;
      const labelEnd = curMatch.end;
      const contentStart = labelEnd;
      const contentEnd = (mi + 1 < lineMatches.length) ? lineMatches[mi + 1].start : lText.length;

      let labelIsRed = false;
      let labelIsBold = false;
      let labelIsUnderline = false;

      for (const r of lRuns) {
        const rTextTrim = (r.text || '').trim();
        const isDirectMatch = (rTextTrim === curMatch.letter + '.' || rTextTrim === curMatch.letter.toLowerCase() + '.' || rTextTrim === curMatch.letter || rTextTrim === curMatch.letter.toLowerCase());
        
        let isRangeOverlap = false;
        if (r.range) {
          const [rStart, rEnd] = r.range;
          if (Math.max(labelStart, rStart) < Math.min(labelEnd, rEnd)) {
            isRangeOverlap = true;
          }
        }

        if (isRangeOverlap || isDirectMatch) {
          if (r.isRed) labelIsRed = true;
          if (r.isBold) labelIsBold = true;
          if (r.isUnderline) labelIsUnderline = true;
        }
      }

      if (labelIsRed && labelIsBold) {
        optScores[optIdx] += 100;
      } else if (labelIsRed) {
        optScores[optIdx] += 80;
      } else if (labelIsBold) {
        optScores[optIdx] += 30;
        boldLabelsCount++;
      } else if (labelIsUnderline) {
        optScores[optIdx] += 25;
      }

      if (curMatch.rawMatch && (curMatch.rawMatch.includes('*') || curMatch.rawMatch.includes('[x]'))) {
        optScores[optIdx] += 90;
      }

      let contentIsRed = false;
      let contentIsBold = false;
      for (const r of lRuns) {
        if (!r.range) continue;
        const [rStart, rEnd] = r.range;
        if (Math.max(contentStart, rStart) < Math.min(contentEnd, rEnd)) {
          if (r.isRed) contentIsRed = true;
          if (r.isBold) contentIsBold = true;
        }
      }

      if (contentIsRed && contentIsBold) {
        optScores[optIdx] += 70;
      } else if (contentIsRed) {
        optScores[optIdx] += 60;
      } else if (contentIsBold) {
        optScores[optIdx] += 15;
      }
    }
  }

  if (boldLabelsCount >= 4) {
    for (let idx = 0; idx < 4; idx++) {
      if (optScores[idx] >= 30 && optScores[idx] < 80) {
        optScores[idx] -= 30;
      }
    }
  }

  if (explain) {
    const ansInExplain = explain.match(/(?:Ch[ọo]n|Đ[áa]p\s*[áa]n|Đ\/A|C[âa]u\s*\d+[\s:.]*)\s*([A-D])\b/i);
    if (ansInExplain) {
      const expIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[ansInExplain[1].toUpperCase()];
      if (expIdx !== undefined) {
        optScores[expIdx] += 50;
      }
    }
  }

  let detectedAns = -1;
  const maxScore = Math.max(...optScores);
  if (maxScore > 0) {
    detectedAns = optScores.indexOf(maxScore);
  }

  if (answerKeyMap && answerKeyMap[qNum] !== undefined) {
    if (detectedAns === -1 || maxScore < 80) {
      detectedAns = answerKeyMap[qNum];
    }
  }

  for (let idx = 0; idx < 4; idx++) {
    if (!opts[idx] || !opts[idx].trim()) {
      opts[idx] = `(Lựa chọn ${['A', 'B', 'C', 'D'][idx]})`;
    }
  }

  qText = qText.replace(/\b(?:C[Âaâu]|B[àaai]|Question|Q)\s*\d+[\s.:\-\/)]*/gi, '')
               .replace(/\s{2,}/g, ' ')
               .trim();

  qText = autoWrapMathTokens(qText);

  return {
    text: qText || `Nội dung câu hỏi ${qNum}`,
    opts: opts.map(o => autoWrapMathTokens(o)),
    ans: detectedAns >= 0 ? detectedAns : 0,
    explain: autoWrapMathTokens(explain)
  };
}

export function fallbackExtractQuestionsFromLines(lines) {
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

export function parseQuestionsFromDocxLines(lines) {
  const fullDocumentText = lines.map(l => l.text).join('\n');
  const answerKeyMap = extractAnswerKeyTable(fullDocumentText);

  const qRegex = /^\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*(\d+)(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|(\d{1,3})[\s.:\-\/)](?=\s+[A-ZÀ-Ỹa-zà-ỹ0-9$]))/i;

  const qGroups = [];
  let curGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:B[ẢAảa]NG\s*Đ[ÁAáa]P\s*[ÁAáa]N|ANSWER\s*KEY)/i.test(line.text)) {
      break;
    }

    const match = line.text.match(qRegex);
    if (match) {
      const qNum = parseInt(match[1] || match[2], 10);
      if (curGroup) {
        qGroups.push(curGroup);
      }
      curGroup = {
        qNum,
        lines: [line]
      };
    } else {
      if (curGroup) {
        curGroup.lines.push(line);
      }
    }
  }
  if (curGroup) {
    qGroups.push(curGroup);
  }

  if (!qGroups.length) {
    const qHeaders = [];
    const globalQRegex = /(?:^|\n)\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*(\d+)(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|(\d{1,3})[\s.:\-\/)](?=\s+[A-ZÀ-Ỹa-zà-ỹ0-9$]))/gi;
    let match;
    while ((match = globalQRegex.exec(fullDocumentText)) !== null) {
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
      const ansTableIdx = blockText.search(/(?:B[ẢAảa]NG\s*Đ[ÁAáa]P\s*[ÁAáa]N|ANSWER\s*KEY)/i);
      if (ansTableIdx !== -1 && i === qHeaders.length - 1) {
        blockText = blockText.slice(0, ansTableIdx).trim();
      }
      const parsedQ = parseSingleDocxQuestionBlock(blockText, cur.qNum, lines, answerKeyMap);
      if (parsedQ) {
        questions.push(parsedQ);
      }
    }
    return questions;
  }

  const questions = [];
  for (const group of qGroups) {
    const blockText = group.lines.map(l => l.text).join('\n').trim();
    const parsedQ = parseSingleDocxQuestionBlock(blockText, group.qNum, group.lines, answerKeyMap);
    if (parsedQ) {
      questions.push(parsedQ);
    }
  }

  return questions;
}

export async function parseDocxDocument(file, onProgress = null) {
  if (typeof onProgress === 'function') onProgress(15, "Đang giải nén cấu trúc file Word (.docx)...");
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Không tìm thấy nội dung văn bản (word/document.xml) trong file Word này!");
  }

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

  if (typeof onProgress === 'function') onProgress(45, "Đang giải mã toàn bộ công thức MathType OLE sang LaTeX...");
  const mediaCache = {};
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/embeddings/') || fileName.startsWith('word/media/')) {
      try {
        const ext = fileName.split('.').pop().toLowerCase();
        
        if (ext === 'bin' || ext === 'wmf' || ext === 'emf') {
          const uint8 = await zip.file(fileName).async('uint8array');
          const latexMath = parseMathTypeBinaryToLatex(uint8);
          if (latexMath) {
            mediaCache[fileName] = { type: 'latex', content: latexMath };
          } else {
            mediaCache[fileName] = { type: 'text', content: '' };
          }
        } 
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
