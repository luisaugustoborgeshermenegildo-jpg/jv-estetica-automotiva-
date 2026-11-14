import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root=path.resolve('dist');
assert(existsSync(path.join(root,'index.html')), 'Rode npm run build antes.');
const chrome=[process.env.CHROME_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>p&&existsSync(p));
assert(chrome,'Chrome ou Edge necessário.');
let mode='normal', posted=[], passed=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/availability'){
  const snapshot=mode;
  setTimeout(()=>{
   res.setHeader('Content-Type','application/json');
   if(snapshot==='error'){res.writeHead(503);res.end(JSON.stringify({error:'Agenda indisponível.'}));return;}
   res.end(JSON.stringify({slots:snapshot==='empty'?[]:[{time:snapshot==='slow'?'08:00':'09:00',available:true},{time:'10:00',available:false}]}));
  },snapshot==='slow'?240:10);return;
 }
 if(url.pathname==='/api/bookings'&&req.method==='POST'){
  let body='';for await(const chunk of req)body+=chunk;posted.push(JSON.parse(body));
  res.setHeader('Content-Type','application/json');
  if(mode==='conflict'){res.writeHead(409);res.end(JSON.stringify({error:'Esse horário acabou de ser reservado. Escolha outro.'}));}
  else{res.writeHead(201);res.end(JSON.stringify({booking:{id:'QA-LOCAL',status:'pending'}}));}return;
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(path.join(tmpdir(),'jv-ui-test-'));
const child=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
const timer=setTimeout(()=>{console.error('Timeout de 90 segundos.');child.kill();process.exit(1);},90000);
let ws;
try{
 let port;
 for(let i=0;i<150&&!port;i++){try{port=parseInt(await readFile(path.join(profile,'DevToolsActivePort'),'utf8'),10);}catch{}if(!port)await sleep(100);}
 assert(port,'Navegador não iniciou.');
 const info=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
 ws=new WebSocket(info.webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 const pending=new Map(),errors=[];let id=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const[r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(new Error(m.error.message)):r(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((r,j)=>{const key=++id;pending.set(key,[r,j]);ws.send(JSON.stringify({id:key,method,params,sessionId}));});
 const{targetId}=await send('Target.createTarget',{url:'about:blank'});
 const{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const S=(method,params)=>send(method,params,sessionId);
 const ev=async expression=>{const r=await S('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return;await sleep(30);}throw new Error('Timeout: '+expression);};
 const check=async(label,expression)=>{assert(await ev(expression),label);passed++;console.log('PASS '+label);};
 await S('Page.enable');await S('Runtime.enable');
 await S('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 await wait("document.documentElement.classList.contains('js') && document.querySelector('.submit-button')?.disabled===false");
 await ev('document.fonts.ready');await ev('window.open=()=>null');
 for(const[width,height]of [[320,780],[375,812],[390,844],[768,1024],[820,1180],[1024,768],[1440,900]]){
  await S('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await sleep(50);
  await check('Sem rolagem horizontal em '+width+'px','document.documentElement.scrollWidth<=innerWidth');
 }
 await check('Fontes locais carregadas','document.fonts.check(\'600 16px "Barlow Condensed"\') && document.fonts.check(\'400 16px "DM Sans"\')');
 await check('Links internos têm destino',"Array.from(document.querySelectorAll('a[href^=\"#\"]')).every(a=>document.getElementById(a.hash.slice(1)))");
 await check('Foto principal carregada',"document.querySelector('.hero-photo img').naturalWidth>0");
 await check('Consentimento obrigatório',"document.querySelector('[name=consent]').required");
 for(const selector of ['.care-intro .text-link','.vehicle-tabs button','.pick-service']){
  await ev('document.querySelector('+JSON.stringify(selector)+').focus()');await sleep(500);
  await check('Foco visível em '+selector,"(()=>{const e=document.activeElement;const r=e.getBoundingClientRect();const h=document.querySelector('.header').getBoundingClientRect();return r.top>=h.bottom-1&&r.bottom<=innerHeight+1&&getComputedStyle(e).outlineStyle!=='none';})()");
 }
 await S('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await ev("document.querySelector('.menu-toggle').click()");
 await check('Menu móvel abre',"document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true' && getComputedStyle(document.querySelector('.nav')).display==='flex'");
 await S('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 await check('Escape fecha o menu e devolve foco',"document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false' && document.activeElement.classList.contains('menu-toggle')");
 await ev("document.querySelector('[data-vehicle=carro]').click()");
 await check('Carro oferece consulta por WhatsApp',"!document.querySelector('#car-services').hidden && document.querySelector('#moto-services').hidden && document.querySelector('#car-services a').href.startsWith('https://wa.me/')");
 await ev("document.querySelector('[data-vehicle=moto]').click();document.querySelector('[data-service=\"Lavagem premium\"]').click()");
 await check('Serviço atualiza formulário e resumo',"document.querySelector('#serviceSelect').value==='Lavagem premium' && document.querySelector('#selectedPrice').textContent.includes('115')");
 await ev("document.querySelector('#bookingForm').requestSubmit()");await sleep(50);
 assert.equal(posted.length,0);passed++;console.log('PASS Formulário incompleto não envia dados');
 const date=new Date();date.setUTCDate(date.getUTCDate()+2);while(date.getUTCDay()===1)date.setUTCDate(date.getUTCDate()+1);
 const dateA=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+1);while(date.getUTCDay()===1)date.setUTCDate(date.getUTCDate()+1);
 const dateB=date.toISOString().slice(0,10);
 const setDate=value=>ev("document.querySelector('#dateInput').value="+JSON.stringify(value)+";document.querySelector('#dateInput').dispatchEvent(new Event('change'))");
 mode='slow';await setDate(dateA);await sleep(30);mode='normal';await setDate(dateB);
 await wait("document.querySelector('.slot')?.textContent==='09:00'");await sleep(260);
 await check('Resposta antiga não substitui a data atual',"document.querySelector('.slot').textContent==='09:00'");
 await check('Horário ocupado desabilitado',"document.querySelector('.slot[disabled]').textContent==='10:00'");
 mode='slow';await setDate(dateA);await setDate('');
 await check('Cancelamento limpa aria-busy',"!document.querySelector('#slots').hasAttribute('aria-busy')");
 mode='empty';await setDate(dateA);await wait("document.querySelector('#slots').textContent.includes('Sem horários')");
 await check('Dia sem vagas orienta outra data',"document.querySelector('#slots').textContent.includes('Escolha outra data')");
 mode='error';await setDate(dateB);await wait("document.querySelector('#slots').textContent.includes('Não foi possível')");
 await check('Falha da agenda tem recuperação',"document.querySelector('#slots').textContent.includes('WhatsApp')");
 mode='normal';await setDate(dateA);await wait("document.querySelector('.slot:not([disabled])')");
 const fill="const f=document.querySelector('#bookingForm');f.elements.name.value='Cliente de teste';f.elements.phone.value='34999999999';f.elements.motorcycle.value='Moto de teste';f.elements.engine.selectedIndex=1;f.elements.consent.checked=true;";
 await ev("document.querySelector('.slot:not([disabled])').click();"+fill+"f.requestSubmit();");
 await wait("document.querySelector('#formFeedback').classList.contains('success')");
 assert.equal(posted.length,1);assert.equal(posted[0].service,'Lavagem premium');assert.equal(posted[0].consent,'yes');assert.equal(posted[0].time,'09:00');passed++;console.log('PASS Payload preserva contrato da API');
 await check('WhatsApp funciona mesmo com popup bloqueado',"document.querySelector('#formFeedback a').href.includes('QA-LOCAL')");
 await check('Sucesso limpa horário e serviço',"!document.querySelector('#timeInput').value && !document.querySelector('#serviceSelect').value");
 await S('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await check('Movimento reduzido respeitado',"getComputedStyle(document.querySelector('.hero-copy')).animationName==='none' && getComputedStyle(document.documentElement).scrollBehavior==='auto'");
 assert.deepEqual(errors,[]);passed++;console.log('PASS Sem exceções de JavaScript');
 console.log('\n'+passed+' verificações passaram; API simulada, nenhum pedido real enviado.');
}catch(error){
 console.error(error);
 process.exitCode=1;
}finally{
 clearTimeout(timer);ws?.close();
 try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch{child.kill();}
 server.closeAllConnections();
 await new Promise(r=>server.close(r));
 const relative=path.relative(path.resolve(tmpdir()),path.resolve(profile));
 assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(profile).startsWith('jv-ui-test-'));
 await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});
}

// CDP/Chromium may retain a closing socket on Windows. Preserve the test result after teardown.
process.exit(process.exitCode || 0);
