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

// --- HELPER: UPLOAD FILE LÊN SUPABASE STORAGE CÓ TỰ ĐỘNG DỰ PHÒNG ---
export async function uploadMediaFile(file, bucket = 'audio-bank', onProgress = null) {
  if (!file) throw new Error("Không tìm thấy file để tải lên!");
  
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${Date.now()}_${cleanName}`;
  
  if (typeof onProgress === 'function') onProgress(20);

  try {
    const { data, error } = await window.supabaseClient.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.warn(`[Storage Upload Warning] Bucket '${bucket}' gặp lỗi:`, error.message);
      
      // Thử tải lên bucket dự phòng 'audio-bank' nếu ban đầu dùng 'video-bank'
      if (bucket !== 'audio-bank') {
        const retryRes = await window.supabaseClient.storage.from('audio-bank').upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        if (!retryRes.error) {
          const { data: urlData } = window.supabaseClient.storage.from('audio-bank').getPublicUrl(filePath);
          if (typeof onProgress === 'function') onProgress(100);
          return urlData.publicUrl;
        }
      }

      // Tự động dự phòng sang Base64 Data URL nếu là file ảnh hoặc video nhỏ
      if (file.type && (file.type.startsWith('image/') || file.size < 8 * 1024 * 1024)) {
        if (typeof onProgress === 'function') onProgress(60);
        const base64Url = await fileToBase64(file);
        if (typeof onProgress === 'function') onProgress(100);
        return base64Url;
      }
      throw error;
    }

    if (typeof onProgress === 'function') onProgress(80);
    const { data: urlData } = window.supabaseClient.storage.from(bucket).getPublicUrl(filePath);
    if (typeof onProgress === 'function') onProgress(100);
    return urlData.publicUrl;
  } catch (err) {
    if (file.type && (file.type.startsWith('image/') || file.size < 8 * 1024 * 1024)) {
      if (typeof onProgress === 'function') onProgress(60);
      const base64Url = await fileToBase64(file);
      if (typeof onProgress === 'function') onProgress(100);
      return base64Url;
    }
    throw new Error(`Lỗi tải file lên máy chủ (${err.message}). Vui lòng kiểm tra quyền Storage RLS hoặc dán trực tiếp đường dẫn video/audio URL.`);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

