const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXoa9jjmye4AMvUFHiK_2wChRKWF-yA0qqWSLTHQJYY9Vr1h3NddRwkLQe8nwUvkH5/exec';
const EMAIL_TO='valentineuromed@gmail.com';
// URL de l'application Web Google Apps Script.
// Après déploiement de Code.gs, colle ici l'URL qui se termine par /exec.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXoa9jjmye4AMvUFHiK_2wChRKWF-yA0qqWSLTHQJYY9Vr1h3NddRwkLQe8nwUvkH5/exec';
// Optionnel : si tu définis APP_TOKEN dans les propriétés du script,
// mets la même valeur ici. Sinon laisse une chaîne vide.
const APP_TOKEN='';

const sections=[
['CONTRÔLE VISUEL',['Identification - étiquetage','Propreté générale','État général (structure, absence de fissures / corrosion, repose-pieds, ceinture de maintien …)','Vérification de la tension des rayons','Serrage des boulons (repose pieds, roulettes, carter de roulette, toile d’assise, côtés, dossier, chassis, module d’assise)','Pression des pneus']],
['CONTRÔLE FONCTIONNEL',['Roues (positionnement correct des roues arrières, roues avant et fixation …)','Mécanisme de pliage','Freins','Accoudoirs (relevables, amovibles, …)','Dossier inclinable','Bascule d’assise','Dispositif anti-bascule','Repose-jambes','Repose-pieds','Ceinture de maintien','Appui-tête','Tablette','Autres (cale tronc, plot d’abduction, double main courante…)']]
];
const root=document.getElementById('controls');
const NA_ITEMS=new Set(['Pression des pneus','Mécanisme de pliage','Accoudoirs (relevables, amovibles, …)','Dossier inclinable','Bascule d’assise','Dispositif anti-bascule','Repose-jambes','Repose-pieds','Ceinture de maintien','Appui-tête','Tablette','Autres (cale tronc, plot d’abduction, double main courante…)']);
sections.forEach(([title,items],si)=>{let t=document.createElement('table');t.className='control';t.innerHTML=`<thead><tr><th class="item">${title}</th><th>Non applicable</th><th>Conforme</th><th>Non conforme</th></tr></thead><tbody></tbody>`;let tb=t.querySelector('tbody');items.forEach((it,i)=>{let name=`c_${si}_${i}`;let naAvailable=NA_ITEMS.has(it);let tr=document.createElement('tr');tr.innerHTML=`<td class="item">${it}</td><td>${naAvailable?`<input type="radio" name="${name}" value="Non applicable">`:''}</td><td><input type="radio" name="${name}" value="Conforme"></td><td><input type="radio" name="${name}" value="Non conforme"></td>`;tb.appendChild(tr)});root.appendChild(t)});

document.getElementById('date').valueAsDate=new Date();
const obsolescence=document.getElementById('obsolescence');
const obsolescenceValue=document.getElementById('obsolescenceValue');
if(obsolescence && obsolescenceValue){
  const syncObsolescence=()=>{
    const v=Number(obsolescence.value);
    const colors={1:'#2e7d32',2:'#8bc34a',3:'#fbc02d',4:'#ef6c00',5:'#c62828'};
    obsolescenceValue.value=String(v);
    obsolescence.style.setProperty('--obs-color', colors[v]);
    obsolescenceValue.style.setProperty('--obs-color', colors[v]);
  };
  obsolescence.addEventListener('input',syncObsolescence);
  syncObsolescence();
}
function setupCanvas(id){const c=document.getElementById(id),ctx=c.getContext('2d');function resize(){const r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;ctx.scale(d,d);ctx.lineWidth=2;ctx.lineCap='round'}resize();let drawing=false,last=null;c.addEventListener('pointerdown',e=>{drawing=true;last=[e.offsetX,e.offsetY];c.setPointerCapture(e.pointerId)});c.addEventListener('pointermove',e=>{if(!drawing)return;ctx.beginPath();ctx.moveTo(last[0],last[1]);ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();last=[e.offsetX,e.offsetY]});c.addEventListener('pointerup',()=>drawing=false);c.addEventListener('pointercancel',()=>drawing=false);return c}const sigTech=setupCanvas('sigTech'),sigClient=setupCanvas('sigClient');document.querySelectorAll('.clear').forEach(b=>b.onclick=()=>{const c=document.getElementById(b.dataset.canvas);c.getContext('2d').clearRect(0,0,c.width,c.height)});
function val(id){return document.getElementById(id)?.value||''}function checked(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||''}
function collect(){const controls={};sections.forEach(([title,items],si)=>items.forEach((it,i)=>controls[it]=checked(`c_${si}_${i}`)));return {maintenance:checked('maintenance'),obsolescence:val('obsolescence'),marque:val('marque'),annee:val('annee'),serie:val('serie'),accessoires:checked('accessoires'),client:val('client'),localisation:val('localisation'),adresse:val('adresse'),ville:val('ville'),reference:val('reference'),observations:val('observations'),pieces:val('pieces'),date:val('date'),technicien:val('technicien'),controls, sigTech:sigTech.toDataURL('image/png'),sigClient:sigClient.toDataURL('image/png')}}

