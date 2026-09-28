import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
async function clearFolder(admin:any,bucket:string,uid:string){
  const {data,error}=await admin.storage.from(bucket).list(uid,{limit:1000})
  if(error)throw error
  const paths=(data||[]).filter((x:any)=>x?.name).map((x:any)=>`${uid}/${x.name}`)
  if(paths.length){const r=await admin.storage.from(bucket).remove(paths);if(r.error)throw r.error}
}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers:corsHeaders})
  try{
    const authHeader=req.headers.get('Authorization')||''
    if(!authHeader.startsWith('Bearer '))return Response.json({error:'unauthorized'},{status:401,headers:corsHeaders})
    const uc=userClient(authHeader),token=authHeader.slice(7)
    const {data,error}=await uc.auth.getUser(token),user=data?.user
    if(error||!user)return Response.json({error:'unauthorized'},{status:401,headers:corsHeaders})
    const body=await req.json().catch(()=>({}))
    if(String(body?.confirm||'')!=='ELIMINA')return Response.json({error:'confirmation_required'},{status:400,headers:corsHeaders})
    const admin=adminClient()
    await clearFolder(admin,'avatars',user.id)
    await clearFolder(admin,'curricula',user.id)
    const del=await admin.auth.admin.deleteUser(user.id)
    if(del.error)throw del.error
    return Response.json({ok:true},{headers:corsHeaders})
  }catch(err){
    console.error('delete-account error',err)
    return Response.json({error:'account_deletion_failed'},{status:500,headers:corsHeaders})
  }
})
