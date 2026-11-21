
/* MDOT PRO Business Modules v2.0 - local workspace implementation.
   Live cloud authentication, Razorpay and WhatsApp Business API require backend credentials and deployment. */
(()=> {
const $=id=>document.getElementById(id), money=n=>'₹'+(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem('mdp_'+k)||JSON.stringify(d))}catch{return d}};
const put=(k,v)=>localStorage.setItem('mdp_'+k,JSON.stringify(v));
let invoices=get('invoices'), stock=get('stock'), purchases=get('purchases'), credits=get('credits'), plans=get('plans',{active:'Free',expiry:'',payments:[]});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=$('businessModules'); if(!host)return;
const page=(id,title,body)=>`<section id="${id}" class="page mdp-page" hidden><div class="panel"><h3>${title}</h3>${body}</div></section>`;
const field=(label,id,type='text',extra='')=>`<label>${label}<input id="${id}" type="${type}" ${extra}></label>`;
host.innerHTML=[
page('invoices','Invoice Generator',`
<div class="notice">Invoice records are saved in this browser on this device. GST rate and tax treatment must be verified before issuing a tax invoice.</div>
<div class="grid">${field('Customer Name','invCustomer')}${field('Mobile','invMobile','tel')}${field('Customer GSTIN','invGstin')}${field('Invoice Date','invDate','date')}${field('Due Date','invDue','date')}${field('Invoice Number','invNo')}</div>
<div class="grid">${field('Description / Window Details','invDesc')}${field('Actual Width (mm)','invW','number','min="0"')}${field('Actual Height (mm)','invH','number','min="0"')}${field('Quantity','invQty','number','min="1" value="1"')}${field('Unit Price (₹)','invRate','number','min="0" step="0.01"')}${field('Discount (₹)','invDiscount','number','min="0" value="0"')}${field('GST %','invGst','number','min="0" value="18"')}${field('Advance / Received (₹)','invPaid','number','min="0" value="0"')}</div>
<div class="actions"><button class="primary" id="invSave">Save Invoice</button><button class="secondary" id="invPrint">Preview / Print PDF</button></div><div id="invSummary" class="notice"></div><div id="invoiceRows"></div>`),
page('inventory','Inventory Management',`
<div class="notice">No cutting calculation or wastage deduction is used. Stock is managed as manually entered actual quantities/units.</div>
<div class="grid">
<label>Business Module<select id="stBusiness"><option value="UPVC">UPVC</option><option value="Aluminium">Aluminium</option></select></label>
${field('Item Name','stName')}
<label>Material Category<select id="stCategory"><option>Profiles</option><option>Glass</option><option>Mesh</option><option>Rubber / Gasket</option><option>Hardware</option><option>Locks & Handles</option><option>Accessories</option><option>Steel Reinforcement</option><option>Other</option></select></label>
<label>Link Customer<select id="stCustomer"><option value="">No customer linked</option></select></label>
${field('SKU / Code','stSku')}${field('Unit (pcs, kg, m, sq.ft.)','stUnit')}${field('Opening / Current Stock','stQty','number','step="0.001"')}${field('Purchase Rate (₹ per unit)','stRate','number','step="0.01"')}${field('Low Stock Alert Level','stMin','number','step="0.001"')}</div>
<div class="actions"><button class="primary" id="stAdd">Add / Update Item</button><button class="secondary" id="stOut">Stock Out</button><button class="secondary" id="stIn">Stock In</button></div>
<div id="stockSummary" class="notice"></div><div id="stockRows"></div>
<h3>Customer Details</h3><div class="notice">Customer register se add kiye gaye customers yahan dikhte hain. Stock item ko customer ke saath link bhi kar sakte hain.</div><div id="inventoryCustomers"></div>`),
page('purchases','Purchase & Supplier Management',`
<div class="grid">${field('Supplier Name','puSupplier')}${field('Supplier Mobile','puMobile','tel')}${field('Purchase Date','puDate','date')}${field('Item / Material','puItem')}${field('Quantity','puQty','number','step="0.001"')}${field('Unit','puUnit')}${field('Rate (₹)','puRate','number','step="0.01"')}${field('Reference / Bill No.','puRef')}</div>
<div class="actions"><button class="primary" id="puSave">Save Purchase & Add Stock</button></div><div id="purchaseRows"></div>`),
page('udhar','Udhar / Customer Credit & Recovery',`
<div class="notice">Reminder alerts are generated inside this app. A message is never sent automatically; review and approve it first. WhatsApp opens with a pre-filled message and you press Send in WhatsApp.</div>
<div class="grid">${field('Customer Name','crName')}${field('Mobile with country code','crMobile','tel','placeholder="+91..."')}${field('Udhar / Total Amount (₹)','crAmount','number','min="0" step="0.01"')}${field('Date Given','crGiven','date')}${field('Due Date','crDue','date')}${field('Reason / Note','crNote')}</div>
<div class="actions"><button class="primary" id="crAdd">Save Udhar</button><button class="secondary" id="crCheck">Check Due Alerts</button></div>
<div id="creditAlerts" class="notice"></div><div id="creditRows"></div>`),
page('subscriptions','Subscription Plans',`
<div class="notice">Plan catalogue and local selection preview only. Online payment, recurring billing and automatic activation require Razorpay credentials, secure server verification and webhook deployment.</div>
<div class="grid"><article class="panel"><h3>FREE · ₹0</h3><p>Basic workspace, limited records.</p><button class="secondary" data-plan="Free">Select Free</button></article>
<article class="panel"><h3>BASIC · ₹299 / month</h3><p>Customer and quotation workflow.</p><button class="secondary" data-plan="Basic">Select Basic</button></article>
<article class="panel"><h3>PROFESSIONAL · ₹599 / month</h3><p>Expanded business modules and reports.</p><button class="primary" data-plan="Professional">Select Professional</button></article>
<article class="panel"><h3>ENTERPRISE · ₹999 / month</h3><p>Multi-staff business workspace.</p><button class="secondary" data-plan="Enterprise">Select Enterprise</button></article></div>
<div class="grid">${field('Yearly plan discount (%)','planDiscount','number','min="0" max="90" value="15"')}</div>
<div id="planStatus" class="notice"></div>`)].join('');
const today=()=>new Date().toISOString().slice(0,10);
['invDate','puDate','crGiven'].forEach(id=>$(id).value=today());
$('invNo').value='MDP-'+new Date().getFullYear()+'-'+String(invoices.length+1).padStart(5,'0');
function table(id,heads,rows){$(id).innerHTML=rows.length?`<div class="tablewrap"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<p class="muted">No records yet.</p>'}
function renderInvoices(){
 table('invoiceRows',['Invoice','Customer','Date','Total','Received','Balance','Action'],invoices.map((x,i)=>`<tr><td>${esc(x.no)}</td><td>${esc(x.customer)}</td><td>${esc(x.date)}</td><td>${money(x.total)}</td><td>${money(x.paid)}</td><td>${money(x.balance)}</td><td><button data-inv="${i}" class="secondary">Print</button></td></tr>`));
 $('invSummary').textContent=`Saved invoices: ${invoices.length} · Outstanding: ${money(invoices.reduce((s,x)=>s+x.balance,0))}`;
}
function invoiceData(){let q=Math.max(1,+$('invQty').value||1),base=Math.max(0,(+$('invRate').value||0)*q-(+$('invDiscount').value||0)),gst=base*(Math.max(0,+$('invGst').value||0)/100),total=base+gst,paid=Math.min(total,Math.max(0,+$('invPaid').value||0));return {no:$('invNo').value||'MDP-'+Date.now(),customer:$('invCustomer').value,mobile:$('invMobile').value,gstin:$('invGstin').value,date:$('invDate').value,due:$('invDue').value,desc:$('invDesc').value,size:(+$('invW').value||0)+' × '+(+$('invH').value||0)+' mm',qty:q,rate:+$('invRate').value||0,discount:+$('invDiscount').value||0,gstRate:+$('invGst').value||0,base,gst,total,paid,balance:total-paid}}
function printInvoice(x){let w=window.open('','_blank');if(!w){alert('Allow pop-ups to print invoice PDF.');return}w.document.write(`<html><head><title>${esc(x.no)}</title><style>body{font:14px Arial;padding:25px;color:#18283c}h1{color:#1762a6}table{width:100%;border-collapse:collapse;margin-top:25px}td,th{border:1px solid #ccd5df;padding:10px;text-align:left}.right{text-align:right}.total{font-size:20px;font-weight:bold}</style></head><body><h1>${esc((JSON.parse(localStorage.mdShop||'{}').name)||'MDOT PRO')}</h1><h2>TAX INVOICE / INVOICE</h2><p>Invoice: ${esc(x.no)} | Date: ${esc(x.date)} | Due: ${esc(x.due)}</p><p><b>Bill To:</b> ${esc(x.customer)}<br>Mobile: ${esc(x.mobile)}<br>GSTIN: ${esc(x.gstin)}</p><table><tr><th>Description</th><th>Actual Size</th><th>Qty</th><th>Rate</th><th>Amount</th></tr><tr><td>${esc(x.desc)}</td><td>${esc(x.size)}</td><td>${x.qty}</td><td>${money(x.rate)}</td><td>${money(x.rate*x.qty)}</td></tr></table><table><tr><td>Discount</td><td class="right">${money(x.discount)}</td></tr><tr><td>Taxable Value</td><td class="right">${money(x.base)}</td></tr><tr><td>GST (${x.gstRate}%)</td><td class="right">${money(x.gst)}</td></tr><tr><td class="total">Grand Total</td><td class="right total">${money(x.total)}</td></tr><tr><td>Received</td><td class="right">${money(x.paid)}</td></tr><tr><td>Balance Due</td><td class="right">${money(x.balance)}</td></tr></table><p>Authorized Signatory</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
$('invSave').onclick=()=>{let x=invoiceData();if(!x.customer||!x.desc||!x.rate){alert('Customer, description and unit price are required.');return}invoices.unshift(x);put('invoices',invoices);renderInvoices();$('invNo').value='MDP-'+new Date().getFullYear()+'-'+String(invoices.length+1).padStart(5,'0');alert('Invoice saved.')};
$('invPrint').onclick=()=>printInvoice(invoiceData());
$('invoiceRows').onclick=e=>{let b=e.target.closest('[data-inv]');if(b)printInvoice(invoices[+b.dataset.inv])};
function renderStock(){
  const customers=(()=>{try{return JSON.parse(localStorage.mdCustomers||'[]')}catch{return []}})();
  const sel=$('stCustomer'),previous=sel.value;
  sel.innerHTML='<option value="">No customer linked</option>'+customers.map((c,i)=>`<option value="${i}">${esc(c.name)}${c.mobile?' · '+esc(c.mobile):''}</option>`).join('');
  if(previous!==undefined)sel.value=previous;
  table('stockRows',['Business','Item','Category','Customer','SKU','Unit','Stock','Rate','Value','Alert'],stock.map(x=>`<tr><td>${esc(x.business||'UPVC')}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${esc(x.customerName||'—')}</td><td>${esc(x.sku)}</td><td>${esc(x.unit)}</td><td>${x.qty}</td><td>${money(x.rate)}</td><td>${money(x.qty*x.rate)}</td><td>${x.qty<=x.min?'<b style="color:#b42318">LOW STOCK</b>':'OK'}</td></tr>`));
  const upvc=stock.filter(x=>(x.business||'UPVC')==='UPVC'),al=stock.filter(x=>x.business==='Aluminium');
  $('stockSummary').textContent=`UPVC: ${upvc.length} items · ${money(upvc.reduce((s,x)=>s+x.qty*x.rate,0))} | Aluminium: ${al.length} items · ${money(al.reduce((s,x)=>s+x.qty*x.rate,0))} | Low stock: ${stock.filter(x=>x.qty<=x.min).length}`;
  $('inventoryCustomers').innerHTML=customers.length?customers.map(c=>`<div class="notice"><b>${esc(c.name)}</b><br>Mobile: ${esc(c.mobile||'Not added')}<br>Linked stock items: ${stock.filter(x=>x.customerName===c.name).length}</div>`).join(''):'<p class="muted">No customers added yet. Add customers from Customers page.</p>';
}
$('stAdd').onclick=()=>{let name=$('stName').value.trim();if(!name){alert('Item name required');return}let ci=$('stCustomer').value,customerList=(()=>{try{return JSON.parse(localStorage.mdCustomers||'[]')}catch{return []}})(),linked=ci===''?null:customerList[Number(ci)];let item={business:$('stBusiness').value,name,category:$('stCategory').value,customerName:linked?.name||'',customerMobile:linked?.mobile||'',sku:$('stSku').value,unit:$('stUnit').value||'pcs',qty:+$('stQty').value||0,rate:+$('stRate').value||0,min:+$('stMin').value||0};let ix=stock.findIndex(x=>(x.sku&&x.sku===item.sku||x.name.toLowerCase()===name.toLowerCase())&&(x.business||'UPVC')===item.business);if(ix>=0)stock[ix]=item;else stock.push(item);put('stock',stock);renderStock()};
function adjustStock(direction){let key=prompt('Enter exact item SKU or name');if(!key)return;let x=stock.find(a=>a.sku===key||a.name.toLowerCase()===key.toLowerCase());if(!x){alert('Item not found');return}let n=Number(prompt('Quantity to '+(direction>0?'add':'deduct')));if(!(n>0)){alert('Enter a quantity greater than zero');return}if(direction<0&&n>x.qty){alert('Insufficient stock');return}x.qty+=direction*n;put('stock',stock);renderStock()}
$('stOut').onclick=()=>adjustStock(-1);$('stIn').onclick=()=>adjustStock(1);
function renderPurchases(){table('purchaseRows',['Date','Supplier','Item','Qty','Rate','Total','Reference'],purchases.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.supplier)}</td><td>${esc(x.item)}</td><td>${x.qty} ${esc(x.unit)}</td><td>${money(x.rate)}</td><td>${money(x.qty*x.rate)}</td><td>${esc(x.ref)}</td></tr>`))}
$('puSave').onclick=()=>{let item=$('puItem').value.trim(),qty=+$('puQty').value||0;if(!item||qty<=0){alert('Item and positive quantity required');return}let x={supplier:$('puSupplier').value,mobile:$('puMobile').value,date:$('puDate').value,item,qty,unit:$('puUnit').value,rate:+$('puRate').value||0,ref:$('puRef').value};purchases.unshift(x);let s=stock.find(a=>a.name.toLowerCase()===item.toLowerCase());if(s){s.qty+=qty;s.rate=x.rate||s.rate}else stock.push({name:item,category:'Purchased',sku:'',unit:x.unit||'pcs',qty,rate:x.rate,min:0});put('purchases',purchases);put('stock',stock);renderPurchases();renderStock();alert('Purchase saved and stock updated.')};
function renderCredits(){let due=credits.filter(x=>x.balance>0&&x.due&&x.due<=today());$('creditAlerts').innerHTML=due.length?'<b>Due / Overdue:</b> '+due.map(x=>esc(x.name)+' ('+money(x.balance)+')').join(' · '):'No due or overdue payments today.';table('creditRows',['Customer','Mobile','Given','Due','Amount','Received','Balance','Action'],credits.map((x,i)=>`<tr><td>${esc(x.name)}</td><td>${esc(x.mobile)}</td><td>${esc(x.given)}</td><td>${esc(x.due)}</td><td>${money(x.amount)}</td><td>${money(x.received)}</td><td>${money(x.balance)}</td><td><button class="secondary" data-credit="${i}">Receive</button> <button class="secondary" data-message="${i}">Approve Message</button></td></tr>`))}
$('crAdd').onclick=()=>{let amount=+$('crAmount').value||0;if(!$('crName').value.trim()||amount<=0){alert('Customer and amount required');return}credits.unshift({name:$('crName').value,mobile:$('crMobile').value,amount,received:0,balance:amount,given:$('crGiven').value||today(),due:$('crDue').value,note:$('crNote').value});put('credits',credits);renderCredits();alert('Udhar record saved.')};
$('crCheck').onclick=()=>{renderCredits();let n=credits.filter(x=>x.balance>0&&x.due&&x.due<=today()).length;alert(n?`${n} customer(s) have due/overdue balance.`:'No due reminders today.')};
$('creditRows').onclick=e=>{let b=e.target.closest('button');if(!b)return;let x=credits[+(b.dataset.credit??b.dataset.message)];if(!x)return;if(b.dataset.credit!==undefined){let n=Number(prompt('Received amount (₹)'));if(!(n>0)||n>x.balance){alert('Enter a valid amount not exceeding balance');return}x.received+=n;x.balance-=n;put('credits',credits);renderCredits()}else{let msg=`Namaste ${x.name}, aapke account mein ₹${x.balance.toFixed(2)} baki hain. Kripya ${x.due||'jald'} tak payment karne ki kripa karein. Dhanyavaad.`;if(!confirm('MESSAGE APPROVAL\\n\\n'+msg+'\\n\\nApprove and open WhatsApp?'))return;if(!x.mobile){alert('Customer mobile number missing');return}let phone=x.mobile.replace(/\\D/g,'');if(phone.length===10)phone='91'+phone;window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank')}}
function renderPlan(){$('planStatus').textContent=`Selected plan: ${plans.active||'Free'} · Status: local preview only. No online payment has been collected.`}
host.addEventListener('click',e=>{let b=e.target.closest('[data-plan]');if(!b)return;let name=b.dataset.plan;if(!confirm('Select '+name+' plan for local preview? This does not charge payment.'))return;plans.active=name;put('plans',plans);renderPlan()});
function updatePage(id){if(id==='invoices')renderInvoices();if(id==='inventory')renderStock();if(id==='purchases')renderPurchases();if(id==='udhar')renderCredits();if(id==='subscriptions')renderPlan()}
document.querySelectorAll('[data-page],[data-open]').forEach(b=>{let old=b.onclick;b.addEventListener('click',()=>setTimeout(()=>updatePage(b.dataset.page||b.dataset.open),0))});
const oldShow=window.showApp; // original app's showApp is scoped; initialise module render on nav clicks.
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>updatePage(b.dataset.page)));
renderInvoices();renderStock();renderPurchases();renderCredits();renderPlan();
})();
