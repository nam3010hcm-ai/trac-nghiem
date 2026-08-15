const SUPABASE_URL = "https://xuioxmjufpfdblecjvuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eKhgTzsFTVwL5mGwZTWWbQ_yogb4Hpc";

// Trả về Supabase client duy nhất của trang (được tạo trong <head>).
// Dùng hàm thay vì const để luôn lấy client hiện tại, tránh timing issue.
function getClient() {
  if (window.supabaseClient) return window.supabaseClient;
  // Fallback: tự tạo nếu chưa có
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return window.supabaseClient;
  }
  throw new Error("Supabase chưa sẵn sàng. Vui lòng tải lại trang.");
}

// Proxy object: các module import `supabase` và dùng như bình thường.
// Mọi lần gọi `.from()`, `.auth.*`, `.storage.*` sẽ đi qua getClient() để lấy client thực tế.
export const supabase = new Proxy({}, {
  get(_target, prop) {
    return getClient()[prop];
  }
});

// --- HELPER: XÁC THỰC (AUTH) ---
export async function signInWithEmailAndPassword(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(callback) {
  // 1. Kiểm tra session hiện tại
  getClient().auth.getSession().then(({ data: { session } }) => {
    callback(session ? session.user : null);
  });

  // 2. Lắng nghe thay đổi trạng thái đăng nhập
  const { data: { subscription } } = getClient().auth.onAuthStateChange((_event, session) => {
    callback(session ? session.user : null);
  });

  return subscription;
}

export async function getCurrentUser() {
  const { data: { user } } = await getClient().auth.getUser();
  return user;
}

// --- HELPER: UPLOAD FILE LÊN SUPABASE STORAGE ---
export async function uploadMediaFile(file, bucket = 'audio-bank', onProgress = null) {
  if (!file) throw new Error("Không tìm thấy file để tải lên!");
  
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${Date.now()}_${cleanName}`;

  if (typeof onProgress === 'function') onProgress(20);

  const { data, error } = await getClient().storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error("Lỗi upload Supabase Storage:", error);
    throw error;
  }

  if (typeof onProgress === 'function') onProgress(80);

  const { data: urlData } = getClient().storage.from(bucket).getPublicUrl(filePath);

  if (typeof onProgress === 'function') onProgress(100);

  return urlData.publicUrl;
}
