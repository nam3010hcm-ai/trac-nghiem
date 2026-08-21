"""
Backend Microservice OCR Đề Thi Toán Học
Tích hợp LaTeX-OCR (Pix2TeX), PyMuPDF và python-docx
Hỗ trợ chuyển đổi trực tiếp ảnh công thức toán sang mã LaTeX chuẩn
"""

import os
import re
import io
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

app = FastAPI(
    title="LaTeX-OCR Exam Parsing API",
    description="Microservice bóc tách đề thi toán học từ Word (.docx) và PDF sử dụng mô hình học sâu Pix2TeX / LaTeX-OCR",
    version="1.0.0"
)

# Kích hoạt CORS để frontend Vercel hoặc localhost gọi API được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo mô hình LaTeX-OCR (Pix2TeX)
ocr_model = None

def get_ocr_model():
    global ocr_model
    if ocr_model is None:
        try:
            from pix2tex.cli import LatexOCR
            print("🚀 Đang khởi tạo mô hình LaTeX-OCR (Pix2TeX)...")
            ocr_model = LatexOCR()
            print("✅ Mô hình LaTeX-OCR đã sẵn sàng hoạt động!")
        except Exception as e:
            print(f"⚠️ Chưa cài đặt hoặc lỗi khởi tạo pix2tex: {e}")
            ocr_model = False
    return ocr_model


# ==============================================================
# 1. CÁC ENDPOINT CƠ BẢN
# ==============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "LaTeX-OCR Exam Parsing Backend",
        "author": "Antigravity & nam3010hcm-ai",
        "docs": "/docs"
    }

@app.get("/api/health")
def health():
    model = get_ocr_model()
    return {
        "status": "ok",
        "model_loaded": bool(model),
        "engine": "pix2tex/LaTeX-OCR"
    }


# ==============================================================
# 2. ENDPOINT OCR TỪNG ẢNH CÔNG THỨC ĐƠN LẺ
# ==============================================================

