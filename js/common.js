import { uploadMediaFile } from './supabase.js';
import { showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge } from './ui-components.js';

const db = () => window.supabaseClient;

export const KEYS = ['A','B','C','D'];
export { uploadMediaFile, showToast, renderSkeletonCards, renderSkeletonTableRows, renderLMSBadge };




export const DEFAULT_SUBCATS = {
  "Word":["Word/Phần 1 - Định dạng ký tự","Word/Phần 2 - Định dạng đoạn văn","Word/Phần 3 - Định dạng trang & lề","Word/Phần 4 - Bảng biểu","Word/Phần 5 - Hình ảnh & đối tượng","Word/Phần 6 - Header, Footer & số trang","Word/Phần 7 - Styles & Heading","Word/Phần 8 - Tiện ích & phím tắt"],
  "Excel":["Excel/Phần 1 - Nhập liệu & định dạng ô","Excel/Phần 2 - Hàm tính toán cơ bản","Excel/Phần 3 - Hàm điều kiện & logic","Excel/Phần 4 - Hàm tra cứu (VLOOKUP, HLOOKUP)","Excel/Phần 5 - Hàm văn bản & ngày tháng","Excel/Phần 6 - Biểu đồ","Excel/Phần 7 - Lọc, sắp xếp & PivotTable","Excel/Phần 8 - Tiện ích & phím tắt"],
  "PowerPoint":["PowerPoint/Phần 1 - Tạo & quản lý slide","PowerPoint/Phần 2 - Định dạng văn bản & hình ảnh","PowerPoint/Phần 3 - Hiệu ứng chuyển slide","PowerPoint/Phần 4 - Hiệu ứng đối tượng (Animation)","PowerPoint/Phần 5 - Trình chiếu & xuất file"],
  "Internet & Email":["Internet & Email/Phần 1 - Trình duyệt & tìm kiếm","Internet & Email/Phần 2 - Email cơ bản","Internet & Email/Phần 3 - Bảo mật & an toàn mạng"],
  "Kiến thức chung":["Kiến thức chung/Phần 1 - Phím tắt Windows","Kiến thức chung/Phần 2 - Quản lý file & thư mục","Kiến thức chung/Phần 3 - Khái niệm tin học cơ bản"],
  "Toán":["Toán/Phần 1 - Số học","Toán/Phần 2 - Đại số","Toán/Phần 3 - Hình học","Toán/Phần 4 - Hàm số","Toán/Phần 5 - Phương trình","Toán/Phần 6 - Bất phương trình","Toán/Phần 7 - Xác suất - Thống kê"]
};

export const DEFAULT_QUESTIONS = [
  {id:1,cat:"Word",subcat:"Word/Phần 1 - Định dạng ký tự",text:"Phím tắt nào dùng để in đậm văn bản trong Word?",opts:["Ctrl+I","Ctrl+B","Ctrl+U","Ctrl+D"],ans:1},
  {id:2,cat:"Excel",subcat:"Excel/Phần 2 - Hàm tính toán cơ bản",text:"Hàm nào dùng để tính tổng trong Excel?",opts:["=COUNT()","=AVERAGE()","=SUM()","=MAX()"],ans:2},
  {id:3,cat:"Toán",subcat:"Toán/Phần 1 - Số học",text:"Tính giá trị của biểu thức $2^5 + 3^2$",opts:["$32$","$41$","$25$","$64$"],ans:1}
];

export const DEFAULT_EXAMS = [
  {id:1,name:"Đề tổng hợp cơ bản",desc:"Kiểm tra kiến thức Word, Excel, PowerPoint",count:10,cat:"",subcat:"",timeLimit:0,isHidden:false},
  {id:2,name:"Chuyên đề Word",desc:"Kiểm tra chuyên sâu Microsoft Word",count:8,cat:"Word",subcat:"",timeLimit:0,isHidden:false},
  {id:3,name:"Chuyên đề Excel",desc:"Kiểm tra chuyên sâu Microsoft Excel",count:6,cat:"Excel",subcat:"",timeLimit:0,isHidden:false},
  {id:4,name:"Chuyên đề Toán",desc:"Kiểm tra câu hỏi Toán có LaTeX",count:10,cat:"Toán",subcat:"",timeLimit:0,isHidden:false}
];

