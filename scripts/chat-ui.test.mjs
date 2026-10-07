import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
class Element {
  constructor(tag='div') { this.tagName=tag; this.children=[]; this.listeners={}; this.dataset={}; this.style={}; this.attributes={}; this.value=''; this.textContent=''; this.offsetTop=0; this.scrollHeight=0; }
  set innerHTML(_) { throw new Error('Untrusted HTML must never be rendered'); }
  append(...nodes) { for (const n of nodes) { n.parent=this; this.children.push(n); } }
  replaceChildren(...nodes) { this.children=[]; this.append(...nodes); }
  setAttribute(k,v) { this.attributes[k]=v; }
  addEventListener(k,fn) { this.listeners[k]=fn; }
  remove() { if(this.parent) this.parent.children=this.parent.children.filter(c=>c!==this); }
  querySelector(selector) { return this.children.find(n=>n.className?.split(' ').includes(selector.slice(1))) || null; }
  focus() {}
  showModal() { this.open=true; }
  close() { this.open=false; this.listeners.close?.(); }
  requestSubmit() { return this.listeners.submit({preventDefault(){}}); }
}
async function setup(handler) {
  const ids=Object.fromEntries(['ai-messages','ai-form','ai-question','ai-send','ai-error','ai-mode','ai-suggestions','ai-connection','ai-reset','ai-panel','ai-close','ai-open','ai-launcher','ai-entry-title','ai-entry-desc'].map(id=>[id,new Element()]));
  const tabs=['public','business','school'].map(agency=>Object.assign(new Element('button'),{dataset:{agency}}));
  const calls=[];
  const document={ documentElement:{classList:{add(){},remove(){}}}, getElementById:id=>ids[id],createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text}),querySelectorAll:s=>s==='[data-agency]'?tabs:ids['ai-suggestions'].children };
  runInNewContext(readFileSync(new URL('../assets/js/chat.mjs',import.meta.url),'utf8'),{document,AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async(url,options)=>{if(url.endsWith('/status')) return Response.json({available:true}); calls.push(JSON.parse(options.body)); return handler(url,options);}});
  await new Promise(setImmediate);
  return {ids,tabs,calls,submit:async q=>{ids['ai-question'].value=q;return ids['ai-form'].requestSubmit();}};
}
const answer={parts:[{text:'안내 <script>alert(1)</script>'},{citation:1}],sources:[{url:'https://nts.go.kr/guide',title:'공식 안내'}]};
test('renders answers as text with clickable citations and sends follow-up context',async()=>{
 const ui=await setup(async()=>Response.json(answer));
 await ui.submit('사업자등록 절차는?');
 assert.equal(ui.ids['ai-question'].value,'');
 const assistant=ui.ids['ai-messages'].children.at(-1);
 assert.equal(assistant.children[1].children[0].textContent,answer.parts[0].text);
 assert.equal(assistant.children[1].children[1].href,answer.sources[0].url);
 await ui.submit('다음 단계는?');
 assert.equal(ui.calls[1].messages.length,3);
 assert.equal(ui.calls[1].messages[0].role,'user');
});
test('an API failure preserves question and allows retry',async()=>{
 const ui=await setup(async()=>Response.json({error:'잠시 후 다시 시도'}, {status:429}));
 await ui.submit('질문');
 assert.equal(ui.ids['ai-question'].value,'질문');
 assert.equal(ui.ids['ai-send'].disabled,false);
 assert.equal(ui.ids['ai-error'].textContent,'잠시 후 다시 시도');
});
test('switching institutions discards an old response and clears conversation history',async()=>{
 let resolve;
 const ui=await setup(()=>new Promise(r=>{resolve=r;}));
 const pending=ui.submit('예전 기관 질문');
 ui.tabs[2].listeners.click();
 resolve(Response.json(answer));await pending;
 assert.equal(ui.ids['ai-messages'].children.length,1);
 assert.equal(ui.ids['ai-messages'].children[0].className,'ai-welcome');
 assert.equal(ui.tabs[2].attributes['aria-pressed'],'true');
 assert.equal(ui.ids['ai-send'].disabled,false);
});
test('Korean IME enter and shift-enter do not submit',async()=>{
 const ui=await setup(async()=>Response.json(answer));
 ui.ids['ai-question'].value='한글';
 for(const props of [{isComposing:true},{shiftKey:true}])ui.ids['ai-question'].listeners.keydown({key:'Enter',preventDefault(){},...props});
 assert.equal(ui.calls.length,0);
});

test('closing and reopening the panel preserves conversation and draft without another API call',async()=>{
 const ui=await setup(async()=>Response.json(answer));
 ui.ids['ai-open'].listeners.click();
 assert.equal(ui.ids['ai-panel'].open,true);
 await ui.submit('우리 회사에 어떤 도움을 줄 수 있나요?');
 ui.ids['ai-question'].value='후속 질문 초안';
 const messages=ui.ids['ai-messages'].children;
 ui.ids['ai-close'].listeners.click();
 assert.equal(ui.ids['ai-panel'].open,false);
 ui.ids['ai-launcher'].listeners.click();
 assert.equal(ui.ids['ai-panel'].open,true);
 assert.equal(ui.ids['ai-messages'].children,messages);
 assert.equal(ui.ids['ai-question'].value,'후속 질문 초안');
 assert.equal(ui.calls.length,1);
});
test('entry suggestion opens panel and submits the selected sector',async()=>{
 const ui=await setup(async()=>Response.json(answer));
 ui.tabs[2].listeners.click();
 ui.ids['ai-suggestions'].children[0].listeners.click();
 await new Promise(setImmediate);
 assert.equal(ui.ids['ai-panel'].open,true);
 assert.equal(ui.calls[0].agency,'school');
});
