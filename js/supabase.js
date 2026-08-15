const SUPABASE_URL = "https://xuioxmjufpfdblecjvuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eKhgTzsFTVwL5mGwZTWWbQ_yogb4Hpc";

export const supabase = (typeof window !== 'undefined' && window.supabaseClient)
  ? window.supabaseClient
  : (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function'
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
      : null);

// --- HELPER: XÁC THỰC (AUTH) ---
export async function signInWithEmailAndPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(callback) {
  // 1. Kiểm tra session hiện tại
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session ? session.user : null);
  });

  // 2. Lắng nghe thay đổi trạng thái đăng nhập
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? session.user : null);
  });

  return subscription;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// --- HELPER: UPLOAD FILE LÊN SUPABASE STORAGE ---
export async function uploadMediaFile(file, bucket = 'audio-bank', onProgress = null) {
  if (!file) throw new Error("Không tìm thấy file để tải lên!");
  
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${Date.now()}_${cleanName}`;

  if (typeof onProgress === 'function') onProgress(20);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Lỗi upload Supabase Storage:", error);
    throw error;
  }

  if (typeof onProgress === 'function') onProgress(80);

  // Lấy đường link công khai (Public URL)
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (typeof onProgress === 'function') onProgress(100);

  return urlData.publicUrl;
}