export const ROOT_ADMIN_EMAIL = 'nam3010hcm@gmail.com';

// HỌ VÀ TÊN HIỂN THỊ CỦA TÁC GIẢ / NGƯỜI THỰC HIỆN
export function getAuthorDisplayName(emailOrId) {
  if (!emailOrId) return 'Quản Trị Viên';
  const target = String(emailOrId).trim().toLowerCase();
  
  // 1. Kiểm tra danh sách Giảng viên
  const teachers = (state && state.teachers) || window.teachersList || [];
  const matchedTeacher = teachers.find(t => 
    (t.email && t.email.toLowerCase() === target) || 
    (t.id && t.id.toLowerCase() === target)
  );
  if (matchedTeacher) {
    return matchedTeacher.teacher_name || matchedTeacher.name || matchedTeacher.email;
  }

  // 2. Kiểm tra Root Admin mặc định
  if (target === ROOT_ADMIN_EMAIL.toLowerCase() || target === 't001') {
    return 'Thầy Nam (Root Admin)';
  }

  // 3. Kiểm tra danh sách Học viên
  const students = (state && state.students) || window.studentsList || [];
  const matchedStudent = students.find(s => 
    (s.email && s.email.toLowerCase() === target) || 
    (s.id && s.id.toLowerCase() === target)
  );
  if (matchedStudent) {
    return matchedStudent.full_name || matchedStudent.name;
  }

  // 4. Kiểm tra user hiện tại trong localStorage
  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      if ((u.email && u.email.toLowerCase() === target) || (u.id && u.id.toLowerCase() === target)) {
        return u.teacher_name || u.name || u.email;
      }
    }
    const stRaw = localStorage.getItem('st_user');
    if (stRaw) {
      const u = JSON.parse(stRaw);
      if ((u.email && u.email.toLowerCase() === target) || (u.id && u.id.toLowerCase() === target) || (u.sid && u.sid.toLowerCase() === target)) {
        return u.full_name || u.name;
      }
    }
  } catch(e){}

  return emailOrId.includes('@') ? emailOrId.split('@')[0] : emailOrId;
}

// LƯU VẾT THAO TÁC CRUD CỦA GIẢNG VIÊN (AUDIT / ACTIVITY LOG)
export async function logTeacherActivity(actionType, targetType, targetName, targetId = '', details = '') {
  let actorEmail = (state && state.currentUserEmail) || '';
  let actorName = (state && state.currentUserName) || '';
  let actorRole = 'teacher';

  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      if (!actorEmail) actorEmail = u.email || '';
      if (!actorName) actorName = u.teacher_name || u.name || '';
      if (u.role) actorRole = u.role;
    }
  } catch(e){}

  if (!actorEmail) actorEmail = ROOT_ADMIN_EMAIL;
  if (!actorName) actorName = getAuthorDisplayName(actorEmail);

  const timestamp = new Date().toISOString();
  const logItem = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    actor_email: actorEmail,
    actor_name: actorName, // HỌ VÀ TÊN ĐẦY ĐỦ
    actor_role: actorRole,
    action_type: actionType, // 'Tạo mới', 'Cập nhật', 'Xóa', 'Kích hoạt / Khóa'
    target_type: targetType, // 'Đề thi', 'Câu hỏi', 'Học viên', 'Bài học', 'Nhiệm vụ', 'Ca thi'
    target_name: targetName || '',
    target_id: targetId || '',
    details: details || '',
    timestamp: timestamp
  };

  // 1. Lưu vào localStorage cache
  try {
    const raw = localStorage.getItem('educore_teacher_activity_logs');
    let logs = raw ? JSON.parse(raw) : [];
    logs.unshift(logItem);
    if (logs.length > 500) logs = logs.slice(0, 500);
    localStorage.setItem('educore_teacher_activity_logs', JSON.stringify(logs));
  } catch(e){}

  // 2. Ghi nhận vào Supabase
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('user_auth_logs').insert([{
        user_email: actorEmail,
        user_type: 'teacher',
        event_type: 'crud_action',
        timestamp: timestamp
      }]);
    }
  } catch(e){}

  // 3. Thông báo re-render nếu bảng đang mở
  if (typeof window.renderTeacherActivityLogsTable === 'function') {
    window.renderTeacherActivityLogsTable();
  }
}

