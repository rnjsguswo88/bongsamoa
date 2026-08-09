const fs=require('fs'); const {JSDOM}=require('jsdom'); const csstree=require('css-tree');
// 시안 자동 점검 · 사용법
//   npm install jsdom css-tree
//   node docs/시안점검.js
const P=require('path').join(__dirname,'..','봉사모아_화면시안.html');
const html=fs.readFileSync(P,'utf8');
const css=html.split('<style>')[1].split('</style>')[0];
const body=html.split('<script>')[0];
let fail=0; const t=(n,c,e='')=>{if(!c)fail++;console.log((c?'  ✔ ':'  ✘ ')+n+(c?'':' → '+JSON.stringify(e).slice(0,160)));};

console.log('── 1. 구조 ──');
t('div 균형',(body.match(/<div\b/g)||[]).length===(body.match(/<\/div>/g)||[]).length);
let errs=[]; const ast=csstree.parse(css,{positions:true,onParseError:e=>errs.push(e.message+' 줄'+e.line)});
t('CSS 파서 오류 없음',!errs.length,errs);
let badSel=[]; csstree.walk(ast,{visit:'Rule',enter(n){const x=csstree.generate(n.prelude); if(/[가-힣]/.test(x))badSel.push(x.slice(0,50));}});
t('선택자에 주석 파편 없음',!badSel.length,badSel);
const sels=new Set(); csstree.walk(ast,{visit:'Rule',enter(n){csstree.generate(n.prelude).split(',').forEach(x=>sels.add(x.trim()));}});
t('핵심 규칙 생존',['.crow','.tl','.cinfo','.group','.hd','.body','.nav','.foot','.devnote','.quiet'].every(m=>sels.has(m)));
let d=0,orph=[]; css.split('\n').forEach((l,i)=>{const x=l.trim(); if(d===0&&x.includes('*/')&&!x.includes('/*'))orph.push(i+1); d+=(x.split('/*').length-1)-(x.split('*/').length-1); if(d<0)d=0;});
t('고아 주석 없음',!orph.length,orph);
const used=new Set(); (body.match(/class="([^"]+)"/g)||[]).forEach(m=>m.slice(7,-1).split(' ').forEach(c=>used.add(c)));
const defn=new Set(css.match(/\.([a-zA-Z][\w-]*)/g).map(x=>x.slice(1)));
t('CSS 미정의 클래스 없음',[...used].every(c=>defn.has(c)),[...used].filter(c=>!defn.has(c)));

console.log('\n── 2. 문구 ──');
const foots=(body.match(/<div class="foot"[^>]*>([\s\S]*?)<\/div>/g)||[]).map(f=>f.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const over=foots.filter(f=>f.length>65);
t(`안내문 ${foots.length}개 모두 65자 이하`,!over.length,over);
{const strays=(body.match(/<[^>]*>[^<]*이야기[^<]*/g)||[]).filter(x=>!x.includes('다녀오신 이야기'));
 t('«이야기» 잔재 없음 (후기로 통일)',strays.length===0,strays.slice(0,3));}
t('구용어 «확인 못 함» 없음',!html.includes('확인 못 함'));
t('구용어 «표시 이름» 없음',!html.includes('표시 이름'));
t('구용어 «별명» 없음',!html.includes('별명'));
{const dn=(body.match(/class="devnote"/g)||[]).length;
 const bad=foots.filter(f=>f.includes('시안 확인용'));
 t(`시안용 안내 ${dn}개가 모두 devnote 로 분리`, bad.length===0, bad);}

console.log('\n── 3. 개인정보 ──');
t('봉사자 휴대폰 없음',!/01[0-9]-\d{3,4}-\d{4}/.test(html));
t('실명 노출 없음',!['김서연','박준호','이민지','정하늘','최유진','권현재'].some(n=>new RegExp('>[^<]*'+n).test(html)));

const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://x.com/a.html',pretendToBeVisual:true,beforeParse(w){w.onerror=m=>{fail++;console.log('  ✘ 런타임:',m);};}});
const w=dom.window,doc=w.document;
setTimeout(()=>{
  console.log('\n── 4. 동작 ──');
  const ids=[...doc.querySelectorAll('.scr')].map(e=>e.id);
  const on=()=>[...doc.querySelectorAll('.scr.on')].map(e=>e.id);
  let bad=[]; ids.forEach(i=>{try{w.go(i); if(on()[0]!==i)bad.push(i);}catch(e){bad.push(i+':'+e.message);}});
  t(`화면 ${ids.length}개 이동`,!bad.length,bad);
  let he=[]; doc.querySelectorAll('[onclick]').forEach(el=>{try{new w.Function('event',el.getAttribute('onclick')).call(el,{target:el,stopPropagation(){}});}catch(e){he.push(el.getAttribute('onclick').slice(0,40));}});
  t(`클릭 핸들러 ${doc.querySelectorAll('[onclick]').length}개 실행`,!he.length,he.slice(0,4));
  const idset=new Set([...doc.querySelectorAll('[id]')].map(e=>e.id));
  t('끊긴 화면 참조 없음',[...html.matchAll(/(?:go|goBack|openSheet|closeSheet)\('([a-zA-Z0-9_-]+)'\)/g)].every(m=>idset.has(m[1])));
  const fns=new Set([...html.matchAll(/^function ([a-zA-Z]+)/gm)].map(m=>m[1]));
  {const cnt=f=>(html.match(new RegExp('\\b'+f+'\\b','g'))||[]).length;
 t('죽은 함수 없음',[...fns].every(f=>cnt(f)>1),[...fns].filter(f=>cnt(f)<=1));}

  console.log('\n── 5. 되돌릴 수 없는 동작의 확인 단계 ──');
  const danger=['dropApplicant','cancelApply','closeSession','transferConfirm','removeMember','deleteReview','reject','riskConfirm'];
  danger.forEach(n=>{
    doc.getElementById('modal').style.display='none';
    try{ w[n].apply(null,(html.match(new RegExp('function '+n+'\\(([^)]*)\\)'))||[,''])[1].split(',').filter(Boolean).map(()=>'테스트')); }catch(e){}
    const b=[...doc.getElementById('m-actions').querySelectorAll('button')];
    t(`${n} · 취소 버튼 + 위험 표시`, b.length>=2 && b[0].className.includes('btn-d'), b.map(x=>x.textContent));
  });
  console.log('\n'+(fail?`  ✘ ${fail}건 실패`:'  ✔ 전체 통과'));
},600);

setTimeout(()=>process.exit(fail?1:0),900);
