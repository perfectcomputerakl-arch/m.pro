/* MDOT PRO Cloud Sync v1.24. Local-first, tenant-scoped sync for supported workspace records. */
(()=>{
 const KEYS=['mdRates','mdCustomers','mdQuotes','mdShop','mdUpvcCustomRates','mdp_invoices','mdp_stock','mdp_purchases','mdp_credits','mdp_plans','mdp_aluminium_master_v114','mdp_aluminium_quotes_v114'];
 let running=false,busy=false,timer=null,last={};
 const status=()=>{let el=document.getElementById('cloudSyncStatus');if(!el){el=document.createElement('div');el.id='cloudSyncStatus';el.setAttribute('role','status');el.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9999;padding:7px 11px;border-radius:20px;background:#18334a;color:#fff;font:12px system-ui;box-shadow:0 2px 10px #0002;max-width:85vw';document.body.appendChild(el)}return el};
 const say=t=>{try{status().textContent=t}catch{}};
 const read=()=>{const out={};for(const k of KEYS){const raw=localStorage.getItem(k);if(raw!==null){try{out[k]=JSON.parse(raw)}catch{out[k]=raw}}}return out};
 const stable=v=>{try{return JSON.stringify(v)}catch{return ''}};
 function identity(k,x,i){if(!x||typeof x!=='object')return stable(x)+'#'+i;if(x.id)return String(x.id);if(x.no)return String(x.no);if(x.sku)return String(x.business||'')+'|'+x.sku;return [x.name||'',x.mobile||'',x.date||x.given||'',x.item||'',x.ref||''].join('|')||stable(x)+'#'+i}
 function merge(k,cloud,local){if(Array.isArray(cloud)&&Array.isArray(local)){const map=new Map();cloud.forEach((x,i)=>map.set(identity(k,x,i),x));local.forEach((x,i)=>map.set(identity(k,x,i),x));return [...map.values()]}if(cloud&&local&&typeof cloud==='object'&&typeof local==='object'&&!Array.isArray(cloud)&&!Array.isArray(local))return {...cloud,...local};return local===undefined?cloud:local}
 async function request(url,options={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Cloud sync request failed.');return d}
 async function push(data){if(!Object.keys(data).length)return;await request('/api/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data})});}
 async function initial(){say('Connecting cloud…');const remote=await request('/api/sync');const local=read(),toPush={};let reloadNeeded=false;
  for(const k of KEYS){const cloud=remote.data?.[k]?.value;if(cloud!==undefined){const merged=merge(k,cloud,local[k]);if(stable(merged)!==stable(local[k]))reloadNeeded=true;localStorage.setItem(k,JSON.stringify(merged));if(stable(merged)!==stable(cloud))toPush[k]=merged;}else if(local[k]!==undefined)toPush[k]=local[k];}
  if(Object.keys(toPush).length)await push(toPush);last=read();say('☁ Cloud synced');if(reloadNeeded){say('Cloud data loaded · refreshing workspace…');setTimeout(()=>location.reload(),500);}
 }
 async function cycle(){if(!running||busy||!navigator.onLine)return;busy=true;try{const now=read(),changed={};for(const k of KEYS)if(stable(now[k])!==stable(last[k]))changed[k]=now[k];if(Object.keys(changed).length){await push(changed);last=now;say('☁ All changes synced')} }catch(e){say('Sync pending · '+(e.message||'Check connection'))}finally{busy=false}}
 async function start(){if(running)return;running=true;try{await initial()}catch(e){say('Cloud sync unavailable · '+(e.message||'Check setup'));running=false;return}timer=setInterval(cycle,4000);window.addEventListener('online',cycle);document.addEventListener('visibilitychange',()=>{if(!document.hidden)cycle()});}
 function stop(){running=false;if(timer)clearInterval(timer);timer=null;say('Signed out')}
 window.MDOTCloudSync={start,stop,now:cycle};
 if(!document.getElementById('auth')?.hidden)setTimeout(()=>{if(document.getElementById('auth')?.hidden)start()},300);
})();