// CẬP NHẬT HEADER PROFILE TRÊN TẤT CẢ CÁC TRANG VỚI HỌ VÀ TÊN ĐẦY ĐỦ
export function renderGlobalHeaderProfile() {
  let userLabel = '';
  let avatarIcon = '🔑';
  let isLoggedIn = false;
  let subLabel = '';

  const stUserRaw = localStorage.getItem('st_user');
  const tcUserRaw = localStorage.getItem('teacher_user');

  if (stUserRaw) {
    try {
      const parsed = JSON.parse(stUserRaw);
      const fullName = parsed.full_name || parsed.name || 'Học viên';
      userLabel = fullName;
      subLabel = parsed.class_name ? `Lớp ${parsed.class_name}` : 'Học viên EduCore';
      avatarIcon = '🎓';
      isLoggedIn = true;
    } catch(e){}
  } else if (tcUserRaw) {
    try {
      const parsed = JSON.parse(tcUserRaw);
      const isRoot = (parsed.email || '').toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase() || parsed.role === 'root' || parsed.role === 'admin';
      const fullName = parsed.teacher_name || parsed.name || (isRoot ? 'Thầy Nam (Root Admin)' : parsed.email);
      userLabel = fullName;
      subLabel = isRoot ? 'Root Admin' : (parsed.department || 'Giảng viên');
      avatarIcon = isRoot ? '👑' : '👨‍🏫';
      isLoggedIn = true;
    } catch(e){}
  }

  const profileBadges = document.querySelectorAll('.user-profile-badge, #user-header-badge');
  profileBadges.forEach(badge => {
    if (isLoggedIn) {
      badge.innerHTML = `
        <div class="user-avatar-img">${avatarIcon}</div>
        <div style="display:flex;flex-direction:column;line-height:1.2;text-align:left;">
          <span style="font-weight:800;font-size:13px;color:#ffffff;">${esc(userLabel)}</span>
          <span style="font-size:10px;color:#93c5fd;font-weight:700;text-transform:uppercase;">${esc(subLabel)}</span>
        </div>
      `;
      badge.title = `Tài khoản: ${userLabel} (${subLabel})`;
    } else {
      badge.innerHTML = `
        <div class="user-avatar-img">🔑</div>
        <span>Đăng Nhập Phân Hệ</span>
      `;
      badge.title = "Bấm để đăng nhập";
    }
  });

  const logoutBtns = document.querySelectorAll('.header-logout-btn, #header-logout-btn');
  logoutBtns.forEach(btn => {
    btn.style.display = isLoggedIn ? 'inline-flex' : 'none';
  });
}

if (typeof window !== 'undefined') {
  window.getAuthorDisplayName = getAuthorDisplayName;
  window.logTeacherActivity = logTeacherActivity;
  window.renderGlobalHeaderProfile = renderGlobalHeaderProfile;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderGlobalHeaderProfile);
  } else {
    renderGlobalHeaderProfile();
  }
}

export function isRootUser(email) {
  let targetEmail = email;
  if (!targetEmail && typeof state !== 'undefined' && state.currentUserEmail) {
    targetEmail = state.currentUserEmail;
  }
  if (!targetEmail) {
    try {
      const userRaw = localStorage.getItem('teacher_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.role === 'root' || u.role === 'admin' || String(u.email || '').trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
          return true;
        }
        targetEmail = u.email;
      }
    } catch(e){}
  }
  if (!targetEmail) return false;
  
  const emailStr = String(targetEmail).trim().toLowerCase();
  if (emailStr === ROOT_ADMIN_EMAIL.toLowerCase()) return true;

  try {
    const userRaw = localStorage.getItem('teacher_user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (String(u.email || '').trim().toLowerCase() === emailStr && (u.role === 'root' || u.role === 'admin')) {
        return true;
      }
    }
  } catch(e){}
  
  return false;
}