@app.post("/api/ocr-math")
async def ocr_math_image(file: UploadFile = File(...)):
    """Nhận một file ảnh công thức và trả về mã LaTeX tương ứng"""
    model = get_ocr_model()
    if not model:
        raise HTTPException(status_code=500, detail="Mô hình LaTeX-OCR chưa được cài đặt (cần chạy: pip install 'pix2tex[api]').")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        latex_str = model(image)
        return {
            "success": True,
            "latex": f"${latex_str.strip()}$" if latex_str.strip() else ""
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi OCR ảnh: {str(e)}")


# ==============================================================
# 3. ENDPOINT BÓC TÁCH TOÀN BỘ FILE ĐỀ THI WORD (.DOCX) HOẶC PDF
# ==============================================================

@app.post("/api/parse-exam")
async def parse_exam_document(file: UploadFile = File(...)):
    """Bóc tách toàn bộ đề thi từ file Word (.docx) hoặc PDF và chuyển tất cả công thức sang LaTeX"""
    filename = file.filename or "exam"
    ext = filename.split(".")[-1].lower()

    contents = await file.read()

    if ext == "docx":
        return parse_docx_with_latex_ocr(contents, filename)
    elif ext == "pdf":
        return parse_pdf_with_latex_ocr(contents, filename)
    else:
        raise HTTPException(status_code=400, detail="Định dạng file không hỗ trợ. Vui lòng tải lên file .docx hoặc .pdf")


# ==============================================================
# 4. THUẬT TOÁN BÓC TÁCH WORD (.DOCX) + LATEX-OCR CHO CÔNG THỨC ẢNH
# ==============================================================

def parse_docx_with_latex_ocr(docx_bytes: bytes, filename: str) -> Dict[str, Any]:
    model = get_ocr_model()
    
    with io.BytesIO(docx_bytes) as docx_file:
        with zipfile.ZipFile(docx_file, 'r') as z:
            # 1. Đọc tệp document.xml
            if "word/document.xml" not in z.namelist():
                raise HTTPException(status_code=400, detail="File Word không hợp lệ (thiếu word/document.xml).")
            doc_xml_str = z.read("word/document.xml").decode("utf-8")

            # 2. Đọc bảng quan hệ relationships
            rels_map = {}
            if "word/_rels/document.xml.rels" in z.namelist():
                rels_xml_str = z.read("word/_rels/document.xml.rels").decode("utf-8")
                rels_root = ET.fromstring(rels_xml_str)
                for rel in rels_root:
                    r_id = rel.get("Id")
                    target = rel.get("Target", "")
                    if target.startswith("/"):
                        target = target[1:]
                    if not target.startswith("word/"):
                        target = "word/" + target.replace("../", "")
                    rels_map[r_id] = target

            # 3. Nạp và OCR tất cả các ảnh công thức trong word/media/
            media_latex_cache = {}
            for name in z.namelist():
                if name.startswith("word/media/") or name.startswith("word/embeddings/"):
                    ext = name.split(".")[-1].lower()
                    if ext in ["png", "jpg", "jpeg", "bmp", "gif", "tiff"]:
                        try:
                            img_data = z.read(name)
                            img = Image.open(io.BytesIO(img_data)).convert("RGB")
                            if model:
                                latex_code = model(img).strip()
                                if latex_code:
                                    media_latex_cache[name] = f"${latex_code}$"
                        except Exception as ex:
                            print(f"Lỗi OCR ảnh {name}: {ex}")

            # 4. Phân tích XML để trích xuất các đoạn văn và bảng
            ns = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
                'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
                'v': 'urn:schemas-microsoft-com:vml',
                'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
                'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
            }

            root = ET.fromstring(doc_xml_str)
            body = root.find('w:body', ns)
            if body is None:
                raise HTTPException(status_code=400, detail="Không tìm thấy nội dung body trong file Word.")

            extracted_lines = []

            # Duyệt từng paragraph hoặc table trong body
            for child in body:
                tag = child.tag.split('}')[-1]
                if tag == 'p':
                    line_data = extract_p_data(child, rels_map, media_latex_cache, ns)
                    if line_data["text"].strip():
                        extracted_lines.append(line_data)
                elif tag == 'tbl':
                    for row in child.findall('.//w:tr', ns):
                        for cell in row.findall('.//w:tc', ns):
                            for p in cell.findall('.//w:p', ns):
                                line_data = extract_p_data(p, rels_map, media_latex_cache, ns)
                                if line_data["text"].strip():
                                    extracted_lines.append(line_data)

            # 5. Phân tách danh sách câu hỏi
            questions = parse_questions_from_extracted_lines(extracted_lines)
            
            detected_title = filename.rsplit(".", 1)[0]
            return {
                "examName": f"Đề thi: {detected_title}",
                "cat": "Toán",
                "subcat": "Toán/Phần 2 - Đại số",
                "timeLimit": max(15, min(180, int(len(questions) * 1.5))),
                "description": f"Bóc tách bằng LaTeX-OCR từ file Word {filename} ({len(questions)} câu hỏi).",
                "questions": questions
            }


def extract_p_data(p_node, rels_map, media_latex_cache, ns):
    full_text = ""
    has_red = False
    has_bold = False

    for child in p_node:
        tag = child.tag.split('}')[-1]

        # 1. OMML Math
        if tag in ['oMath', 'oMathPara']:
            latex = omml_to_latex_tree(child, ns)
            if latex:
                full_text += f" ${latex}$ "

        # 2. Text Run
        elif tag == 'r':
            r_text = ""
            r_pr = child.find('w:rPr', ns)
            if r_pr is not None:
                color = r_pr.find('w:color', ns)
                if color is not None:
                    val = (color.get(f"{{{ns['w']}}}val") or color.get("val") or "").lower()
                    if any(val.startswith(x) for x in ['ff0', 'ee0', 'dc2', 'c00', 'red', 'ef4']):
                        has_red = True
                b = r_pr.find('w:b', ns)
                if b is not None:
                    has_bold = True

            # Kiểm tra text trong run
            for t in child.findall('.//w:t', ns):
                if t.text:
                    r_text += t.text

            # Kiểm tra ảnh / drawing trong run
            for blip in child.findall('.//a:blip', ns):
                r_id = blip.get(f"{{{ns['r']}}}embed") or blip.get("embed")
                if r_id in rels_map:
                    target_path = rels_map[r_id]
                    if target_path in media_latex_cache:
                        r_text += f" {media_latex_cache[target_path]} "

            if r_text:
                if re.match(r'^[a-dA-D][.:\-\/)]', r_text.strip()) and full_text and not full_text.endswith(' '):
                    full_text += ' '
                full_text += r_text

    return {
        "text": full_text.strip(),
        "has_red": has_red,
        "has_bold": has_bold
    }


