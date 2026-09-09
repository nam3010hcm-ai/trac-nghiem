/**
 * ============================================================================
 * EDUCORE LMS — ACADEMIC EXCHANGE & MANAGER MESSAGING (manager-messages.js)
 * Kênh Trao Đổi & Chỉ Đạo Chuyên Môn giữa Cán bộ Khảo thí / Quản lý và Giảng viên
 * ============================================================================
 */

import { $, esc, state, isRootUser, ROOT_ADMIN_EMAIL } from './common.js';
import { showToast } from './ui-components.js';

export const DEFAULT_MANAGER_MESSAGES = [];

export let managerMessagesList = [];
let currentFilterCategory = 'all';
let currentFilterPriority = 'all';

function saveMessagesToLocal() {
  try {
    localStorage.setItem('educore_manager_messages', JSON.stringify(managerMessagesList));
  } catch(e){}
}

function loadMessagesFromLocal() {
  try {
    const raw = localStorage.getItem('educore_manager_messages');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch(e){}
  return [];
}

// 1. TẢI DANH SÁCH TIN NHẮN TỪ SUPABASE & LOCAL
export async function loadManagerMessages() {
  if (!managerMessagesList || managerMessagesList.length === 0) {
    managerMessagesList = loadMessagesFromLocal();
  }
  renderManagerMessagesList();

  try {
    const client = window.supabaseClient;
    if (client) {
      const { data, error } = await client.from('manager_messages').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        managerMessagesList = data.map(m => ({
          id: m.id,
          sender_name: m.sender_name || 'Cán bộ Quản lý',
          sender_email: m.sender_email || '',
          sender_role: m.sender_role || 'examination_officer',
          receiver_type: m.receiver_type || 'all',
          receiver_name: m.receiver_name || 'Tất Cả Giảng Viên',
          receiver_email: m.receiver_email || 'all',
          title: m.title || 'Thông báo trao đổi',
          content: m.content || '',
          category: m.category || 'khao_thi',
          priority: m.priority || 'normal',
          created_at: m.created_at || new Date().toISOString(),
          is_read: m.is_read !== false,
          replies: typeof m.replies === 'string' ? JSON.parse(m.replies || '[]') : (m.replies || [])
        }));
        saveMessagesToLocal();
        renderManagerMessagesList();
        updateUnreadMessagesCountBadge();
        return managerMessagesList;
      }
    }
  } catch(err) {
    console.warn("[ManagerMessages] Fetch error:", err);
  }

  managerMessagesList = loadMessagesFromLocal();
  renderManagerMessagesList();
  updateUnreadMessagesCountBadge();
  return managerMessagesList;
}

// 2. CẬP NHẬT BADGE ĐẾM TIN NHẮN
export function updateUnreadMessagesCountBadge() {
  const badgeEl = document.getElementById('unread-messages-count');
  if (!badgeEl) return;
  const count = (managerMessagesList || []).length;
  if (count > 0) {
    badgeEl.textContent = count;
    badgeEl.style.display = 'inline-flex';
  } else {
    badgeEl.style.display = 'none';
  }
}

