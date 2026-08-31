/**
 * MODULE TEACHER MEDIA GALLERY (js/teacher/teacher-gallery.js)
 * Thư viện hình ảnh đám mây, tải ảnh lên Supabase Storage và gắn vào câu hỏi
 */
import { esc, uploadMediaFile } from '../common.js';

const db = () => window.supabaseClient;

export let imageGallery = [];

export async function loadGallery() {
  const list = document.getElementById("gallery-list");
  const modalList = document.getElementById("modal-gallery-list");
  if (!list && !modalList) return;

  try {
    const { data: items, error } = await db().from('gallery').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    imageGallery = items || [];
    try { localStorage.setItem('app_gallery_cache', JSON.stringify(imageGallery)); } catch(e){}
  } catch (e) {
    console.warn("[Gallery Warning] Không tải được từ Supabase, nạp từ bộ nhớ đệm:", e);
    try {
      const cached = localStorage.getItem('app_gallery_cache');
      if (cached) imageGallery = JSON.parse(cached);
    } catch(err){}
  }
  renderGallery();
}

export function renderGallery() {
  const list = document.getElementById("gallery-list");
  const modalList = document.getElementById("modal-gallery-list");
  
  if (!imageGallery.length) {
    const emptyMsg = "<div style='color:#64748b; font-size:13.5px; padding:16px 0; width:100%; text-align:center;'>📭 Chưa có ảnh nào trong thư viện. Bạn có thể chọn file và tải lên ngay phía trên!</div>";
    if(list) list.innerHTML = emptyMsg;
    if(modalList) modalList.innerHTML = emptyMsg;
    return;
  }

  const html = imageGallery.map(img => {
    const src = img.url || img.base64;
    return `
      <div style="border:1.5px solid #cbd5e1; border-radius:8px; padding:10px; width:160px; text-align:center; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <img src="${src}" style="max-width:100%; height:95px; object-fit:contain; margin-bottom:8px; border-radius:4px; border:1px solid #f1f5f9; display:block; margin:0 auto 8px;">
        <div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(img.name)}">${esc(img.name)}</div>
        <button class="btn btn-sm btn-danger" onclick="window.deleteGalleryItem('${img.id}')" style="width:100%; font-size:11.5px; padding:3px 0;">🗑 Xóa</button>
      </div>
    `;
  }).join('');
  
  const modalHtml = imageGallery.map(img => {
    const src = img.url || img.base64;
    return `
      <div style="border:1.5px solid #cbd5e1; border-radius:8px; padding:10px; width:150px; text-align:center; background:#fff; cursor:pointer; transition:all 0.15s ease; box-shadow:0 1px 4px rgba(0,0,0,0.05);" onclick="window.selectGalleryImage('${src}')" onmouseover="this.style.borderColor='#1e40af'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.transform='';">
        <img src="${src}" style="max-width:100%; height:90px; object-fit:contain; margin:0 auto 8px; display:block;">
        <div style="font-size:11.5px; font-weight:700; color:#1e40af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(img.name)}">${esc(img.name)}</div>
        <div style="font-size:10px; color:#16a34a; font-weight:600; margin-top:2px;">✔ Chọn ảnh này</div>
      </div>
    `;
  }).join('');

  if(list) list.innerHTML = html;
  if(modalList) modalList.innerHTML = modalHtml;
}

export function openSelectGalleryModal(targetInputId = 'qf-image', previewContainerId = null) {
  window._activeGalleryTargetInputId = targetInputId;
  window._activeGalleryPreviewId = previewContainerId || (targetInputId === 'qf-image' ? 'image-preview' : null);
  
  const modal = document.getElementById('modal-select-gallery');
  if (modal) {
    modal.style.display = 'flex';
    loadGallery();
  }
}

export async function quickUploadToGalleryFromModal() {
  const fileInput = document.getElementById('modal-quick-upload-file');
  const file = fileInput?.files?.[0];
  if (!file) {
    alert("Vui lòng chọn 1 file ảnh từ máy tính!");
    return;
  }

  const btn = document.getElementById('btn-modal-quick-upload');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang tải ảnh lên...";
  }

  try {
    const downloadURL = await uploadMediaFile(file, 'image-bank');
    const imgName = file.name.replace(/\.[^/.]+$/, "");
    const newItem = { id: 'gal_' + Date.now(), name: imgName, url: downloadURL, created_at: Date.now() };

    try {
      await db().from('gallery').insert([newItem]);
    } catch (dbErr) {
      console.warn("Không lưu được vào DB gallery:", dbErr);
    }

    imageGallery.unshift(newItem);
    try { localStorage.setItem('app_gallery_cache', JSON.stringify(imageGallery)); } catch(e){}

    renderGallery();
    selectGalleryImage(downloadURL);
    if (fileInput) fileInput.value = '';
  } catch (err) {
    console.error(err);
    alert("Lỗi tải ảnh: " + (err.message || err));
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = "⬆ Tải lên & Chọn luôn";
  }
}

export async function deleteGalleryItem(id) {
  if (!confirm("Xóa ảnh này khỏi danh mục thư viện?")) return;
  try {
    await db().from('gallery').delete().eq('id', id);
  } catch(e){}
  imageGallery = imageGallery.filter(img => String(img.id) !== String(id));
  try { localStorage.setItem('app_gallery_cache', JSON.stringify(imageGallery)); } catch(e){}
  renderGallery();
}

export function selectGalleryImage(src) {
  const targetId = window._activeGalleryTargetInputId || 'qf-image';
  const targetInput = document.getElementById(targetId);
  
  if (targetInput) {
    targetInput.value = src;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const previewId = window._activeGalleryPreviewId || (targetId === 'qf-image' ? 'image-preview' : null);
  if (previewId) {
    const imgPreview = document.getElementById(previewId);
    if (imgPreview) {
      imgPreview.innerHTML = `<img src="${src}" style="max-width:100%; max-height:160px; border-radius:8px; margin-top:8px; border: 1.5px solid #cbd5e1; display:block;">`;
    }
  }

  if (targetId === 'qf-image') {
    const btnClear = document.getElementById('btn-clear-image');
    if (btnClear) btnClear.style.display = 'inline-block';
  }

  const modal = document.getElementById('modal-select-gallery');
  if (modal) modal.style.display = 'none';

  if (typeof window.syncCurrentDesignerSkillToDraft === 'function') {
    window.syncCurrentDesignerSkillToDraft();
  }
}

if (typeof window !== 'undefined') {
  window.loadGallery = loadGallery;
  window.renderGallery = renderGallery;
  window.openSelectGalleryModal = openSelectGalleryModal;
  window.quickUploadToGalleryFromModal = quickUploadToGalleryFromModal;
  window.deleteGalleryItem = deleteGalleryItem;
  window.selectGalleryImage = selectGalleryImage;
}
