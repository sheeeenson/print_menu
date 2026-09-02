const ALLOWED_HOSTS = new Set(['sushi24.ge','www.sushi24.ge','api.getorder.biz','files.getorder.biz']);
export default async function handler(req,res){
  if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return;}
  let url;try{url=new URL(String(req.query?.url||'').trim());}catch{res.status(400).json({error:'Invalid URL'});return;}
  if(url.protocol!=='https:'||!ALLOWED_HOSTS.has(url.hostname)){res.status(400).json({error:'Host not allowed',host:url.hostname});return;}
  try{
    const headers={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36','accept':'*/*'};
    const auth=String(req.query?.auth||'').trim(); if(auth) headers['X-GETORDER-AUTH']=auth;
    const upstream=await fetch(url,{headers,redirect:'follow'}); const contentType=upstream.headers.get('content-type')||'';
    const body=await upstream.text(); res.status(upstream.status).json({status:upstream.status,finalUrl:upstream.url,contentType,headers:Object.fromEntries(upstream.headers.entries()),body});
  }catch(error){res.status(500).json({error:error instanceof Error?error.message:String(error)});}
}