export async function logUserAuthEvent(userEmail, userType = 'teacher', eventType = 'login', durationSeconds = 0) {
  if (!userEmail) return;
  const nowStr = new Date().toISOString();
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('user_auth_logs').insert([{
        user_email: userEmail,
        user_type: userType,
        event_type: eventType,
        timestamp: nowStr
      }]);

      const targetTable = userType === 'student' ? 'students' : 'teachers';
      const payload = eventType === 'login' ? { last_login_at: nowStr } : { last_logout_at: nowStr };
      await client.from(targetTable).update(payload).eq('email', userEmail);
    }
  } catch (e) {
    console.warn("Lỗi logUserAuthEvent:", e);
  }
}

export async function globalLogout() {
  const stUserRaw = localStorage.getItem('st_user');
  const tcUserRaw = localStorage.getItem('teacher_user');

  try {
    let email = '';
    let userType = 'teacher';
    let duration = 0;

    if (stUserRaw) {
      try {
        const u = JSON.parse(stUserRaw);
        email = u.email || u.sid || '';
        userType = 'student';
        const sessionStart = parseInt(sessionStorage.getItem('st_session_start') || '0', 10);
        if (sessionStart > 0) duration = Math.round((Date.now() - sessionStart) / 1000);
      } catch(e){}
    } else if (tcUserRaw) {
      try {
        const u = JSON.parse(tcUserRaw);
        email = u.email || '';
        userType = 'teacher';
        if (u.login_timestamp) duration = Math.round((Date.now() - u.login_timestamp) / 1000);
      } catch(e){}
    }

    if (email) {
      await logUserAuthEvent(email, userType, 'logout', duration);
    }

    if (window.supabaseClient && window.supabaseClient.auth) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (e) {
    console.warn("SignOut error:", e);
  }
  localStorage.removeItem('st_user');
  localStorage.removeItem('teacher_user');
  sessionStorage.clear();
  alert('🔒 Đã đăng xuất khỏi tài khoản EduCore!');
  window.location.href = 'index.html';
}

if (typeof window !== 'undefined') {
  window.globalLogout = globalLogout;
}

export function canEditItem(item, currentUserEmail) {
  if (!currentUserEmail) return true;
  if (isRootUser(currentUserEmail)) return true;
  const creator = item?.created_by || item?.createdBy;
  if (!creator) return false;
  return String(creator).trim().toLowerCase() === String(currentUserEmail).trim().toLowerCase();
}

export const state = { SUBCATS:{}, questions:[], exams:[], results:[], teachers:[], students:[], nextQId:100, nextEId:10, currentUserEmail: '', currentUserName: '' };
export const $ = id => document.getElementById(id);
if (typeof window !== 'undefined') { window.$ = $; }
export const clone = obj => JSON.parse(JSON.stringify(obj));
export const shuffle = a => a.slice().sort(() => Math.random() - .5);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[m]));

export function mediaHTML(url, cls='q-img'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:image\//i.test(u)) return '';
  return `<img class="${cls}" src="${esc(u)}" alt="Hình minh họa" loading="lazy">`;
}

export function audioHTML(url, qIdx = null, mode = 'practice'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:audio\//i.test(u) && !/^blob:/i.test(u)) return '';
  const idAttr = qIdx !== null ? `id="q-audio-${qIdx}" data-qidx="${qIdx}"` : '';
  const badgeId = qIdx !== null ? `id="audio-limit-${qIdx}"` : '';
  return `
    <div class="audio-player-card">
      <div class="audio-header">
        <span class="audio-badge">🎧 Bài nghe (Listening)</span>
        ${mode === 'exam' ? `<span class="audio-limit-badge" ${badgeId}>Số lần nghe: 0 / 2</span>` : `<span class="audio-hint-badge">Chế độ Ôn luyện</span>`}
      </div>
      <audio class="q-audio" ${idAttr} controls ${mode === 'exam' ? 'controlsList="nodownload"' : ''} preload="metadata" src="${esc(u)}">Trình duyệt không hỗ trợ phát audio.</audio>
    </div>`;
}

