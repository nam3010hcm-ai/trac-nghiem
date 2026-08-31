export const STEM_CS_CHEM = [
  {
    "id": "unit_cs_1",
    "subject": "💻 Tin Học",
    "module": "Học phần 1: Lập Trình Python Cơ Bản",
    "title": "Unit 1: Kiểu Dữ Liệu, Vòng Lặp & Cấu Trúc Điều Kiện",
    "topic": "Lập trình Python",
    "level": "Cơ bản",
    "icon": "💻",
    "description": "Nắm vững cú pháp cơ bản của Python: biến số, chuỗi ký tự, danh sách (List), câu lệnh if-elif-else và vòng lặp for/while.",
    "isHidden": false,
    "listening": [
      {
        "id": "lis_cs_1",
        "title": "Audio Guide: Giới thiệu ngôn ngữ lập trình Python",
        "topic": "Cú pháp Python",
        "level": "Cơ bản",
        "audioText": "Python là ngôn ngữ lập trình bậc cao, thông dịch, hướng đối tượng và có cú pháp rất trong sáng, dễ đọc. Trong Python, chúng ta không cần khai báo kiểu dữ liệu cho biến và dùng thụt lề để phân định các khối lệnh.",
        "duration": "35s",
        "exercises": [
          {
            "type": "mcq",
            "question": "Python sử dụng yếu tố nào để phân chia các khối lệnh (code block)?",
            "options": [
              "Thụt lề (Indentation)",
              "Dấu ngoặc nhọn { }",
              "Dấu chấm phẩy ;",
              "Từ khóa begin/end"
            ],
            "answer": 0,
            "explain": "Python dùng khoảng trắng thụt lề (indentation) để phân cấp khối lệnh."
          }
        ]
      }
    ],
    "reading": [
      {
        "id": "read_cs_1",
        "title": "Cấu Trúc Danh Sách (List) & Phương Thức Thông Dụng",
        "topic": "Python List",
        "level": "Cơ bản",
        "text": "List trong Python là kiểu dữ liệu có thể thay đổi (mutable), cho phép chứa các phần tử thuộc nhiều kiểu dữ liệu khác nhau. Một số hàm thông dụng: append() để thêm phần tử vào cuối, pop() để xóa và lấy phần tử ra, len() để đếm số lượng phần tử.",
        "exercises": [
          {
            "type": "mcq",
            "question": "Phương thức nào dùng để thêm một phần tử vào cuối danh sách trong Python?",
            "options": [
              "append()",
              "add()",
              "push()",
              "insert_end()"
            ],
            "answer": 0,
            "explain": "list.append(x) thêm phần tử x vào cuối danh sách."
          }
        ]
      }
    ],
    "speaking": [
      {
        "id": "spk_cs_1",
        "title": "Đọc Code Chuẩn: Cấu trúc If-Else trong Python",
        "topic": "Cú pháp điều kiện",
        "level": "Cơ bản",
        "phrases": [
          {
            "text": "if score >= 8: print(\"Excellent\") else: print(\"Keep practicing\")",
            "ipa": "/Python If Statement/",
            "meaning": "Nếu điểm lớn hơn hoặc bằng 8 thì in ra Giỏi, ngược lại in Cần cố gắng.",
            "tip": "Chú ý dấu hai chấm (:) ở cuối dòng điều kiện."
          }
        ]
      }
    ],
    "writing": [
      {
        "id": "wrt_cs_1",
        "title": "Sắp Xếp Cú Pháp Vòng Lặp For",
        "topic": "Python Loops",
        "level": "Cơ bản",
        "items": [
          {
            "id": "sc_cs1",
            "words": [
              "for item in my_list:",
              "print(item)"
            ],
            "correctSentence": "for item in my_list: print(item)",
            "hint": "Cú pháp duyệt qua từng phần tử của danh sách."
          }
        ]
      }
    ],
    "languageFocus": {
      "flashcards": [
        {
          "id": "fc_cs1",
          "word": "List Comprehension",
          "pos": "Tính năng",
          "ipa": "/lɪst ˌkɒm.prɪˈhen.ʃən/",
          "meaning": "Cú pháp ngắn gọn để tạo danh sách mới dựa trên danh sách hiện có.",
          "example": "[x * 2 for x in range(5)] tạo ra [0, 2, 4, 6, 8]",
          "synonyms": "Tạo danh sách nhanh"
        }
      ],
      "matchPairs": [
        {
          "left": "int",
          "right": "Kiểu số nguyên (1, 2, -5)",
          "pairId": 1
        },
        {
          "left": "float",
          "right": "Kiểu số thực (3.14, -0.5)",
          "pairId": 2
        },
        {
          "left": "str",
          "right": "Kiểu chuỗi văn bản (\"Hello\")",
          "pairId": 3
        },
        {
          "left": "bool",
          "right": "Kiểu logic (True / False)",
          "pairId": 4
        }
      ],
      "grammarChallenge": [
        {
          "id": "gm_cs1",
          "question": "Kết quả của biểu thức len([10, 20, 30]) trong Python là:",
          "options": [
            "3",
            "30",
            "2",
            "Error"
          ],
          "answer": 0,
          "explain": "Danh sách có 3 phần tử nên hàm len() trả về 3."
        }
      ]
    }
  },
  {
    "id": "unit_chem_1",
    "subject": "🧪 Hóa Học",
    "module": "Học phần 1: Hóa Học Đại Cương & Vô Cơ",
    "title": "Unit 1: Cấu Tạo Nguyên Tử & Bảng Tuần Hoàn Các Nguyên Tố",
    "topic": "Hóa học Đại Cương",
    "level": "Lớp 10 - 12",
    "icon": "🧪",
    "description": "Nghiên cứu hạt nhân nguyên tử, lớp vỏ electron, quy luật biến đổi tuần hoàn tính kim loại, phi kim và bán kính nguyên tử.",
    "isHidden": false,
    "listening": [
      {
        "id": "lis_chem_1",
        "title": "Bài Giảng: Cấu hình Electron và Bảng tuần hoàn",
        "topic": "Nguyên tử",
        "level": "Cơ bản",
        "audioText": "Nguyên tử được cấu tạo từ hạt nhân mang điện tích dương và lớp vỏ electron mang điện tích âm. Số thứ tự ô nguyên tố trong bảng tuần hoàn bằng đúng số hiệu nguyên tử Z, số thứ tự chu kỳ bằng số lớp electron và số thứ tự nhóm A bằng số electron ở lớp ngoài cùng.",
        "duration": "40s",
        "exercises": [
          {
            "type": "mcq",
            "question": "Số thứ tự chu kỳ trong bảng tuần hoàn hóa học cho biết điều gì?",
            "options": [
              "Số lớp electron của nguyên tử",
              "Số electron hóa trị",
              "Số proton trong hạt nhân",
              "Khối lượng nguyên tử"
            ],
            "answer": 0,
            "explain": "Số thứ tự chu kỳ bằng số lớp electron của nguyên tử nguyên tố đó."
          }
        ]
      }
    ],
    "reading": [
      {
        "id": "read_chem_1",
        "title": "Quy Luật Biến Đổi Tính Chất Trong Chu Kỳ",
        "topic": "Định luật tuần hoàn",
        "level": "Cơ bản",
        "text": "Trong cùng một chu kỳ, đi từ trái sang phải theo chiều tăng dần của điện tích hạt nhân: điện tích hạt nhân tăng, bán kính nguyên tử giảm dần, độ âm điện tăng dần, tính kim loại giảm dần và tính phi kim tăng dần.",
        "exercises": [
          {
            "type": "mcq",
            "question": "Trong cùng một chu kỳ, đi từ trái sang phải, tính phi kim của các nguyên tố biến đổi như thế nào?",
            "options": [
              "Tăng dần",
              "Giảm dần",
              "Không thay đổi",
              "Biến đổi không theo quy luật"
            ],
            "answer": 0,
            "explain": "Trong một chu kỳ, từ trái sang phải theo chiều tăng điện tích hạt nhân, tính kim loại giảm và tính phi kim tăng dần."
          }
        ]
      }
    ],
    "speaking": [
      {
        "id": "spk_chem_1",
        "title": "Đọc Tên Hợp Chất & Phương Trình Hóa Học",
        "topic": "Thuật ngữ Hóa học",
        "level": "Cơ bản",
        "phrases": [
          {
            "text": "2H2 + O2 -> 2H2O (Hai phân tử khí hiđro phản ứng với một phân tử khí oxi tạo thành hai phân tử nước)",
            "ipa": "/Chemical Equation/",
            "meaning": "Phản ứng tổng hợp nước tỏa nhiều nhiệt.",
            "tip": "Nhớ cân bằng số nguyên tử của từng nguyên tố ở 2 vế của phương trình."
          }
        ]
      }
    ],
    "writing": [
      {
        "id": "wrt_chem_1",
        "title": "Sắp Xếp Cấu Hình Electron Của Nguyên Tử Natri (Z=11)",
        "topic": "Cấu hình electron",
        "level": "Cơ bản",
        "items": [
          {
            "id": "sc_ch1",
            "words": [
              "1s²",
              "2s² 2p⁶",
              "3s¹"
            ],
            "correctSentence": "1s² 2s² 2p⁶ 3s¹",
            "hint": "Lớp 1 có 2e, lớp 2 có 8e, lớp 3 có 1e."
          }
        ]
      }
    ],
    "languageFocus": {
      "flashcards": [
        {
          "id": "fc_ch1",
          "word": "Electronegativity (Độ âm điện)",
          "pos": "Khái niệm",
          "ipa": "/ɪˌlek.trəʊ.neɡ.əˈtɪv.ə.ti/",
          "meaning": "Đại lượng đặc trưng cho khả năng hút electron của nguyên tử khi tạo thành liên kết hóa học.",
          "example": "Flo (F) là nguyên tố có độ âm điện lớn nhất trong bảng tuần hoàn (3.98).",
          "synonyms": "Độ hút electron"
        }
      ],
      "matchPairs": [
        {
          "left": "Proton (p)",
          "right": "Mang điện tích dương (+1)",
          "pairId": 1
        },
        {
          "left": "Electron (e)",
          "right": "Mang điện tích âm (-1)",
          "pairId": 2
        },
        {
          "left": "Neutron (n)",
          "right": "Không mang điện tích (0)",
          "pairId": 3
        }
      ],
      "grammarChallenge": [
        {
          "id": "gm_ch1",
          "question": "Nguyên tố Clo (Z=17) có số electron ở lớp ngoài cùng là:",
          "options": [
            "7 electron",
            "8 electron",
            "5 electron",
            "2 electron"
          ],
          "answer": 0,
          "explain": "Cấu hình Cl: 1s² 2s² 2p⁶ 3s² 3p⁵ => Lớp ngoài cùng (lớp 3) có 2 + 5 = 7 electron."
        }
      ]
    }
  }
];
