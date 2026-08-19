// --- HELPER: XÁC THỰC (AUTH) ---
export async function signInWithEmailAndPassword(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();

  if (!window.supabaseClient) {
    throw new Error('Supabase client chưa sẵn sàng. Hãy tải lại trang!');
  }

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword
    });
    if (!error) return data;

    if (!normalizedEmail || !normalizedPassword) {
      throw error;
    }

    const { data: teacherRow, error: teacherError } = await window.supabaseClient
      .from('teachers')
      .select('*')
      .ilike('email', normalizedEmail)
      .eq('password', normalizedPassword)
      .maybeSingle();

    if (teacherError) {
      throw error;
    }

    if (teacherRow && teacherRow.is_active !== false) {
      return {
        user: {
          id: teacherRow.id,
          email: teacherRow.email,
          name: teacherRow.teacher_name || teacherRow.name || teacherRow.email,
          role: teacherRow.role || 'teacher'
        }
      };
    }

    throw error;
  } catch (err) {
    if (err && err.message && err.message.includes('Invalid login credentials')) {
      throw new Error('Sai email hoặc mật khẩu! Vui lòng kiểm tra lại.');
    }
    throw err;
  }
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

/**
 * Executes a Supabase query with unified error handling
 * @param {Function} queryFn 
 * @param {string} fallbackMsg 
 */
export async function executeSafeQuery(queryFn, fallbackMsg = 'Có lỗi kết nối cơ sở dữ liệu!') {
  try {
    const { data, error } = await queryFn(window.supabaseClient);
    if (error) {
      console.error('[Supabase Query Error]:', error);
      throw error;
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || fallbackMsg };
  }
}


