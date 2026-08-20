/**
 * Ngân hàng dữ liệu UNITs bài học tương tác 5 kỹ năng Tiếng Anh
 * Interactive English Learning Hub - Units Data Bank
 */

export const DEFAULT_UNITS = [
  {
    id: 'unit_1',
    subject: '🇬🇧 Tiếng Anh',
    module: 'English B1 - General & Academic Skills',
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
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80',
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
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
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
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
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
        id: 'spk_video_multi_1',
        type: 'video_roleplay',
        title: '🎬 Multi-Character Video: Project Kickoff Meeting',
        topic: 'Business & Teamwork (3 Nhân Vật)',
        level: 'B1 - B2',
        description: 'Hội thoại tương tác 3 nhân vật trong cuộc họp dự án: Alex (Project Lead), Bella (UI/UX Designer), David (Tech Lead). Bạn có thể chọn đóng vai bất kỳ nhân vật nào để luyện phản xạ và giao tiếp đa chiều!',
        characters: [
          {
            code: 'A',
            id: 'A',
            name: 'Alex (Project Manager)',
            avatar: '👨‍💼',
            roleTitle: 'Trưởng Dự Án',
            color: '#2563eb',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            code: 'B',
            id: 'B',
            name: 'Bella (UI/UX Designer)',
            avatar: '👩‍🎨',
            roleTitle: 'Chuyên Viên Thiết Kế',
            color: '#db2777',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            code: 'C',
            id: 'C',
            name: 'David (Tech Lead)',
            avatar: '🧑‍💻',
            roleTitle: 'Kỹ Sư Trưởng Backend',
            color: '#059669',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          }
        ],
        dialogue: [
          {
            id: 'm_dlg_1',
            speaker: 'A',
            speakerName: 'Alex (Project Manager)',
            text: "Good morning team! Today we are kicking off the mobile learning app redesign.",
            ipa: "/ɡʊd ˈmɔː.nɪŋ tiːm! təˈdeɪ wiː ɑːr ˈkɪk.ɪŋ ɒf ðə ˈməʊ.baɪl ˈlɜː.nɪŋ æp ˌriː.dɪˈzaɪn/",
            meaning: "Chào cả nhóm! Hôm nay chúng ta chính thức khởi động dự án thiết kế lại ứng dụng học tập di động.",
            tip: "Cụm 'kick off' mang nghĩa bắt đầu/khởi động. Nhấn trọng âm vào 'mobile learning' và 'redesign'.",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'm_dlg_2',
            speaker: 'B',
            speakerName: 'Bella (UI/UX Designer)',
            text: "I have prepared the interactive prototype with a fresh modern color palette and intuitive navigation.",
            ipa: "/aɪ hæv prɪˈpeəd ðə ˌɪn.təˈræk.tɪv ˈprəʊ.tə.taɪp wɪð ə freʃ ˈmɒd.ən ˈkʌl.ər ˈpæl.ət ænd ɪnˈtjuː.ɪ.tɪv ˌnæv.ɪˈɡeɪ.ʃən/",
            meaning: "Tôi đã chuẩn bị bản mẫu tương tác với bảng màu hiện đại và luồng điều hướng rất trực quan.",
            tip: "Phát âm chuẩn âm /p/ trong 'prototype', trọng âm 'intuitive' nhấn vào âm tiết 2 /ɪnˈtjuː.ɪ.tɪv/.",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'm_dlg_3',
            speaker: 'C',
            speakerName: 'David (Tech Lead)',
            text: "The backend server and database architecture are optimized and ready for frontend API integration.",
            ipa: "/ðiː ˈbæk.end ˈsɜː.vər ænd ˈdeɪ.tə.beɪs ˈɑː.kɪ.tek.tʃər ɑːr ˈɒp.tɪ.maɪzd ænd ˈred.i fɔːr ˌfrʌnt.end eɪ.piːˈaɪ ˌɪn.tɪˈɡreɪ.ʃən/",
            meaning: "Hệ thống máy chủ backend và cơ sở dữ liệu đã được tối ưu hóa, sẵn sàng để tích hợp API với frontend.",
            tip: "Nối âm /r/ trong 'server and', phát âm chính xác 'architecture' /ˈɑː.kɪ.tek.tʃər/.",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'm_dlg_4',
            speaker: 'A',
            speakerName: 'Alex (Project Manager)',
            text: "Great progress! Can we conduct our first usability test by next Friday?",
            ipa: "/ɡreɪt ˈprəʊ.ɡres! kæn wiː kənˈdʌkt aʊər fɜːst ˌjuː.zəˈbɪl.ə.ti test baɪ nekst ˈfraɪ.deɪ?/",
            meaning: "Tiến độ rất tuyệt vời! Liệu chúng ta có thể tiến hành buổi thử nghiệm trải nghiệm người dùng đầu tiên vào thứ Sáu tới không?",
            tip: "Lên giọng ở cuối câu hỏi '...by next Friday?'.",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'm_dlg_5',
            speaker: 'B',
            speakerName: 'Bella (UI/UX Designer)',
            text: "Absolutely! I will finalize the design assets and upload them to Figma by Wednesday.",
            ipa: "/ˌæb.səˈluːt.li! aɪ wɪl ˈfaɪ.nəl.aɪz ðə dɪˈzaɪn ˈæs.ets ænd ʌpˈləʊd ðem tuː Figma baɪ ˈwenz.deɪ/",
            meaning: "Chắc chắn rồi! Tôi sẽ hoàn thiện các tài nguyên thiết kế và tải lên Figma trước thứ Tư.",
            tip: "Từ 'Wednesday' phát âm là /ˈwenz.deɪ/ (âm d câm).",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'm_dlg_6',
            speaker: 'C',
            speakerName: 'David (Tech Lead)',
            text: "And our engineering team will set up the automated test suites to ensure zero bugs.",
            ipa: "/ænd aʊər ˌen.dʒɪˈnɪə.rɪŋ tiːm wɪl set ʌp ðiː ˈɔː.tə.meɪ.tɪd test swiːts tuː ɪnˈʃɔːr ˈzɪə.rəʊ bʌɡz/",
            meaning: "Và đội ngũ kỹ thuật chúng tôi sẽ thiết lập bộ kiểm thử tự động để đảm bảo không phát sinh lỗi.",
            tip: "Từ 'suites' đọc giống /swiːts/ (giống từ sweets).",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          }
        ],
        exercises: [
          {
            type: 'mcq',
            question: 'What is Bella responsible for delivering before Wednesday?',
            options: [
              'Deploying the database to production',
              'Finalizing design assets and uploading to Figma',
              'Writing automated test suites for backend',
              'Signing the contract with the client'
            ],
            answer: 1,
            explain: 'Bella stated: "I will finalize the design assets and upload them to Figma by Wednesday."'
          },
          {
            type: 'gap_fill',
            sentence: 'David and his engineering team will set up ___ test suites to ensure zero bugs.',
            correct: 'automated',
            hint: 'từ bắt đầu bằng chữ "auto..."'
          },
          {
            type: 'mcq',
            question: 'When is the team planning to conduct their first usability test?',
            options: [
              'Tomorrow morning',
              'Next Friday',
              'Next month',
              'This Wednesday afternoon'
            ],
            answer: 1,
            explain: 'Alex asked: "Can we conduct our first usability test by next Friday?" and the team agreed.'
          }
        ]
      },
      {
        id: 'spk_video_1',
        type: 'video_roleplay',
        title: '🎬 Video Roleplay: Hotel Check-in & Inquiry',
        topic: 'Travel & Hospitality Simulation (2 Nhân Vật)',
        level: 'A2 - B1',
        description: 'Mô phỏng hội thoại video tương tác giữa Lễ tân khách sạn (Emma) và Du khách (David). Bạn có thể chọn đóng vai Nhân vật A hoặc Nhân vật B để luyện phát âm.',
        characterA: {
          id: 'A',
          name: 'Emma (Lễ tân khách sạn)',
          avatar: '👩‍💼',
          roleTitle: 'Hotel Receptionist',
          color: '#2563eb',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        characterB: {
          id: 'B',
          name: 'David (Du khách check-in)',
          avatar: '🧑‍🦱',
          roleTitle: 'Guest / Traveler',
          color: '#059669',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        },
        dialogue: [
          {
            id: 'dlg_1',
            speaker: 'A',
            speakerName: 'Emma (Lễ tân)',
            text: 'Good morning! Welcome to Grand Palace Hotel. How may I help you today?',
            ipa: '/ɡʊd ˈmɔː.nɪŋ! ˈwel.kəm tuː ɡrænd ˈpæl.ɪs həʊˈtel. haʊ meɪ aɪ help juː təˈdeɪ?/',
            meaning: 'Chào buổi sáng! Chào mừng quý khách đến khách sạn Grand Palace. Tôi có thể giúp gì cho quý khách?',
            tip: 'Nhấn trọng âm rõ ràng ở "morning", "welcome", "Palace Hotel". Nối âm nhẹ giữa "help" và "you".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'dlg_2',
            speaker: 'B',
            speakerName: 'David (Du khách)',
            text: 'Hi! I have a reservation under the name David Miller for two nights.',
            ipa: '/haɪ! aɪ hæv ə ˌrez.əˈveɪ.ʃən ˈʌn.dər ðə neɪm ˈdeɪ.vɪd ˈmɪl.ər fɔːr tuː naɪts/',
            meaning: 'Chào bạn! Tôi có đặt phòng trước dưới tên David Miller cho hai đêm.',
            tip: 'Phát âm chuẩn âm đuôi /ts/ trong "nights" và trọng âm chính trong /ˌrez.əˈveɪ.ʃən/.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'dlg_3',
            speaker: 'A',
            speakerName: 'Emma (Lễ tân)',
            text: 'Thank you, Mr. Miller. Could you please show me your passport and credit card for verification?',
            ipa: '/θæŋk juː, ˈmɪs.tər ˈmɪl.ər. kʊd juː pliːz ʃəʊ miː jɔːr ˈpɑːs.pɔːt ænd ˈkred.ɪt kɑːd fɔːr ˌver.ɪ.fɪˈkeɪ.ʃən?/',
            meaning: 'Cảm ơn ông Miller. Ông có thể vui lòng xuất trình hộ chiếu và thẻ tín dụng để xác nhận được không ạ?',
            tip: 'Lên giọng ở cuối câu hỏi Yes/No "...for verification?". Chú ý âm /θ/ trong "Thank you".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'dlg_4',
            speaker: 'B',
            speakerName: 'David (Du khách)',
            text: 'Sure, here is my passport and card. Does the booking include complimentary breakfast?',
            ipa: '/ʃɔːr, hɪər ɪz maɪ ˈpɑːs.pɔːt ænd kɑːd. dʌz ðə ˈbʊk.ɪŋ ɪnˈkluːd ˌkɒm.plɪˈmen.tər.i ˈbrek.fəst?/',
            meaning: 'Chắc chắn rồi, đây là hộ chiếu và thẻ của tôi. Việc đặt phòng có bao gồm bữa sáng miễn phí không?',
            tip: 'Cụm "complimentary breakfast" mang nghĩa bữa sáng miễn phí kèm theo. Nhấn trọng âm /ˌkɒm.plɪˈmen.tər.i/.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'dlg_5',
            speaker: 'A',
            speakerName: 'Emma (Lễ tân)',
            text: 'Yes, breakfast is served on the second floor from six thirty to ten AM. Here is your room key.',
            ipa: '/jes, ˈbrek.fəst ɪz sɜːvd ɒn ðə ˈsek.ənd flɔːr frɒm sɪks ˈθɜː.ti tuː ten eɪ ˈem. hɪər ɪz jɔːr ruːm kiː/',
            meaning: 'Dạ có, bữa sáng được phục vụ tại tầng 2 từ 6:30 đến 10:00 sáng. Đây là chìa khóa phòng của quý khách.',
            tip: 'Phát âm rõ âm /z/ trong "is served", số thứ tự "second floor" và giờ "six thirty".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'dlg_6',
            speaker: 'B',
            speakerName: 'David (Du khách)',
            text: 'That sounds wonderful! Thank you so much for your assistance.',
            ipa: '/ðæt saʊndz ˈwʌn.də.fəl! θæŋk juː səʊ mʌtʃ fɔːr jɔːr əˈsɪs.təns/',
            meaning: 'Nghe tuyệt quá! Cảm ơn bạn rất nhiều vì sự hỗ trợ nhiệt tình.',
            tip: 'Ngữ điệu hào hứng, thân thiện. Âm cuối /s/ trong "sounds" và "assistance".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          }
        ],
        exercises: [
          {
            type: 'mcq',
            question: 'Where is breakfast served in Grand Palace Hotel?',
            options: [
              'On the 10th floor rooftop',
              'On the second floor from 6:30 to 10:00 AM',
              'In the lobby lounge 24/7',
              'Delivered to the room only'
            ],
            answer: 1,
            explain: 'Emma stated: "Yes, breakfast is served on the second floor from six thirty to ten AM."'
          },
          {
            type: 'mcq',
            question: 'What documents did the receptionist request for verification?',
            options: [
              'Passport and driver license',
              'Passport and credit card',
              'Identity card and cash deposit',
              'Airline ticket and baggage tag'
            ],
            answer: 1,
            explain: 'Emma asked: "Could you please show me your passport and credit card for verification?"'
          }
        ]
      },
      {
        id: 'spk_video_2',
        type: 'video_roleplay',
        title: '🎬 Video Roleplay: Coffee Shop Ordering',
        topic: 'Daily Communication Simulation',
        level: 'A2 - B1',
        description: 'Luyện hội thoại tương tác gọi đồ uống tại tiệm cafe giữa Barista (Alex) và Khách hàng (Sarah).',
        characterA: {
          id: 'A',
          name: 'Alex (Senior Barista)',
          avatar: '☕',
          roleTitle: 'Barista & Server',
          color: '#d97706',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        characterB: {
          id: 'B',
          name: 'Sarah (Khách hàng quen)',
          avatar: '👩‍🎓',
          roleTitle: 'Customer / Coffee Lover',
          color: '#7c3aed',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        },
        dialogue: [
          {
            id: 'c_dlg_1',
            speaker: 'A',
            speakerName: 'Alex (Barista)',
            text: 'Hi there! Welcome to Sun Cafe. What can I brew for you today?',
            ipa: '/haɪ ðeər! ˈwel.kəm tuː sʌn kæˈfeɪ. wɒt kæn aɪ bruː fɔːr juː təˈdeɪ?/',
            meaning: 'Xin chào! Chào mừng đến với Sun Cafe. Hôm nay tôi có thể pha chế món gì cho bạn?',
            tip: 'Ngữ điệu vui vẻ, chào đón khách hàng.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'c_dlg_2',
            speaker: 'B',
            speakerName: 'Sarah (Khách hàng)',
            text: 'Hello! I would love an iced caramel macchiato with oat milk, please.',
            ipa: '/həˈləʊ! aɪ wʊd lʌv ən aɪst ˈkær.ə.məl ˌmæk.iˈɑː.təʊ wɪð əʊt mɪlk, pliːz/',
            meaning: 'Xin chào! Cho tôi một ly caramel macchiato đá với sữa yến mạch nhé.',
            tip: 'Phát âm từ /ˌmæk.iˈɑː.təʊ/ chuẩn xác, nhấn trọng âm 3.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'c_dlg_3',
            speaker: 'A',
            speakerName: 'Alex (Barista)',
            text: 'Excellent choice! Would you like a regular or large cup, and any pastry to go with it?',
            ipa: '/ˈek.səl.ənt tʃɔɪs! wʊd juː laɪk ə ˈreɡ.jə.lər ɔːr lɑːdʒ kʌp, ænd ˈen.i ˈpeɪ.stri tuː ɡəʊ wɪð ɪt?/',
            meaning: 'Lựa chọn tuyệt vời! Bạn muốn cỡ vừa hay cỡ lớn, và có muốn dùng kèm bánh ngọt không?',
            tip: 'Nối âm "go with it".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'c_dlg_4',
            speaker: 'B',
            speakerName: 'Sarah (Khách hàng)',
            text: 'A large cup, please. And I will also take one blueberry muffin.',
            ipa: '/ə lɑːdʒ kʌp pliːz. ænd aɪ wɪl ˈɔːl.səʊ teɪk wʌn ˈbluːˌber.i ˈmʌf.ɪn/',
            meaning: 'Cho tôi cỡ lớn nhé. Và tôi cũng lấy thêm một chiếc bánh muffin việt quất.',
            tip: 'Nhấn trọng âm đầu trong "blueberry muffin".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          }
        ]
      },
      {
        id: 'spk_1',
        type: 'phrases',
        title: '🗣️ Luyện Phát Âm Câu Đơn: Everyday Idioms',
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
          image: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'fc_2',
          word: 'Sustainable',
          pos: 'adjective',
          ipa: '/səˈsteɪ.nə.bəl/',
          meaning: 'Bền vững, có thể duy trì lâu dài mà không hại môi trường',
          example: 'Solar energy provides a clean and sustainable source of power.',
          synonyms: 'Eco-friendly, renewable, durable',
          image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&auto=format&fit=crop&q=80'
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
          question: 'If I ___ enough money, I would travel around the world.',
          options: ['have', 'had', 'will have', 'would have'],
          answer: 1,
          explain: 'Câu điều kiện loại 2 (giả định trái với hiện tại): If + S + V2/ed, S + would + V1.'
        }
      ]
    }
  },
  {
    id: 'unit_2',
    subject: '🇬🇧 Tiếng Anh',
    module: 'English B1 - General & Academic Skills',
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
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
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
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
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
            question: 'What is the Great Barrier Reef?',
            options: ['A man-made underwater tunnel', 'The world’s largest coral reef ecosystem', 'A volcanic island', 'A marine amusement park'],
            answer: 1,
            explain: 'The first sentence states: "the Great Barrier Reef is the world\'s largest coral reef ecosystem."'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_v_interview',
        type: 'video_roleplay',
        title: '🎬 Video Roleplay: Tech Job Interview Simulation',
        topic: 'Professional Career & Interviews',
        level: 'B1 - B2',
        description: 'Mô phỏng phỏng vấn xin việc giữa Nhà tuyển dụng (Mr. Harrison) và Ứng viên (Elena). Chọn đóng vai A hoặc B để nâng cao kỹ năng giao tiếp chuyên nghiệp.',
        characterA: {
          id: 'A',
          name: 'Mr. Harrison (Interviewer)',
          avatar: '👔',
          roleTitle: 'Senior HR Director',
          color: '#1e293b',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        },
        characterB: {
          id: 'B',
          name: 'Elena (Software Engineer)',
          avatar: '👩‍💻',
          roleTitle: 'Job Candidate',
          color: '#0284c7',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        },
        dialogue: [
          {
            id: 'int_1',
            speaker: 'A',
            speakerName: 'Mr. Harrison (HR)',
            text: 'Good afternoon, Elena! Thank you for joining us today. Could you tell me a little about yourself?',
            ipa: '/ɡʊd ˌɑːf.təˈnuːn, ɪˈleɪ.nə! θæŋk juː fɔːr ˈdʒɔɪ.nɪŋ ʌs təˈdeɪ. kʊd juː tel miː ə ˈlɪt.əl əˈbaʊt jɔːˈself?/',
            meaning: 'Chào buổi chiều, Elena! Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Bạn có thể giới thiệu đôi nét về bản thân không?',
            tip: 'Giọng điệu lịch thiệp, chuyên nghiệp. Nhấn trọng âm /ˌɑːf.təˈnuːn/.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'int_2',
            speaker: 'B',
            speakerName: 'Elena (Ứng viên)',
            text: 'Thank you! I have three years of experience building modern web applications with a focus on user experience.',
            ipa: '/θæŋk juː! aɪ hæv θriː jɪəz ɒv ɪkˈspɪə.ri.əns ˈbɪl.dɪŋ ˈmɒd.ən web ˌæp.lɪˈkeɪ.ʃənz wɪð ə ˈfəʊ.kəs ɒn ˈjuː.zər ɪkˈspɪə.ri.əns/',
            meaning: 'Cảm ơn ông! Tôi có ba năm kinh nghiệm xây dựng các ứng dụng web hiện đại và luôn chú trọng trải nghiệm người dùng.',
            tip: 'Phát âm chuẩn /ɪkˈspɪə.ri.əns/ và cụm "user experience".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          },
          {
            id: 'int_3',
            speaker: 'A',
            speakerName: 'Mr. Harrison (HR)',
            text: 'That sounds impressive. How do you usually handle tight deadlines and challenging bugs in your team?',
            ipa: '/ðæt saʊndz ɪmˈpres.ɪv. haʊ duː juː ˈjuː.ʒu.ə.li ˈhæn.dəl taɪt ˈded.laɪnz ænd ˈtʃæl.ɪn.dʒɪŋ bʌɡz ɪn jɔːr tiːm?/',
            meaning: 'Thật ấn tượng. Bạn thường xử lý các hạn chót gấp và những lỗi phần mềm phức tạp trong nhóm như thế nào?',
            tip: 'Nhấn mạnh các từ khóa "impressive", "tight deadlines", "challenging bugs".',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          },
          {
            id: 'int_4',
            speaker: 'B',
            speakerName: 'Elena (Ứng viên)',
            text: 'I prioritize critical tasks, maintain clear communication with my teammates, and use systematic debugging techniques.',
            ipa: '/aɪ praɪˈɒr.ɪ.taɪz ˈkrɪt.ɪ.kəl tɑːsks, meɪnˈteɪn klɪər kəˌmjuː.nɪˈkeɪ.ʃən wɪð maɪ ˈtiːm.meɪts, ænd juːz ˌsɪs.təˈmæt.ɪk ˌdiːˈbʌɡ.ɪŋ tekˈniːks/',
            meaning: 'Tôi ưu tiên các nhiệm vụ quan trọng, duy trì trao đổi rõ ràng với đồng đội và áp dụng các kỹ thuật gỡ lỗi bài bản.',
            tip: 'Phát âm rõ ràng các âm tiết: /praɪˈɒr.ɪ.taɪz/, /ˌsɪs.təˈmæt.ɪk/, /tekˈniːks/.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
          }
        ]
      },
      {
        id: 'spk_2',
        type: 'phrases',
        title: '🗣️ Luyện Phát Âm: Career Aspirations Pitch',
        topic: 'Professional Communication',
        level: 'B1',
        phrases: [
          {
            id: 'ph_3',
            text: 'I am looking for new opportunities to broaden my technical horizons.',
            ipa: '/aɪ æm ˈlʊk.ɪŋ fɔːr njuː ˌɒp.əˈtjuː.nə.tiz tuː ˈbrɔː.dən maɪ ˈtek.nɪ.kəl həˈraɪ.zənz/',
            meaning: 'Tôi đang tìm kiếm những cơ hội mới để mở rộng tầm hiểu biết kỹ thuật của mình.',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
            tip: 'Nhấn mạnh vào "opportunities" và "horizons".'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_scramble_2',
        title: 'Environmental Protection Scramble',
        topic: 'Green Living',
        level: 'B1',
        items: [
          {
            id: 'sc_3',
            words: ['Renewable', 'energy', 'plays', 'a', 'crucial', 'role', 'in', 'combating', 'climate', 'change.'],
            correctSentence: 'Renewable energy plays a crucial role in combating climate change.',
            hint: 'Bắt đầu bằng "Renewable energy..."',
            image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80'
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
          image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'fc_4',
          word: 'Collaborate',
          pos: 'verb',
          ipa: '/kəˈlæb.ə.reɪt/',
          meaning: 'Hợp tác, cộng tác cùng làm việc',
          example: 'Researchers from various universities collaborated on the vaccine project.',
          synonyms: 'Cooperate, team up, work together',
          image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80'
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
  },

  // -------------------------------------------------------------
  // UNIT TOÁN HỌC
  // -------------------------------------------------------------
  {
    id: 'unit_math_1',
    subject: '📐 Toán Học',
    module: 'Học phần 1: Đại Số & Hàm Số K7',
    title: 'Unit 1: Hàm Số Bậc Hai & Khảo Sát Đồ Thị Parabol',
    topic: 'Đại số & Giải tích',
    level: 'Lớp 10 - 12',
    icon: '📐',
    description: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc hai y = ax² + bx + c (a ≠ 0). Ứng dụng tìm tọa độ đỉnh, trục đối xứng và giá trị lớn nhất, nhỏ nhất.',
    isHidden: false,
    listening: [
      {
        id: 'lis_math_1',
        title: 'Bài Giảng: Khảo sát hàm số bậc hai',
        topic: 'Lý thuyết Hàm số',
        level: 'Cơ bản',
        audioText: 'Chào các em. Hôm nay chúng ta sẽ tìm hiểu về hàm số bậc hai dạng y bằng a nhân x bình phương cộng b nhân x cộng c. Với a khác không, đồ thị hàm số là một đường Parabol có đỉnh I với hoành độ trừ b chia cho hai a và tung độ trừ delta chia cho bốn a.',
        duration: '45s',
        exercises: [
          {
            type: 'mcq',
            question: 'Hoành độ đỉnh của đồ thị hàm số y = ax² + bx + c (a ≠ 0) là gì?',
            options: ['x = -b / (2a)', 'x = b / (2a)', 'x = -b / a', 'x = -c / a'],
            answer: 0,
            explain: 'Hoành độ đỉnh I của Parabol là x = -b / (2a).'
          },
          {
            type: 'mcq',
            question: 'Khi hệ số a > 0, bề lõm của Parabol quay về phía nào?',
            options: ['Quay lên trên (đạt cực tiểu tại đỉnh)', 'Quay xuống dưới', 'Quay sang trái', 'Quay sang phải'],
            answer: 0,
            explain: 'Khi a > 0, bề lõm Parabol hướng lên trên, đỉnh I là điểm thấp nhất (cực tiểu).'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_math_1',
        title: 'Lý Thuyết: Tính Đơn Điệu & Trục Đối Xứng của Parabol',
        topic: 'Đồ thị Parabol',
        level: 'Cơ bản',
        text: 'Hàm số bậc hai y = ax² + bx + c có tập xác định D = R. Trục đối xứng của Parabol là đường thẳng x = -b/(2a). Nếu a > 0, hàm số nghịch biến trên khoảng (-∞; -b/(2a)) và đồng biến trên khoảng (-b/(2a); +∞). Nếu a < 0, hàm số đồng biến trên khoảng (-∞; -b/(2a)) và nghịch biến trên khoảng (-b/(2a); +∞).',
        exercises: [
          {
            type: 'mcq',
            question: 'Trục đối xứng của đồ thị Parabol y = 2x² - 4x + 1 là đường thẳng nào?',
            options: ['x = 1', 'x = -1', 'x = 2', 'x = -2'],
            answer: 0,
            explain: 'x = -b / (2a) = -(-4) / (2 * 2) = 4 / 4 = 1.'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_math_1',
        title: 'Trình Bày: Định Lý Vi-ét & Biện Luận Nghiệm',
        topic: 'Công thức toán học',
        level: 'Trung bình',
        phrases: [
          {
            text: 'Tổng hai nghiệm bằng trừ b trên a, tích hai nghiệm bằng c trên a.',
            ipa: '/Vi-et Theorem/',
            meaning: 'S = x1 + x2 = -b/a; P = x1 * x2 = c/a',
            tip: 'Nhớ áp dụng định lý Vi-ét khi phương trình bậc hai có delta lớn hơn hoặc bằng 0.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_math_1',
        title: 'Sắp Xếp Các Bước Giải Phương Trình Bậc Hai',
        topic: 'Quy trình giải toán',
        level: 'Cơ bản',
        items: [
          {
            id: 'sc_m1',
            words: ['Xác định các hệ số a, b, c', 'và', 'tính biệt thức Delta', 'để kết luận số nghiệm.'],
            correctSentence: 'Xác định các hệ số a, b, c và tính biệt thức Delta để kết luận số nghiệm.',
            hint: 'Bắt đầu bằng: "Xác định các hệ số..."'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_m1',
          word: 'Parabol Vertex',
          pos: 'Thuật ngữ',
          ipa: '/ˈvɜː.teks/',
          meaning: 'Tọa độ đỉnh Parabol I(-b/2a; -Δ/4a)',
          example: 'Đỉnh Parabol là điểm cực trị của hàm số bậc hai.',
          synonyms: 'Đỉnh đồ thị, Điểm cực trị'
        },
        {
          id: 'fc_m2',
          word: 'Discriminant (Δ)',
          pos: 'Thuật ngữ',
          ipa: '/dɪˈskrɪm.ɪ.nənt/',
          meaning: 'Biệt thức Delta: Δ = b² - 4ac',
          example: 'Nếu Δ > 0 phương trình có 2 nghiệm phân biệt.',
          synonyms: 'Biệt thức'
        }
      ],
      matchPairs: [
        { left: 'Δ > 0', right: 'Phương trình có 2 nghiệm phân biệt', pairId: 1 },
        { left: 'Δ = 0', right: 'Phương trình có nghiệm kép', pairId: 2 },
        { left: 'Δ < 0', right: 'Phương trình vô nghiệm thực', pairId: 3 }
      ],
      grammarChallenge: [
        {
          id: 'gm_m1',
          question: 'Phương trình x² - 6x + 9 = 0 có số nghiệm là:',
          options: ['1 nghiệm kép (x = 3)', '2 nghiệm phân biệt', 'Vô nghiệm', 'Vô số nghiệm'],
          answer: 0,
          explain: 'Δ = (-6)² - 4*1*9 = 36 - 36 = 0 => Nghiệm kép x = -(-6)/(2*1) = 3.'
        }
      ]
    }
  },

  // -------------------------------------------------------------
  // UNIT VẬT LÝ
  // -------------------------------------------------------------
  {
    id: 'unit_phys_1',
    subject: '⚡ Vật Lý',
    module: 'Học phần 1: Cơ Học & Động Lực Học K7',
    title: 'Unit 1: Ba Định Luật Newton & Các Lực Cơ Học',
    topic: 'Cơ học & Động lực học',
    level: 'Lớp 10 - 12',
    icon: '⚡',
    description: 'Hệ thống định luật I, II, III của Newton; khái niệm quán tính, lực ma sát, lực đàn hồi và trọng lực.',
    isHidden: false,
    listening: [
      {
        id: 'lis_phys_1',
        title: 'Bài Giảng: Định Luật II Newton và Công Thức F = ma',
        topic: 'Động lực học',
        level: 'Cơ bản',
        audioText: 'Theo định luật hai Newton, gia tốc của một vật cùng hướng với lực tác dụng lên vật. Độ lớn của gia tốc tỉ lệ thuận với độ lớn của lực và tỉ lệ nghịch với khối lượng của vật. Biểu thức véctơ F bằng m nhân véctơ a.',
        duration: '40s',
        exercises: [
          {
            type: 'mcq',
            question: 'Công thức biểu diễn định luật II Newton là gì?',
            options: ['F = m * a', 'F = m / a', 'F = m * v', 'F = 0.5 * m * v²'],
            answer: 0,
            explain: 'Véc-tơ F = m * véc-tơ a.'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_phys_1',
        title: 'Lý Thuyết: Quán Tính & Định Luật I Newton',
        topic: 'Quán tính',
        level: 'Cơ bản',
        text: 'Định luật I Newton: Nếu một vật không chịu tác dụng của lực nào hoặc chịu tác dụng của các lực có hợp lực bằng không, thì vật đang đứng yên sẽ tiếp tục đứng yên, đang chuyển động sẽ tiếp tục chuyển động thẳng đều. Tính chất bảo toàn vận tốc của vật gọi là quán tính.',
        exercises: [
          {
            type: 'mcq',
            question: 'Vật chuyển động thẳng đều khi nào?',
            options: ['Khi hợp lực tác dụng lên vật bằng 0', 'Khi lực kéo lớn hơn ma sát', 'Khi có gia tốc không đổi khác 0', 'Khi vật ở trạng thái chân không'],
            answer: 0,
            explain: 'Khi hợp lực tác dụng lên vật bằng 0 (Định luật I Newton).'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_phys_1',
        title: 'Trình Bày: Cặp Lực Trực Đối Trong Định Luật III Newton',
        topic: 'Tương tác lực',
        level: 'Cơ bản',
        phrases: [
          {
            text: 'Trong mọi trường hợp, khi vật A tác dụng lên vật B một lực, thì vật B cũng tác dụng lại vật A một lực trực đối.',
            ipa: '/Newton Third Law/',
            meaning: 'F_AB = - F_BA (Cùng độ lớn, ngược hướng, tác dụng vào 2 vật khác nhau).',
            tip: 'Hai lực này không cân bằng nhau vì chúng đặt vào hai vật khác nhau.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_phys_1',
        title: 'Sắp Xếp Thứ Tự Phân Tích Lực',
        topic: 'Phương pháp động lực học',
        level: 'Cơ bản',
        items: [
          {
            id: 'sc_p1',
            words: ['Chọn hệ quy chiếu', 'phân tích các lực tác dụng', 'và áp dụng định luật II Newton.'],
            correctSentence: 'Chọn hệ quy chiếu phân tích các lực tác dụng và áp dụng định luật II Newton.',
            hint: 'Bắt đầu bằng: "Chọn hệ quy chiếu..."'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_p1',
          word: 'Inertia (Quán tính)',
          pos: 'Khái niệm',
          ipa: '/ɪˈnɜː.ʃə/',
          meaning: 'Thuộc tính của mọi vật có xu hướng bảo toàn vận tốc cả về hướng và độ lớn.',
          example: 'Hành khách bị ngả người về phía sau khi xe tăng tốc đột ngột.',
          synonyms: 'Tính ỳ, Quán tính'
        }
      ],
      matchPairs: [
        { left: 'Định luật I Newton', right: 'Định luật Quán tính', pairId: 1 },
        { left: 'Định luật II Newton', right: 'Gia tốc tỉ lệ với hợp lực (F = ma)', pairId: 2 },
        { left: 'Định luật III Newton', right: 'Lực và phản lực trực đối', pairId: 3 }
      ],
      grammarChallenge: [
        {
          id: 'gm_p1',
          question: 'Một lực 10N tác dụng lên vật khối lượng 2kg thì gia tốc thu được là:',
          options: ['5 m/s²', '20 m/s²', '2 m/s²', '0.2 m/s²'],
          answer: 0,
          explain: 'a = F / m = 10 / 2 = 5 m/s².'
        }
      ]
    }
  },

  // -------------------------------------------------------------
  // UNIT TIN HỌC (PYTHON)
  // -------------------------------------------------------------
  {
    id: 'unit_cs_1',
    subject: '💻 Tin Học',
    module: 'Học phần 1: Lập Trình Python Cơ Bản',
    title: 'Unit 1: Kiểu Dữ Liệu, Vòng Lặp & Cấu Trúc Điều Kiện',
    topic: 'Lập trình Python',
    level: 'Cơ bản',
    icon: '💻',
    description: 'Nắm vững cú pháp cơ bản của Python: biến số, chuỗi ký tự, danh sách (List), câu lệnh if-elif-else và vòng lặp for/while.',
    isHidden: false,
    listening: [
      {
        id: 'lis_cs_1',
        title: 'Audio Guide: Giới thiệu ngôn ngữ lập trình Python',
        topic: 'Cú pháp Python',
        level: 'Cơ bản',
        audioText: 'Python là ngôn ngữ lập trình bậc cao, thông dịch, hướng đối tượng và có cú pháp rất trong sáng, dễ đọc. Trong Python, chúng ta không cần khai báo kiểu dữ liệu cho biến và dùng thụt lề để phân định các khối lệnh.',
        duration: '35s',
        exercises: [
          {
            type: 'mcq',
            question: 'Python sử dụng yếu tố nào để phân chia các khối lệnh (code block)?',
            options: ['Thụt lề (Indentation)', 'Dấu ngoặc nhọn { }', 'Dấu chấm phẩy ;', 'Từ khóa begin/end'],
            answer: 0,
            explain: 'Python dùng khoảng trắng thụt lề (indentation) để phân cấp khối lệnh.'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_cs_1',
        title: 'Cấu Trúc Danh Sách (List) & Phương Thức Thông Dụng',
        topic: 'Python List',
        level: 'Cơ bản',
        text: 'List trong Python là kiểu dữ liệu có thể thay đổi (mutable), cho phép chứa các phần tử thuộc nhiều kiểu dữ liệu khác nhau. Một số hàm thông dụng: append() để thêm phần tử vào cuối, pop() để xóa và lấy phần tử ra, len() để đếm số lượng phần tử.',
        exercises: [
          {
            type: 'mcq',
            question: 'Phương thức nào dùng để thêm một phần tử vào cuối danh sách trong Python?',
            options: ['append()', 'add()', 'push()', 'insert_end()'],
            answer: 0,
            explain: 'list.append(x) thêm phần tử x vào cuối danh sách.'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_cs_1',
        title: 'Đọc Code Chuẩn: Cấu trúc If-Else trong Python',
        topic: 'Cú pháp điều kiện',
        level: 'Cơ bản',
        phrases: [
          {
            text: 'if score >= 8: print("Excellent") else: print("Keep practicing")',
            ipa: '/Python If Statement/',
            meaning: 'Nếu điểm lớn hơn hoặc bằng 8 thì in ra Giỏi, ngược lại in Cần cố gắng.',
            tip: 'Chú ý dấu hai chấm (:) ở cuối dòng điều kiện.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_cs_1',
        title: 'Sắp Xếp Cú Pháp Vòng Lặp For',
        topic: 'Python Loops',
        level: 'Cơ bản',
        items: [
          {
            id: 'sc_cs1',
            words: ['for item in my_list:', 'print(item)'],
            correctSentence: 'for item in my_list: print(item)',
            hint: 'Cú pháp duyệt qua từng phần tử của danh sách.'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_cs1',
          word: 'List Comprehension',
          pos: 'Tính năng',
          ipa: '/lɪst ˌkɒm.prɪˈhen.ʃən/',
          meaning: 'Cú pháp ngắn gọn để tạo danh sách mới dựa trên danh sách hiện có.',
          example: '[x * 2 for x in range(5)] tạo ra [0, 2, 4, 6, 8]',
          synonyms: 'Tạo danh sách nhanh'
        }
      ],
      matchPairs: [
        { left: 'int', right: 'Kiểu số nguyên (1, 2, -5)', pairId: 1 },
        { left: 'float', right: 'Kiểu số thực (3.14, -0.5)', pairId: 2 },
        { left: 'str', right: 'Kiểu chuỗi văn bản ("Hello")', pairId: 3 },
        { left: 'bool', right: 'Kiểu logic (True / False)', pairId: 4 }
      ],
      grammarChallenge: [
        {
          id: 'gm_cs1',
          question: 'Kết quả của biểu thức len([10, 20, 30]) trong Python là:',
          options: ['3', '30', '2', 'Error'],
          answer: 0,
          explain: 'Danh sách có 3 phần tử nên hàm len() trả về 3.'
        }
      ]
    }
  },

  // -------------------------------------------------------------
  // UNIT HÓA HỌC
  // -------------------------------------------------------------
  {
    id: 'unit_chem_1',
    subject: '🧪 Hóa Học',
    module: 'Học phần 1: Hóa Học Đại Cương & Vô Cơ',
    title: 'Unit 1: Cấu Tạo Nguyên Tử & Bảng Tuần Hoàn Các Nguyên Tố',
    topic: 'Hóa học Đại Cương',
    level: 'Lớp 10 - 12',
    icon: '🧪',
    description: 'Nghiên cứu hạt nhân nguyên tử, lớp vỏ electron, quy luật biến đổi tuần hoàn tính kim loại, phi kim và bán kính nguyên tử.',
    isHidden: false,
    listening: [
      {
        id: 'lis_chem_1',
        title: 'Bài Giảng: Cấu hình Electron và Bảng tuần hoàn',
        topic: 'Nguyên tử',
        level: 'Cơ bản',
        audioText: 'Nguyên tử được cấu tạo từ hạt nhân mang điện tích dương và lớp vỏ electron mang điện tích âm. Số thứ tự ô nguyên tố trong bảng tuần hoàn bằng đúng số hiệu nguyên tử Z, số thứ tự chu kỳ bằng số lớp electron và số thứ tự nhóm A bằng số electron ở lớp ngoài cùng.',
        duration: '40s',
        exercises: [
          {
            type: 'mcq',
            question: 'Số thứ tự chu kỳ trong bảng tuần hoàn hóa học cho biết điều gì?',
            options: ['Số lớp electron của nguyên tử', 'Số electron hóa trị', 'Số proton trong hạt nhân', 'Khối lượng nguyên tử'],
            answer: 0,
            explain: 'Số thứ tự chu kỳ bằng số lớp electron của nguyên tử nguyên tố đó.'
          }
        ]
      }
    ],
    reading: [
      {
        id: 'read_chem_1',
        title: 'Quy Luật Biến Đổi Tính Chất Trong Chu Kỳ',
        topic: 'Định luật tuần hoàn',
        level: 'Cơ bản',
        text: 'Trong cùng một chu kỳ, đi từ trái sang phải theo chiều tăng dần của điện tích hạt nhân: điện tích hạt nhân tăng, bán kính nguyên tử giảm dần, độ âm điện tăng dần, tính kim loại giảm dần và tính phi kim tăng dần.',
        exercises: [
          {
            type: 'mcq',
            question: 'Trong cùng một chu kỳ, đi từ trái sang phải, tính phi kim của các nguyên tố biến đổi như thế nào?',
            options: ['Tăng dần', 'Giảm dần', 'Không thay đổi', 'Biến đổi không theo quy luật'],
            answer: 0,
            explain: 'Trong một chu kỳ, từ trái sang phải theo chiều tăng điện tích hạt nhân, tính kim loại giảm và tính phi kim tăng dần.'
          }
        ]
      }
    ],
    speaking: [
      {
        id: 'spk_chem_1',
        title: 'Đọc Tên Hợp Chất & Phương Trình Hóa Học',
        topic: 'Thuật ngữ Hóa học',
        level: 'Cơ bản',
        phrases: [
          {
            text: '2H2 + O2 -> 2H2O (Hai phân tử khí hiđro phản ứng với một phân tử khí oxi tạo thành hai phân tử nước)',
            ipa: '/Chemical Equation/',
            meaning: 'Phản ứng tổng hợp nước tỏa nhiều nhiệt.',
            tip: 'Nhớ cân bằng số nguyên tử của từng nguyên tố ở 2 vế của phương trình.'
          }
        ]
      }
    ],
    writing: [
      {
        id: 'wrt_chem_1',
        title: 'Sắp Xếp Cấu Hình Electron Của Nguyên Tử Natri (Z=11)',
        topic: 'Cấu hình electron',
        level: 'Cơ bản',
        items: [
          {
            id: 'sc_ch1',
            words: ['1s²', '2s² 2p⁶', '3s¹'],
            correctSentence: '1s² 2s² 2p⁶ 3s¹',
            hint: 'Lớp 1 có 2e, lớp 2 có 8e, lớp 3 có 1e.'
          }
        ]
      }
    ],
    languageFocus: {
      flashcards: [
        {
          id: 'fc_ch1',
          word: 'Electronegativity (Độ âm điện)',
          pos: 'Khái niệm',
          ipa: '/ɪˌlek.trəʊ.neɡ.əˈtɪv.ə.ti/',
          meaning: 'Đại lượng đặc trưng cho khả năng hút electron của nguyên tử khi tạo thành liên kết hóa học.',
          example: 'Flo (F) là nguyên tố có độ âm điện lớn nhất trong bảng tuần hoàn (3.98).',
          synonyms: 'Độ hút electron'
        }
      ],
      matchPairs: [
        { left: 'Proton (p)', right: 'Mang điện tích dương (+1)', pairId: 1 },
        { left: 'Electron (e)', right: 'Mang điện tích âm (-1)', pairId: 2 },
        { left: 'Neutron (n)', right: 'Không mang điện tích (0)', pairId: 3 }
      ],
      grammarChallenge: [
        {
          id: 'gm_ch1',
          question: 'Nguyên tố Clo (Z=17) có số electron ở lớp ngoài cùng là:',
          options: ['7 electron', '8 electron', '5 electron', '2 electron'],
          answer: 0,
          explain: 'Cấu hình Cl: 1s² 2s² 2p⁶ 3s² 3p⁵ => Lớp ngoài cùng (lớp 3) có 2 + 5 = 7 electron.'
        }
      ]
    }
  }
];

export const LEARN_DATA = {
  units: DEFAULT_UNITS
};