export function videoHTML(url, qIdx = null, mode = 'practice'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:video\//i.test(u) && !/^blob:/i.test(u)) return '';
  const idAttr = qIdx !== null ? `id="q-video-${qIdx}" data-qidx="${qIdx}"` : '';
  const badgeId = qIdx !== null ? `id="video-limit-${qIdx}"` : '';
  const controlsId = qIdx !== null ? `data-qidx="${qIdx}"` : '';
  return `
    <div class="video-player-card">
      <div class="video-header">
        <span class="video-badge">🎬 Video Bài Học & Bài Tập (Video Comprehension)</span>
        ${mode === 'exam' ? `<span class="video-limit-badge" ${badgeId}>Số lần xem: 0 / 2</span>` : `<span class="video-hint-badge">Chế độ Ôn luyện (Tự do xem)</span>`}
      </div>
      <div class="video-wrapper">
        <video class="q-video" ${idAttr} controls playsinline preload="metadata" ${mode === 'exam' ? 'controlsList="nodownload"' : ''} src="${esc(u)}">
          Trình duyệt của bạn không hỗ trợ phát video MP4.
        </video>
      </div>
      <div class="video-speed-toolbar">
        <span style="font-size:12px; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px;">
          <span>⚡</span> Tốc độ phát:
        </span>
        <div class="video-speed-group" ${controlsId}>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 0.75)">0.75x</button>
          <button type="button" class="btn-video-speed active" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.0)">1.0x (Chuẩn)</button>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.25)">1.25x</button>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.5)">1.5x</button>
        </div>
      </div>
    </div>`;
}