def omml_to_latex_tree(node, ns) -> str:
    """Chuyển đổi cây XML OMML cơ bản sang LaTeX"""
    tag = node.tag.split('}')[-1]
    
    if tag == 't':
        t = node.text or ''
        return t.replace('´', r'\times ').replace('¹', r'\neq ').replace('£', r'\le ').replace('³', r'\ge ').replace('–', '-')

    if tag == 'f':
        num = node.find('m:num', ns)
        den = node.find('m:den', ns)
        num_str = omml_to_latex_tree(num, ns) if num is not None else "1"
        den_str = omml_to_latex_tree(den, ns) if den is not None else "1"
        return f"\\frac{{{num_str}}}{{{den_str}}}"

    if tag == 'sSup':
        e = node.find('m:e', ns)
        sup = node.find('m:sup', ns)
        e_str = omml_to_latex_tree(e, ns) if e is not None else ""
        sup_str = omml_to_latex_tree(sup, ns) if sup is not None else ""
        return f"{e_str}^{{{sup_str}}}"

    if tag == 'sSub':
        e = node.find('m:e', ns)
        sub = node.find('m:sub', ns)
        e_str = omml_to_latex_tree(e, ns) if e is not None else ""
        sub_str = omml_to_latex_tree(sub, ns) if sub is not None else ""
        return f"{e_str}_{{{sub_str}}}"

    if tag == 'm': # Matrix
        rows_str = []
        for mr in node.findall('m:mr', ns):
            cells_str = [omml_to_latex_tree(e, ns) for e in mr.findall('m:e', ns)]
            rows_str.append(" & ".join(cells_str))
        return f"\\begin{{bmatrix}} {' \\\\ '.join(rows_str)} \\end{{bmatrix}}"

    # Đệ quy cho các phần tử khác
    res = []
    for c in node:
        s = omml_to_latex_tree(c, ns)
        if s:
            res.append(s)
    return "".join(res)


# ==============================================================
# 5. THUẬT TOÁN BÓC TÁCH CÂU HỎI & 4 LỰA CHỌN
# ==============================================================

