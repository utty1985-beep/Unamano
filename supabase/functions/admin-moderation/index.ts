import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ADMIN_EMAIL='utty1985@gmail.com'
const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
function adminClient(){
  const url=Deno.env.get('SUPABASE_URL')!
  const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')
  const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url,key,{auth:{persistSession:false}})
}
function userClient(authHeader:string){
  const url=Deno.env.get('SUPABASE_URL')!
  const pubs=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}')
  const key=pubs.default||Deno.env.get('SUPABASE_ANON_KEY')!
  return createClient(url,key,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}})
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers:corsHeaders})
  try{
    const authHeader=req.headers.get('Authorization')||''
    if(!authHeader.startsWith('Bearer '))return Response.json({error:'unauthorized'},{status:401,headers:corsHeaders})
    const uc=userClient(authHeader),token=authHeader.slice(7)
    const {data,error}=await uc.auth.getUser(token),user=data?.user
    if(error||!user)return Response.json({error:'unauthorized'},{status:401,headers:corsHeaders})
    if(String(user.email||'').toLowerCase()!==ADMIN_EMAIL)return Response.json({error:'forbidden'},{status:403,headers:corsHeaders})
    const admin=adminClient(),body=await req.json().catch(()=>({})),action=String(body?.action||'summary')
    if(action==='summary'){
      const [reports,notices,jobs,suspensions]=await Promise.all([
        admin.from('reports').select('id,reporter_id,job_id,reported_user_id,reason,status,created_at').order('created_at',{ascending:false}).limit(100),
        admin.from('legal_notices').select('id,reporter_name,reporter_email,content_url,reason,details,status,created_at').order('created_at',{ascending:false}).limit(100),
        admin.from('jobs').select('id,owner_id,title,category,city,status,assigned_to,created_at').order('created_at',{ascending:false}).limit(100),
        admin.from('user_suspensions').select('user_id,active,reason,created_at,updated_at').eq('active',true).order('updated_at',{ascending:false}).limit(100)
      ])
      for(const r of [reports,notices,jobs,suspensions])if(r.error)throw r.error
      return Response.json({ok:true,admin:true,reports:reports.data||[],notices:notices.data||[],jobs:jobs.data||[],suspensions:suspensions.data||[]},{headers:corsHeaders})
    }
    if(action==='close_job'){
      const id=String(body?.job_id||'');if(!id)return Response.json({error:'missing_job_id'},{status:400,headers:corsHeaders})
      const r=await admin.from('jobs').update({status:'closed'}).eq('id',id);if(r.error)throw r.error
      return Response.json({ok:true},{headers:corsHeaders})
    }
    if(action==='suspend_user'){
      const userId=String(body?.user_id||''),reason=String(body?.reason||'Violazione delle regole').slice(0,1000)
      if(!userId||userId===user.id)return Response.json({error:'invalid_user'},{status:400,headers:corsHeaders})
      const up=await admin.from('user_suspensions').upsert({user_id:userId,active:true,reason,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(up.error)throw up.error
      const j1=await admin.from('jobs').update({status:'closed'}).eq('owner_id',userId).in('status',['open','assigned']);if(j1.error)throw j1.error
      const j2=await admin.from('jobs').update({status:'closed'}).eq('assigned_to',userId).eq('status','assigned');if(j2.error)throw j2.error
      return Response.json({ok:true},{headers:corsHeaders})
    }
    if(action==='unsuspend_user'){
      const userId=String(body?.user_id||'');if(!userId)return Response.json({error:'missing_user_id'},{status:400,headers:corsHeaders})
      const r=await admin.from('user_suspensions').update({active:false,updated_at:new Date().toISOString()}).eq('user_id',userId);if(r.error)throw r.error
      return Response.json({ok:true},{headers:corsHeaders})
    }
    if(action==='report_status'){
      const id=String(body?.id||''),status=String(body?.status||'closed')
      if(!id||!['open','reviewing','actioned','closed','rejected'].includes(status))return Response.json({error:'invalid_input'},{status:400,headers:corsHeaders})
      const r=await admin.from('reports').update({status}).eq('id',id);if(r.error)throw r.error
      return Response.json({ok:true},{headers:corsHeaders})
    }
    if(action==='notice_status'){
      const id=String(body?.id||''),status=String(body?.status||'closed')
      if(!id||!['received','reviewing','actioned','rejected','closed'].includes(status))return Response.json({error:'invalid_input'},{status:400,headers:corsHeaders})
      const r=await admin.from('legal_notices').update({status}).eq('id',id);if(r.error)throw r.error
      return Response.json({ok:true},{headers:corsHeaders})
    }
    return Response.json({error:'unknown_action'},{status:400,headers:corsHeaders})
  }catch(err){
    console.error('admin-moderation error',err)
    return Response.json({error:'moderation_failed'},{status:500,headers:corsHeaders})
  }
})
