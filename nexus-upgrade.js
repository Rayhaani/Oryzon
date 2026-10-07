/* Nexus Upgrade: Voice Triage + Outbreak Radar + Digital Twin */
(function(){
if(window.__nuLoaded&&document.getElementById('nuSection'))return;window.__nuLoaded=1;
const $=id=>document.getElementById(id);
const css=`#nuSection{margin:0 0 28px}.nu-grid{display:grid;gap:12px}.nu-card{border:1px solid rgba(0,242,255,.25);background:linear-gradient(135deg,rgba(0,242,255,.06),rgba(255,255,255,.02));border-radius:22px;padding:18px;cursor:pointer;text-align:left}.nu-card h4{font-family:Orbitron,sans-serif;font-size:12px;margin:8px 0 4px;color:#fff}.nu-card p{font-size:11px;color:rgba(255,255,255,.6)}
.nu-modal{position:fixed;inset:0;z-index:9400;background:#050505;overflow-y:auto;display:none}.nu-modal.open{display:block}.nu-in{max-width:520px;margin:0 auto;padding:22px 18px 60px}.nu-x{float:right;background:none;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:50%;width:36px;height:36px;font-size:16px}
.nu-in h3{font-family:Orbitron,sans-serif;font-size:15px;color:#00f2ff;margin:6px 0 14px}.nu-in label{font-size:11px;color:rgba(255,255,255,.7);display:block;margin:12px 0 4px}
.nu-f{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:11px;color:#fff;font-size:13px;outline:none}
.nu-b{border:1px solid #00f2ff;color:#00f2ff;background:transparent;border-radius:40px;padding:11px 22px;font-size:11px;font-weight:700;margin:10px 8px 0 0}.nu-b.on{background:#00f2ff;color:#000}
.nu-res{margin-top:16px;border-radius:16px;padding:14px;font-size:12px;line-height:1.6}.nu-red{background:rgba(255,0,85,.1);border:1px solid #ff0055}.nu-amb{background:rgba(255,157,0,.1);border:1px solid #ff9d00}.nu-grn{background:rgba(34,197,94,.1);border:1px solid #22c55e}
.nu-note{font-size:10px;color:rgba(255,255,255,.4);margin-top:14px}.nu-row{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:11px}.nu-row span{width:90px}.nu-bar{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:5px;overflow:hidden}.nu-bar i{display:block;height:100%;background:#00f2ff}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---------- 1. VOICE TRIAGE (language-ready: add more via LANG packs later) ---------- */
const RULES=[
{k:['chest pain','tight chest'],l:3,n:'Chest pain',a:'This can be an emergency. Call emergency services or go to the nearest hospital now.'},
{k:['breath','breathing','shortness of breath'],l:3,n:'Breathing difficulty',a:'Breathing difficulty is urgent. Seek emergency care now.'},
{k:['faint','seizure','poison','bleeding','unconscious','stroke'],l:3,n:'Emergency sign',a:'This is an emergency sign. Get medical help immediately.'},
{k:['fever','chills','high temperature'],l:2,n:'Fever',a:'Rest and drink fluids. Get tested (flu, malaria, infection) within 24 hours. If it is a child or lasts over 2 days, seek care sooner.'},
{k:['diarrhea','diarrhoea','vomit','nausea'],l:2,n:'Diarrhea / Vomiting',a:'Take oral rehydration solution. If it lasts over 2 days or there is blood, see a doctor.'},
{k:['cough','cold','sore throat'],l:1,n:'Cough / Cold',a:'Rest and drink warm fluids. If a cough lasts over 2 weeks or has blood, see a doctor.'},
{k:['headache','migraine'],l:1,n:'Headache',a:'Rest and hydrate. If severe or with vision changes, see a doctor.'},
{k:['stomach','abdominal','belly pain'],l:1,n:'Stomach pain',a:'Avoid heavy food. If severe or persistent, see a doctor.'}];
let rec=null;
const LOC=navigator.language||'en-US';
function triage(t){t=(t||'').toLowerCase();const m=RULES.filter(r=>r.k.some(w=>t.includes(w))).sort((a,b)=>b.l-a.l);
const box=$('nuTriRes');if(!m.length){box.className='nu-res nu-amb';box.textContent='Symptom not recognised. Please describe it in more detail, or see a doctor.';return}
const r=m[0];box.className='nu-res '+(r.l==3?'nu-red':r.l==2?'nu-amb':'nu-grn');
box.innerHTML='<b>'+r.n+'</b><br>'+r.a+(m.length>1?'<br><small>Also detected: '+m.slice(1).map(x=>x.n).join(', ')+'</small>':'');
try{const u=new SpeechSynthesisUtterance(r.a);u.lang=LOC;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function listen(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SR){alert('Voice input is not supported in this browser. Please type your symptoms.');return}
rec=new SR();rec.lang=LOC;rec.onresult=e=>{const t=e.results[0][0].transcript;$('nuTriIn').value=t;triage(t)};
const rs=()=>{$('nuMic').textContent='🎤 Speak'};rec.onerror=rs;rec.onend=rs;
$('nuMic').textContent='● Listening...';rec.start()}

/* ---------- 2. OUTBREAK RADAR ---------- */
const SYM=['Fever','Diarrhea','Cough','Vomiting','Skin rash'];
const SEED=[['Lagos',0,2],['Lagos',1,1],['Nairobi',2,1],['London',0,1]];
function load(){try{return JSON.parse(localStorage.getItem('nuRadar')||'[]')}catch(e){return[]}}
function save(a){try{localStorage.setItem('nuRadar',JSON.stringify(a))}catch(e){}}
function drawRadar(){const d=load(),agg={};
SEED.forEach(s=>{const k=s[0]+'|'+s[1];agg[k]=(agg[k]||0)+s[2]});
d.forEach(r=>{const k=r.a+'|'+r.s;agg[k]=(agg[k]||0)+1});
const keys=Object.keys(agg).sort((a,b)=>agg[b]-agg[a]);const mx=Math.max(1,agg[keys[0]]||1);
$('nuRadarList').innerHTML=keys.map(k=>{const[a,s]=k.split('|');const n=agg[k];
return'<div class="nu-row"><span>'+a.replace(/</g,'')+'</span><div class="nu-bar"><i style="width:'+n/mx*100+'%;background:'+(n>=3?'#ff0055':'#00f2ff')+'"></i></div><b>'+n+'</b></div><div style="font-size:9px;color:#888;margin:-4px 0 6px 98px">'+SYM[s]+(n>=3?' ⚠ possible outbreak':'')+'</div>'}).join('')}
function report(){const a=$('nuArea').value.trim().slice(0,30);if(!a)return;const d=load();d.push({a:a[0].toUpperCase()+a.slice(1).toLowerCase(),s:+$('nuSym').value,t:Date.now()});save(d);$('nuArea').value='';drawRadar()}

/* ---------- 3. DIGITAL TWIN ---------- */
function twin(){const g=id=>+$(id).value,sl=g('nuSleep'),wa=g('nuWater'),sp=g('nuSteps'),sr=g('nuStress'),sm=$('nuSmoke').checked?1:0;
const c=x=>Math.max(0,Math.min(100,x));
const brain=c(100-Math.abs(sl-8)*14-sr*3),heart=c(40+sp/200-sr*3-sm*25+(sl>=6?10:0)),lung=c(95-sm*45+sp/500),gut=c(30+wa*8-sr*1.5);
const sc=Math.round((brain+heart+lung+gut)/4);const col=v=>'hsl('+Math.round(v*1.2)+',90%,50%)';
const set=(id,v)=>{const e=$(id);e.setAttribute('fill',col(v));e.dataset.v=Math.round(v)};
set('nuBrain',brain);set('nuHeart',heart);set('nuLung',lung);set('nuGut',gut);
$('nuScore').textContent=sc;$('nuScore').style.color=col(sc);
const w=[['Brain',brain],['Heart',heart],['Lungs',lung],['Gut',gut]].sort((a,b)=>a[1]-b[1])[0];
$('nuTip').textContent='Needs most attention: '+w[0]+' ('+Math.round(w[1])+'/100). '+(w[1]<60?'Improve sleep, hydration, activity or stress.':'Keep it up.')}

/* ---------- UI ---------- */
function modal(id,body){const m=document.createElement('div');m.className='nu-modal';m.id=id;m.innerHTML='<div class="nu-in"><button class="nu-x" onclick="this.closest(\'.nu-modal\').classList.remove(\'open\');try{speechSynthesis.cancel()}catch(e){}">✕</button>'+body+'</div>';document.body.appendChild(m)}
const NOTE='<p class="nu-note">Nexus is not a doctor and does not provide a diagnosis. If symptoms are severe, seek medical care immediately.</p>';
function build(){
if($('nuSection'))return;
const sec=document.createElement('div');sec.id='nuSection';
sec.innerHTML='<div class="nu-grid"><div class="nu-card" data-m="nuM1"><div style="font-size:24px">🎙️</div><h4>VOICE TRIAGE</h4><p>Speak your symptoms and get an instant urgency level.</p></div><div class="nu-card" data-m="nuM2"><div style="font-size:24px">📡</div><h4>OUTBREAK RADAR</h4><p>Live community symptom map with early outbreak alerts.</p></div><div class="nu-card" data-m="nuM3"><div style="font-size:24px">🫀</div><h4>DIGITAL TWIN</h4><p>Your body visualised, with a real-time Health Score.</p></div></div>';
const host=$('nexaGeneralView')||$('page-content')||document.body;host.insertBefore(sec,host.firstChild);
sec.querySelectorAll('.nu-card').forEach(c=>c.onclick=()=>{$(c.dataset.m).classList.add('open');if(c.dataset.m=='nuM2')drawRadar();if(c.dataset.m=='nuM3')twin()});
modal('nuM1','<h3>🎙️ VOICE TRIAGE</h3><button class="nu-b" id="nuMic">🎤 Speak</button><label>Or type your symptoms:</label><textarea id="nuTriIn" class="nu-f" rows="3" placeholder="e.g. I have a fever and a headache"></textarea><button class="nu-b on" id="nuGo">Check</button><div id="nuTriRes"></div>'+NOTE);
modal('nuM2','<h3>📡 OUTBREAK RADAR</h3><label>City / Area</label><input id="nuArea" class="nu-f" placeholder="e.g. Lagos"><label>Symptom</label><select id="nuSym" class="nu-f">'+SYM.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('')+'</select><button class="nu-b on" id="nuRep">Submit anonymous report</button><div style="margin-top:18px" id="nuRadarList"></div><p class="nu-note">Initial data is sample data. Reports are stored on this device only until connected to a live server. All reports are anonymous.</p>');
modal('nuM3','<h3>🫀 DIGITAL TWIN</h3><div style="text-align:center"><div style="font-size:11px;color:#aaa">HEALTH SCORE</div><div id="nuScore" style="font-family:Orbitron;font-size:44px;font-weight:900">--</div></div><svg viewBox="0 0 200 300" style="width:200px;display:block;margin:0 auto"><g fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"><circle cx="100" cy="35" r="26"/><rect x="62" y="65" width="76" height="110" rx="26"/><rect x="28" y="70" width="22" height="100" rx="11"/><rect x="150" y="70" width="22" height="100" rx="11"/><rect x="68" y="180" width="28" height="105" rx="12"/><rect x="104" y="180" width="28" height="105" rx="12"/></g><ellipse id="nuBrain" cx="100" cy="32" rx="16" ry="13" fill="#0f0"/><ellipse id="nuLung" cx="100" cy="95" rx="30" ry="18" fill="#0f0"/><circle id="nuHeart" cx="92" cy="108" r="9" fill="#0f0"/><ellipse id="nuGut" cx="100" cy="145" rx="20" ry="14" fill="#0f0"/></svg><div id="nuTip" class="nu-res nu-grn"></div><label>Sleep (hours): <b id="nuSl">7</b></label><input id="nuSleep" type="range" min="0" max="12" value="7" class="nu-f"><label>Water (glasses): <b id="nuWa">6</b></label><input id="nuWater" type="range" min="0" max="12" value="6" class="nu-f"><label>Daily steps: <b id="nuSt">5000</b></label><input id="nuSteps" type="range" min="0" max="15000" step="500" value="5000" class="nu-f"><label>Stress (1-10): <b id="nuSr">4</b></label><input id="nuStress" type="range" min="1" max="10" value="4" class="nu-f"><label><input type="checkbox" id="nuSmoke"> I smoke</label>'+NOTE);
$('nuMic').onclick=listen;$('nuGo').onclick=()=>triage($('nuTriIn').value);$('nuRep').onclick=report;
[['nuSleep','nuSl'],['nuWater','nuWa'],['nuSteps','nuSt'],['nuStress','nuSr']].forEach(p=>$(p[0]).oninput=()=>{$(p[1]).textContent=$(p[0]).value;twin()});
$('nuSmoke').onchange=twin}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