if (typeof window !== 'undefined') {
  window.setVideoPlaybackSpeed = function(btn, videoId, speed) {
    let videoEl = null;
    if (videoId) {
      videoEl = document.getElementById(videoId);
    } else if (btn) {
      const card = btn.closest('.video-player-card');
      videoEl = card ? card.querySelector('video') : null;
    }
    if (videoEl) {
      videoEl.playbackRate = speed;
      const group = btn.closest('.video-speed-group');
      if (group) {
        group.querySelectorAll('.btn-video-speed').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
    }
  };
}

export const TYPE_LABELS = {
  mcq_single: 'Trắc nghiệm - 1 đáp án',
  mcq_multi: 'Trắc nghiệm - nhiều đáp án',
  fill_blank: 'Điền từ vào chỗ trống',
  drag_drop: 'Kéo-thả vào chỗ trống',
  matching: 'Ghép cặp'
};

// Tách nội dung câu hỏi điền-từ theo dấu ___ thành các đoạn text xen kẽ chỗ trống
export function splitBlanks(text){
  return String(text || '').split(/_{3,}/);
}
export function countBlanks(text){
  return Math.max(0, splitBlanks(text).length - 1);
}
function normAns(s){ return String(s ?? '').trim().toLowerCase(); }

// So khớp 1 câu trả lời của học viên với đáp án đúng của câu hỏi q, theo từng loại (type)
export function isCorrect(q, userAns){
  if (!q) return false;
  const type = q.type || 'mcq_single';

  if(type === 'mcq_single'){
    if (userAns === undefined || userAns === null || userAns === '') return false;
    let expected = q.ans;
    if (typeof expected === 'string' && /^[ABCDabcd]$/.test(expected.trim())) {
      expected = ['A', 'B', 'C', 'D'].indexOf(expected.trim().toUpperCase());
    }
    let actual = userAns;
    if (typeof actual === 'string' && /^[ABCDabcd]$/.test(actual.trim())) {
      actual = ['A', 'B', 'C', 'D'].indexOf(actual.trim().toUpperCase());
    }
    return Number(actual) === Number(expected);
  }

  if(type === 'mcq_multi'){
    if (!Array.isArray(userAns)) return false;
    const normalizeAns = val => {
      if (typeof val === 'string' && /^[ABCDabcd]$/.test(val.trim())) {
        return ['A', 'B', 'C', 'D'].indexOf(val.trim().toUpperCase());
      }
      return Number(val);
    };
    const ua = (userAns || []).map(normalizeAns).sort((a, b) => a - b);
    const ca = (Array.isArray(q.ans) ? q.ans : [q.ans]).map(normalizeAns).sort((a, b) => a - b);
    return ua.length === ca.length && ua.every((v,i) => v === ca[i]);
  }

  if(type === 'fill_blank' || type === 'drag_drop'){
    const ua = Array.isArray(userAns) ? userAns : [];
    if (!q.blanks || !q.blanks.length) return false;
    return q.blanks.every((accepted, i) => {
      const opts = String(accepted || '').split('|').map(normAns).filter(Boolean);
      return opts.includes(normAns(ua[i]));
    });
  }

  if(type === 'matching'){
    const ua = userAns && typeof userAns === 'object' ? userAns : {};
    if (!q.pairs || !q.pairs.length) return false;
    return q.pairs.every((_, i) => Number(ua[i]) === Number(i));
  }

  return false;
}

// Hiển thị đáp án (của học viên hoặc đáp án đúng) dạng text để show ở màn hình kết quả
export function formatAnswer(q, userAns, showCorrect=false){
  if (!q) return 'Chưa làm';
  const type = q.type || 'mcq_single';

  if(type === 'mcq_single'){
    let target = showCorrect ? q.ans : userAns;
    if (typeof target === 'string' && /^[ABCDabcd]$/.test(target.trim())) {
      target = ['A', 'B', 'C', 'D'].indexOf(target.trim().toUpperCase());
    }
    const i = Number(target);
    return (isNaN(i) || i < 0 || !q.opts?.[i]) ? 'Chưa chọn' : `${KEYS[i] || '?'}. ${q.opts[i]}`;
  }

  if(type === 'mcq_multi'){
    const rawArr = showCorrect ? (Array.isArray(q.ans) ? q.ans : [q.ans]) : (Array.isArray(userAns) ? userAns : []);
    if(!rawArr.length) return 'Chưa chọn';
    const normalizeAns = val => {
      if (typeof val === 'string' && /^[ABCDabcd]$/.test(val.trim())) {
        return ['A', 'B', 'C', 'D'].indexOf(val.trim().toUpperCase());
      }
      return Number(val);
    };
    return rawArr
      .map(normalizeAns)
      .filter(i => !isNaN(i) && q.opts?.[i])
      .sort((a,b)=>a-b)
      .map(i => `${KEYS[i] || '?'}. ${q.opts[i]}`)
      .join('; ');
  }

  if(type === 'fill_blank' || type === 'drag_drop'){
    const arr = showCorrect ? (q.blanks || []) : (Array.isArray(userAns) ? userAns : []);
    if(!arr.length) return 'Chưa điền';
    return arr.map((x,i) => `#${i+1}: ${x || '___'}`).join(' | ');
  }

  if(type === 'matching'){
    if(showCorrect){
      return (q.pairs || []).map(p => `${p.left} = ${p.right}`).join('; ');
    }
    const map = userAns || {};
    const keys = Object.keys(map);
    if(!keys.length) return 'Chưa ghép';
    return keys.map(lIdx => {
      const rIdx = map[lIdx];
      const leftText = q.pairs?.[lIdx]?.left || `Mục ${Number(lIdx)+1}`;
      const rightText = q.pairs?.[rIdx]?.right || `Mục ${Number(rIdx)+1}`;
      return `${leftText} → ${rightText}`;
    }).join('; ');
  }

  return String(userAns || 'Chưa làm');
}

export function renderRich(txt) {
    if (!txt) return '';
    
    // 0. Bảo vệ các khối công thức Toán ($...$, $$...$$, \(...\), \[...\]) không bị escape & / < / >
    const mathTokens = [];
    let textWithPlaceholders = String(txt).replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, (match) => {
      const idx = mathTokens.length;
      mathTokens.push(match);
      return `___MATH_TOKEN_${idx}___`;
    });

    // 1. Tự mã hóa HTML an toàn cho phần văn bản thông thường
    let s = textWithPlaceholders
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 2. Mở khóa và ÉP CSS nội tuyến để chống lại CSS Reset
    s = s.replace(/&lt;b&gt;/gi, '<b style="font-weight: bold !important;">').replace(/&lt;\/b&gt;/gi, '</b>');
    s = s.replace(/&lt;i&gt;/gi, '<i style="font-style: italic !important;">').replace(/&lt;\/i&gt;/gi, '</i>');
    s = s.replace(/&lt;u&gt;/gi, '<u style="text-decoration: underline !important;">').replace(/&lt;\/u&gt;/gi, '</u>');
    
    // 3. Mở khóa thẻ SPAN đổi màu
    s = s.replace(/&lt;span style=(&#39;|&quot;|&apos;|"|')color:\s*([a-zA-Z0-9#]+)\1&gt;/gi, '<span style="color:$2 !important;">');
    s = s.replace(/&lt;\/span&gt;/gi, '</span>');

    // 4. Mở khóa thẻ IMG hình ảnh
    s = s.replace(/&lt;img([^&gt;]*)&gt;/gi, '<img$1>');
    
    // 5. Khôi phục nguyên vẹn các khối công thức Toán học chuẩn LaTeX
    s = s.replace(/___MATH_TOKEN_(\d+)___/g, (_, idx) => {
      return mathTokens[parseInt(idx, 10)] || '';
    });
    
    // 6. Trả lại thẻ xuống dòng
    return s.replace(/\n/g, '<br>');
}

export function typesetMath(root=document.body){
  if(window.MathJax && window.MathJax.typesetPromise){
    if(window.MathJax.typesetClear){
      try { window.MathJax.typesetClear([root]); } catch(e){}
    }
    window.MathJax.typesetPromise([root]).catch(console.error);
  } else {
    if(window.MathJax && window.MathJax.startup?.promise){
      window.MathJax.startup.promise.then(() => {
        typesetMath(root);
      });
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if(window.MathJax && window.MathJax.typesetPromise){
          clearInterval(interval);
          typesetMath(root);
        } else if(attempts > 50) {
          clearInterval(interval);
        }
      }, 200);
    }
  }
}

