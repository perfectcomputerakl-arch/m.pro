const $=id=>document.getElementById(id), money=n=>'₹'+(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Android WebView has no native window.open popup by default. Capture generated print documents and hand them to Android's PrintManager bridge.
if(window.AndroidPrint&&!window.__mdotPrintWindowPatched){window.__mdotPrintWindowPatched=true;window.open=function(){let html='';return{document:{write:s=>{html+=String(s)},close:()=>window.AndroidPrint.printHtml(html,'MDOT PRO Document')}}};}
const profiles=[['Fx053','3 Track Frame',1.680,'Standard Sliding 62/88/112'],['Fx052','2.5 Track Frame',1.390,'Standard Sliding 62/88/112'],['Fx051','2 Track Frame',1.200,'Standard Sliding 62/88/112'],['Fx055G','85 mm Sash',1.330,'Standard Sliding 62/88/112'],['Fx054G','66 mm Sash',1.050,'Standard Sliding 62/88/112'],['Fx062G','58 mm Sash',.885,'Standard Sliding 62/88/112'],['Fx057','Window Sash Interlock',.220,'Standard Sliding 62/88/112'],['Fx059','Sliding 5mm Glass Bead',.264,'Standard Sliding 62/88/112'],['Fx056W','Window Mesh Sash',.470,'Standard Sliding 62/88/112'],['Fx063','Sliding Sash Mullion',.860,'Standard Sliding 62/88/112']];
const defaults={W:0,I:0,B:0,G:0,glass:0,mesh:0,touch:0,roller:0,wool:3,interlock:0,bead:0,meshProfile:0,fastener:0,silicon:0,reinforcement:0};
const glassRateIds={'5mm Clear Toughened':'glassRate_5mm_Clear_Toughened','5mm Clear Float':'glassRate_5mm_Clear_Float','6mm Clear Toughened':'glassRate_6mm_Clear_Toughened','5mm Frosted Toughened':'glassRate_5mm_Frosted_Toughened','5mm Reflective Toughened':'glassRate_5mm_Reflective_Toughened'};
const lockRateIds=['21101','1101LS','21106','7508','7510','7512','1512'];
function selectedGlassRate(){return Number(rates['glass_'+$('glassSpec').value.replaceAll(' ','_')]||0)}let rates={...defaults,...JSON.parse(localStorage.mdRates||'{}')},customers=JSON.parse(localStorage.mdCustomers||'[]'),quotes=JSON.parse(localStorage.mdQuotes||'[]'),shop=JSON.parse(localStorage.mdShop||'{}'),last=null;
let quoteWindows=[],editingQuoteId=null,printingSavedQuote=false;
let upvcCustomRates=JSON.parse(localStorage.mdUpvcCustomRates||'[]');
function showApp(){ $('auth').hidden=true;$('app').hidden=false;$('shopTop').textContent=shop.name||'Fabricator Workspace';try{render()}catch(err){console.error('Workspace render error:',err);const n=document.getElementById('authError');if(n)n.textContent='Workspace खुल गया है, लेकिन कुछ screen data load नहीं हुआ। कृपया refresh करें।';}window.MDOTCloudSync?.start();}
// Secure account identity is handled by the same-origin Cloudflare Pages Function.
let authMode='login';
const authError=document.createElement('p');authError.id='authError';authError.className='muted';authError.setAttribute('role','alert');$('loginForm').appendChild(authError);
function updateAuthLabels(){
 const create=authMode==='register';
 $('companyNameWrap').hidden=!create;
 $('companyName').required=create;
 $('authSubmit').textContent=create?'Create account':'Sign in';
 $('authSwitch').textContent=create?'Already have an account? Sign in':'New to MDOT PRO? Create an account';
 $('authHelp').textContent=create?'Create your business owner account. Use a strong password with at least 10 characters.':'Sign in to open your MDOT PRO workspace.';
 $('loginPass').autocomplete=create?'new-password':'current-password';
 authError.textContent='';
}
$('authSwitch').onclick=()=>{authMode=authMode==='login'?'register':'login';updateAuthLabels()};
$('loginForm').onsubmit=async e=>{
 e.preventDefault();authError.textContent='Connecting securely…';$('authSubmit').disabled=true;
 const email=$('loginId').value.trim().toLowerCase(),password=$('loginPass').value;
 try{
  const endpoint=authMode==='register'?'/api/auth/register':'/api/auth/login';
  const payload=authMode==='register'?{email,password,companyName:$('companyName').value.trim()}:{email,password};
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Account service is unavailable. Please try again.');
  authError.textContent='';
  try{localStorage.removeItem('mdOwnerAccount');localStorage.removeItem('mdOwnerSession')}catch{}
  if(data.user?.companyName){shop.name=data.user.companyName;localStorage.setItem('mdShop',JSON.stringify(shop));}
  showApp();
 }catch(err){authError.textContent=err.message||'Network error. Please check your internet connection.';}
 finally{$('authSubmit').disabled=false;}
};
$('logout').onclick=async()=>{
 window.MDOTCloudSync?.stop();
 const button=$('logout');if(button)button.disabled=true;
 try{
  // Revoke the server cookie first. The Android bridge then explicitly expires
  // the WebView's HttpOnly cookie as an additional safeguard on app restart.
  await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});
 }catch(err){console.warn('Cloud logout request failed:',err);}
 if(window.AndroidSession?.clearSessionCookie){
  await new Promise(resolve=>{
   let finished=false;
   const done=()=>{if(finished)return;finished=true;delete window.__mdotNativeCookieCleared;resolve();};
   window.__mdotNativeCookieCleared=done;
   try{window.AndroidSession.clearSessionCookie();}catch(e){done();}
   setTimeout(done,2000);
  });
 }
 try{localStorage.removeItem('mdOwnerSession');localStorage.removeItem('mdOwnerAccount');}catch{}
 $('app').hidden=true;$('auth').hidden=false;$('loginPass').value='';authMode='login';updateAuthLabels();
 if(button)button.disabled=false;
};
async function restoreCloudSession(){
 updateAuthLabels();
 try{
  const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  if(data.user?.companyName&&!shop.name){shop.name=data.user.companyName;localStorage.setItem('mdShop',JSON.stringify(shop));}
  showApp();
 }catch(err){authError.textContent='Account service se connect nahi ho pa raha. Internet aur deployment settings check karein.';}
}
restoreCloudSession();
let mdPageHistory=['dashboard'];function page(id){const current=document.querySelector('.page:not([hidden])')?.id;if(current&&current!==id)mdPageHistory.push(current);document.querySelectorAll('.page').forEach(x=>x.hidden=x.id!==id);$('title').textContent=({dashboard:'Dashboard',estimator:'Window Estimator',rates:'Rate Board',profiles:'Profile Master',customers:'Customers',quotes:'Quotations',settings:'Shop Settings',aluminium:'Aluminium Calculator'})[id]||id;document.querySelector('.sidebar')?.classList.remove('menu-open');}document.querySelectorAll('[data-page],[data-open]').forEach(b=>b.onclick=()=>page(b.dataset.page||b.dataset.open));$('headerBack')?.addEventListener('click',()=>{const previous=mdPageHistory.pop()||'dashboard';document.querySelectorAll('.page').forEach(x=>x.hidden=x.id!==previous);$('title').textContent=previous==='estimator'?'Window Estimator':previous==='dashboard'?'Dashboard':previous;});$('headerMenu')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.toggle('menu-open'));
const rawVal=id=>Number($(id).value)||0;
const mmVal=id=>{const v=rawVal(id),u=$('sizeUnit')?.value||'mm';return u==='inch'?v*25.4:u==='ft'?v*304.8:v};
const val=rawVal;
function rateForProfile(kind){return kind==='frame'||kind==='sash'?rates[$('colour').value]||0:kind==='interlock'?rates.interlock:kind==='bead'?rates.bead:kind==='reinforcement'?rates.reinforcement:rates.meshProfile}
// UPVC configuration rules: FENSTECH STANDARD SLIDING 62 mm allows only "2 Glass Panels".
// Other systems keep their full, unchanged configuration list.
let allConfigOptions=null;
function syncConfigOptions(){
 const cfg=$('config'),series=$('series');
 if(!cfg||!series)return;
 if(!allConfigOptions)allConfigOptions=Array.from(cfg.options).map(o=>({value:o.value,text:o.textContent}));
 const only2Glass=series.value==='62mm';
 const allowed=allConfigOptions.filter(o=>!only2Glass||(o.value!=='3g'&&o.value!=='2g1m'));
 const current=cfg.value;
 if(Array.from(cfg.options).map(o=>o.value).join('|')!==allowed.map(o=>o.value).join('|')){cfg.innerHTML='';allowed.forEach(o=>cfg.add(new Option(o.text,o.value)))}
 const next=allowed.some(o=>o.value===current)?current:allowed[0]?.value;
 if(next!==undefined)cfg.value=next;
}
function calc(){
 syncConfigOptions();
 const W=mmVal('width'),H=mmVal('height'),w=W/1000,h=H/1000,q=Math.max(1,val('qty'));
 const config=$('config').value,isToiletDoor=/toilet\s*door/i.test($('product').value),glassPanels=isToiletDoor?1:(config==='3g'?3:2),meshPanels=isToiletDoor?0:(config==='2g1m'?1:0),moving=glassPanels+meshPanels;
 const frameCode={'112mm':'Fx053','88mm':'Fx052','62mm':'Fx051'}[$('series').value],sashCode=$('sash').value;
 const lookup=code=>profiles.find(p=>p[0]===code)||['','',0,''];
 // Fabrication rule: each panel uses two full-height rails and two half-width rails.
 const glassSashMetres=glassPanels*2*(h+w/2)*q;
 const meshSashMetres=meshPanels*2*(h+w/2)*q;
 const frameMetres=2*(w+h)*q;
 const interlockMetres=h*Math.max(0,moving-1)*q;
 const beadMetres=glassPanels*2*(h+w/2)*q;
 const sashTotal=glassSashMetres+meshSashMetres;
 const data=[
  ['Frame',frameCode,frameMetres,lookup(frameCode)[2],'frame'],
  ['Glass Sash',sashCode,glassSashMetres,lookup(sashCode)[2],'sash'],
  ['Mesh Sash','Fx056W',meshSashMetres,.470,'meshProfile'],
  ['Interlock','Fx057',interlockMetres,.220,'interlock'],
  ['Glass beading','Fx059',beadMetres,.264,'bead'],
  ['Steel Reinforcement','Frame + Glass Sash + Mesh Sash',frameMetres+sashTotal,.300,'reinforcement']
 ];
 let profCost=0,totalWeight=0;
 const rows=data.map(([name,code,m,kgm,kind])=>{const kg=m*kgm,cost=kg*rateForProfile(kind);profCost+=cost;totalWeight+=kg;return{name,code,m,kgm,kg,cost,kind}});
 $('materialRows').innerHTML=rows.map(r=>`<tr><td>${r.name}</td><td>${r.code}</td><td>${r.m.toFixed(3)} m</td><td>${r.kg.toFixed(3)} kg</td><td>${money(rateForProfile(r.kind))}/kg</td><td>${money(r.cost)}</td></tr>`).join('');
 // Round total window width and height upward to the next 6-inch increment, then allocate area by panel count.
 const step=152.4,roundedW=Math.ceil(W/step)*step,roundedH=Math.ceil(H/step)*step;
 const roundedTotalSqFt=(roundedW/304.8)*(roundedH/304.8)*q;
 const glassArea=roundedTotalSqFt*glassPanels/moving,meshArea=roundedTotalSqFt*meshPanels/moving;
 $('glassArea').value=glassArea.toFixed(2);$('meshArea').value=meshArea.toFixed(2);
 const glassRate=selectedGlassRate();$('glassRate').value=glassRate;
 const glass=glassArea*glassRate,mesh=meshArea*val('meshRate');
 const lockName=$('lockSelect').selectedOptions[0].text,bearingName=$('bearingSelect').selectedOptions[0].text;
 const lockRate=Number(rates['lock_'+$('lockSelect').value]||0);$('lockRate').value=lockRate;
 $('woolQty').value=sashTotal.toFixed(3);
 const is3Track=$('series').value==='112mm',lockQty=is3Track?2*q:Math.max(1,val('lockQty')),bearingQty=is3Track?6*q:Math.max(0,val('bearingQty'));
 $('lockQty').value=lockQty;$('bearingQty').value=bearingQty;$('fastenerQty').value=10*q;$('siliconQty').value=q;
 const hw=[[lockName,lockQty,lockRate],[bearingName,bearingQty,val('bearingRate')],['Wool File',sashTotal,rates.wool],['Fastener Screw & Cap',val('fastenerQty'),rates.fastener],['Silicon Tube',val('siliconQty'),rates.silicon]];
 const customItems=upvcCustomRates.map(item=>{const qty=Number($('customQty_'+item.id)?.value||0);return {...item,qty,cost:qty*q*Number(item.rate||0)}}).filter(x=>x.qty>0);
 const customCost=customItems.reduce((sum,item)=>sum+item.cost,0);
 const hwCost=hw.reduce((s,x)=>s+x[1]*x[2],0)+customCost;
 $('hardwareRows').innerHTML=hw.map(x=>`<tr><td>${x[0]}</td><td>${Number(x[1]).toFixed(3)}</td><td>${money(x[2])}</td><td>${money(x[1]*x[2])}</td></tr>`).join('')+customItems.map(x=>`<tr><td>${esc(x.name)} (custom)</td><td>${x.qty} ${esc(x.unit||'nos')}</td><td>${money(x.rate)}</td><td>${money(x.cost)}</td></tr>`).join('');
 const sashRows=[['Glass Sash',sashCode,`2 × ${H.toFixed(0)} mm + 2 × ${(W/2).toFixed(0)} mm per panel`,glassPanels,glassSashMetres],['Mesh Sash','Fx056W',`2 × ${H.toFixed(0)} mm + 2 × ${(W/2).toFixed(0)} mm per panel`,meshPanels,meshSashMetres]];
 $('sashRows').innerHTML=sashRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]} panel(s) × ${q} window(s)</td><td><b>${r[4].toFixed(3)} m</b></td></tr>`).join('');
 $('sashTotalMetres').textContent=sashTotal.toFixed(3)+' M';
 const areaSqFt=(W/304.8)*(H/304.8)*q,labour=areaSqFt*val('labourRate'),expense=labour+val('other')*q;
 const manufacturing=profCost+glass+mesh+hwCost+expense,profit=manufacturing*val('profit')/100,gst=(manufacturing+profit)*val('gst')/100,total=manufacturing+profit+gst;
 [['profileCost',profCost],['glassCost',glass],['meshCost',mesh],['hardwareCost',hwCost],['expenseCost',expense],['manufacturing',manufacturing],['profitValue',profit],['gstValue',gst],['grandTotal',total],['perWindow',total/q]].forEach(([id,n])=>$(id).textContent=money(n));
 last={rows,glassArea,meshArea,glass,mesh,hw,customItems,customCost,hwCost,profCost,expense,manufacturing,profit,gst,total,totalWeight,q,w:W,h:H,customer:$('customer').value,product:$('product').value,config:$('config').selectedOptions[0].text,lockSide:$('lockSide').value,series:'STANDARD SLIDING 62/88/112 mm',sash:sashCode,colour:$('colour').selectedOptions[0].text,lockName,bearingName,areaSqFt,glassSpec:$('glassSpec').value,glassRate,lockQty,bearingQty,sashMetres:sashTotal,glassSashMetres,meshSashMetres,frameMetres,roundedGlassWidth:roundedW,roundedGlassHeight:roundedH,fastenerQty:val('fastenerQty'),siliconQty:val('siliconQty')};const livePreview=$('upvcLivePreview');if(livePreview)livePreview.innerHTML=windowElevation(last);return last;
}
['width','height','sizeUnit','qty','series','config','sash','colour','profit','gst','labourRate','other','lockQty','lockRate','lockSide','bearingQty','bearingRate','fastenerQty','siliconQty','glassSpec','meshRate','woolQty'].forEach(id=>$(id).addEventListener('input',calc));
$('config').onchange=calc;$('product').onchange=()=>{calc();};$('upvcCustomItems')?.addEventListener('input',calc);$('series').onchange=calc;syncConfigOptions();$('sash').onchange=calc;$('lockSelect').onchange=calc;$('bearingSelect').onchange=calc;
function renderUpvcCustomRates(){
 const board=$('upvcCustomRateRows'); if(board) board.innerHTML=upvcCustomRates.map(item=>`<tr><td><input data-custom-name="${item.id}" value="${esc(item.name)}"></td><td><input data-custom-unit="${item.id}" value="${esc(item.unit||'nos')}"></td><td><input type="number" min="0" step=".01" data-custom-rate="${item.id}" value="${Number(item.rate||0)}"></td><td><button type="button" data-custom-delete="${item.id}" class="secondary">Delete</button></td></tr>`).join('');
 const estimator=$('upvcCustomItems'); if(estimator) estimator.innerHTML=upvcCustomRates.length?`<div class="tablewrap"><table><thead><tr><th>Additional item</th><th>Qty / window</th><th>Rate</th></tr></thead><tbody>${upvcCustomRates.map(item=>`<tr><td>${esc(item.name)} (${esc(item.unit||'nos')})</td><td><input id="customQty_${item.id}" type="number" min="0" step=".01" value="0" style="max-width:110px"></td><td>${money(item.rate)}</td></tr>`).join('')}</tbody></table></div>`:'No custom UPVC items added yet.';
}
$('addUpvcCustomRate')?.addEventListener('click',()=>{const name=$('newUpvcItemName').value.trim();if(!name)return alert('Enter item name.');upvcCustomRates.push({id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,unit:$('newUpvcItemUnit').value.trim()||'nos',rate:Number($('newUpvcItemRate').value)||0});localStorage.mdUpvcCustomRates=JSON.stringify(upvcCustomRates);$('newUpvcItemName').value='';$('newUpvcItemRate').value='';renderUpvcCustomRates();calc();});
$('upvcCustomRateRows')?.addEventListener('input',e=>{const el=e.target,id=el.dataset.customName||el.dataset.customUnit||el.dataset.customRate;if(!id)return;const item=upvcCustomRates.find(x=>x.id===id);if(!item)return;if(el.dataset.customName)item.name=el.value;if(el.dataset.customUnit)item.unit=el.value;if(el.dataset.customRate!==undefined)item.rate=Number(el.value)||0;localStorage.mdUpvcCustomRates=JSON.stringify(upvcCustomRates);calc();});
$('upvcCustomRateRows')?.addEventListener('change',()=>{renderUpvcCustomRates();calc()});
$('upvcCustomRateRows')?.addEventListener('click',e=>{const id=e.target.dataset.customDelete;if(!id)return;if(!confirm('Delete this UPVC rate item?'))return;upvcCustomRates=upvcCustomRates.filter(x=>x.id!==id);localStorage.mdUpvcCustomRates=JSON.stringify(upvcCustomRates);renderUpvcCustomRates();calc();});
renderUpvcCustomRates();
function loadRates(){let ids={W:'rateW',I:'rateI',B:'rateB',G:'rateG',mesh:'defaultMesh',roller:'rollerRate',wool:'woolRate',interlock:'interlockRate',bead:'beadRate',meshProfile:'meshProfileRate',fastener:'fastenerRate',silicon:'siliconRate',reinforcement:'reinforcementRate'};Object.entries(ids).forEach(([k,id])=>$(id).value=rates[k]??0);$('meshRate').value=rates.mesh;$('bearingRate').value=rates.roller;lockRateIds.forEach(code=>{$('lockRate_'+code).value=rates['lock_'+code]??0});Object.entries(glassRateIds).forEach(([spec,id])=>$(id).value=rates['glass_'+spec.replaceAll(' ','_')]??0);$('lockRate').value=rates['lock_'+$('lockSelect').value]??0;$('glassRate').value=selectedGlassRate()}loadRates();$('saveRates').onclick=()=>{let ids={W:'rateW',I:'rateI',B:'rateB',G:'rateG',mesh:'defaultMesh',roller:'rollerRate',wool:'woolRate',interlock:'interlockRate',bead:'beadRate',meshProfile:'meshProfileRate',fastener:'fastenerRate',silicon:'siliconRate',reinforcement:'reinforcementRate'};Object.entries(ids).forEach(([k,id])=>rates[k]=val(id));lockRateIds.forEach(code=>rates['lock_'+code]=val('lockRate_'+code));Object.entries(glassRateIds).forEach(([spec,id])=>rates['glass_'+spec.replaceAll(' ','_')]=val(id));localStorage.mdRates=JSON.stringify(rates);$('rateMsg').textContent='Rates saved on this device.';calc()};$('glassSpec').addEventListener('change',calc);$('lockSelect').addEventListener('change',calc);$('bearingRate').addEventListener('input',calc);$('meshRate').addEventListener('input',calc);

const formIds=['customer','customerMobile','customerAddress','windowCode','glassSpec','product','series','config','sizeUnit','width','height','colour','qty','sash','profit','gst','labourRate','other','lockSelect','lockSide','bearingSelect','bearingRate','lockQty','bearingQty'];
function captureForm(){const o={};formIds.forEach(id=>{const e=$(id);if(e)o[id]=e.value});o.customQty=Object.fromEntries(upvcCustomRates.map(item=>[item.id,$('customQty_'+item.id)?.value||'0']));return o}
function restoreForm(o){if(!o)return;Object.entries(o).forEach(([id,v])=>{if(id!=='customQty'&&$(id))$(id).value=v});renderUpvcCustomRates();Object.entries(o.customQty||{}).forEach(([id,v])=>{const e=$('customQty_'+id);if(e)e.value=v});calc()}
function refreshWindowItems(){const el=$('windowItemsList');if(!el)return;el.innerHTML=quoteWindows.length?quoteWindows.map((it,i)=>`<div class="saved-quote"><div><b>${esc(it.form.windowCode||'W'+(i+1))} · ${esc(it.form.product||'Window')}</b><small>${it.calc.w} × ${it.calc.h} mm · Qty ${it.calc.q} · ${money(it.calc.total)}</small></div><div class="quote-actions"><button type="button" onclick="removeWindowItem(${i})">Remove</button></div></div>`).join(''):'No additional windows added.'}
window.removeWindowItem=i=>{quoteWindows.splice(i,1);refreshWindowItems()};
$('addWindowItem').onclick=()=>{const x=calc();if(!x.w||!x.h){alert('Enter valid window width and height.');return}quoteWindows.push({form:captureForm(),calc:JSON.parse(JSON.stringify(x))});refreshWindowItems();};
$('clearWindowItems').onclick=()=>{quoteWindows=[];refreshWindowItems();};
$('saveQuote').onclick=()=>{const x=calc(),currentForm=captureForm();let items=quoteWindows.map(it=>({form:{...it.form},calc:it.calc}));const same=items.length&&JSON.stringify(items[items.length-1].form)===JSON.stringify(currentForm);if(!same)items.push({form:currentForm,calc:JSON.parse(JSON.stringify(x))});if(!items.length){alert('Add at least one quotation item.');return}const quote={id:editingQuoteId||'MPR-'+Date.now(),date:new Date().toLocaleDateString('en-IN'),customer:items[0].calc.customer||x.customer,items,total:items.reduce((s,it)=>s+Number(it.calc.total||0),0)};if(editingQuoteId){const i=quotes.findIndex(q=>q.id===editingQuoteId);if(i>=0)quotes[i]=quote;else quotes.unshift(quote)}else quotes.unshift(quote);localStorage.mdQuotes=JSON.stringify(quotes);editingQuoteId=null;quoteWindows=[];refreshWindowItems();$('saveQuote').textContent='Save quotation';render();alert('Quotation saved on this device.');page('quotes')};

function printDoc(internal){
 const current=calc(),currentForm=captureForm(),items=quoteWindows.map(it=>({form:it.form,calc:it.calc}));if(!items.length||JSON.stringify(items[items.length-1].form)!==JSON.stringify(currentForm))items.push({form:currentForm,calc:JSON.parse(JSON.stringify(current))});const business=shop.name||'Fabricator',address=shop.address||'',contact=shop.mobile||'',logo=shopLogoData||'logo.png';
 const itemBlocks=items.map((it,i)=>{const x=it.calc,rows=(x.rows||[]).map(r=>`<tr><td>${esc(r.name)} (${esc(r.code)})</td><td>${Number(r.m||0).toFixed(3)} m</td><td>${Number(r.kg||0).toFixed(3)} kg</td><td>${money(rateForProfile(r.kind))}/kg</td><td>${money(r.cost)}</td></tr>`).join('');return `<h3>${i+1}. ${esc(it.form?.windowCode||'Item '+(i+1))} · ${esc(it.form?.product||x.product||'Window')} · ${x.w} × ${x.h} mm · Qty ${x.q}</h3><table><tr><th>Material</th><th>Length</th><th>Weight</th><th>Rate</th><th>Cost</th></tr>${rows}</table><p>Glass: ${Number(x.glassArea||0).toFixed(2)} sq.ft (${money(x.glass)}) · Mesh: ${Number(x.meshArea||0).toFixed(2)} sq.ft (${money(x.mesh)}) · Hardware: ${money(x.hwCost)} · Labour/other: ${money(x.expense)}</p><p>Manufacturing: ${money(x.manufacturing)} · Profit: ${money(x.profit)} · GST: ${money(x.gst)} · <b>Item Total: ${money(x.total)}</b></p>`}).join('');
 const total=items.reduce((s,it)=>s+Number(it.calc.total||0),0),gst=items.reduce((s,it)=>s+Number(it.calc.gst||0),0),base=total-gst;
 const body=internal?`<h2>INTERNAL COST ESTIMATE</h2>${itemBlocks}<h2>Final estimate total: ${money(total)}</h2>`:`<h2>CUSTOMER QUOTATION</h2><table><tr><th>Item</th><th>Product</th><th>Size</th><th>Qty</th><th>Amount</th></tr>${items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.form?.product||it.calc.product||'Window')}</td><td>${it.calc.w} × ${it.calc.h} mm</td><td>${it.calc.q}</td><td>${money(it.calc.total)}</td></tr>`).join('')}</table><p>Subtotal: ${money(base)} · GST: ${money(gst)}</p><h2>Grand Total: ${money(total)}</h2>`;
 const win=window.open('','_blank');if(!win){alert('Please allow pop-ups to print / save PDF.');return}win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>MDOT PRO ${internal?'Internal Estimate':'Quotation'}</title><style>@page{size:A4;margin:14mm}body{font:13px Arial;padding:10px;color:#18243a}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #b58a43;padding-bottom:12px}header img{max-width:110px;max-height:75px;object-fit:contain}h1{color:#174a85}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eaf0f8}.muted,footer{color:#667085}footer{text-align:right;border-top:1px solid #ddd;padding-top:8px;margin-top:24px}</style></head><body><header><img src="${logo}" onerror="this.style.display='none'"><div><h1>${esc(business)}</h1>${esc(address)}<br>${esc(contact)}<br><b>MDOT PRO · Professional Estimate</b></div></header><p>Document No: MPR-${Date.now()} · Date: ${new Date().toLocaleDateString('en-IN')} · Customer: ${esc(current.customer||'Customer')}</p>${body}<footer>Powered by MDOT PRO · ${esc(business)}</footer><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);win.document.close();
}
$('printQuote').onclick=brandedCustomerQuote;$('internalPrint').onclick=()=>printDoc(true);
$('profileSearch').oninput=renderProfiles;function renderProfiles(){let q=$('profileSearch').value.toLowerCase();$('profileRows').innerHTML=profiles.filter(p=>p.join(' ').toLowerCase().includes(q)).map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td><td>${p[3]}</td></tr>`).join('')}
$('addCustomer').onclick=()=>{let name=$('newCustomer').value.trim();if(!name)return;customers.push({name,mobile:$('newMobile').value});localStorage.mdCustomers=JSON.stringify(customers);$('newCustomer').value='';$('newMobile').value='';render()};$('saveShop').onclick=()=>{shop={name:$('shopName').value,owner:$('owner').value,mobile:$('mobile').value,email:$('email').value,address:$('address').value,gstin:$('gstin').value};localStorage.mdShop=JSON.stringify(shop);$('shopTop').textContent=shop.name;$('shopMsg').textContent='Business details saved on this device.'};
window.deleteSavedQuote=i=>{if(!confirm('Delete this saved quotation?'))return;quotes.splice(i,1);localStorage.mdQuotes=JSON.stringify(quotes);render()};

window.editSavedQuote=i=>{const q=quotes[i];if(!q)return;editingQuoteId=q.id;quoteWindows=(q.items||[]).map(it=>({form:it.form||{},calc:it.calc||it}));if(quoteWindows.length)restoreForm(quoteWindows[0].form);refreshWindowItems();$('saveQuote').textContent='Update quotation';page('estimator')};
window.shareSavedQuote=i=>{const q=quotes[i],items=q.items||[];const lines=items.map((it,n)=>`${n+1}. ${it.form?.product||'Window'} ${it.calc?.w||0} × ${it.calc?.h||0} mm, Qty ${it.calc?.q||1}: ${money(it.calc?.total||0)}`).join('\n');const text=`MDOT PRO QUOTATION\nCustomer: ${q.customer||'Customer'}\n${lines}\nGrand Total: ${money(q.total)}`;if(window.AndroidPrint&&window.AndroidPrint.shareText){window.AndroidPrint.shareText('MDOT PRO Quotation',text)}else if(navigator.share){navigator.share({title:'MDOT PRO Quotation',text}).catch(()=>{})}else if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>alert('Quotation summary copied.'))}else{alert(text)}};
window.printSavedQuote=i=>{const q=quotes[i];if(!q)return;quoteWindows=(q.items||[]).map(it=>({form:it.form||{},calc:it.calc||it}));if(quoteWindows.length)restoreForm(quoteWindows[0].form);printingSavedQuote=true;brandedCustomerQuote();printingSavedQuote=false};
function render(){ $('customerCount').textContent=customers.length;$('estimateCount').textContent=quotes.length;$('quoteCount').textContent=quotes.length;$('salesValue').textContent=money(quotes.reduce((s,q)=>s+(q.total||0),0));$('customerRows').innerHTML=customers.map(c=>`<p>${c.name} · ${c.mobile||''}</p>`).join('')||'No customers yet';$('quoteRows').innerHTML=quotes.map((q,i)=>{const items=q.items||[{calc:q,form:{product:q.product,windowCode:'W1'}}];const detail=items.map(it=>`${it.form?.product||'Window'} ${it.calc?.w||0}×${it.calc?.h||0} mm`).join(' · ');return `<div class="saved-quote"><div><b>${q.customer||'Customer'}</b><small>${detail} · ${items.length} item(s) · ${money(q.total)}</small></div><div class="quote-actions"><button onclick="editSavedQuote(${i})">Edit / Update</button><button onclick="shareSavedQuote(${i})">Share</button><button onclick="printSavedQuote(${i})">Print / PDF</button><button onclick="deleteSavedQuote(${i})">Delete</button></div></div>`}).join('')||'No quotations saved';if(shop.name){$('shopName').value=shop.name;$('owner').value=shop.owner||'';$('mobile').value=shop.mobile||'';$('email').value=shop.email||'';$('address').value=shop.address||'';$('gstin').value=shop.gstin||''}renderProfiles();calc()}render();

// Branded customer quotation module (A4 layout with live window elevation preview).
let shopLogoData=localStorage.mdShopLogo||'';
const logoInput=$('shopLogoFile');
if(logoInput){
  logoInput.onchange=()=>{const f=logoInput.files&&logoInput.files[0];if(!f)return;
    const reader=new FileReader();reader.onload=()=>{shopLogoData=reader.result;$('shopLogoPreview').src=shopLogoData;localStorage.mdShopLogo=shopLogoData;};reader.readAsDataURL(f);};
  $('shopLogoPreview').src=shopLogoData||'logo.png';
}
// Describes one window from its saved calculation (panel counts, track text, label). Used by the diagram AND the quotation details so both always agree.
function windowKind(x){
  const cfg=String((x&&x.config)||'');
  const isToiletDoor=/toilet\s*door/i.test(String((x&&x.product)||''));
  const twoGlassOneMesh=!isToiletDoor&&/2\s*glass\s*\+\s*1\s*mesh/i.test(cfg);
  const threeGlass=!isToiletDoor&&/3\s*glass/i.test(cfg);
  const count=isToiletDoor?1:(twoGlassOneMesh?2:(threeGlass?3:2));
  const glassPanels=isToiletDoor?1:(threeGlass?3:2);
  const meshPanels=twoGlassOneMesh?1:0;
  const trackCount=isToiletDoor?0:(twoGlassOneMesh||threeGlass?3:2);
  const note=isToiletDoor?'UPVC TOILET DOOR · SINGLE PANEL':twoGlassOneMesh?'3 TRACK · 2 GLASS + 1 MESH OVERLAP':threeGlass?'3 TRACK · 3 GLASS PANELS':'2 TRACK · 2 GLASS PANELS';
  return {isToiletDoor,twoGlassOneMesh,threeGlass,count,glassPanels,meshPanels,trackCount,note};
}
function windowElevation(x){
  const k=windowKind(x),{isToiletDoor,twoGlassOneMesh,threeGlass,count,note}=k;
  const width=Math.max(1,Number(x.w)||1200);
  const height=Math.max(1,Number(x.h)||1500);
  const ratio=Math.max(.45,Math.min(2.8,width/height));
  const frameW=440;
  const frameH=Math.max(190,Math.min(330,frameW/ratio));
  const W=560,H=frameH+112;
  const left=(W-frameW)/2,top=50,ww=frameW,hh=frameH;
  const gap=twoGlassOneMesh||threeGlass?4:5;
  const bayW=(ww-gap*(count-1))/count;
  const palette={White:'#f4f4f0',Ivory:'#e6dcc2',Black:'#252525','Golden Oak':'#b98a45'};
  const profile=palette[x.colour]||'#e9e9e4';
  let panels='';
  if(twoGlassOneMesh){
    const py=top+9,ph=hh-18;
    const px1=left+4;
    const px2=left+ww/2+2;
    const pw=bayW-4;
    // Rear glass shutter and overlapping mesh shutter
    panels+=`<g><rect x="${px1}" y="${py}" width="${pw}" height="${ph}" fill="#dcecf4" stroke="${profile}" stroke-width="7"/><rect x="${px1+9}" y="${py+9}" width="${pw-18}" height="${ph-18}" fill="#e7edf1" fill-opacity=".82" stroke="#65798e" stroke-width="2"/>`;
    for(let gx=px1+14;gx<px1+pw-8;gx+=8){panels+=`<path d="M${gx} ${py+12} V${py+ph-12}" stroke="#65798e" stroke-width=".7"/>`;}
    for(let gy=py+14;gy<py+ph-8;gy+=8){panels+=`<path d="M${px1+12} ${gy} H${px1+pw-12}" stroke="#65798e" stroke-width=".7"/>`;}
    panels+=`<rect x="${px1+pw/2-62}" y="${py+ph/2-18}" width="124" height="42" rx="4" fill="#fff" fill-opacity=".9"/><text x="${px1+pw/2}" y="${py+ph/2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#30445b">GLASS + MESH</text><text x="${px1+pw/2}" y="${py+ph/2+16}" text-anchor="middle" font-size="12" fill="#30445b">(OVERLAP)</text></g>`;
    // Separate second glass shutter
    panels+=`<g><rect x="${px2}" y="${py}" width="${pw}" height="${ph}" fill="#dcecf4" stroke="${profile}" stroke-width="7"/><text x="${px2+pw/2}" y="${py+ph/2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#30445b">GLASS</text></g>`;
  }else{
    for(let i=0;i<count;i++){
      const px=left+i*(bayW+gap)+3,py=top+9,paneW=bayW-6,paneH=hh-18;
      panels+=`<g><rect x="${px}" y="${py}" width="${paneW}" height="${paneH}" fill="${isToiletDoor?'#d9dce2':'#dcecf4'}" stroke="${profile}" stroke-width="7"/><text x="${px+paneW/2}" y="${py+paneH/2}" text-anchor="middle" font-size="14" font-weight="bold" fill="#30445b">${isToiletDoor?'TOILET DOOR':'GLASS '+(i+1)}</text></g>`;
    }
  }
  const hy=top+hh/2-18;
  const trackLines=isToiletDoor
    ?`<path d="M${left+4} ${top+hh+7} H${left+ww-4}" stroke="#87939f" stroke-width="2"/>`
    :twoGlassOneMesh||threeGlass
    ?`<path d="M${left+4} ${top+hh+7} H${left+ww-4} M${left+4} ${top+hh+12} H${left+ww-4} M${left+4} ${top+hh+17} H${left+ww-4}" stroke="#87939f" stroke-width="2"/>`
    :`<path d="M${left+4} ${top+hh+7} H${left+ww-4} M${left+4} ${top+hh+13} H${left+ww-4}" stroke="#87939f" stroke-width="2"/>`;
  // Handles are always drawn on BOTH sides of the frame. Lock position is intentionally not shown anywhere on the quotation.
  const handleLeft=`<rect x="${left+8}" y="${hy}" width="9" height="36" rx="3" fill="#b88b38" stroke="#60491f" stroke-width="1.5"/>`;
  const handleRight=`<rect x="${left+ww-17}" y="${hy}" width="9" height="36" rx="3" fill="#b88b38" stroke="#60491f" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(note)} ${esc(width)} by ${esc(height)} millimetres" xmlns="http://www.w3.org/2000/svg" font-family="Arial,Helvetica,sans-serif"><rect x="${left}" y="${top}" width="${ww}" height="${hh}" fill="none" stroke="${profile}" stroke-width="12"/>${panels}${trackLines}${handleLeft}${handleRight}<text x="${left+ww/2}" y="26" text-anchor="middle" font-size="18" fill="#34465c">WIDTH: ${esc(width)} mm</text><text x="20" y="${top+hh/2}" transform="rotate(-90 20 ${top+hh/2})" text-anchor="middle" font-size="18" fill="#34465c">HEIGHT: ${esc(height)} mm</text><text x="${left+ww/2}" y="${H-14}" text-anchor="middle" font-size="14" fill="#34465c">${esc(note)} · ${esc(x.colour||'White')}</text></svg>`;
}

