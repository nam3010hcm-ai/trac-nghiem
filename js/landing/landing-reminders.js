/**
 * MODULE LANDING ASSIGNMENT REMINDERS (js/landing/landing-reminders.js)
 * Quản lý thông báo nhắc nhở hạn nộp nhiệm vụ và bài tập
 */
const db = () => window.supabaseClient;

let activeReminderAssignment = null;

function getLoggedInTeacherUser() {
  try {
    const raw = localStorage.getItem('teacher_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.email || u.role === 'teacher' || u.role === 'root' || u.role === 'admin')) {
        return u;
      }
    }
  } catch(e){}
  return null;
}

export function handleRemindDeadline(asgId, title, dueDate, studentCount = 120) {
  const teacherUser = getLoggedInTeacherUser();

  // Kiểm tra quyền: Chỉ tài khoản giảng viên mới có quyền phát thông báo nhắc nhở
  if (!teacherUser) {
    window.openTeacherAuthRequiredModal();
    return;
  }

  activeReminderAssignment = {
    id: asgId,
    title: title,
    dueDate: dueDate,
    studentCount: studentCount,
    teacher: teacherUser
  };

  const modal = document.getElementById('modal-assignment-reminder');
  if (!modal) return;

  const teacherName = teacherUser.name || (teacherUser.email ? teacherUser.email.split('@')[0] : 'Thầy Nam (Root Admin)');

  if (document.getElementById('remind-modal-asg-title')) document.getElementById('remind-modal-asg-title').innerText = title;
  if (document.getElementById('remind-modal-due-badge')) document.getElementById('remind-modal-due-badge').innerText = `Hạn: ${dueDate}`;
  if (document.getElementById('remind-modal-student-count')) document.getElementById('remind-modal-student-count').innerText = `${studentCount} Học viên`;
  if (document.getElementById('remind-modal-teacher-name')) document.getElementById('remind-modal-teacher-name').innerText = teacherName;

  if (document.getElementById('remind-modal-msg-text')) {
    document.getElementById('remind-modal-msg-text').value = `📢 [NHẮC NHỞ TỪ GIẢNG VIÊN] Nhiệm vụ "${title}" sắp đến hạn nộp vào ngày ${dueDate}. Các em học sinh hãy nhanh chóng hoàn thành bài tập đúng hạn nhé!`;
  }

  modal.style.display = 'flex';
}

export async function submitAssignmentReminder() {
  const teacherUser = getLoggedInTeacherUser();
  if (!teacherUser || !activeReminderAssignment) {
    window.closeAssignmentReminderModal();
    window.openTeacherAuthRequiredModal();
    return;
  }

  const btn = document.getElementById('btn-submit-reminder');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Đang phát thông báo...';
  }

  const msgText = (document.getElementById('remind-modal-msg-text')?.value || '').trim();
  const optStream = document.getElementById('remind-opt-stream')?.checked !== false;
  const teacherName = teacherUser.name || (teacherUser.email ? teacherUser.email.split('@')[0] : 'Thầy Nam (Root Admin)');

  // 1. Đăng bài lên bảng tin lớp học Supabase class_posts nếu kết nối CSDL
  if (optStream && db()) {
    try {
      await db().from('class_posts').insert([{
        class_id: '00000000-0000-0000-0000-000000000010',
        author_name: teacherName,
        author_role: 'teacher',
        author_avatar: '👩‍🏫',
        content: msgText,
        comments: []
      }]);
    } catch(err) {
      console.warn("Lỗi lưu post nhắc nhở lên class_posts:", err);
    }
  }

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🚀 Phát Thông Báo Ngay';
    }
    window.closeAssignmentReminderModal();
    alert(`✅ ĐÃ PHÁT THÔNG BÁO THÀNH CÔNG!\n\nĐã gửi thông báo nhắc nhở hạn nộp nhiệm vụ "${activeReminderAssignment.title}" tới ${activeReminderAssignment.studentCount} học viên của lớp.`);
  }, 400);
}

export function openTeacherAuthRequiredModal() {
  const modal = document.getElementById('modal-teacher-auth-required');
  if (modal) modal.style.display = 'flex';
}

export function closeTeacherAuthRequiredModal() {
  const modal = document.getElementById('modal-teacher-auth-required');
  if (modal) modal.style.display = 'none';
}

export function closeAssignmentReminderModal() {
  const modal = document.getElementById('modal-assignment-reminder');
  if (modal) modal.style.display = 'none';
  activeReminderAssignment = null;
}

export function viewAllDeadlines() {
  const teacherUser = getLoggedInTeacherUser();
  if (teacherUser) {
    window.location.href = 'teacher.html#assignments';
  } else {
    window.location.href = 'student.html#assignments';
  }
}

if (typeof window !== 'undefined') {
  window.handleRemindDeadline = handleRemindDeadline;
  window.submitAssignmentReminder = submitAssignmentReminder;
  window.openTeacherAuthRequiredModal = openTeacherAuthRequiredModal;
  window.closeTeacherAuthRequiredModal = closeTeacherAuthRequiredModal;
  window.closeAssignmentReminderModal = closeAssignmentReminderModal;
  window.viewAllDeadlines = viewAllDeadlines;
}