/* ==========================================================
   MODE MAINTENANCE DE PLUSIEURS FAUTEUILS — signature client unique
   ========================================================== */
let batchMode=false;
let batchFinalized=false;
let batchRecords=[];

const batchStart=document.getElementById('batchStart');
const normalMode=document.getElementById('normalMode');
const normalModeCard=document.getElementById('normalModeCard');
const multiModeCard=document.getElementById('multiModeCard');
const batchSave=document.getElementById('batchSave');
const batchFinish=document.getElementById('batchFinish');
const batchCancel=document.getElementById('batchCancel');
const batchStatus=document.getElementById('batchStatus');
const batchCount=document.getElementById('batchCount');
const clientSignatureBlock=document.getElementById('clientSignatureBlock');
const clientSignatureHint=document.getElementById('clientSignatureHint');

function updateBatchUI(){
  const n=batchRecords.length;
  const pdfButton=document.getElementById('pdf');
  const sendButton=document.getElementById('send');
  batchCount.textContent=`${n} fauteuil${n>1?'s':''}`;
  document.body.classList.toggle('batch-active',batchMode);
  normalModeCard?.classList.toggle('active',!batchMode);
  multiModeCard?.classList.toggle('active',batchMode);
  batchStart.disabled=batchMode;
  batchSave.disabled=!batchMode||batchFinalized;
  batchFinish.disabled=!batchMode||n===0||batchFinalized;
  batchCancel.disabled=!batchMode;
  if(pdfButton) pdfButton.disabled=batchMode&&!batchFinalized;
  if(sendButton) sendButton.disabled=batchMode&&!batchFinalized;
  if(pdfButton) pdfButton.textContent=batchFinalized?'📄 Générer le dossier PDF':'Générer le PDF';
  if(sendButton) sendButton.textContent=batchFinalized?'📧 Dossier PDF + E-mail':'Générer le PDF et envoyer par e-mail';
  if(!batchMode){
    batchStatus.innerHTML='🟢 <strong>MODE NORMAL ACTIF</strong> — 1 fauteuil à la fois, avec signature client pour ce certificat.';
    clientSignatureBlock.style.display='block';
    clientSignatureHint.textContent='';
  }else if(batchFinalized){
    batchStatus.innerHTML=`🟣 <strong>MODE MULTI-FAUTEUILS — SIGNATURE UNIQUE</strong> · ${n} fauteuil${n>1?'s':''} enregistrés. Le client signe une seule fois ci-dessous, puis les certificats peuvent être générés.`;
    clientSignatureBlock.style.display='block';
    clientSignatureHint.textContent='✍️ Cette signature sera automatiquement apposée sur tous les certificats de la tournée.';
  }else{
    batchStatus.innerHTML=n===0?'🟣 <strong>MODE MULTI-FAUTEUILS ACTIF</strong> — Réalisez le premier fauteuil puis enregistrez-le.':`🟣 <strong>MODE MULTI-FAUTEUILS ACTIF</strong> — ${n} fauteuil${n>1?'s':''} enregistré${n>1?'s':''}. Réalisez le fauteuil suivant puis enregistrez-le.`;
    clientSignatureBlock.style.display='none';
    clientSignatureHint.textContent='';
  }
}
function clearCanvas(canvas){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height)}
function resetFieldsForNext(){
  ['serie','annee','observations','pieces'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  document.querySelectorAll('input[name="accessoires"]').forEach(el=>el.checked=false);
  sections.forEach(([title,items],si)=>items.forEach((it,i)=>{document.querySelectorAll(`input[name="c_${si}_${i}"]`).forEach(el=>el.checked=false)}));
  const obs=document.getElementById('obsolescence'); if(obs){obs.value='1';obs.dispatchEvent(new Event('input'))}
  clearCanvas(sigClient);
  window.scrollTo({top:0,behavior:'smooth'});
}
function startBatch(){
  batchMode=true;batchFinalized=false;batchRecords=[];clearCanvas(sigClient);updateBatchUI();showMessage('Tournée multi-fauteuils démarrée.','success');window.scrollTo({top:0,behavior:'smooth'});
}
function saveCurrentItemToBatch(){
  if(!batchMode||batchFinalized)return;
  const d=collect();
  if(!d.serie.trim()){showMessage('Renseignez le N° de série / parc du fauteuil avant de l’enregistrer.','error');document.getElementById('serie')?.focus();return}
  d.sigClient='';
  batchRecords.push(d);
  updateBatchUI();
  showMessage(`Fauteuil ${batchRecords.length} enregistré. Préparez le fauteuil suivant.`,'success');
  resetFieldsForNext();
}
function finishBatch(){
  if(!batchMode)return;
  const currentSerie=val('serie').trim();
  if(currentSerie&&!batchFinalized){ saveCurrentItemToBatch(); }
  if(batchRecords.length===0){showMessage('Enregistrez au moins un fauteuil avant de terminer la tournée.','error');return;}
  batchFinalized=true;updateBatchUI();
  document.getElementById('clientSignatureBlock')?.scrollIntoView({behavior:'smooth',block:'center'});
  showMessage('La tournée est terminée. Faites signer le client une seule fois.','success');
}
function cancelBatch(){
  if(!batchMode)return;
  const ok=window.confirm(`Annuler la tournée et supprimer les ${batchRecords.length} fauteuil${batchRecords.length>1?'s':''} enregistrés ?`);
  if(!ok)return;
  batchMode=false;batchFinalized=false;batchRecords=[];clearCanvas(sigClient);updateBatchUI();showMessage('Tournée multi-fauteuils annulée.','info');
}
function canvasHasInk(canvas){
  try{
    const ctx=canvas.getContext('2d');
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    for(let i=3;i<data.length;i+=4){if(data[i]>0)return true;}
  }catch(e){}
  return false;
}
function applyClientSignatureToBatch(){
  if(!canvasHasInk(sigClient)) throw new Error('La signature du client est nécessaire avant de générer le dossier.');
  const sig=sigClient.toDataURL('image/png');
  return batchRecords.map(d=>({...d,sigClient:sig}));
}

function selectNormalMode(){
  if(batchMode){
    const ok=window.confirm('Revenir au mode normal ? Les fauteuils déjà enregistrés dans la tournée seront supprimés.');
    if(!ok)return;
    batchMode=false;batchFinalized=false;batchRecords=[];clearCanvas(sigClient);
  }
  updateBatchUI();
  showMessage('Mode normal sélectionné : 1 fauteuil à la fois.','info');
}

batchStart?.addEventListener('click',startBatch);
normalMode?.addEventListener('click',selectNormalMode);
batchSave?.addEventListener('click',saveCurrentItemToBatch);
batchFinish?.addEventListener('click',finishBatch);
batchCancel?.addEventListener('click',cancelBatch);
updateBatchUI();
function safe(s){return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}

/* ==========================================================
   SCANNER EAN-13 / CODE 128 / QR / DATA MATRIX
   Système repris du fichier index.html fourni par l'utilisateur.
   ========================================================== */
let activeScanner=null, activeField=null, activeScannerType=null;
const FIELD_LABELS={serie:'Fauteuil / parc'};
function showMessage(message,type='info'){
  const status=document.getElementById('status');
  if(status){status.textContent=message;status.dataset.type=type;}
}
function showScanSuccess(field,text,format){
  const modal=document.getElementById('scanSuccessModal');
  const title=document.getElementById('scanSuccessTitle');
  const value=document.getElementById('scanSuccessValue');
  const type=document.getElementById('scanSuccessType');
  title.textContent='Scan réussi !';
  value.textContent=String(text||'').trim();
  type.textContent=(format||'Code détecté')+' · '+(FIELD_LABELS[field]||field);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}
function closeScanSuccess(){
  const modal=document.getElementById('scanSuccessModal');
  if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
}
function setScanValue(field,text,format){
  const el=document.getElementById(field); if(!el)return;
  el.value=String(text||'').trim();
  showScanSuccess(field,el.value,format);
  showMessage('Scan réussi pour '+(FIELD_LABELS[field]||field),'success');
}
async function startScanner(field,mode='qr'){
  if(activeScanner) await stopScanner(activeField);
  activeField=field;
  const box=document.getElementById('scanner-'+field), reader=document.getElementById('reader-'+field);
  if(!box||!reader)return;
  box.style.display='block'; reader.innerHTML='';
  if(location.protocol!=='https:'&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
    showMessage('La caméra nécessite une page HTTPS. Ouvrez la page GitHub Pages en https://.','error'); box.style.display='none'; activeField=null; return;
  }
  const isQr=mode==='qr';
  const title=box.querySelector('.scanner-title'); if(title) title.textContent=isQr?'Scanner le QR Code — mode précis':'Scanner le code-barres — mode renforcé iPhone';
  if(!isQr){
    try{
      const Polyfill=await window.__zbarPolyfillReady; if(!Polyfill)throw new Error('BarcodeDetectorPolyfill indisponible');
      const previewContainer=reader; previewContainer.className='reader barcode-reader';
      const video=document.createElement('video'); video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','true');video.setAttribute('webkit-playsinline','true');video.style.width='100%';video.style.display='block';video.style.objectFit='cover';video.style.aspectRatio='16/9';previewContainer.appendChild(video);
      let stream; try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:30}},audio:false});}catch(e){stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});}
      video.srcObject=stream; await video.play(); await new Promise(r=>setTimeout(r,500));
      if(!video.videoWidth)throw new Error('Le flux caméra ne fournit aucune image vidéo.');
      const detector=new Polyfill({formats:['code_128','ean_13']});
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
      let last='',confirmations=0,lastAt=0,finished=false,running=true,detecting=false,timer=null;
      function regions(){const vw=video.videoWidth,vh=video.videoHeight,cw=Math.round(vw*.96),ch=Math.round(vh*.28),maxY=Math.max(0,vh-ch);return [0.32,.42,.50,.58,.68].map(c=>({sx:Math.round((vw-cw)/2),sy:Math.round(Math.min(maxY,Math.max(0,vh*c-ch/2))),cropW:cw,cropH:ch}));}
      function accept(text,format){if(!text||finished)return false;text=String(text).trim();const now=Date.now();if(text===last&&now-lastAt<2200)confirmations++;else{last=text;confirmations=1}lastAt=now;if(confirmations<2)return false;finished=true;setScanValue(field,text,String(format).toUpperCase().replace('_','-'));stopScanner(field);return true;}
      async function detect(){if(!running||finished||detecting||!video.videoWidth)return;detecting=true;try{for(const r of regions()){if(!running||finished)break;if(canvas.width!==r.cropW||canvas.height!==r.cropH){canvas.width=r.cropW;canvas.height=r.cropH}ctx.clearRect(0,0,r.cropW,r.cropH);ctx.drawImage(video,r.sx,r.sy,r.cropW,r.cropH,0,0,r.cropW,r.cropH);const codes=await detector.detect(canvas);if(codes&&codes.length){let ok=false;for(const c of codes){if((c.format==='code_128'||c.format==='ean_13')&&accept(c.rawValue,c.format)){ok=true;break}}if(ok)break}}}catch(e){}finally{detecting=false}}
      activeScanner={stream,video,timer:null,running:()=>{running=false}};activeScannerType='zbar';timer=setInterval(detect,110);activeScanner.timer=timer;await detect();setTimeout(()=>{if(activeScanner&&activeScanner.video===video)setCameraFocus()},600);
    }catch(e){console.error(e);showMessage("Impossible d'utiliser le moteur Code 128."+(e?.message?' ('+e.message+')':''),'error');box.style.display='none';activeScanner=null;activeScannerType=null;activeField=null}return;
  }
  try{
    if(!window.ZXingWASM||typeof window.ZXingWASM.readBarcodes!=='function')throw new Error('Le moteur ZXing WebAssembly n’est pas chargé.');
    reader.className='reader';reader.innerHTML='';const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','true');video.setAttribute('webkit-playsinline','true');video.style.width='100%';video.style.display='block';video.style.objectFit='cover';video.style.aspectRatio='4/3';reader.appendChild(video);const overlay=document.createElement('div');overlay.className='scan-overlay-2d';overlay.innerHTML='<span>QR / Data Matrix</span>';reader.appendChild(overlay);
    let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1440},frameRate:{ideal:30,max:30}},audio:false});}catch(e){stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});}
    video.srcObject=stream;await video.play();await new Promise(r=>setTimeout(r,700));if(!video.videoWidth)throw new Error('Le flux caméra ne fournit aucune image vidéo.');
    let running=true,detecting=false,finished=false,timer=null,last='',confirmations=0,lastAt=0;const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    function regions(){const vw=video.videoWidth,vh=video.videoHeight;return[{w:.92,h:.92,cx:.5,cy:.5},{w:.78,h:.78,cx:.5,cy:.5},{w:.62,h:.62,cx:.5,cy:.48},{w:.5,h:.5,cx:.5,cy:.46},{w:.42,h:.42,cx:.5,cy:.46}].map(r=>{const cw=Math.max(320,Math.round(vw*r.w)),ch=Math.max(320,Math.round(vh*r.h));return{sx:Math.max(0,Math.round(vw*r.cx-cw/2)),sy:Math.max(0,Math.round(vh*r.cy-ch/2)),cropW:Math.min(cw,vw),cropH:Math.min(ch,vh)}})}
    async function accept(text,format){if(!text||finished)return false;text=String(text).trim();const now=Date.now();if(text===last&&now-lastAt<2500)confirmations++;else{last=text;confirmations=1}lastAt=now;if(confirmations<2)return false;finished=true;const fmt=format==='DataMatrix'?'Data Matrix':format==='QRCode'?'QR Code':String(format||'Code 2D');setScanValue(field,text,fmt);await stopScanner(field);return true}
    async function detect(){if(!running||finished||detecting||!video.videoWidth)return;detecting=true;try{for(const r of regions()){if(!running||finished)break;if(canvas.width!==r.cropW||canvas.height!==r.cropH){canvas.width=r.cropW;canvas.height=r.cropH}ctx.drawImage(video,r.sx,r.sy,r.cropW,r.cropH,0,0,r.cropW,r.cropH);const data=ctx.getImageData(0,0,canvas.width,canvas.height);const results=await window.ZXingWASM.readBarcodes(data,{tryHarder:true,formats:['QRCode','DataMatrix'],maxNumberOfSymbols:1});if(results?.length){for(const result of results){const format=result.format||result.symbology||'';if((format==='DataMatrix'||format==='QRCode')&&await accept(result.text,format))break}}}}catch(e){}finally{detecting=false}}
    activeScanner={stream,video,timer:null,running:()=>{running=false}};activeScannerType='zxing2d';timer=setInterval(detect,140);activeScanner.timer=timer;await detect();setTimeout(()=>{if(activeScanner&&activeScanner.video===video)setCameraFocus()},700);
  }catch(e){console.error(e);showMessage("Impossible d'utiliser le lecteur QR / Data Matrix."+(e?.message?' ('+e.message+')':''),'error');box.style.display='none';activeScanner=null;activeScannerType=null;activeField=null}
}
function choosePhoto(field){const el=document.getElementById('file-'+field);if(el)el.click()}
async function scanPhoto(field,input){if(!input.files?.[0])return;showMessage('Analyse de la photo en cours…','info');let scanner=null;try{scanner=new Html5Qrcode('reader-'+field);const text=await scanner.scanFile(input.files[0],true);setScanValue(field,text.trim(),'Photo / code-barres')}catch(e){console.error(e);showMessage('Aucun code lisible sur la photo.','error')}finally{if(scanner){try{await scanner.clear()}catch(e){}}input.value=''}}
function getActiveVideoTrack(){return activeScanner?.stream?.getVideoTracks?.()[0]||null}
async function setCameraZoom(value){const track=getActiveVideoTrack();if(!track?.getCapabilities)return;try{const caps=track.getCapabilities();if(!('zoom'in caps)){showMessage("Le zoom matériel n'est pas disponible sur cette caméra.",'info');return}const min=Number.isFinite(caps.zoom.min)?caps.zoom.min:1,max=Number.isFinite(caps.zoom.max)?caps.zoom.max:value;await track.applyConstraints({advanced:[{zoom:Math.max(min,Math.min(max,Number(value)))}]})}catch(e){}}
async function setCameraFocus(){const track=getActiveVideoTrack();if(!track?.getCapabilities)return;try{const caps=track.getCapabilities(),advanced={};if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous'))advanced.focusMode='continuous';else if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('single-shot'))advanced.focusMode='single-shot';if(Object.keys(advanced).length)await track.applyConstraints({advanced:[advanced]})}catch(e){}}
async function stopScanner(field){const box=field?document.getElementById('scanner-'+field):null, s=activeScanner,t=activeScannerType;activeScanner=null;activeScannerType=null;activeField=null;if(!s){if(box)box.style.display='none';return}try{if(s.timer)clearInterval(s.timer);if(s.running)s.running();if(s.stream)s.stream.getTracks().forEach(x=>x.stop());if(s.video){try{s.video.pause()}catch(e){}s.video.srcObject=null}}catch(e){}if(box)box.style.display='none'}

function renderPDFPage(pdf,d){
  const W=210,M=10;
  pdf.setFont('helvetica');pdf.setFontSize(8);pdf.text('ENR10-V03',W-M,8,{align:'right'});
  pdf.addImage(document.querySelector('.top img').src,'JPEG',M,5,48,17);
  pdf.setFontSize(14);pdf.setFont('helvetica','bold');pdf.text('FICHE DE MAINTENANCE FAUTEUIL ROULANT MANUEL',W/2,29,{align:'center'});
  pdf.setFontSize(8);pdf.setFont('helvetica','normal');pdf.text(`Maintenance : ${d.maintenance||'—'}`,W/2,35,{align:'center'});
  let y=41;
  pdf.setDrawColor(100);pdf.rect(M,y,W-2*M,27);
  pdf.setFont('helvetica','bold');pdf.text('IDENTIFICATION',M+3,y+5);pdf.text('LOCALISATION',110,y+5);
  pdf.setFont('helvetica','normal');
  const left=[`Marque / modèle : ${d.marque}`,`Année de fabrication : ${d.annee}`,`N° série / parc : ${d.serie}`,`Accessoires : ${d.accessoires||'—'}`];
  const right=[`Établissement / client : ${d.client}`,`Service / chambre : ${d.localisation}`,`Adresse : ${d.adresse}`,`Ville : ${d.ville}`,`Réf. intervention : ${d.reference}`];
  left.forEach((s,i)=>pdf.text(s,M+3,y+11+i*5));right.forEach((s,i)=>pdf.text(s,110,y+11+i*5));y+=32;

  const hasNonConforme=Object.entries(d.controls||{}).some(([item,result])=>result==='Non conforme' && item.trim()!=='Propreté générale');
  if(hasNonConforme){pdf.setFillColor(255,205,205);pdf.roundedRect(M,y,W-2*M,8,1.5,1.5,'F');pdf.setTextColor(190,0,0);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text('MATÉRIEL NON CONFORME',W/2,y+5.4,{align:'center'});pdf.setTextColor(0,0,0);pdf.setFontSize(8);y+=11;}
  else{pdf.setFillColor(210,245,220);pdf.roundedRect(M,y,W-2*M,8,1.5,1.5,'F');pdf.setTextColor(20,125,55);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text('MATÉRIEL CONFORME',W/2,y+5.4,{align:'center'});pdf.setTextColor(0,0,0);pdf.setFontSize(8);y+=11;}

  for(const [title,items] of sections){
    if(y>265){pdf.addPage();y=12}
    pdf.setFont('helvetica','bold');pdf.setFillColor(232,238,241);pdf.rect(M,y,W-2*M,6,'F');pdf.text(title,M+2,y+4.2);y+=7;pdf.setFont('helvetica','normal');
    for(const it of items){if(y>270){pdf.addPage();y=12}pdf.rect(M,y,W-2*M,7);pdf.text(it,M+2,y+4.5,{maxWidth:128});const result=(d.controls||{})[it]||'—';
      if(result==='Non conforme'){pdf.setFillColor(255,185,185);pdf.roundedRect(166,y+1,32,5,1,1,'F');pdf.setTextColor(180,0,0);pdf.setFont('helvetica','bold');pdf.text(result,182,y+4.5,{align:'center'});pdf.setTextColor(0,0,0);pdf.setFont('helvetica','normal');}
      else if(result==='Conforme'){pdf.setFillColor(210,245,220);pdf.roundedRect(166,y+1,32,5,1,1,'F');pdf.setTextColor(20,125,55);pdf.setFont('helvetica','bold');pdf.text(result,182,y+4.5,{align:'center'});pdf.setTextColor(0,0,0);pdf.setFont('helvetica','normal');}
      else{pdf.text(result,172,y+4.5,{align:'center'})}y+=7;
    }y+=2;
  }
  if(y>240){pdf.addPage();y=12}
  pdf.setFont('helvetica','bold');pdf.text('OBSERVATIONS :',M,y+4);pdf.text('PIÈCES CHANGÉES :',110,y+4);pdf.rect(M,y+6,90,35);pdf.rect(110,y+6,90,35);
  const obsColor={1:[46,125,50],2:[139,195,74],3:[251,192,45],4:[239,108,0],5:[198,40,40]}[Number(d.obsolescence)]||[120,120,120];pdf.setFillColor(...obsColor);pdf.roundedRect(M+2,y+8,42,8,1.5,1.5,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.text(`OBSOLESCENCE : ${d.obsolescence||'—'} / 5`,M+23,y+13.3,{align:'center'});pdf.setTextColor(0,0,0);pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(d.observations||'',84),M+3,y+21);pdf.text(pdf.splitTextToSize(d.pieces||'',86),112,y+11);y+=45;
  // Zone signatures : on réserve une hauteur suffisante et on ajoute l'image
  // de signature en conservant son ratio. On recadre également les pixels
  // transparents autour du tracé pour éviter l'effet "signature coupée".
  if(y>244){pdf.addPage();y=12;}
  pdf.text(`Fait le : ${d.date||'—'}    Technicien : ${d.technicien||'—'}`,M,y+5);
  pdf.setFont('helvetica','bold');
  pdf.text('Signature du technicien',M,y+13);
  pdf.text('Signature du client',110,y+13);
  pdf.rect(M,y+15,90,30);
  pdf.rect(110,y+15,90,30);

  function addSignature(dataUrl,x,y,w,h){
    if(!dataUrl)return;
    try{
      const img=new Image();
      img.src=dataUrl;
      const c=document.createElement('canvas');
      const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
      if(!iw||!ih)return;
      c.width=iw;c.height=ih;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0);
      const pixels=ctx.getImageData(0,0,iw,ih).data;
      let minX=iw,minY=ih,maxX=-1,maxY=-1;
      for(let yy=0;yy<ih;yy++){
        for(let xx=0;xx<iw;xx++){
          const a=pixels[(yy*iw+xx)*4+3];
          const r=pixels[(yy*iw+xx)*4],g=pixels[(yy*iw+xx)*4+1],b=pixels[(yy*iw+xx)*4+2];
          // Transparent pixels and pure white background are ignored.
          if(a>20 && (r<245 || g<245 || b<245)){
            if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
          }
        }
      }
      if(maxX<0)return;
      const pad=8;
      minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
      maxX=Math.min(iw-1,maxX+pad);maxY=Math.min(ih-1,maxY+pad);
      const cw=maxX-minX+1,ch=maxY-minY+1;
      const ratio=Math.min(w/cw,h/ch);
      const dw=cw*ratio,dh=ch*ratio;
      const cropped=document.createElement('canvas');
      cropped.width=cw;cropped.height=ch;
      cropped.getContext('2d').drawImage(c,minX,minY,cw,ch,0,0,cw,ch);
      pdf.addImage(cropped.toDataURL('image/png'),'PNG',x+(w-dw)/2,y+(h-dh)/2,dw,dh);
    }catch(err){
      console.warn('Signature PDF non insérée',err);
    }
  }
  addSignature(d.sigTech,M+2,y+17,86,26);
  addSignature(d.sigClient,112,y+17,86,26);
}

function makePDFForData(d,pdf){
  if(!pdf)pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  renderPDFPage(pdf,d);
  return {pdf,data:d};
}
async function makePDF(){return makePDFForData(collect())}
async function makeBatchPDF(){
  if(!batchFinalized||batchRecords.length===0)throw new Error('Aucune tournée finalisée.');
  const records=applyClientSignatureToBatch();
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  records.forEach((d,i)=>{if(i>0)pdf.addPage();renderPDFPage(pdf,d)});
  return {pdf,data:records,records};
}

async function generateCurrentOrBatchPDF(){
  if(batchFinalized)return makeBatchPDF();
  return makePDF();
}

document.getElementById('pdf').onclick=async()=>{
  try{
    const result=await generateCurrentOrBatchPDF();
    if(batchFinalized){
      result.pdf.save(`ENR10-V03_Tournee_${new Date().toISOString().slice(0,10)}_${result.records.length}-fauteuils.pdf`);
      showMessage(`${result.records.length} certificats regroupés dans un seul PDF. Signature client unique appliquée.`,'success');
    }else{
      const data=result.data;result.pdf.save(`ENR10-V03_${data.serie||'maintenance'}_${data.date||''}.pdf`);
    }
  }catch(e){console.error(e);showMessage(e.message||'Erreur lors de la génération du PDF.','error')}
};

document.getElementById('send').onclick=async()=>{
  const status=document.getElementById('status');
  try{
    status.textContent='Préparation du PDF…';
    const result=await generateCurrentOrBatchPDF();
    const data=batchFinalized?result.records[0]:result.data;
    const filename=batchFinalized?`ENR10-V03_Tournee_${new Date().toISOString().slice(0,10)}_${result.records.length}-fauteuils.pdf`:`ENR10-V03_${data.serie||'maintenance'}_${data.date||''}.pdf`;
    if(!APPS_SCRIPT_URL || !APPS_SCRIPT_URL.startsWith('https://script.google.com/macros/s/')){
      status.textContent='URL Google Apps Script non configurée : le PDF va être téléchargé.';
      result.pdf.save(filename);return;
    }
    status.textContent=batchFinalized?'Envoi du dossier de maintenance…':'Envoi du PDF…';
    const b64=result.pdf.output('datauristring').split(',')[1];
    const params=new URLSearchParams({token:APP_TOKEN,pdf_base64:b64,filename,client:data.client,technicien:data.technicien,date:data.date,reference:data.reference,serie:batchFinalized?`${result.records.length} fauteuils`:data.serie});
    await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:params.toString()});
    status.textContent=batchFinalized?`Dossier de ${result.records.length} fauteuils transmis à ${EMAIL_TO}. Signature client unique appliquée.`:`Demande d’envoi transmise à ${EMAIL_TO}. Vérifiez la boîte de réception.`;
  }catch(e){
    console.error(e);status.textContent='Erreur lors de la transmission. Le PDF va être téléchargé.';
    try{const result=await generateCurrentOrBatchPDF();const filename=batchFinalized?`ENR10-V03_Tournee_${new Date().toISOString().slice(0,10)}_${result.records.length}-fauteuils.pdf`:`ENR10-V03_${result.data.serie||'maintenance'}_${result.data.date||''}.pdf`;result.pdf.save(filename)}catch(_){}
  }
};