// 3. RENDER GIAO DIỆN KÊNH TRAO ĐỔI & CHỈ ĐẠO
export function renderManagerMessagesList() {
  const container = document.getElementById('manager-messages-feed');
  if (!container) return;

  const currentEmail = (state?.currentUserEmail || '').toLowerCase();
  const currentRole = state?.currentUserRole || getUserCurrentRole();

  // Lọc tin nhắn
  let filtered = (managerMessagesList || []).filter(msg => {
    if (currentFilterCategory !== 'all' && msg.category !== currentFilterCategory) return false;
    if (currentFilterPriority !== 'all' && msg.priority !== currentFilterPriority) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px 20px;background:#ffffff;border-radius:12px;border:1px dashed #cbd5e1;color:#64748b;">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <div style="font-weight:700;font-size:16px;color:#1e293b;margin-bottom:6px">Chưa có thông điệp chỉ đạo hoặc trao đổi nào</div>
        <div style="font-size:13px;max-width:420px;margin:0 auto">Bấm vào nút <b>"➕ Gửi Chỉ Đạo / Trao Đổi Mới"</b> phía trên để tạo thông báo chuyên môn.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(msg => {
    const priorityBadge = getPriorityBadgeHtml(msg.priority);
    const categoryBadge = getCategoryBadgeHtml(msg.category);
    const roleBadge = getRoleBadgeHtml(msg.sender_role);
    const timeFormatted = formatTime(msg.created_at);

    const repliesCount = (msg.replies || []).length;

    return `
      <div class="card" style="border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(15,23,42,0.04);margin-bottom:18px;transition:all 0.2s;" id="msg-card-${msg.id}">
        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:10px;background:${getAvatarBgColor(msg.sender_role)};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
              ${getAvatarEmoji(msg.sender_role)}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:800;font-size:14.5px;color:#0f172a;">${esc(msg.sender_name)}</span>
                ${roleBadge}
              </div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">
                <span>Gửi tới: <b style="color:#2563eb">${esc(msg.receiver_name || 'Tất Cả Giảng Viên')}</b></span>
                <span style="margin:0 6px">•</span>
                <span>🕒 ${timeFormatted}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${categoryBadge}
            ${priorityBadge}
          </div>
        </div>

        <!-- TITLE & CONTENT -->
        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:10px;line-height:1.4;">
          ${esc(msg.title)}
        </div>
        <div style="font-size:14px;color:#334155;line-height:1.65;white-space:pre-line;margin-bottom:16px;background:#f8fafc;padding:14px 16px;border-radius:8px;border:1px solid #f1f5f9;">
          ${esc(msg.content)}
        </div>

        <!-- REPLIES SECTION -->
        <div style="background:#ffffff;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:10px;">
          <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>💬 Ý KIẾN PHẢN HỒI & TRAO ĐỔI (${repliesCount})</span>
          </div>

          <!-- REPLIES LIST -->
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;" id="replies-list-${msg.id}">
            ${repliesCount > 0 ? msg.replies.map(rep => `
              <div style="background:#f8fafc;border-left:3px solid #6366f1;border-radius:6px;padding:10px 14px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span style="font-weight:700;color:#1e293b;">
                    ${getAvatarEmoji(rep.sender_role)} ${esc(rep.sender_name)}
                    <span style="font-size:11px;font-weight:normal;color:#64748b;margin-left:4px;">(${getRoleLabel(rep.sender_role)})</span>
                  </span>
                  <span style="font-size:11px;color:#94a3b8;">${formatTime(rep.created_at)}</span>
                </div>
                <div style="color:#334155;line-height:1.5;white-space:pre-line;">${esc(rep.content)}</div>
              </div>
            `).join('') : '<div style="font-size:12.5px;color:#94a3b8;font-style:italic;">Chưa có phản hồi nào. Quý Thầy Cô và Cán bộ có thể gửi ý kiến trao đổi bên dưới.</div>'}
          </div>

          <!-- QUICK REPLY FORM -->
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="text" id="reply-input-${msg.id}" placeholder="Viết phản hồi / báo cáo tiến độ cho thông điệp này..." style="flex:1;padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;" onkeydown="if(event.key==='Enter') window.submitMessageReply('${msg.id}')" />
            <button class="btn btn-sm btn-p" onclick="window.submitMessageReply('${msg.id}')" style="padding:8px 16px;white-space:nowrap;">
              💬 Phản Hồi
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 4. MỞ MODAL TẠO THÔNG ĐIỆP CHỈ ĐẠO MỚI
export function openCreateMessageModal() {
  const modal = document.getElementById('modal-create-message');
  if (!modal) return;

  if ($('msg-new-title')) $('msg-new-title').value = '';
  if ($('msg-new-content')) $('msg-new-content').value = '';
  if ($('msg-new-priority')) $('msg-new-priority').value = 'urgent';
  if ($('msg-new-category')) $('msg-new-category').value = 'khao_thi';

  // Nạp danh sách người nhận (Giảng viên / Toàn bộ)
  const receiverSelect = $('msg-new-receiver');
  if (receiverSelect) {
    receiverSelect.innerHTML = `
      <option value="all">📢 Toàn Thể Giảng Viên & Bộ Môn (Tất cả)</option>
    `;
    const teachers = window.teachersList || [];
    teachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.email;
      opt.textContent = `👨‍🏫 ${t.teacher_name || t.name} (${t.department || 'Bộ Môn'})`;
      receiverSelect.appendChild(opt);
    });
  }

  modal.style.display = 'flex';
}

export function closeCreateMessageModal() {
  const modal = document.getElementById('modal-create-message');
  if (modal) modal.style.display = 'none';
}

// 5. LƯU THÔNG ĐIỆP CHỈ ĐẠO MỚI
export async function saveNewManagerMessage() {
  const title = ($('msg-new-title')?.value || '').trim();
  const content = ($('msg-new-content')?.value || '').trim();
  const priority = $('msg-new-priority')?.value || 'urgent';
  const category = $('msg-new-category')?.value || 'khao_thi';
  const receiverVal = $('msg-new-receiver')?.value || 'all';

  if (!title || !content) {
    alert("❌ Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông điệp chỉ đạo!");
    return;
  }

  const currentEmail = (state?.currentUserEmail || getUserCurrentEmail() || '').toLowerCase();
  const currentName = state?.currentUserName || getUserCurrentName();
  const currentRole = getUserCurrentRole();

  let receiverName = 'Toàn Thể Giảng Viên & Bộ Môn';
  if (receiverVal !== 'all') {
    const matched = (window.teachersList || []).find(t => (t.email || '').toLowerCase() === receiverVal.toLowerCase());
    if (matched) receiverName = matched.teacher_name || matched.name;
  }

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sender_name: currentName,
    sender_email: currentEmail,
    sender_role: currentRole,
    receiver_type: receiverVal === 'all' ? 'all' : 'individual',
    receiver_name: receiverName,
    receiver_email: receiverVal,
    title: title,
    content: content,
    category: category,
    priority: priority,
    created_at: new Date().toISOString(),
    is_read: true,
    replies: []
  };

  // 1. Lưu Supabase nếu có
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('manager_messages').insert([newMsg]);
    }
  } catch(e) {
    console.warn("Lỗi sync manager_messages lên Supabase:", e);
  }

  // 2. Lưu local cache
  managerMessagesList.unshift(newMsg);
  saveMessagesToLocal();
  closeCreateMessageModal();
  renderManagerMessagesList();
  updateUnreadMessagesCountBadge();
  showToast('success', 'Đã Gửi Chỉ Đạo', 'Thông điệp chỉ đạo chuyên môn đã được gửi tới Giảng viên thành công!');
}

// 6. GỬI PHẢN HỒI Ý KIẾN CHO THÔNG ĐIỆP
export async function submitMessageReply(msgId) {
  const input = document.getElementById(`reply-input-${msgId}`);
  const text = (input?.value || '').trim();
  if (!text) {
    showToast('warning', 'Nhập Phản Hồi', 'Vui lòng nhập nội dung phản hồi!');
    return;
  }

  const msg = (managerMessagesList || []).find(m => m.id === msgId);
  if (!msg) return;

  const currentEmail = (state?.currentUserEmail || getUserCurrentEmail() || '').toLowerCase();
  const currentName = state?.currentUserName || getUserCurrentName();
  const currentRole = getUserCurrentRole();

  const newReply = {
    id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sender_name: currentName,
    sender_email: currentEmail,
    sender_role: currentRole,
    content: text,
    created_at: new Date().toISOString()
  };

  if (!msg.replies) msg.replies = [];
  msg.replies.push(newReply);

  // Sync Supabase
  try {
    const client = window.supabaseClient;
    if (client) {
      await client.from('manager_messages').update({ replies: msg.replies }).eq('id', msgId);
    }
  } catch(e){}

  saveMessagesToLocal();
  renderManagerMessagesList();
  showToast('info', 'Đã Gửi Phản Hồi', 'Phản hồi trao đổi của quý Thầy Cô đã được ghi nhận.');
}

// 7. BỘ LỌC TIN NHẮN
export function filterMessagesByCategory(cat) {
  currentFilterCategory = cat;
  document.querySelectorAll('.msg-flt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderManagerMessagesList();
}

export function filterMessagesByPriority(prio) {
  currentFilterPriority = prio;
  renderManagerMessagesList();
}

// HELPER FORMATTING
function getPriorityBadgeHtml(prio) {
  if (prio === 'urgent') {
    return `<span class="badge-lms" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;font-weight:800;">🔴 Khẩn Cấp</span>`;
  } else if (prio === 'important') {
    return `<span class="badge-lms" style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-weight:700;">🟡 Quan Trọng</span>`;
  }
  return `<span class="badge-lms" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;">🟢 Bình Thường</span>`;
}

function getCategoryBadgeHtml(cat) {
  switch (cat) {
    case 'khao_thi':
      return `<span class="badge-lms" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">⚖️ Khảo Thí & Đề Thi</span>`;
    case 'hoc_vien':
      return `<span class="badge-lms" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">👥 Quản Lý Học Viên</span>`;
    case 'nhac_cham_bai':
      return `<span class="badge-lms" style="background:#fdf4ff;color:#a21caf;border:1px solid #f5d0fe;">✍️ Nhắc Nhở Chấm Bài</span>`;
    case 'he_thong':
      return `<span class="badge-lms" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">⚡ Hệ Thống</span>`;
    default:
      return `<span class="badge-lms" style="background:#f8fafc;color:#334155;border:1px solid #e2e8f0;">💬 Chỉ Đạo Đào Tạo</span>`;
  }
}

function getRoleBadgeHtml(role) {
  switch (role) {
    case 'root':
    case 'admin':
      return `<span style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;">👑 Root Admin</span>`;
    case 'examination_officer':
      return `<span style="background:#e0e7ff;color:#4338ca;border:1px solid #c7d2fe;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;">⚖️ Cán bộ Khảo thí</span>`;
    case 'student_manager':
      return `<span style="background:#d1fae5;color:#047857;border:1px solid #a7f3d0;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;">👥 Quản lý Học viên</span>`;
    default:
      return `<span style="background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;">👨‍🏫 Giảng viên</span>`;
  }
}

function getRoleLabel(role) {
  if (role === 'root' || role === 'admin') return 'Root Admin';
  if (role === 'examination_officer') return 'Khảo Thí';
  if (role === 'student_manager') return 'Quản Lý Học Viên';
  return 'Giảng Viên';
}

function getAvatarEmoji(role) {
  if (role === 'root' || role === 'admin') return '👑';
  if (role === 'examination_officer') return '⚖️';
  if (role === 'student_manager') return '👥';
  return '👨‍🏫';
}

function getAvatarBgColor(role) {
  if (role === 'root' || role === 'admin') return '#fef3c7';
  if (role === 'examination_officer') return '#e0e7ff';
  if (role === 'student_manager') return '#d1fae5';
  return '#e0f2fe';
}

function getUserCurrentRole() {
  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      return u.role || 'teacher';
    }
  } catch(e){}
  return 'teacher';
}

function getUserCurrentName() {
  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      return u.teacher_name || u.name || 'Cán bộ EduCore';
    }
  } catch(e){}
  return 'Cán bộ EduCore';
}

function getUserCurrentEmail() {
  try {
    const tcRaw = localStorage.getItem('teacher_user');
    if (tcRaw) {
      const u = JSON.parse(tcRaw);
      return u.email || '';
    }
  } catch(e){}
  return '';
}

function formatTime(dtStr) {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch(e) { return dtStr; }
}

if (typeof window !== 'undefined') {
  window.loadManagerMessages = loadManagerMessages;
  window.renderManagerMessagesList = renderManagerMessagesList;
  window.openCreateMessageModal = openCreateMessageModal;
  window.closeCreateMessageModal = closeCreateMessageModal;
  window.saveNewManagerMessage = saveNewManagerMessage;
  window.submitMessageReply = submitMessageReply;
  window.filterMessagesByCategory = filterMessagesByCategory;
  window.filterMessagesByPriority = filterMessagesByPriority;
}