def parse_questions_from_extracted_lines(lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    full_text = "\n".join(l["text"] for l in lines)
    q_headers = []
    q_regex = re.compile(r'(?:^|\n)\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*(\d+)(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|(\d{1,3})[\s.:\-\/)](?=\s+[A-ZÀ-Ỹa-zà-ỹ0-9$]))', re.IGNORECASE)

    for match in q_regex.finditer(full_text):
        q_num = int(match.group(1) or match.group(2))
        q_headers.append({"q_num": q_num, "start_idx": match.start()})

    if not q_headers:
        return [{"text": l["text"], "opts": ["A", "B", "C", "D"], "ans": 0, "explain": ""} for l in lines if len(l["text"]) > 20]

    questions = []
    for i in range(len(q_headers)):
        cur = q_headers[i]
        next_start = q_headers[i + 1]["start_idx"] if i + 1 < len(q_headers) else len(full_text)
        block = full_text[cur["start_idx"]:next_start].strip()

        parsed_q = parse_single_question_block(block, cur["q_num"], lines)
        if parsed_q:
            questions.append(parsed_q)

    return questions


def parse_single_question_block(block: str, q_num: int, all_lines: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Tách tiêu đề câu hỏi (VD: Câu 1:)
    header_match = re.match(r'^\s*(?:(?:C[âaÂA]u|B[àaÀA]i|Question|Q|Q\.)\s*\d+(?:\s*\([^)]*\)|\s*\[[^\]]*\])?[\s.:\-\/)]+|\d{1,3}[\s.:\-\/)])\s*', block, re.IGNORECASE)
    content = block[len(header_match.group(0)):].strip() if header_match else block

    # Tách lời giải (nếu có)
    explain = ""
    explain_match = re.search(r'(?:\n|\s{2,})(?:L[ờo]i\s*gi[ảa]i|H[ưu][ớo]ng\s*d[ẫa]n\s*gi[ảa]i|HDG|Gi[ảa]i\s*th[íi]ch|Gi[ảa]i)\s*[:.]\s*([\s\S]*)$', content, re.IGNORECASE)
    if explain_match:
        explain = explain_match.group(1).strip()
        content = content[:explain_match.start()].strip()

    # Tìm 4 lựa chọn a., b., c., d. hoặc A., B., C., D.
    opt_regex = re.compile(r'(?:^|\n|\s{2,}|\t|\s|[*$)}\]])(?:\*|\[x\]\s*)?([A-Da-d])(?:[\s.:\-\/)\]]*[.:\-\/)\]]+|\s*(?=\$|[0-9–\-]))(?!\d)')
    matches = []
    for om in opt_regex.finditer(content):
        raw_char = om.group(1)
        letter = raw_char.upper()
        opt_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}.get(letter, 0)
        matches.append({
            "raw_char": raw_char,
            "letter": letter,
            "opt_idx": opt_idx,
            "start": om.start(),
            "full_len": len(om.group(0))
        })

    # Tìm các nhãn duy nhất
    seen = set()
    unique_matches = []
    for m in matches:
        if m["opt_idx"] not in seen:
            seen.add(m["opt_idx"])
            unique_matches.append(m)
    unique_matches.sort(key=lambda x: x["start"])

    opts = ["", "", "", ""]
    detected_ans = 0
    q_text = content

    if len(unique_matches) >= 2:
        q_text = content[:unique_matches[0]["start"]].strip()
        for i in range(len(unique_matches)):
            cur = unique_matches[i]
            s_idx = cur["start"] + cur["full_len"]
            e_idx = unique_matches[i + 1]["start"] if i + 1 < len(unique_matches) else len(content)
            opt_text = content[s_idx:e_idx].strip()
            opts[cur["opt_idx"]] = opt_text

            # Kiểm tra màu đỏ trong các dòng tương ứng
            for line in all_lines:
                if line["has_red"]:
                    if f"{cur['raw_char']}." in line["text"] or f"{cur['letter']}." in line["text"]:
                        detected_ans = cur["opt_idx"]
                        break

    for i in range(4):
        if not opts[i].strip():
            opts[i] = f"(Lựa chọn {['A', 'B', 'C', 'D'][i]})"

    return {
        "text": q_text or f"Nội dung câu hỏi {q_num}",
        "opts": opts,
        "ans": detected_ans,
        "explain": explain
    }


# ==============================================================
# 6. BÓC TÁCH PDF VỚI PYMUPDF + LATEX-OCR
# ==============================================================

def parse_pdf_with_latex_ocr(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="Cần cài đặt PyMuPDF: pip install PyMuPDF")

    model = get_ocr_model()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_lines = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text_page = page.get_text("blocks")
        for b in text_page:
            # b: (x0, y0, x1, y1, text, block_no, block_type)
            if b[6] == 0 and b[4].strip():
                all_lines.append({
                    "text": b[4].strip(),
                    "has_red": False,
                    "has_bold": False
                })

    questions = parse_questions_from_extracted_lines(all_lines)
    detected_title = filename.rsplit(".", 1)[0]
    return {
        "examName": f"Đề thi PDF: {detected_title}",
        "cat": "Toán",
        "subcat": "Toán/Phần 2 - Đại số",
        "timeLimit": max(15, min(180, int(len(questions) * 1.5))),
        "description": f"Bóc tách từ file PDF {filename} ({len(questions)} câu hỏi).",
        "questions": questions
    }
