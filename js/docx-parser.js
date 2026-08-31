/**
 * MODULE DOCX & MATHTYPE PARSER ENGINE (js/docx-parser.js)
 * Barrel module giải mã file Word (.docx), OLE MathType MTEF, OMML và bóc tách đề thi
 */
import {
  loadJsZip,
  extractOleMiniFatStream,
  parseMathTypeBinaryToLatex
} from './docx/docx-ole.js';

import {
  ommlNodeToLatex
} from './docx/docx-omml.js';

import {
  isColorRedHex,
  extractParagraphData
} from './docx/docx-xml.js';

import {
  autoWrapMathTokens,
  extractAnswerKeyTable,
  parseSingleDocxQuestionBlock,
  fallbackExtractQuestionsFromLines,
  parseQuestionsFromDocxLines,
  parseDocxDocument
} from './docx/docx-rules.js';

export {
  loadJsZip,
  extractOleMiniFatStream,
  parseMathTypeBinaryToLatex,
  ommlNodeToLatex,
  isColorRedHex,
  extractParagraphData,
  autoWrapMathTokens,
  extractAnswerKeyTable,
  parseSingleDocxQuestionBlock,
  fallbackExtractQuestionsFromLines,
  parseQuestionsFromDocxLines,
  parseDocxDocument
};

// Window global bindings
if (typeof window !== 'undefined') {
  window.parseDocxDocument = parseDocxDocument;
  window.parseMathTypeBinaryToLatex = parseMathTypeBinaryToLatex;
  window.ommlNodeToLatex = ommlNodeToLatex;
  window.isColorRedHex = isColorRedHex;
}
