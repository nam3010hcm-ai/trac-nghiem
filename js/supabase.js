const SUPABASE_URL = "https://xuioxmjufpfdblecjvuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eKhgTzsFTVwL5mGwZTWWbQ_yogb4Hpc";

// ES modules are deferred — they execute AFTER all sync <script> tags in <head> have run.
// So window.supabaseClient is already set by the time this module evaluates.
function buildClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return window.supabaseClient;
  }
  return null;
}

// Export the real client object directly — no Proxy, no binding issues.
export const supabase = buildClient();

// --- HELPER: XÁC THỰC (AUTH) ---
export async function signInWithEmailAndPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(callback) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session ? session.user : null);
  });
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
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600', upsert: false
  });
  if (error) { console.error("Lỗi upload:", error); throw error; }
  if (typeof onProgress === 'function') onProgress(80);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  if (typeof onProgress === 'function') onProgress(100);
  return urlData.publicUrl;
}
