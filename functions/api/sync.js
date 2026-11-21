import {json,currentUser,requireActiveSubscription} from '../_lib/auth.js';
const ALLOWED_KEYS = new Set(['mdRates','mdCustomers','mdQuotes','mdShop','mdUpvcCustomRates','mdp_invoices','mdp_stock','mdp_purchases','mdp_credits','mdp_plans','mdp_aluminium_master_v114','mdp_aluminium_quotes_v114']);
export async function onRequest({request,env}){
 if(!env.DB||!env.AUTH_SECRET)return json({error:'Sync backend is not configured. Check DB binding and AUTH_SECRET.'},503);
 const user=await currentUser(request,env);if(!user)return json({error:'Sign in required.'},401);
 const access=await requireActiveSubscription(user,env);if(!access.ok)return json({error:'Subscription expired or inactive. Contact MDOT PRO Admin.',code:'SUBSCRIPTION_REQUIRED'},402);
 const tenantId=user.tenant_id;
 if(request.method==='GET'){
  const result=await env.DB.prepare('SELECT data_key,payload_json,updated_at FROM tenant_data WHERE tenant_id=?').bind(tenantId).all();
  const data={};for(const row of result.results||[]){try{data[row.data_key]={value:JSON.parse(row.payload_json),updatedAt:row.updated_at}}catch{}}
  return json({ok:true,data});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Cross-origin request blocked.'},403);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON.'},400)}
 if(!body||!body.data||typeof body.data!=='object'||Array.isArray(body.data))return json({error:'Data object required.'},400);
 const entries=Object.entries(body.data);if(!entries.length)return json({ok:true,saved:0});if(entries.length>20)return json({error:'Too many data keys.'},400);
 let total=0;const statements=[];
 for(const [key,value] of entries){if(!ALLOWED_KEYS.has(key))return json({error:`Data key not allowed: ${key}`},400);let payload;try{payload=JSON.stringify(value)}catch{return json({error:`Invalid data for ${key}.`},400)}if(payload===undefined||payload.length>350000)return json({error:`Data for ${key} is too large (350 KB limit).`},413);total+=payload.length;if(total>1200000)return json({error:'Sync batch is too large.'},413);statements.push(env.DB.prepare('INSERT INTO tenant_data (tenant_id,data_key,payload_json,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,data_key) DO UPDATE SET payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP').bind(tenantId,key,payload));}
 try{await env.DB.batch(statements);return json({ok:true,saved:entries.length,updatedAt:new Date().toISOString()})}catch{return json({error:'Cloud save failed. Check tenant_data migration.'},500)}
}
