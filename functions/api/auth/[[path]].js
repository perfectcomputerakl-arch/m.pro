import {json,enc,b64u,passwordHash,sign,sessionCookie,currentUser,isAdmin,requireActiveSubscription} from '../../_lib/auth.js';
export async function onRequest({request,env}){
 const path=new URL(request.url).pathname;
 if(!env.DB)return json({error:'Database binding DB is not configured.'},503);
 if(!env.AUTH_SECRET)return json({error:'AUTH_SECRET is not configured.'},503);
 if(request.method==='GET'&&path==='/api/auth/me'){
  const user=await currentUser(request,env);if(!user)return json({error:'Not signed in'},401);
  const access=await requireActiveSubscription(user,env);
  return json({user:{id:user.id,email:user.email,role:user.role,companyName:user.company_name},subscription:access});
 }
 if(request.method==='POST'&&path==='/api/auth/logout')return json({ok:true},200,{'set-cookie':sessionCookie('',0)});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON request'},400)}
 const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Valid email address enter karein.'},400);
 if(password.length<10||password.length>128)return json({error:'Password 10 se 128 characters ka hona chahiye.'},400);
 if(path==='/api/auth/register')return json({error:'Public registration band hai. MDOT PRO Admin se account banwayein.',code:'REGISTRATION_CLOSED'},403);
 if(path!=='/api/auth/login')return json({error:'Not found'},404);
 const user=await env.DB.prepare('SELECT u.id,u.tenant_id,u.email,u.role,u.password_hash,u.password_salt,t.company_name FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE lower(u.email)=?').bind(email).first();
 if(!user||!user.password_hash||!user.password_salt)return json({error:'Email ya password galat hai.'},401);
 const candidate=await passwordHash(password,user.password_salt);if(candidate!==user.password_hash)return json({error:'Email ya password galat hai.'},401);
 if(isAdmin(user,env))user.role='admin';
 const access=await requireActiveSubscription(user,env);
 if(!access.ok)return json({error:'Aapki MDOT PRO subscription active nahi hai. Admin se subscription activate karwayein.',code:'SUBSCRIPTION_REQUIRED',subscription:access.subscription},402);
 const token=await sign({sub:user.id,tenantId:user.tenant_id,email:user.email,role:user.role,exp:Math.floor(Date.now()/1000)+604800},env.AUTH_SECRET);
 return json({ok:true,user:{id:user.id,email:user.email,role:user.role,companyName:user.company_name},subscription:access},200,{'set-cookie':sessionCookie(token)});
}
