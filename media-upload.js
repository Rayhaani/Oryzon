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
let capVideoOverlay = null;
let capDrawing = false;
let capLastPt = null;
let capOverlayUsed = false;
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
    const host = document.getElementById('page-content') || document.body;
    let t = document.getElementById('muCenterToast');
    if (!t || t.parentElement !== host) {
        if (t) t.remove();
        t = document.createElement('div');
        t.id = 'muCenterToast';
        t.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(235,235,240,0.96);color:#111;font:500 15px Inter,sans-serif;padding:14px 26px;border-radius:999px;z-index:100050;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity 0.2s;';
        host.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 1600);
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
        if (capCanvas) { area.appendChild(capCanvas); attachCapDrawHandlers(capCanvas, () => capCanvas); }
        else {
            const img = new Image();
            img.onload = () => {
                capCanvas = document.createElement('canvas');
                capCanvas.width = img.naturalWidth; capCanvas.height = img.naturalHeight;
                capCanvas.getContext('2d').drawImage(img, 0, 0);
                area.innerHTML = ''; area.appendChild(capCanvas);
                attachCapDrawHandlers(capCanvas, () => capCanvas);
            };
            img.src = URL.createObjectURL(pendingCaptionFile);
        }
    } else {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(pendingCaptionFile);
        video.muted = true; video.autoplay = true; video.loop = true; video.playsInline = true;
        video.style.cssText = 'max-width:100%;max-height:100%;display:block;';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;max-width:100%;max-height:100%;display:flex;';
        wrap.appendChild(video);
        area.appendChild(wrap);
        capVideoEl = video;
        capOverlayUsed = false; capVideoCrop = null;
        video.addEventListener('loadedmetadata', () => {
            capVideoOverlay = document.createElement('canvas');
            capVideoOverlay.width = video.videoWidth || 720;
            capVideoOverlay.height = video.videoHeight || 1280;
            capVideoOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
            wrap.appendChild(capVideoOverlay);
            attachCapDrawHandlers(capVideoOverlay, () => capVideoOverlay, true);
        });
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
    capVideoOverlay = null; capOverlayUsed = false; capVideoCrop = null;
    closeStickerPicker();
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
    if (kind === 'video' && (capRotation !== 0 || capOverlayUsed || capVideoCrop)) {
        mu_toast('Preparing video…', 'fa-film');
        let baked = null;
        try { baked = await bakeVideoEdits(file, capRotation, capOverlayUsed ? capVideoOverlay : null, capVideoCrop); }
        catch (e) { console.error('Video bake error, sending the original:', e); }
        clearStaged();
        uploadAndSendMedia(baked || file, kind, caption, { hd, viewOnce: vo });
        return;
    }
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
    if (capCanvas) {
        // HOTO — ana juyawa nan take ta hanyar sake zana pixels (babu bukatar ffmpeg).
        // Muna amfani da replaceChild (BA innerHTML='' ba) domin kada mu goge cropBox
        // (wanda ke zaune a wuri guda a cikin #captionPreviewArea) — wannan shine ainihin
        // dalilin "shaking" din da aka gani a baya: destroy+recreate na cropBox.
        const src = capCanvas;
        const rotated = document.createElement('canvas');
        rotated.width = src.height; rotated.height = src.width;
        const ctx = rotated.getContext('2d');
        ctx.translate(rotated.width / 2, rotated.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(src, -src.width / 2, -src.height / 2);
        if (src.parentNode) src.parentNode.replaceChild(rotated, src);
        else document.getElementById('captionPreviewArea').appendChild(rotated);
        capCanvas = rotated;
        attachCapDrawHandlers(capCanvas, () => capCanvas);
    } else if (capVideoEl) {
        // BIDIYO — mu juya PREVIEW ɗin kawai a nan (CSS) domin mai amfani ya gani nan take;
        // ainihin juyawar bidiyon (ffmpeg) yana faruwa ne kawai a lokacin turawa (confirmCaptionSend).
        capRotation = (capRotation + 90) % 360;
        const wrap = capVideoEl.parentElement;
        wrap.style.transform = `rotate(${capRotation}deg)`;
        wrap.style.transformOrigin = 'center center';
    }
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
    const dbar = document.getElementById('drawToolBar'); if (dbar) dbar.remove();
    const sw = document.getElementById('colorSliderWrap'); if (sw) sw.remove();
    const tov = document.getElementById('textToolOverlay'); if (tov) tov.remove();
    capCropMode = false; capDrawMode = false;
    const cb = document.getElementById('cropBtnCap'); if (cb) cb.classList.remove('active');
    const db = document.getElementById('drawBtnCap'); if (db) db.classList.remove('active');
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
    if (capDrawMode) toggleDrawMode();
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
let capTextAlign = 'center';   // 'left' | 'center' | 'right'
let capTextBoxStyle = 0;       // 0=plain 1=solid-bg 2=outline 3=translucent-dark
let capTextPos = { x: 0.5, y: 0.5 }; // fraction dangane da girman AININHIN media (hoto/bidiyo)

// 8 presets guda daya-daya danna kai tsaye — daidai adadin da WhatsApp ke nunawa —
// kowanne yana hade da salon akwati (0-3) TARE da wani launi na musamman, don sauri.
// Color slider din yana nan ma don fine-tune bayan an zabi preset.
const TEXT_PRESETS = [
    { style: 0, color: '#ffffff' }, { style: 0, color: '#000000' },
    { style: 1, color: '#ffffff' }, { style: 1, color: '#000000' },
    { style: 1, color: '#ff3b30' }, { style: 1, color: '#33cc55' },
    { style: 3, color: '#ffffff' }, { style: 2, color: '#00e5ff' }
];
function startTextOverlay() {
    const target = capCanvas || capVideoOverlay;
    const mediaEl = capCanvas || capVideoEl;
    if (!target || !mediaEl) return;
    if (capDrawMode) toggleDrawMode();
    if (capCropMode) cancelCropMode();
    enterFullscreenSubMode();
    capTextAlign = 'center'; capTextBoxStyle = 0; capTextPos = { x: 0.5, y: 0.5 };

    const ov = document.createElement('div');
    ov.id = 'textToolOverlay';
    ov.innerHTML = `
        <div id="textToolTop">
            <span class="crop-text-btn" onclick="cancelTextTool()">Cancel</span>
            <div style="display:flex;gap:14px;">
                <div class="cap-icon-btn" onclick="cycleTextAlign()"><i class="fa-solid fa-align-center" id="textAlignIcon"></i></div>
                <div class="cap-icon-btn" onclick="cycleTextBoxStyle()">A+</div>
            </div>
            <span class="crop-text-btn" onclick="finishTextTool()">Done</span>
        </div>
        <div id="textToolDim"></div>
        <div id="textToolInputWrap">
            <div id="textToolInput" contenteditable="true" data-placeholder="Add text"></div>
        </div>
        <div id="textStyleRow"></div>`;
    document.getElementById('captionOverlay').appendChild(ov);
    const row = ov.querySelector('#textStyleRow');
    TEXT_PRESETS.forEach((p, i) => {
        const sw = document.createElement('div');
        sw.className = 'text-style-swatch';
        if (p.style === 1) { sw.style.background = p.color; sw.style.color = contrastColor(p.color); }
        else if (p.style === 2) { sw.style.background = 'transparent'; sw.style.border = `2px solid ${p.color}`; sw.style.color = p.color; }
        else if (p.style === 3) { sw.style.background = 'rgba(0,0,0,0.5)'; sw.style.color = p.color; }
        else { sw.style.background = 'rgba(255,255,255,0.08)'; sw.style.color = p.color; }
        sw.textContent = 'Aa';
        sw.onclick = () => {
            capTextBoxStyle = p.style; capDrawColor = p.color;
            const dot = document.getElementById('colorSliderDot'); if (dot) dot.style.background = p.color;
            applyLiveTextBoxStyle();
            row.querySelectorAll('.text-style-swatch').forEach(x => x.classList.remove('active'));
            sw.classList.add('active');
        };
        row.appendChild(sw);
    });
    applyTextBoxPosition();
    applyLiveTextBoxStyle();
    buildColorSlider();
    setupTextDrag(document.getElementById('textToolInputWrap'), document.getElementById('textToolInput'), mediaEl);
    setTimeout(() => document.getElementById('textToolInput').focus(), 80);
}
function applyTextBoxPosition() {
    const wrap = document.getElementById('textToolInputWrap');
    const mediaEl = capCanvas || capVideoEl;
    const ov = document.getElementById('textToolOverlay');
    if (!wrap || !mediaEl || !ov) return;
    const mb = mediaEl.getBoundingClientRect();
    const ob = ov.getBoundingClientRect();
    wrap.style.left = ((mb.left - ob.left) + capTextPos.x * mb.width) + 'px';
    wrap.style.top = ((mb.top - ob.top) + capTextPos.y * mb.height) + 'px';
}
function cycleTextAlign() {
    capTextAlign = capTextAlign === 'left' ? 'center' : capTextAlign === 'center' ? 'right' : 'left';
    const input = document.getElementById('textToolInput');
    if (input) input.style.textAlign = capTextAlign;
    const icon = document.getElementById('textAlignIcon');
    if (icon) icon.className = 'fa-solid ' + (capTextAlign === 'left' ? 'fa-align-left' : capTextAlign === 'right' ? 'fa-align-right' : 'fa-align-center');
    // Wannan yana matsar da AKWATIN kansa zuwa hagu/tsakiya/dama akan hoton (ba kawai
    // text-align cikin akwatin ba, wanda ba shi da tasiri a bayyane akan gajeren rubutu
    // guda layi) — kamar yadda aka bukata.
    capTextPos.x = capTextAlign === 'left' ? 0.22 : capTextAlign === 'right' ? 0.78 : 0.5;
    applyTextBoxPosition();
}
function cycleTextBoxStyle() {
    capTextBoxStyle = (capTextBoxStyle + 1) % 4;
    applyLiveTextBoxStyle();
}
// Salon akwati guda 4 — kawai AKWATIN da ke kewaye da rubutun ne ke canjawa (auto-width,
// BA fullscreen background ba) — wannan yake gyara bug din "page ya koma fari/baki".
function applyLiveTextBoxStyle() {
    const input = document.getElementById('textToolInput');
    if (!input) return;
    input.style.textAlign = capTextAlign;
    if (capTextBoxStyle === 1) { // Solid box
        input.style.background = capDrawColor; input.style.color = contrastColor(capDrawColor);
        input.style.borderRadius = '10px'; input.style.border = 'none'; input.style.textShadow = 'none';
    } else if (capTextBoxStyle === 2) { // Outline box
        input.style.background = 'transparent'; input.style.color = capDrawColor;
        input.style.borderRadius = '10px'; input.style.border = `2px solid ${capDrawColor}`; input.style.textShadow = 'none';
    } else if (capTextBoxStyle === 3) { // Translucent dark box
        input.style.background = 'rgba(0,0,0,0.5)'; input.style.color = capDrawColor;
        input.style.borderRadius = '10px'; input.style.border = 'none'; input.style.textShadow = 'none';
    } else { // Plain, babu akwati
        input.style.background = 'transparent'; input.style.color = capDrawColor;
        input.style.border = 'none'; input.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
    }
}
// Draggable: tap kadan (ba motsi ba) = fara rubutu; ja (drag) = motsa akwatin. rAF-throttle
// (kamar crop) domin akwatin ya kasance daidai girmansa yayin motsi — ba ya "girma/ragewa"
// kamar da, wanda ya faru ne saboda ana rubuta position akan KOWACE taɓawa event kai-tsaye.
function setupTextDrag(wrap, input, mediaEl) {
    let startX = 0, startY = 0, startFracX = 0, startFracY = 0, moved = false, dragging = false;
    let rafScheduled = false;
    const mRect = () => mediaEl.getBoundingClientRect();
    const pt = (e) => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
    const scheduleApply = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => { rafScheduled = false; applyTextBoxPosition(); });
    };
    const down = (e) => {
        moved = false; dragging = true;
        const p = pt(e); startX = p.x; startY = p.y;
        startFracX = capTextPos.x; startFracY = capTextPos.y;
    };
    const move = (e) => {
        if (!dragging) return;
        const p = pt(e);
        const dx = p.x - startX, dy = p.y - startY;
        if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
        if (!moved) return;
        e.preventDefault();
        const mb = mRect();
        capTextPos.x = Math.max(0.05, Math.min(0.95, startFracX + dx / mb.width));
        capTextPos.y = Math.max(0.05, Math.min(0.95, startFracY + dy / mb.height));
        scheduleApply();
    };
    const up = () => { dragging = false; if (!moved) input.focus(); };
    wrap.addEventListener('mousedown', down);
    wrap.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
}
function cancelTextTool() {
    const ov = document.getElementById('textToolOverlay');
    if (ov) ov.remove();
    removeColorSlider();
    exitFullscreenSubMode();
}
function finishTextTool() {
    const input = document.getElementById('textToolInput');
    const txt = input ? input.innerText.trim() : '';
    const target = capCanvas || capVideoOverlay;
    if (txt && target) {
        const ctx = target.getContext('2d');
        const fontSize = Math.round(target.width / 14);
        ctx.font = `700 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = capTextAlign; ctx.textBaseline = 'middle';
        const lines = txt.split('\n');
        const lineHeight = fontSize * 1.3;
        const totalH = lines.length * lineHeight;
        const cx = capTextPos.x * target.width, cy = capTextPos.y * target.height;
        lines.forEach((line, i) => {
            const ly = cy - totalH / 2 + lineHeight * i + lineHeight / 2;
            const m = ctx.measureText(line);
            let boxCenterX = cx;
            if (capTextAlign === 'left') boxCenterX = cx + m.width / 2;
            else if (capTextAlign === 'right') boxCenterX = cx - m.width / 2;
            const padX = fontSize * 0.35, padY = fontSize * 0.2;
            if (capTextBoxStyle === 1) {
                ctx.fillStyle = capDrawColor;
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.fill();
                ctx.fillStyle = contrastColor(capDrawColor);
            } else if (capTextBoxStyle === 2) {
                ctx.strokeStyle = capDrawColor; ctx.lineWidth = 3;
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.stroke();
                ctx.fillStyle = capDrawColor;
            } else if (capTextBoxStyle === 3) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.fill();
                ctx.fillStyle = capDrawColor;
            } else {
                ctx.lineWidth = fontSize / 12; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
                ctx.strokeText(line, boxCenterX, ly);
                ctx.fillStyle = capDrawColor;
            }
            ctx.fillText(line, boxCenterX, ly);
        });
        if (target === capVideoOverlay) capOverlayUsed = true;
    }
    const ov = document.getElementById('textToolOverlay');
    if (ov) ov.remove();
    removeColorSlider();
    exitFullscreenSubMode();
}
function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function contrastColor(colorStr) {
    let r, g, b;
    const rgbM = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(colorStr || '');
    if (rgbM) { r = +rgbM[1]; g = +rgbM[2]; b = +rgbM[3]; }
    else if (/^#[0-9a-fA-F]{6}$/.test(colorStr || '')) {
        const v = parseInt(colorStr.slice(1), 16);
        r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
    } else return '#000';
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#000' : '#fff';
}
function hexToRgbStr(hex) {
    const v = parseInt(hex.slice(1), 16);
    return `rgb(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255})`;
}

// ── Sticker: ƙaramin zaɓi na emoji, ana "stamp" a tsakiyar hoto/bidiyo ──
function toggleStickerPicker() {
    const existing = document.getElementById('stickerPicker');
    if (existing) { existing.remove(); return; }
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    const picker = document.createElement('div');
    picker.id = 'stickerPicker';
    picker.style.cssText = 'position:absolute;top:64px;left:50%;transform:translateX(-50%);background:#151515;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:8px 12px;display:flex;gap:10px;z-index:6;font-size:26px;';
    ['❤️', '😂', '🔥', '👍', '😮', '😢', '🎉', '⭐'].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.cursor = 'pointer';
        span.onclick = () => { stampSticker(emoji); closeStickerPicker(); };
        picker.appendChild(span);
    });
    document.getElementById('captionOverlay').appendChild(picker);
}
function closeStickerPicker() {
    const p = document.getElementById('stickerPicker');
    if (p) p.remove();
}
function stampSticker(emoji) {
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    const ctx = target.getContext('2d');
    const size = Math.round(target.width / 5);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, target.width / 2, target.height / 2);
    if (target === capVideoOverlay) capOverlayUsed = true;
}

// ── DRAW — fullscreen, kamar WhatsApp/native: zaɓin pen guda 4 (pen/marker/
// highlighter/eraser — eraser bidiyo kawai, babu shi ga hoto domin babu
// "layer" da za a share) + dogon rainbow color slider a gefen dama. ──
let capDrawColor = '#ff3b30';
let capDrawTool = 'pen';
function toggleDrawMode() {
    if (capDrawMode) {
        capDrawMode = false;
        document.getElementById('drawBtnCap').classList.remove('active');
        const bar = document.getElementById('drawToolBar'); if (bar) bar.remove();
        removeColorSlider();
        exitFullscreenSubMode();
        return;
    }
    if (capCropMode) cancelCropMode();
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    capDrawMode = true;
    document.getElementById('drawBtnCap').classList.add('active');
    enterFullscreenSubMode();
    buildDrawToolbar();
}
function buildDrawToolbar() {
    const isImg = !!capCanvas;
    const bar = document.createElement('div');
    bar.id = 'drawToolBar';
    bar.innerHTML = `
        <div id="drawToolTopRow"><span class="crop-text-btn" onclick="toggleDrawMode()">Done</span></div>
        <div id="drawBrushRow">
            <div class="brush-opt active" onclick="setDrawTool('pen', this)"><i class="fa-solid fa-pen" style="color:#fff;font-size:13px;"></i></div>
            <div class="brush-opt" onclick="setDrawTool('marker', this)"><i class="fa-solid fa-marker" style="color:#fff;font-size:13px;"></i></div>
            <div class="brush-opt" onclick="setDrawTool('highlighter', this)"><i class="fa-solid fa-highlighter" style="color:#fff;font-size:13px;"></i></div>
            ${isImg ? '' : '<div class="brush-opt" onclick="setDrawTool(\'eraser\', this)"><i class="fa-solid fa-eraser" style="color:#fff;font-size:13px;"></i></div>'}
        </div>`;
    document.getElementById('captionOverlay').appendChild(bar);
    capDrawTool = 'pen';
    buildColorSlider();
}
function setDrawTool(tool, el) {
    capDrawTool = tool;
    document.querySelectorAll('.brush-opt').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}
// ── Color slider (rainbow, vertical) — RABABBEN tsakanin draw mode DA text tool,
// wannan shine yake gyara "me yasa babu color slider a text tool" da aka bayar rahoto. ──
function buildColorSlider() {
    if (document.getElementById('colorSliderWrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'colorSliderWrap';
    wrap.innerHTML = `<div id="colorSlider"></div><div id="colorSliderDot" style="top:0;background:${capDrawColor};"></div>`;
    document.getElementById('captionOverlay').appendChild(wrap);
    attachColorSliderHandlers();
}
function removeColorSlider() {
    const sw = document.getElementById('colorSliderWrap');
    if (sw) sw.remove();
}
function attachColorSliderHandlers() {
    const wrap = document.getElementById('colorSliderWrap');
    const dot = document.getElementById('colorSliderDot');
    const pick = (e) => {
        const rect = wrap.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        let frac = (t.clientY - rect.top) / rect.height;
        frac = Math.max(0, Math.min(1, frac));
        capDrawColor = colorFromFraction(frac);
        dot.style.top = (frac * 100) + '%';
        dot.style.background = capDrawColor;
        if (document.getElementById('textToolOverlay')) applyLiveTextBoxStyle();
    };
    wrap.addEventListener('mousedown', (e) => {
        pick(e);
        const mv = (e2) => pick(e2);
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    wrap.addEventListener('touchstart', pick, { passive: true });
    wrap.addEventListener('touchmove', pick, { passive: true });
}
function colorFromFraction(frac) {
    const stops = [[0, '#ffffff'], [0.08, '#ff0000'], [0.22, '#ff9900'], [0.36, '#ffee00'], [0.5, '#33ff33'], [0.62, '#00e5ff'], [0.75, '#3366ff'], [0.88, '#a020f0'], [1, '#ff2fb0']];
    for (let i = 0; i < stops.length - 1; i++) {
        if (frac >= stops[i][0] && frac <= stops[i + 1][0]) {
            const t = (frac - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
            return lerpHex(stops[i][1], stops[i + 1][1], t);
        }
    }
    return stops[stops.length - 1][1];
}
function lerpHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
    const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
}
function capTargetPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
}
// getCanvas(): function domin mu koyaushe mu sami sabon reference (misali bayan rotate ya
// maye gurbin capCanvas da wani sabon canvas), isVideoOverlay: alama ta mark capOverlayUsed
function attachCapDrawHandlers(canvasEl, getCanvas, isVideoOverlay) {
    const start = (e) => {
        if (!capDrawMode) return;
        capDrawing = true;
        capLastPt = capTargetPoint(getCanvas(), e);
    };
    const move = (e) => {
        if (!capDrawMode || !capDrawing) return;
        e.preventDefault();
        const canvas = getCanvas();
        const pt = capTargetPoint(canvas, e);
        const ctx = canvas.getContext('2d');
        if (capDrawTool === 'eraser') {
            if (!isVideoOverlay) { capLastPt = pt; return; } // eraser baya aiki a hoto (babu transparent layer)
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = Math.max(10, canvas.width / 60);
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = capDrawColor;
            ctx.globalAlpha = capDrawTool === 'highlighter' ? 0.4 : 1;
            ctx.lineWidth = capDrawTool === 'pen' ? Math.max(4, canvas.width / 150) : Math.max(10, canvas.width / 60);
        }
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(capLastPt.x, capLastPt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        capLastPt = pt;
        if (isVideoOverlay) capOverlayUsed = true;
    };
    const end = () => { capDrawing = false; capLastPt = null; };
    canvasEl.addEventListener('mousedown', start);
    canvasEl.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvasEl.addEventListener('touchstart', start, { passive: true });
    canvasEl.addEventListener('touchmove', move, { passive: false });
    canvasEl.addEventListener('touchend', end);
}

async function bakeVideoEdits(file, rotation, overlayCanvas, cropRect) {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = FFmpegUtil;
    const stamp = Date.now();
    const inputName = 'edin_' + stamp + '.mp4';
    const outputName = 'edout_' + stamp + '.mp4';
    const overlayName = 'ovl_' + stamp + '.png';
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const filters = [];
    let lastLabel = '0:v';
    if (overlayCanvas) {
        const pngBlob = await new Promise((res) => overlayCanvas.toBlob(res, 'image/png'));
        await ffmpeg.writeFile(overlayName, await fetchFile(pngBlob));
        filters.push(`[${lastLabel}][1:v]overlay=0:0[ov]`);
        lastLabel = 'ov';
    }
    if (cropRect) {
        filters.push(`[${lastLabel}]crop=${Math.round(cropRect.w)}:${Math.round(cropRect.h)}:${Math.round(cropRect.x)}:${Math.round(cropRect.y)}[cr]`);
        lastLabel = 'cr';
    }
    if (rotation === 90) filters.push(`[${lastLabel}]transpose=1[rot]`);
    else if (rotation === 180) filters.push(`[${lastLabel}]transpose=1,transpose=1[rot]`);
    else if (rotation === 270) filters.push(`[${lastLabel}]transpose=2[rot]`);
    if (rotation !== 0) lastLabel = 'rot';

    const args = ['-i', inputName];
    if (overlayCanvas) args.push('-i', overlayName);
    args.push('-filter_complex', filters.join(';'), '-map', `[${lastLabel}]`, '-map', '0:a?', '-c:a', 'copy', outputName);

    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    if (overlayCanvas) await ffmpeg.deleteFile(overlayName).catch(() => {});
    return new File([blob], 'video.mp4', { type: 'video/mp4' });
}
function downloadCaptionMedia() {
    if (!pendingCaptionFile) return;
    const a = document.createElement('a');
    a.href = capCanvas ? capCanvas.toDataURL('image/jpeg', 0.95) : URL.createObjectURL(pendingCaptionFile);
    a.download = pendingCaptionKind === 'video' ? 'video.mp4' : 'photo.jpg';
    document.body.appendChild(a); a.click(); a.remove();
}

async function uploadAndSendMediaGroup(files) {
    const ad = window.mediaUploadAdapter;
    const pend = ad.addPending ? ad.addPending({ localUrls: files.map((f) => URL.createObjectURL(f)), text: '' }) : null;
    try {
        const uploaded = await Promise.all(files.map(async (f) => {
            const isVideo = f.type.startsWith('video');
            const up = isVideo ? f : await imageToUploadFile(f, null, false);
            const r = await xhrUploadFile(up, ad.roomId(), () => {});
            return { type: isVideo ? 'video' : 'image', mediaUrl: r.url, mimeType: up.type || f.type };
        }));
        const payload = { type: 'imageGroup', mediaArr: uploaded, text: '' };
        if (pend) payload.clientId = pend.id;
        await ad.send(payload);
        if (pend) pend.sent(); else mu_toast('Sent', 'fa-check');
    } catch (err) {
        console.error('Group media upload error:', err);
        if (pend) pend.fail(); else mu_toast('Upload failed — try again', 'fa-triangle-exclamation');
    }
}
function initMediaUpload() {
    const _ov = document.getElementById('captionOverlay');
    const _dock = document.querySelector('.dock-container');
    if (_ov && _dock && _dock.contains(_ov)) _dock.parentNode.insertBefore(_ov, _dock);
    const gi = document.getElementById('galleryInput');
    if (gi && !gi.dataset.wired) {
        gi.dataset.wired = '1';
        gi.multiple = true;
        gi.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) { e.target.value = ''; return; }
            if (files.length === 1 || captionModeActive) {
                openCaptionModal(files[0], files[0].type.startsWith('video') ? 'video' : 'image');
            } else {
                uploadAndSendMediaGroup(files);
            }
            e.target.value = '';
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