export function getPool(exam){
  // 1. NẾU GIÁO VIÊN SOẠN THỦ CÔNG -> Trích xuất chính xác theo mảng thứ tự qIds
  if(exam.qIds && exam.qIds.length > 0){
      return exam.qIds.map(id => state.questions.find(q => q.id === id)).filter(Boolean);
  }
  
  // 2. NẾU LÀ ĐỀ TỰ ĐỘNG -> Lọc tất cả từ trong kho
  let pool = state.questions.slice();
  if(exam.subcat) pool = pool.filter(q => q.subcat === exam.subcat);
  else if(exam.cat) pool = pool.filter(q => q.cat === exam.cat);
  return pool;
}

export async function initData(loadResults = false){
  // 1. Tải Danh mục (Categories)
  try {
    const { data: catRows, error: catErr } = await db().from('categories').select('*');
    if (catErr) {
      console.warn("Lỗi tải categories từ Supabase:", catErr);
      state.SUBCATS = clone(DEFAULT_SUBCATS);
    } else if (!catRows || catRows.length === 0) {
      state.SUBCATS = clone(DEFAULT_SUBCATS);
      const inserts = Object.keys(DEFAULT_SUBCATS).map(k => ({ name: k, subcategories: DEFAULT_SUBCATS[k] }));
      try { await db().from('categories').upsert(inserts, { onConflict: 'name' }); } catch(e){}
    } else {
      state.SUBCATS = {};
      catRows.forEach(r => { state.SUBCATS[r.name] = r.subcategories || []; });
    }
  } catch (err) {
    console.warn("Ngoại lệ tải categories:", err);
    state.SUBCATS = clone(DEFAULT_SUBCATS);
  }

  // 2. Tải Ngân hàng câu hỏi (Questions)
  try {
    const { data: qRows, error: qErr } = await db().from('questions').select('*').order('id', { ascending: true });
    if (qErr) {
      console.warn("Lỗi tải questions từ Supabase:", qErr);
      state.questions = clone(DEFAULT_QUESTIONS);
    } else if (!qRows || qRows.length === 0) {
      state.questions = clone(DEFAULT_QUESTIONS);
      try { await db().from('questions').insert(DEFAULT_QUESTIONS); } catch(e){}
    } else {
      state.questions = qRows.map(q => ({
        ...q,
        id: isNaN(Number(q.id)) ? q.id : Number(q.id),
        opts: q.opts || [],
        blanks: q.blanks || [],
        bank: q.bank || [],
        pairs: q.pairs || []
      }));
    }
  } catch (err) {
    console.warn("Ngoại lệ tải questions:", err);
    state.questions = clone(DEFAULT_QUESTIONS);
  }
  state.nextQId = state.questions.length ? Math.max(...state.questions.map(q => Number(q.id)||0), 99) + 1 : 100;

  // 3. Tải Đề thi (Exams)
  try {
    const { data: eRows, error: eErr } = await db().from('exams').select('*').order('id', { ascending: true });
    if (eErr) {
      console.warn("Lỗi tải exams từ Supabase:", eErr);
      state.exams = clone(DEFAULT_EXAMS);
    } else if (!eRows || eRows.length === 0) {
      state.exams = clone(DEFAULT_EXAMS);
      const examInserts = DEFAULT_EXAMS.map(e => ({
        id: e.id,
        name: e.name,
        description: e.desc || '',
        count: e.count || 10,
        cat: e.cat || '',
        subcat: e.subcat || '',
        time_limit: e.timeLimit || 0,
        is_hidden: e.isHidden || false,
        q_ids: e.qIds || []
      }));
      try { await db().from('exams').insert(examInserts); } catch(e){}
    } else {
      state.exams = eRows.map(e => ({
        id: isNaN(Number(e.id)) ? e.id : Number(e.id),
        name: e.name,
        desc: e.description || e.desc || '',
        count: e.count || 10,
        cat: e.cat || '',
        subcat: e.subcat || '',
        timeLimit: e.time_limit ?? e.timeLimit ?? 0,
        isHidden: e.is_hidden ?? e.isHidden ?? false,
        qIds: e.q_ids || e.qIds || []
      }));
    }
  } catch (err) {
    console.warn("Ngoại lệ tải exams:", err);
    state.exams = clone(DEFAULT_EXAMS);
  }
  state.nextEId = state.exams.length ? Math.max(...state.exams.map(e => Number(e.id)||0), 9) + 1 : 10;

  // 4. Tải Kết quả thi (Results)
  if (loadResults) {
    try {
      const { data: rRows, error: rErr } = await db().from('results').select('*').order('id', { ascending: false });
      if (rErr) console.warn("Lỗi tải results:", rErr);
      state.results = (rRows || []).map(r => ({
        ...r,
        id: isNaN(Number(r.id)) ? r.id : Number(r.id),
        manualScore: Number(r.manual_score ?? r.manualScore ?? 0),
        score: Number(r.score ?? 0),
        answers: r.answers || []
      }));
    } catch (err) {
      console.warn("Ngoại lệ tải results:", err);
      state.results = [];
    }
  } else {
    state.results = [];
  }

  // 5. Tải danh sách Giảng viên (Teachers) để hiển thị Họ và Tên tác giả
  try {
    const { data: tRows } = await db().from('teachers').select('id, email, teacher_name, department, role');
    if (tRows && tRows.length > 0) {
      state.teachers = tRows;
      window.teachersList = tRows;
    }
  } catch(e){}

  // 6. Tải danh sách Học viên (Students) để hiển thị Họ và Tên
  try {
    const { data: sRows } = await db().from('students').select('id, email, full_name, class_name, academic_year, total_xp');
    if (sRows && sRows.length > 0) {
      state.students = sRows;
      window.studentsList = sRows;
    }
  } catch(e){}
}

export function fillSubcatSelect(selId, cat, addAll=true, allLabel='(Tất cả phần)'){
  const sel = $(selId);
  if(!sel) return;
  const scs = state.SUBCATS[cat] || [];
  sel.innerHTML = (addAll ? `<option value="">${esc(allLabel)}</option>` : '') +
    scs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}
