/* ==========================================================================
   flow-engine.js — mesin Diagram Alir Matematika untuk TheoryWiki
   Hasil port dari "Markdown + Diagram Alir Matematika.html" (logika mesin tidak diubah).
   Perubahan dibanding file asal hanya 3 hal, ditandai dengan komentar [PORT]:
     1. seluruh kode dibungkus IIFE agar nama (parse, esc, MX, ...) tidak bentrok dengan script.js
     2. pintasan papan ketik hanya aktif untuk diagram yang sedang di-hover/fokus
     3. tata letak "sempit" dipicu lebar kotak diagram, bukan lebar layar
     4. widget melayang: posisi dikoreksi lewat fx() agar benar walau induk membuat containing block
     (+ with(MX) -> with(FlowEngine.MX), karena new Function() hanya melihat lingkup global)
   Pemakaian di artikel:  ```flow ... ```   (sintaks lengkap: lihat README / tombol Sintaks di file asal)
   API:  FlowEngine.mount(el, source, lineOffset, {goto:boolean})   dan   setupFlowDiagrams(root)
   KaTeX (katex.renderToString) dipakai dari KaTeX yang sudah dimuat index.html.
   ========================================================================== */
(function () {
let ACT = null;   // [PORT] aksi diagram aktif (dulu di baris 129 file asal)
/* [PORT] tempatkan widget melayang tepat di koordinat layar (x,y). Bila ada induk yang mengubah
   containing block position:fixed (transform/animasi), selisihnya diukur lalu dikoreksi. */
const fx = (w, x, y) => {
  w.style.left = x + 'px'; w.style.top = y + 'px';
  const r = w.getBoundingClientRect(), ex = r.left - x, ey = r.top - y;
  if (Math.abs(ex) > 1 || Math.abs(ey) > 1) { w.style.left = (x - ex) + 'px'; w.style.top = (y - ey) + 'px'; }
};
function gotoLine(n) { if (window.FlowEngine && FlowEngine.gotoLine) FlowEngine.gotoLine(n); }   // [PORT] pengganti gotoLine versi halaman tunggal

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const km=(t,d)=>{try{return katex.renderToString(t,{displayMode:d,output:'mathml',throwOnError:false})}catch(e){return esc(t)}};
const MRE=/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/;
const mm=s=>s.slice(0,2)=='$$'?km(s.slice(2,-2),true):km(s.slice(1,-1),false);
const rich=s=>s.split(MRE).map((p,i)=>i%2?mm(p):esc(p)).join('');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const FT=e=>new Function('t','v','with(Math){with(FlowEngine.MX){with(v){return('+rep(e)+')}}}');
const nn=x=>typeof x=='number'?String(+x.toPrecision(5)).replace(/e([+-]?\d+)/,'\\cdot10^{$1}'):String(x);
const tx=(x,p)=>Array.isArray(x)?'\\begin{bmatrix}'+(Array.isArray(x[0])?x:[x]).map(r=>r.map(nn).join('&')).join('\\\\')+'\\end{bmatrix}':(p&&x<0?'\\left('+nn(x)+'\\right)':nn(x));
const fmt=x=>Array.isArray(x)?'['+x.map(fmt).join(', ')+']':typeof x=='number'?(Number.isInteger(x)?String(x):String(+x.toPrecision(7))):String(x);
const sc=x=>Array.isArray(x)?Math.hypot(...x.flat(9)):+x;
const mat=A=>{const R=Array.isArray(A[0])?A:[A],m=Math.max(...R.flat().map(Math.abs).filter(isFinite),1e-12);return'<table class="mx">'+R.map(r=>'<tr>'+r.map(x=>'<td style="background:color-mix(in srgb,var(--ac) '+Math.round(Math.min(Math.abs(x)/m,1)*40)+'%,transparent)">'+(typeof x=='number'?+x.toPrecision(5):esc(x))+'</td>').join('')+'</tr>').join('')+'</table>'};
const cell=x=>Array.isArray(x)?mat(x):fmt(x);
const MX={mul:(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s+a*B[k][j],0))),add:(A,B)=>A.map((r,i)=>r.map((a,j)=>a+B[i][j])),sub:(A,B)=>A.map((r,i)=>r.map((a,j)=>a-B[i][j])),scale:(k,A)=>A.map(r=>r.map(a=>k*a)),T:A=>A[0].map((_,j)=>A.map(r=>r[j])),eye:n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i==j))),norm:A=>Math.hypot(...[A].flat(9)),
det:A=>{const M=A.map(r=>[...r]),n=M.length;let d=1;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;if(!M[p][i])return 0;if(p!=i){[M[p],M[i]]=[M[i],M[p]];d=-d}d*=M[i][i];for(let r=i+1;r<n;r++){const f=M[r][i]/M[i][i];for(let c=i;c<n;c++)M[r][c]-=f*M[i][c]}}return d},
inv:A=>{const n=A.length,M=A.map((r,i)=>[...r,...MX.eye(n)[i]]);for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;if(!M[p][i])throw Error('matriks singular');[M[p],M[i]]=[M[i],M[p]];const d=M[i][i];M[i]=M[i].map(x=>x/d);for(let r=0;r<n;r++)if(r!=i){const f=M[r][i];M[r]=M[r].map((x,c)=>x-f*M[i][c])}}return M.map(r=>r.slice(n))}};
let CUR=null;   // [ACAK] objek state yang sedang dijalankan; state RNG ada di CUR.__s sehingga ikut tersimpan/undo
if(window.TWRandom)Object.assign(MX,TWRandom.engineFns(()=>CUR));   // random, normal, binomial, poisson, ..., normcdf, ... (lihat random.js)
const RNDRE=/\b(?:random|rand|randn|gauss|randint|choice|shuffle|times|normal|lognormal|uniform|exponential|bernoulli|binomial|poisson|geometric)\s*\(/;
const rep=s=>s.replace(/\^/g,'**');
const COL=['#273340','#ff9800','#2f56c9','#d94f3d'];
let WZ=40;
const ST=[[31,45,92],[43,123,185],[251,233,215],[255,152,0],[217,79,61]],hc=t=>{t=Math.max(0,Math.min(1,isFinite(t)?t:0));const k=t*4,i=Math.min(3,Math.floor(k)),f=k-i,a=ST[i],b=ST[i+1];return'rgb('+a.map((v,j)=>Math.round(v+(b[j]-v)*f)).join(',')+')'};
const tk=(t,names)=>t.replace(/([A-Za-z_]\w*)(\s*\()?|(\d+\.?\d*)|(\*\*|<=|>=|!=|==)|([\s\S])/g,(m,id,pa,nu,op,ch)=>id?(pa||!names.has(id)?'<i class="fn">'+id+'</i>'+(pa?'(':''):'<b class="vr">'+id+'</b>'):nu?'<span class="nm">'+nu+'</span>':op?{'**':'^','<=':'≤','>=':'≥','!=':'≠','==':'='}[op]:({'*':'×','/':'÷','-':'−','<':'&lt;','>':'&gt;','&':'&amp;'}[ch]||ch));
const pretty=(c,names)=>c.split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^([A-Za-z_]\w*)\s*([-+*\/]?)=(?!=)\s*([\s\S]*)$/);return'<div class="st">'+(m?'<span class="vb">ubah</span><b class="vr">'+m[1]+'</b><span class="ar">←</span><span class="ex">'+tk(m[2]?m[1]+m[2]+'('+m[3]+')':m[3],names)+'</span>':'<span class="ex">'+tk(x,names)+'</span>')+'</div>'}).join('');
const css=(e,k)=>getComputedStyle(e).getPropertyValue(k).trim();
const hh=(c,d)=>c.closest('.wb')?(c.clientHeight||d):d;
const nt=(a,b,n)=>{if(!isFinite(a+b)||a==b)return[a];const r=(b-a)/n,e=Math.pow(10,Math.floor(Math.log10(r))),q=r/e,st=(q<1.5?1:q<3?2:q<7?5:10)*e,o=[];for(let t=Math.ceil(a/st-1e-9)*st;t<=b+st*1e-9;t+=st)o.push(+t.toPrecision(12));return o},
tl=v=>{const a=Math.abs(v);return a==0?'0':a>=1e5||a<1e-3?v.toExponential(0).replace('e+','e'):String(+v.toPrecision(3))};
function axes(c,g,w,H,m,X,Y,xr,yr,xl,yl,lg){const[l,t,r,b]=m;g.save();g.font='700 10.5px system-ui,sans-serif';g.lineWidth=1;g.strokeStyle=css(c,'--grid');g.fillStyle=css(c,'--mut');g.setLineDash([2,4]);
 g.textAlign='right';nt(yr[0],yr[1],Math.max(2,Math.round((H-t-b)/38))).forEach(v=>{const y=Y(v);if(!(y>=t-1&&y<=H-b+1))return;g.beginPath();g.moveTo(l,y);g.lineTo(w-r,y);g.stroke();g.fillText((lg?'1e':'')+tl(v),l-5,y+3.5)});
 g.textAlign='center';nt(xr[0],xr[1],Math.max(2,Math.round((w-l-r)/70))).forEach(v=>{const x=X(v);if(!(x>=l-1&&x<=w-r+1))return;g.beginPath();g.moveTo(x,t);g.lineTo(x,H-b);g.stroke();g.fillText(tl(v),x,H-b+13)});
 g.setLineDash([]);g.strokeStyle=css(c,'--fg');g.lineWidth=1.4;g.beginPath();g.moveTo(l,t);g.lineTo(l,H-b);g.lineTo(w-r,H-b);g.stroke();
 g.fillStyle=css(c,'--fg');g.font='800 11px system-ui,sans-serif';g.fillText(xl,l+(w-l-r)/2,H-4);g.translate(11,t+(H-t-b)/2);g.rotate(-Math.PI/2);g.fillText(yl,0,0);g.restore()}
