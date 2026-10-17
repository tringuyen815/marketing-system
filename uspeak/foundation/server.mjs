import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {Foundation} from './core.mjs';
export async function start({token=process.env.USPEAK_ADMIN_TOKEN,port=Number(process.env.PORT||4317),dbPath=process.env.USPEAK_DB_PATH||'./data/uspeak.sqlite'}={}){
 if(typeof token!=='string'||token.length<32)throw Error('USPEAK_ADMIN_TOKEN must contain at least 32 characters');
 if(dbPath!==':memory:'){await mkdir((await import('node:path')).dirname(dbPath),{recursive:true})}
 const f=new Foundation(dbPath),sessions=new Map(),attempts=new Map();
 const page=await readFile(new URL('./console.html',import.meta.url));
 const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 try{
 const url=new URL(req.url,'http://localhost');
 // Reject foreign Host headers to avoid DNS rebinding against the loopback service.
 if(!['127.0.0.1','localhost'].includes((req.headers.host||'').split(':')[0]))return send(403,{error:'invalid host'});
 const localOrigin=`http://${req.headers.host}`;
 if(req.headers.origin&&req.headers.origin!==localOrigin)return send(403,{error:'invalid origin'});
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff'});return res.end(page)}
 const body=async()=>{if(!req.headers['content-type']?.startsWith('application/json'))throw Error('JSON required');let bytes=0,chunks=[];for await(const c of req){bytes+=c.length;if(bytes>65536)throw Error('body too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')};
 if(req.method==='POST'&&url.pathname==='/api/login'){
 const ip=req.socket.remoteAddress;let a=attempts.get(ip);if(!a||a.until<Date.now()){a={count:0,until:Date.now()+60000};attempts.set(ip,a)}if(++a.count>10)return send(429,{error:'try again later'});
 const x=await body(),given=Buffer.from(typeof x.token==='string'?x.token:''),expected=Buffer.from(token);
 if(given.length!==expected.length||!timingSafeEqual(given,expected))return send(401,{error:'invalid token'});
 for(const [key,value]of sessions)if(value<Date.now())sessions.delete(key);
 if(sessions.size>=100)return send(429,{error:'session limit'});
 const sid=randomBytes(32).toString('hex');sessions.set(sid,Date.now()+3600000);res.setHeader('Set-Cookie',`uspeak_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);return send(200,{ok:true,mode:'LOCAL_MOCK'});
 }
 const sid=(req.headers.cookie||'').match(/(?:^|;\s*)uspeak_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!sid||!sessions.has(sid)||sessions.get(sid)<Date.now())return send(401,{error:'login required'});
 if(req.method==='POST'&&url.pathname==='/api/logout'){sessions.delete(sid);res.setHeader('Set-Cookie','uspeak_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true})}
 if(req.method==='GET'&&url.pathname==='/api/state')return send(200,{mode:'LOCAL_MOCK',posts:f.db.prepare('SELECT * FROM posts').all(),jobs:f.db.prepare('SELECT * FROM jobs').all(),audit:f.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all(),receipts:f.db.prepare('SELECT * FROM receipts').all()});
 if(req.method!=='POST')return send(404,{error:'not found'});
 const x=await body();let result;
 switch(url.pathname){
 case '/api/drafts':result=f.create(x.body,'owner');break;
 case '/api/revise':result=f.revise(x.id,x.body,'owner');break;
 case '/api/approve':result=f.approve(x.id,x.revision,'owner');break;
 case '/api/schedule':result=f.schedule(x.id,x.channel,x.at,'owner');break;
 case '/api/cancel':f.cancel(x.id,'owner');result={ok:true};break;
 case '/api/mock/run':result={completed:f.runMock(),mode:'MOCK'};break;
 default:return send(404,{error:'not found'});
 }return send(200,result);
 }catch(e){send(400,{error:e.message})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 return {server,f,url:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));f.close()}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const app=await start();console.log(`USPEAK LOCAL MOCK: ${app.url}`)}
