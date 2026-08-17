// ============================================================================
// EDUCORE LMS — CLASSROOM STREAM & SOCIAL LEARNING (class-stream.js)
// Class Announcement Stream, Interactive Discussions & Homework Attachments
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';

export let classPostsList = [
  {
    id: 'post_1',
    authorName: 'Cô Emma (Giáo Viên Tiếng Anh)',
    authorRole: 'Giáo viên',
    authorAvatar: '👩‍🏫',
    createdAt: '2026-08-16T10:00',
    content: '📢 Thông báo: Đã phát hành bài tập Video Roleplay 2 Nhân Vật A & B cho Lớp 10A1. Các em vào mục "Bài học & Unit" hoặc "Cổng Học Viên" để luyện tập đóng vai và nhận điểm thưởng +50 XP nhé!',
    comments: [
      { id: 'c_1', authorName: 'Nguyễn Văn An', text: 'Dạ vâng ạ cô, em vừa hoàn thành lượt đóng vai A đạt 92% điểm chuẩn xác!', createdAt: '2026-08-16T10:30' }
    ]
  },
  {
    id: 'post_2',
    authorName: 'Thầy David (Phụ Trách Thi)',
    authorRole: 'Giáo viên',
    authorAvatar: '👨‍🏫',
    createdAt: '2026-08-15T16:20',
    content: '📝 Nhắc nhở: Lịch thi Giữa kỳ 1 Môn Tiếng Anh sẽ bắt đầu từ 08:00 sáng Thứ Hai tới. Đề thi gồm 40 câu trắc nghiệm ma trận (45 phút). Chúc các em ôn tập tốt!',
    comments: []
  }
];

export async function loadClassPosts() {
  const saved = localStorage.getItem('educore_class_posts');
  if (saved) {
    try { classPostsList = JSON.parse(saved); } catch(e){}
  }
  return classPostsList;
}

function savePostsToLocal() {
  try {
    localStorage.setItem('educore_class_posts', JSON.stringify(classPostsList));
  } catch(e){}
}

export function renderClassStream(options = {}) {
  const container = document.getElementById('class-stream-container');
  const allowCreate = options.allowCreate !== false;
  if (!container) return;

  container.innerHTML = `
    ${allowCreate ? `
      <div class="card" style="margin-bottom:20px">
        <div style="font-weight:700;font-size:15px;margin-bottom:8px">📢 Đăng Thông Báo Hoặc Thảo Luận Mới:</div>
        <textarea id="stream-post-input" rows="3" placeholder="Nhập thông báo, nhắc nhở hoặc câu hỏi thảo luận cho lớp học..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <span style="font-size:12px;color:#64748b">📎 Có thể đính kèm đường dẫn bài học hoặc đề thi</span>
          <button class="btn btn-p" onclick="window.submitStreamPost()">🚀 Đăng Bài</button>
        </div>
      </div>
    ` : `
      <div class="card" style="margin-bottom:18px;padding:12px 14px;border-left:4px solid #22c55e;">
        <div style="font-size:13px;font-weight:700;color:#166534">📣 Bảng thông báo lớp học</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">Bạn có thể đọc tin nhắn của giáo viên và phản hồi bình luận dưới từng bài đăng.</div>
      </div>
    `}

    <div style="display:flex;flex-direction:column;gap:16px">
      ${classPostsList.map(post => `
        <div class="card" style="border-left:4px solid #6366f1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="font-size:24px">${post.authorAvatar || '👤'}</div>
            <div>
              <strong style="color:#0f172a">${esc(post.authorName)}</strong>
              <span class="badge-lms badge-lms-info" style="margin-left:6px">${esc(post.authorRole)}</span>
              <div style="font-size:11px;color:#64748b">${formatDateTime(post.createdAt)}</div>
            </div>
          </div>

          <div style="font-size:14px;line-height:1.6;color:#1e293b;margin-bottom:14px;white-space:pre-line">${esc(post.content)}</div>

          <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:10px">
            <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px">💬 BÌNH LUẬN (${post.comments ? post.comments.length : 0}):</div>
            ${post.comments && post.comments.length > 0 ? post.comments.map(c => `
              <div style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px">
                <strong style="color:#2563eb">${esc(c.authorName)}:</strong> ${esc(c.text)}
              </div>
            `).join('') : '<div style="font-size:12px;color:#94a3b8">Chưa có bình luận nào.</div>'}

            <div style="display:flex;gap:8px;margin-top:10px">
              <input type="text" id="comment-input-${post.id}" placeholder="Viết bình luận..." style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px" />
              <button class="btn btn-sm btn-secondary" onclick="window.submitPostComment('${post.id}')">Gửi</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function submitStreamPost() {
  const input = document.getElementById('stream-post-input');
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('warning', 'Nhập Nội Dung', 'Vui lòng nhập nội dung thông báo!');
    return;
  }

  const newPost = {
    id: 'post_' + Date.now(),
    authorName: 'Ban Quản Trị EduCore',
    authorRole: 'Giáo viên',
    authorAvatar: '⚡',
    createdAt: new Date().toISOString(),
    content: text,
    comments: []
  };

  classPostsList.unshift(newPost);
  savePostsToLocal();
  renderClassStream();
  showToast('success', 'Đăng Thông Báo', 'Đã đăng thông báo lên bảng tin lớp học!');
}

export function submitPostComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const post = classPostsList.find(p => p.id === postId);
  if (post) {
    if (!post.comments) post.comments = [];
    post.comments.push({
      id: 'c_' + Date.now(),
      authorName: 'Giáo Viên Admin',
      text: text,
      createdAt: new Date().toISOString()
    });
    savePostsToLocal();
    renderClassStream();
    showToast('info', 'Bình Luận', 'Đã gửi bình luận.');
  }
}

function formatDateTime(dtStr) {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch(e) { return dtStr; }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.submitStreamPost = submitStreamPost;
window.submitPostComment = submitPostComment;
