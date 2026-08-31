// ============================================================================
// EDUCORE LMS — CLASSROOM STREAM & SOCIAL LEARNING (class-stream.js)
// Class Announcement Stream, Interactive Discussions & Homework Attachments
// ============================================================================

import { showToast, renderLMSBadge } from './ui-components.js';

export const DEFAULT_CLASS_POSTS = [
  {
    id: 'c7ef186c-7a1e-4305-8148-2f02416aa41a',
    classId: '00000000-0000-0000-0000-000000000010',
    authorName: 'Cô Emma (Giáo Viên Tiếng Anh)',
    authorRole: 'Giáo viên',
    authorAvatar: '👩‍🏫',
    createdAt: '2026-08-16T07:24:51.986Z',
    content: '📢 Thông báo: Đã phát hành bài tập Video Roleplay 2 Nhân Vật A & B cho Lớp 10A1. Các em vào mục "Bài học & Unit" hoặc "Cổng Học Viên" để luyện tập nhé!',
    comments: []
  }
];

export let classPostsList = [...DEFAULT_CLASS_POSTS];

export async function loadClassPosts() {
  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('class_posts').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        classPostsList = data.map(p => ({
          id: p.id,
          classId: p.class_id,
          authorName: p.author_name || 'Giáo viên',
          authorRole: p.author_role || 'Giáo viên',
          authorAvatar: p.author_avatar || '👩‍🏫',
          content: p.content || '',
          comments: typeof p.comments === 'string' ? (JSON.parse(p.comments || '[]')) : (p.comments || []),
          createdAt: p.created_at || new Date().toISOString()
        }));
        savePostsToLocal();
        renderClassStream();
        return classPostsList;
      }
    }
  } catch(err) {
    console.warn('[ClassPosts] Fetch warning:', err);
  }

  const saved = localStorage.getItem('educore_class_posts');
  if (saved) {
    try { classPostsList = JSON.parse(saved); } catch(e){ classPostsList = DEFAULT_CLASS_POSTS; }
  } else {
    classPostsList = DEFAULT_CLASS_POSTS;
    savePostsToLocal();
  }
  renderClassStream();
  return classPostsList;
}

function savePostsToLocal() {
  try {
    localStorage.setItem('educore_class_posts', JSON.stringify(classPostsList));
  } catch(e){}
}

export function renderClassStream() {
  const container = document.getElementById('class-stream-container');
  if (!container) return;

  container.innerHTML = `
    <!-- CREATE ANNOUNCEMENT FORM -->
    <div class="card" style="margin-bottom:20px">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">📢 Đăng Thông Báo Hoặc Thảo Luận Mới:</div>
      <textarea id="stream-post-input" rows="3" placeholder="Nhập thông báo, nhắc nhở hoặc câu hỏi thảo luận cho lớp học..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit"></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
        <span style="font-size:12px;color:#64748b">📎 Có thể đính kèm đường dẫn bài học hoặc đề thi</span>
        <button class="btn btn-p" onclick="window.submitStreamPost()">🚀 Đăng Bài</button>
      </div>
    </div>

    <!-- POSTS FEED TIMELINE -->
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

          <!-- COMMENTS LIST -->
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

if (typeof window !== 'undefined') {
  window.submitStreamPost = submitStreamPost;
  window.submitPostComment = submitPostComment;
}

