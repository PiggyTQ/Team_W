// Downloadable loopback teaching service; never mounted in the business API.
import http from 'node:http';

export function createLocalServer(id,fixture,solve,{ui=''}={}) {
 const booking=[],registrations=new Map();
 return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
   if(req.method==='GET'&&req.url==='/ui'&&ui){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(ui);return;}
   let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>100000){send(413,{error:'too_large'});return;}body+=chunk;}
   const value=body?JSON.parse(body):{};
   if(id==='retry-concurrency'){
    if(req.url!=='/book'||req.method!=='POST'){send(404,{});return;}
    const request={...value,id:String(booking.length+1)};
    if(!request.owner||!request.key||!Number.isInteger(request.quantity)||request.quantity<1){send(422,{error:'invalid_booking'});return;}
    // The in-memory transaction is synchronous: no await between check and commit.
    booking.push(request);const result=solve({...fixture,requests:booking});
    send(result.responses.at(-1).status,result);return;
   }
   if(id==='cross-registration-service'){
    if(req.url!=='/api/register'||req.method!=='POST'){send(404,{});return;}
    if(typeof value[fixture.contract.field]!=='string'||!value[fixture.contract.field].includes('@')||typeof value.key!=='string'){send(422,{error:'contract_field_and_key_required',contract:fixture.contract.version});return;}
    if(registrations.has(value.key)&&registrations.get(value.key)!==value[fixture.contract.field]){send(409,{error:'key_conflict'});return;}
    registrations.set(value.key,value[fixture.contract.field]);send(201,{count:registrations.size,contract:fixture.contract.version});return;
   }
   if(id==='service-evolution-delivery'){
    const match=/^\/(v1|v2)\/records$/.exec(req.url);
    if(req.method!=='GET'||!match){send(404,{});return;}
    send(200,solve(fixture)[match[1]]);return;
   }
   if(!['contract-api','app-authorization-retest','cross-security-remediation'].includes(id)){send(404,{});return;}
   const match=/^\/objects\/([A-Za-z0-9-]+)$/.exec(req.url);
   if(!match||!['GET','PUT'].includes(req.method)){send(404,{});return;}
   const request={id:'http',user:req.headers['x-user']||null,object:match[1],action:req.method==='GET'?'read':'edit',scopes:String(req.headers['x-scopes']||'').split(','),cents:value.cents};
   const output=solve({...fixture,requests:[request]});
   const row=Array.isArray(output)?output[0]:output.checks[0];
   send(row.status,row.status===200?{object:match[1],owner:fixture.objects[match[1]].owner}:{error:'denied_or_invalid'});
  }catch{send(400,{error:'invalid_json'});}
 });
}
