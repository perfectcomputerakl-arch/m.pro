import {json,currentUser,requireActiveSubscription} from '../_lib/auth.js';
export async function onRequest({request,env}){
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 if(!env.DB||!env.AUTH_SECRET)return json({error:'Backend not configured.'},503);
 const user=await currentUser(request,env);if(!user)return json({error:'Sign in required.'},401);
 const access=await requireActiveSubscription(user,env);
 return json({ok:true,subscription:access});
}
