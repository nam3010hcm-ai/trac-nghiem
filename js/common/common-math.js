/**
 * MODULE COMMON MATH & MEDIA RENDERER (js/common/common-math.js)
 * Bảo vệ công thức Toán MathJax / LaTeX, Audio, Video và HTML Rendering
 */
import { esc } from './common-exam.js';

export function mediaHTML(url, cls='q-img'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:image\//i.test(u)) return '';
  return `<img class="${cls}" src="${esc(u)}" alt="Hình minh họa" loading="lazy">`;
}

export function audioHTML(url, qIdx = null, mode = 'practice'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:audio\//i.test(u) && !/^blob:/i.test(u)) return '';
  const idAttr = qIdx !== null ? `id="q-audio-${qIdx}" data-qidx="${qIdx}"` : '';
  const badgeId = qIdx !== null ? `id="audio-limit-${qIdx}"` : '';
  return `
    <div class="audio-player-card">
      <div class="audio-header">
        <span class="audio-badge">🎧 Bài nghe (Listening)</span>
        ${mode === 'exam' ? `<span class="audio-limit-badge" ${badgeId}>Số lần nghe: 0 / 2</span>` : `<span class="audio-hint-badge">Chế độ Ôn luyện</span>`}
      </div>
      <audio class="q-audio" ${idAttr} controls ${mode === 'exam' ? 'controlsList="nodownload"' : ''} preload="metadata" src="${esc(u)}">Trình duyệt không hỗ trợ phát audio.</audio>
    </div>`;
}

export function videoHTML(url, qIdx = null, mode = 'practice'){
  const u = String(url || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u) && !/^data:video\//i.test(u) && !/^blob:/i.test(u)) return '';
  const idAttr = qIdx !== null ? `id="q-video-${qIdx}" data-qidx="${qIdx}"` : '';
  const badgeId = qIdx !== null ? `id="video-limit-${qIdx}"` : '';
  const controlsId = qIdx !== null ? `data-qidx="${qIdx}"` : '';
  return `
    <div class="video-player-card">
      <div class="video-header">
        <span class="video-badge">🎬 Video Bài Học & Bài Tập (Video Comprehension)</span>
        ${mode === 'exam' ? `<span class="video-limit-badge" ${badgeId}>Số lần xem: 0 / 2</span>` : `<span class="video-hint-badge">Chế độ Ôn luyện (Tự do xem)</span>`}
      </div>
      <div class="video-wrapper">
        <video class="q-video" ${idAttr} controls playsinline preload="metadata" ${mode === 'exam' ? 'controlsList="nodownload"' : ''} src="${esc(u)}">
          Trình duyệt của bạn không hỗ trợ phát video MP4.
        </video>
      </div>
      <div class="video-speed-toolbar">
        <span style="font-size:12px; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px;">
          <span>⚡</span> Tốc độ phát:
        </span>
        <div class="video-speed-group" ${controlsId}>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 0.75)">0.75x</button>
          <button type="button" class="btn-video-speed active" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.0)">1.0x (Chuẩn)</button>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.25)">1.25x</button>
          <button type="button" class="btn-video-speed" onclick="window.setVideoPlaybackSpeed(this, ${qIdx !== null ? `'q-video-${qIdx}'` : 'null'}, 1.5)">1.5x</button>
        </div>
      </div>
    </div>`;
}

if (typeof window !== 'undefined') {
  window.setVideoPlaybackSpeed = function(btn, videoId, speed) {
    let videoEl = null;
    if (videoId) {
      videoEl = document.getElementById(videoId);
    } else if (btn) {
      const card = btn.closest('.video-player-card');
      videoEl = card ? card.querySelector('video') : null;
    }
    if (videoEl) {
      videoEl.playbackRate = speed;
      const group = btn.closest('.video-speed-group');
      if (group) {
        group.querySelectorAll('.btn-video-speed').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
    }
  };
}

export function renderRich(txt) {
  if (!txt) return '';
  
  // 0. Bảo vệ các khối công thức Toán ($...$, $$...$$, \(...\), \[...\]) không bị escape & / < / >
  const mathTokens = [];
  let textWithPlaceholders = String(txt).replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, (match) => {
    const idx = mathTokens.length;
    mathTokens.push(match);
    return `___MATH_TOKEN_${idx}___`;
  });

  // 1. Tự mã hóa HTML an toàn cho phần văn bản thông thường
  let s = textWithPlaceholders
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // 2. Mở khóa và ÉP CSS nội tuyến để chống lại CSS Reset
  s = s.replace(/&lt;b&gt;/gi, '<b style="font-weight: bold !important;">').replace(/&lt;\/b&gt;/gi, '</b>');
  s = s.replace(/&lt;i&gt;/gi, '<i style="font-style: italic !important;">').replace(/&lt;\/i&gt;/gi, '</i>');
  s = s.replace(/&lt;u&gt;/gi, '<u style="text-decoration: underline !important;">').replace(/&lt;\/u&gt;/gi, '</u>');
  
  // 3. Mở khóa thẻ SPAN đổi màu
  s = s.replace(/&lt;span style=(&#39;|&quot;|&apos;|"|')color:\s*([a-zA-Z0-9#]+)\1&gt;/gi, '<span style="color:$2 !important;">');
  s = s.replace(/&lt;\/span&gt;/gi, '</span>');

  // 4. Mở khóa thẻ IMG hình ảnh
  s = s.replace(/&lt;img([^&gt;]*)&gt;/gi, '<img$1>');
  
  // 5. Khôi phục nguyên vẹn các khối công thức Toán học chuẩn LaTeX
  s = s.replace(/___MATH_TOKEN_(\d+)___/g, (_, idx) => {
    return mathTokens[parseInt(idx, 10)] || '';
  });
  
  // 6. Trả lại thẻ xuống dòng
  return s.replace(/\n/g, '<br>');
}

export function typesetMath(root=document.body){
  if(window.MathJax && window.MathJax.typesetPromise){
    if(window.MathJax.typesetClear){
      try { window.MathJax.typesetClear([root]); } catch(e){}
    }
    window.MathJax.typesetPromise([root]).catch(console.error);
  } else {
    if(window.MathJax && window.MathJax.startup?.promise){
      window.MathJax.startup.promise.then(() => {
        typesetMath(root);
      });
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if(window.MathJax && window.MathJax.typesetPromise){
          clearInterval(interval);
          typesetMath(root);
        } else if(attempts > 50) {
          clearInterval(interval);
        }
      }, 200);
    }
  }
}
