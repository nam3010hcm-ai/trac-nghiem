/**
 * Ngân hàng dữ liệu UNITs bài học tương tác 5 kỹ năng Tiếng Anh
 * Interactive English Learning Hub - Units Data Bank
 */

export const DEFAULT_UNITS = [
  {
    id: 'unit_1',
    title: 'Unit 1: Everyday Life & Travel',
    topic: 'Daily Communication & Travel',
    level: 'A2 - B1',
    icon: '✈️',
    description: 'Rèn luyện 5 kỹ năng giao tiếp cơ bản: ở sân bay, gọi món ăn, tra từ đọc hiểu AI và thành ngữ thông dụng.',
    isHidden: false,
    listening: [
      {
        id: 'lis_1',
        title: 'A Conversation at the Airport',
        topic: 'Travel & Tourism',
        level: 'A2 - B1',
        audioText: "Good morning. Where are you flying to today? I'm flying to London Heathrow on flight BA178. May I see your passport and ticket, please? Here you go. Would you prefer a window seat or an aisle seat? An aisle seat, please. Great, here is your boarding pass. Gate 24B starts boarding at 10:30.",
        audioUrl: '',
        speed: 1.0,
        duration: '45s',
        exercises: [
          {
            type: 'mcq',
            question: 'Where is the passenger flying to?',
            options: ['London Gatwick', 'London Heathrow', 'New York JFK', 'Paris Charles de Gaulle'],
            answer: 1,
            explain: 'The passenger says: "I\'m flying to London Heathrow on flight BA178."'
          },
          {
            type: 'mcq',
            question: 'Which type of seat did the passenger choose?',
            options: ['Window seat', 'Middle seat', 'Aisle seat', 'First class suite'],
            answer: 2,
            explain: 'The passenger specifically answered: "An aisle seat, please."'
          },
          {
            type: 'dictation',
            prompt: 'Nghe và gõ lại chính xác câu bạn nghe được:',
            targetSentence: 'Gate 24B starts boarding at 10:30.',
            hint: 'Bắt đầu bằng "Gate..."'
          },
          {
            type: 'gap_fill',
            sentence: 'May I see your ___ and ticket, please? Here is your ___ pass.',
            answers: ['passport', 'boarding'],
            optionsBank: ['passport', 'boarding', 'luggage', 'visa']
          }
        ]
      },
      {
        id: 'lis_2',
        title: 'Ordering Food at a Cozy Restaurant',
        topic: 'Daily Life & Dining',
        level: 'A1 - A2',
        audioText: "Welcome to Bella Italia. Are you ready to order? Yes, please. I would like the grilled salmon with asparagus. And for your drink? Just a glass of sparkling water with lemon, please. Would you like any dessert later? Maybe some tiramisu afterwards. Thank you.",
        audioUrl: '',
        speed: 1.0,
        duration: '40s',
        exercises: [
          {
            type: 'mcq',
            question: 'What main dish does the customer order?',
            options: ['Seafood pasta', 'Grilled salmon with asparagus', 'Margherita pizza', 'Beef steak'],
            answer: 1,
            explain: 'The customer ordered: "grilled salmon with asparagus".'
          },
          {
            type: 'dictation',
            prompt: 'Nghe và gõ lại câu gọi đồ uống:',
            targetSentence: 'Just a glass of sparkling water with lemon, please.',
            hint: 'Bắt đầu bằng "Just a glass..."'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_1',
        title: 'The Rise of Artificial Intelligence in Everyday Life',
        topic: 'Technology & Future',
        level: 'B1 - B2',
        passage: `Artificial intelligence (AI) is no longer confined to science fiction novels. Today, AI technology quietly powers many of the tools and services we use on a daily basis. From virtual assistants like Siri and Alexa that schedule our appointments, to streaming algorithms on Spotify and Netflix that recommend songs and movies based on our preferences, AI has become an integral part of modern society.

In the medical field, machine learning algorithms can analyze radiology scans with remarkable accuracy, assisting doctors in detecting diseases at much earlier stages. In transportation, autonomous vehicles are being rigorously tested on public roads, promising to reduce traffic accidents caused by human error.

However, the rapid advancement of AI also raises ethical dilemmas. Issues regarding data privacy, algorithmic bias, and potential job displacement in certain sectors require urgent attention from policymakers. To ensure AI benefits humanity as a whole, experts emphasize that technological development must go hand in hand with robust regulatory frameworks and continuous ethical scrutiny.`,
        vocabulary: {
          'confined': { ipa: '/kənˈfaɪnd/', pos: 'adj', meaning: 'Bị giới hạn, giam hãm trong phạm vi nhất định' },
          'integral': { ipa: '/ˈɪn.tɪ.ɡrəl/', pos: 'adj', meaning: 'Thiết yếu, không thể thiếu' },
          'radiology': { ipa: '/ˌreɪ.diˈɒl.ə.dʒi/', pos: 'noun', meaning: 'Khoa X-quang, chẩn đoán hình ảnh y khoa' },
          'autonomous': { ipa: '/ɔːˈtɒn.ə.məs/', pos: 'adj', meaning: 'Tự hành, tự chủ (không cần người lái)' },
          'rigorously': { ipa: '/ˈrɪɡ.ər.əs.li/', pos: 'adv', meaning: 'Một cách nghiêm ngặt, khắt khe' },
          'dilemmas': { ipa: '/dɪˈlem.əz/', pos: 'noun (pl)', meaning: 'Tình thế tiến thoái lưỡng nan, vấn đề khó xử' },
          'displacement': { ipa: '/dɪsˈpleɪs.mənt/', pos: 'noun', meaning: 'Sự thay thế, sự dịch chuyển vị trí việc làm' },
          'scrutiny': { ipa: '/ˈskruː.tɪ.ni/', pos: 'noun', meaning: 'Sự xem xét, giám sát kỹ lưỡng' }
        },
        exercises: [
          {
            type: 'mcq',
            question: 'According to paragraph 1, how do streaming services like Netflix use AI?',
            options: [
              'To automatically translate movie subtitles into different languages',
              'To recommend content tailored to individual user preferences',
              'To generate synthetic voices for actors',
              'To detect illegal account sharing'
            ],
            answer: 1,
            explain: 'Đoạn 1 nêu: "...streaming algorithms on Spotify and Netflix that recommend songs and movies based on our preferences..."'
          },
          {
            type: 'tfng',
            question: 'Autonomous vehicles have already completely eliminated human-error accidents worldwide.',
            options: ['True (Đúng)', 'False (Sai)', 'Not Given (Không đề cập)'],
            answer: 1,
            explain: 'False. Bài đọc nói xe tự hành đang được thử nghiệm ("are being rigorously tested") và hứa hẹn sẽ giảm thiểu ("promising to reduce"), chứ chưa hoàn toàn xóa bỏ trên toàn thế giới.'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_1',
        title: 'Everyday Fluency & Idioms',
        topic: 'Daily Conversation',
        level: 'All Levels',
        phrases: [
          {
            text: 'It goes without saying that practice makes perfect.',
            ipa: '/ɪt ɡəʊz wɪðˈaʊt ˈseɪ.ɪŋ ðæt ˈpræk.tɪs meɪks ˈpɜː.fɪkt/',
            meaning: 'Dĩ nhiên là rèn luyện nhiều sẽ tạo nên sự hoàn hảo.',
            tip: 'Chú ý nối âm: "goes-without", phát âm chuẩn âm /s/ trong "practice" và "makes".'
          },
          {
            text: 'Could you please give me a hand with this suitcase?',
            ipa: '/kʊd juː pliːz ɡɪv miː ə hænd wɪð ðɪs ˈsuːt.keɪs/',
            meaning: 'Bạn có thể giúp tôi một tay với chiếc vali này được không?',
            tip: 'Cụm "give me a hand" nghĩa là giúp đỡ. Giữ ngữ điệu lên giọng nhẹ ở cuối câu hỏi Yes/No.'
          }
        ]
      },
      {
        id: 'spk_2',
        title: 'Interactive Coffee Shop Roleplay',
        topic: 'Roleplay Simulation',
        level: 'A2 - B1',
        dialogue: [
          {
            role: 'Barista (Máy)',
            avatar: '☕',
            text: 'Hello! Welcome to Sun Cafe. What can I get started for you today?',
            ipa: '',
            isUser: false
          },
          {
            role: 'You (Học viên nói)',
            avatar: '🧑‍🎓',
            targetText: 'Hi! I would like an iced caramel latte with oat milk, please.',
            ipa: '/haɪ aɪ wʊd laɪk ən aɪst ˈkær.ə.mel ˈlɑː.teɪ wɪð əʊt mɪlk pliːz/',
            meaning: 'Chào bạn! Cho tôi một ly latte caramel đá với sữa yến mạch nhé.',
            isUser: true
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_scramble',
        title: 'Sentence Scramble (Sắp xếp từ thành câu đúng)',
        topic: 'Grammar Structure',
        level: 'A2 - B1',
        items: [
          {
            id: 'sc_1',
            words: ['Although', 'it', 'rained', 'heavily,', 'we', 'decided', 'to', 'go', 'camping.'],
            correctSentence: 'Although it rained heavily, we decided to go camping.',
            hint: 'Mệnh đề nhượng bộ bắt đầu bằng "Although..."'
          },
          {
            id: 'sc_2',
            words: ['The', 'more', 'you', 'practice,', 'the', 'more', 'fluent', 'you', 'become.'],
            correctSentence: 'The more you practice, the more fluent you become.',
            hint: 'Cấu trúc so sánh kép "The more..., the more..."'
          }
        ]
      },
      {
        id: 'wrt_error_fix',
        title: 'Find & Correct the Grammar Mistakes',
        topic: 'Error Identification',
        level: 'B1',
        items: [
          {
            id: 'err_1',
            incorrectSentence: 'She has went to Tokyo three times this year.',
            errorWord: 'went',
            correctWord: 'been',
            fullCorrect: 'She has been to Tokyo three times this year.',
            explain: 'Sau thì Hiện tại hoàn thành "has + V3/V-ed", phân từ 2 của go/be là "been" (đã từng đi đến đó).'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_1',
          word: 'Perseverance',
          pos: 'noun',
          ipa: '/ˌpɜː.sɪˈvɪə.rəns/',
          meaning: 'Sự kiên trì, bền bỉ vượt qua khó khăn',
          example: 'Through hard work and perseverance, she achieved her dream of becoming a doctor.',
          synonyms: 'Persistence, dedication, endurance',
          image: ''
        },
        {
          id: 'fc_2',
          word: 'Sustainable',
          pos: 'adjective',
          ipa: '/səˈsteɪ.nə.bəl/',
          meaning: 'Bền vững, có thể duy trì lâu dài mà không hại môi trường',
          example: 'Solar energy provides a clean and sustainable source of power.',
          synonyms: 'Eco-friendly, renewable, durable',
          image: ''
        }
      ],
      matchPairs: [
        { left: 'Break a leg', right: 'Chúc may mắn (Good luck)', pairId: 1 },
        { left: 'Once in a blue moon', right: 'Rất hiếm khi xảy ra', pairId: 2 },
        { left: 'Piece of cake', right: 'Rất dễ dàng', pairId: 3 },
        { left: 'Under the weather', right: 'Cảm thấy hơi mệt/ốm', pairId: 4 }
      ],
      grammarChallenge: [
        {
          id: 'gm_1',
          question: 'By the time the train arrives, we ___ for over an hour.',
          options: ['will wait', 'will have been waiting', 'are waiting', 'waited'],
          answer: 1,
          explain: 'Cấu trúc "By the time + S + V(hiện tại đơn), S + will have been V-ing" (Tương lai hoàn thành tiếp diễn nhấn mạnh khoảng thời gian).'
        },
        {
          id: 'gm_2',
          question: 'Scarcely ___ the door when the phone rang.',
          options: ['he had opened', 'had he opened', 'did he open', 'he opened'],
          answer: 1,
          explain: 'Đảo ngữ với "Scarcely had + S + V3... when...": Vừa mới... thì...'
        }
      ]
    }
  },
  {
    id: 'unit_2',
    title: 'Unit 2: Nature, Environment & Career',
    topic: 'Environment & Professional Career',
    level: 'B1 - B2',
    icon: '🌿',
    description: 'Chinh phục chủ đề Môi trường và Phỏng vấn xin việc: Luyện nghe tự giới thiệu bản thân, đọc hiểu rạn san hô và từ vựng nâng cao.',
    isHidden: false,
    listening: [
      {
        id: 'lis_3',
        title: 'Job Interview: Introducing Yourself',
        topic: 'Business & Career',
        level: 'B1 - B2',
        audioText: "Thank you for inviting me today. I have over four years of experience as a software developer, specializing in frontend web technologies. In my previous role, I led a team of three developers to build an e-commerce platform that increased client sales by twenty-five percent. I am passionate about creating accessible, user-friendly digital products.",
        audioUrl: '',
        speed: 1.0,
        duration: '50s',
        exercises: [
          {
            type: 'mcq',
            question: 'How many years of experience does the candidate have?',
            options: ['2 years', '3 years', 'Over 4 years', '5 years'],
            answer: 2,
            explain: 'The candidate says: "I have over four years of experience as a software developer."'
          },
          {
            type: 'mcq',
            question: 'By how much did the e-commerce platform increase client sales?',
            options: ['15%', '20%', '25%', '30%'],
            answer: 2,
            explain: 'Mentioned: "...increased client sales by twenty-five percent (25%)."'
          },
          {
            type: 'dictation',
            prompt: 'Nghe và gõ lại câu chốt ấn tượng của ứng viên:',
            targetSentence: 'I am passionate about creating accessible, user-friendly digital products.',
            hint: 'Bắt đầu bằng "I am passionate..."'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_2',
        title: 'The Wonders of the Great Barrier Reef',
        topic: 'Nature & Environment',
        level: 'A2 - B1',
        passage: `Stretching over 2,300 kilometers along the northeast coast of Australia, the Great Barrier Reef is the world's largest coral reef ecosystem. It is so vast that it can even be seen from outer space. The reef is home to thousands of marine species, including colorful fish, sea turtles, giant clams, and harmless reef sharks.

Corals are not inanimate rocks; they are living marine animals that build hard limestone skeletons. Over hundreds of years, billions of tiny coral polyps work together to construct massive underwater structures.

Unfortunately, rising ocean temperatures due to climate change have triggered severe coral bleaching events. When the water gets too warm, corals expel the microscopic algae living inside them, turning completely white and starving if conditions do not normalize. Conservationists worldwide are striving to protect this natural treasure through habitat restoration and global climate action.`,
        vocabulary: {
          'ecosystem': { ipa: '/ˈiː.kəʊˌsɪs.təm/', pos: 'noun', meaning: 'Hệ sinh thái' },
          'inanimate': { ipa: '/ɪnˈæn.ɪ.mət/', pos: 'adj', meaning: 'Vô tri vô giác, không có sự sống' },
          'polyps': { ipa: '/ˈpɒl.ɪps/', pos: 'noun (pl)', meaning: 'Các cá thể san hô nhỏ' },
          'bleaching': { ipa: '/ˈbliː.tʃɪŋ/', pos: 'noun', meaning: 'Hiện tượng tẩy trắng (san hô bị mất màu)' },
          'expel': { ipa: '/ɪkˈspel/', pos: 'verb', meaning: 'Trục xuất, đẩy ra ngoài' },
          'restoration': { ipa: '/ˌres.tərˈeɪ.ʃən/', pos: 'noun', meaning: 'Sự phục hồi, khôi phục lại' }
        },
        exercises: [
          {
            type: 'mcq',
            question: 'What are corals actually?',
            options: [
              'Undersea colorful plants',
              'Inanimate mineral stones',
              'Living marine animals',
              'Artificial concrete blocks'
            ],
            answer: 2,
            explain: 'Đoạn 2 nêu rõ: "Corals are not inanimate rocks; they are living marine animals..."'
          },
          {
            type: 'tfng',
            question: 'The Great Barrier Reef is visible from outer space.',
            options: ['True (Đúng)', 'False (Sai)', 'Not Given (Không đề cập)'],
            answer: 0,
            explain: 'True. Đoạn 1 viết: "It is so vast that it can even be seen from outer space."'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_3',
        title: 'Environmental Responsibility',
        topic: 'Environment',
        level: 'B1 - B2',
        phrases: [
          {
            text: 'Environmental conservation should be everyone’s responsibility.',
            ipa: '/ɪnˌvaɪ.rənˈmen.təl ˌkɒn.səˈveɪ.ʃən ʃʊd biː ˈev.ri.wʌnz rɪˌspɒn.sɪˈbɪl.ə.ti/',
            meaning: 'Bảo vệ môi trường nên là trách nhiệm của tất cả mọi người.',
            tip: 'Trọng âm từ dài: envi-ron-MEN-tal, conser-VA-tion, responsi-BI-lity.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_scramble_2',
        title: 'Sentence Scramble: Conditionals',
        topic: 'Conditionals',
        level: 'B1 - B2',
        items: [
          {
            id: 'sc_4',
            words: ['If', 'I', 'had', 'known', 'the', 'truth,', 'I', 'would', 'have', 'helped', 'him.'],
            correctSentence: 'If I had known the truth, I would have helped him.',
            hint: 'Câu điều kiện loại 3 (quá khứ không có thật)'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_3',
          word: 'Eloquent',
          pos: 'adjective',
          ipa: '/ˈel.ə.kwənt/',
          meaning: 'Hùng biện, lưu loát, có tài ăn nói thuyết phục',
          example: 'The president delivered an eloquent speech that moved the entire audience.',
          synonyms: 'Articulate, fluent, persuasive',
          image: ''
        },
        {
          id: 'fc_4',
          word: 'Collaborate',
          pos: 'verb',
          ipa: '/kəˈlæb.ə.reɪt/',
          meaning: 'Hợp tác, cộng tác cùng làm việc',
          example: 'Researchers from various universities collaborated on the vaccine project.',
          synonyms: 'Cooperate, team up, work together',
          image: ''
        }
      ],
      matchPairs: [
        { left: 'Hit the books', right: 'Bắt đầu học chăm chỉ', pairId: 1 },
        { left: 'Cost an arm and a leg', right: 'Rất đắt đỏ, tốn kém', pairId: 2 }
      ],
      grammarChallenge: [
        {
          id: 'gm_3',
          question: 'I wish I ___ more attention during yesterday’s lecture.',
          options: ['paid', 'had paid', 'have paid', 'would pay'],
          answer: 1,
          explain: 'Ước muốn một điều trái với thực tế trong quá khứ ("yesterday") dùng "wish + had + V3".'
        }
      ]
    }
  }
];

export const LEARN_DATA = {
  units: DEFAULT_UNITS
};
