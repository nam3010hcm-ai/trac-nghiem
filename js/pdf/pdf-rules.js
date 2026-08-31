/**
 * MODULE PDF OFFLINE HEURISTIC PARSER & RULES (js/pdf/pdf-rules.js)
 * Bộ bóc tách offline: nhận diện chữ đỏ, sắp xếp dòng, sửa lỗi dấu tiếng Việt
 */
import { cleanMathFormulas } from './pdf-math-cleaner.js';

export { cleanMathFormulas };

export function repairVietnameseAccents(txt) {
  if (!txt) return "";
  let s = String(txt);

  s = s.replace(/kh\s+ng\b/gi, 'không')
       .replace(/trong\s+®\s*ã/gi, 'trong đó')
       .replace(/c\s+a\b/gi, 'của')
       .replace(/t\s+m\b/gi, 'tìm')
       .replace(/ph\s+ng\s*tr\s*nh/gi, 'phương trình')
       .replace(/h\s+ph\s*ng\s*tr\s*nh/gi, 'hệ phương trình')
       .replace(/nghi\s*m\b/gi, 'nghiệm')
       .replace(/ma\s*tr\s*n/gi, 'ma trận')
       .replace(/®\s*nh\s*th\s*c/gi, 'định thức');

  return s;
}

export function findBestOptionSequence(content) {
  const optRegex = /(?:^|[\s\n;,])(?:(\*|\[x\]\s*)?([A-Da-d])(?:[.:\-\/)\]]+|\s*(?=[0-9–\-$])))(?=\s|\S)/g;
  const rawMatches = [];
  let m;

  while ((m = optRegex.exec(content)) !== null) {
    const fullMatch = m[0];
    const isMarked = Boolean(m[1]);
    const rawChar = m[2];
    const letter = rawChar.toUpperCase();
    const optIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
    const matchIndex = m.index + (fullMatch.length - fullMatch.trimStart().length);

    rawMatches.push({
      matchIndex: matchIndex,
      fullMatchLength: fullMatch.trim().length,
      rawMatch: fullMatch.trim(),
      rawChar: rawChar,
      letter: letter,
      optIdx: optIdx,
      isMarked: isMarked
    });
  }

  const validSequences = [];
  for (let i = 0; i < rawMatches.length; i++) {
    const startItem = rawMatches[i];
    const seq = [startItem];
    let expectedIdx = startItem.optIdx + 1;

    for (let j = i + 1; j < rawMatches.length; j++) {
      const nextItem = rawMatches[j];
      if (nextItem.optIdx === expectedIdx) {
        seq.push(nextItem);
        expectedIdx++;
        if (expectedIdx > 3) break;
      }
    }
    if (seq.length >= 2) {
      validSequences.push(seq);
    }
  }

  if (!validSequences.length) return [];
  validSequences.sort((a, b) => b.length - a.length || (a[0].optIdx === 0 ? -1 : 1));
  return validSequences[0];
}

export function parseOfflineQuestionBlock(content, qNum, targetRedLetter = null, qBoldItems = [], explain = "", answerKeyMap = null) {
  content = repairVietnameseAccents(content);
  const bestSequence = findBestOptionSequence(content);

  let qText = content;
  let opts = ["", "", "", ""];
  const optScores = [0, 0, 0, 0];
  let boldLabelsCount = 0;

  if (targetRedLetter) {
    const redIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[targetRedLetter.toUpperCase()];
    if (redIdx !== undefined) {
      optScores[redIdx] += 100;
    }
  }

  if (bestSequence.length >= 2) {
    qText = content.slice(0, bestSequence[0].matchIndex).trim();

    for (let k = 0; k < bestSequence.length; k++) {
      const cur = bestSequence[k];
      const nextPos = (k + 1 < bestSequence.length) ? bestSequence[k + 1].matchIndex : content.length;
      let optText = content.slice(cur.matchIndex + cur.fullMatchLength, nextPos).trim();

      if (cur.rawMatch.includes('*') || cur.rawMatch.includes('[x]')) {
        optScores[cur.optIdx] += 90;
      }

      if (qBoldItems && qBoldItems.length) {
        for (const bold of qBoldItems) {
          const bText = (bold.text || '').trim();
          if (bText === cur.rawChar + '.' || bText === cur.letter + '.' || bText === cur.rawChar || bText === cur.letter) {
            optScores[cur.optIdx] += 30;
            boldLabelsCount++;
            break;
          }
        }
      }

      opts[cur.optIdx] = cleanMathFormulas(optText);
    }
  } else {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    let curOptIdx = -1;
    let fallbackTextLines = [];

    for (const line of lines) {
      const lineOptMatch = line.match(/^(\*|\[x\]\s*)?([A-Da-d])(?:[.:\-\/)\]]+|\s*(?=[0-9–\-$]))\s*(.*)/i);
      if (lineOptMatch) {
        const isMarked = Boolean(lineOptMatch[1]);
        const letter = lineOptMatch[2].toUpperCase();
        curOptIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[letter];
        if (isMarked) {
          optScores[curOptIdx] += 90;
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

  return {
    text: cleanMathFormulas(qText) || `Nội dung câu hỏi ${qNum}`,
    opts: opts,
    ans: detectedAns >= 0 ? detectedAns : 0,
    explain: cleanMathFormulas(explain)
  };
}

export function fallbackExtractQuestions(text, allRedItems = [], allBoldItems = []) {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const redOptionLetters = (allRedItems || [])
    .map(r => {
      const match = (r.text || '').trim().match(/^([a-dA-D])[.:\-\/)\]]*$/);
      return match ? match[1].toUpperCase() : null;
    })
    .filter(Boolean);

  const qs = [];
  blocks.forEach((blk, bIdx) => {
    const qMatch = blk.match(/^(?:câu|bài|question)\s*(\d+)[\s:.]*(.*)/is);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      const qBody = qMatch[2];
      const redLetter = redOptionLetters[bIdx] || null;
      qs.push(parseOfflineQuestionBlock(qBody, qNum, redLetter, allBoldItems));
    }
  });

  return qs;
}

export async function parsePdfDocumentOffline(file, pdfjs, onProgress) {
  if (onProgress) onProgress('Đang đọc cấu trúc file PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  let fullText = '';
  const allRedItems = [];
  const allBoldItems = [];

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(`Đang trích xuất nội dung trang ${p}/${numPages}...`);
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const pageItems = textContent.items || [];

    pageItems.forEach(it => {
      fullText += (it.str || '') + ' ';
    });
    fullText += '\n\n';
  }

  if (onProgress) onProgress('Đang phân tích các câu hỏi và ma trận...');
  const questions = fallbackExtractQuestions(fullText, allRedItems, allBoldItems);

  return {
    examName: file.name.replace(/\.[^/.]+$/, ''),
    cat: 'Toán',
    subcat: 'Toán/Đại số',
    timeLimit: 45,
    description: `Bóc tách offline từ file ${file.name} (${numPages} trang).`,
    questions: questions.length ? questions : []
  };
}