// One complete, self-contained section per window: summary, diagram, specification, profiles, hardware and pricing.
function windowDetailSection(it,i){
  const c=it.calc||{},f=it.form||{},k=windowKind(c);
  const q=Math.max(1,Number(c.q)||1),total=Number(c.total)||0,gst=Number(c.gst)||0,base=total-gst,area=Number(c.areaSqFt)||0;
  const code=f.windowCode||('W'+(i+1)),product=f.product||c.product||'Window';
  const series=f.series?String(f.series).replace(/mm$/i,' mm')+' series':'';
  const kv=(a,b)=>(b===undefined||b===null||b==='')?'':`<tr><th>${esc(a)}</th><td>${b}</td></tr>`;
  const trackText=c.trackDetail||f.trackDetail||(k.trackCount?k.trackCount+' Track':'');
  const glassText=(c.glassSpec?esc(c.glassSpec)+' · ':'')+k.glassPanels+' panel'+(k.glassPanels>1?'s':'')+(Number(c.glassArea)>0?' · '+Number(c.glassArea).toFixed(2)+' Sq.Ft.':'');
  const meshText=k.meshPanels?k.meshPanels+' mesh panel'+(k.meshPanels>1?'s':'')+(Number(c.meshArea)>0?' · '+Number(c.meshArea).toFixed(2)+' Sq.Ft.':''):'';
  const spec=[kv('Window Code',esc(code)),kv('Product / System',esc(product)+(series?'<br>'+esc(series):'')),kv('Size (W × H)',esc(c.w)+' × '+esc(c.h)+' mm'),kv('Quantity',esc(q)+' Pcs'),kv('Colour',esc(c.colour||'')),kv('Configuration',esc(c.config||'')),kv('Track',esc(trackText)),kv('Glass Details',glassText),kv('Mesh Details',meshText)].join('');
  const profiles=(Array.isArray(c.rows)?c.rows:[]).filter(r=>Number(r.m)>0).map(r=>`<li>${esc(r.name)} (${esc(r.code)})</li>`).join('')||'<li>—</li>';
  const hw=[];
  if(c.lockName)hw.push(`${esc(c.lockName)} × ${esc(c.lockQty)}`);
  if(c.bearingName)hw.push(`${esc(c.bearingName)} × ${esc(c.bearingQty)}`);
  if(c.sashMetres!==undefined)hw.push(`Wool File × ${(Number(c.sashMetres)||0).toFixed(3)} m`);
  if(c.fastenerQty!==undefined)hw.push(`Fastener Screw &amp; Cap × ${esc(c.fastenerQty)}`);
  if(c.siliconQty!==undefined)hw.push(`Silicon Tube × ${esc(c.siliconQty)}`);
  (c.customItems||[]).forEach(ci=>hw.push(`${esc(ci.name)} × ${esc((Number(ci.qty)||0)*q)} ${esc(ci.unit||'nos')}`));
  const hwList=hw.map(h=>`<li>${h}</li>`).join('')||'<li>—</li>';
  return `<section class="win">
<div class="section">WINDOW ${i+1} · ${esc(code)} · ${esc(product)} · ${esc(c.w)} × ${esc(c.h)} mm</div>
<table class="two"><tr><td class="diag">${windowElevation(c)}</td><td class="specs"><table class="kv">${spec}</table></td></tr></table>
<table class="two lists"><tr><td><div class="sub">Profile Details</div><ul>${profiles}</ul></td><td><div class="sub">Hardware &amp; Accessories</div><ul>${hwList}</ul></td></tr></table>
<table class="calc"><tr><th>Total Area</th><th>Qty</th><th>Rate / Sq.Ft.</th><th>Unit Price (excl. GST)</th><th>Amount (excl. GST)</th><th>Total (incl. GST)</th></tr>
<tr><td class="nw">${area.toFixed(2)} Sq.Ft.</td><td class="nw">${esc(q)} Pcs</td><td class="nw">${money(area?base/area:0)}</td><td class="nw">${money(base/q)}</td><td class="nw">${money(base)}</td><td class="nw"><b>${money(total)}</b></td></tr></table>
</section>`;
}

