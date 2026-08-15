// --- HELPER: XÁC THỰC (AUTH) ---
export async function signInWithEmailAndPassword(email, password) {
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(callback) {
  window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
    callback(session ? session.user : null);
  });
  const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
    callback(session ? session.user : null);
  });
  return subscription;
}

export async function getCurrentUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

// --- HELPER: UPLOAD FILE LÊN SUPABASE STORAGE ---
export async function uploadMediaFile(file, bucket = 'audio-bank', onProgress = null) {
  if (!file) throw new Error("Không tìm thấy file để tải lên!");
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${Date.now()}_${cleanName}`;
  if (typeof onProgress === 'function') onProgress(20);
  const { data, error } = await window.supabaseClient.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600', upsert: false
  });
  if (error) { console.error("Lỗi upload:", error); throw error; }
  if (typeof onProgress === 'function') onProgress(80);
  const { data: urlData } = window.supabaseClient.storage.from(bucket).getPublicUrl(filePath);
  if (typeof onProgress === 'function') onProgress(100);
  return urlData.publicUrl;
}
