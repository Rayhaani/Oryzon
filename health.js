/* ============================================================
   health.js — extracted from health.html for SPA compatibility
   (see router.js header notes: this file is loaded by
   NexusRouter's PAGE_SCRIPTS entry for 'health.html', so it must
   stay free of top-level DOM access that assumed native page load
   ordering — all such access now runs from initHealthPage()).
   ============================================================ */

(function () {
    "use strict";

    const firebaseConfig = {
        apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
        authDomain: "oryzon-50ea4.firebaseapp.com",
        projectId: "oryzon-50ea4",
        storageBucket: "oryzon-50ea4.firebasestorage.app",
        messagingSenderId: "782106742622",
        appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
    };
    // Guarded: revisiting this page never re-triggers a script reload
    // (router.js loadScriptOnce), but this guard also protects against
    // the default app already being initialized by another page's
    // Firebase bundle.
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    window._authReadyPromise = new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });

    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
})();


        function showToast(msg) {
            const t = document.getElementById('nxToast');
            t.textContent = msg;
            t.classList.remove('hidden');
            clearTimeout(window._toastTimer);
            window._toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
        }

        function openNexusOverlay() {
            document.getElementById('nexusOverlay').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        function closeNexusOverlay() {
            document.getElementById('nexusOverlay').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        function pharmacyComingSoon() {
            const toast = document.getElementById('pharmacyToast');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3500);
        }

        function filterUnits(query) {
            const q = query.trim().toLowerCase();
            document.querySelectorAll('[data-search]').forEach(card => {
                const match = card.getAttribute('data-search').includes(q);
                card.style.display = (q === '' || match) ? '' : 'none';
            });
        }

        function findNearbyCare() {
            if (localStorage.getItem('nexusSkipTriageGate') === 'true') {
                proceedToNearbyCareMap();
                return;
            }
            document.getElementById('nexaTriageGateModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function chooseTriageGate(choice) {
            if (document.getElementById('nexaGateDontAskAgain').checked) {
                localStorage.setItem('nexusSkipTriageGate', 'true');
            }
            document.getElementById('nexaTriageGateModal').classList.add('hidden');
            document.body.style.overflow = 'auto';

            if (choice === 'triage') {
                openAiTriage();
            } else {
                logSelfReferral('nearby_care_direct');
                proceedToNearbyCareMap();
            }
        }

        function proceedToNearbyCareMap() {
            if (!navigator.geolocation) { showToast('Location is not available on this device/browser.'); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    window.open(`https://www.google.com/maps/search/hospitals+near+me/@${latitude},${longitude},14z`, '_blank');
                },
                () => showToast('Could not access your location. Please enable location permissions and try again.')
            );
        }

        function logSelfReferral(source) {
            try {
                const log = JSON.parse(localStorage.getItem('nexusSelfReferrals') || '[]');
                log.push({ source, timestamp: Date.now() });
                localStorage.setItem('nexusSelfReferrals', JSON.stringify(log.slice(-50)));
            } catch (e) {}
        }
        
        function findNearbyDoctors() {
            openTelehealth('near');
             }

        const aiLang = 'en';
        
       let aiPendingImage = null;
        let aiConversationHistory = [];
        let aiCurrentContextKey = 'general';

        function getContextKey(context) {
            if (!context || typeof context !== 'string') return 'general';
            if (context === 'EMERGENCY TRAUMA') return 'emergency';
            return context.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        }

        const AI_RED_FLAGS = [ 
            { match: ["chest pain", "tightness in chest"], msg: "Chest pain can be a sign of a heart attack. Go to the nearest hospital right now, or press SOS." },
            { match: ["shortness of breath", "can't breathe", "trouble breathing"], msg: "Difficulty breathing needs to be checked by a doctor immediately." },
            { match: ["heavy bleeding", "lots of blood"], msg: "Heavy bleeding needs emergency care at a hospital." },
            { match: ["unconscious", "passed out", "not moving", "fainted"], msg: "Loss of consciousness is an emergency — get to a hospital right now." },
            { match: ["pregnant severe pain", "bleeding during pregnancy"], msg: "Severe pain or bleeding during pregnancy needs immediate medical attention." }
        ];
        function checkRedFlags(text) {
            const lower = text.toLowerCase();
            for (const flag of AI_RED_FLAGS) { if (flag.match.some(k => lower.includes(k))) return flag.msg; }
            return null;
        }
        function quickSymptom(label) {
            document.getElementById('aiTextInput').value = label + ' — ';
            document.getElementById('aiTextInput').focus();
        }
        function quickSymptom(label) {
            document.getElementById('aiTextInput').value = label + ' — ';
            document.getElementById('aiTextInput').focus();
        }

        function autoResizeAiTextarea() {
            const ta = document.getElementById('aiTextInput');
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
        }
        function openAiTriage(context) {
            const consented = localStorage.getItem('nexusAiConsentGiven');
            if (!consented) {
                document.getElementById('aiConsentModal').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                window._pendingAiContext = context;
                return;
            }
            launchAiTriage(context);
        }
       function acceptAiConsent() {
    localStorage.setItem('nexusAiConsentGiven', 'true');
    document.getElementById('aiConsentModal').classList.add('hidden');
    launchAiTriage(window._pendingAiContext);
    if (window._pendingRecordId) {
        const pendingId = window._pendingRecordId;
        window._pendingRecordId = null;
        runRecordAnalysis(pendingId);
    }
       } 
        
     async function loadChatHistoryForContext(contextKey) {
            const log = document.getElementById('aiChatLog');
            log.innerHTML = '';
            aiConversationHistory = [];

            const GREETING = "Hi! I'm Nexus Intelligence, your health assistant. Describe your symptom or upload a photo, and I'll give you one clear next step: care for it at home, visit a pharmacy, book a doctor consultation, or go to the hospital right now if it's urgent.";

            try {
                const currentUser = await window._authReadyPromise;
                if (!currentUser) {
                    appendAiMessage('ai', GREETING);
                    return;
                }

                const db = firebase.database();
                const snap = await db.ref(`users/${currentUser.uid}/aiChatHistory/${contextKey}`).once('value');
                const saved = snap.val();

                if (saved && Array.isArray(saved.messages) && saved.messages.length > 0) {
                    saved.messages.forEach(msg => {
                        appendAiMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, null, msg.timestamp);
                        aiConversationHistory.push({ role: msg.role, content: msg.content, timestamp: msg.timestamp });
                    });
                } else {
                    appendAiMessage('ai', GREETING);
                }
            } catch (err) {
                console.error('loadChatHistoryForContext error:', err);
                appendAiMessage('ai', GREETING);
            }
     } 

        async function launchAiTriage(context) {
            document.getElementById('aiTriageOverlay').classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            const newContextKey = getContextKey(context);
            if (newContextKey !== aiCurrentContextKey || document.getElementById('aiChatLog').children.length === 0) {
                aiCurrentContextKey = newContextKey;
                await loadChatHistoryForContext(newContextKey);
            }

            if (context && typeof context === 'string' && context !== 'EMERGENCY TRAUMA') {
                document.getElementById('aiTextInput').value = `I'd like to know more about: ${context}. My symptom is...`;
                document.getElementById('aiTextInput').focus();
            }
            if (context === 'EMERGENCY TRAUMA') {
                document.getElementById('aiTextInput').value = '';
                appendAiMessage('ai', "You pressed SOS — if this is a real emergency (chest pain, heavy bleeding, unconsciousness), call your nearest hospital's emergency line RIGHT NOW. Otherwise, tell me what's going on.");
            }
        } 
        function closeAiTriage() {
            document.getElementById('aiTriageOverlay').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        function handleAiImageUpload(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                aiPendingImage = e.target.result;
                document.getElementById('aiImagePreview').src = aiPendingImage;
                document.getElementById('aiImagePreviewWrap').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
        function clearAiImage() {
            aiPendingImage = null;
            document.getElementById('aiImageInput').value = '';
            document.getElementById('aiImagePreviewWrap').classList.add('hidden');
        }
        function appendAiMessage(sender, text, imageSrc, timestamp) {
            const log = document.getElementById('aiChatLog');
            const bubble = document.createElement('div');
            const isUser = sender === 'user';
           bubble.className = `max-w-[85%] px-3 py-1 rounded-2xl text-[13px] leading-relaxed ${isUser ? 'ml-auto bg-white/10' : 'mr-auto'}`;
if (!isUser) bubble.style.border = '1px solid rgba(0,242,255,0.15)';
if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc; img.alt = 'User photo'; img.className = 'rounded-xl mb-2 max-h-40';
    bubble.appendChild(img);
}
const timeStr = new Date(timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
const p = document.createElement('div');
if (isUser) {
    p.textContent = text;
} else {
    p.innerHTML = DOMPurify.sanitize(marked.parse(text));
    p.classList.add('ai-markdown-body');
}
bubble.appendChild(p);
const timeRow = document.createElement('div');
timeRow.className = 'msg-time-row';
timeRow.textContent = timeStr;
bubble.appendChild(timeRow);
            log.appendChild(bubble);
            log.scrollTop = log.scrollHeight;
            return bubble;
        }
        function showTypingIndicator() {
            const log = document.getElementById('aiChatLog');
            const bubble = document.createElement('div');
            bubble.className = 'mr-auto max-w-[50%] p-3 rounded-2xl';
            bubble.style.border = '1px solid rgba(0,242,255,0.15)';
            bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            log.appendChild(bubble);
            log.scrollTop = log.scrollHeight;
            return bubble;
        }
        
async function saveChatHistoryForContext(contextKey) {
            try {
                const currentUser = await window._authReadyPromise;
                if (!currentUser) return;
                const db = firebase.database();
                await db.ref(`users/${currentUser.uid}/aiChatHistory/${contextKey}`).set({
                    messages: aiConversationHistory,
                    updatedAt: Date.now()
                });
            } catch (err) {
                console.error('Save chat history error:', err);
            }
        }

        async function sendAiTriageMessage() {
            const input = document.getElementById('aiTextInput');
            const text = input.value.trim();
            const image = aiPendingImage;
            if (!text && !image) return;
            const userTimestamp = Date.now();
            appendAiMessage('user', text, image, userTimestamp);
            input.value = '';
            const sentImage = image;
            clearAiImage();
            const redFlag = checkRedFlags(text);
            if (redFlag) {
                document.getElementById('aiRedFlagText').textContent = redFlag;
                document.getElementById('aiRedFlagBanner').classList.remove('hidden');
            } else {
                document.getElementById('aiRedFlagBanner').classList.add('hidden');
            }
            aiConversationHistory.push({ role: 'user', content: text, timestamp: userTimestamp });
            saveChatHistoryForContext(aiCurrentContextKey);
            const typingBubble = showTypingIndicator();
            try {
                const result = await askNexusAI(text, sentImage, aiLang);
                typingBubble.remove();
                const aiTimestamp = Date.now();
                appendAiMessage('ai', result.reply, null, aiTimestamp);
                aiConversationHistory.push({ role: 'assistant', content: result.reply, timestamp: aiTimestamp });
                saveChatHistoryForContext(aiCurrentContextKey);
            } catch (err) {
                typingBubble.remove();
                appendAiMessage('ai', 'There was a connection issue. Please try again, or see a doctor if your symptom is severe.');
                console.error(err);
            }
        }
        /**
         * INTERNAL NOTE (not user-facing): the underlying engines are a clinical
         * multimodal model plus a general-purpose conversational/translation
         * model. Do not surface underlying model names in the UI — brand
         * everything as "Nexus Intelligence" to the user, the way Ada Health /
         * K Health / Babylon brand their own engines rather than naming vendors.
         *
         * TODO (next stage - backend, Render):
         * 1. The conversational model receives the person's text (in whichever
         *    supported language), turns it into clean, structured English for
         *    the clinical model.
         * 2. The clinical model (multimodal) analyzes the text + photo (if any).
         * 3. The conversational model translates the reply back into the
         *    person's language.
         * All of this goes through your Render backend -> Hugging Face
         * Inference API. No API key lives in this frontend.
         */
        async function askNexusAI(text, imageBase64, lang) {
    const currentUser = await window._authReadyPromise;

    if (!currentUser) {
        throw new Error('Da fatan za a shiga (login) daga babban shafin kafin amfani da Nexus Intelligence.');
    }

    const idToken = await currentUser.getIdToken();

    const res = await fetch('https://oryzon-backend-ed1q.onrender.com/ai-triage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ text, image: imageBase64, lang, history: aiConversationHistory.slice(0, -1), contextKey: aiCurrentContextKey })
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 403 && data.error === 'image_requires_pro') {
        return { reply: data.reply, requiresPro: true };
    }

    if (!res.ok) {
        throw new Error(data.detail || 'AI request failed');
    }

    return { reply: data.reply, tier: data.tier };
        }

    /**
 * Records Vault -> AI analysis pipeline.
 * - Image records (photo of a lab result/scan) go through the same
 *   `image` field as the AI Triage camera upload — MedGemma reads it visually.
 * - PDF records: text is extracted client-side with pdf.js, then sent
 *   as `structuredData` — this is the EHR/lab-report path that also
 *   requires a Pro account, same as image analysis.
 */
function analyzeRecordWithAI(id) {
    closeRecords();
    const consented = localStorage.getItem('nexusAiConsentGiven');
    if (!consented) {
        document.getElementById('aiConsentModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        window._pendingAiContext = null;
        window._pendingRecordId = id;
        return;
    }
    launchAiTriage();
    runRecordAnalysis(id);
}

async function runRecordAnalysis(id) {
    const record = getRecords().find(r => r.id === id);
    if (!record) return;

    const isImage = record.type && record.type.startsWith('image/');
    const isPdf = record.type === 'application/pdf';

    if (!isImage && !isPdf) {
        appendAiMessage('ai', "I can only analyze images or PDF documents right now — this file type isn't supported yet.");
        return;
    }

    appendAiMessage('user', `Please analyze this document: ${record.name}`, isImage ? record.data : null);
    const typingBubble = showTypingIndicator();

    try {
        let result;
        if (isImage) {
            result = await askNexusAI('Please analyze this lab result / medical document photo and explain what it shows in plain language.', record.data, aiLang);
        } else {
            const extractedText = await extractPdfText(record.data);
            if (!extractedText) {
                typingBubble.remove();
                appendAiMessage('ai', "I couldn't read any text from this PDF — it may be a scanned image without selectable text. Try uploading it as a photo instead.");
                return;
            }
            result = await askNexusAiStructured(extractedText, record.name, aiLang);
        }
        typingBubble.remove();
        appendAiMessage('ai', result.reply);
    } catch (err) {
        typingBubble.remove();
        appendAiMessage('ai', 'There was a connection issue analyzing this document. Please try again.');
        console.error(err);
    }
}

async function extractPdfText(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText.trim();
}

async function askNexusAiStructured(extractedText, fileName, lang) {
    const currentUser = await window._authReadyPromise;

    if (!currentUser) {
        throw new Error('Da fatan za a shiga (login) daga babban shafin kafin amfani da Nexus Intelligence.');
    }

    const idToken = await currentUser.getIdToken();

    const res = await fetch('https://oryzon-backend-ed1q.onrender.com/ai-triage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
            text: `Please review this lab report / clinical document (${fileName}) and explain what it shows in plain language.`,
            structuredData: { fileName, extractedText },
            lang
        })
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 403 && data.error === 'image_requires_pro') {
        return { reply: data.reply, requiresPro: true };
    }

    if (!res.ok) {
        throw new Error(data.detail || 'AI request failed');
    }

    return { reply: data.reply, tier: data.tier };
}
        
    
        /* ================= EXECUTIVE CHECK-UP WIZARD (comprehensive, hospital-style) ================= */
        const wizardSteps = [
            { title: 'General Wellbeing', question: 'How has your energy, appetite, and sleep been recently?', options: ['Normal', 'A bit off', 'Poor'] },
            { title: 'Cardiovascular', question: 'Any chest discomfort, palpitations, or swelling in your legs?', options: ['None', 'Occasionally', 'Frequently'] },
            { title: 'Respiratory', question: 'Any cough, wheezing, or breathlessness on exertion?', options: ['None', 'Mild', 'Noticeable'] },
            { title: 'Digestive System', question: 'Any stomach pain, nausea, or changes in bowel habits?', options: ['None', 'Mild', 'Noticeable'] },
            { title: 'Neurological', question: 'Any headaches, dizziness, numbness, or memory issues?', options: ['None', 'Occasionally', 'Frequently'] },
            { title: 'Mental Wellbeing', question: 'How would you describe your stress, mood, and anxiety lately?', options: ['Good', 'Somewhat stressed', 'Struggling'] },
            { title: 'Musculoskeletal', question: 'Any joint, muscle, or back pain limiting movement?', options: ['None', 'Mild', 'Significant'] },
            { title: 'Vision & Hearing', question: 'Any changes in your eyesight or hearing?', options: ['None', 'Slight change', 'Noticeable change'] },
            { title: 'Skin', question: 'Any new moles, rashes, or slow-healing wounds?', options: ['None', 'One or two', 'Several'] },
            { title: 'Urinary & Reproductive', question: 'Any urinary changes, pelvic discomfort, or reproductive concerns?', options: ['None', 'Mild', 'Noticeable'] },
            { title: 'Diet & Lifestyle', question: 'How would you rate your typical diet, exercise, alcohol, and smoking habits?', options: ['Healthy', 'Average', 'Needs work'] },
            { title: 'Medications & Allergies', question: 'Are you currently on any medications, or do you have known allergies?', options: ['None', 'Some', 'Several'] },
            { title: 'Family History', question: 'Does your immediate family have a history of heart disease, diabetes, or cancer?', options: ['No', 'Not sure', 'Yes'] },
            { title: 'Anything Else?', question: 'Any other symptom or concern you want Nexus Intelligence to know about?', options: [] }
        ];
        let wizardIndex = 0;
        let wizardAnswers = [];

        function openCheckupWizard() {
            wizardIndex = 0;
            wizardAnswers = new Array(wizardSteps.length).fill(null);
            document.getElementById('checkupWizard').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            document.getElementById('wizardNextBtn').onclick = wizardNext;
            renderWizardStep();
        }
        function closeCheckupWizard() {
            document.getElementById('checkupWizard').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        function renderWizardProgress() {
            const bar = document.getElementById('wizardProgress');
            bar.innerHTML = wizardSteps.map((_, i) => `<span class="${i <= wizardIndex ? 'done' : ''}"></span>`).join('');
        }
        function renderWizardStep() {
            renderWizardProgress();
            const step = wizardSteps[wizardIndex];
            const body = document.getElementById('wizardBody');
            const isLast = wizardIndex === wizardSteps.length - 1;
            if (isLast) {
                body.innerHTML = `
                    <div class="unit-card rounded-2xl p-5 mb-4">
                        <div class="text-[9px] text-gray-500 uppercase mb-2">Step ${wizardIndex + 1} of ${wizardSteps.length}</div>
                        <h3 class="futuristic-font text-sm mb-3">${step.title}</h3>
                        <p class="text-[12px] text-gray-300 mb-4">${step.question}</p>
                        <textarea id="wizardFreeText" rows="4" placeholder="Optional — type anything else here..." autocomplete="off" autocorrect="off" spellcheck="false" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[12px] outline-none"></textarea>
                    </div>`;
            } else {
                body.innerHTML = `
                    <div class="unit-card rounded-2xl p-5 mb-4">
                        <div class="text-[9px] text-gray-500 uppercase mb-2">Step ${wizardIndex + 1} of ${wizardSteps.length}</div>
                        <h3 class="futuristic-font text-sm mb-3">${step.title}</h3>
                        <p class="text-[12px] text-gray-300 mb-4">${step.question}</p>
                        <div class="grid grid-cols-3 gap-2">
                            ${step.options.map(opt => `<div class="wizard-option ${wizardAnswers[wizardIndex] === opt ? 'selected' : ''}" onclick="selectWizardOption('${opt}')">${opt}</div>`).join('')}
                        </div>
                    </div>`;
            }
            document.getElementById('wizardBackBtn').style.visibility = wizardIndex === 0 ? 'hidden' : 'visible';
            document.getElementById('wizardNextBtn').textContent = isLast ? 'Get My Report' : 'Next';
        }
        function selectWizardOption(opt) {
            wizardAnswers[wizardIndex] = opt;
            renderWizardStep();
        }
        function wizardBack() {
            if (wizardIndex > 0) { wizardIndex--; renderWizardStep(); }
        }

        function buildLocalCheckupReport() {
            return wizardSteps.slice(0, -1).map((s, i) => {
                const ans = wizardAnswers[i];
                const idx = s.options.indexOf(ans);
                const status = idx <= 0 ? 'clear' : idx === 1 ? 'monitor' : 'see-doctor';
                return { title: s.title, answer: ans || 'Skipped', status };
            });
        }

        function wizardNext() {
            const isLast = wizardIndex === wizardSteps.length - 1;
            if (isLast) {
                const freeText = document.getElementById('wizardFreeText')?.value.trim() || '';
                showCheckupReport(freeText);
                return;
            }
            wizardIndex++;
            renderWizardStep();
        }

        function showCheckupReport(freeText) {
            const rows = buildLocalCheckupReport();
            const statusMeta = {
                clear: { label: 'No concern flagged', color: '#4ade80', icon: 'fa-circle-check' },
                monitor: { label: 'Worth monitoring', color: '#facc15', icon: 'fa-eye' },
                'see-doctor': { label: 'Recommend seeing a doctor', color: '#ff0055', icon: 'fa-triangle-exclamation' }
            };
             const needsDoctor = rows.some(r => r.status === 'see-doctor');
            const body = document.getElementById('wizardBody');
            document.getElementById('wizardProgress').innerHTML = '';
            document.getElementById('wizardBackBtn').style.visibility = 'hidden';
            const nextBtn = document.getElementById('wizardNextBtn');
            nextBtn.textContent = 'Done';
            nextBtn.onclick = () => { closeCheckupWizard(); nextBtn.onclick = wizardNext; };

            body.innerHTML = `
                <div class="unit-card rounded-2xl p-5 mb-4 text-center">
                    <i class="fa-solid fa-file-medical text-3xl text-cyan-400 mb-3"></i>
                    <h3 class="futuristic-font text-sm mb-1">Your Check-Up Report</h3>
                    <p class="text-[10px] text-gray-500">Based on what you shared today — not a diagnosis, just a starting point</p>
                </div>
                ${needsDoctor ? `
                <div class="mb-4 p-3 rounded-2xl border" style="border-color:var(--emergency); background: rgba(255,0,85,0.08);">
                    <div class="flex items-center gap-2 text-[11px] font-bold" style="color:var(--emergency);"><i class="fa-solid fa-triangle-exclamation"></i>One or more areas need a doctor's attention</div>
                </div>` : ''}
                <div class="space-y-2 mb-5">
                    ${rows.map(r => `
                        <div class="nx-list-item">
                            <div>
                                <div class="text-[11px] font-bold text-white">${r.title}</div>
                                <div class="text-[9px] text-gray-500">You said: ${r.answer}</div>
                            </div>
                            <div class="text-[9px] font-bold flex items-center gap-1" style="color:${statusMeta[r.status].color};">
                                <i class="fa-solid ${statusMeta[r.status].icon}"></i>${statusMeta[r.status].label}
                            </div>
                        </div>`).join('')}
                </div>
                <div class="unit-card rounded-2xl p-4 mb-3">
                    <div class="text-[10px] text-gray-500 uppercase mb-2"><i class="fa-solid fa-utensils mr-1"></i>Dietary Guidance</div>
                    <p class="text-[11px] text-gray-300">Once connected to the real engine, this section will give personalized food-to-avoid and food-to-favor guidance based on the systems flagged above (for example, reducing salt/sugar if cardiovascular or endocrine concerns were flagged).</p>
                </div>
                ${freeText ? `<div class="unit-card rounded-2xl p-4"><div class="text-[10px] text-gray-500 uppercase mb-2">Additional Notes</div><p class="text-[11px] text-gray-300">${freeText}</p></div>` : ''}
            `;
        }

        /* ================= NEXA DOCTORS: DATA MODEL ================= */
        const NEXA_SPECIALTIES = ['General Practitioner', 'Cardiology', 'Pediatrics', 'Dermatology', 'Psychiatry', 'Gynecology'];

        const NEXA_DOCTORS = [
            { id: 'd1', name: 'Dr. Amina Bello', specialty: 'General Practitioner', rating: 4.9, reviews: 128, duration: 30, price: 15, availability: 'today', verified: true, bio: 'General practitioner focused on everyday concerns — colds, infections, prescriptions, and lifestyle advice.', initials: 'AB', accentA: '#00f2ff', accentB: '#3b82f6', lat: 6.5244, lng: 3.3792 },
            { id: 'd2', name: 'Dr. Chen Wei', specialty: 'Cardiology', rating: 4.8, reviews: 94, duration: 30, price: 25, availability: 'today', verified: true, bio: 'Cardiologist with a decade of experience in hypertension management and heart health screening.', initials: 'CW', accentA: '#ff9d00', accentB: '#ef4444', lat: 6.5834, lng: 3.3499 },
            { id: 'd3', name: 'Dr. Fatima Sani', specialty: 'Pediatrics', rating: 5.0, reviews: 210, duration: 30, price: 18, availability: 'today', verified: true, bio: 'Pediatrician passionate about compassionate, family-centered child healthcare.', initials: 'FS', accentA: '#a855f7', accentB: '#ec4899', lat: 6.4550, lng: 3.3841 },
            { id: 'd4', name: 'Dr. James Okoro', specialty: 'Dermatology', rating: 4.7, reviews: 76, duration: 25, price: 20, availability: 'ahead', verified: true, bio: 'Dermatologist specializing in skin conditions, acne treatment, and cosmetic dermatology.', initials: 'JO', accentA: '#4ade80', accentB: '#facc15', lat: 6.6018, lng: 3.3515 },
            { id: 'd5', name: 'Dr. Ngozi Adeyemi', specialty: 'Psychiatry', rating: 4.9, reviews: 63, duration: 45, price: 22, availability: 'today', verified: true, bio: 'Psychiatrist with experience in anxiety, depression, and mental wellbeing support.', initials: 'NA', accentA: '#22c55e', accentB: '#00f2ff', lat: 6.5095, lng: 3.3711 },
            { id: 'd6', name: 'Dr. Yusuf Danladi', specialty: 'General Practitioner', rating: 4.6, reviews: 51, duration: 30, price: 15, availability: 'ahead', verified: true, bio: 'General practitioner with 10 years of experience, also skilled in mental health first response.', initials: 'YD', accentA: '#38bdf8', accentB: '#a855f7', lat: 6.4698, lng: 3.5852 },
            { id: 'd7', name: 'Dr. Grace Umeh', specialty: 'Gynecology', rating: 4.9, reviews: 87, duration: 30, price: 20, availability: 'today', verified: true, bio: "Gynecologist supporting women's health, reproductive care, and prenatal guidance.", initials: 'GU', accentA: '#ec4899', accentB: '#a855f7', lat: 6.6432, lng: 3.3018 }
        ];

        let nexaDoctorDirectoryMode = 'general';
        let nexaUserLocation = null;
        let nexaCurrentRadiusKm = 5;
        const NEXA_RADIUS_STEPS = [5, 10, 20, 50, 100, 500];

        function haversineKm(lat1, lng1, lat2, lng2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        function renderDoctorAvatar(doc) {
            return `<div class="nexa-avatar-circle" style="--av-a:${doc.accentA}; --av-b:${doc.accentB};">${doc.initials}</div>`;
        }

        function renderDoctorCard(doc, distanceKm) {
            const statusLabel = doc.availability === 'today' ? 'Available today' : 'Booking ahead';
            const statusClass = doc.availability === 'today' ? 'today' : 'ahead';
            return `
                <div class="nexa-doc-card">
                    <div class="flex items-start gap-3">
                        ${renderDoctorAvatar(doc)}
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center flex-wrap gap-1">
                                <span class="text-[13px] font-bold text-white">${doc.name}</span>
                                ${doc.verified ? '<i class="fa-solid fa-circle-check nexa-verified-tick"></i>' : ''}
                            </div>
                            <div class="text-[11px] text-gray-400 mt-0.5">${doc.specialty}</div>
                            <div class="flex items-center gap-3 mt-2 flex-wrap">
                                ${doc.rating ? `<span class="text-[10px] text-yellow-400"><i class="fa-solid fa-star"></i> ${doc.rating.toFixed(1)} (${doc.reviews})</span>` : ''}
                                <span class="text-[10px] text-gray-500"><i class="fa-regular fa-clock"></i> ${doc.duration}-min consult</span>
                            </div>
                            <div class="mt-2"><span class="nexa-status-pill ${statusClass}"><span class="dot"></span>${statusLabel}</span></div>
                            ${typeof distanceKm === 'number' ? `<div class="nexa-doc-distance"><i class="fa-solid fa-location-dot"></i>${distanceKm < 1 ? Math.round(distanceKm * 1000) + 'm' : distanceKm.toFixed(1) + 'km'} away</div>` : ''}
                        </div>
                    </div>
                    <p class="text-[11px] text-gray-400 mt-3 leading-relaxed">${doc.bio}</p>
                    <div class="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <div><div class="text-[9px] text-gray-500 uppercase">From</div><div class="futuristic-font text-sm text-white">£${doc.price}.00</div></div>
                        <button onclick="startDoctorBooking('${doc.id}')" class="btn-nexus text-[9px] px-5 py-2.5" style="background:var(--neon-cyan); color:#000; border:none;">Book Consultation</button>
                    </div>
                </div>`;
        }

        function populateSpecialtyFilter() {
            const sel = document.getElementById('nexaSpecialtyFilter');
            if (sel.dataset.populated) return;
            sel.dataset.populated = '1';
            NEXA_SPECIALTIES.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                sel.appendChild(opt);
            });
        }

        function renderDoctorList() {
            populateSpecialtyFilter();
            const q = (document.getElementById('nexaDocSearch')?.value || '').trim().toLowerCase();
            const specialty = document.getElementById('nexaSpecialtyFilter')?.value || '';
            const todayOnly = document.getElementById('nexaAvailableTodayFilter')?.checked;
            const wrap = document.getElementById('doctorList');

            let list = NEXA_DOCTORS.filter(d => {
                if (specialty && d.specialty !== specialty) return false;
                if (todayOnly && d.availability !== 'today') return false;
                if (q && !(`${d.name} ${d.specialty}`.toLowerCase().includes(q))) return false;
                return true;
            });

            if (list.length === 0) {
                wrap.innerHTML = `<div class="nexa-empty-state"><i class="fa-solid fa-user-doctor"></i>No doctors match your search — try a different specialty or keyword.</div>`;
                return;
            }
            wrap.innerHTML = list.map(d => renderDoctorCard(d)).join('');
        }

        function renderNearDoctors() {
            const statusWrap = document.getElementById('nexaNearStatus');
            const listWrap = document.getElementById('nexaNearList');

            if (!navigator.geolocation) {
                statusWrap.innerHTML = `<div class="nexa-empty-state"><i class="fa-solid fa-location-crosshairs"></i>Location isn't available on this device/browser. Try "Find a Doctor" instead.</div>`;
                listWrap.innerHTML = '';
                return;
            }
            statusWrap.innerHTML = `<div class="text-[11px] text-gray-400 mb-3"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Finding your location…</div>`;
            listWrap.innerHTML = '';

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    nexaUserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    nexaCurrentRadiusKm = NEXA_RADIUS_STEPS[0];
                    expandUntilFoundAndRender();
                },
                () => {
                    statusWrap.innerHTML = `<div class="nexa-empty-state"><i class="fa-solid fa-location-crosshairs"></i>Couldn't access your location. Please enable location permissions, or use "Find a Doctor" to browse all doctors.</div>`;
                }
            );
        }

        function expandUntilFoundAndRender() {
            const statusWrap = document.getElementById('nexaNearStatus');
            const listWrap = document.getElementById('nexaNearList');
            if (!nexaUserLocation) return;

            let matches = [];
            let radiusIndex = NEXA_RADIUS_STEPS.indexOf(nexaCurrentRadiusKm);
            if (radiusIndex === -1) radiusIndex = 0;

            while (radiusIndex < NEXA_RADIUS_STEPS.length) {
                const radius = NEXA_RADIUS_STEPS[radiusIndex];
                matches = NEXA_DOCTORS
                    .map(d => ({ doc: d, distance: haversineKm(nexaUserLocation.lat, nexaUserLocation.lng, d.lat, d.lng) }))
                    .filter(m => m.distance <= radius)
                    .sort((a, b) => a.distance - b.distance);
                if (matches.length > 0) { nexaCurrentRadiusKm = radius; break; }
                radiusIndex++;
            }

            if (matches.length === 0) {
                matches = NEXA_DOCTORS
                    .map(d => ({ doc: d, distance: haversineKm(nexaUserLocation.lat, nexaUserLocation.lng, d.lat, d.lng) }))
                    .sort((a, b) => a.distance - b.distance);
                statusWrap.innerHTML = `<div class="nexa-radius-note"><i class="fa-solid fa-circle-info"></i>No doctors within our usual range — showing the closest doctors available anywhere.</div>`;
            } else if (nexaCurrentRadiusKm > NEXA_RADIUS_STEPS[0]) {
                statusWrap.innerHTML = `<div class="nexa-radius-note"><i class="fa-solid fa-circle-info"></i>No doctors within ${NEXA_RADIUS_STEPS[0]}km, so we widened the search to ${nexaCurrentRadiusKm}km.</div>`;
            } else {
                statusWrap.innerHTML = `<div class="text-[11px] text-gray-400 mb-3">Showing doctors within ${nexaCurrentRadiusKm}km of you.</div>`;
            }

            listWrap.innerHTML = matches.map(m => renderDoctorCard(m.doc, m.distance)).join('');
        }

        function switchDoctorDirectory(mode) {
            nexaDoctorDirectoryMode = mode;
            document.getElementById('nexaTabGeneral').classList.toggle('active', mode === 'general');
            document.getElementById('nexaTabNear').classList.toggle('active', mode === 'near');
            document.getElementById('nexaGeneralView').classList.toggle('hidden', mode !== 'general');
            document.getElementById('nexaNearView').classList.toggle('hidden', mode !== 'near');
            if (mode === 'general') renderDoctorList();
            else renderNearDoctors();
        }

        function openTelehealth(mode) {
            renderAppointments();
            document.getElementById('telehealthModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            switchDoctorDirectory(mode === 'near' ? 'near' : 'general');
        }
        function closeTelehealth() {
            document.getElementById('telehealthModal').classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
        function getAppointments() { return JSON.parse(localStorage.getItem('nexusAppointments') || '[]'); }
        function renderAppointments() {
            const appts = getAppointments();
            const wrap = document.getElementById('appointmentList');
            if (appts.length === 0) { wrap.textContent = 'No appointments yet.'; return; }
            wrap.innerHTML = appts.slice(-5).reverse().map(a => `
                <div class="nx-list-item">
                    <div>
                        <div class="text-[11px] font-bold text-white">${a.doctor}</div>
                        <div class="text-[9px] text-gray-500">${a.spec} · ${a.mode} · ${new Date(a.time).toLocaleString()}</div>
                    </div>
                    <i class="fa-solid fa-circle-check text-cyan-400"></i>
                </div>`).join('');
        }
        function sendPrescriptionToPharmacy(doctorName, medName) {
            const rx = JSON.parse(localStorage.getItem('nexusPrescriptions') || '[]');
            rx.push({ id: Date.now(), doctor: doctorName, med: medName, date: new Date().toISOString(), status: 'Ready for pickup' });
            localStorage.setItem('nexusPrescriptions', JSON.stringify(rx));
            showToast(`Prescription sent to Nexus Pharmacy`);
            openNexusOverlay();
                                                }
/* ================= DOCTOR BOOKING WIZARD (Date&Time -> Doctor -> Confirm&Pay) ================= */
        const NEXA_CONSULT_TYPES = [
            { id: 'general', label: 'General consultation', desc: 'Talk to a GP about everyday concerns — colds, infections, scripts, lifestyle advice.', icon: 'fa-stethoscope', priceOverride: null },
            { id: 'followup', label: 'Follow-up consultation', desc: 'A shorter check-in to review progress on an existing issue or prescription.', icon: 'fa-rotate', priceOverride: 10 },
            { id: 'specialist', label: 'Specialist review', desc: 'An in-depth session for a specific condition needing specialist attention.', icon: 'fa-user-doctor', priceOverride: null }
        ];

        let nexaBooking = { step: 1, doctorId: null, date: null, time: null, consultTypeId: 'general', notes: '' };

        function generateNextDates(count) {
            const dates = [];
            const today = new Date();
            for (let i = 0; i < count; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                dates.push(d);
            }
            return dates;
        }
        function generateTimeSlots() {
            const slots = [];
            for (let h = 8; h < 18; h++) {
                [0, 25, 35].forEach(m => {
                    if (h === 8 && m === 0) { slots.push(`${String(h).padStart(2,'0')}:00`); return; }
                    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
                });
            }
            return slots;
        }
        function formatDateInput(d) {
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        }
        function formatDateLong(d) {
            return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }

        function startDoctorBooking(doctorId) {
            nexaBooking = { step: 1, doctorId, date: generateNextDates(1)[0], time: null, consultTypeId: 'general', notes: '' };
            document.getElementById('telehealthModal').classList.add('hidden');
            document.getElementById('doctorBookingWizard').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            renderNexaWizard();
        }
        function closeDoctorBookingWizard() {
            document.getElementById('doctorBookingWizard').classList.add('hidden');
            document.getElementById('telehealthModal').classList.remove('hidden');
        }

        function updateNexaStepTrack() {
            for (let i = 1; i <= 3; i++) {
                const circle = document.getElementById(`nexaStepCircle${i}`);
                const label = document.getElementById(`nexaStepLabel${i}`);
                circle.classList.remove('active', 'complete');
                label.classList.remove('active');
                if (i < nexaBooking.step) circle.classList.add('complete');
                else if (i === nexaBooking.step) { circle.classList.add('active'); label.classList.add('active'); }
                if (i < nexaBooking.step) circle.innerHTML = '<i class="fa-solid fa-check" style="font-size:11px;"></i>';
                else circle.textContent = i;
            }
            document.getElementById('nexaStepLine1').classList.toggle('done', nexaBooking.step > 1);
            document.getElementById('nexaStepLine2').classList.toggle('done', nexaBooking.step > 2);
        }

        function renderNexaWizard() {
            updateNexaStepTrack();
            const body = document.getElementById('nexaWizardBody');
            if (nexaBooking.step === 1) body.innerHTML = renderNexaStep1();
            else if (nexaBooking.step === 2) body.innerHTML = renderNexaStep2();
            else body.innerHTML = renderNexaStep3();
        }

        function renderNexaStep1() {
            const dates = generateNextDates(21);
            const slots = generateTimeSlots();
            const selectedDate = nexaBooking.date;
            return `
                <div class="nexa-panel">
                    <div class="nexa-panel-title"><i class="fa-regular fa-calendar text-cyan-400"></i>1. Pick a date and time</div>
                    <div class="nexa-panel-sub">We'll show you doctors who are available at the time you choose.</div>
                    <label class="text-[11px] text-gray-400 mb-2 block">Date</label>
                    <select class="nx-field" onchange="nexaBooking.date = new Date(this.value); nexaBooking.time = null; renderNexaWizard();">
                        ${dates.map(d => `<option value="${d.toISOString()}" ${d.toDateString() === selectedDate.toDateString() ? 'selected' : ''}>${formatDateLong(d)}</option>`).join('')}
                    </select>
                    <label class="text-[11px] text-gray-400 mb-2 mt-2 block">Available times (30 minutes each)</label>
                    <div class="nexa-slot-grid">
                        ${slots.map(t => `<div class="nexa-slot ${nexaBooking.time === t ? 'selected' : ''}" onclick="nexaBooking.time='${t}'; renderNexaWizard();">${t}</div>`).join('')}
                    </div>
                </div>
                <button ${nexaBooking.time ? '' : 'disabled'} onclick="nexaBooking.step=2; renderNexaWizard();" class="btn-nexus w-full text-center ${nexaBooking.time ? '' : 'opacity-30 pointer-events-none'}" style="background:var(--neon-cyan); color:#000;">Continue to doctor selection</button>
            `;
        }

        function renderNexaStep2() {
            const chosen = NEXA_DOCTORS.find(d => d.id === nexaBooking.doctorId);
            const others = NEXA_DOCTORS.filter(d => d.id !== nexaBooking.doctorId && d.specialty === chosen.specialty).slice(0, 3);
            const timeLabel = nexaBooking.time;
            const dateLabel = formatDateLong(nexaBooking.date);
            return `
                <div class="nexa-panel">
                    <div class="nexa-panel-title"><i class="fa-solid fa-user-doctor text-cyan-400"></i>2. Choose your doctor</div>
                    <div class="nexa-panel-sub">These doctors are confirmed free at <b style="color:#fff;">${timeLabel}</b> on ${dateLabel}.</div>
                    <div class="nexa-select-card chosen" onclick="nexaBooking.doctorId='${chosen.id}'; renderNexaWizard();">
                        <i class="fa-solid fa-circle-check nexa-check-mark"></i>
                        <div class="flex items-center gap-3">
                            ${renderDoctorAvatar(chosen)}
                            <div>
                                <div class="text-[13px] font-bold text-white">${chosen.name}</div>
                                <span class="nexa-chosen-pill"><i class="fa-solid fa-check"></i>Your chosen doctor</span>
                                <div class="text-[11px] text-gray-400 mt-1">${chosen.specialty}</div>
                            </div>
                        </div>
                    </div>
                    ${others.map(d => `
                        <div class="nexa-select-card" onclick="nexaBooking.doctorId='${d.id}'; renderNexaWizard();">
                            <div class="flex items-center gap-3">
                                ${renderDoctorAvatar(d)}
                                <div>
                                    <div class="text-[13px] font-bold text-white">${d.name}</div>
                                    <div class="text-[11px] text-gray-400 mt-1">${d.specialty}</div>
                                    <div class="text-[11px] text-gray-500 mt-1">${d.bio.slice(0, 70)}…</div>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>
                <div class="flex gap-3">
                    <button onclick="nexaBooking.step=1; renderNexaWizard();" class="flex-1 py-3 rounded-full text-[11px] font-bold border border-white/15 text-white/60">Back</button>
                    <button onclick="nexaBooking.step=3; renderNexaWizard();" class="flex-1 py-3 rounded-full text-[11px] font-bold" style="background:var(--neon-cyan); color:#000;">Continue</button>
                </div>
            `;
        }

        function renderNexaStep3() {
            const doc = NEXA_DOCTORS.find(d => d.id === nexaBooking.doctorId);
            const consultType = NEXA_CONSULT_TYPES.find(c => c.id === nexaBooking.consultTypeId);
            const price = consultType.priceOverride ?? doc.price;
            return `
                <div class="nexa-panel">
                    <div class="nexa-panel-title"><i class="fa-solid fa-clipboard-list text-cyan-400"></i>3. Consultation type</div>
                    ${NEXA_CONSULT_TYPES.map(c => `
                        <div class="nexa-consult-card ${nexaBooking.consultTypeId === c.id ? 'chosen' : ''}" onclick="nexaBooking.consultTypeId='${c.id}'; renderNexaWizard();">
                            <div class="nexa-consult-icon"><i class="fa-solid ${c.icon}"></i></div>
                            <div>
                                <div class="text-[13px] font-bold text-white">${c.label}</div>
                                <div class="text-[10.5px] text-gray-400 mt-0.5">${c.desc}</div>
                            </div>
                            <div class="nexa-consult-price">£${c.priceOverride ?? doc.price}</div>
                        </div>`).join('')}
                </div>

                <div class="nexa-panel">
                    <div class="nexa-panel-title" style="font-size:13px;">Notes <span style="color:rgba(255,255,255,0.3); font-weight:400;">(optional)</span></div>
                    <div class="nexa-panel-sub">Anything the doctor should know before your call.</div>
                    <textarea id="nexaBookingNotes" rows="4" maxlength="2000" placeholder="Symptoms, history, things you want to discuss…" class="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[12px] outline-none text-white" oninput="nexaBooking.notes=this.value; document.getElementById('nexaNotesCount').textContent=this.value.length;">${nexaBooking.notes}</textarea>
                    <div class="text-right text-[9px] text-gray-500 mt-1"><span id="nexaNotesCount">${nexaBooking.notes.length}</span>/2000</div>
                </div>

                <div class="nexa-panel">
                    <div class="nexa-panel-title"><i class="fa-regular fa-clock text-cyan-400"></i>Booking summary</div>
                    <div class="nexa-summary-row"><div class="label">Doctor</div><div class="value">${doc.name}</div></div>
                    <div class="nexa-summary-row"><div class="label">Time</div><div class="value">${formatDateLong(nexaBooking.date)} at ${nexaBooking.time} GMT+1</div></div>
                    <div class="nexa-summary-row"><div class="label">Type</div><div class="value">${consultType.label}</div></div>
                    <div class="nexa-summary-total"><div>Total</div><div class="amt">£${price}</div></div>
                    <p class="text-[10px] text-gray-500 mb-4">Your doctor and time are locked in as soon as your payment succeeds. You'll receive a confirmation email with the video call link.</p>
                    <button onclick="confirmNexaBooking()" class="btn-nexus w-full text-center" style="background:var(--neon-cyan); color:#000;">Pay £${price} and confirm booking</button>
                </div>

                <button onclick="nexaBooking.step=2; renderNexaWizard();" class="w-full py-3 rounded-full text-[11px] font-bold border border-white/15 text-white/60">Back</button>
            `;
        }

        function confirmNexaBooking() {
            const doc = NEXA_DOCTORS.find(d => d.id === nexaBooking.doctorId);
            const consultType = NEXA_CONSULT_TYPES.find(c => c.id === nexaBooking.consultTypeId);
            const price = consultType.priceOverride ?? doc.price;
            const slot = new Date(nexaBooking.date);
            const [hh, mm] = nexaBooking.time.split(':').map(Number);
            slot.setHours(hh, mm, 0, 0);

            const appts = getAppointments();
            appts.push({ doctor: doc.name, spec: doc.specialty, mode: consultType.label, time: slot.toISOString(), price, notes: nexaBooking.notes });
            localStorage.setItem('nexusAppointments', JSON.stringify(appts));

            closeDoctorBookingWizard();
            renderAppointments();
            showToast(`Booking confirmed with ${doc.name} — £${price} paid`);
        }

        function bookDoctor(index, mode) {
            const d = NEXA_DOCTORS[index];
            if (!d) return;
            startDoctorBooking(d.id);
         }
        /* ================= MEDICATION REMINDERS ================= */
        function openMeds() { renderMedsList(); document.getElementById('medsModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
        function closeMeds() { document.getElementById('medsModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
        function getMeds() { return JSON.parse(localStorage.getItem('nexusMeds') || '[]'); }
        function addMedReminder() {
            const name = document.getElementById('medName').value.trim();
            const time = document.getElementById('medTime').value;
            const freq = document.getElementById('medFreq').value;
            if (!name || !time) { showToast('Please add a medication name and time.'); return; }
            const meds = getMeds();
            meds.push({ id: Date.now(), name, time, freq });
            localStorage.setItem('nexusMeds', JSON.stringify(meds));
            document.getElementById('medName').value = ''; document.getElementById('medTime').value = '';
            renderMedsList();
            showToast(`Reminder set for ${name}`);
        }
        function deleteMedReminder(id) {
            localStorage.setItem('nexusMeds', JSON.stringify(getMeds().filter(m => m.id !== id)));
            renderMedsList();
        }
        function renderMedsList() {
            const meds = getMeds();
            const wrap = document.getElementById('medsList');
            if (meds.length === 0) { wrap.innerHTML = '<p class="text-[11px] text-gray-500">No reminders yet.</p>'; return; }
            wrap.innerHTML = meds.map(m => `
                <div class="nx-list-item">
                    <div>
                        <div class="text-[11px] font-bold text-white">${m.name}</div>
                        <div class="text-[9px] text-gray-500">${m.freq} · ${m.time}</div>
                    </div>
                    <button onclick="deleteMedReminder(${m.id})" class="text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>`).join('');
        }

        /* ================= VITALS TRACKER ================= */
        function openVitals() { renderVitalsHistory(); document.getElementById('vitalsModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
        function closeVitals() { document.getElementById('vitalsModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
        function getVitals() { return JSON.parse(localStorage.getItem('nexusVitals') || '[]'); }
        function saveVitalEntry() {
            const hr = document.getElementById('vHr').value;
            const steps = document.getElementById('vSteps').value;
            const bp = document.getElementById('vBp').value;
            const glucose = document.getElementById('vGlucose').value;
            const sleep = document.getElementById('vSleep').value;
            const weight = document.getElementById('vWeight').value;
            if (!hr && !steps && !bp && !glucose && !sleep && !weight) { showToast('Enter at least one value to log.'); return; }
            const vitals = getVitals();
            vitals.push({ date: new Date().toISOString(), hr, steps, bp, glucose, sleep, weight });
            localStorage.setItem('nexusVitals', JSON.stringify(vitals));
            ['vHr', 'vSteps', 'vBp', 'vGlucose', 'vSleep', 'vWeight'].forEach(id => document.getElementById(id).value = '');
            renderVitalsHistory();
            showToast('Vitals logged');
        }
        function renderVitalsHistory() {
            const vitals = getVitals().slice(-7).reverse();
            const wrap = document.getElementById('vitalsHistory');
            if (vitals.length === 0) { wrap.innerHTML = '<p class="text-[11px] text-gray-500">No entries yet.</p>'; return; }
            const maxSteps = Math.max(...vitals.map(v => Number(v.steps) || 0), 1);
            wrap.innerHTML = vitals.map(v => `
                <div class="unit-card rounded-2xl p-4">
                    <div class="text-[9px] text-gray-500 mb-2">${new Date(v.date).toLocaleString()}</div>
                    <div class="grid grid-cols-2 gap-3 text-[11px] mb-2">
                        <div>❤️ ${v.hr || '—'} bpm</div>
                        <div>🩸 ${v.bp || '—'}</div>
                        <div>🍬 ${v.glucose || '—'} mg/dL</div>
                        <div>😴 ${v.sleep || '—'} hrs</div>
                        <div>👣 ${v.steps || '—'} steps</div>
                        <div>⚖️ ${v.weight || '—'} kg</div>
                    </div>
                    <div class="nx-bar-track"><div class="nx-bar-fill" style="width:${Math.min(100, ((Number(v.steps)||0)/maxSteps)*100)}%"></div></div>
                </div>`).join('');
        }
        /* ================= HEALTH RECORDS VAULT ================= */
        function openRecords() { renderRecordsList(); document.getElementById('recordsModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
        function closeRecords() { document.getElementById('recordsModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
        function getRecords() { return JSON.parse(localStorage.getItem('nexusRecords') || '[]'); }
        function uploadRecord(input) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) { showToast('File too large — please use a file under 4MB.'); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                const records = getRecords();
                records.push({ id: Date.now(), name: file.name, type: file.type, data: e.target.result, date: new Date().toISOString() });
                localStorage.setItem('nexusRecords', JSON.stringify(records));
                renderRecordsList();
                showToast('Document saved to your vault');
            };
            reader.readAsDataURL(file);
            input.value = '';
        }
        function deleteRecord(id) {
            localStorage.setItem('nexusRecords', JSON.stringify(getRecords().filter(r => r.id !== id)));
            renderRecordsList();
        }
       function renderRecordsList() {
    const records = getRecords();
    const wrap = document.getElementById('recordsList');
    if (records.length === 0) { wrap.innerHTML = '<p class="text-[11px] text-gray-500">No documents uploaded yet.</p>'; return; }
    wrap.innerHTML = records.map(r => `
        <div class="nx-list-item">
            <a href="${r.data}" download="${r.name}" class="flex items-center gap-2 min-w-0">
                <i class="fa-solid fa-file-lines text-yellow-300 flex-shrink-0"></i>
                <span class="text-[11px] text-white truncate">${r.name}</span>
            </a>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="analyzeRecordWithAI(${r.id})" class="btn-nexus text-[9px] px-3 py-2" style="border-color:var(--neon-cyan); color:var(--neon-cyan);"><i class="fa-solid fa-microchip mr-1"></i>Analyze with AI</button>
                <button onclick="deleteRecord(${r.id})" class="text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
       } 

        /* ================= COMMUNITY & SUPPORT GROUPS ================= */
        const NEXUS_GROUPS = [
            { name: 'Diabetes Support Circle', members: '2.1k', icon: 'fa-droplet' },
            { name: 'Cancer Survivors Network', members: '980', icon: 'fa-ribbon' },
            { name: 'Mental Health Circle', members: '3.4k', icon: 'fa-head-side-heart' },
            { name: 'New Mothers Group', members: '1.5k', icon: 'fa-baby' },
            { name: 'Heart Health Warriors', members: '760', icon: 'fa-heart-pulse' }
        ];
        function openCommunity() { renderCommunityGroups(); document.getElementById('communityModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
        function closeCommunity() { document.getElementById('communityModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
        function getJoinedGroups() { return JSON.parse(localStorage.getItem('nexusCommunities') || '[]'); }
        function joinCommunity(name) {
            const joined = getJoinedGroups();
            if (!joined.includes(name)) joined.push(name);
            localStorage.setItem('nexusCommunities', JSON.stringify(joined));
            renderCommunityGroups();
            showToast(`Joined ${name}`);
        }
        function renderCommunityGroups() {
            const joined = getJoinedGroups();
            const wrap = document.getElementById('communityGroups');
            wrap.innerHTML = NEXUS_GROUPS.map(g => `
                <div class="unit-card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-3">
                        <div class="unit-icon-box" style="margin:0;"><i class="fa-solid ${g.icon} text-purple-300"></i></div>
                        <div>
                            <div class="text-[12px] font-bold">${g.name}</div>
                            <div class="text-[9px] text-gray-500">${g.members} members</div>
                        </div>
                    </div>
                    ${joined.includes(g.name)
                        ? `<span class="text-[9px] text-cyan-400 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Joined</span>`
                        : `<button onclick="joinCommunity('${g.name}')" class="btn-nexus text-[9px] px-4 py-2">Join</button>`}
                </div>`).join('');
        }

    function getFamilyProfiles() {
    let p = JSON.parse(localStorage.getItem('nexusProfiles') || 'null');
    if (!p) { p = [{ id: 'self', name: 'Me', relation: 'Self', dob: '' }]; localStorage.setItem('nexusProfiles', JSON.stringify(p)); }
    return p;
}
function getActiveProfileId() { return localStorage.getItem('nexusActiveProfile') || 'self'; }
function setActiveProfile(id) { localStorage.setItem('nexusActiveProfile', id); renderProfilesList(); renderMedsList(); renderVitalsHistory(); showToast('Switched profile'); }
function openProfiles() { renderProfilesList(); document.getElementById('profilesModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeProfiles() { document.getElementById('profilesModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
function addFamilyProfile() {
    const name = document.getElementById('profName').value.trim();
    const relation = document.getElementById('profRelation').value;
    const dob = document.getElementById('profDob').value;
    if (!name) { showToast('Enter a name.'); return; }
    const profiles = getFamilyProfiles();
    profiles.push({ id: 'p' + Date.now(), name, relation, dob });
    localStorage.setItem('nexusProfiles', JSON.stringify(profiles));
    document.getElementById('profName').value = '';
    renderProfilesList();
    showToast(`${name} added`);
}
function renderProfilesList() {
    const profiles = getFamilyProfiles();
    const active = getActiveProfileId();
    document.getElementById('profilesList').innerHTML = profiles.map(p => `
        <div class="nx-list-item">
            <div><div class="text-[11px] font-bold text-white">${p.name} ${p.id === active ? '<span style="color:var(--neon-cyan)">● Active</span>' : ''}</div>
            <div class="text-[9px] text-gray-500">${p.relation}${p.dob ? ' · ' + p.dob : ''}</div></div>
            ${p.id !== active ? `<button onclick="setActiveProfile('${p.id}')" class="btn-nexus text-[9px] px-3 py-1">Switch</button>` : ''}
        </div>`).join('');
    }


function getMedicalId() { return JSON.parse(localStorage.getItem('nexusMedicalId_' + getActiveProfileId()) || '{}'); }
function openMedId() {
    const id = getMedicalId();
    document.getElementById('idBloodType').value = id.bloodType || '';
    document.getElementById('idAllergies').value = id.allergies || '';
    document.getElementById('idConditions').value = id.conditions || '';
    document.getElementById('idEmergencyName').value = id.emergencyName || '';
    document.getElementById('idEmergencyPhone').value = id.emergencyPhone || '';
    document.getElementById('medIdModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeMedId() { document.getElementById('medIdModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
function saveMedicalId() {
    const id = {
        bloodType: document.getElementById('idBloodType').value,
        allergies: document.getElementById('idAllergies').value,
        conditions: document.getElementById('idConditions').value,
        emergencyName: document.getElementById('idEmergencyName').value,
        emergencyPhone: document.getElementById('idEmergencyPhone').value
    };
    localStorage.setItem('nexusMedicalId_' + getActiveProfileId(), JSON.stringify(id));
    showToast('Medical ID saved');
    closeMedId();
}

function openWearable() { document.getElementById('wearableModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeWearable() { document.getElementById('wearableModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }
function connectWearable(provider) {
    // TODO: bayan an gina native app (Capacitor), a maye gurbin wannan da
    // ainihin HealthKit/Google Fit permission request + data sync.
    showToast(`${provider === 'apple' ? 'Apple Health' : 'Google Fit'} needs the native app — coming soon.`);
        }

async function enablePushReminders() {
    if (!('Notification' in window)) { showToast('Push not supported on this browser.'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { showToast('Notification permission denied.'); return; }
    // MUHIMMI: ka canza wannan zuwa ainihin yadda kake samun FCM token
    // (Firebase Messaging SDK, getToken()) — wannan misali ne kawai.
    const messaging = firebase.messaging();
    const fcmToken = await messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' });
    await fetch('https://oryzon-backend-ed1q.onrender.com/save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: firebase.auth().currentUser.uid, token: fcmToken })
    });
    showToast('Push reminders enabled!');
}

function renderTrendChart() {
    const vitals = getVitals().slice(-14);
    const canvas = document.getElementById('vitalsTrendChart');
    if (!canvas || vitals.length < 2) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = 120;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const values = vitals.map(v => Number(v.hr) || 0);
    const max = Math.max(...values, 1), min = Math.min(...values);
    ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 2; ctx.beginPath();
    values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * canvas.width;
        const y = canvas.height - ((v - min) / (max - min || 1)) * (canvas.height - 20) - 10;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}
// Kira renderTrendChart() a karshen renderVitalsHistory() function din da ke can

/* ================= BLUETOOTH VITALS (Web Bluetooth API) ================= */
// NOTE: Web Bluetooth API works in CHROME/EDGE (Android & Desktop) ONLY.
// It does NOT work in Safari/iOS — Apple has not implemented this API.
// If the user is on iPhone, this feature should be hidden or show a fallback message.

const BP_SERVICE_UUID = 0x1810;
const BP_MEASUREMENT_UUID = 0x2A35;
const GLUCOSE_SERVICE_UUID = 0x1808;
const GLUCOSE_MEASUREMENT_UUID = 0x2A18;

// IEEE-11073 16-bit SFLOAT decoder — used by every official Bluetooth SIG
// GATT device for BP/Glucose.
function decodeSFLOAT(raw) {
    const mantissa = raw & 0x0FFF;
    let exponent = raw >> 12;
    if (exponent >= 0x8) exponent -= 0x10;
    let m = mantissa;
    if (m >= 0x0800) m -= 0x1000;
    if (m === 0x07FF) return NaN;
    return m * Math.pow(10, exponent);
}

async function connectBluetoothBP() {
    if (!navigator.bluetooth) { showToast('Bluetooth is not supported in this browser (Chrome/Edge required).'); return; }
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [BP_SERVICE_UUID] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(BP_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(BP_MEASUREMENT_UUID);
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            const systolic = decodeSFLOAT(value.getUint16(1, true));
            const diastolic = decodeSFLOAT(value.getUint16(3, true));
            document.getElementById('vBp').value = `${Math.round(systolic)}/${Math.round(diastolic)}`;
            showToast(`BP: ${Math.round(systolic)}/${Math.round(diastolic)} mmHg received`);
        });
        showToast(`Connected to ${device.name || 'BP monitor'}`);
    } catch (err) {
        console.error(err);
        showToast('Connection failed — make sure the device is powered on and in pairing mode.');
    }
}

async function connectBluetoothGlucose() {
    if (!navigator.bluetooth) { showToast('Bluetooth is not supported in this browser (Chrome/Edge required).'); return; }
    try {
        const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [GLUCOSE_SERVICE_UUID] }] });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(GLUCOSE_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(GLUCOSE_MEASUREMENT_UUID);
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            const flags = value.getUint8(0);
            const isMolL = (flags & 0x04) !== 0;
            const timePresent = (flags & 0x02) !== 0;
            let offset = 3;
            if (timePresent) offset += 7;
            let concentration = decodeSFLOAT(value.getUint16(offset, true));
            concentration = isMolL ? concentration * 18016 : concentration * 100000; // normalize to mg/dL
            document.getElementById('vGlucose').value = Math.round(concentration);
            showToast(`Blood sugar: ${Math.round(concentration)} mg/dL received`);
        });
        showToast(`Connected to ${device.name || 'Glucose meter'}`);
    } catch (err) {
        console.error(err);
        showToast('Connection failed — make sure the device is powered on and in pairing mode.');
    }
}



/* ------------------------------------------------------------
   SPA lifecycle — runs the DOM-dependent setup that used to fire
   automatically when this <script> sat at the bottom of the page.
   Registered with the router so it also re-runs every time the
   user navigates back to health.html (registerPage's init), and
   called once immediately below for the very first load (native
   full page load, or first-ever SPA navigation into this page).
   ------------------------------------------------------------ */
function initHealthPage() {
    const aiInput = document.getElementById('aiTextInput');
    if (aiInput) aiInput.addEventListener('input', autoResizeAiTextarea);
}

function destroyHealthPage() {
    clearTimeout(window._toastTimer);
}

if (window.NexusRouter) {
    NexusRouter.registerPage('health.html', { init: initHealthPage, destroy: destroyHealthPage });
}

initHealthPage();