function brandedCustomerQuote(){
  const current=calc(),currentForm=captureForm(),items=quoteWindows.map(it=>({form:it.form,calc:it.calc}));if(!items.length||(!printingSavedQuote&&JSON.stringify(items[items.length-1].form)!==JSON.stringify(currentForm)))items.push({form:currentForm,calc:JSON.parse(JSON.stringify(current))}); const sumKeys=['total','gst','glass','mesh','hwCost','profCost','expense','manufacturing','profit','areaSqFt','glassArea','meshArea']; const x={...current}; sumKeys.forEach(k=>x[k]=items.reduce((s,it)=>s+Number(it.calc[k]||0),0)); x.q=items.reduce((s,it)=>s+Number(it.calc.q||1),0); const now=new Date(), date=now.toLocaleDateString('en-IN');
  const qno='MPR-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'-'+String(now.getTime()).slice(-4);
  const business=shop.name||'KHAN FURNITURE AND WINDOW WORK';
  const logo=shopLogoData||'logo.png';
  const area=x.areaSqFt, base=x.total-x.gst;
  const f0=(items[0]&&items[0].form)||{};
  const gstPct=(f0.gst!==undefined&&f0.gst!=='')?Number(f0.gst):val('gst');
  const custName=$('customer').value||f0.customer||'Customer',custAddr=$('customerAddress').value||f0.customerAddress||'',custMobile=$('customerMobile').value||f0.customerMobile||'';
  // Item-wise pricing is shown EXCLUDING GST so that the items add up exactly to Sub Total; GST is added once in the summary.
  const itemRows=items.map((it,i)=>{const c=it.calc,f=it.form||{},qn=Math.max(1,Number(c.q)||1),b=(Number(c.total)||0)-(Number(c.gst)||0);return `<tr><td>${i+1}</td><td>${esc(f.windowCode||'W'+(i+1))}</td><td>${esc(f.product||c.product||'Window')}</td><td>${esc(c.w)} × ${esc(c.h)} mm</td><td>${esc(qn)}</td><td class="num">${money(b/qn)}</td><td class="num">${money(b)}</td></tr>`}).join('');
  const windowSections=items.map((it,i)=>windowDetailSection(it,i)).join('');
  const win=window.open('','_blank'); if(!win){alert('Please allow pop-ups to print quotation PDF.');return;}
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(qno)} - Customer Quotation</title>
<style>
@page{size:A4;margin:10mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font:11px/1.4 Arial,Helvetica,sans-serif;color:#1d2939;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:100%}
.brand{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:3px solid #9aa7b5;padding:0 0 4mm;margin:0 0 6mm}
.brand img{width:92px;height:68px;object-fit:contain;flex:0 0 auto}
.brandinfo{text-align:right;min-width:0;flex:1 1 auto;overflow-wrap:anywhere;word-break:break-word}
.brandinfo h1{font-size:16px;line-height:1.25;margin:0 0 4px}.brandinfo div{line-height:1.4;font-weight:600}
table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 8px}
th,td{padding:5px 6px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}
thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}
.meta th,.items th,.calc th,.sumtab th{background:#7e858d;color:#fff;font-weight:bold}
.meta td,.items td,.calc td{border:1px solid #d1d5db}.items tr:nth-child(even) td{background:#f1f4f8}
.num{text-align:right;white-space:nowrap}.nw{white-space:nowrap}.items th.num{text-align:right;white-space:nowrap}.nw{white-space:nowrap}
.section{background:#b5c9df;padding:6px 8px;font-weight:bold;margin:8px 0 6px;break-after:avoid;page-break-after:avoid;overflow-wrap:anywhere;word-break:break-word}
.win{break-inside:avoid;page-break-inside:avoid;margin:0 0 6mm}
table.two{margin:0 0 6px}table.two>tbody>tr>td{border:0;padding:0}
.diag{width:52%;text-align:center;vertical-align:middle;padding-right:8px!important}
.diag svg{display:block;width:100%;height:auto;max-height:78mm;margin:0 auto}
.specs{width:48%}
.kv th{width:36%;background:#eef2f7;color:#1d2939;border:1px solid #d1d5db;font-weight:bold}.kv td{border:1px solid #d1d5db}
.lists>tbody>tr>td{width:50%;border:1px solid #d1d5db!important;padding:6px 8px!important}
.lists ul{margin:3px 0 0;padding-left:16px}.lists li{margin:0 0 2px;overflow-wrap:anywhere;word-break:break-word}
.sub{font-weight:bold;background:#eef2f7;padding:3px 5px;margin:-2px -4px 3px}
.calc td b{font-size:12px}
.sumtab td{border:1px solid #d1d5db;padding:7px 8px}.sumtab td.lbl{text-align:right;width:60%}.sumtab td.val{text-align:right;width:40%}
.sumtab tr.grand td{font-size:15px;font-weight:bold;background:#e8eef6}
.totals td{border:1px solid #d1d5db;padding:7px 8px}
.final{break-inside:avoid;page-break-inside:avoid}
h2{font-size:15px;margin:10px 0 6px;break-after:avoid;page-break-after:avoid}
.terms{padding-left:20px;margin:0 0 8px}.terms li{margin:0 0 6px;line-height:1.45;break-inside:avoid;page-break-inside:avoid}
.accept{break-inside:avoid;page-break-inside:avoid}.endblock{break-inside:avoid;page-break-inside:avoid}
.sign{display:table;width:100%;table-layout:fixed;margin-top:22mm;border-spacing:0}
.sign>div{display:table-cell;width:45%;border-top:1px solid #555;padding-top:6px;text-align:center;overflow-wrap:anywhere}
.sign>.gapcell{width:10%;border-top:0}
.foot{color:#667085;font-size:10px;text-align:right;margin-top:8px}
@media screen{body{background:#e8edf3}.page{background:#fff;max-width:210mm;margin:12px auto;padding:10mm;box-shadow:0 2px 14px #0002}}
@media screen and (max-width:640px){body{font-size:10.5px}.page{margin:0;padding:10px;box-shadow:none}.brand img{width:64px;height:48px}th,td{padding:4px}
table.two>tbody>tr>td,.diag,.specs{display:block;width:100%;padding:0!important}.diag{margin-bottom:8px}
.lists>tbody>tr>td{display:block;width:100%}.items th,.items td{font-size:9.5px;padding:4px 3px}.calc th,.calc td{font-size:9px;padding:4px 3px}.calc td b{font-size:10px}.sumtab td.val{white-space:nowrap}.sign{margin-top:16mm}}
@media print{.page{max-width:none;margin:0;padding:0}}
</style></head><body>
<div class="page">
<header class="brand"><img src="${logo}" onerror="this.style.display='none'"><div class="brandinfo"><h1>${esc(business)}</h1><div>${esc(shop.address||'')}<br>Contact: ${esc(shop.mobile||'')}<br>${esc(shop.email||'')} ${shop.gstin?'<br>GSTIN: '+esc(shop.gstin):''}</div></div></header>
<table class="meta"><colgroup><col style="width:34%"><col style="width:36%"><col style="width:30%"></colgroup><tr><th>To</th><th>Address</th><th>Mobile</th></tr><tr><td>${esc(custName)}</td><td>${esc(custAddr)}</td><td>${esc(custMobile)}</td></tr>
<tr><th>Quote No</th><th>Date</th><th>Product Items</th></tr><tr><td>${esc(qno)}</td><td>${esc(date)}</td><td>${items.length}</td></tr></table>
<div class="section">Window-wise Quotation (amounts excl. GST)</div>
<table class="items"><colgroup><col style="width:5%"><col style="width:10%"><col style="width:21%"><col style="width:17%"><col style="width:8%"><col style="width:19%"><col style="width:20%"></colgroup><thead><tr><th>#</th><th>Code</th><th>Product Type</th><th>Size (W × H)</th><th>Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>
${windowSections}
<section class="final">
<h2>Quotation Summary</h2>
<table class="sumtab"><tr><td class="lbl">Sub Total (excl. GST)</td><td class="val">${money(base)}</td></tr><tr><td class="lbl">GST (${esc(gstPct)}%)</td><td class="val">${money(x.gst)}</td></tr><tr class="grand"><td class="lbl">Grand Total</td><td class="val">${money(x.total)}</td></tr></table>
<table class="totals"><tr><td><b>Total Quantity:</b> ${x.q}</td><td><b>Total Area:</b> ${area.toFixed(2)} Sq.Ft.</td><td><b>Avg. Price/Sq.Ft. (Excl. GST):</b> ${money(area?base/area:0)}<br><b>Avg. Price/Sq.Ft. (Incl. GST):</b> ${money(area?x.total/area:0)}</td></tr></table>
</section>
<div class="endblock"><h2>Terms and Conditions</h2><ol class="terms"><li>Payment terms: As mutually agreed at the time of order confirmation.</li><li>Quotation validity: 15 days from the quotation date.</li><li>Final dimensions and specifications will be confirmed before production.</li><li>Any change in size, design, glass, colour or hardware after approval may change the price and delivery schedule.</li><li>Civil work, unloading, safe storage and electrical supply at site are excluded unless specifically mentioned.</li><li>Glass is not covered against physical damage after handover.</li><li>Dispatch and installation schedule will be confirmed after receipt of the agreed advance payment.</li><li>Applicable taxes and freight, if any, will be charged as shown in the final invoice.</li></ol>
<div class="accept"><p>I hereby accept this quotation as per the above-mentioned price and specifications. I have read and understood the terms and conditions and agree to them.</p>
<div class="sign"><div>Customer Signature</div><div class="gapcell"></div><div>For ${esc(business)}<br>Authorized Signatory</div></div></div>
<div class="foot">Powered by MDOT PRO</div></div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  win.document.close();
}
$('printQuote').onclick=brandedCustomerQuote;
