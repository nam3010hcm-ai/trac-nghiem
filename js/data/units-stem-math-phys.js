export const STEM_MATH_PHYS = [
  {
    "id": "unit_math_1",
    "subject": "📐 Toán Học",
    "module": "Học phần 1: Đại Số & Hàm Số K7",
    "title": "Unit 1: Hàm Số Bậc Hai & Khảo Sát Đồ Thị Parabol",
    "topic": "Đại số & Giải tích",
    "level": "Lớp 10 - 12",
    "icon": "📐",
    "description": "Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc hai y = ax² + bx + c (a ≠ 0). Ứng dụng tìm tọa độ đỉnh, trục đối xứng và giá trị lớn nhất, nhỏ nhất.",
    "isHidden": false,
    "listening": [
      {
        "id": "lis_math_1",
        "title": "Bài Giảng: Khảo sát hàm số bậc hai",
        "topic": "Lý thuyết Hàm số",
        "level": "Cơ bản",
        "audioText": "Chào các em. Hôm nay chúng ta sẽ tìm hiểu về hàm số bậc hai dạng y bằng a nhân x bình phương cộng b nhân x cộng c. Với a khác không, đồ thị hàm số là một đường Parabol có đỉnh I với hoành độ trừ b chia cho hai a và tung độ trừ delta chia cho bốn a.",
        "duration": "45s",
        "exercises": [
          {
            "type": "mcq",
            "question": "Hoành độ đỉnh của đồ thị hàm số y = ax² + bx + c (a ≠ 0) là gì?",
            "options": [
              "x = -b / (2a)",
              "x = b / (2a)",
              "x = -b / a",
              "x = -c / a"
            ],
            "answer": 0,
            "explain": "Hoành độ đỉnh I của Parabol là x = -b / (2a)."
          },
          {
            "type": "mcq",
            "question": "Khi hệ số a > 0, bề lõm của Parabol quay về phía nào?",
            "options": [
              "Quay lên trên (đạt cực tiểu tại đỉnh)",
              "Quay xuống dưới",
              "Quay sang trái",
              "Quay sang phải"
            ],
            "answer": 0,
            "explain": "Khi a > 0, bề lõm Parabol hướng lên trên, đỉnh I là điểm thấp nhất (cực tiểu)."
          }
        ]
      }
    ],
    "reading": [
      {
        "id": "read_math_1",
        "title": "Lý Thuyết: Tính Đơn Điệu & Trục Đối Xứng của Parabol",
        "topic": "Đồ thị Parabol",
        "level": "Cơ bản",
        "text": "Hàm số bậc hai y = ax² + bx + c có tập xác định D = R. Trục đối xứng của Parabol là đường thẳng x = -b/(2a). Nếu a > 0, hàm số nghịch biến trên khoảng (-∞; -b/(2a)) và đồng biến trên khoảng (-b/(2a); +∞). Nếu a < 0, hàm số đồng biến trên khoảng (-∞; -b/(2a)) và nghịch biến trên khoảng (-b/(2a); +∞).",
        "exercises": [
          {
            "type": "mcq",
            "question": "Trục đối xứng của đồ thị Parabol y = 2x² - 4x + 1 là đường thẳng nào?",
            "options": [
              "x = 1",
              "x = -1",
              "x = 2",
              "x = -2"
            ],
            "answer": 0,
            "explain": "x = -b / (2a) = -(-4) / (2 * 2) = 4 / 4 = 1."
          }
        ]
      }
    ],
    "speaking": [
      {
        "id": "spk_math_1",
        "title": "Trình Bày: Định Lý Vi-ét & Biện Luận Nghiệm",
        "topic": "Công thức toán học",
        "level": "Trung bình",
        "phrases": [
          {
            "text": "Tổng hai nghiệm bằng trừ b trên a, tích hai nghiệm bằng c trên a.",
            "ipa": "/Vi-et Theorem/",
            "meaning": "S = x1 + x2 = -b/a; P = x1 * x2 = c/a",
            "tip": "Nhớ áp dụng định lý Vi-ét khi phương trình bậc hai có delta lớn hơn hoặc bằng 0."
          }
        ]
      }
    ],
    "writing": [
      {
        "id": "wrt_math_1",
        "title": "Sắp Xếp Các Bước Giải Phương Trình Bậc Hai",
        "topic": "Quy trình giải toán",
        "level": "Cơ bản",
        "items": [
          {
            "id": "sc_m1",
            "words": [
              "Xác định các hệ số a, b, c",
              "và",
              "tính biệt thức Delta",
              "để kết luận số nghiệm."
            ],
            "correctSentence": "Xác định các hệ số a, b, c và tính biệt thức Delta để kết luận số nghiệm.",
            "hint": "Bắt đầu bằng: \"Xác định các hệ số...\""
          }
        ]
      }
    ],
    "languageFocus": {
      "flashcards": [
        {
          "id": "fc_m1",
          "word": "Parabol Vertex",
          "pos": "Thuật ngữ",
          "ipa": "/ˈvɜː.teks/",
          "meaning": "Tọa độ đỉnh Parabol I(-b/2a; -Δ/4a)",
          "example": "Đỉnh Parabol là điểm cực trị của hàm số bậc hai.",
          "synonyms": "Đỉnh đồ thị, Điểm cực trị"
        },
        {
          "id": "fc_m2",
          "word": "Discriminant (Δ)",
          "pos": "Thuật ngữ",
          "ipa": "/dɪˈskrɪm.ɪ.nənt/",
          "meaning": "Biệt thức Delta: Δ = b² - 4ac",
          "example": "Nếu Δ > 0 phương trình có 2 nghiệm phân biệt.",
          "synonyms": "Biệt thức"
        }
      ],
      "matchPairs": [
        {
          "left": "Δ > 0",
          "right": "Phương trình có 2 nghiệm phân biệt",
          "pairId": 1
        },
        {
          "left": "Δ = 0",
          "right": "Phương trình có nghiệm kép",
          "pairId": 2
        },
        {
          "left": "Δ < 0",
          "right": "Phương trình vô nghiệm thực",
          "pairId": 3
        }
      ],
      "grammarChallenge": [
        {
          "id": "gm_m1",
          "question": "Phương trình x² - 6x + 9 = 0 có số nghiệm là:",
          "options": [
            "1 nghiệm kép (x = 3)",
            "2 nghiệm phân biệt",
            "Vô nghiệm",
            "Vô số nghiệm"
          ],
          "answer": 0,
          "explain": "Δ = (-6)² - 4*1*9 = 36 - 36 = 0 => Nghiệm kép x = -(-6)/(2*1) = 3."
        }
      ]
    }
  },
  {
    "id": "unit_phys_1",
    "subject": "⚡ Vật Lý",
    "module": "Học phần 1: Cơ Học & Động Lực Học K7",
    "title": "Unit 1: Ba Định Luật Newton & Các Lực Cơ Học",
    "topic": "Cơ học & Động lực học",
    "level": "Lớp 10 - 12",
    "icon": "⚡",
    "description": "Hệ thống định luật I, II, III của Newton; khái niệm quán tính, lực ma sát, lực đàn hồi và trọng lực.",
    "isHidden": false,
    "listening": [
      {
        "id": "lis_phys_1",
        "title": "Bài Giảng: Định Luật II Newton và Công Thức F = ma",
        "topic": "Động lực học",
        "level": "Cơ bản",
        "audioText": "Theo định luật hai Newton, gia tốc của một vật cùng hướng với lực tác dụng lên vật. Độ lớn của gia tốc tỉ lệ thuận với độ lớn của lực và tỉ lệ nghịch với khối lượng của vật. Biểu thức véctơ F bằng m nhân véctơ a.",
        "duration": "40s",
        "exercises": [
          {
            "type": "mcq",
            "question": "Công thức biểu diễn định luật II Newton là gì?",
            "options": [
              "F = m * a",
              "F = m / a",
              "F = m * v",
              "F = 0.5 * m * v²"
            ],
            "answer": 0,
            "explain": "Véc-tơ F = m * véc-tơ a."
          }
        ]
      }
    ],
    "reading": [
      {
        "id": "read_phys_1",
        "title": "Lý Thuyết: Quán Tính & Định Luật I Newton",
        "topic": "Quán tính",
        "level": "Cơ bản",
        "text": "Định luật I Newton: Nếu một vật không chịu tác dụng của lực nào hoặc chịu tác dụng của các lực có hợp lực bằng không, thì vật đang đứng yên sẽ tiếp tục đứng yên, đang chuyển động sẽ tiếp tục chuyển động thẳng đều. Tính chất bảo toàn vận tốc của vật gọi là quán tính.",
        "exercises": [
          {
            "type": "mcq",
            "question": "Vật chuyển động thẳng đều khi nào?",
            "options": [
              "Khi hợp lực tác dụng lên vật bằng 0",
              "Khi lực kéo lớn hơn ma sát",
              "Khi có gia tốc không đổi khác 0",
              "Khi vật ở trạng thái chân không"
            ],
            "answer": 0,
            "explain": "Khi hợp lực tác dụng lên vật bằng 0 (Định luật I Newton)."
          }
        ]
      }
    ],
    "speaking": [
      {
        "id": "spk_phys_1",
        "title": "Trình Bày: Cặp Lực Trực Đối Trong Định Luật III Newton",
        "topic": "Tương tác lực",
        "level": "Cơ bản",
        "phrases": [
          {
            "text": "Trong mọi trường hợp, khi vật A tác dụng lên vật B một lực, thì vật B cũng tác dụng lại vật A một lực trực đối.",
            "ipa": "/Newton Third Law/",
            "meaning": "F_AB = - F_BA (Cùng độ lớn, ngược hướng, tác dụng vào 2 vật khác nhau).",
            "tip": "Hai lực này không cân bằng nhau vì chúng đặt vào hai vật khác nhau."
          }
        ]
      }
    ],
    "writing": [
      {
        "id": "wrt_phys_1",
        "title": "Sắp Xếp Thứ Tự Phân Tích Lực",
        "topic": "Phương pháp động lực học",
        "level": "Cơ bản",
        "items": [
          {
            "id": "sc_p1",
            "words": [
              "Chọn hệ quy chiếu",
              "phân tích các lực tác dụng",
              "và áp dụng định luật II Newton."
            ],
            "correctSentence": "Chọn hệ quy chiếu phân tích các lực tác dụng và áp dụng định luật II Newton.",
            "hint": "Bắt đầu bằng: \"Chọn hệ quy chiếu...\""
          }
        ]
      }
    ],
    "languageFocus": {
      "flashcards": [
        {
          "id": "fc_p1",
          "word": "Inertia (Quán tính)",
          "pos": "Khái niệm",
          "ipa": "/ɪˈnɜː.ʃə/",
          "meaning": "Thuộc tính của mọi vật có xu hướng bảo toàn vận tốc cả về hướng và độ lớn.",
          "example": "Hành khách bị ngả người về phía sau khi xe tăng tốc đột ngột.",
          "synonyms": "Tính ỳ, Quán tính"
        }
      ],
      "matchPairs": [
        {
          "left": "Định luật I Newton",
          "right": "Định luật Quán tính",
          "pairId": 1
        },
        {
          "left": "Định luật II Newton",
          "right": "Gia tốc tỉ lệ với hợp lực (F = ma)",
          "pairId": 2
        },
        {
          "left": "Định luật III Newton",
          "right": "Lực và phản lực trực đối",
          "pairId": 3
        }
      ],
      "grammarChallenge": [
        {
          "id": "gm_p1",
          "question": "Một lực 10N tác dụng lên vật khối lượng 2kg thì gia tốc thu được là:",
          "options": [
            "5 m/s²",
            "20 m/s²",
            "2 m/s²",
            "0.2 m/s²"
          ],
          "answer": 0,
          "explain": "a = F / m = 10 / 2 = 5 m/s²."
        }
      ]
    }
  }
];
