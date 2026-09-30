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
    mu_toast('Uploading...', 'fa-cloud-arrow-up');
    try {
        let uploadFile = file;
        if (kind === 'image') uploadFile = hdMode ? await compressImageFile(uploadFile, 2560, 0.9) : await compressImageFile(uploadFile);
        else if (kind === 'video') uploadFile = await compressVideoFile(uploadFile, () => {}, hdMode);
        const uploaded = await xhrUploadFile(uploadFile, window.mediaUploadAdapter.roomId(), () => {});
        window.mediaUploadAdapter.send(kind === 'video' ? { video: uploaded.url, text: caption || '' } : { image: uploaded.url, text: caption || '' });
        mu_toast('Sent', 'fa-check');
    } catch (err) {
        console.error('Media upload error:', err);
        mu_toast('Upload failed — try again', 'fa-triangle-exclamation');
    }
}
let pendingCaptionFile = null, pendingCaptionKind = null, captionModeActive = false, savedDraftText = '';
let capCanvas = null, capRotation = 0, capHdMode = false;
function openCaptionModal(file, kind) {
    pendingCaptionFile = file; pendingCaptionKind = kind; capRotation = 0;
    const area = document.getElementById('captionPreviewArea');
    area.innerHTML = '';
    document.getElementById('captionOverlay').classList.add('show');
    if (kind === 'image') {
        const img = new Image();
        img.onload = () => {
            capCanvas = document.createElement('canvas');
            capCanvas.width = img.naturalWidth; capCanvas.height = img.naturalHeight;
            capCanvas.getContext('2d').drawImage(img, 0, 0);
            area.innerHTML = ''; area.appendChild(capCanvas);
        };
        img.src = URL.createObjectURL(file);
    } else {
        capCanvas = null;
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true; video.autoplay = true; video.loop = true; video.playsInline = true;
        area.innerHTML = ''; area.appendChild(video);
    }
    document.getElementById('captionRecipientPill').textContent = window.mediaUploadAdapter.recipientLabel();
    const msgInput = window.mediaUploadAdapter.inputEl();
    savedDraftText = msgInput.value;
    msgInput.value = '';
    msgInput.placeholder = 'Add a caption…';
    msgInput.dispatchEvent(new Event('input', { bubbles: true }));
    captionModeActive = true;
    setTimeout(() => msgInput.focus(), 50);
}
function exitCaptionMode() {
    captionModeActive = false;
    const msgInput = window.mediaUploadAdapter.inputEl();
    msgInput.placeholder = 'Message...';
    msgInput.value = savedDraftText;
    msgInput.dispatchEvent(new Event('input', { bubbles: true }));
}
function confirmDiscardPhoto() { document.getElementById('discardDialogBackdrop').classList.add('show'); }
function hideDiscardDialog() { document.getElementById('discardDialogBackdrop').classList.remove('show'); }
function closeCaptionModal() {
    document.getElementById('discardDialogBackdrop').classList.remove('show');
    document.getElementById('captionOverlay').classList.remove('show');
    document.getElementById('captionPreviewArea').innerHTML = '';
    pendingCaptionFile = null; pendingCaptionKind = null; capCanvas = null;
    exitCaptionMode();
    document.getElementById('galleryInput').value = '';
}
async function confirmCaptionSend() {
    if (!pendingCaptionFile) return;
    const caption = window.mediaUploadAdapter.inputEl().value.trim();
    const file = pendingCaptionFile, kind = pendingCaptionKind, hd = capHdMode;
    const finish = (f) => {
        document.getElementById('captionOverlay').classList.remove('show');
        document.getElementById('captionPreviewArea').innerHTML = '';
        pendingCaptionFile = null; pendingCaptionKind = null; capCanvas = null;
        exitCaptionMode();
        uploadAndSendMedia(f, kind, caption, { hd });
    };
    if (kind === 'image' && capCanvas) {
        capCanvas.toBlob((blob) => { finish(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.95);
        return;
    }
    finish(file);
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
function toggleCropMode() { mu_toast('Crop — coming soon', 'fa-circle-info'); }
function startTextOverlay() { mu_toast('Add text — coming soon', 'fa-circle-info'); }
function toggleStickerPicker() { mu_toast('Stickers — coming soon', 'fa-circle-info'); }
function toggleDrawMode() { mu_toast('Draw — coming soon', 'fa-circle-info'); }
function downloadCaptionMedia() { mu_toast('Download — coming soon', 'fa-circle-info'); }

function initMediaUpload() {
    const gi = document.getElementById('galleryInput');
    if (gi && !gi.dataset.wired) {
        gi.dataset.wired = '1';
        gi.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            openCaptionModal(file, file.type.startsWith('video/') ? 'video' : 'image');
        });
    }
}
