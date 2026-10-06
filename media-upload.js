// ══════ SHARED MEDIA UPLOAD (Gallery) — daga chat-interior ══════
// Kowace page ta sanya window.mediaUploadAdapter kafin ta kira initMediaUpload().
function compressImageFile(file, maxDim = 1600, quality = 0.75) {
    return new Promise((resolve) => {
        if (!file.type || !file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
                    else { width = Math.round(width * maxDim / height); height = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob || blob.size >= file.size) { resolve(file); return; }
                    resolve(new File([blob], file.name.replace(/\.(png|jpe?g|webp)$/i, '.jpg'), { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
let ffmpegInstance = null, ffmpegLoadPromise = null, ffmpegLibsPromise = null;
function loadFFmpegLibs() {
    if (window.FFmpegWASM && window.FFmpegUtil) return Promise.resolve();
    if (!ffmpegLibsPromise) {
        ffmpegLibsPromise = Promise.all([
            loadExternalScriptOnce('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js'),
            loadExternalScriptOnce('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js')
        ]);
    }
    return ffmpegLibsPromise;
}
function loadExternalScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load: ' + src));
        document.body.appendChild(s);
    });
}
async function getFFmpeg() {
    if (ffmpegInstance) return ffmpegInstance;
    if (!ffmpegLoadPromise) {
        ffmpegLoadPromise = (async () => {
            await loadFFmpegLibs();
            const { FFmpeg } = FFmpegWASM;
            const { toBlobURL } = FFmpegUtil;
            const ffmpeg = new FFmpeg();
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            ffmpegInstance = ffmpeg;
            return ffmpeg;
        })();
    }
    return ffmpegLoadPromise;
}
async function compressVideoFile(file, onProgress, hdMode) {
    if (file.size < 2.5 * 1024 * 1024) return file;
    try {
        const ffmpeg = await getFFmpeg();
        const { fetchFile } = FFmpegUtil;
        const stamp = Date.now();
        const inputName = 'in_' + stamp + (file.name.match(/\.\w+$/)?.[0] || '.mp4');
        const outputName = 'out_' + stamp + '.mp4';
        const progressHandler = ({ progress }) => { if (onProgress) onProgress(Math.max(0, Math.min(99, Math.round(progress * 100)))); };
        ffmpeg.on('progress', progressHandler);
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        const maxDim = hdMode ? 1080 : 720;
        const crf = hdMode ? 22 : 28;
        await ffmpeg.exec([
            '-i', inputName,
            '-vf', `scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease`,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
            '-c:a', 'aac', '-b:a', hdMode ? '160k' : '96k',
            '-movflags', '+faststart',
            outputName
        ]);
        ffmpeg.off('progress', progressHandler);
        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
        if (!blob.size || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' });
    } catch (err) {
        console.error('Video compression error, ana amfani da fayil na asali:', err);
        return file;
    }
}
async function xhrUploadFile(file, roomId, onProgress) {
    const token = await firebase.auth().currentUser.getIdToken();
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'chatMedia');
        formData.append('username', roomId);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://oryzon-backend-ed1q.onrender.com/upload');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        };
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve({ url: data.url, key: data.key });
                else reject(new Error(data.error || 'Upload failed'));
            } catch (e) { reject(new Error('Amsa mara inganci daga server')); }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}
function mu_toast(msg, icon) {
    if (typeof showToast === 'function') showToast(msg, icon);
    else console.log(msg);
}
async function uploadAndSendMedia(file, kind, caption, options) {
    options = options || {};
    const hdMode = !!options.hd;
    const ad = window.mediaUploadAdapter;
    const pend = (kind === 'image' && ad.addPending) ? ad.addPending({ localUrl: URL.createObjectURL(file), text: caption || '' }) : null;
    if (!pend) mu_toast('Uploading...', 'fa-cloud-arrow-up');
    try {
        let uploadFile = file;
        if (kind === 'image') { if (!options.precompressed) uploadFile = hdMode ? await compressImageFile(uploadFile, 2560, 0.9) : await compressImageFile(uploadFile); }
        else if (kind === 'video') uploadFile = await compressVideoFile(uploadFile, () => {}, hdMode);
        const uploaded = await xhrUploadFile(uploadFile, ad.roomId(), () => {});
        const payload = kind === 'video' ? { video: uploaded.url, text: caption || '' } : { image: uploaded.url, text: caption || '' };
        if (options.viewOnce) payload.viewOnce = true;
        if (pend) payload.clientId = pend.id;
        await ad.send(payload);
        if (pend) pend.sent(); else mu_toast('Sent', 'fa-check');
    } catch (err) {
        console.error('Media upload error:', err);
        if (pend) pend.fail(); else mu_toast('Upload failed — try again', 'fa-triangle-exclamation');
    }
}
let pendingCaptionFile = null, pendingCaptionKind = null, captionModeActive = false, savedDraftText = '';
let capCanvas = null, capRotation = 0, capHdMode = false;
let capVideoEl = null, capCropMode = false, capVideoCrop = null, capDrawMode = false;
function openCaptionModal(file, kind) { stageMedia(file, kind); }
let stagedPreviewUrl = null, stagedPrep = null, prepToken = 0, viewOnceOn = false;
let voiceRec = null, voiceStream = null, voiceChunks = [], voiceHoldTimer = null, voicePressing = false, voiceActive = false, voiceReleaseAt = 0;
const VO_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5" stroke-dasharray="3 3"/><text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">1</text></svg>';
const MIC_SVG = '<svg class="ico-mic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="2.4"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
function canvasPreview(cv, max) {
    const sc = Math.min(1, max / Math.max(cv.width, cv.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cv.width * sc)); c.height = Math.max(1, Math.round(cv.height * sc));
    c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
}
async function imageToUploadFile(file, cv, hd) {
    if (!cv && file.type === 'image/gif') return file;
    const maxDim = hd ? 2560 : 1280, q = hd ? 0.9 : 0.72;
    let drawable = cv, w, h;
    if (cv) { w = cv.width; h = cv.height; }
    else {
        drawable = window.createImageBitmap ? await createImageBitmap(file) : await new Promise((res, rej) => {
            const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file);
        });
        w = drawable.width || drawable.naturalWidth; h = drawable.height || drawable.naturalHeight;
    }
    const sc = Math.min(1, maxDim / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * sc); c.height = Math.round(h * sc);
    c.getContext('2d').drawImage(drawable, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
}
function startPrep() {
    prepToken++;
    stagedPrep = null;
    if (pendingCaptionKind !== 'image' || !pendingCaptionFile) return;
    const file = pendingCaptionFile, cv = capCanvas, hd = capHdMode;
    const p = (async () => {
        const f = await imageToUploadFile(file, cv, hd);
        return await xhrUploadFile(f, window.mediaUploadAdapter.roomId(), () => {});
    })();
    p.catch(() => {});
    stagedPrep = { token: prepToken, hd: hd, promise: p };
}
function ensureStagedChip() {
    const pill = window.mediaUploadAdapter.inputEl().closest('.composer-msg-pill');
    const st = document.getElementById('sendTrigger');
    if (st && !st.querySelector('.ico-mic')) st.insertAdjacentHTML('beforeend', MIC_SVG);
    if (!document.getElementById('viewOnceBtn')) {
        const vo = document.createElement('div');
        vo.id = 'viewOnceBtn';
        vo.innerHTML = VO_SVG;
        vo.addEventListener('click', toggleViewOnce);
        pill.insertBefore(vo, st);
    }
    let chip = document.getElementById('stagedChip');
    if (chip) return chip;
    chip = document.createElement('div');
    chip.id = 'stagedChip';
    chip.innerHTML = '<div class="staged-thumb"></div><i class="fa-solid fa-pen staged-pen"></i><span class="staged-x"><i class="fa-solid fa-xmark"></i></span>';
    chip.addEventListener('click', openEditorOverlay);
    chip.querySelector('.staged-x').addEventListener('click', (e) => { e.stopPropagation(); discardStaged(); });
    pill.insertBefore(chip, pill.firstChild);
    return chip;
}
function mu_centerToast(msg) {
    let t = document.getElementById('muCenterToast');
    if (!t) { t = document.createElement('div'); t.id = 'muCenterToast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1600);
}
function toggleViewOnce() {
    viewOnceOn = !viewOnceOn;
    const b = document.getElementById('viewOnceBtn');
    if (b) b.classList.toggle('on', viewOnceOn);
    mu_centerToast(viewOnceOn ? (pendingCaptionKind === 'video' ? 'Video' : 'Photo') + ' set to view once' : 'View once turned off');
}
function syncStagedUi() {
    const pill = window.mediaUploadAdapter.inputEl().closest('.composer-msg-pill');
    if (!pill || !pill.classList.contains('staged')) return;
    pill.classList.toggle('has-text', window.mediaUploadAdapter.inputEl().value.trim().length > 0);
    pill.classList.toggle('staged-video', pendingCaptionKind === 'video');
}
function stagedMicMode() {
    const pill = window.mediaUploadAdapter.inputEl().closest('.composer-msg-pill');
   return false; // mic-in-send-position removed: the send button always stays 
}
function setChipThumb() {
    const chip = ensureStagedChip();
    const t = chip.querySelector('.staged-thumb');
    t.innerHTML = '';
    let el;
    if (pendingCaptionKind === 'video') { el = document.createElement('video'); el.src = stagedPreviewUrl + '#t=0.1'; el.muted = true; el.playsInline = true; el.preload = 'metadata'; }
    else { el = document.createElement('img'); el.src = stagedPreviewUrl; }
    t.appendChild(el);
    chip.closest('.composer-msg-pill').classList.add('staged');
}
function stageMedia(file, kind) {
    pendingCaptionFile = file; pendingCaptionKind = kind; capRotation = 0; capCanvas = null; capVideoEl = null;
    stagedPreviewUrl = URL.createObjectURL(file);
    const msgInput = window.mediaUploadAdapter.inputEl();
    if (!captionModeActive) savedDraftText = msgInput.value;
    msgInput.value = '';
    msgInput.placeholder = 'Add a caption…';
    msgInput.dispatchEvent(new Event('input', { bubbles: true }));
    captionModeActive = true;
    viewOnceOn = false;
    setChipThumb();
    const vb = document.getElementById('viewOnceBtn'); if (vb) vb.classList.remove('on');
    syncStagedUi();
    startPrep();
}
function openEditorOverlay() {
    const ov = document.getElementById('captionOverlay');
    if (!pendingCaptionFile || ov.classList.contains('show')) return;
    prepToken++; stagedPrep = null;
    const area = document.getElementById('captionPreviewArea');
    area.innerHTML = '';
    ov.classList.add('show');
    if (pendingCaptionKind === 'image') {
        if (capCanvas) { area.appendChild(capCanvas); }
        else {
            const img = new Image();
            img.onload = () => {
                capCanvas = document.createElement('canvas');
                capCanvas.width = img.naturalWidth; capCanvas.height = img.naturalHeight;
                capCanvas.getContext('2d').drawImage(img, 0, 0);
                area.innerHTML = ''; area.appendChild(capCanvas);
            };
            img.src = URL.createObjectURL(pendingCaptionFile);
        }
    } else {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(pendingCaptionFile);
        video.muted = true; video.autoplay = true; video.loop = true; video.playsInline = true;
        area.appendChild(video);
        capVideoEl = video;
    }
    document.getElementById('captionRecipientPill').textContent = window.mediaUploadAdapter.recipientLabel();
}
function closeEditorOverlay() {
    if (capCropMode) cleanupAllSubModes();
    document.getElementById('captionOverlay').classList.remove('show');
    if (capCanvas) { stagedPreviewUrl = canvasPreview(capCanvas, 480); setChipThumb(); }
    startPrep();
}
function exitCaptionMode() {
    captionModeActive = false;
    const msgInput = window.mediaUploadAdapter.inputEl();
    msgInput.placeholder = 'Message...';
    msgInput.value = savedDraftText;
    msgInput.dispatchEvent(new Event('input', { bubbles: true }));
}
function clearStaged() {
    prepToken++; stagedPrep = null; viewOnceOn = false;
    if (voiceActive) endStagedVoice(false);
    if (capCropMode) cleanupAllSubModes();
    document.getElementById('discardDialogBackdrop').classList.remove('show');
    document.getElementById('captionOverlay').classList.remove('show');
    document.getElementById('captionPreviewArea').innerHTML = '';
    const chip = document.getElementById('stagedChip');
    if (chip) { chip.closest('.composer-msg-pill').classList.remove('staged', 'has-text', 'staged-video'); chip.remove(); }
    const vb2 = document.getElementById('viewOnceBtn'); if (vb2) vb2.classList.remove('on');
    pendingCaptionFile = null; pendingCaptionKind = null; capCanvas = null; capVideoEl = null; capCropMode = false;
    exitCaptionMode();
    const gi = document.getElementById('galleryInput'); if (gi) gi.value = '';
}
function discardStaged() { clearStaged(); }
function confirmDiscardPhoto() { closeEditorOverlay(); }
function hideDiscardDialog() { document.getElementById('discardDialogBackdrop').classList.remove('show'); }
function closeCaptionModal() { discardStaged(); }
async function sendImageFast(uploadPromise, previewUrl, caption, opts) {
    opts = opts || {};
    const ad = window.mediaUploadAdapter;
    const pend = ad.addPending ? ad.addPending({ localUrl: previewUrl, text: caption, viewOnce: !!opts.viewOnce }) : null;
    try {
        const uploaded = await uploadPromise;
        const payload = { image: uploaded.url, text: caption || '' };
        if (opts.voicePromise) { const v = await opts.voicePromise; payload.voice = { duration: v.duration, url: v.url }; }
        if (opts.viewOnce) payload.viewOnce = true;
        if (pend) payload.clientId = pend.id;
        await ad.send(payload);
        if (pend) pend.sent(); else mu_toast('Sent', 'fa-check');
    } catch (err) {
        console.error('Media upload error:', err);
        if (pend) pend.fail(); else mu_toast('Upload failed — try again', 'fa-triangle-exclamation');
    }
}
async function confirmCaptionSend() {
    if (!pendingCaptionFile) return;
    if (voiceReleaseAt && Date.now() - voiceReleaseAt < 700) return;
    const caption = window.mediaUploadAdapter.inputEl().value.trim();
    const file = pendingCaptionFile, kind = pendingCaptionKind, hd = capHdMode;
    const preview = stagedPreviewUrl, vo = viewOnceOn;
    if (kind === 'image') {
        if (!stagedPrep || stagedPrep.hd !== hd) startPrep();
        const prep = stagedPrep;
        clearStaged();
        sendImageFast(prep.promise, preview, caption, { viewOnce: vo });
        return;
    }
    clearStaged();
    uploadAndSendMedia(file, kind, caption, { hd, viewOnce: vo });
}
async function beginStagedVoice() {
    if (!stagedMicMode() || voiceActive) return;
    voiceActive = true;
    try { voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { voiceActive = false; mu_toast('Microphone permission needed', 'fa-microphone-slash'); return; }
    if (!voicePressing) { voiceStream.getTracks().forEach((t) => t.stop()); voiceStream = null; voiceActive = false; return; }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mime = (window.MediaRecorder && types.find((t) => MediaRecorder.isTypeSupported(t))) || '';
    try { voiceRec = new MediaRecorder(voiceStream, mime ? { mimeType: mime } : undefined); }
    catch (e) { voiceStream.getTracks().forEach((t) => t.stop()); voiceStream = null; voiceActive = false; mu_toast('Voice recording not supported here', 'fa-microphone-slash'); return; }
    voiceChunks = [];
    voiceRec.ondataavailable = (e) => { if (e.data && e.data.size) voiceChunks.push(e.data); };
    voiceRec.start();
    if (typeof startVoiceRecording === 'function') startVoiceRecording();
}
function endStagedVoice(send) {
    clearTimeout(voiceHoldTimer);
    voicePressing = false;
    voiceReleaseAt = Date.now();
    if (!voiceActive || !voiceRec) return;
    const rec = voiceRec; voiceRec = null;
    const secs = (typeof recSeconds === 'number') ? recSeconds : 0;
    const dur = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    rec.onstop = () => {
        if (voiceStream) voiceStream.getTracks().forEach((t) => t.stop());
        voiceStream = null; voiceActive = false;
        if (typeof stopVoiceRecording === 'function') stopVoiceRecording(false);
        if (!send) return;
        if (secs < 1) { mu_toast('Hold to record, release to send', 'fa-microphone'); return; }
        sendStagedWithVoice(new Blob(voiceChunks, { type: rec.mimeType || 'audio/webm' }), dur);
    };
    try { rec.stop(); } catch (e) { rec.onstop(); }
}
function sendStagedWithVoice(blob, dur) {
    if (!pendingCaptionFile || pendingCaptionKind !== 'image') return;
    const hd = capHdMode;
    if (!stagedPrep || stagedPrep.hd !== hd) startPrep();
    const prep = stagedPrep, preview = stagedPreviewUrl, vo = viewOnceOn;
    const ext = /mp4/.test(blob.type) ? 'm4a' : 'webm';
    const voiceP = xhrUploadFile(new File([blob], 'voice.' + ext, { type: blob.type }), window.mediaUploadAdapter.roomId(), () => {})
        .then((r) => ({ url: r.url, duration: dur }));
    voiceP.catch(() => {});
    clearStaged();
    sendImageFast(prep.promise, preview, '', { voicePromise: voiceP, viewOnce: vo });
}
function toggleHdMode() {
    capHdMode = !capHdMode;
    document.getElementById('hdToggleBtn').classList.toggle('active', capHdMode);
}
function rotateCaptionMedia() {
    if (!capCanvas) { mu_toast('Rotate is only available for photos for now', 'fa-circle-info'); return; }
    capRotation = (capRotation + 90) % 360;
    const c = document.createElement('canvas');
    c.width = capCanvas.height; c.height = capCanvas.width;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(90 * Math.PI / 180);
    ctx.drawImage(capCanvas, -capCanvas.width / 2, -capCanvas.height / 2);
    document.getElementById('captionPreviewArea').innerHTML = '';
    document.getElementById('captionPreviewArea').appendChild(c);
    capCanvas = c;
}
// ── Fullscreen sub-mode helper: yayin crop/draw, ana ɓoye chat chrome
// (top icons na caption da ainihin typing bar) — suna dawowa ne kawai bayan
// an fita daga sub-mode din. ──
function enterFullscreenSubMode() {
    document.querySelector('.dock-container').style.display = 'none';
    document.getElementById('captionTopBar').style.display = 'none';
    document.getElementById('captionRecipientPill').style.display = 'none';
    document.getElementById('captionOverlay').classList.add('cropping');
}
function exitFullscreenSubMode() {
    document.querySelector('.dock-container').style.display = 'flex';
    document.getElementById('captionTopBar').style.display = 'flex';
    document.getElementById('captionRecipientPill').style.display = 'block';
    document.getElementById('captionOverlay').classList.remove('cropping');
}
function cleanupAllSubModes() {
    const box = document.getElementById('cropBox'); if (box) { if (box._cleanup) box._cleanup(); box.remove(); }
    const cbar = document.getElementById('cropBottomBar'); if (cbar) cbar.remove();
    capCropMode = false;
    const cb = document.getElementById('cropBtnCap'); if (cb) cb.classList.remove('active');
    exitFullscreenSubMode();
}
// ── CROP — fullscreen, kamar WhatsApp/native: dukkan kusurwoyi HUDU suna
// aiki (ba guda daya kawai ba), Cancel/Rotate/Done duk a kasa. Hoto: ana
// yankewa nan take (canvas). Bidiyo: ana ajiye rect, ffmpeg ke yankewa a
// lokacin turawa (daban — ba a kwafo bakeVideoEdits a wannan zagayen ba). ──
function toggleCropMode() {
    if (capCropMode) return;
    const mediaEl = capCanvas || capVideoEl;
    if (!mediaEl) return;
    capCropMode = true;
    document.getElementById('cropBtnCap').classList.add('active');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    enterFullscreenSubMode();
    setTimeout(() => { if (capCropMode) buildCropUI(mediaEl); }, 350);
}
window.addEventListener('resize', function () {
    if (!capCropMode) return;
    clearTimeout(window._capCropResizeT);
    window._capCropResizeT = setTimeout(function () {
        const m = capCanvas || capVideoEl;
        if (m && document.getElementById('cropBox')) buildCropUI(m);
    }, 150);
});
function buildCropUI(mediaEl) {
    const area = document.getElementById('captionPreviewArea');
    const oldBox = document.getElementById('cropBox');
    if (oldBox) { if (oldBox._cleanup) oldBox._cleanup(); oldBox.remove(); }
    const rect = mediaEl.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    const box = document.createElement('div');
    box.id = 'cropBox';
    const RATIO = 4 / 5;
    let w = rect.width, h = rect.height;
    if (w / h > RATIO) w = h * RATIO; else h = w / RATIO;
    const left = (rect.left - areaRect.left) + (rect.width - w) / 2;
    const top = (rect.top - areaRect.top) + (rect.height - h) / 2;
    box.style.left = left + 'px'; box.style.top = top + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    box.innerHTML = `<div class="crop-grid"></div>
        <div class="crop-edge ce-top"></div><div class="crop-edge ce-bottom"></div>
        <div class="crop-edge ce-left"></div><div class="crop-edge ce-right"></div>
        <div class="crop-handle ch-tl"></div><div class="crop-handle ch-tr"></div>
        <div class="crop-handle ch-bl"></div><div class="crop-handle ch-br"></div>`;
    area.appendChild(box);
    if (!document.getElementById('cropBottomBar')) {
        const bar = document.createElement('div');
        bar.id = 'cropBottomBar';
        bar.innerHTML = `
            <span class="crop-text-btn" onclick="cancelCropMode()">Cancel</span>
            <div class="cap-icon-btn" onclick="rotateInCropMode()"><i class="fa-solid fa-arrow-rotate-left"></i></div>
            <span class="crop-text-btn" onclick="doneCropMode()">Done</span>`;
        document.getElementById('captionOverlay').appendChild(bar);
    }
    attachCropDragHandlers(box, mediaEl);
}
function rotateInCropMode() {
    rotateCaptionMedia();
    requestAnimationFrame(() => requestAnimationFrame(() => buildCropUI(capCanvas || capVideoEl)));
}
function attachCropDragHandlers(box, mediaEl) {
    let mode = null, corner = null, startX = 0, startY = 0, startBox = null;
    let pendingGeom = null, rafScheduled = false;
    const MIN = 40;
    const bounds = () => mediaEl.getBoundingClientRect();
    const areaBounds = () => document.getElementById('captionPreviewArea').getBoundingClientRect();
    const pt = (e) => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
    const curBox = () => ({ left: parseFloat(box.style.left), top: parseFloat(box.style.top), w: parseFloat(box.style.width), h: parseFloat(box.style.height) });
    const scheduleApply = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            if (!pendingGeom) return;
            box.style.left = pendingGeom.left + 'px'; box.style.top = pendingGeom.top + 'px';
            box.style.width = pendingGeom.w + 'px'; box.style.height = pendingGeom.h + 'px';
        });
    };
    const onMove = (e) => {
        if (!mode) return;
        e.preventDefault();
        const p = pt(e);
        const dx = p.x - startX, dy = p.y - startY;
        const mb = bounds(), ab = areaBounds();
        const minX = mb.left - ab.left, minY = mb.top - ab.top;
        const maxX = minX + mb.width, maxY = minY + mb.height;
        let { left, top, w, h } = startBox;
        if (mode === 'move') {
            left = Math.max(minX, Math.min(startBox.left + dx, maxX - w));
            top = Math.max(minY, Math.min(startBox.top + dy, maxY - h));
        } else if (mode === 'resize') {
            if (corner === 'br') {
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
            } else if (corner === 'tl') {
                const nl = Math.max(minX, startBox.left + dx), nt = Math.max(minY, startBox.top + dy);
                const rw = startBox.left + startBox.w - nl, rh = startBox.top + startBox.h - nt;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'tr') {
                const nt = Math.max(minY, startBox.top + dy);
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
                const rh = startBox.top + startBox.h - nt;
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'bl') {
                const nl = Math.max(minX, startBox.left + dx);
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
                const rw = startBox.left + startBox.w - nl;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
            }
        } else if (mode === 'edge') {
            if (corner === 'top') {
                const nt = Math.max(minY, startBox.top + dy);
                const rh = startBox.top + startBox.h - nt;
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'bottom') {
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
            } else if (corner === 'left') {
                const nl = Math.max(minX, startBox.left + dx);
                const rw = startBox.left + startBox.w - nl;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
            } else if (corner === 'right') {
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
            }
        }
        pendingGeom = { left, top, w, h };
        scheduleApply();
    };
    const onEnd = () => { mode = null; corner = null; };
    const startMove = (e) => { mode = 'move'; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };
    const startResize = (c) => (e) => { e.stopPropagation(); mode = 'resize'; corner = c; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };
    const startEdge = (edgeName) => (e) => { e.stopPropagation(); mode = 'edge'; corner = edgeName; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };
    box.addEventListener('mousedown', startMove);
    box.addEventListener('touchstart', startMove, { passive: true });
    ['tl', 'tr', 'bl', 'br'].forEach(c => {
        const h = box.querySelector('.ch-' + c);
        h.addEventListener('mousedown', startResize(c));
        h.addEventListener('touchstart', startResize(c), { passive: false });
    });
    [['top', 'ce-top'], ['bottom', 'ce-bottom'], ['left', 'ce-left'], ['right', 'ce-right']].forEach(([name, cls]) => {
        const el = box.querySelector('.' + cls);
        el.addEventListener('mousedown', startEdge(name));
        el.addEventListener('touchstart', startEdge(name), { passive: false });
    });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    box._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
    };
}
function cancelCropMode() {
    capCropMode = false;
    document.getElementById('cropBtnCap').classList.remove('active');
    const box = document.getElementById('cropBox');
    if (box) { if (box._cleanup) box._cleanup(); box.remove(); }
    const bar = document.getElementById('cropBottomBar');
    if (bar) bar.remove();
    exitFullscreenSubMode();
}
function doneCropMode() {
    const box = document.getElementById('cropBox');
    const mediaEl = capCanvas || capVideoEl;
    if (!box || !mediaEl) { cancelCropMode(); return; }
    const mb = mediaEl.getBoundingClientRect();
    const bb = box.getBoundingClientRect();
    const nativeW = capCanvas ? capCanvas.width : capVideoEl.videoWidth;
    const nativeH = capCanvas ? capCanvas.height : capVideoEl.videoHeight;
    const scaleX = nativeW / mb.width, scaleY = nativeH / mb.height;
    const cx = Math.max(0, (bb.left - mb.left) * scaleX);
    const cy = Math.max(0, (bb.top - mb.top) * scaleY);
    const cw = Math.min(bb.width * scaleX, nativeW - cx);
    const ch = Math.min(bb.height * scaleY, nativeH - cy);
    if (capCanvas) {
        const cropped = document.createElement('canvas');
        cropped.width = cw; cropped.height = ch;
        cropped.getContext('2d').drawImage(capCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
        capCanvas = cropped;
        const area = document.getElementById('captionPreviewArea');
        cancelCropMode();
        area.innerHTML = '';
        area.appendChild(capCanvas);
        if (typeof attachCapDrawHandlers === 'function') attachCapDrawHandlers(capCanvas, () => capCanvas);
        return;
    }
    capVideoCrop = { x: cx, y: cy, w: cw, h: ch };
    cancelCropMode();
}
function startTextOverlay() { mu_toast('Add text — coming soon', 'fa-circle-info'); }
function toggleStickerPicker() { mu_toast('Stickers — coming soon', 'fa-circle-info'); }
function toggleDrawMode() { mu_toast('Draw — coming soon', 'fa-circle-info'); }
function downloadCaptionMedia() {
    if (!pendingCaptionFile) return;
    const a = document.createElement('a');
    a.href = capCanvas ? capCanvas.toDataURL('image/jpeg', 0.95) : URL.createObjectURL(pendingCaptionFile);
    a.download = pendingCaptionKind === 'video' ? 'video.mp4' : 'photo.jpg';
    document.body.appendChild(a); a.click(); a.remove();
}

function initMediaUpload() {
    const _ov = document.getElementById('captionOverlay');
    const _dock = document.querySelector('.dock-container');
    if (_ov && _dock && _dock.contains(_ov)) _dock.parentNode.insertBefore(_ov, _dock);
    const gi = document.getElementById('galleryInput');
    if (gi && !gi.dataset.wired) {
        gi.dataset.wired = '1';
        gi.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            openCaptionModal(file, file.type.startsWith('video/') ? 'video' : 'image');
        });
    }
    const di = document.getElementById('dockInput');
    if (di && !di.dataset.muWired) {
        di.dataset.muWired = '1';
        di.addEventListener('input', syncStagedUi);
    }
    const st = document.getElementById('sendTrigger');
    if (st && !st.dataset.micWired) {
        st.dataset.micWired = '1';
        let sx = 0;
        st.addEventListener('pointerdown', (e) => {
            if (!stagedMicMode()) return;
            voicePressing = true; sx = e.clientX;
            try { st.setPointerCapture(e.pointerId); } catch (err) {}
            clearTimeout(voiceHoldTimer);
            voiceHoldTimer = setTimeout(() => { if (voicePressing) beginStagedVoice(); }, 300);
        });
        const up = (e) => {
            if (!voicePressing) return;
            if (voiceActive) endStagedVoice(e.type !== 'pointercancel' && !(sx - e.clientX > 80));
            else { voicePressing = false; clearTimeout(voiceHoldTimer); }
        };
        st.addEventListener('pointerup', up);
        st.addEventListener('pointercancel', up);
        st.addEventListener('contextmenu', (e) => { if (stagedMicMode() || voiceActive) e.preventDefault(); });
    }
}