function cvs(c,h){const d=devicePixelRatio||1,w=c.clientWidth;if(!c.closest('.wb'))c.style.height=h+'px';c.width=w*d;c.height=h*d;const g=c.getContext('2d');g.scale(d,d);g.clearRect(0,0,w,h);g.font='700 11px system-ui,sans-serif';g.lineJoin=g.lineCap='round';return[g,w]}

function parse(src,off=0){
 const nodes=[],P={nodes,plot:[],curve:null,params:[],views:[],derive:[]};
 for(const [li,raw] of src.split('\n').entries()){
  let l=raw.trim(),m,go;const ln_=off+li+1;if(!l||l[0]=='#')continue;
  if(m=l.match(/^seed:\s*(\d+)/i)){P.seed=(+m[1])>>>0;continue}
  if(m=l.match(/^plot:\s*(.+)/i)){P.plot=m[1].split(',').map(s=>s.trim()).filter(Boolean);continue}
  if(m=l.match(/^conv:\s*(.+)/i)){P.conv=m[1].trim();continue}
  if(m=l.match(/^out:\s*(.+)/i)){P.out=m[1].split(',').map(s=>s.trim()).filter(Boolean);continue}
  if(m=l.match(/^derive:\s*(.+?)\s+\|\s+(.+)$/i)){P.derive.push({tex:m[1],txt:m[2]});continue}
  if(m=l.match(/^param:\s*(\w+)\s*=\s*(.+)/i)){const q=m[2].split('|'),p=q.map(s=>+s);P.params.push({k:m[1],val:p[0],min:p[1]??0,max:p[2]??10,step:p[3]??.1,sym:(q[4]||'').trim()||m[1]});continue}
  if(m=l.match(/^view:\s*(.+)/i)){const p=m[1].split(' | ').map(s=>s.trim());P.views.push({t:p[0],a:p.slice(1)});continue}
  if(m=l.match(/^curve:\s*(.+)/i)){const p=m[1].split(' | ');P.curve={f:p[0],v:(p[1]||'').trim(),a:+p[2],b:+p[3]};continue}
  if(m=l.match(/^(.*?)\s*->\s*(\w+)\s*$/)){l=m[1];go=m[2]}
  if(m=l.match(/^(\w+)\s*\[(\w+)\]\s*(.*)$/)){
   let t=m[3],i=t.lastIndexOf(' | '),code='';
   if(i>=0){code=t.slice(i+3).trim();t=t.slice(0,i)}
   nodes.push({id:m[1],type:m[2],label:t.trim(),code,go,line:ln_});continue}
  return{err:'sintaks tidak dikenali: '+l,line:ln_}
 }
 if(!nodes.length)return{err:'Diagram kosong. Tulis node: id [tipe] label | kode'};
 const ix={};nodes.forEach((n,i)=>ix[n.id]=i);
 let cur;try{nodes.forEach((n,i)=>{cur=n;
  if(n.type=='cond'){
   const m=n.code.match(/^([\s\S]*?)\?\s*(\w+)\s*:\s*(\w+)\s*$/);
   if(!m||ix[m[2]]==null||ix[m[3]]==null)throw Error('Node '+n.id+': kondisi harus berbentuk  ekspresi ? idYa : idTidak');
   n.test=m[1];n.t=ix[m[2]];n.f=ix[m[3]];n.ft=new Function('v','with(Math){with(FlowEngine.MX){with(v){return('+rep(m[1])+')}}}');
  }else{
   if(n.go!=null&&ix[n.go]==null)throw Error('Node '+n.id+': tujuan "'+n.go+'" tidak ada');
   n.next=n.type=='end'?null:n.go!=null?ix[n.go]:(i+1<nodes.length?i+1:null);
   if(n.code)n.fn=new Function('v','with(Math){with(FlowEngine.MX){with(v){'+rep(n.code)+'\n}}}');
  }});
  cur=null;if(P.curve)P.curve.fn=new Function('t','v','with(Math){with(FlowEngine.MX){with(v){return('+rep(P.curve.f)+')}}}');
 }catch(e){return{err:e.message,line:cur&&cur.line}}
 P.rand=P.seed!=null||nodes.some(n=>RNDRE.test(n.code||'')||RNDRE.test(n.test||''));
 return P}

let UID=0;
function mount(el,src,off,opt){
 const P=parse(src,off);if(P.err){el.innerHTML='<div class="err">⚠ '+(P.line?'Baris '+P.line+': ':'')+esc(P.err)+(P.line&&opt&&opt.goto?'<button>Ke baris</button>':'')+'</div>';const b=el.querySelector('button');if(b)b.onclick=()=>gotoLine(P.line);return}
 const N=P.nodes,id=++UID;
 let SEED=P.seed!=null?P.seed:(Math.random()*4294967296)>>>0;
 el.innerHTML='<div class="fl"><div class="cv"><svg class="ed"></svg><div class="col"></div></div><div class="side"><div class="ctl c1"><button data-a="b">◀ Mundur</button><button data-a="s">Langkah</button><button data-a="p" class="pri">▶ Jalankan</button><button data-a="r">Ulangi</button><select data-mode aria-label="Mode jalan"><option value="anim">Animasi</option><option value="inst">Instan</option><option value="whatif">Eksplorasi</option><option value="explain">Penjelasan</option></select><label>kecepatan <input type="range" min="1" max="10" value="5"></label></div><div class="ctl"><input type="range" data-sc min="0" max="0" value="0" style="flex:1" aria-label="Linimasa langkah"><span class="mu sn"></span></div><div class="prm"></div><div class="vars"></div><div class="xp" hidden></div><div class="wi" hidden></div><div class="dt" hidden></div><div class="ctl"><label class="ck"><input type="checkbox" data-o="log">skala log</label><label class="ck"><input type="checkbox" data-o="shared">sumbu bersama</label></div><canvas class="ch"></canvas><canvas class="cu"></canvas><canvas class="cg"></canvas><div class="cx mu"></div><div class="vw"></div><div class="log"></div></div></div>';
 const Q=s=>el.querySelector(s),cv=Q('.cv'),svg=Q('.ed'),col=Q('.col'),cch=Q('.ch'),ccu=Q('.cu'),btnP=Q('[data-a=p]'),scr=Q('[data-sc]'),tip=Object.assign(document.createElement('div'),{className:'tip',hidden:true});el.append(tip);
 const sdEl=document.createElement('span');sdEl.className='mu sd';
 if(P.rand){const zb=document.createElement('button');zb.dataset.a='z';zb.title='Ambil seed baru lalu ulangi dari awal';zb.textContent='🎲 Acak ulang';Q('[data-a=r]').after(zb);zb.after(sdEl)}
 N.forEach(n=>{n.el=document.createElement('div');n.el.className='nd '+n.type;n.el.innerHTML='<span class="tp">'+({start:'🚀 mulai',proc:'🧮 hitung',cond:'🤔 tanya',end:'🏁 selesai'}[n.type]||n.type)+'</span><div class="lb">'+rich(n.label)+'</div><div class="rc"></div><div class="sb"></div>';n.sb=n.el.lastChild;col.append(n.el)});
 const names=new Set();
 N.forEach(n=>{if(n.type!='cond')(n.code||'').replace(/(?:^|[;\s,(])([A-Za-z_]\w*)\s*[-+*\/]?=(?!=)/g,(m,a)=>names.add(a))});
 P.params.forEach(p=>names.add(p.k));N.forEach(n=>{const c=n.type=='cond'?n.test:n.code;if(c)n.el.querySelector('.rc').innerHTML=(n.type=='cond'?'<div class="st"><span class="vb">apakah</span><span class="ex">'+tk(c,names)+'</span><span class="vb">?</span></div>':pretty(c,names))+'<details class="raw"><summary>‹/› kode asli</summary><code>'+esc(c)+'</code></details>'});N.forEach(n=>{n.cols=[...new Set(((n.type=='cond'?n.test:n.code)||'').match(/[A-Za-z_]\w*/g)||[])].filter(k=>names.has(k))});const E=[];N.forEach((n,i)=>{if(n.type=='cond'){E.push([i,n.t,'ya']);if(n.f!=n.t)E.push([i,n.f,'tidak'])}else if(n.next!=null)E.push([i,n.next,''])});
 let v,pv,pc,hist,L,done,steps,edge,playing=false,sel=null,U=[],hn=[-1],HV=null,far=0,MODE='anim',BASE=null,BASEV=null,APR=null,OUT=null,XS=0;
 function reset(){U=[];hn=[-1];HV=null;far=0;N.forEach(n=>{n.vis=[];n.sb.innerHTML=''});v={};names.forEach(k=>v[k]=0);P.params.forEach(p=>v[p.k]=p.val);v.__s=SEED|0;sdEl.textContent=P.rand?'seed '+(SEED>>>0):'';pv=null;pc=0;hist=[structuredClone(v)];L=[];done=false;steps=0;edge='';playing=false;btnP.textContent='▶ Jalankan';render();if(MODE=='whatif')runAll()}
 function runAll(){playing=false;btnP.textContent='▶ Jalankan';let i=0;while(!done&&i++<5200)step(true);render()}
 function step(q){
  if(done)return;CUR=v;const n=N[pc];U.push({v:structuredClone(v),pv,pc,done,steps,edge,hl:hist.length,ll:L.length,vl:N.map(n=>n.vis.length)});pv=structuredClone(v);let to=null,res;
  try{
   if(n.type=='cond'){const r=!!n.ft(v);res=r;to=r?n.t:n.f;L.push(n.id+' ? '+(r?'ya':'tidak')+' → '+N[to].id)}
   else{
    if(n.fn){n.fn(v);const ch=[...names].filter(k=>!eq(pv[k],v[k]));L.push(n.id+' ▸ '+(ch.length?ch.map(k=>k+'='+(Array.isArray(v[k])&&(Array.isArray(v[k][0])||v[k].length>6)?'['+v[k].length+(Array.isArray(v[k][0])?'×'+v[k][0].length:' nilai')+']':fmt(v[k]))).join(' · '):'(tetap)'))}
    else L.push(n.id+' ▸ '+(n.type=='end'?'selesai':'mulai'));
    to=n.next;
   }
   if(n.type=='proc'){hist.push(structuredClone(v));hn.push(pc)}if(n.cols.length){const s=sbs(n,pv,v,res);n.sb.innerHTML=s;n.vis.push({...Object.fromEntries(n.cols.map(k=>[k,structuredClone(v[k])])),r:res,s})}
  }catch(e){L.push('⚠ baris '+n.line+' ('+n.id+'): '+e.message);done=true}
  if(!done){if(n.type=='end'||to==null)done=true;else{edge=pc+'>'+to;pc=to}if(++steps>5000){done=true;L.push('⚠ batas 5000 langkah')}}
  q||render()}
 function mark(){svg.querySelectorAll('.e').forEach(p=>p.classList.toggle('on',p.dataset.k==edge))}
 function render(){
  N.forEach((n,i)=>n.el.classList.toggle('act',i==pc));mark();
  Q('.vars').innerHTML=[...names].map(k=>'<span class="chip'+(pv&&!eq(pv[k],v[k])?' ch':'')+'"><b>'+k+'</b>'+cell(v[k])+'</span>').join('')+(done?'<span class="chip dn">✔ selesai · '+steps+' langkah</span>':'');
  const lg=Q('.log');lg.innerHTML=L.slice(-60).map(esc).join('<br>');lg.scrollTop=lg.scrollHeight;charts();detail();far=Math.max(far,U.length);scr.max=far;scr.value=U.length;Q('.sn').textContent=U.length+' / '+far;MODE=='whatif'?done&&wi():(Q('.wi').hidden=true);xpr()}
 function goto(k){playing=false;btnP.textContent='▶ Jalankan';while(U.length>k)back();while(U.length<k&&!done)step()}
 function sbs(n,b,a,res){
  const m=n.label.match(/\$([^$\n]+?)\$/);if(!m)return'';const t=m[1],cd=n.type=='cond',i=t.search(/\\leftarrow|\\gets/);let L='',R='';
  if(cd)R=t;else if(i>=0){const q=t.slice(i).match(/^\\(?:leftarrow|gets)/)[0];L=t.slice(0,i)+q;R=t.slice(i+q.length)}
  else if((t.match(/=/g)||[]).length==1){const j=t.indexOf('=');L=t.slice(0,j+1);R=t.slice(j+1)}else return'';
  let o=L+R.replace(/[A-Za-z_]\w*/g,(w,off)=>Object.hasOwn(b,w)&&R[off-1]!='\\'?'\\textcolor{#e5484d}{'+tx(b[w],1)+'}':w);
  if(cd)o+='\\ \\Rightarrow\\ \\text{'+(res?'ya':'tidak')+'}';else{const q=L.replace(/\\leftarrow|\\gets|=/g,'').trim();if(Object.hasOwn(a,q))o+='=\\textcolor{#0d8a5f}{'+tx(a[q])+'}'}
  return km(o,false)}
 function back(){const s=U.pop();if(!s)return;v=s.v;pv=s.pv;pc=s.pc;done=s.done;steps=s.steps;edge=s.edge;hist.length=hn.length=s.hl;L.length=s.ll;N.forEach((n,i)=>{n.vis.length=s.vl[i];n.sb.innerHTML=(n.vis[n.vis.length-1]||{}).s||''});render()}
 function vw(){el.querySelectorAll('.vc').forEach((c,i)=>{try{view(c,P.views[i])}catch(e){}})}
 function view(c,V){
  if(!c.clientWidth)return;const H=hh(c,190),[g,w]=cvs(c,H),mut=css(c,'--mut'),ac=css(c,'--ac'),A=V.a,E=s=>(V.f=V.f||{})[s]||(V.f[s]=FT(s)),Z=(s,r,u)=>E(s)(u||0,r),last=hist[hist.length-1],prev=hist[hist.length-2]||last,p=56,m=[56,14,12,34],LB=({scatter:[A[0],A[1]],param:['x(t)','y(t)'],vec:['x','y'],tangent:[A[1],'f(t)'],interval:['t','f(t)'],bar:['indeks',A[0]],fit:[A[3]||'x',A[4]||'y'],hist:[A[0],'densitas']})[V.t]||['x','y'];
  const fr=(x0,x1,y0,y1)=>{const X=x=>m[0]+(x-x0)/(x1-x0||1)*(w-m[0]-m[2]),Y=y=>H-m[3]-(y-y0)/(y1-y0||1)*(H-m[1]-m[3]);axes(c,g,w,H,m,X,Y,[x0,x1],[y0,y1],LB[0],LB[1]);g.strokeStyle=css(c,'--fg');g.lineWidth=1;if(x0<0&&x1>0){g.beginPath();g.moveTo(X(0),m[1]);g.lineTo(X(0),H-m[3]);g.stroke()}if(y0<0&&y1>0){g.beginPath();g.moveTo(m[0],Y(0));g.lineTo(w-m[2],Y(0));g.stroke()}return[X,Y]};
  const rg=a=>{let lo=Math.min(...a),hi=Math.max(...a);if(!isFinite(lo+hi))return[0,1];if(lo==hi){lo--;hi++}const d=(hi-lo)*.08;return[lo-d,hi+d]},dt=(x,y,r,col)=>{g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill()},ln=(X,Y,xs,ys)=>{g.strokeStyle=ac;g.lineWidth=1.5;g.beginPath();xs.forEach((x,i)=>i?g.lineTo(X(x),Y(ys[i])):g.moveTo(X(x),Y(ys[i])));g.stroke()};
  if(V.t=='scatter'){const pr=hist.map(r=>{try{return[+Z(A[0],r),+Z(A[1],r)]}catch(e){return null}}).filter(q=>q&&isFinite(q[0]+q[1])),xs=pr.map(q=>q[0]),ys=pr.map(q=>q[1]),[X,Y]=fr(...rg(xs),...rg(ys));ln(X,Y,xs,ys);xs.forEach((x,i)=>dt(X(x),Y(ys[i]),i==xs.length-1?5:2.5,i==xs.length-1?'#e5484d':ac))}
  else if(V.t=='param'){const t0=+A[2],t1=+A[3],S=Array.from({length:201},(_,i)=>t0+(t1-t0)*i/200),xs=S.map(s=>Z(A[0],last,s)),ys=S.map(s=>Z(A[1],last,s)),[X,Y]=fr(...rg(xs),...rg(ys));ln(X,Y,xs,ys);hist.forEach((r,i)=>{const s=+Z(A[4],r);dt(X(Z(A[0],last,s)),Y(Z(A[1],last,s)),i==hist.length-1?5:2.5,i==hist.length-1?'#e5484d':mut)})}
  else if(V.t=='vec'){const cl=r=>{const M=Z(A[0],r);return Array.isArray(M[0])?M[0].map((_,j)=>M.map(q=>q[j])):[M]},R=Math.max(...hist.flatMap(r=>cl(r).flat()).map(Math.abs),1e-9)*1.15,ar=(w-m[0]-m[2])/(H-m[1]-m[3]),[X,Y]=fr(-R*ar,R*ar,-R,R);[[prev,.3],[last,1]].forEach(([r,al])=>cl(r).forEach((q,j)=>{g.globalAlpha=al;g.strokeStyle=g.fillStyle=COL[j%4];g.lineWidth=2;g.beginPath();g.moveTo(X(0),Y(0));g.lineTo(X(q[0]),Y(q[1]));g.stroke();dt(X(q[0]),Y(q[1]),4,COL[j%4]);g.globalAlpha=1}))}
  else if(V.t=='tangent'){const f=x=>+Z(A[0],last,x),xs=hist.slice(1).map(r=>+r[A[1]]).filter(isFinite);if(!xs.length)return;const[l0,h0]=rg(xs),d=(h0-l0)*.3,x0=l0-d,x1=h0+d,S=Array.from({length:161},(_,i)=>x0+(x1-x0)*i/160),ys=S.map(f),[y0,y1]=rg(ys.concat(0)),[X,Y]=fr(x0,x1,y0,y1),xn=+last[A[1]],xp=hist.length>2?+prev[A[1]]:xn,h=1e-6*(1+Math.abs(xp)),m=(f(xp+h)-f(xp-h))/(2*h);ln(X,Y,S,ys);g.save();g.beginPath();g.rect(m[0],m[1],w-m[0]-m[2],H-m[1]-m[3]);g.clip();g.strokeStyle=COL[0];g.setLineDash([5,3]);g.beginPath();g.moveTo(X(x0),Y(f(xp)+m*(x0-xp)));g.lineTo(X(x1),Y(f(xp)+m*(x1-xp)));g.stroke();g.restore();g.setLineDash([]);dt(X(xp),Y(f(xp)),4,COL[0]);dt(X(xn),Y(0),5,'#e5484d')}
  else if(V.t=='interval'){const R=hist.filter(r=>+r[A[0]]!=+r[A[1]]);if(!R.length)return;const lo=Math.min(...R.map(r=>+r[A[0]])),hi=Math.max(...R.map(r=>+r[A[1]])),d=(hi-lo)*.1,f=x=>+Z(A[2],last,x),S=Array.from({length:161},(_,i)=>lo-d+(hi-lo+2*d)*i/160),ys=S.map(f),[y0,y1]=rg(ys.concat(0)),[X,Y]=fr(lo-d,hi+d,y0,y1);R.forEach((r,i)=>{g.fillStyle=ac;g.globalAlpha=i==R.length-1?.28:.06;g.fillRect(X(+r[A[0]]),m[1],X(+r[A[1]])-X(+r[A[0]]),H-m[1]-m[3])});g.globalAlpha=1;ln(X,Y,S,ys);[last[A[0]],last[A[1]]].forEach(x=>dt(X(+x),Y(f(+x)),4,'#e5484d'))}
  else if(V.t=='fit'){let xs,ys;try{xs=Z(A[0],last).map(Number);ys=Z(A[1],last).map(Number)}catch(e){return}
   const mdl=(r,x)=>{try{return+Z(A[2],r,x)}catch(e){return NaN}},[x0,x1]=rg(xs),[y0,y1]=rg(ys),dy=(y1-y0)*.12,[X,Y]=fr(x0,x1,y0-dy,y1+dy),S=Array.from({length:41},(_,i)=>x0+(x1-x0)*i/40),rs=Math.sqrt(xs.reduce((q,x,i)=>q+(mdl(last,x)-ys[i])**2,0)/xs.length),path=(r,o)=>{S.forEach((x,i)=>{const yy=Y(mdl(r,x)+o);i?g.lineTo(X(x),yy):g.moveTo(X(x),yy)})};
   g.save();g.beginPath();g.rect(m[0],m[1],w-m[0]-m[2],H-m[1]-m[3]);g.clip();
   g.fillStyle='#e5484d';g.globalAlpha=.16;g.beginPath();path(last,rs);[...S].reverse().forEach(x=>g.lineTo(X(x),Y(mdl(last,x)-rs)));g.closePath();g.fill();
   const st=Math.max(1,Math.ceil(hist.length/24));g.strokeStyle='#ff9800';g.lineWidth=1.4;hist.forEach((r,i)=>{if(i%st||i==hist.length-1)return;g.globalAlpha=.15+.5*i/hist.length;g.beginPath();path(r,0);g.stroke()});
   g.globalAlpha=.4;g.strokeStyle='#e5484d';g.lineWidth=1;g.beginPath();xs.forEach((x,i)=>{g.moveTo(X(x),Y(ys[i]));g.lineTo(X(x),Y(mdl(last,x)))});g.stroke();
   g.globalAlpha=1;g.lineWidth=3;g.beginPath();path(last,0);g.stroke();
   xs.forEach((x,i)=>{g.fillStyle=COL[0];g.beginPath();g.arc(X(x),Y(ys[i]),4.5,0,7);g.fill();g.strokeStyle='#fff4ec';g.lineWidth=1.6;g.stroke()});g.restore();
   g.fillStyle=css(c,'--fg');g.textAlign='right';g.fillText('RMSE = '+fmt(rs),w-m[2]-6,m[1]+14);g.textAlign='left'}
  else if(V.t=='heat'){let G;try{G=Z(A[0],last)}catch(e){return}if(!Array.isArray(G)||!Array.isArray(G[0]))return;
   const all=hist.flatMap(r=>{try{return Z(A[0],r).flat()}catch(e){return[]}}).filter(isFinite),nv=q=>q!==undefined&&q!==''&&isFinite(+q)?+q:NaN,lo=isNaN(nv(A[1]))?Math.min(...all):nv(A[1]),hi=isNaN(nv(A[2]))?Math.max(...all):nv(A[2]),ny=G.length,nx=G[0].length,mh=[46,22,72,34],s=Math.max(4,Math.min((w-mh[0]-mh[2])/nx,(H-mh[1]-mh[3])/ny)),ox=mh[0]+((w-mh[0]-mh[2])-s*nx)/2,oy=mh[1]+((H-mh[1]-mh[3])-s*ny)/2,tt=q=>(q-lo)/(hi-lo||1),fg=css(c,'--fg');
   g.save();for(let i=0;i<ny;i++)for(let j=0;j<nx;j++){g.fillStyle=hc(tt(+G[i][j]));g.fillRect(ox+j*s,oy+i*s,s+.6,s+.6)}
   if(s>9){g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.6;for(let i=0;i<=ny;i++){g.beginPath();g.moveTo(ox,oy+i*s);g.lineTo(ox+nx*s,oy+i*s);g.stroke()}for(let j=0;j<=nx;j++){g.beginPath();g.moveTo(ox+j*s,oy);g.lineTo(ox+j*s,oy+ny*s);g.stroke()}}
   g.textAlign='center';if(s>=30){g.font='700 '+Math.min(12,s/3)+'px system-ui,sans-serif';for(let i=0;i<ny;i++)for(let j=0;j<nx;j++){const q=tt(+G[i][j]);g.fillStyle=q<.28||q>.8?'#fff':'#273340';g.fillText(String(+(+G[i][j]).toFixed(s>=44?1:0)),ox+(j+.5)*s,oy+(i+.5)*s+3.5)}}
   g.font='700 10.5px system-ui,sans-serif';g.fillStyle=css(c,'--mut');const sj=Math.ceil(nx/10),si=Math.ceil(ny/10);for(let j=0;j<nx;j+=sj)g.fillText(j,ox+(j+.5)*s,oy+ny*s+13);g.textAlign='right';for(let i=0;i<ny;i+=si)g.fillText(i,ox-5,oy+(i+.5)*s+3.5);
   g.fillStyle=fg;g.textAlign='center';g.font='800 11px system-ui,sans-serif';g.fillText(A[3]||'kolom j',ox+nx*s/2,H-4);g.save();g.translate(11,oy+ny*s/2);g.rotate(-Math.PI/2);g.fillText(A[4]||'baris i',0,0);g.restore();
   const bx=ox+nx*s+16,bh=ny*s;for(let q=0;q<bh;q++){g.fillStyle=hc(1-q/bh);g.fillRect(bx,oy+q,12,1.5)}g.strokeStyle=fg;g.lineWidth=1;g.strokeRect(bx,oy,12,bh);g.textAlign='left';g.font='700 10.5px system-ui,sans-serif';g.fillStyle=css(c,'--mut');[[hi,0,8],[(lo+hi)/2,.5,4],[lo,1,0]].forEach(([q,f,d])=>g.fillText(tl(q),bx+17,oy+f*bh+d));g.restore();c._hm={ox,oy,s,nx,ny,G}}
  else if(V.t=='bar'){const f=r=>[Z(A[0],r)].flat(9),b=f(last),o=f(prev),n=b.length,[X,Y]=fr(0,n,Math.min(0,...b)*1.1,Math.max(0,...b)*1.1||1);b.forEach((y,i)=>{g.fillStyle=y!=o[i]?'#e5484d':ac;g.fillRect(X(i)+2,Math.min(Y(0),Y(y)),X(i+1)-X(i)-4,Math.abs(Y(y)-Y(0)));if(n<=12){g.fillStyle=mut;g.fillText(fmt(+y.toPrecision(3)),X(i)+3,Y(y)-3)}})}
  else if(V.t=='hist'){   // [ACAK] view: hist | variabel | jumlah-bin atau auto | Distribusi(parameter)   (distribusi teoretis opsional)
   const R=window.TWRandom,nm=A[0];
   let xs=Array.isArray(last[nm])?last[nm].flat(9):hist.slice(1).map(r=>r[nm]);xs=xs.filter(q=>typeof q=='number'&&isFinite(q));
   let D=null,msg='';if(A[2]&&R){try{const q=R.parseCall(A[2]);if(!q)throw Error('tulis distribusi seperti Normal(0, 1)');D=R.make(q.name,q.args.map(s=>+Z(s,last)))}catch(e){msg=e.message}}
   const n=xs.length,mn=xs.reduce((a,b)=>Math.min(a,b),Infinity),mx=xs.reduce((a,b)=>Math.max(a,b),-Infinity),disc=D?D.discrete:n>0&&xs.every(Number.isInteger)&&mx-mn<=40;
   let lo=n?mn:Infinity,hi=n?mx:-Infinity;
   if(D){const sd=Math.sqrt(D.variance)||1;lo=Math.min(lo,Math.max(D.support[0],D.mean-4*sd));hi=Math.max(hi,Math.min(D.support[1],D.mean+4*sd))}
   if(!isFinite(lo+hi)){lo=0;hi=1}
   let bins;if(disc){lo=Math.floor(lo)-.5;hi=Math.ceil(hi)+.5;bins=Math.round(hi-lo)}else{if(hi==lo){lo-=.5;hi+=.5}bins=Math.round(+A[1])||Math.max(8,Math.min(50,Math.round(Math.sqrt(n))))}
   const HG=R.hist(xs,bins,lo,hi);let ps=[],S=[];
   if(D){if(disc){for(let k=Math.ceil(lo);k<=Math.floor(hi)&&S.length<400;k++)S.push(k)}else S=Array.from({length:161},(_,i)=>lo+(hi-lo)*i/160);ps=S.map(D.pdf)}
   const[X,Y]=fr(lo,hi,0,(Math.max(0,...HG.density,...ps)||1)*1.4);
   g.save();g.globalAlpha=.5;g.fillStyle=ac;HG.density.forEach((d,i)=>{const x0=X(HG.edges[i])+1,x1=X(HG.edges[i+1])-1;g.fillRect(x0,Y(d),Math.max(1,x1-x0),Y(0)-Y(d))});g.restore();
   if(D){g.strokeStyle=g.fillStyle='#e5484d';g.lineWidth=2;if(disc)S.forEach((k,i)=>dt(X(k),Y(ps[i]),3.5,'#e5484d'));else{g.beginPath();S.forEach((x,i)=>i?g.lineTo(X(x),Y(ps[i])):g.moveTo(X(x),Y(ps[i])));g.stroke()}}
   const mean=n?xs.reduce((a,b)=>a+b,0)/n:NaN,sdv=n>1?Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1)):NaN,rx=w-m[2]-6;
   g.fillStyle=css(c,'--fg');g.textAlign='right';g.fillText(n?'n = '+n+' · x̄ = '+fmt(+mean.toPrecision(4))+(n>1?' · s = '+fmt(+sdv.toPrecision(4)):''):'belum ada data — jalankan diagram',rx,m[1]+14);
   if(D)g.fillText(D.label+' · μ = '+fmt(+D.mean.toPrecision(4))+' · σ = '+fmt(+Math.sqrt(D.variance).toPrecision(4)),rx,m[1]+28);
   if(msg){g.fillStyle='#e5484d';g.fillText('⚠ '+msg,rx,m[1]+(D?42:28))}g.textAlign='left'}
  g.fillStyle=mut;g.fillText(V.t+' · '+A.join(' , '),m[0]+4,10)}
 function pick(i){sel=i==sel?null:i;N.forEach((n,j)=>n.el.classList.toggle('sel',j==sel));detail();}
 function detail(){
  const D=Q('.dt');if(sel==null){D.hidden=true;D.innerHTML='';el.style.setProperty('--dgw','0px');return}
  const n=N[sel],cs=n.cols,cd=n.type=='cond';D.hidden=false;
  let h='<div class="dh"><b>'+esc(n.id)+'</b><span class="mu">'+esc(n.type)+'</span><button data-a="x">✕</button></div>';
  if(!cs.length)h+='<div class="mu">Node ini tidak punya perhitungan.</div>';
  else if(!n.vis.length)h+='<div class="mu">Belum dijalankan. Tekan Langkah.</div>';
  else{const o=Math.max(0,n.vis.length-40);
   h+='<div class="mu">dijalankan '+n.vis.length+'×'+(o?' (40 terakhir)':'')+'</div><div class="tw"><table class="t"><tr><th>#</th>'+cs.map(k=>'<th>'+k+'</th>').join('')+(cd?'<th>hasil</th>':'')+'</tr>'+n.vis.slice(o).map((r,i)=>'<tr><td>'+(o+i+1)+'</td>'+cs.map(k=>'<td>'+cell(r[k])+'</td>').join('')+(cd?'<td>'+(r.r?'ya':'tidak')+'</td>':'')+'</tr>').join('')+'</table></div><canvas class="dc"></canvas>'}
  D.innerHTML=h;el.style.setProperty('--dgw','340px');{const dg=D.parentElement,t=N[sel].el.getBoundingClientRect().top-dg.getBoundingClientRect().top;D.style.top=Math.max(0,Math.min(t,dg.clientHeight-D.offsetHeight))+'px'}const tw=D.querySelector('.tw');if(tw)tw.scrollTop=tw.scrollHeight;const c=D.querySelector('.dc');if(c)lc(c,cs.slice(0,4),n.vis)}
 function layout(){
  const c=cv.getBoundingClientRect(),B=N.map(n=>{const r=n.el.getBoundingClientRect();return{x:r.left-c.left,y:r.top-c.top,w:r.width,h:r.height}});
  const mr=Math.max(...B.map(b=>b.x+b.w));let ln=0;
  let h='<defs><marker id="ar'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
  E.forEach(([i,j,lb])=>{const a=B[i],b=B[j];let d,tx,ty;
   if(j==i+1){const x=a.x+a.w/2;d='M'+x+' '+(a.y+a.h)+'V'+b.y;tx=x+6;ty=a.y+a.h+15}
   else{const x=mr+14+(ln++%6)*14,sy=a.y+a.h/2,ey=b.y+b.h/2;d='M'+(a.x+a.w)+' '+sy+'H'+x+'V'+ey+'H'+(b.x+b.w);tx=a.x+a.w+5;ty=sy-5}
   h+='<path class="e" data-k="'+i+'>'+j+'" d="'+d+'" marker-end="url(#ar'+id+')"/>'+(lb?'<text x="'+tx+'" y="'+ty+'">'+lb+'</text>':'')});
  svg.innerHTML=h;mark()}
 function charts(){lc(cch,P.plot.length?P.plot:[...names].slice(0,3),hist);curve();vw();conv()}
 function conv(){const c=Q('.cg'),x=Q('.cx');if(c.closest('.wd')&&c.closest('.wd').hidden)return;if(!P.conv){c.style.display='none';return}
  let f;try{f=FT(P.conv)}catch(q){return}
  const e=hist.map(r=>{try{return Math.abs(+f(0,r))}catch(q){return NaN}}).slice(1).filter(q=>q>0&&isFinite(q));
  if(e.length<2){c.style.display='none';x.textContent='Konvergensi: belum cukup data, jalankan beberapa langkah.';return}
  c.style.display='';const H=hh(c,150),[g,w]=cvs(c,H),mut=css(c,'--mut'),y=e.map(Math.log10),lo=Math.min(...y)-.15,hi=Math.max(...y)+.15,mg=[56,14,12,34],n=y.length,X=i=>mg[0]+(w-mg[0]-mg[2])*i/(n-1),Y=q=>H-mg[3]-(q-lo)/(hi-lo)*(H-mg[1]-mg[3]);axes(c,g,w,H,mg,x=>X(x-1),Y,[1,n],[lo,hi],'iterasi','log10 |galat|',0);
  g.strokeStyle=g.fillStyle=css(c,'--ac');g.lineWidth=2;g.beginPath();y.forEach((q,i)=>i?g.lineTo(X(i),Y(q)):g.moveTo(X(i),Y(q)));g.stroke();y.forEach((q,i)=>{g.beginPath();g.arc(X(i),Y(q),3,0,7);g.fill()});
  g.fillStyle=mut;g.fillText('galat = '+P.conv+'  (makin curam turun = makin cepat)',mg[0]+4,10);
  const a=e.filter(q=>q>1e-13),A=a.length>=3?a:e,m=A.length;
  if(m<3){x.textContent='Butuh minimal 3 titik untuk menaksir orde konvergensi.';return}
  const ps=Math.log(A[m-1]/A[m-2])/Math.log(A[m-2]/A[m-3]),rr=A[m-1]/A[m-2];
  x.textContent=isFinite(ps)&&ps>1.6&&rr<.5?'Konvergensi kuadratik/superlinear: orde ≈ '+ps.toFixed(2)+'. Jumlah digit benar kira-kira berlipat tiap iterasi.':rr<1?'Konvergensi linear: galat dikali ≈ '+rr.toFixed(3)+' tiap iterasi (≈ '+(-Math.log10(rr)).toFixed(2)+' digit per iterasi).'+(Math.abs(rr-.5)<.06?' Pola ini khas pembagian dua (bisection).':''):'Galat belum menurun: belum konvergen atau masih tahap awal.'}
  function lc(cch,nm,hist){
  const w0=cch.clientWidth;if(!w0)return;
  const H=hh(cch,170),m=[56,14+12*nm.length,12,34],[g,w]=cvs(cch,H),mut=css(cch,'--mut'),n=hist.length,ph=H-m[1]-m[3];
  const T=y=>CH.log?(y>0?Math.log10(y):NaN):y,al=nm.flatMap(k=>hist.map(r=>T(sc(r[k]))).filter(isFinite)),G=[Math.min(...al),Math.max(...al)],ft=y=>CH.log?'1e'+(+y.toFixed(1)):String(+y.toPrecision(3));
  const one=CH.shared||nm.length==1,XX=i=>m[0]+(n<2?6:(w-m[0]-m[2]-12)*i/(n-1)),rg2=(a,b)=>a==b?[a-1,b+1]:[a,b],f0=nm.length?hist.map(r=>T(sc(r[nm[0]]))).filter(isFinite):[],R0=!one?[0,1]:CH.shared?rg2(...G):f0.length?rg2(Math.min(...f0),Math.max(...f0)):[0,1];
  axes(cch,g,w,H,m,XX,y=>H-m[3]-(y-R0[0])/(R0[1]-R0[0])*ph,[0,Math.max(n-1,1)],R0,'iterasi',one?nm.join(', ')+(CH.log?' (skala log)':''):'nilai (dinormalkan 0–1)',one&&CH.log?1:0);
  nm.forEach((k,si)=>{
   const ys=hist.map(r=>T(sc(r[k]))),fi=ys.filter(isFinite);if(!fi.length)return;let lo=CH.shared?G[0]:Math.min(...fi),hi=CH.shared?G[1]:Math.max(...fi);if(lo==hi){lo--;hi++}const c=COL[si%4],X=XX,Y=y=>H-m[3]-(y-lo)/(hi-lo)*ph;
   g.strokeStyle=c;g.fillStyle=c;g.lineWidth=2.6;g.beginPath();ys.forEach((y,i)=>i?g.lineTo(X(i),Y(y)):g.moveTo(X(i),Y(y)));g.stroke();g.lineTo(X(n-1),H-m[3]);g.lineTo(X(0),H-m[3]);g.globalAlpha=.09;g.fill();g.globalAlpha=1;
   ys.forEach((y,i)=>{g.beginPath();g.arc(X(i),Y(y),i==n-1?5:n<40?3:2,0,7);g.fill();if(i==n-1||n<25){g.strokeStyle=css(cch,'--pn');g.lineWidth=1.8;g.stroke()}});
   const t=(Array.isArray(hist[n-1][k])?'‖'+k+'‖':k)+' = '+fmt(sc(hist[n-1][k]))+(CH.shared||nm.length==1?'':'  ['+ft(lo)+' … '+ft(hi)+']');g.font='700 10.5px system-ui,sans-serif';g.fillText(t,m[0]+6,12+si*12)});
  if(cch.className=='ch'&&HV!=null&&HV<n){const x=XX(HV);g.strokeStyle=mut;g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.moveTo(x,m[1]);g.lineTo(x,H-m[3]);g.stroke();g.setLineDash([])}}
 function curve(){
  if(P.curve&&P.curve.v){ccu.style.display='';if(!ccu.clientWidth)return;
   const C=P.curve,H2=hh(ccu,170),[g2,w2]=cvs(ccu,H2),p=56,m=[56,14,12,34],f=t=>{try{return C.fn(t,v)}catch(e){return NaN}};
   const xs=[],ys=[];for(let i=0;i<=160;i++){const x=C.a+(C.b-C.a)*i/160;xs.push(x);ys.push(f(x))}
   const fi=ys.filter(isFinite).concat(0);let lo=Math.min(...fi),hi=Math.max(...fi);if(hi==lo)hi=lo+1;
   const X=x=>m[0]+(x-C.a)/(C.b-C.a)*(w2-m[0]-m[2]),Y=y=>H2-m[3]-(y-lo)/(hi-lo)*(H2-m[1]-m[3]);
   axes(ccu,g2,w2,H2,m,X,Y,[C.a,C.b],[lo,hi],C.v,'f('+C.v+')',0);if(lo<0&&hi>0){g2.strokeStyle=css(ccu,'--fg');g2.lineWidth=1;g2.beginPath();g2.moveTo(m[0],Y(0));g2.lineTo(w2-m[2],Y(0));g2.stroke()}
   g2.strokeStyle=css(ccu,'--fg');g2.lineWidth=3;g2.beginPath();let s=0;ys.forEach((y,i)=>{if(!isFinite(y)){s=0;return}s?g2.lineTo(X(xs[i]),Y(y)):g2.moveTo(X(xs[i]),Y(y));s=1});g2.stroke();
   const tr=hist.map(r=>+r[C.v]).filter(x=>isFinite(x)&&x>=C.a&&x<=C.b);
   tr.forEach((x,i)=>{const cur=i==tr.length-1,y=f(x);g2.fillStyle=cur?'#e5484d':css(ccu,'--mut');g2.globalAlpha=cur?1:.35+.5*i/tr.length;
    if(cur){g2.setLineDash([4,3]);g2.strokeStyle='#e5484d';g2.beginPath();g2.moveTo(X(x),Y(0));g2.lineTo(X(x),Y(y));g2.stroke();g2.setLineDash([])}
    g2.beginPath();g2.arc(X(x),Y(y),cur?5:3,0,7);g2.fill();g2.globalAlpha=1});
   g2.fillStyle=css(ccu,'--mut');g2.fillText('f(t) = '+C.f.trim()+'   ·   '+C.v+' = '+fmt(v[C.v]),m[0]+4,10);
  }else ccu.style.display='none'}
 el.addEventListener('click',e=>{const nd=e.target.closest('.nd'),a=e.target.dataset&&e.target.dataset.a;const xi=e.target.closest('[data-xi]');if(xi){XS=+xi.dataset.xi;xpr();return}if(nd&&!e.target.closest('.scr,details')){pick(N.findIndex(n=>n.el==nd));return}if(a=='x'){pick(null);return}if(!a)return;act(a)});
 const act=a=>{
  if(MODE=='explain')a={s:'xn',p:'xn',b:'xp'}[a]||a;
  if(a=='z'){SEED=(Math.random()*4294967296)>>>0;BASE=null;reset();return}
  if(a=='xn'){XS++;xpr();return}if(a=='xp'){XS=Math.max(0,XS-1);xpr();return}if(a=='xgo'){MODE='anim';Q('[data-mode]').value='anim';BASE=null;reset();return}
  if(a=='bl'){BASE=null;wi();return}
  if(a=='p'&&MODE!='anim'){playing=false;reset();if(!done)runAll();return}
  if(a=='s'){playing=false;btnP.textContent='▶ Jalankan';step()}
  if(a=='r')reset();if(a=='b'){playing=false;btnP.textContent='▶ Jalankan';back()}
  if(a=='p'){if(playing){playing=false;btnP.textContent='▶ Jalankan';return}
   if(done)reset();playing=true;btnP.textContent='❚❚ Jeda';
   const tick=()=>{if(!playing||!el.isConnected)return;step();if(done){playing=false;btnP.textContent='▶ Jalankan';return}setTimeout(tick,1100-Q('input').value*100)};tick()}};
 act.el=el;el.addEventListener('pointerenter',()=>{ACT=act});el.addEventListener('focusin',()=>{ACT=act});el.addEventListener('pointerleave',()=>{if(ACT===act&&!el.contains(document.activeElement))ACT=null});el.addEventListener('focusout',e=>{if(ACT===act&&!el.contains(e.relatedTarget)&&!el.matches(':hover'))ACT=null});
 const CH={log:0,shared:0};Q('.prm').innerHTML=P.params.map(p=>'<label class="pl">'+p.k+'<input type="range" data-p="'+p.k+'" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+p.val+'"><output>'+p.val+'</output></label>').join('');Q('.vw').innerHTML=P.views.map(()=>'<canvas class="vc"></canvas>').join('');
 const outs=(P.out&&P.out.length?P.out:P.plot.length?P.plot:[...names]).filter(k=>names.has(k)&&!P.params.some(p=>p.k==k)),SYM={};let drag=null;
 P.params.forEach(p=>{SYM[p.k]=p;SYM[p.sym]=p});
 N.forEach(n=>n.el.querySelectorAll('mi').forEach(i=>{const p=SYM[i.textContent.trim()];if(p){i.classList.add('scr');i.dataset.sp=p.k;i.tabIndex=0;i.setAttribute('role','slider');i.title='Seret ←→ untuk mengubah '+p.k}}));
 function setP(p,x){x=+(Math.min(p.max,Math.max(p.min,Math.round(x/p.step)*p.step))).toFixed(6);if(x==p.val)return;p.val=x;const r=Q('[data-p="'+p.k+'"]');r.value=x;r.nextElementSibling.textContent=x;APR=p.k;reset()}
 const tp=e=>{tip.hidden=false;tip.style.left=Math.min(e.clientX+12,innerWidth-190)+'px';tip.style.top=(e.clientY+16)+'px'};
 el.addEventListener('pointerdown',e=>{const s=e.target.closest('.scr');if(!s)return;const p=P.params.find(q=>q.k==s.dataset.sp);drag={p,x:e.clientX,v:p.val};s.setPointerCapture(e.pointerId);e.preventDefault();tip.textContent=p.k+' = '+p.val;tp(e)});
 el.addEventListener('pointermove',e=>{if(!drag)return;setP(drag.p,drag.v+(e.clientX-drag.x)/180*(drag.p.max-drag.p.min));tip.textContent=drag.p.k+' = '+drag.p.val;tp(e)});
 const up=()=>{if(drag){drag=null;tip.hidden=true}};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 el.addEventListener('keydown',e=>{const s=e.target.closest&&e.target.closest('.scr'),d={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1}[e.key];if(s&&d){const p=P.params.find(q=>q.k==s.dataset.sp);setP(p,p.val+d*p.step);e.preventDefault();e.stopPropagation()}});
 el.addEventListener('change',e=>{const d=e.target.dataset;if(d.w=='p'){APR=e.target.value;wi()}if(d.w=='o'){OUT=e.target.value;wi()}if(d.mode!=null){MODE=e.target.value;BASE=null;reset()}});
 function sim(ov){const w={};names.forEach(k=>w[k]=0);P.params.forEach(p=>w[p.k]=p.val);w.__s=SEED|0;CUR=w;Object.assign(w,ov);try{let c=0,i=0;while(i++<5000){const n=N[c];if(n.type=='cond')c=n.ft(w)?n.t:n.f;else{if(n.fn)n.fn(w);if(n.type=='end'||n.next==null)break;c=n.next}}return w}catch(e){return null}}
 function wi(){const W=Q('.wi');W.hidden=false;
  if(!P.params.length||!outs.length){W.innerHTML='<div class="mu">Mode eksplorasi butuh parameter: tambahkan baris <code>param: nama = nilai | min | maks | langkah | simbol</code>.</div>';return}
  if(!BASE){BASE={};BASEV={};outs.forEach(k=>BASE[k]=structuredClone(v[k]));P.params.forEach(p=>BASEV[p.k]=p.val)}
  const ap=P.params.find(p=>p.k==APR)||P.params[0],ok=outs.includes(OUT)?OUT:outs[0],so=(a,c)=>a.map(k=>'<option'+(k==c?' selected':'')+'>'+esc(k)+'</option>').join('');
  W.innerHTML='<div class="dh"><b>Eksplorasi</b><span class="mu">seret simbol berwarna pada rumus, atau slider</span><button data-a="bl">Tetapkan baseline</button></div><table class="t"><tr><th>variabel</th><th>akhir</th><th>baseline</th><th>Δ</th></tr>'+outs.map(k=>{const d=sc(v[k])-sc(BASE[k]);return'<tr><td>'+esc(k)+'</td><td>'+cell(v[k])+'</td><td>'+cell(BASE[k])+'</td><td>'+(isFinite(d)?(d>0?'+':'')+fmt(+d.toPrecision(4)):'–')+'</td></tr>'}).join('')+'</table><div class="ctl mu">pengaruh <select data-w="p">'+so(P.params.map(p=>p.k),ap.k)+'</select> terhadap <select data-w="o">'+so(outs,ok)+'</select> · '+steps+' langkah</div><canvas class="sw"></canvas>';
  const c=W.querySelector('canvas'),H=150,[g,w]=cvs(c,H),m=[56,16,14,36],pts=[];
  for(let i=0;i<=40;i++){const x=ap.min+(ap.max-ap.min)*i/40,r=sim({[ap.k]:x});pts.push([x,r?sc(r[ok]):NaN])}
  const Z=pts.filter(q=>isFinite(q[1]));if(Z.length<2)return;let lo=Math.min(...Z.map(q=>q[1])),hi=Math.max(...Z.map(q=>q[1]));if(lo==hi){lo--;hi++}
  const X=x=>m[0]+(x-ap.min)/(ap.max-ap.min||1)*(w-m[0]-m[2]),Y=y=>H-m[3]-(y-lo)/(hi-lo)*(H-m[1]-m[3]),ac=css(c,'--ac'),mut=css(c,'--mut');axes(c,g,w,H,m,X,Y,[ap.min,ap.max],[lo,hi],ap.k,ok+' akhir',0);
  g.strokeStyle=ac;g.lineWidth=2;g.beginPath();Z.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.stroke();
  
  g.strokeStyle=mut;g.beginPath();g.arc(X(BASEV[ap.k]),Y(sc(BASE[ok])),5,0,7);g.stroke();
  g.fillStyle='#e5484d';g.beginPath();g.arc(X(ap.val),Y(sc(v[ok])),5,0,7);g.fill()}
 const dg=document.createElement('div');dg.className='dg';cv.after(dg);dg.append(Q('.dt'));
 const WD=[],dock=document.createElement('div'),VN={tangent:'Garis singgung',interval:'Interval',vec:'Vektor',scatter:'Sebaran',param:'Parametrik',bar:'Batang',fit:'Data & garis',heat:'Peta panas',hist:'Histogram'},VC=[...el.querySelectorAll('.vc')];dock.className='dock';Q('.log').before(dock);dock.innerHTML='<span class="mu">grafik mengambang, klik untuk membuka:</span>';
 function mkw(ic,title,nodes){const w=document.createElement('div'),b=document.createElement('button'),k=WD.length,hd=()=>w.querySelector('.wh');w.className='wd';w.hidden=true;w.innerHTML='<div class="wh"><b>'+ic+' '+title+'</b><button title="Tutup">✕</button></div><div class="wb"></div>';nodes.forEach(x=>w.lastChild.append(x));WD.push(w);
  b.textContent=ic+' '+title;const set=on=>{w.hidden=!on;b.classList.toggle('on',on);if(on){w.style.zIndex=++WZ;charts()}};
  b.onclick=()=>{const first=w.hidden&&!w.style.left;let px,py;if(first){const r=dock.getBoundingClientRect();px=Math.max(8,Math.min(r.left,innerWidth-440));py=Math.max(8,Math.min(r.bottom+12+k*28,innerHeight-330))}set(w.hidden);if(first)fx(w,px,py)};
  w.querySelector('.wh button').onclick=()=>set(false);let d=null;const h=hd();
  h.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=w.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};h.setPointerCapture(e.pointerId);w.style.zIndex=++WZ});
  h.addEventListener('pointermove',e=>{if(d){fx(w,Math.max(0,Math.min(innerWidth-80,e.clientX-d.x)),Math.max(0,Math.min(innerHeight-40,e.clientY-d.y)))}});h.addEventListener('pointerup',()=>{d=null});
  w.addEventListener('pointerdown',()=>{w.style.zIndex=++WZ});new ResizeObserver(()=>{if(!w.hidden)charts()}).observe(w);el.append(w);dock.append(b)}
 mkw('📈','Iterasi',[Q('[data-o]').closest('.ctl'),cch]);
 if(P.curve)mkw('〰️','Kurva f(x)',[ccu]);else ccu.style.display='none';
 if(P.conv)mkw('📉','Konvergensi',[Q('.cg'),Q('.cx')]);
 P.views.forEach((V,i)=>mkw('🔷',VN[V.t]||V.t,[VC[i]]));
 VC.forEach(c=>{c.addEventListener('pointermove',e=>{const h=c._hm;if(!h)return;const r=c.getBoundingClientRect(),j=Math.floor((e.clientX-r.left-h.ox)/h.s),i=Math.floor((e.clientY-r.top-h.oy)/h.s);if(i<0||j<0||i>=h.ny||j>=h.nx){tip.hidden=true;return}tip.hidden=false;tip.style.left=Math.min(e.clientX+12,innerWidth-190)+'px';tip.style.top=(e.clientY+16)+'px';tip.innerHTML='baris '+i+', kolom '+j+'<br>nilai = '+fmt(+h.G[i][j])});c.addEventListener('pointerleave',()=>{tip.hidden=true})});
 function xpr(){const W=Q('.xp'),D=P.derive;el.classList.toggle('xm',MODE=='explain');W.hidden=MODE!='explain';if(MODE!='explain')return;
  if(!D.length){W.innerHTML='<div class="mu">Belum ada langkah penurunan. Tambahkan baris <code>derive: rumus_latex | penjelasan</code>.</div>';return}
  XS=Math.min(XS,D.length-1);const last=XS==D.length-1;
  W.innerHTML='<div class="dh"><b>🧩 Turunkan rumusnya</b><span class="mu">langkah '+(XS+1)+' / '+D.length+' · klik kartu untuk kembali</span></div><div class="xl">'+D.slice(0,XS+1).map((d,i)=>'<div class="xs'+(i==XS?' cur':'')+'" data-xi="'+i+'"><span class="xn">'+(i+1)+'</span><div class="xt">'+rich('$'+d.tex+'$')+'</div><div class="xd">'+rich(d.txt)+'</div></div>').join('')+'</div><div class="ctl"><button data-a="xp"'+(XS?'':' disabled')+'>◀ Sebelumnya</button><button class="pri" data-a="xn">'+(last?'Selesai ✔':'Lanjut ▶')+'</button>'+(last?'<button data-a="xgo">▶ Lihat dengan angka</button>':'')+'</div>';
  const c=W.querySelector('.cur'),l=W.querySelector('.xl');if(c&&l)l.scrollTop=c.offsetTop-l.offsetTop-8}
 cch.addEventListener('pointermove',e=>{const r=cch.getBoundingClientRect(),n=hist.length,pad=56,i=n>1?Math.max(0,Math.min(n-1,Math.round((e.clientX-r.left-pad)/(r.width-pad-24)*(n-1)))):0,nm=P.plot.length?P.plot:[...names].slice(0,3);
  tip.hidden=false;tip.style.left=Math.min(e.clientX+12,innerWidth-190)+'px';tip.style.top=(e.clientY+14)+'px';
  tip.innerHTML='iterasi '+i+(hn[i]>=0?' · node '+esc(N[hn[i]].id):' · awal')+'<br>'+nm.map(k=>esc(k)+' = '+fmt(sc(hist[i][k]))).join('<br>');
  if(i!=HV){HV=i;N.forEach((q,j)=>q.el.classList.toggle('hov',j==hn[i]));charts()}});
 cch.addEventListener('pointerleave',()=>{tip.hidden=true;HV=null;N.forEach(q=>q.el.classList.remove('hov'));charts()});
 el.addEventListener('input',e=>{if(e.target.dataset.sc!=null)goto(+e.target.value);const d=e.target.dataset;if(d.p){const p=P.params.find(q=>q.k==d.p);p.val=+e.target.value;APR=p.k;e.target.nextElementSibling.textContent=p.val;reset()}if(d.o){CH[d.o]=e.target.checked;charts()}});
 const nr=()=>{const w=el.clientWidth;if(w)el.classList.toggle('narrow',w<900)};nr();const ro=new ResizeObserver(()=>{nr();layout();charts()});ro.observe(el);ro.observe(cv);
 reset();ACT=act}

/* [PORT] pintasan papan ketik: Spasi=jalan/jeda, ←/→=mundur/langkah, R=ulang
   (versi asal: addEventListener('keydown') global tanpa pengecekan koneksi DOM) */
addEventListener('keydown', e => {
  const t = e.target.tagName;
  if (!ACT || !ACT.el || !ACT.el.isConnected || !ACT.el.offsetParent) return;
  if (/^(TEXTAREA|SELECT|INPUT)$/.test(t) || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = { ' ': 'p', ArrowRight: 's', ArrowLeft: 'b', r: 'r', R: 'r' }[e.key];
  if (!k || (t == 'BUTTON' && e.key == ' ')) return;
  e.preventDefault(); ACT(k);
});

window.FlowEngine = { mount, gotoLine: null, MX };   // [PORT] MX diekspos karena kode node dijalankan lewat new Function (lingkup global)
})();

/* ---------- penghubung ke renderer artikel (dipanggil dari renderMarkdownAndMath di script.js) ---------- */
function setupFlowDiagrams(root) {
  const blocks = root.querySelectorAll('pre > code.language-flow');
  if (!blocks.length || !window.FlowEngine) return;
  const inEditor = root.id === 'editor-live-preview';
  const ta = inEditor ? document.getElementById('editor-content') : null;
  let searchFrom = 0;

  blocks.forEach(code => {
    const pre = code.parentElement;
    const src = code.textContent.replace(/\n$/, '');
    let off = 0, canGoto = false;
    if (ta) {                                   // di pratinjau editor: hitung nomor baris asli untuk pesan galat
      const pos = ta.value.indexOf(src, searchFrom);
      if (pos >= 0) { off = ta.value.slice(0, pos).split('\n').length - 1; searchFrom = pos + src.length; canGoto = true; }
    }
    const el = document.createElement('div');
    el.className = 'flow';
    pre.replaceWith(el);
    FlowEngine.mount(el, src, off, { goto: canGoto });
  });
}
if (window.FlowEngine) {
  FlowEngine.gotoLine = n => {                  // tombol "Ke baris" pada galat sintaks (hanya pratinjau editor)
    const ta = document.getElementById('editor-content'); if (!ta) return;
    const lines = ta.value.split('\n'); let a = 0;
    for (let i = 0; i < n - 1; i++) a += lines[i].length + 1;
    ta.focus(); ta.setSelectionRange(a, a + (lines[n - 1] || '').length);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
    ta.scrollTop = Math.max(0, (n - 3) * lh);
  };
}