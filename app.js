/* ===== INTERFACE ===== */
(function(){
  if(typeof document==='undefined') return;
  var KEY='hefesto-prototipo-v2';
  var $=function(id){return document.getElementById(id);};
  function el(tag,attrs,kids){ var e=document.createElement(tag); for(var k in (attrs||{})){ var v=attrs[k]; if(k==='class') e.className=v; else if(k==='text') e.textContent=v; else if(k==='value'&&(tag==='textarea'||tag==='select')) e._v=v; else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else if(v!==false&&v!=null) e.setAttribute(k,v); } (kids||[]).forEach(function(c){ if(c) e.appendChild(typeof c==='string'?document.createTextNode(c):c); }); if(e._v!==undefined){ e.value=e._v; } return e; }
  var RAS=['Plano Piloto','Gama','Taguatinga','Brazlândia','Sobradinho','Planaltina','Paranoá','Núcleo Bandeirante','Ceilândia','Guará','Cruzeiro','Samambaia','Santa Maria','São Sebastião','Recanto das Emas','Lago Sul','Riacho Fundo','Lago Norte','Candangolândia','Águas Claras','Riacho Fundo II','Sudoeste/Octogonal','Varjão','Park Way','SCIA/Estrutural','Sobradinho II','Jardim Botânico','Itapoã','SIA','Vicente Pires','Fercal','Sol Nascente/Pôr do Sol','Arniqueira','Arapoanga','Água Quente'];
  var UFS=['DF','GO','MG'];
  var PASSOS=['Local e natureza','Entrevista','Solicitante','Fechamento'];

  /* ---------- dados ---------- */
  var DB={protocolos:null,ocorrencias:[],seq:1};
  try{ var salvo=JSON.parse(localStorage.getItem(KEY)||'null'); if(salvo&&salvo.protocolos){ DB.protocolos=salvo.protocolos; DB.ocorrencias=salvo.ocorrencias||[]; DB.seq=salvo.seq||1; DB.base=salvo.base||null; DB.ultimaExportacao=salvo.ultimaExportacao||null; DB.naturezas=salvo.naturezas||null; DB.pubNat=salvo.pubNat||null; DB.blocos=salvo.blocos||null; DB.pubBlo=salvo.pubBlo||null; DB.feedbacks=salvo.feedbacks||[]; DB.layout=salvo.layout||{}; } }catch(e){}
  /* versão publicada (protocolos.js) x cópia deste navegador.
     DB.base guarda a impressão da versão publicada que este navegador recebeu. Natureza que a pessoa não editou
     acompanha a nova publicação; natureza editada fica como está até ser exportada e publicada. */
  var PUB=exemplos(),impr=function(itens){ var t=JSON.stringify(itens||[]),h=5381; for(var i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return (h>>>0).toString(36)+'.'+t.length; };
  if(!DB.protocolos) DB.protocolos={};
  if(!DB.base) DB.base={};
  if(!DB.layout) DB.layout={};
  /* lista de naturezas: a publicada, mais o que a pessoa criou, renomeou ou excluiu neste navegador.
     Junta em três vias: publicada antiga (DB.pubNat), publicada nova e a deste navegador. */
  var PUB_NAT=JSON.parse(JSON.stringify(NATUREZAS)),PUB_BLO=JSON.parse(JSON.stringify(typeof BLOCOS!=='undefined'?BLOCOS:[])),natsMudaram=false;
  function mesclarLista(loc,velha,nova){
    if(!loc) return JSON.parse(JSON.stringify(nova));
    velha=velha||nova;
    var mapa=function(l){ var m={}; l.forEach(function(n){ m[n.id]=n; }); return m; },L_=mapa(loc),V=mapa(velha),N=mapa(nova),out=[];
    nova.forEach(function(n){
      if(V[n.id]&&!L_[n.id]) return; /* excluída aqui */
      var x=JSON.parse(JSON.stringify(n)); if(L_[n.id]&&V[n.id]&&L_[n.id].nome!==V[n.id].nome) x.nome=L_[n.id].nome; out.push(x);
    });
    loc.forEach(function(n){ if(!N[n.id]&&!V[n.id]) out.push(n); }); /* criadas aqui */
    out.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
    if(JSON.stringify(velha)!==JSON.stringify(nova)) natsMudaram=true;
    return out;
  }
  DB.naturezas=mesclarLista(DB.naturezas,DB.pubNat,PUB_NAT); DB.pubNat=PUB_NAT;
  DB.blocos=mesclarLista(DB.blocos,DB.pubBlo,PUB_BLO); DB.pubBlo=PUB_BLO;
  NATUREZAS=DB.naturezas; window.BLOCOS=DB.blocos;
  function listaAlterada(){ var f=function(l){ return JSON.stringify(l.map(function(n){ return [n.id,n.nome]; })); }; return f(NATUREZAS)!==f(PUB_NAT)||f(BLOCOS)!==f(PUB_BLO); }
  /* ---------- blocos reutilizáveis ---------- */
  function ehBloco(k){ return /^bloco:/.test(k||''); }
  function blocoPorId(id){ return BLOCOS.filter(function(b){ return b.id===id; })[0]||null; }
  function getBloco(id){ var b=blocoPorId(id); return b?{nome:b.nome,itens:DB.protocolos['bloco:'+id]||[]}:null; }
  function expandida(natId){ return expandir(DB.protocolos[natId]||[],getBloco); }
  function chaves(){ return NATUREZAS.map(function(n){ return n.id; }).concat(BLOCOS.map(function(b){ return 'bloco:'+b.id; })); }
  function porChave(k){ if(ehBloco(k)){ var b=blocoPorId(k.slice(6)); return b?{id:k,nome:b.nome,bloco:b}:null; } return natPorId(k); }
  function usosBloco(bid){ return chaves().filter(function(k){ return (DB.protocolos[k]||[]).some(function(x){ return x.tipo==='bloco'&&x.bloco===bid; }); }).map(porChave); }
  function processoDe(k,itens){ if(ehBloco(k)) return []; return verificarProcesso(expandir(itens||DB.protocolos[k]||[],getBloco),NATUREZAS.map(function(n){ return n.nome; })); }
  function validarAlvo(itens,k){
    if(ehBloco(k)) return validarBloco(itens,getBloco,k.slice(6));
    var v=validar(expandir(itens,getBloco));
    itens.forEach(function(x){ if(x.tipo==='bloco'&&!getBloco(x.bloco)) v.erros.unshift('“'+x.id+'”: o bloco “'+(x.texto||x.bloco)+'” não existe na biblioteca.'); });
    return v;
  }
  var atualizadas=0;
  chaves().map(function(k){ return {id:k}; }).forEach(function(n){
    var pub=PUB[n.id]||[],meu=DB.protocolos[n.id],ip=impr(pub);
    if(!Array.isArray(meu)){ DB.protocolos[n.id]=pub; DB.base[n.id]=ip; return; }
    var im=impr(meu);
    if(im===ip){ DB.base[n.id]=ip; return; }
    /* não editada: bate com a última versão que este navegador recebeu, ou com qualquer versão já publicada */
    var jaPublicada=typeof IMPRESSOES_PUBLICADAS!=='undefined'&&(IMPRESSOES_PUBLICADAS[n.id]||[]).indexOf(im)>=0;
    if((DB.base[n.id]&&DB.base[n.id]===im)||jaPublicada){ DB.protocolos[n.id]=pub; DB.base[n.id]=ip; atualizadas++; }
  });
  try{ if(localStorage.getItem(KEY)||atualizadas||natsMudaram) localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){}
  function alterada(id){ return impr(DB.protocolos[id])!==impr(PUB[id]||[]); }
  function alteradas(){ return chaves().filter(function(k){ return alterada(k); }).map(porChave); }
  function status(t){ var s=$('status'); if(s) s.textContent=t; }
  setTimeout(function(){ if(atualizadas) status(atualizadas+' natureza'+(atualizadas>1?'s':'')+' atualizada'+(atualizadas>1?'s':'')+' com a versão publicada'); },0);
  function salvar(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); status('Salvo neste navegador'); }catch(e){ status('Não foi possível salvar neste navegador'); } }
  var natPorId=function(id){ return NATUREZAS.filter(function(n){return n.id===id;})[0]||null; };
  var norm=function(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); };
  var mmss=function(x){ x=Math.max(0,x|0); return (x<600?'0':'')+Math.floor(x/60)+':'+(x%60<10?'0':'')+(x%60); };

  var V={view:'atend',aviso:null,pausa:false,help:false};
  var A=null,tick=null,hTick=null;

  /* ---------- atendimento: estado ---------- */
  function seg(){ return A?Math.floor((Date.now()-A.t0)/1000):0; }
  function novaLigacao(rot){
    var r=function(){ return String(1000+Math.floor(Math.random()*9000)); };
    var fone='(61) 9'+r()+'-'+r();
    A={t0:Date.now(),fone:fone,passo:0,max:0,natTxt:'',nat:'',local:'',uf:'DF',ra:'',quartel:'',ref:'',resp:{},nome:'',nomeNI:false,tel:fone,relato:'',relManual:false,relEdit:false,obs:'',entOpen:false,encS:null,conf:null,erro:'',hermes:null};
    V.aviso=null; V.pausa=false;
    if(tick) clearInterval(tick);
    tick=setInterval(relogio,1000);
    if(hTick){ clearInterval(hTick); hTick=null; }
    if(rot) hermesIniciar(rot);
    desenharAtend(); foco();
  }
  function fimLigacao(){ hermesParar(); A=null; if(tick){ clearInterval(tick); tick=null; } desenharAtend(); }

  /* ---------- Hermes (demonstração roteirizada) ---------- */
  function hermesIniciar(rot){
    var H=A.hermes={rot:rot,ht:0,last:Date.now(),play:true,vel:1,idx:0,mostradas:0,est:{},audio:null,aviso:''};
    if(rot.audio){
      try{
        H.audio=new Audio(rot.audio);
        var semAudio=function(){ if(A&&A.hermes===H&&H.audio){ H.ht=H.audio.currentTime||0; H.audio=null; H.last=Date.now(); H.aviso='Áudio não encontrado ('+rot.audio+'). A transcrição segue pelo relógio da demonstração.'; hermesTopo(); } };
        H.audio.addEventListener('error',semAudio);
        var p=H.audio.play(); if(p&&p.catch) p.catch(function(e){ if(e&&e.name==='NotAllowedError'){ H.play=false; H.aviso='O navegador bloqueou o som. Clique em Continuar para ouvir.'; hermesTopo(); } else semAudio(); });
      }catch(e){ H.audio=null; }
    }
    hTick=setInterval(hermesRelogio,250);
  }
  function hermesParar(){ if(hTick){ clearInterval(hTick); hTick=null; } if(A&&A.hermes&&A.hermes.audio){ try{ A.hermes.audio.pause(); }catch(e){} } }
  function hermesRelogio(){
    var H=A&&A.hermes; if(!H) return;
    var now=Date.now();
    if(H.audio) H.ht=H.audio.currentTime; else if(H.play) H.ht+=(now-H.last)/1000*H.vel;
    H.last=now;
    var n=H.rot.falas.filter(function(f){ return f.t<=H.ht; }).length;
    if(n!==H.idx){ H.idx=n; hermesTrans(); hermesSugPainel(); hermesTopo(); pintarDicas(); }
  }
  function hermesTocar(){
    var H=A.hermes; H.play=!H.play; H.last=Date.now(); H.aviso='';
    if(H.audio){ try{ if(H.play) H.audio.play(); else H.audio.pause(); }catch(e){} }
    hermesTopo();
  }
  function hermesVel(){ var H=A.hermes; H.vel=H.vel===1?2:1; if(H.audio) H.audio.playbackRate=H.vel; hermesTopo(); }
  function hermesProxima(){
    var H=A.hermes,f=H.rot.falas[H.idx]; if(!f) return;
    H.ht=f.t; H.last=Date.now(); if(H.audio){ try{ H.audio.currentTime=f.t; }catch(e){} }
    /* o relógio da ligação acompanha o salto, para os tempos da ficha baterem com a transcrição */
    if(f.t>seg()){ A.t0=Date.now()-f.t*1000; relogio(); }
    hermesRelogio();
  }
  function hermesCtx(){ return {A:A,ras:RAS,natureza:natPorId,item:hermesItem}; }
  function hermesItem(id){ return (A&&A.nat?expandida(A.nat):[]).filter(function(x){ return x.id===id; })[0]||null; }
  function hermesSugs(){
    var H=A.hermes,out=[],ctx=hermesCtx();
    H.rot.falas.slice(0,H.idx).forEach(function(f,i){ (f.sug||[]).forEach(function(s,j){ var k=i+'.'+j; out.push({k:k,s:s,f:f,est:H.est[k]||'',sit:hermesSituacao(s,ctx)}); }); });
    return out;
  }
  function hermesPendentes(){ return hermesSugs().filter(function(x){ return !x.est&&(x.sit==='nova'||x.sit==='espera'); }); }
  function hermesContas(){ var c={ok:0,x:0,pend:0}; hermesSugs().forEach(function(x){ if(x.est==='ok') c.ok++; else if(x.est==='x') c.x++; else if(x.sit==='nova'||x.sit==='espera') c.pend++; }); return c; }
  function hermesRotulo(s){
    var nomes={local:'Local',ref:'Ponto de referência',ra:'Região administrativa',nome:'Nome do solicitante',tel:'Telefone',obs:'Observação para a equipe'};
    if(s.c==='natureza'){ var n=natPorId(s.v); return ['Natureza',n?n.nome:s.v]; }
    if(s.c!=='resp') return [nomes[s.c]||s.c,s.v];
    var it=hermesItem(s.id)||(!A.nat&&expandida(A.hermes.rot.natureza).filter(function(x){ return x.id===s.id; })[0]);
    if(!it) return ['Entrevista',A.nat?'“'+s.id+'” não está no protocolo desta natureza':'aguardando a natureza'];
    if(s.v===true) return [it.tipo==='instrucao'?'Instrução dita':'Ciente',it.texto];
    if(s.v.ops) return [it.texto,it.opcoes.filter(function(o){ return s.v.ops.indexOf(o.id)>=0; }).map(function(o){ return o.rotulo; }).join(', ')];
    return [it.texto,s.v.valor];
  }
  function hermesAplicar(x){
    var s=x.s;
    if(x.sit!=='nova') return;
    if(s.c==='natureza'){ var n=natPorId(s.v); if(A.nat!==s.v){ A.nat=s.v; A.resp={}; } A.natTxt=n.nome; }
    else if(s.c==='obs') A.obs=(String(A.obs).trim()?String(A.obs).trim()+' ':'')+s.v;
    else if(s.c==='nome'){ A.nome=s.v; A.nomeNI=false; }
    else if(s.c==='resp'){
      var it=hermesItem(s.id);
      if(s.v===true){ A.resp[s.id]=true; if(it&&it.despacho&&A.encS==null&&!faltasEncaminhar().length) A.encS=seg(); }
      else if(s.v.ops&&it.tipo==='multipla'){ var r=A.resp[s.id]||{ops:[],outro:''},ops=(r.ops||[]).slice(); s.v.ops.forEach(function(o){ if(ops.indexOf(o)<0) ops.push(o); }); A.resp[s.id]={ops:ops,outro:r.outro||''}; }
      else if(s.v.ops) A.resp[s.id]={ops:[s.v.ops[0]]};
      else A.resp[s.id]={valor:String(s.v.valor)};
    }
    else A[s.c]=s.v;
    A.hermes.est[x.k]='ok';
  }
  function hermesDepois(){ relogio(); desenharChamada(); desenharCentro(); desenharFicha(); hermesSugPainel(); hermesTopo(); }
  function hermesAceitar(x){ hermesAplicar(x); hermesDepois(); }
  function hermesDescartar(x){ A.hermes.est[x.k]='x'; hermesDepois(); }
  function hermesAceitarTodas(){
    /* natureza primeiro: as respostas da entrevista dependem dela */
    var todas=hermesPendentes(); todas.filter(function(x){ return x.s.c==='natureza'; }).forEach(hermesAplicar);
    hermesPendentes().forEach(hermesAplicar);
    hermesDepois();
  }
  function montarHermes(alvo){
    var H=A.hermes; H.mostradas=0;
    alvo.appendChild(el('section',{class:'hermes','aria-label':'Hermes, demonstração'},[
      el('div',{class:'hTopo',id:'hTopo'}),
      el('div',{class:'hCorpo'},[
        el('div',{class:'hCol'},[el('div',{class:'hTit',text:'Transcrição'}),el('div',{class:'hTrans',id:'hTrans',role:'log','aria-live':'polite'})]),
        el('div',{class:'hCol'},[el('div',{class:'hTit',id:'hSugTit'}),el('div',{class:'hSugL',id:'hSug'})])])]));
  }
  function hermesTopo(){
    var t=$('hTopo'),H=A&&A.hermes; if(!t||!H) return; t.textContent='';
    var fim=H.idx>=H.rot.falas.length,c=hermesContas();
    t.appendChild(el('span',{class:'hMarca',text:'Hermes'}));
    t.appendChild(el('span',{class:'hDemo',text:'demonstração · '+H.rot.titulo+(H.audio?' · com áudio':' · transcrição simulada')}));
    t.appendChild(el('span',{class:'grow'}));
    t.appendChild(el('span',{class:'muted',text:fim?'Fim da gravação':H.play?'Transcrevendo…':'Pausado'}));
    if(!fim){
      t.appendChild(el('button',{class:'btn sm',onclick:hermesTocar,'aria-label':H.play?'Pausar a transcrição':'Continuar a transcrição'},[H.play?'❚❚ Pausar':'▶ Continuar']));
      t.appendChild(el('button',{class:'btn sm',onclick:hermesVel,'aria-label':'Velocidade da demonstração, agora '+H.vel+' vezes'},[H.vel+'×']));
      t.appendChild(el('button',{class:'btn sm',onclick:hermesProxima,text:'Próxima fala ›'}));
    }
    t.appendChild(el('span',{class:'hConta',text:c.ok+' aplicada'+(c.ok===1?'':'s')+' · '+c.x+' descartada'+(c.x===1?'':'s')}));
    if(H.aviso) t.appendChild(el('div',{class:'msg inf',style:'flex-basis:100%;margin:0',text:H.aviso}));
  }
  function hermesTrans(){
    var b=$('hTrans'),H=A&&A.hermes; if(!b||!H) return;
    if(!H.idx&&!H.mostradas){ b.textContent=''; b.appendChild(el('span',{class:'muted',text:'Aguardando a primeira fala…'})); return; }
    if(H.mostradas===0) b.textContent='';
    H.rot.falas.slice(H.mostradas,H.idx).forEach(function(f){
      b.appendChild(el('div',{class:'hFala '+f.quem},[el('span',{class:'hT',text:mmss(f.t)}),el('span',{class:'hQuem',text:f.quem==='atendente'?'Atendente':'Solicitante'}),el('span',{class:'hTxt',text:f.txt})]));
    });
    H.mostradas=H.idx; b.scrollTop=b.scrollHeight;
  }
  function hermesSugPainel(){
    var b=$('hSug'),tt=$('hSugTit'),H=A&&A.hermes; if(!b||!H) return; b.textContent='';
    var p=hermesPendentes();
    tt.textContent=''; tt.appendChild(el('span',{class:'grow',text:'Sugestões'+(p.length?' ('+p.length+')':'')}));
    if(p.filter(function(x){ return x.sit==='nova'; }).length>1) tt.appendChild(el('button',{class:'btn sm hBtn',text:'Aplicar todas',onclick:hermesAceitarTodas}));
    if(!p.length){ b.appendChild(el('span',{class:'muted',text:H.idx?'Nenhuma sugestão pendente. O que o Hermes entender da conversa aparece aqui.':'As sugestões aparecem conforme a conversa.'})); return; }
    p.slice().reverse().forEach(function(x){
      var r=hermesRotulo(x.s),espera=x.sit==='espera';
      b.appendChild(el('div',{class:'hSugItem'+(espera?' esp':'')},[
        el('div',{class:'grow'},[el('span',{class:'fr',text:r[0]}),el('span',{class:'hVal',text:r[1]}),el('span',{class:'hEvid',text:'ouvido em '+mmss(x.f.t)+(espera?' · escolha a natureza para aplicar':'')})]),
        el('button',{class:'btn sm hBtn',disabled:espera,text:'Aplicar',onclick:function(){ hermesAceitar(x); }}),
        el('button',{class:'btn ic','aria-label':'Descartar sugestão: '+r[0],text:'✕',onclick:function(){ hermesDescartar(x); }})]));
    });
  }
  function desenharHermes(){ hermesTopo(); hermesTrans(); hermesSugPainel(); }
  /* destaque das sugestões junto dos campos e perguntas, sem redesenhar o que o atendente está digitando */
  function pintarDicas(){
    var c=$('centro'); if(!c) return;
    Array.prototype.forEach.call(c.querySelectorAll('.hdica'),function(d){ d.textContent=''; });
    Array.prototype.forEach.call(c.querySelectorAll('.op.sug'),function(b){ b.classList.remove('sug'); });
    if(!A||!A.hermes) return;
    hermesPendentes().forEach(function(x){
      if(x.sit!=='nova') return;
      var s=x.s,alvo=s.c==='resp'?c.querySelector('.hdica[data-hid="'+s.id+'"]'):c.querySelector('.hdica[data-hc="'+s.c+'"]');
      if(!alvo) return;
      var r=hermesRotulo(s); alvo.textContent='';
      alvo.appendChild(el('span',{class:'hTag',text:'Hermes'}));
      alvo.appendChild(el('span',{class:'grow'},[s.c==='resp'&&s.v===true?'Ouviu você dizer esta instrução.':'Entendeu: ',s.c==='resp'&&s.v===true?null:el('b',{text:r[1]}),el('span',{class:'hEvid',text:' “'+x.f.txt+'”'})]));
      alvo.appendChild(el('button',{class:'btn sm hBtn',text:s.c==='resp'&&s.v===true?'Marcar como dita':'Usar',onclick:function(){ hermesAceitar(x); }}));
      alvo.appendChild(el('button',{class:'btn ic','aria-label':'Descartar sugestão do Hermes',text:'✕',onclick:function(){ hermesDescartar(x); }}));
      if(s.c==='resp'&&s.v.ops){ var row=c.querySelector('.qrow[data-qid="'+s.id+'"]'); if(row) s.v.ops.forEach(function(o){ var bt=row.querySelector('.op[data-op="'+o+'"]'); if(bt) bt.classList.add('sug'); }); }
    });
  }
  function dica(campo){ return el('div',{class:'hdica','data-hc':campo}); }
  function protocolo(){
    var itens=A&&A.nat?expandida(A.nat):[];
    if(!itens.length) return {vazio:true,lista:[],itens:[]};
    var v=validarAlvo(DB.protocolos[A.nat],A.nat); if(v.erros.length) return {erro:true,lista:[],itens:itens};
    var est=caminhar(itens,A.resp),g=grafo(itens),lista=est.path.slice();
    if(est.pendente) previsao(itens,A.resp,est.pendente).forEach(function(id){ if(lista.indexOf(id)<0) lista.push(id); });
    return {itens:itens,g:g,est:est,lista:lista};
  }
  function natPorNome(nome){ var a=norm(nome); return NATUREZAS.filter(function(n){ return norm(n.nome)===a; })[0]||null; }
  function trocarNatureza(n){
    var de=natPorId(A.nat); A.trocas=(A.trocas||[]).concat([{de:de?de.nome:'',para:n.nome}]);
    A.nat=n.id; A.natTxt=n.nome; A.resp={}; desenharCentro(); desenharFicha(); if(A.hermes){ hermesSugPainel(); } foco();
  }
  function quartelAuto(){ return A.ra?'[GBM da área de '+A.ra+']':''; }
  function quartelAtual(){ return A.quartel||quartelAuto(); }
  function relatoAuto(){
    if(!A) return '';
    var n=natPorId(A.nat),p=[];
    if(n) p.push(n.nome+'.');
    (A.trocas||[]).forEach(function(t){ p.push('Natureza alterada de '+t.de+' para '+t.para+' durante a entrevista.'); });
    if(A.local) p.push('Local: '+A.local+(A.ra?', '+A.ra:'')+'/'+A.uf+'.');
    if(A.ref) p.push('Referência: '+A.ref+'.');
    var P=protocolo();
    if(P.est) P.est.path.forEach(function(id){ var it=P.g.item[id],r=A.resp[id]; if(!respondido(it,r)) return;
      if(ehPergunta(it)){ var v=valorRelato(it,r); if(v) p.push(it.texto.replace(/\?\s*$/,'')+': '+v+'.'); }
      else if(it.tipo==='instrucao'&&!it.despacho&&it.relato!==false) p.push('Orientado: '+it.texto); });
    return p.join(' ');
  }
  function relatoAtual(){ return A.relManual?A.relato:relatoAuto(); }
  function faltasEncaminhar(){ var f=[]; if(!A.nat) f.push('natureza'); if(!A.local.trim()) f.push('local'); if(!A.ra) f.push('região administrativa'); return f; }
  function faltasRegistro(){
    var f=[],P=protocolo();
    if(P.est) P.lista.forEach(function(id){ var it=P.g.item[id]; if(ehPergunta(it)&&it.obrig){ var r=A.resp[id]; if(!respondido(it,r)||r.pulada) f.push('pergunta obrigatória “'+it.texto+'”'); } });
    if(!A.nomeNI&&!A.nome.trim()) f.push('nome do solicitante (ou marcar “Não informado”)');
    return f;
  }
  function contagem(P){ var t=0,n=0; if(P.est) P.lista.forEach(function(id){ var it=P.g.item[id]; if(ehPergunta(it)){ t++; var r=A.resp[id]; if(respondido(it,r)&&!r.pulada) n++; } }); return {t:t,n:n}; }
  function duplicada(){
    if(!A.nat||!A.ra) return null;
    var lim=Date.now()-30*60000;
    return DB.ocorrencias.filter(function(o){ return o.natureza===A.nat&&o.ra===A.ra&&o.ts>=lim; })[0]||null;
  }

  /* ---------- atendimento: ações ---------- */
  function ir(p){ if(!A) return; p=Math.max(0,Math.min(3,p)); if(p>0&&faltasEncaminhar().length){ A.erro='Para seguir para a entrevista falta: '+faltasEncaminhar().join(', ')+'.'; desenharCentro(); foco(); return; } A.passo=p; A.max=Math.max(A.max,p); A.erro=''; desenharPassos(); desenharCentro(); desenharFicha(); foco(); }
  /* encaminhamento ao despacho: acontece no item "Despacho imediato" do fluxo da natureza, ou antes, pelo botão "Encaminhar agora" */
  function encaminhar(){
    var f=faltasEncaminhar();
    if(f.length){ A.erro='Para encaminhar falta: '+f.join(', ')+'.'; desenharCentro(); foco(); return false; }
    if(A.encS==null) A.encS=seg();
    relogio(); desenharChamada(); desenharFicha(); return true;
  }
  function avancar(){ if(!A) return; ir(A.passo+1); }
  function responder(id,r){ if(r==null) delete A.resp[id]; else A.resp[id]=r; desenharCentro(); desenharFicha(); foco(); }
  function registrar(forcar,depois){
    if(!A) return;
    if(faltasEncaminhar().length){ A.erro='Para registrar falta: '+faltasEncaminhar().join(', ')+'.'; A.passo=0; desenharPassos(); desenharCentro(); return; }
    /* rede de segurança: ocorrência sem despacho só é registrada com uma decisão explícita */
    if(A.encS==null&&!A.semDespacho){ A.conf={tipo:'desp',forcar:forcar,depois:depois}; desenharConf(); return; }
    var f=faltasRegistro();
    if(f.length&&!forcar){ A.conf={tipo:'reg',faltas:f}; desenharConf(); return; }
    var P=protocolo(),n=natPorId(A.nat),ent=[];
    if(P.est) P.est.path.forEach(function(id){ var it=P.g.item[id],r=A.resp[id]; if(respondido(it,r)) ent.push({id:id,tipo:it.tipo,texto:it.texto,resposta:valorResposta(it,r)}); });
    var o={numero:DB.seq++,ts:Date.now(),natureza:A.nat,naturezaNome:n?n.nome:'',local:A.local,uf:A.uf,ra:A.ra,quartel:quartelAtual(),referencia:A.ref,solicitante:A.nomeNI?'Não informado':A.nome,telefone:A.tel,entrevista:ent,relato:relatoAtual(),observacoes:A.obs,segEncaminhar:A.encS,segTotal:seg(),pendencias:f,semDespacho:A.semDespacho?A.semDespacho.motivo:null};
    if(A.hermes){ var hc=hermesContas(); o.hermes={roteiro:A.hermes.rot.titulo,aplicadas:hc.ok,descartadas:hc.x,semResposta:hc.pend}; }
    DB.ocorrencias.unshift(o); salvar();
    V.aviso={t:'okm',m:'Ocorrência nº '+o.numero+' registrada. Encaminhada em '+mmss(o.segEncaminhar)+', ligação de '+mmss(o.segTotal)+'.'};
    V.pausa=depois==='pausa';
    fimLigacao();
  }
  function pedirEncerrar(tipo){ if(!A) return; A.conf={tipo:tipo}; desenharConf(); }
  function encerrarSemRegistrar(){ var t=A.conf&&A.conf.tipo; V.aviso={t:'inf',m:A.encS!=null?'Ligação encerrada sem registro da ficha.':'Ligação encerrada. Nada foi encaminhado.'}; V.pausa=t==='pausa'; fimLigacao(); }

  /* ---------- atendimento: desenho ---------- */
  function desenharChamada(){
    var c=$('encAgora'); if(!c||!A) return; c.textContent='';
    if(A.encS!=null) return;
    var ok=!faltasEncaminhar().length;
    c.appendChild(el('button',{class:'btn sm '+(ok?'vermv':'apag'),title:ok?'O encaminhamento acontece no ponto de despacho do fluxo da natureza. Use este botão só para adiantar.':'Preencha natureza, local e região para poder adiantar o despacho',disabled:!ok,onclick:function(){ encaminhar(); desenharCentro(); }},['🚒 Adiantar despacho']));
  }
  function relogio(){
    if(!A) return; var s=seg(),t=$('timer'); if(!t) return;
    t.textContent=mmss(s);
    var b=$('barra'); if(b){ b.style.width=Math.min(100,s/120*100)+'%'; b.style.background=A.encS!=null?'#28A745':(s>60?'#C82333':'#1976D2'); }
    var c=$('chipEnc'); if(c){ c.style.display=A.encS!=null?'':'none'; c.textContent='Encaminhada ao despacho aos '+mmss(A.encS||0); }
  }
  function foco(){
    setTimeout(function(){
      if(!A||V.view!=='atend') return;
      var alvo=document.querySelector('#centro [data-foco]')||document.querySelector('#centro .qrow.cur button, #centro .qrow.cur input, #centro .qrow.cur select');
      if(alvo){ try{ alvo.focus({preventScroll:false}); }catch(e){} }
      var cur=document.querySelector('#centro .qrow.cur'); if(cur&&cur.scrollIntoView) cur.scrollIntoView({block:'nearest'});
    },0);
  }
  function campo(rot,ctl,extra){ return el('div',{class:'campo'},[el('label',{class:'rot',for:ctl.id},[rot].concat(extra||[])),ctl]); }
  function obrig(){ return el('span',{class:'ast',text:' *'}); }
  function desenharAtend(){
    var r=$('vAtend'); r.textContent='';
    if(!A){
      var box=el('div',{class:'ocioso'},[
        el('div',{class:'brasao','aria-hidden':'true',text:'SSP-DF'}),
        el('h1',{text:V.pausa?'Em pausa':'Aguardando ligação'}),
        V.aviso?el('div',{class:'msg '+V.aviso.t,role:'status',text:V.aviso.m}):null,
        el('p',{class:'muted',text:'Protótipo para validar o fluxo de atendimento e a entrevista por natureza. Use dados fictícios: o que for registrado fica guardado só neste navegador.'}),
        el('button',{class:'btn ok grande',id:'bNova',text:V.pausa?'Sair da pausa e simular nova ligação':'Simular nova ligação',onclick:function(){ novaLigacao(null); }}),
        el('p',{class:'muted',text:'O Hermes não está ligado neste protótipo. A tela funciona inteira sem ele, como deve funcionar no sistema.'})]);
      r.appendChild(box);
      r.appendChild(el('div',{class:'ocioso hDemoBox'},[
        el('h2',{text:'Demonstração com o Hermes'}),
        el('p',{class:'muted',text:'Ligações roteirizadas para mostrar o Hermes ao lado do atendente: ele transcreve a conversa e sugere natureza, local, respostas da entrevista e observações. Nada entra na ficha sem o atendente aplicar.'}),
        el('div',{class:'hRots'},ROTEIROS.map(function(rot){ var n=natPorId(rot.natureza); return el('button',{class:'hRot',onclick:function(){ novaLigacao(rot); }},[el('b',{text:rot.titulo}),el('span',{class:'muted',text:rot.resumo}),el('span',{class:'tag',text:(n?n.nome:'')+(rot.audio?' · com áudio':' · transcrição simulada')})]); }))]));
      return;
    }
    r.appendChild(el('div',{class:'chamada'},[
      el('div',{class:'chLinha'},[
        el('span',{class:'chNum',text:'193'}),
        el('span',{class:'chFone',text:A.fone}),
        el('span',{class:'chTimer',id:'timer',role:'timer','aria-label':'Tempo de ligação',text:'00:00'}),
        el('span',{class:'chip verde',id:'chipEnc',style:'display:none'}),
        el('span',{id:'encAgora'}),
        A.hermes?el('span',{class:'chip roxo',text:'Hermes · demonstração'}):el('span',{class:'chip cinza',text:'Hermes desligado'}),
        el('span',{class:'grow'}),
        el('button',{class:'btn laranja',text:'Transferir',onclick:function(){ A.erro='Transferência não faz parte deste protótipo.'; desenharCentro(); }}),
        el('button',{class:'btn verm',onclick:function(){ pedirEncerrar('enc'); }},['Encerrar']),
        el('button',{class:'btn vermv',onclick:function(){ pedirEncerrar('pausa'); }},['Encerrar e pausar'])]),
      el('div',{class:'chBarra','aria-hidden':'true'},[el('div',{id:'barra'}),el('span',{class:'marca',title:'60 s'})])]));
    if(A.hermes) montarHermes(r);
    r.appendChild(el('div',{id:'conf'}));
    r.appendChild(el('nav',{id:'passos','aria-label':'Passos do atendimento'}));
    r.appendChild(el('div',{class:'grade'},[el('main',{id:'centro'}),el('aside',{id:'ficha','aria-label':'Ficha da ocorrência'})]));
    relogio(); desenharChamada(); desenharConf(); desenharPassos(); desenharCentro(); desenharFicha(); if(A.hermes) desenharHermes();
  }
  function desenharConf(){
    var c=$('conf'); if(!c) return; c.textContent=''; if(!A||!A.conf) return;
    var fechar=function(){ A.conf=null; desenharConf(); };
    var k=A.conf,kids=[];
    if(k.tipo==='desp'){
      var segue=function(){ var kk=A.conf; A.conf=null; desenharConf(); registrar(kk.forcar,kk.depois); };
      kids.push(el('div',{class:'confTxt'},[el('b',{text:'A ocorrência não foi encaminhada ao despacho.'}),el('div',{text:'Antes de registrar, encaminhe ou diga por que não vai encaminhar.'})]));
      kids.push(el('button',{class:'btn verm',text:'🚒 Encaminhar agora e registrar',onclick:function(){ if(encaminhar()) segue(); else { A.conf=null; desenharConf(); } }}));
      ['Trote ou engano','Encaminhada a outro órgão','Sem necessidade de recurso','Solicitante desistiu'].forEach(function(m){ kids.push(el('button',{class:'btn',text:m,onclick:function(){ A.semDespacho={motivo:m}; segue(); }})); });
      kids.push(el('button',{class:'btn',text:'Outro motivo…',onclick:function(){ var m=prompt('Por que a ocorrência não será encaminhada ao despacho?'); if(m&&m.trim()){ A.semDespacho={motivo:m.trim()}; segue(); } }}));
      kids.push(el('button',{class:'btn',onclick:fechar},['Voltar ',el('kbd',{text:'Esc'})]));
      c.appendChild(el('div',{class:'confFaixa',role:'alertdialog','aria-label':'Decisão sobre o despacho'},kids)); var b0=c.querySelector('button'); if(b0) b0.focus(); return;
    }
    if(k.tipo==='reg'){
      kids.push(el('div',{class:'confTxt'},[el('b',{text:'Faltam dados para o registro:'}),el('ul',{},k.faltas.map(function(x){ return el('li',{text:x}); }))]));
      kids.push(el('button',{class:'btn ok',text:'Registrar mesmo assim',onclick:function(){ registrar(true); }}));
      kids.push(el('button',{class:'btn',text:'Voltar e completar',onclick:fechar}));
    } else {
      var pausa=k.tipo==='pausa';
      var podeReg=!faltasEncaminhar().length;
      kids.push(el('div',{class:'confTxt'},[el('b',{text:A.encS!=null?'A ocorrência foi encaminhada, mas a ficha ainda não foi registrada.':podeReg?'A ocorrência não foi encaminhada nem registrada.':'Nada foi encaminhado. Encerrar agora descarta o que foi preenchido.'})]));
      if(podeReg) kids.push(el('button',{class:'btn ok',text:'Registrar e '+(pausa?'pausar':'encerrar'),onclick:function(){ registrar(true,pausa?'pausa':''); }}));
      kids.push(el('button',{class:'btn vermv',text:(pausa?'Encerrar e pausar':'Encerrar')+' sem registrar',onclick:encerrarSemRegistrar}));
      kids.push(el('button',{class:'btn',onclick:fechar},['Cancelar ',el('kbd',{text:'Esc'})]));
    }
    c.appendChild(el('div',{class:'confFaixa',role:'alertdialog','aria-label':'Confirmação'},kids));
    var b=c.querySelector('button'); if(b) b.focus();
  }
  function desenharPassos(){
    var n=$('passos'); if(!n) return; n.textContent='';
    var ol=el('ol',{});
    PASSOS.forEach(function(l,i){
      var feito=i<=A.max&&i!==A.passo,agora=i===A.passo,pode=feito&&(i===0||!faltasEncaminhar().length);
      ol.appendChild(el('li',{class:(agora?'agora':feito?'feito':'')},[
        el('button',{disabled:!pode,'aria-current':agora?'step':null,'aria-label':(pode?'Voltar para o passo ':'Passo ')+(i+1)+', '+l,onclick:function(){ ir(i); }},[
          el('span',{class:'bola',text:feito&&i<A.passo?'✓':String(i+1)}),
          el('span',{class:'pl'},[el('span',{text:l}),pode?el('span',{class:'volta',text:i<A.passo?'‹ voltar e corrigir':'voltar para cá ›'}):null])])]));
    });
    n.appendChild(el('span',{class:'ptit',text:'Passo '+(A.passo+1)+' de 4'}));
    n.appendChild(ol);
    n.appendChild(el('button',{class:'lnk',onclick:function(){ V.help=true; desenharAjuda(); }},['Atalhos ',el('kbd',{text:'F1'})]));
  }
  function navBotoes(){
    var kids=[];
    if(A.passo>0) kids.push(el('button',{class:'btn azulv grande',onclick:function(){ ir(A.passo-1); }},['‹ Anterior ',el('kbd',{text:'Alt+PgUp'})]));
    if(A.passo===0){ var ok=!faltasEncaminhar().length; kids.push(el('button',{class:'btn grande '+(ok?'pri':'apag'),id:'bEnc',onclick:function(){ ir(1); }},['Seguir para a entrevista ',el('kbd',{text:'Ctrl+Enter'}),' ›'])); }
    else if(A.passo<3) kids.push(el('button',{class:'btn pri grande',onclick:avancar},['Próximo ',el('kbd',{text:'Alt+PgDn'}),' ›']));
    return el('div',{class:'nav'},kids);
  }
  function atualizarEnc(){ var f=faltasEncaminhar().length,b=$('bEnc'); if(b) b.className='btn grande '+(f?'apag':'pri'); desenharChamada(); if(!f&&A.erro){ A.erro=''; var m=document.querySelector('#centro > .msg.err'); if(m) m.remove(); } }
  function desenharCentro(){
    var c=$('centro'); if(!c||!A) return; c.textContent='';
    if(A.erro) c.appendChild(el('div',{class:'msg err',role:'alert',text:A.erro}));
    if(A.passo===0) passoLocal(c); else if(A.passo===1) passoEntrevista(c); else if(A.passo===2) passoSolicitante(c); else passoFechamento(c);
    c.appendChild(navBotoes());
    pintarDicas();
  }
  function passoLocal(c){
    c.appendChild(el('h1',{class:'tit',text:'O que aconteceu e onde?'}));
    var dl=el('datalist',{id:'dlNat'},NATUREZAS.map(function(n){ return el('option',{value:n.nome}); }));
    var infoNat=el('span',{class:'apoio',id:'infoNat'});
    var pintaNat=function(){ var n=natPorId(A.nat); if(!A.natTxt.trim()) infoNat.textContent='Digite parte do nome e escolha na lista.'; else if(!n) infoNat.textContent='Natureza não reconhecida. Escolha uma da lista.'; else { var q=DB.protocolos[n.id].length; infoNat.textContent=!q?'Esta natureza ainda não tem entrevista cadastrada.':validarAlvo(DB.protocolos[n.id],n.id).erros.length?'A entrevista desta natureza está com erros no editor e não será usada.':'Natureza reconhecida.'; } };
    var iNat=el('input',{type:'text',id:'fNat',list:'dlNat',value:A.natTxt,autocomplete:'off','data-foco':A.natTxt?null:'1',placeholder:'Ex.: capotamento, incêndio',oninput:function(e){
      A.natTxt=e.target.value; var alvo=norm(A.natTxt),ach=NATUREZAS.filter(function(n){ return norm(n.nome)===alvo; })[0];
      var novo=ach?ach.id:''; if(novo!==A.nat){ A.nat=novo; A.resp={}; } pintaNat(); pintaDup(); atualizarEnc(); desenharFicha(); }});
    c.appendChild(campo('Natureza',iNat,[obrig()])); c.appendChild(dl); c.appendChild(infoNat); c.appendChild(dica('natureza')); pintaNat();
    c.appendChild(campo('Local',el('input',{type:'text',id:'fLocal',value:A.local,autocomplete:'off',placeholder:'Via, número, quadra, sentido',oninput:function(e){ A.local=e.target.value; atualizarEnc(); desenharFicha(); }}),[obrig()]));
    c.appendChild(dica('local'));
    var qt=el('input',{type:'text',id:'fQt',value:quartelAtual(),placeholder:'Preenchido pela região',oninput:function(e){ A.quartel=e.target.value; desenharFicha(); }});
    c.appendChild(el('div',{class:'tres'},[
      campo('UF',el('select',{id:'fUf',value:A.uf,onchange:function(e){ A.uf=e.target.value; desenharFicha(); }},UFS.map(function(u){ return el('option',{value:u,text:u}); })),[obrig()]),
      campo('Região administrativa',el('select',{id:'fRa',value:A.ra,onchange:function(e){ A.ra=e.target.value; if(!A.quartel) qt.value=quartelAuto(); pintaDup(); atualizarEnc(); desenharFicha(); }},[el('option',{value:'',text:'Selecione…'})].concat(RAS.map(function(x){ return el('option',{value:x,text:x}); }))),[obrig()]),
      el('div',{class:'campo'},[el('label',{class:'rot',for:'fQt',text:'Quartel'}),qt,el('span',{class:'apoio',text:'Preenchido pelo local. Altere só se precisar.'})])]));
    c.appendChild(dica('ra'));
    c.appendChild(campo('Ponto de referência',el('input',{type:'text',id:'fRef',value:A.ref,autocomplete:'off',placeholder:'Opcional',oninput:function(e){ A.ref=e.target.value; desenharFicha(); }})));
    c.appendChild(dica('ref'));
    var dup=el('div',{id:'dup'}); c.appendChild(dup);
    function pintaDup(){ dup.textContent=''; var o=duplicada(); if(o) dup.appendChild(el('div',{class:'msg inf',role:'status',text:'Possível mesma ocorrência: nº '+o.numero+', '+o.naturezaNome+', em '+o.local+' ('+o.ra+'), registrada há '+Math.max(1,Math.round((Date.now()-o.ts)/60000))+' min.'})); }
    pintaDup();
  }
  function opBtn(rot,on,fut,fn,tecla,opId){ return el('button',{class:'op'+(on?' on':''),'data-op':opId||null,'aria-pressed':on?'true':'false',onclick:fn},[(on?'✓ ':'')+rot,tecla?el('span',{class:'tk',text:tecla}):null]); }
  function passoEntrevista(c){
    var P=protocolo(),n=natPorId(A.nat),ct=contagem(P);
    c.appendChild(el('div',{class:'titLinha'},[el('h1',{class:'tit semb',text:'Entrevista · '+(n?n.nome:'')}),P.est?el('span',{class:'muted',text:ct.n+' de '+ct.t+' perguntas respondidas'}):null]));
    if(P.vazio){ c.appendChild(el('div',{class:'msg inf',text:'Esta natureza ainda não tem entrevista cadastrada. Siga para o solicitante. O gestor cadastra as perguntas na aba Protocolos.'})); return; }
    if(P.erro){ c.appendChild(el('div',{class:'msg err',text:'O protocolo desta natureza está com erros no editor e não pode ser usado. Siga para o solicitante e avise o gestor.'})); return; }
    var lista=el('div',{class:'qlista'});
    P.lista.forEach(function(id){
      var it=P.g.item[id],r=A.resp[id],ans=respondido(it,r),cur=id===P.est.pendente,fut=P.est.path.indexOf(id)<0;
      var row=el('div',{class:'qrow'+(cur?' cur':'')+(fut?' fut':'')+' t-'+it.tipo,'data-qid':id});
      if(it.tipo==='troca'){
        var nt=natPorNome(it.texto),bt=el('div',{class:'bloco troca'},[el('span',{class:'bTag',text:'🔁 Trocar natureza'}),el('span',{class:'bTxt',text:'Pelas respostas, a natureza indicada é: '+it.texto+'.'})]);
        if(ans) bt.appendChild(el('span',{class:'feito',text:nt?'✓ Natureza mantida':'✓ Ciente · seguiu com a natureza atual'}));
        else if(!fut) bt.appendChild(el('div',{class:'linhaBtn'},[
          nt?el('button',{class:'btn roxo',text:'Trocar para '+nt.nome,onclick:function(){ trocarNatureza(nt); }}):null,
          nt?el('button',{class:'btn',text:'Manter a natureza atual',onclick:function(){ responder(id,true); }}):el('button',{class:'btn pri',text:'Ciente, seguir com a natureza atual',onclick:function(){ var t='Protocolo indicou a natureza “'+it.texto+'”, ainda não cadastrada.'; if(String(A.obs).indexOf(t)<0) A.obs=(String(A.obs).trim()?String(A.obs).trim()+' ':'')+t; responder(id,true); }})]));
        if(!nt&&!ans) bt.insertBefore(el('div',{class:'msg inf',style:'margin:0',text:'Esta natureza ainda não está cadastrada no sistema. Siga com a natureza atual; a indicação vai para as observações da ficha.'}),bt.lastChild);
        row.appendChild(bt);
      } else if(it.tipo==='instrucao'||it.tipo==='informacao'||it.tipo==='diagrama'){
        var bloco=el('div',{class:'bloco '+it.tipo+(it.despacho?' desp':'')},[
          el('span',{class:'bTag',text:it.despacho?'🚒 Despacho imediato · diga ao solicitante':it.video?'📞 Videochamada':it.tipo==='instrucao'?'Diga ao solicitante':it.tipo==='informacao'?'Para você, não ler ao solicitante':'Fluxograma de consulta'}),
          el('span',{class:'bTxt',text:it.texto})]);
        if(it.tipo==='diagrama'){ var d=el('div',{class:'diag'}); bloco.appendChild(d); if(!fut) desenhar(it.mermaid,d); }
        if(it.despacho){
          if(A.encS!=null) bloco.appendChild(el('span',{class:'apoio',text:'Ocorrência encaminhada ao despacho aos '+mmss(A.encS)+'.'}));
          if(ans) bloco.appendChild(el('span',{class:'feito',text:'✓ Dita'}));
          else if(!fut) bloco.appendChild(A.encS==null?el('button',{class:'btn verm',text:'🚒 Encaminhar ao despacho e dizer a fala',onclick:function(){ if(encaminhar()) responder(id,true); }}):el('button',{class:'btn ok',text:'✓ Dito',onclick:function(){ responder(id,true); }}));
        }
        else if(ans) bloco.appendChild(el('span',{class:'feito',text:it.tipo==='instrucao'?'✓ Dita':'✓ Ciente'}));
        else if(!fut) bloco.appendChild(el('button',{class:'btn '+(it.tipo==='instrucao'?'ok':'pri'),text:it.tipo==='instrucao'?'✓ Dito':'Ciente',onclick:function(){ responder(id,true); }}));
        row.appendChild(bloco);
      } else {
        var ctl=el('div',{class:'qctl'}),sel=(r&&r.ops)||[];
        if(it.tipo==='unica') it.opcoes.forEach(function(o,k){ var on=sel.indexOf(o.id)>=0; ctl.appendChild(opBtn(o.rotulo,on,fut,function(){ responder(id,on?null:{ops:[o.id]}); },cur&&k<9?String(k+1):'',o.id)); });
        else if(it.tipo==='multipla'){
          it.opcoes.forEach(function(o,k){ var on=sel.indexOf(o.id)>=0; ctl.appendChild(opBtn(o.rotulo,on,fut,function(){ var ops=sel.filter(function(x){return x!==o.id;}); if(!on) ops.push(o.id); var out=(r&&r.outro)||''; responder(id,(ops.length||out)?{ops:ops,outro:out,feito:!!(r&&r.feito)}:null); },cur&&k<9?String(k+1):'',o.id)); });
          if(it.outro) ctl.appendChild(el('input',{type:'text',class:'curto',value:(r&&r.outro)||'',placeholder:'Outro: descreva','aria-label':'Outro, em '+it.texto,onchange:function(e){ var t=e.target.value.trim(); responder(id,(sel.length||t)?{ops:sel,outro:t,feito:!!(r&&r.feito)}:null); }}));
          if(r&&(sel.length||r.outro)&&!r.feito) ctl.appendChild(el('button',{class:'btn pri',onclick:function(){ responder(id,{ops:sel,outro:(r&&r.outro)||'',feito:true}); }},['Pronto ✓ ',el('kbd',{text:'Enter'})]));
          else if(cur&&!sel.length) ctl.appendChild(el('span',{class:'apoio',text:'Marque todas que valem e confirme.'}));
        }
        else if(it.tipo==='lista') ctl.appendChild(el('select',{'aria-label':it.texto,value:sel[0]||'',onchange:function(e){ responder(id,e.target.value?{ops:[e.target.value]}:null); }},[el('option',{value:'',text:'Selecione…'})].concat(it.opcoes.map(function(o){ return el('option',{value:o.id,text:o.rotulo}); }))));
        else ctl.appendChild(el('input',{type:'text',class:'curto',inputmode:it.tipo==='numero'?'numeric':'text',value:(r&&r.valor)||'',placeholder:it.tipo==='numero'?'0':'Digite','aria-label':it.texto,
          onkeydown:function(e){ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } },
          onchange:function(e){ var x=e.target.value.trim(); if(it.tipo==='numero'&&x&&!/^\d+([.,]\d+)?$/.test(x)){ e.target.value=''; return; } responder(id,x?{valor:x}:null); }}));
        if(it.outro&&(it.tipo==='unica'||it.tipo==='lista')) ctl.appendChild(el('input',{type:'text',class:'curto',value:(r&&!sel.length&&r.outro)||'',placeholder:'Outra resposta','aria-label':'Outra resposta, em '+it.texto,onchange:function(e){ var t=e.target.value.trim(); responder(id,t?{ops:[],outro:t}:null); }}));
        if(cur&&!it.obrig) ctl.appendChild(el('button',{class:'lnk',text:'Pular',onclick:function(){ responder(id,{pulada:true,ops:[]}); }}));
        if(r&&r.pulada) ctl.appendChild(el('span',{class:'muted',text:'pulada'}));
        row.appendChild(el('div',{class:'qlinha'},[el('span',{class:'qtxt'},[it.texto,it.obrig?obrig():null]),ctl]));
      }
      if(A.hermes) row.appendChild(el('div',{class:'hdica','data-hid':id}));
      lista.appendChild(row);
    });
    c.appendChild(lista);
    if(!P.est.pendente) c.appendChild(el('div',{class:'msg okm',role:'status',text:'Entrevista concluída. Siga para o solicitante.'}));
  }
  function passoSolicitante(c){
    c.appendChild(el('h1',{class:'tit',text:'Quem está ligando?'}));
    var iNome=el('input',{type:'text',id:'fNome',value:A.nomeNI?'':A.nome,disabled:A.nomeNI,autocomplete:'off','data-foco':'1',placeholder:A.nomeNI?'Não informado':'Nome do solicitante',oninput:function(e){ A.nome=e.target.value; desenharFicha(); }});
    c.appendChild(el('div',{class:'campo'},[el('label',{class:'rot',for:'fNome',text:'Nome do solicitante'}),el('div',{class:'linhaBtn'},[iNome,el('button',{class:'btn '+(A.nomeNI?'pri':'azulv'),'aria-pressed':A.nomeNI?'true':'false',text:(A.nomeNI?'✓ ':'')+'Não informado',onclick:function(){ A.nomeNI=!A.nomeNI; desenharCentro(); desenharFicha(); foco(); }})])]));
    c.appendChild(dica('nome'));
    c.appendChild(campo('Telefone para retorno',el('input',{type:'text',id:'fTel',value:A.tel,autocomplete:'off',oninput:function(e){ A.tel=e.target.value; desenharFicha(); }})));
    c.appendChild(el('span',{class:'apoio',text:'O telefone veio da origem da chamada. Se o solicitante não disser o nome, marque “Não informado”.'}));
  }
  function passoFechamento(c){
    c.appendChild(el('h1',{class:'tit',text:'Relato'}));
    if(A.encS==null) c.appendChild(el('div',{class:'msg inf'},['A ocorrência ainda não foi encaminhada ao despacho. O fluxo desta natureza não pediu o encaminhamento nas respostas dadas. ',el('button',{class:'btn sm verm',text:'🚒 Encaminhar agora',onclick:function(){ encaminhar(); desenharCentro(); }})]));
    var ta=el('textarea',{id:'fRel',rows:'7','data-foco':'1','aria-label':'Relato da ocorrência',value:relatoAtual(),oninput:function(e){ A.relato=e.target.value; A.relManual=true; var s=$('relFicha'); if(s) s.textContent=A.relato; }});
    c.appendChild(ta);
    c.appendChild(el('div',{class:'linhaBtn'},[
      el('span',{class:'apoio grow',text:A.relManual?'Relato editado por você.':'Relato montado a partir do que foi preenchido. Você pode editar.'}),
      A.relManual?el('button',{class:'btn sm',text:'Voltar ao relato automático',onclick:function(){ A.relManual=false; A.relato=''; desenharCentro(); desenharFicha(); }}):null]));
    c.appendChild(el('span',{class:'apoio',text:'As Observações do atendente, na ficha, seguem junto para a equipe que vai atender. Para finalizar, confira a ficha e registre por lá.'}));
  }
  function desenharFicha(){
    var f=$('ficha'); if(!f||!A) return; var st=f.scrollTop,foc=document.activeElement&&document.activeElement.id; f.textContent='';
    var n=natPorId(A.nat),P=protocolo(),ct=contagem(P);
    f.appendChild(el('div',{class:'fTopo'},[el('h2',{text:'Ficha da ocorrência'}),A.encS!=null?el('span',{class:'chip verde',text:'Encaminhada '+mmss(A.encS)}):A.semDespacho?el('span',{class:'chip cinza',text:'Sem despacho: '+A.semDespacho.motivo}):el('span',{class:'chip cinza',text:'Não encaminhada'})]));
    var linha=function(rot,val,passo){ var vazio=!String(val||'').trim(); return el('div',{class:'fl'+(A.passo===passo?' at':'')},[el('div',{class:'flc'},[el('span',{class:'fr',text:rot}),el('span',{class:'fv'+(vazio?' vz':''),text:vazio?'—':val})]),el('button',{class:'caneta','aria-label':'Corrigir '+rot,title:'Corrigir',disabled:passo>0&&A.encS==null,onclick:function(){ ir(passo); }},['✎'])]); };
    f.appendChild(linha('Natureza',n?n.nome:'',0)); f.appendChild(linha('Local',A.local,0)); f.appendChild(linha('UF',A.uf,0));
    f.appendChild(linha('Região administrativa',A.ra,0)); f.appendChild(linha('Quartel',quartelAtual(),0)); f.appendChild(linha('Ponto de referência',A.ref,0));
    if(!n) f.appendChild(el('div',{class:'fgrupo',text:'Entrevista'})),f.appendChild(el('div',{class:'fnota',text:'As perguntas aparecem depois de definida a natureza.'}));
    else if(P.vazio||P.erro) f.appendChild(el('div',{class:'fgrupo',text:'Entrevista'})),f.appendChild(el('div',{class:'fnota',text:P.vazio?'Natureza sem entrevista cadastrada.':'Protocolo com erros.'}));
    else {
      f.appendChild(el('button',{class:'ftoggle','aria-expanded':A.entOpen?'true':'false',onclick:function(){ A.entOpen=!A.entOpen; desenharFicha(); }},[el('span',{'aria-hidden':'true',text:A.entOpen?'▾':'▸'}),el('span',{class:'ftl',text:'Entrevista'}),el('span',{class:'fts',text:ct.n+' de '+ct.t+' respondidas'})]));
      if(A.entOpen) P.lista.forEach(function(id){ var it=P.g.item[id]; if(P.est.path.indexOf(id)<0&&!respondido(it,A.resp[id])) { if(ehPergunta(it)) f.appendChild(linha(it.texto,'',1)); return; } if(it.tipo==='informacao'||it.tipo==='diagrama'||it.tipo==='troca') return; f.appendChild(linha(it.tipo==='instrucao'?'Instrução: '+it.texto:it.texto,valorResposta(it,A.resp[id]),1)); });
    }
    f.appendChild(el('div',{class:'fgrupo',text:'Solicitante'}));
    f.appendChild(linha('Nome do solicitante',A.nomeNI?'Não informado':A.nome,2)); f.appendChild(linha('Telefone para retorno',A.tel,2));
    var rel=el('div',{class:'frel'});
    rel.appendChild(el('div',{class:'frelTopo'},[el('span',{class:'fr',text:'Relato'}),el('span',{class:'tag',text:A.relManual?'editado':'automático'}),el('button',{class:'caneta','aria-label':A.relEdit?'Concluir edição do relato':'Editar relato',onclick:function(){ A.relEdit=!A.relEdit; desenharFicha(); if(A.passo===3) desenharCentro(); }},[A.relEdit?'✓':'✎'])]));
    if(A.relEdit) rel.appendChild(el('textarea',{id:'relEd',rows:'6','aria-label':'Editar relato',value:relatoAtual(),oninput:function(e){ A.relato=e.target.value; A.relManual=true; var c2=$('fRel'); if(c2) c2.value=A.relato; }}));
    else rel.appendChild(el('span',{class:'fv',id:'relFicha',text:relatoAtual()||'—'}));
    f.appendChild(rel);
    f.appendChild(el('div',{class:'frel'},[el('label',{class:'fr',for:'obsF',text:'Observações do atendente'}),el('textarea',{id:'obsF',rows:'3',placeholder:'Algo a destacar para a equipe que vai atender a ocorrência',value:A.obs,oninput:function(e){ A.obs=e.target.value; }}),el('span',{class:'apoio',text:'Pode escrever a qualquer momento do atendimento.'})]));
    var pode=!faltasEncaminhar().length;
    f.appendChild(el('div',{class:'frod'},[
      el('button',{class:'btn grande '+(pode?'ok':'apag'),id:'bReg',onclick:function(){ registrar(false); }},['Registrar ocorrência ✓ ',el('kbd',{text:'F8'})]),
      el('span',{class:'apoio',text:pode?(A.passo<3?'Se a ligação cair, registre com o que já tem.':'Confira os dados acima antes de registrar.'):'Liberado depois de preencher natureza, local e região.'})]));
    f.scrollTop=st; if(foc==='relEd'||foc==='obsF'){ var x=$(foc); if(x) x.focus(); }
  }
  function desenharAjuda(){
    var h=$('ajuda'); h.textContent=''; if(!V.help){ h.style.display='none'; return; } h.style.display='';
    var itens=[['Seguir para a entrevista (passo 1)','Ctrl+Enter'],['Próximo passo','Alt+PgDn'],['Passo anterior','Alt+PgUp'],['Responder a pergunta destacada','1 a 9'],['Registrar ocorrência','F8'],['Fechar confirmação ou esta ajuda','Esc'],['Abrir esta ajuda','F1']];
    h.appendChild(el('div',{class:'ajBox',role:'dialog','aria-label':'Atalhos de teclado'},[el('h2',{text:'Atalhos de teclado'}),el('table',{},itens.map(function(x){ return el('tr',{},[el('td',{text:x[0]}),el('td',{},[el('kbd',{text:x[1]})])]); })),el('button',{class:'btn pri',text:'Fechar',onclick:function(){ V.help=false; desenharAjuda(); }})]));
    h.querySelector('button').focus();
  }
  document.addEventListener('keydown',function(e){
    var k=e.key;
    if(k==='Escape'&&FB.aberto){ FB.aberto=false; desenharFeedback(); e.preventDefault(); return; }
    if(k==='Escape'){ if(V.help){ V.help=false; desenharAjuda(); e.preventDefault(); return; } if(A&&A.conf){ A.conf=null; desenharConf(); e.preventDefault(); return; } }
    if(V.view!=='atend') return;
    if(k==='F1'){ e.preventDefault(); V.help=!V.help; desenharAjuda(); return; }
    if(!A||A.conf||V.help||FB.aberto) return;
    if(e.ctrlKey&&k==='Enter'){ e.preventDefault(); if(A.passo===0) ir(1); return; }
    if(e.altKey&&k==='PageDown'){ e.preventDefault(); avancar(); return; }
    if(e.altKey&&k==='PageUp'){ e.preventDefault(); ir(A.passo-1); return; }
    if(k==='F8'){ e.preventDefault(); registrar(false); return; }
    var t=(e.target&&e.target.tagName)||''; var emTexto=t==='INPUT'||t==='TEXTAREA'||t==='SELECT';
    if(!emTexto&&A.passo===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&k>='1'&&k<='9'){
      var P=protocolo(); if(P.est&&P.est.pendente){ var it=P.g.item[P.est.pendente]; if(it.tipo==='unica'&&it.opcoes[+k-1]){ e.preventDefault(); responder(it.id,{ops:[it.opcoes[+k-1].id]}); }
        else if(it.tipo==='multipla'&&it.opcoes[+k-1]){ e.preventDefault(); var r0=A.resp[it.id]||{ops:[],outro:''},oid=it.opcoes[+k-1].id,ops=(r0.ops||[]).slice(),i0=ops.indexOf(oid); if(i0>=0) ops.splice(i0,1); else ops.push(oid); responder(it.id,(ops.length||r0.outro)?{ops:ops,outro:r0.outro||'',feito:false}:null); } }
    }
    if(!emTexto&&A.passo===1&&k==='Enter'&&!e.ctrlKey){ var P2=protocolo(); if(P2.est&&P2.est.pendente){ var it2=P2.g.item[P2.est.pendente],r2=A.resp[it2.id]; if(it2.tipo==='multipla'&&r2&&((r2.ops&&r2.ops.length)||r2.outro)){ e.preventDefault(); responder(it2.id,{ops:r2.ops||[],outro:r2.outro||'',feito:true}); } } }
  });

  /* ---------- ocorrências ---------- */
  function desenharOcorr(){
    var r=$('vOcorr'); r.textContent='';
    r.appendChild(el('div',{class:'row',style:'justify-content:space-between'},[el('h2',{class:'grow',text:'Ocorrências registradas neste navegador ('+DB.ocorrencias.length+')'}),
      el('button',{class:'btn',text:'Copiar tudo (JSON)',onclick:function(){ copiar(JSON.stringify(DB.ocorrencias,null,2)); }}),
      el('button',{class:'btn del',text:'Apagar ocorrências de teste',onclick:function(){ DB.ocorrencias=[]; DB.seq=1; salvar(); desenharOcorr(); }})]));
    if(!DB.ocorrencias.length){ r.appendChild(el('p',{class:'muted',text:'Nenhuma ocorrência registrada ainda. Faça um atendimento na aba Atendimento.'})); return; }
    DB.ocorrencias.forEach(function(o){
      var d=new Date(o.ts),hora=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
      var corpo=el('div',{class:'ocCorpo'},[
        el('div',{class:'ocGrid'},[['Local',o.local],['UF',o.uf],['Região administrativa',o.ra],['Quartel',o.quartel],['Ponto de referência',o.referencia||'—'],['Solicitante',o.solicitante||'—'],['Telefone',o.telefone],['Tempo até encaminhar',mmss(o.segEncaminhar)],['Duração da ligação',mmss(o.segTotal)]].map(function(x){ return el('div',{},[el('span',{class:'fr',text:x[0]}),el('span',{class:'fv',text:x[1]})]); })),
        o.entrevista.length?el('div',{},[el('span',{class:'fr',text:'Entrevista'}),el('ul',{class:'ocEnt'},o.entrevista.map(function(x){ return el('li',{},[x.texto+' ',el('b',{text:'→ '+x.resposta})]); }))]):null,
        el('div',{},[el('span',{class:'fr',text:'Relato'}),el('span',{class:'fv',text:o.relato||'—'})]),
        o.observacoes?el('div',{},[el('span',{class:'fr',text:'Observações do atendente'}),el('span',{class:'fv',text:o.observacoes})]):null,
        o.pendencias&&o.pendencias.length?el('div',{class:'msg inf',text:'Registrada com pendências: '+o.pendencias.join('; ')+'.'}):null,
        o.semDespacho?el('div',{class:'msg inf',text:'Não encaminhada ao despacho: '+o.semDespacho+'.'}):null,
        o.hermes?el('div',{},[el('span',{class:'fr',text:'Hermes (demonstração)'}),el('span',{class:'fv',text:o.hermes.roteiro+': '+o.hermes.aplicadas+' sugestões aplicadas, '+o.hermes.descartadas+' descartadas, '+o.hermes.semResposta+' sem resposta.'})]):null]);
      r.appendChild(el('details',{class:'oc'},[el('summary',{},[el('b',{text:'Nº '+o.numero}),' · '+hora+' · '+o.naturezaNome+' · '+o.local+' ('+o.ra+')'+(o.hermes?' · com Hermes':'')]),corpo]));
    });
  }
  function copiar(t){ try{ navigator.clipboard.writeText(t).then(function(){ status('Copiado'); },function(){ status('Não foi possível copiar; selecione o texto e copie.'); }); }catch(e){ status('Não foi possível copiar; selecione o texto e copie.'); } }

  /* ---------- protocolos (editor do gestor) ---------- */
  var S={nat:NATUREZAS[0].id,aba:'teste',resp:{},fluxo:'',fluxoSujo:false,form:'',formSujo:false,msg:null};
  Object.defineProperty(S,'itens',{get:function(){ return DB.protocolos[S.nat]; },set:function(v){ DB.protocolos[S.nat]=v; }});
  /* posições das caixas no editor visual: as deste navegador, senão as publicadas */
  function layoutDe(id){ return DB.layout[id]||(typeof LAYOUTS_PUBLICADOS!=='undefined'&&LAYOUTS_PUBLICADOS[id])||{}; }
  var pilhaDesenho=[];
  function abrirDesenho(voltando){
    if(!voltando) pilhaDesenho=[];
    var n=porChave(S.nat);
    HefestoDesenho.abrir({itens:function(){ return S.itens; },setItens:function(v){ S.itens=v; },natureza:n,naturezas:NATUREZAS,
      emBloco:ehBloco(S.nat),
      blocos:function(){ return BLOCOS.filter(function(b){ return 'bloco:'+b.id!==S.nat; }).map(function(b){ return {id:b.id,nome:b.nome,n:(DB.protocolos['bloco:'+b.id]||[]).length,usos:usosBloco(b.id).length}; }); },
      validar:function(){ return validarAlvo(S.itens,S.nat); },
      processo:function(){ return processoDe(S.nat,S.itens); },
      abrirBloco:function(bid){ if(!blocoPorId(bid)) return; pilhaDesenho.push(S.nat); S.nat='bloco:'+bid; S.resp={}; desenharProt(); abrirDesenho(true); },
      voltar:pilhaDesenho.length?{nome:(porChave(pilhaDesenho[pilhaDesenho.length-1])||{}).nome,fn:function(){ S.nat=pilhaDesenho.pop(); S.resp={}; desenharProt(); abrirDesenho(true); }}:null,
      criarBloco:function(nome,itens){ var r=criarBloco(nome,itens); if(!r.erro) desenharNats(); return r; },
      layout:function(){ return layoutDe(S.nat); },setLayout:function(l){ DB.layout[S.nat]=l; },mudou:function(){ mudou(true); }});
  }
  function mudou(estrutura){ S.resp={}; S.fluxoSujo=false; S.formSujo=false; salvar(); if(estrutura) desenharEditor(); desenharLado(); desenharNats(); }
  function desenharNats(){
    var n=$('pNats'); n.textContent='';
    desenharArquivo(n);
    n.appendChild(el('h2',{style:'margin-top:16px',text:'Naturezas'}));
    var sec=el('div',{id:'secNats'}); n.appendChild(sec); n=sec;
    n.appendChild(el('p',{class:'muted',text:'Crie, renomeie ou exclua naturezas aqui. A entrevista de cada uma é editada ao lado.'}));
    desenharNova(n);
    var resumoProc=[]; NATUREZAS.forEach(function(x){ var q=DB.protocolos[x.id].length,erro=q&&validarAlvo(DB.protocolos[x.id],x.id).erros.length,altos=q?processoDe(x.id).filter(function(y){ return y.nivel==='alto'; }).length:0; if(altos) resumoProc.push([x,altos]);
      n.appendChild(el('button',{class:'natBtn'+(x.id===S.nat?' on':''),'aria-current':x.id===S.nat?'true':null,onclick:function(){ S.nat=x.id; S.msg=null; S.resp={}; S.fluxoSujo=false; S.formSujo=false; desenharProt(); }},[el('span',{text:x.nome}),el('span',{class:'natQ'+(erro?' er':q?'':' vz'),text:(erro?'com erros':q?q+' itens':'sem entrevista')+(x.fonte==='criada no site'&&!PUB_NAT.some(function(p){ return p.id===x.id; })?' · nova':alterada(x.id)?' · alterada':'')}),altos?el('span',{class:'natProc',text:'⚠ '+altos+' caminho'+(altos>1?'s':'')+' sem despacho'}):null])); });
    if(resumoProc.length){ var rp=el('details',{class:'proc alto resumo'},[el('summary',{text:'⚠ '+resumoProc.length+' naturezas com caminhos sem despacho'})].concat(resumoProc.map(function(r){ return el('button',{class:'lnk',text:r[0].nome+' ('+r[1]+')',onclick:function(){ S.nat=r[0].id; S.aba='teste'; desenharProt(); window.scrollTo(0,0); }}); }))); sec.insertBefore(rp,sec.children[2]||null); }
    desenharBlocos($('pNats'));
  }
  function desenharBlocos(n){
    n.appendChild(el('h2',{style:'margin-top:16px',text:'Blocos'}));
    n.appendChild(el('p',{class:'muted',text:'Trechos de entrevista usados em várias naturezas. Corrigir um bloco corrige em todas.'}));
    if(!BLOCOS.length) n.appendChild(el('p',{class:'muted',text:'Nenhum bloco ainda.'}));
    BLOCOS.forEach(function(b){ var k='bloco:'+b.id,q=(DB.protocolos[k]||[]).length,u=usosBloco(b.id).length,erro=q&&validarAlvo(DB.protocolos[k],k).erros.length;
      n.appendChild(el('button',{class:'natBtn bloco'+(k===S.nat?' on':''),'aria-current':k===S.nat?'true':null,onclick:function(){ S.nat=k; S.msg=null; S.resp={}; S.fluxoSujo=false; S.formSujo=false; desenharProt(); }},[el('span',{text:'🧩 '+b.nome}),el('span',{class:'natQ'+(erro?' er':''),text:(erro?'com erros · ':'')+q+' itens · usado em '+u+(alterada(k)?' · alterado':'')})])); });
    n.appendChild(el('button',{class:'btn dash sm',style:'margin-top:8px',text:'+ Novo bloco',onclick:function(){ var nome=prompt('Nome do bloco (ex.: Consciência e respiração):'); if(!nome) return; var r=criarBloco(nome,[]); if(r.erro) alert(r.erro); else { S.nat='bloco:'+r.id; desenharProt(); } }}));
  }
  function criarBloco(nome,itens){
    nome=String(nome||'').replace(/\s+/g,' ').trim(); if(!nome) return {erro:'Escreva o nome do bloco.'};
    if(BLOCOS.some(function(b){ return norm(b.nome)===norm(nome); })) return {erro:'Já existe um bloco com esse nome.'};
    var base=slug(nome).slice(0,40).replace(/_+$/,'')||'bloco',id=base,k=2; while(blocoPorId(id)||PUB_BLO.some(function(b){ return b.id===id; })){ id=base+'_'+k; k++; }
    BLOCOS.push({id:id,nome:nome}); BLOCOS.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
    DB.protocolos['bloco:'+id]=itens||[]; salvar(); return {id:id};
  }
  function renomearBloco(bid,nome){
    nome=String(nome||'').replace(/\s+/g,' ').trim(); var b=blocoPorId(bid); if(!b||!nome||nome===b.nome) return '';
    if(BLOCOS.some(function(x){ return x!==b&&norm(x.nome)===norm(nome); })) return 'Já existe um bloco com esse nome.';
    b.nome=nome; chaves().forEach(function(k){ (DB.protocolos[k]||[]).forEach(function(x){ if(x.tipo==='bloco'&&x.bloco===bid) x.texto=nome; }); });
    BLOCOS.sort(function(a,c){ return a.nome.localeCompare(c.nome,'pt-BR'); }); salvar(); desenharProt(); return '';
  }
  function excluirBloco(bid){
    var b=blocoPorId(bid),u=usosBloco(bid); if(!b) return;
    if(u.length){ alert('O bloco “'+b.nome+'” é usado em: '+u.map(function(x){ return x.nome; }).join(', ')+'. Tire-o dessas entrevistas antes de excluir.'); return; }
    if(!confirm('Excluir o bloco “'+b.nome+'”?')) return;
    BLOCOS.splice(BLOCOS.indexOf(b),1); delete DB.protocolos['bloco:'+bid]; salvar(); S.nat=NATUREZAS[0].id; desenharProt();
  }
  /* ---------- naturezas: criar, renomear, excluir ---------- */
  function trocarNomeEmTrocas(de,para){ var n=0; Object.keys(DB.protocolos).forEach(function(k){ (DB.protocolos[k]||[]).forEach(function(it){ if(it.tipo==='troca'&&norm(it.texto)===norm(de)){ it.texto=para; n++; } }); }); return n; }
  function nomeLivre(nome,exceto){ var a=norm(nome); return !NATUREZAS.some(function(n){ return n.id!==exceto&&norm(n.nome)===a; }); }
  function ordenarNats(){ NATUREZAS.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); }); }
  function criarNatureza(nome){
    nome=String(nome||'').replace(/\s+/g,' ').trim(); if(!nome) return 'Escreva o nome da natureza.';
    if(!nomeLivre(nome)) return 'Já existe uma natureza com esse nome.';
    var base=String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40).replace(/_+$/,'')||'natureza';
    var id=base,k=2; while(natPorId(id)||PUB_NAT.some(function(n){ return n.id===id; })){ id=base+'_'+k; k++; }
    NATUREZAS.push({id:id,nome:nome,fonte:'criada no site'}); ordenarNats(); DB.protocolos[id]=[]; salvar();
    S.nat=id; S.resp={}; S.msg=null; desenharProt(); return '';
  }
  function renomearNatureza(id,nome){
    nome=String(nome||'').replace(/\s+/g,' ').trim(); var n=natPorId(id); if(!n||!nome||nome===n.nome) return '';
    if(!nomeLivre(nome,id)) return 'Já existe uma natureza com esse nome.';
    var t=trocarNomeEmTrocas(n.nome,nome); n.nome=nome; ordenarNats(); salvar(); desenharProt();
    status('Natureza renomeada'+(t?'; '+t+' troca'+(t>1?'s':'')+' de natureza atualizada'+(t>1?'s':''):''));
    return '';
  }
  function excluirNatureza(id){
    var n=natPorId(id); if(!n) return;
    var refs=0; Object.keys(DB.protocolos).forEach(function(k){ (DB.protocolos[k]||[]).forEach(function(it){ if(it.tipo==='troca'&&norm(it.texto)===norm(n.nome)) refs++; }); });
    if(!confirm('Excluir a natureza “'+n.nome+'” e a entrevista dela?'+(refs?'\n\n'+refs+' troca'+(refs>1?'s':'')+' de natureza em outras entrevistas aponta'+(refs>1?'m':'')+' para ela e vão ficar sem destino.':''))) return;
    NATUREZAS.splice(NATUREZAS.indexOf(n),1); delete DB.protocolos[id]; salvar();
    S.nat=NATUREZAS[0]?NATUREZAS[0].id:''; S.resp={}; desenharProt(); status('Natureza excluída');
  }
  var NOVA={aberta:false,erro:''};
  function desenharNova(n){
    if(!NOVA.aberta){ n.appendChild(el('button',{class:'btn dash sm',style:'margin-top:8px',text:'+ Nova natureza',onclick:function(){ NOVA.aberta=true; NOVA.erro=''; desenharNats(); var x=$('novaNat'); if(x) x.focus(); }})); return; }
    var inp=el('input',{type:'text',id:'novaNat',placeholder:'Nome da natureza','aria-label':'Nome da nova natureza',onkeydown:function(e){ if(e.key==='Enter') ok(); if(e.key==='Escape'){ NOVA.aberta=false; desenharNats(); } }});
    var ok=function(){ var r=criarNatureza(inp.value); if(r){ NOVA.erro=r; desenharNats(); var x=$('novaNat'); if(x){ x.value=inp.value; x.focus(); } } else NOVA.aberta=false; };
    n.appendChild(el('div',{class:'novaNat'},[inp,el('div',{class:'row'},[el('button',{class:'btn sm ok',text:'Criar',onclick:ok}),el('button',{class:'btn sm',text:'Cancelar',onclick:function(){ NOVA.aberta=false; desenharNats(); }})]),NOVA.erro?el('div',{class:'msg err',text:NOVA.erro}):null]));
  }
  /* ---------- exportar e importar (.zip) ---------- */
  var IMP=null;
  function arquivoProtocolo(n){ var lay=layoutDe(n.id),o={natureza:{id:n.id,nome:n.nome},itens:DB.protocolos[n.id]||[],notas:(typeof NOTAS_PROTOCOLOS!=='undefined'&&NOTAS_PROTOCOLOS[n.id])||[]}; if(Object.keys(lay).length) o.layout=lay; return JSON.stringify(o,null,1)+'\n'; }
  function exportarZip(){
    var z={},d=new Date(),dd=function(x){ return ('0'+x).slice(-2); },carimbo=d.getFullYear()+'-'+dd(d.getMonth()+1)+'-'+dd(d.getDate())+'-'+dd(d.getHours())+'h'+dd(d.getMinutes()),alt=alteradas();
    z['naturezas.json']=(JSON.stringify(NATUREZAS,null,1)+'\n');
    NATUREZAS.forEach(function(n){ z['protocolos/'+n.id+'.json']=arquivoProtocolo(n); });
    z['blocos.json']=JSON.stringify(BLOCOS,null,1)+'\n';
    BLOCOS.forEach(function(b){ var k='bloco:'+b.id,lay=layoutDe(k),o={bloco:{id:b.id,nome:b.nome},itens:DB.protocolos[k]||[]}; if(Object.keys(lay).length) o.layout=lay; z['blocos/'+b.id+'.json']=JSON.stringify(o,null,1)+'\n'; });
    if(DB.feedbacks.length) z['feedback.json']=JSON.stringify(DB.feedbacks,null,1)+'\n';
    z['LEIA-ME.txt']=('Protocolos do protótipo Hefesto, exportados em '+d.toLocaleString('pt-BR')+'.\n\nPara continuar em outro navegador: aba Protocolos, Importar, escolha este arquivo.\nPara publicar: envie este arquivo para quem cuida do repositório.\n\nNaturezas alteradas em relação à versão publicada ('+alt.length+'):\n'+(alt.map(function(n){ return '- '+n.nome; }).join('\n')||'(nenhuma)')+'\n'+(listaAlterada()?'\nA lista de naturezas também foi alterada (naturezas criadas, renomeadas ou excluídas).\n':''));
    (function(b){
      var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='hefesto-protocolos-'+carimbo+'.zip'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1000);
      DB.ultimaExportacao=Date.now(); salvar(); status('Arquivo exportado: '+a.download); desenharNats();
    })(new Blob([zipCriar(z,d)],{type:'application/zip'}));
  }
  function lerArquivo(f){
    IMP=null;
    var fim=function(mapa,natsZip,lays){ /* mapa: {idNatureza: itens}; natsZip: lista de naturezas do arquivo, se houver */
      var linhas=[],nz={}; (natsZip||[]).forEach(function(n){ nz[n.id]=n; });
      Object.keys(mapa).forEach(function(id){
        var n=porChave(id),itens=mapa[id],z=nz[id];
        if(!n&&!z){ linhas.push({id:id,nome:id,sit:'desconhecida'}); return; }
        if(!Array.isArray(itens)){ linhas.push({id:id,nome:(n||z).nome,sit:'inválida'}); return; }
        var nova=!n,renome=n&&z&&z.nome!==n.nome,igual=!nova&&impr(itens)===impr(DB.protocolos[id]);
        linhas.push({id:id,nome:z?z.nome:n.nome,antigo:renome?n.nome:'',nova:nova,nat:z||n,sit:igual&&!renome?'igual':'muda',itens:itens,antes:nova?0:(DB.protocolos[id]||[]).length,erros:0});
      });
      var fora=NATUREZAS.filter(function(n){ return natsZip&&!nz[n.id]; });
      /* erros conferidos com a biblioteca de blocos que ficaria depois de importar */
      var blocosZ={}; linhas.forEach(function(l){ if(ehBloco(l.id)&&l.itens) blocosZ[l.id.slice(6)]={nome:l.nome,itens:l.itens}; });
      var getZ=function(b){ return blocosZ[b]||getBloco(b); };
      linhas.forEach(function(l){ if(l.itens&&l.itens.length) l.erros=(ehBloco(l.id)?validarBloco(l.itens,getZ,l.id.slice(6)):validar(expandir(l.itens,getZ))).erros.length; });
      IMP={nome:f.name,linhas:linhas,fora:fora,lays:lays||{}}; desenharNats();
    };
    var erro=function(e){ IMP={nome:f.name,erro:String(e&&e.message||e)}; desenharNats(); };
    if(/\.json$/i.test(f.name)){ f.text().then(function(t){ var o=JSON.parse(t); if(o&&o.itens&&o.natureza) { var m={}; m[o.natureza.id]=o.itens; fim(m); } else fim(o); }).catch(erro); return; }
    f.arrayBuffer().then(zipLer).then(function(z){
      var arqs=Object.keys(z).filter(function(k){ return /(^|\/)protocolos\/[a-z0-9_]+\.json$/.test(k); });
      if(!arqs.length) throw new Error('o arquivo não tem a pasta protocolos/. Use um zip exportado pelo site.');
      var m={},lays={}; arqs.forEach(function(k){ var o=JSON.parse(z[k]),id=k.replace(/^.*\//,'').replace(/\.json$/,''); m[id]=o.itens; if(o.layout) lays[id]=o.layout; });
      Object.keys(z).filter(function(k){ return /(^|\/)blocos\/[a-z0-9_]+\.json$/.test(k); }).forEach(function(k){ var o=JSON.parse(z[k]),id='bloco:'+k.replace(/^.*\//,'').replace(/\.json$/,''); m[id]=o.itens; if(o.layout) lays[id]=o.layout; });
      var nk=Object.keys(z).filter(function(k){ return /(^|\/)naturezas\.json$/.test(k); })[0],bk=Object.keys(z).filter(function(k){ return /(^|\/)blocos\.json$/.test(k); })[0];
      var lista=nk?JSON.parse(z[nk]):null; if(lista&&bk) lista=lista.concat(JSON.parse(z[bk]).map(function(b){ return {id:'bloco:'+b.id,nome:b.nome}; }));
      fim(m,lista,lays);
    }).catch(erro);
  }
  function desenharArquivo(n){
    var alt=alteradas(),la=listaAlterada();
    n.appendChild(el('h2',{text:'Arquivo'}));
    n.appendChild(el('p',{class:'muted',text:alt.length||la?(alt.length?alt.length+' entrevista'+(alt.length>1?'s alteradas':' alterada'):'')+(alt.length&&la?' e ':'')+(la?'lista de naturezas alterada':'')+' neste navegador.'+(DB.ultimaExportacao?' Última exportação: '+new Date(DB.ultimaExportacao).toLocaleString('pt-BR')+'.':' Ainda não exportado.'):'Nenhuma alteração em relação à versão publicada.'}));
    var inp=el('input',{type:'file',accept:'.zip,.json',style:'display:none',onchange:function(e){ if(e.target.files[0]) lerArquivo(e.target.files[0]); e.target.value=''; }});
    n.appendChild(el('div',{class:'row',style:'margin-top:4px'},[
      el('button',{class:'btn sm '+(alt.length||la?'ok':''),text:'Exportar (.zip)',onclick:exportarZip}),
      el('button',{class:'btn sm',text:'Importar',onclick:function(){ inp.click(); }}),inp]));
    if(DB.feedbacks.length) n.appendChild(el('details',{class:'fbLista'},[el('summary',{text:'Feedbacks guardados neste navegador ('+DB.feedbacks.length+')'}),el('ul',{},DB.feedbacks.slice().reverse().map(function(f){ return el('li',{},[el('b',{text:f.tipo+': '}),f.texto,f.contexto?el('span',{class:'muted',text:' ('+[f.contexto.aba,f.contexto.natureza,f.contexto.item].filter(Boolean).join(' · ')+')'}):null]); })),el('span',{class:'apoio',text:'Vão no zip exportado (feedback.json).'})]));
    n.appendChild(el('p',{class:'muted',style:'margin-top:6px',text:'O que você edita fica só neste navegador. Exporte para levar a outro computador ou para enviar as correções para publicação.'}));
    if(!IMP) return;
    var box=el('div',{class:'impArq',role:'status'});
    if(IMP.erro){ box.appendChild(el('div',{class:'msg err',text:'Não consegui ler '+IMP.nome+': '+IMP.erro})); box.appendChild(el('button',{class:'btn sm',text:'Fechar',onclick:function(){ IMP=null; desenharNats(); }})); n.appendChild(box); return; }
    var muda=IMP.linhas.filter(function(l){ return l.sit==='muda'; }),outras=IMP.linhas.filter(function(l){ return l.sit==='desconhecida'||l.sit==='inválida'; });
    box.appendChild(el('b',{text:IMP.nome}));
    box.appendChild(el('div',{class:'muted',text:muda.length?muda.length+' natureza'+(muda.length>1?'s':'')+' diferente'+(muda.length>1?'s':'')+' do que está neste navegador:':'Tudo igual ao que está neste navegador.'}));
    if(muda.length) box.appendChild(el('ul',{},muda.map(function(l){ return el('li',{},[l.nova?el('b',{text:'Nova: '}):null,l.nome+(l.antigo?' (antes “'+l.antigo+'”)':'')+' ('+l.antes+' → '+l.itens.length+' itens)',!l.nova&&alterada(l.id)&&impr(l.itens)!==impr(DB.protocolos[l.id])?el('b',{class:'aviso',text:' · substitui sua edição'}):null,l.erros?el('span',{class:'aviso',text:' · com erros'}):null]); })));
    if(IMP.fora&&IMP.fora.length) box.appendChild(el('div',{class:'muted',text:IMP.fora.length+' natureza'+(IMP.fora.length>1?'s existem':' existe')+' aqui e não no arquivo; '+(IMP.fora.length>1?'ficam':'fica')+' como '+(IMP.fora.length>1?'estão':'está')+': '+IMP.fora.map(function(n){ return n.nome; }).join(', ')+'.'}));
    if(outras.length) box.appendChild(el('div',{class:'msg inf',text:'Ignoradas, porque a natureza não existe neste site: '+outras.map(function(l){ return l.nome; }).join(', ')+'.'}));
    box.appendChild(el('div',{class:'row',style:'margin-top:6px'},[
      muda.length?el('button',{class:'btn sm ok',text:'Aplicar',onclick:function(){ muda.forEach(function(l){
        if(ehBloco(l.id)){ var bid=l.id.slice(6); if(l.nova) BLOCOS.push({id:bid,nome:l.nome}); else if(l.antigo){ blocoPorId(bid).nome=l.nome; chaves().forEach(function(k){ (DB.protocolos[k]||[]).forEach(function(x){ if(x.tipo==='bloco'&&x.bloco===bid) x.texto=l.nome; }); }); } DB.protocolos[l.id]=l.itens; return; }
        if(l.nova){ if(!nomeLivre(l.nome)) l.nat=Object.assign({},l.nat,{nome:l.nome+' (importada)'}); NATUREZAS.push({id:l.id,nome:l.nat.nome,fonte:l.nat.fonte||'criada no site'}); } else if(l.antigo){ trocarNomeEmTrocas(l.antigo,l.nome); natPorId(l.id).nome=l.nome; } DB.protocolos[l.id]=l.itens; });
      Object.keys(IMP.lays||{}).forEach(function(id){ if(porChave(id)) DB.layout[id]=IMP.lays[id]; }); ordenarNats(); BLOCOS.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); }); IMP=null; salvar(); S.resp={}; status(muda.length+' natureza'+(muda.length>1?'s importadas':' importada')); desenharProt(); }}):null,
      el('button',{class:'btn sm',text:muda.length?'Cancelar':'Fechar',onclick:function(){ IMP=null; desenharNats(); }})]));
    n.appendChild(box);
  }
  function desenharProt(){ desenharNats(); desenharEditor(); desenharLado(); }
  /* ---------- editor visual ---------- */
  function seletorDestino(valor,proprio,padrao,aria,aoMudar){
    var ops=[el('option',{value:'',text:padrao,selected:valor===''})];
    S.itens.forEach(function(x){ if(x.id!==proprio) ops.push(el('option',{value:x.id,text:'→ '+x.id,selected:valor===x.id})); });
    if(ehBloco(S.nat)) ops.push(el('option',{value:'SAIDA',text:'↩ Saída do bloco',selected:valor==='SAIDA'}));
    ops.push(el('option',{value:'FIM',text:'■ Fechamento',selected:valor==='FIM'}));
    return el('select',{'aria-label':aria,onchange:function(e){ aoMudar(e.target.value); mudou(false); }},ops);
  }
  function desenharItem(it,i){
    var box=el('div',{class:'item '+it.tipo});
    box.appendChild(el('div',{class:'row'},[
      el('input',{type:'text',class:'id',value:it.id,'aria-label':'Identificador',onchange:function(e){ var novo=slug(e.target.value); var u=usados(S.itens); delete u[it.id]; novo=idLivre(novo,u); renomear(S.itens,it.id,novo); it.id=novo; mudou(true); }}),
      el('select',{'aria-label':'Tipo do item '+it.id,onchange:function(e){ it.tipo=e.target.value; if(it.tipo==='bloco'&&!it.bloco){ var b0=BLOCOS.filter(function(b){ return 'bloco:'+b.id!==S.nat; })[0]; it.bloco=b0?b0.id:''; it.texto=b0?b0.nome:''; } if(temOpcoes(it)&&it.opcoes.length<2) it.opcoes=[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; if(it.tipo==='diagrama'&&!it.mermaid) it.mermaid='flowchart LR\n  A[Chama amarela] --> B[Combustível comum]\n  C[Chama azul] --> D[Gás: não usar água]'; mudou(true); }},TIPOS.map(function(t){ return el('option',{value:t[0],text:t[1],selected:t[0]===it.tipo}); })),
      el('span',{class:'grow'}),
      el('button',{class:'btn ic','aria-label':'Mover para cima',text:'↑',onclick:function(){ if(i>0){ var x=S.itens[i]; S.itens[i]=S.itens[i-1]; S.itens[i-1]=x; mudou(true); } }}),
      el('button',{class:'btn ic','aria-label':'Mover para baixo',text:'↓',onclick:function(){ if(i<S.itens.length-1){ var x=S.itens[i]; S.itens[i]=S.itens[i+1]; S.itens[i+1]=x; mudou(true); } }}),
      el('button',{class:'btn ic del','aria-label':'Excluir '+it.id,text:'✕',onclick:function(){ S.itens.splice(i,1); mudou(true); }})]));
    if(it.tipo==='bloco'){ var opsB=BLOCOS.filter(function(b){ return 'bloco:'+b.id!==S.nat; }); box.appendChild(el('div',{class:'row',style:'margin-top:8px'},[el('span',{class:'lbl',text:'Bloco:'}),el('select',{class:'grow','aria-label':'Bloco usado',onchange:function(e){ it.bloco=e.target.value; var b=blocoPorId(it.bloco); it.texto=b?b.nome:''; mudou(true); }},(blocoPorId(it.bloco)?[]:[el('option',{value:it.bloco||'',text:'(escolha um bloco)',selected:true})]).concat(opsB.map(function(b){ return el('option',{value:b.id,text:b.nome,selected:b.id===it.bloco}); }))),blocoPorId(it.bloco)?el('button',{class:'btn sm',text:'Abrir bloco',onclick:function(){ S.nat='bloco:'+it.bloco; desenharProt(); }}):null])); }
    else if(it.tipo==='troca'){ var tem=natPorNome(it.texto); box.appendChild(el('div',{class:'row',style:'margin-top:8px'},[el('span',{class:'lbl',text:'Trocar para:'}),el('select',{class:'grow','aria-label':'Natureza de destino da troca',onchange:function(e){ it.texto=e.target.value; mudou(true); }},(tem?[]:[el('option',{value:it.texto,text:(it.texto||'(escolha)')+' · não existe na lista',selected:true})]).concat(NATUREZAS.map(function(x){ return el('option',{value:x.nome,text:x.nome,selected:tem===x}); })))])); if(!tem&&it.texto) box.appendChild(el('div',{class:'apoio',text:'Escolha uma natureza da lista ou crie uma nova com esse nome.'})); }
    else box.appendChild(el('div',{class:'row',style:'margin-top:8px'},[el('input',{type:'text',class:'grow',value:it.texto,placeholder:it.tipo==='diagrama'?'Título do fluxograma':'Texto','aria-label':'Texto de '+it.id,oninput:function(e){ it.texto=e.target.value; mudou(false); }})]));
    if(it.tipo==='diagrama'){ var ta=el('textarea',{class:'code',style:'min-height:110px;margin-top:8px','aria-label':'Código Mermaid do fluxograma de consulta',spellcheck:'false'}); ta.value=it.mermaid||''; ta.addEventListener('input',function(){ it.mermaid=ta.value; mudou(false); }); box.appendChild(ta); }
    var linha=el('div',{class:'row',style:'margin-top:8px'});
    if(ehPergunta(it)) linha.appendChild(el('label',{class:'row',style:'gap:6px'},[el('input',{type:'checkbox',checked:!!it.obrig,onchange:function(e){ it.obrig=e.target.checked; mudou(false); }}),'Obrigatória']));
    if(it.tipo==='numero'||it.tipo==='texto'||it.tipo==='instrucao') linha.appendChild(el('label',{class:'row',style:'gap:6px',title:'Se desmarcado, a resposta ou a orientação não aparece no relato final'},[el('input',{type:'checkbox',checked:it.relato!==false,onchange:function(e){ if(e.target.checked) delete it.relato; else it.relato=false; mudou(false); }}),'No relato']));
    if(temOpcoes(it)) linha.appendChild(el('label',{class:'row',style:'gap:6px'},[el('input',{type:'checkbox',checked:!!it.outro,onchange:function(e){ it.outro=e.target.checked; mudou(false); }}),'Incluir “Outro”']));
    linha.appendChild(el('span',{class:'lbl',text:it.tipo==='multipla'?'Depois dos desvios:':temOpcoes(it)?'Depois (padrão):':'Depois:'}));
    linha.appendChild(seletorDestino(it.prox,it.id,'próximo da lista','Depois de '+it.id,function(v){ it.prox=v; }));
    box.appendChild(linha);
    if(temOpcoes(it)){
      var opts=el('div',{class:'opts'});
      it.opcoes.forEach(function(o,j){
        opts.appendChild(el('div',{class:'row'},[
          el('input',{type:'text',class:'id',style:'width:110px',value:o.id,'aria-label':'Identificador da opção',onchange:function(e){ var u={}; it.opcoes.forEach(function(x){ if(x!==o) u[x.id]=1; }); o.id=idLivre(e.target.value,u); mudou(true); }}),
          el('input',{type:'text',class:'grow',value:o.rotulo,'aria-label':'Rótulo da opção '+o.id,oninput:function(e){ o.rotulo=e.target.value; mudou(false); }}),
          el('button',{class:'relTg'+(o.relato===false?' off':''),'aria-pressed':o.relato===false?'false':'true',title:o.relato===false?'Esta resposta não aparece no relato final. Clique para incluir.':'Esta resposta aparece no relato final. Clique para tirar.',onclick:function(){ if(o.relato===false) delete o.relato; else o.relato=false; mudou(true); }},[o.relato===false?'fora do relato':'no relato']),
          seletorDestino(o.vai,it.id,it.tipo==='multipla'?'sem desvio':'segue o padrão','Destino da opção '+o.id,function(v){ o.vai=v; }),
          el('button',{class:'btn ic del','aria-label':'Remover opção '+o.id,text:'✕',onclick:function(){ it.opcoes.splice(j,1); mudou(true); }})]));
      });
      opts.appendChild(el('div',{},[el('button',{class:'btn dash sm',text:'+ Opção',onclick:function(){ var u={}; it.opcoes.forEach(function(x){u[x.id]=1;}); it.opcoes.push(O(idLivre('opcao',u),'Nova opção')); mudou(true); }})]));
      box.appendChild(opts);
    }
    return box;
  }
  function desenharEditor(){
    var ed=$('pEditor'); ed.textContent='';
    desenharEditorTopo(ed);
    S.itens.forEach(function(it,i){ ed.appendChild(desenharItem(it,i)); });
    ed.appendChild(el('div',{class:'row',style:'margin-top:10px'},TIPOS.filter(function(t){return ['unica','instrucao','informacao','diagrama'].indexOf(t[0])>=0||(t[0]==='bloco'&&BLOCOS.some(function(b){ return 'bloco:'+b.id!==S.nat; }));}).map(function(t){
      return el('button',{class:'btn dash sm',text:'+ '+({unica:'Pergunta',instrucao:'Instrução',informacao:'Informação',diagrama:'Fluxograma',bloco:'Bloco'})[t[0]],onclick:function(){ var id=idLivre(t[0]==='unica'?'pergunta':t[0],usados(S.itens)); var it=I(id,t[0],t[0]==='unica'?'Nova pergunta':t[0]==='diagrama'?'Fluxograma de consulta':'Novo texto'); if(t[0]==='bloco'){ var b0=BLOCOS.filter(function(b){ return 'bloco:'+b.id!==S.nat; })[0]; it.bloco=b0.id; it.texto=b0.nome; } if(t[0]==='unica') it.opcoes=[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; if(t[0]==='diagrama') it.mermaid='flowchart LR\n  A[Chama amarela] --> B[Combustível comum]\n  C[Chama azul] --> D[Gás: não usar água]'; S.itens.push(it); mudou(true); }}); })));
  }

  /* ---------- validação ---------- */
  function blocoProcesso(lista,curto){
    if(!lista.length) return null;
    var altos=lista.filter(function(x){ return x.nivel==='alto'; }).length;
    var box=el('details',{class:'proc'+(altos?' alto':''),open:altos?true:null},[el('summary',{},[el('b',{text:'Processo de emergência: '}),altos?altos+' caminho'+(altos>1?'s':'')+' sem despacho':'',altos&&lista.length>altos?' · ':'',lista.length>altos?(lista.length-altos)+' ponto'+(lista.length-altos>1?'s':'')+' de atenção':''])]);
    lista.forEach(function(x){
      var li=el('div',{class:'procItem '+x.nivel},[el('span',{class:'procTag',text:x.nivel==='alto'?'Sem despacho':x.nivel==='atencao'?'Atenção':'Informação'}),el('div',{text:x.msg})]);
      if(x.caminho&&!curto) li.appendChild(el('ol',{class:'procCam'},x.caminho.map(function(c){ return el('li',{text:c}); })));
      box.appendChild(li);
    });
    return box;
  }
  function desenharValidacao(v,proc){
    var d=$('pValid'); d.textContent='';
    var bp=blocoProcesso(proc||[]); if(bp) d.appendChild(bp);
    var bloco=function(cls,titulo,lista){ if(lista.length) d.appendChild(el('div',{class:'msg '+cls,role:cls==='err'?'alert':'status'},[el('b',{text:titulo}),el('ul',{},lista.slice(0,6).map(function(x){ return el('li',{text:x}); }))])); };
    bloco('err','Erros (a entrevista não aparece no atendimento até corrigir)',v.erros); bloco('inf','Avisos',v.avisos);
    if(!v.erros.length&&!v.avisos.length) d.appendChild(el('div',{class:'msg okm',role:'status',text:'Formulário e fluxo conferem: '+S.itens.length+' itens, sem erros.'}));
  }
  /* ---------- diagrama ---------- */
  var mmdN=0;
  function desenhar(code,alvo){
    alvo.textContent='';
    if(!window.mermaid){ alvo.appendChild(el('span',{class:'muted',text:'O desenho não carregou neste navegador; o código continua válido.'})); return; }
    try{ mmdN++; window.mermaid.render('mmd'+mmdN,code).then(function(r){ alvo.innerHTML=r.svg; }).catch(function(e){ alvo.textContent=''; alvo.appendChild(el('span',{class:'msg err',text:'O Mermaid não conseguiu desenhar: '+String(e&&e.message||e).split('\n')[0]})); }); }catch(e){ alvo.appendChild(el('span',{class:'muted',text:'Diagrama indisponível.'})); }
  }
  /* ---------- testar ---------- */
  function painelTeste(p,v){
    if(v.erros.length){ p.appendChild(el('div',{class:'muted',style:'margin-top:8px',text:'Corrija os erros acima para testar.'})); return; }
    var lista=ehBloco(S.nat)?expandir([I('b','bloco','',{bloco:S.nat.slice(6),prox:'FIM'})],getBloco):expandir(S.itens,getBloco);
    var est=caminhar(lista,S.resp),g=grafo(lista),it=est.pendente?g.item[est.pendente]:null;
    p.appendChild(el('div',{class:'row',style:'justify-content:space-between'},[el('span',{class:'muted',text:'Percorrer o fluxo, um item por vez'+(it?' · item “'+it.id+'”':'')}),el('button',{class:'btn sm',text:'Recomeçar',onclick:function(){ S.resp={}; desenharLado(); }})]));
    var responder=function(r){ S.resp[it.id]=r; desenharLado(); };
    if(!it) p.appendChild(el('div',{class:'msg okm',style:'font-size:16px;font-weight:700',text:'Entrevista concluída. Segue para o fechamento.'}));
    else if(it.tipo==='instrucao'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Diga ao solicitante'})); p.appendChild(el('div',{class:'instr',text:it.texto})); p.appendChild(el('button',{class:'btn ok',text:'✓ Dito, continuar',onclick:function(){ responder(true); }})); }
    else if(it.tipo==='informacao'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Informação para você (não ler ao solicitante)'})); p.appendChild(el('div',{class:'info',text:it.texto})); p.appendChild(el('button',{class:'btn pri',text:'Ciente, continuar',onclick:function(){ responder(true); }})); }
    else if(it.tipo==='troca'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Troca de natureza'})); p.appendChild(el('div',{class:'info',text:'No atendimento, o atendente pode trocar a natureza para: '+it.texto+'. A entrevista recomeça com o protocolo dela.'})); p.appendChild(el('button',{class:'btn pri',text:'Ciente, continuar',onclick:function(){ responder(true); }})); }
    else if(it.tipo==='diagrama'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Fluxograma de consulta'})); p.appendChild(el('div',{style:'font-weight:700;font-size:17px;margin:4px 0',text:it.texto})); var d=el('div',{class:'diag'}); p.appendChild(d); desenhar(it.mermaid,d); p.appendChild(el('button',{class:'btn pri',style:'margin-top:10px',text:'Ciente, continuar',onclick:function(){ responder(true); }})); }
    else {
      p.appendChild(el('div',{class:'q',text:it.texto+(it.obrig?' *':'')}));
      var a=el('div',{class:'ans'});
      if(it.tipo==='unica'){ it.opcoes.forEach(function(o){ a.appendChild(el('button',{class:'op',text:o.rotulo,onclick:function(){ responder({ops:[o.id]}); }})); }); if(it.outro){ var ou=el('input',{type:'text',placeholder:'Outra resposta','aria-label':'Outra resposta'}); a.appendChild(ou); a.appendChild(el('button',{class:'btn',text:'Confirmar outra resposta',onclick:function(){ if(ou.value.trim()) responder({ops:[],outro:ou.value.trim()}); }})); } }
      else if(it.tipo==='lista'){ var s=el('select',{'aria-label':it.texto},[el('option',{value:'',text:'Selecione…'})].concat(it.opcoes.map(function(o){ return el('option',{value:o.id,text:o.rotulo}); }))); a.appendChild(s); a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ if(s.value) responder({ops:[s.value]}); }})); }
      else if(it.tipo==='multipla'){
        var cs=it.opcoes.map(function(o){ var c=el('input',{type:'checkbox',value:o.id}); a.appendChild(el('label',{},[c,o.rotulo])); return c; });
        var out=null; if(it.outro){ out=el('input',{type:'text',placeholder:'Outro: descreva','aria-label':'Outro'}); a.appendChild(out); }
        a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ var m=cs.filter(function(c){return c.checked;}).map(function(c){return c.value;}); var t=out?out.value.trim():''; if(m.length||t) responder({ops:m,outro:t,feito:true}); }}));
      } else { var inp=el('input',{type:'text',inputmode:it.tipo==='numero'?'numeric':'text',placeholder:it.tipo==='numero'?'0':'Digite a resposta','aria-label':it.texto}); a.appendChild(inp); a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ var x=inp.value.trim(); if(x&&(it.tipo!=='numero'||/^\d+$/.test(x))) responder({valor:x}); }})); }
      p.appendChild(a);
      if(!it.obrig) p.appendChild(el('button',{class:'btn sm',style:'margin-top:8px',text:'Pular (não obrigatória)',onclick:function(){ responder({pulada:true,ops:[]}); }}));
    }
    var feitos=est.path.filter(function(id){ return respondido(g.item[id],S.resp[id]); });
    if(feitos.length){
      var h=el('ul',{class:'hist','aria-label':'Caminho percorrido'});
      feitos.forEach(function(id){ var x=g.item[id],r=S.resp[id],val;
        if(!ehPergunta(x)) val=x.tipo==='instrucao'?'dito':x.tipo==='troca'?'natureza mantida':'ciente'; else if(r.pulada) val='pulada'; else if(temOpcoes(x)) val=x.opcoes.filter(function(o){return r.ops.indexOf(o.id)>=0;}).map(function(o){return o.rotulo;}).concat(r.outro?[r.outro]:[]).join(', '); else val=r.valor;
        h.appendChild(el('li',{},[el('code',{text:id}),' '+(x.texto||'')+' ',el('b',{text:'→ '+val})])); });
      p.appendChild(h);
    }
  }
  /* ---------- fluxo (mermaid) ---------- */
  var LEGENDA=[['titulo','#af7e04','#fff','Natureza (início)','inicio(["Natureza: Nome"]):::titulo'],['perg','#ffffff','#1a1a1a','Pergunta','id["Texto da pergunta?"]:::perg'],['opc','#fff6b6','#1a1a1a','Resposta que vai para o relato','id__sim("Sim"):::opc'],['ns','#dedaff','#1a1a1a','Resposta fora do relato','id__nao("Não"):::ns'],['ab','#ff6464','#1a1a1a','Resposta aberta (texto livre)','id__outro("Aberta"):::ab'],['desp','#ffc6c6','#1a1a1a','Despacho imediato: encaminha e diz a fala','despacho["Fala: O socorro já foi acionado..."]:::desp'],['orient','#ffdc4a','#1a1a1a','Orientação ao solicitante','id("Afaste-se do local."):::orient'],['acao','#ffffff','#1a1a1a','Informação ao atendente','id["Acionar PMDF"]:::acao'],['video','#2dc75c','#1a1a1a','Videochamada','id>"Realize a videochamada"]:::video'],['troca','#8f7fee','#fff','Trocar natureza','id{{"Trocar natureza: Nome"}}:::troca'],['bloco','#e3f2fd','#1a1a1a','Bloco reutilizável (escolha o bloco no editor)','id[["🧩 Bloco: Nome"]]:::bloco'],['relato','#adf0c7','#1a1a1a','Relato final (fim)','fim(["Relato final"]):::relato']];
  function painelFluxo(p,v){
    if(ehBloco(S.nat)){ p.appendChild(el('button',{class:'btn ok grande',style:'margin-top:8px;width:100%',onclick:function(){ abrirDesenho(); }},['✏️ Abrir o editor visual do bloco'])); p.appendChild(el('p',{class:'muted',text:'Em blocos, edite pelo editor visual ou pelo editor de itens. O Mermaid desta aba vale para naturezas.'})); return; }
    var miro=S.notacao!=='compacta',nat=natPorId(S.nat);
    if(!S.fluxoSujo) S.fluxo=v.erros.length&&!S.fluxo?'':(miro?fluxoMiro(S.itens,nat.nome):fluxoMermaid(S.itens,false));
    p.appendChild(el('div',{class:'row'},[el('span',{class:'lbl',text:'Notação:'}),
      el('button',{class:'btn sm'+(miro?' pri':''),'aria-pressed':miro?'true':'false',text:'Padrão do Miro (cores)',onclick:function(){ S.notacao='miro'; S.fluxoSujo=false; S.msg=null; desenharLado(); }}),
      el('button',{class:'btn sm'+(!miro?' pri':''),'aria-pressed':!miro?'true':'false',text:'Compacta',onclick:function(){ S.notacao='compacta'; S.fluxoSujo=false; S.msg=null; desenharLado(); }})]));
    p.appendChild(el('button',{class:'btn ok grande',style:'margin-top:8px;width:100%',onclick:function(){ abrirDesenho(); }},['✏️ Abrir o editor visual (arrastar e ligar caixas)']));
    if(miro){
      p.appendChild(el('div',{class:'muted',style:'margin-top:6px',text:'Ou edite o código: desenhe como no quadro do Miro: cada caixa tem uma classe de cor, e as respostas são caixas ligadas à pergunta. A classe da resposta diz se ela vai para o relato. Identificadores novos criam itens; os existentes guardam o que o desenho não mostra (obrigatória, múltipla escolha, lista, número).'}));
      p.appendChild(el('details',{class:'legenda'},[el('summary',{text:'Legenda das classes'}),el('table',{},LEGENDA.map(function(x){ return el('tr',{},[el('td',{},[el('span',{class:'cor',style:'background:'+x[1]+';color:'+x[2],text:x[0]})]),el('td',{text:x[3]}),el('td',{},[el('code',{text:x[4]})])]); }))]));
    } else p.appendChild(el('div',{class:'muted',style:'margin-top:6px'},['Só a ordem e as ramificações, ligando identificadores do formulário. O texto da seta é o identificador da opção. Um identificador novo cria o item: use ',el('code',{text:'id{"pergunta"}'}),', ',el('code',{text:'id["instrução"]'}),' ou ',el('code',{text:'id("informação")'}),'.']));
    var ta=el('textarea',{class:'code','aria-label':'Fluxo em Mermaid',spellcheck:'false',style:'margin-top:8px;min-height:'+(miro?'300px':'220px')}); ta.value=S.fluxo;
    ta.addEventListener('input',function(){ S.fluxo=ta.value; S.fluxoSujo=true; });
    p.appendChild(ta);
    var diag=el('div',{class:'diag'});
    p.appendChild(el('div',{class:'row',style:'margin-top:8px'},[
      el('button',{class:'btn pri',text:'Aplicar fluxo',onclick:function(){
        if(miro){
          var m=aplicarFluxoMiro(S.itens,ta.value,NATUREZAS);
          if(!m.itens){ S.msg={t:'err',m:m.erros.join(' ')}; S.fluxo=ta.value; S.fluxoSujo=true; desenharLado(); return; }
          var vv=validar(m.itens);
          if(vv.erros.length){ S.msg={t:'err',m:'O desenho gera erros: '+vv.erros.slice(0,3).join(' ')+' Nada foi alterado.'}; S.fluxo=ta.value; S.fluxoSujo=true; desenharLado(); return; }
          if(m.removidos.length&&!confirm('Estes itens não estão no desenho e vão sair da entrevista: '+m.removidos.join(', ')+'. Continuar?')) return;
          S.itens=m.itens; S.msg={t:'okm',m:'Fluxo aplicado.'+(m.novos.length?' Criados: '+m.novos.join(', ')+'.':'')+(m.removidos.length?' Removidos: '+m.removidos.join(', ')+'.':'')+(m.avisos.length?' Atenção: '+m.avisos.slice(0,3).join(' '):'')}; mudou(true); return;
        }
        var r=aplicarFluxo(S.itens,ta.value);
        if(!r.itens||r.erros.length){ S.msg={t:'err',m:r.erros.slice(0,3).join(' ')}; S.fluxo=ta.value; S.fluxoSujo=true; desenharLado(); return; }
        S.itens=r.itens; S.msg={t:'okm',m:'Fluxo aplicado.'+(r.criados.length?' Criados no formulário: '+r.criados.join(', ')+'.':'')}; mudou(true); }}),
      el('button',{class:'btn',text:'Gerar do editor',onclick:function(){ S.fluxoSujo=false; S.msg=null; desenharLado(); }}),
      el('button',{class:'btn',text:'Ver rascunho',title:'Desenha o texto acima sem aplicar',onclick:function(){ desenhar(ta.value,diag); }}),
      el('button',{class:'btn',text:'Copiar',onclick:function(){ copiar(ta.value); }})]));
    if(S.msg) p.appendChild(el('div',{class:'msg '+S.msg.t,text:S.msg.m}));
    diag.className='diag ajusta'; diag.title='Clique para alternar entre caber na tela e tamanho real';
    diag.addEventListener('click',function(){ diag.classList.toggle('ajusta'); });
    p.appendChild(el('div',{class:'row',style:'margin-top:10px'},[el('span',{class:'muted grow',text:'Desenho (clique para ampliar ou reduzir):'}),el('button',{class:'btn sm',text:'Tela cheia',onclick:function(){ telaCheia(diag.innerHTML); }})]));
    p.appendChild(diag); if(!v.erros.length) desenhar(miro?fluxoMiro(S.itens,nat.nome):fluxoMermaid(S.itens,true),diag); else diag.appendChild(el('span',{class:'muted',text:'Corrija os erros para ver o desenho.'}));
  }
  function telaCheia(html){
    var h=el('div',{class:'cheia',role:'dialog','aria-label':'Desenho do fluxo'});
    var fechar=function(){ h.remove(); document.removeEventListener('keydown',esc,true); };
    var esc=function(e){ if(e.key==='Escape'){ e.stopPropagation(); fechar(); } };
    var area=el('div',{class:'cheiaArea'}); area.innerHTML=html;
    h.appendChild(el('div',{class:'row'},[el('b',{class:'grow',text:'Desenho do fluxo'}),el('button',{class:'btn sm',onclick:fechar},['Fechar ',el('kbd',{text:'Esc'})])]));
    h.appendChild(area); document.body.appendChild(h); document.addEventListener('keydown',esc,true);
  }
  /* ---------- formulário (json) ---------- */
  function painelForm(p){
    if(!S.formSujo) S.form=formJSON(S.itens);
    p.appendChild(el('div',{class:'muted',text:'Só os itens: tipo, texto, opções e obrigatoriedade. A ordem e as ramificações ficam no fluxo.'}));
    var ta=el('textarea',{class:'code','aria-label':'Formulário em JSON',spellcheck:'false',style:'margin-top:8px;min-height:340px'}); ta.value=S.form;
    ta.addEventListener('input',function(){ S.form=ta.value; S.formSujo=true; });
    p.appendChild(ta);
    p.appendChild(el('div',{class:'row',style:'margin-top:8px'},[
      el('button',{class:'btn pri',text:'Aplicar formulário',onclick:function(){ try{ S.itens=aplicarForm(S.itens,ta.value); S.msg={t:'okm',m:'Formulário aplicado. O fluxo foi mantido onde os identificadores continuam existindo.'}; mudou(true); }catch(e){ S.msg={t:'err',m:'JSON inválido: '+e.message}; S.form=ta.value; S.formSujo=true; desenharLado(); } }}),
      el('button',{class:'btn',text:'Gerar do editor',onclick:function(){ S.formSujo=false; S.msg=null; desenharLado(); }}),
      el('button',{class:'btn',text:'Copiar',onclick:function(){ copiar(ta.value); }})]));
    if(S.msg) p.appendChild(el('div',{class:'msg '+S.msg.t,text:S.msg.m}));
  }
  /* ---------- importar fluxograma do Miro ---------- */
  function painelImport(p){
    if(ehBloco(S.nat)){ p.appendChild(el('p',{class:'muted',text:'A importação do Miro vale para naturezas. Escolha uma natureza na coluna da esquerda.'})); return; }
    var I_=S.imp=S.imp||{src:'',ia:'',res:null,msg:null},nat=natPorId(S.nat);
    p.appendChild(el('div',{class:'muted',text:'Traga o fluxograma desenhado no Miro. Cole abaixo o código Mermaid do diagrama e escolha um caminho: a conversão automática monta um rascunho na hora; o prompt para IA pede a um assistente (Claude, ChatGPT ou outro) que interprete os textos e devolva a entrevista pronta para conferir. Nos dois casos nada muda até você clicar em “Usar”.'}));
    var src=el('textarea',{class:'code','aria-label':'Código Mermaid do Miro',spellcheck:'false',placeholder:'flowchart TD\n  A([Início]) --> B{Tem alguém preso?}\n  B -->|Sim| C[Não remova a vítima]\n  B -->|Não| D[...]',style:'margin-top:8px;min-height:160px'}); src.value=I_.src;
    src.addEventListener('input',function(){ I_.src=src.value; });
    p.appendChild(el('label',{class:'rot',style:'display:block;margin-top:10px',text:'1. Código Mermaid do Miro'})); p.appendChild(src);
    p.appendChild(el('div',{class:'row',style:'margin-top:8px'},[
      el('button',{class:'btn pri',text:'Converter automaticamente',onclick:function(){ var miro=ehConvencaoMiro(I_.src),r=miro?importarMiroHefesto(I_.src,NATUREZAS):importarMermaidLivre(I_.src); I_.res={origem:miro?'automática (convenção de cores do quadro)':'automática',itens:r.itens,notas:r.avisos}; I_.msg=null; desenharLado(); }}),
      el('button',{class:'btn',text:'Copiar prompt para IA',onclick:function(){ if(!I_.src.trim()){ I_.msg={t:'inf',m:'Cole primeiro o código do Miro: ele vai dentro do prompt.'}; desenharLado(); return; } copiar(promptMiro(nat.nome,I_.src)); I_.msg={t:'okm',m:'Prompt copiado. Cole no assistente de IA, depois traga a resposta para o campo 2.'}; desenharLado(); }})]));
    if(I_.msg) p.appendChild(el('div',{class:'msg '+I_.msg.t,text:I_.msg.m}));
    var ver=el('details',{style:'margin-top:8px'},[el('summary',{class:'muted',text:'Ver o prompt'}),el('textarea',{class:'code',readonly:true,'aria-label':'Prompt para IA',style:'min-height:200px;margin-top:6px',value:promptMiro(nat.nome,I_.src)})]);
    p.appendChild(ver);
    var ia=el('textarea',{class:'code','aria-label':'Resposta da IA',spellcheck:'false',placeholder:'{"itens":[...],"revisar":[...]}',style:'min-height:110px'}); ia.value=I_.ia;
    ia.addEventListener('input',function(){ I_.ia=ia.value; });
    p.appendChild(el('label',{class:'rot',style:'display:block;margin-top:12px',text:'2. Resposta da IA (opcional)'})); p.appendChild(ia);
    p.appendChild(el('div',{class:'row',style:'margin-top:8px'},[el('button',{class:'btn pri',text:'Conferir resposta da IA',onclick:function(){ try{ var r=lerRespostaIA(I_.ia); I_.res={origem:'da IA',itens:r.itens,notas:r.revisar}; I_.msg=null; }catch(e){ I_.res=null; I_.msg={t:'err',m:'Não consegui ler a resposta: '+e.message}; } desenharLado(); }})]));
    if(!I_.res) return;
    var R=I_.res,v=R.itens.length?validar(R.itens):{erros:['Nenhum item.'],avisos:[]};
    var box=el('div',{class:'impRes'});
    box.appendChild(el('h3',{text:'Rascunho '+R.origem+': '+R.itens.length+' itens'}));
    if(R.notas.length) box.appendChild(el('div',{class:'msg inf'},[el('b',{text:R.origem==='da IA'?'A IA pede para revisar':'Para revisar'}),el('ul',{},R.notas.map(function(x){ return el('li',{text:x}); }))]));
    if(v.erros.length) box.appendChild(el('div',{class:'msg err'},[el('b',{text:'Erros no rascunho (dá para usar e corrigir no editor)'}),el('ul',{},v.erros.map(function(x){ return el('li',{text:x}); }))]));
    if(v.avisos.length) box.appendChild(el('div',{class:'msg inf'},[el('b',{text:'Avisos da validação'}),el('ul',{},v.avisos.map(function(x){ return el('li',{text:x}); }))]));
    box.appendChild(el('ul',{class:'hist'},R.itens.map(function(it){ return el('li',{},[el('code',{text:it.id}),' ',el('span',{class:'tag',text:(TIPOS.filter(function(t){return t[0]===it.tipo;})[0]||[,it.tipo])[1]}),' '+it.texto+(temOpcoes(it)?' ('+it.opcoes.map(function(o){return o.rotulo;}).join(' / ')+')':'')]); })));
    var d=el('div',{class:'diag',style:'margin-top:8px'}); box.appendChild(d);
    if(!v.erros.length) desenhar(fluxoMermaid(R.itens,true),d); else d.appendChild(el('span',{class:'muted',text:'O desenho aparece quando não houver erros.'}));
    var q=S.itens.length;
    box.appendChild(el('div',{class:'row',style:'margin-top:10px'},[
      el('button',{class:'btn ok',text:'Usar em '+nat.nome,disabled:!R.itens.length,onclick:function(){ S.itens=JSON.parse(JSON.stringify(R.itens)); I_.res=null; S.aba='teste'; S.msg=null; mudou(true); status('Rascunho importado para '+nat.nome); }}),
      el('button',{class:'btn',text:'Descartar rascunho',onclick:function(){ I_.res=null; desenharLado(); }}),
      el('span',{class:'apoio',text:q?'Substitui os '+q+' itens atuais desta natureza.':'Esta natureza está sem entrevista.'})]));
    p.appendChild(box);
  }
  var MANUAL = '<div class="man">'
  + '<p><b>Neste protótipo:</b> escolha a natureza na coluna da esquerda. O que você editar vale na próxima ligação simulada na aba Atendimento, onde os itens aparecem juntos em uma página.</p>'
  + '<p>Uma entrevista tem duas partes. O <b>formulário</b> diz quais são os itens. O <b>fluxo</b> diz em que ordem eles aparecem e para onde cada resposta leva. O editor visual grava as duas.</p>'
  + '<h3>1. Monte em seis passos</h3><ol>'
  + '<li>Liste o que o atendente precisa perguntar e dizer naquela natureza.</li>'
  + '<li>Crie um item para cada coisa, com os botões <b>+ Pergunta</b>, <b>+ Instrução</b>, <b>+ Informação</b> e <b>+ Fluxograma</b>.</li>'
  + '<li>Dê a cada item um identificador curto, como <code>preso</code> ou <code>cor_chamas</code>. Use letras minúsculas, números e <code>_</code>.</li>'
  + '<li>Nas perguntas, escolha o tipo de resposta e escreva as opções.</li>'
  + '<li>Ligue os itens: em <b>Depois</b> e em cada opção, escolha o próximo item. O primeiro da lista inicia a entrevista.</li>'
  + '<li>Confira a faixa de validação e percorra a entrevista na aba <b>Testar</b>, respondendo de formas diferentes.</li></ol>'
  + '<h3>2. Tipos de item</h3><table><tr><th>Tipo</th><th>Quando usar</th></tr>'
  + '<tr><td>Escolha única</td><td>Poucas opções, só uma vale. Aparecem como botões.</td></tr>'
  + '<tr><td>Múltipla escolha</td><td>Mais de uma opção pode valer. Pode ter “Outro” com texto.</td></tr>'
  + '<tr><td>Lista de seleção</td><td>Muitas opções. É mais lenta de responder; prefira botões quando couber.</td></tr>'
  + '<tr><td>Número / Texto curto</td><td>Quantidades e respostas livres curtas.</td></tr>'
  + '<tr><td>Instrução ao solicitante</td><td>Texto que o atendente lê para quem ligou.</td></tr>'
  + '<tr><td>Informação ao atendente</td><td>Aviso só para o atendente. Não é lido ao solicitante.</td></tr>'
  + '<tr><td>Fluxograma de consulta</td><td>Um desenho de apoio, escrito em Mermaid, mostrado naquele ponto.</td></tr></table>'
  + '<h3>3. Como o fluxo anda</h3><ul>'
  + '<li><b>Depois:</b> para onde o item vai por padrão. “Próximo da lista” segue a ordem do editor.</li>'
  + '<li><b>Escolha única e lista:</b> a opção marcada decide o caminho. Opção sem destino próprio segue o padrão do item.</li>'
  + '<li><b>Múltipla escolha:</b> cada opção marcada abre um desvio, na ordem das opções. Cada desvio precisa voltar ao item indicado em “Depois dos desvios”.</li>'
  + '<li><b>Fechamento:</b> encerra a entrevista. Um caminho que chega ao fechamento dentro de um desvio encerra tudo.</li>'
  + '<li>O mesmo item pode ser destino de vários caminhos. Não é preciso copiar.</li></ul>'
  + '<h3>4. Editor visual</h3>'
  + '<p>O botão <b>✏️ Editor visual</b> (no topo da entrevista ou na aba Fluxo) abre o fluxo em tela cheia, com as cores do quadro do Miro. Arraste as caixas, puxe a seta do ponto ● de uma resposta até a caixa seguinte, crie caixas pela barra de cima e edite texto, tipo e respostas no painel da direita. O ponto embaixo da caixa é o caminho padrão. Ctrl+Z desfaz; Delete apaga a caixa selecionada e liga quem vinha antes ao que vinha depois. A posição das caixas vai junto no zip exportado.</p>'
  + '<h3>5. Blocos reutilizáveis</h3>'
  + '<p>Um bloco é um trecho de entrevista com nome, usado em várias naturezas (por exemplo, “Consciência e respiração da vítima”). Na natureza ele aparece como uma caixa azul; no atendimento, as perguntas dele entram no lugar. Corrigir o bloco corrige em todas as naturezas que o usam, e o cabeçalho do bloco mostra onde ele é usado.</p><ul>'
  + '<li>Dentro do bloco, <b>Saída do bloco</b> continua o fluxo de quem usa o bloco; <b>Fechamento</b> encerra a entrevista.</li>'
  + '<li>No editor visual, duplo clique na caixa do bloco abre o bloco; <b>‹ Voltar</b> retorna à natureza. <b>+ Bloco…</b> põe um bloco existente no fluxo.</li>'
  + '<li>Para criar um bloco a partir de um trecho: Shift+clique nas caixas e <b>Transformar em bloco</b>. O trecho precisa ter uma entrada e uma saída só (o fechamento pode aparecer à vontade).</li>'
  + '<li>Para trocar outras cópias do mesmo trecho pelo bloco: apague as caixas copiadas, ponha o bloco com <b>+ Bloco…</b> e ligue as setas.</li></ul>'
  + '<h3>6. Desenhar o fluxo em Mermaid</h3>'
  + '<p>Na aba <b>Fluxo</b>, a notação <b>Padrão do Miro</b> desenha a entrevista com as mesmas cores do quadro. Cada caixa tem uma classe, e as respostas são caixas ligadas à pergunta. Abra a <b>Legenda das classes</b> para ver todas.</p>'
  + '<pre>inicio(["Natureza: Vazamento de gás"]):::titulo --> tipo\ntipo["É botijão ou encanado?"]:::perg\ntipo --> tipo__botijao("Botijão"):::opc --> despacho\ntipo --> tipo__nao_sabe("Não sabe"):::ns --> despacho\ndespacho["Fala: O socorro já foi acionado."]:::desp --> afastar\nafastar("Saia do local e não acenda luz."):::orient --> fim(["Relato final"]):::relato</pre>'
  + '<ul><li>Resposta <code>:::opc</code> vai para o relato; <code>:::ns</code> não vai. <code>:::ab</code> é resposta aberta.</li>'
  + '<li>O nome da resposta é <code>pergunta__resposta</code>. Identificadores que já existem guardam o que o desenho não mostra: obrigatória, múltipla escolha, lista, número.</li>'
  + '<li>A caixa <code>:::desp</code> é o ponto do despacho imediato: no atendimento, o botão dela encaminha a ocorrência.</li>'
  + '<li><b>Ver rascunho</b> desenha sem aplicar. <b>Aplicar fluxo</b> confere tudo antes de mudar a entrevista.</li></ul>'
  + '<p>A notação <b>Compacta</b> continua disponível: cada linha é uma seta entre identificadores, e o texto da seta é a opção.</p>'
  + '<h3>7. Escrever o formulário em JSON</h3>'
  + '<p>Na aba <b>Formulário</b>, cada identificador tem tipo, texto e, nas perguntas com opções, a lista de opções.</p>'
  + '<pre>{\n  "preso": {\n    "tipo": "unica",\n    "texto": "Tem alguém preso?",\n    "obrigatoria": true,\n    "opcoes": [\n      { "id": "sim", "rotulo": "Sim" },\n      { "id": "nao", "rotulo": "Não" }\n    ]\n  },\n  "vitimas": { "tipo": "numero", "texto": "Quantas vítimas?" }\n}</pre>'
  + '<p>Tipos aceitos: <code>unica</code>, <code>multipla</code>, <code>lista</code>, <code>numero</code>, <code>texto</code>, <code>instrucao</code>, <code>informacao</code>, <code>diagrama</code>.</p>'
  + '<h3>8. Mensagens da validação</h3><table><tr><th>Mensagem</th><th>O que fazer</th></tr>'
  + '<tr><td>“aponta para …, que não existe”</td><td>O fluxo cita um identificador que não está no formulário. Crie o item ou corrija o nome.</td></tr>'
  + '<tr><td>“O fluxo tem um ciclo”</td><td>Algum caminho volta para um item anterior. Toda entrevista precisa chegar ao fechamento.</td></tr>'
  + '<tr><td>“nenhum caminho chega até ele”</td><td>O item existe, mas nada aponta para ele. Ligue-o a alguma opção ou exclua.</td></tr>'
  + '<tr><td>“o desvio não volta para …”</td><td>Em múltipla escolha, o ramo termina sem voltar ao tronco. Aponte o último item do ramo para o item de “Depois dos desvios”.</td></tr></table>'
  + '<h3>9. Relato final e despacho</h3><ul>'
  + '<li>Ao lado de cada resposta, o botão <b>no relato</b> / <b>fora do relato</b> diz se ela entra no texto do relato. Respostas que só descartam uma hipótese, como “Não” em “Há outras pessoas no local?”, ficam fora. Nas perguntas abertas e nas orientações, use a caixa <b>No relato</b>.</li>'
  + '<li>O encaminhamento ao despacho acontece no item de despacho imediato do fluxo. O atendente pode adiantar com <b>Adiantar despacho</b>, no topo da ligação.</li></ul>'
  + '<h3>10. Boas práticas</h3><ul>'
  + '<li>Pergunte primeiro o que muda o recurso enviado ou a instrução dada.</li>'
  + '<li>Uma pergunta por item, com texto curto, do jeito que o atendente fala.</li>'
  + '<li>Marque como obrigatória só a pergunta sem a qual não dá para registrar.</li>'
  + '<li>Inclua “Não sabe” quando o solicitante puder não ter a resposta.</li>'
  + '<li>O texto de instruções de primeiros socorros deve ser validado pela área técnica antes de publicar.</li></ul>'
  + '<h3>11. Trazer um fluxograma do Miro</h3>'
  + '<p>O fluxograma do Miro desenha caixas e setas; a entrevista precisa saber o que é pergunta, o que é dito ao solicitante e o que é só para o atendente. Na aba <b>Importar do Miro</b>:</p><ol>'
  + '<li>No Miro, copie o código Mermaid do diagrama e cole no campo 1.</li>'
  + '<li><b>Converter automaticamente</b> lê o desenho: losango e caixa com setas rotuladas viram pergunta, o texto da seta vira a opção, início e fim somem, ações como “Acionar viatura” viram informação ao atendente, laços são retirados.</li>'
  + '<li>Ou <b>Copiar prompt para IA</b>: cole num assistente de IA, que separa perguntas compostas, escolhe tipos e identificadores melhores e lista o que ficou em dúvida. Cole a resposta no campo 2 e clique em <b>Conferir</b>.</li>'
  + '<li>Leia a lista “Para revisar”, confira o desenho e clique em <b>Usar</b>. Depois ajuste no editor e teste.</li></ol>'
  + '<p>Não cole dados de ocorrências reais no assistente de IA. O fluxograma de protocolo não tem dados pessoais, mas confira antes.</p>'
  + '</div>';
  function desenharLado(){
    Array.prototype.forEach.call(document.querySelectorAll('#pTabs button'),function(b){ var on=b.getAttribute('data-tab')===S.aba; b.className=on?'on':''; b.setAttribute('aria-selected',on?'true':'false'); });
    var p=$('pPanel'); p.textContent='';
    if(!S.itens.length&&S.aba!=='manual'&&S.aba!=='fluxo'&&S.aba!=='form'&&S.aba!=='importar'){ $('pValid').textContent=''; p.appendChild(el('div',{class:'muted',text:'Sem itens para testar. Crie o primeiro item no editor, ou escreva o fluxo na aba Fluxo.'})); return; }
    var v=S.itens.length?validarAlvo(S.itens,S.nat):{erros:[],avisos:[]}; if(S.itens.length) desenharValidacao(v,processoDe(S.nat,S.itens)); else $('pValid').textContent='';
    if(S.aba==='teste') painelTeste(p,v); else if(S.aba==='fluxo') painelFluxo(p,v); else if(S.aba==='manual') p.innerHTML=MANUAL; else if(S.aba==='importar') painelImport(p); else painelForm(p);
  }
  function desenharEditorTopo(ed){
    if(ehBloco(S.nat)){
      var bl=porChave(S.nat),exb=exemplos()[S.nat],us=usosBloco(bl.bloco.id);
      ed.appendChild(el('div',{class:'row'},[el('h2',{class:'grow',text:'Bloco · '+bl.nome}),
        exb&&alterada(S.nat)?el('button',{class:'btn sm',text:'Restaurar versão publicada',onclick:function(){ if(!confirm('Descartar as suas mudanças no bloco?')) return; S.itens=exb; mudou(true); }}):null,
        el('button',{class:'btn sm ok',text:'✏️ Editor visual',onclick:function(){ abrirDesenho(); }}),
        el('button',{class:'btn sm',text:'Renomear',onclick:function(){ var nv=prompt('Novo nome do bloco:',bl.nome); if(nv==null) return; var r=renomearBloco(bl.bloco.id,nv); if(r) alert(r); }}),
        el('button',{class:'btn sm del',text:'Excluir bloco',onclick:function(){ excluirBloco(bl.bloco.id); }})]));
      ed.appendChild(el('div',{class:'msg inf'},[el('b',{text:'Usado em '+us.length+(us.length===1?' lugar':' lugares')+': '}),us.map(function(x){ return x.nome; }).join(', ')||'nenhum ainda',el('br'),'Mudanças aqui valem em todos esses lugares.']));
      ed.appendChild(el('div',{class:'muted',style:'margin-top:6px',text:'Dentro do bloco, “Saída do bloco” continua o fluxo de quem usa o bloco (é o destino do fim da lista). “Fechamento” encerra a entrevista. '+(alterada(S.nat)?'Alterado neste navegador.':'Igual à versão publicada.')}));
      if(!S.itens.length) ed.appendChild(el('div',{class:'msg inf',text:'Bloco vazio. Crie os itens abaixo ou no editor visual.'}));
      return;
    }
    var n=natPorId(S.nat),ex=exemplos()[S.nat];
    ed.appendChild(el('div',{class:'row'},[el('h2',{class:'grow',text:'Entrevista · '+n.nome}),
      ex&&alterada(S.nat)?el('button',{class:'btn sm',text:'Restaurar versão publicada',onclick:function(){ if(!confirm('Descartar as suas mudanças em '+n.nome+'?')) return; S.itens=ex; S.msg=null; mudou(true); }}):null,
      el('button',{class:'btn sm ok',text:'✏️ Editor visual',onclick:function(){ abrirDesenho(); }}),
      el('button',{class:'btn sm',text:'Renomear',onclick:function(){ var nv=prompt('Novo nome da natureza:',n.nome); if(nv==null) return; var r=renomearNatureza(n.id,nv); if(r) alert(r); }}),
      el('button',{class:'btn sm del',text:'Excluir natureza',onclick:function(){ excluirNatureza(n.id); }})]));
    var notas=(typeof NOTAS_PROTOCOLOS!=='undefined'&&NOTAS_PROTOCOLOS[S.nat])||[],alt=alterada(S.nat);
    ed.appendChild(el('div',{class:'muted',style:'margin-top:6px',text:alt?'Alterada neste navegador. “Restaurar versão publicada” descarta as suas mudanças nesta natureza.':'Igual à versão publicada.'}));
    if(notas.length) ed.appendChild(el('details',{class:'msg inf'},[el('summary',{text:'Notas da importação do Miro ('+notas.length+')'}),el('p',{class:'muted',text:'Apontadas quando o fluxo veio do Miro. Podem já ter sido corrigidas.'}),el('ul',{},notas.map(function(x){ return el('li',{text:x}); }))]));
    ed.appendChild(el('div',{class:'muted',style:'margin-top:6px',text:'Cada item tem um identificador. O primeiro da lista inicia a entrevista. Em “Depois” e em cada opção você escolhe para onde o fluxo vai. O que você muda aqui vale na próxima ligação da aba Atendimento.'}));
    if(!S.itens.length) ed.appendChild(el('div',{class:'msg inf',text:'Esta natureza está sem entrevista: no atendimento, o passo Entrevista avisa e segue direto para o solicitante. Use os botões abaixo para criar o primeiro item.'}));
  }

  /* ---------- feedback de quem usa ---------- */
  if(!DB.feedbacks) DB.feedbacks=[];
  var FB={aberto:false,tipo:'Problema',texto:'',nome:'',ctx:true,msg:null,enviando:false};
  function contextoFeedback(){
    var c={aba:{atend:'Atendimento',prot:'Protocolos',ocorr:'Ocorrências'}[V.view]};
    if(V.view==='atend'&&A){ c.passo=PASSOS[A.passo]; var n=natPorId(A.nat); if(n) c.natureza=n.nome; if(A.passo===1){ var P=protocolo(); if(P.est&&P.est.pendente){ var it=P.g.item[P.est.pendente]; c.item=it.id+': '+it.texto; } } if(A.hermes) c.hermes=A.hermes.rot.titulo; }
    if(V.view==='prot'){ var m=porChave(S.nat); if(m) c.natureza=m.nome; c.painel=S.aba; }
    return c;
  }
  function feedbackRemoto(){ var gf=typeof FEEDBACK_FORMULARIO!=='undefined'?lerFormularioGoogle(FEEDBACK_FORMULARIO):null; return !!(gf&&gf.envio)||!!(typeof FEEDBACK_DESTINO!=='undefined'&&FEEDBACK_DESTINO&&FEEDBACK_DESTINO.url); }
  function enviarFeedback(){
    var t=FB.texto.trim(); if(!t){ FB.msg={t:'err',m:'Escreva o seu comentário.'}; desenharFeedback(); return; }
    var reg={quando:new Date().toISOString(),tipo:FB.tipo,texto:t,nome:FB.nome.trim()||null,contexto:FB.ctx?contextoFeedback():null,navegador:navigator.userAgent.slice(0,160)};
    var ok=function(remoto){ if(!remoto){ DB.feedbacks.push(reg); salvar(); } FB.texto=''; FB.enviando=false; FB.msg={t:'okm',m:remoto?'Obrigado! Seu feedback foi enviado.':'Obrigado! Seu feedback ficou guardado neste navegador e vai junto quando os protocolos forem exportados.'}; desenharFeedback(); };
    var gf=typeof FEEDBACK_FORMULARIO!=='undefined'?lerFormularioGoogle(FEEDBACK_FORMULARIO):null;
    if(gf&&gf.envio){
      var c=reg.contexto,onde=c?[c.aba,c.passo,c.natureza,c.item,c.painel?'painel '+c.painel:'',c.hermes?'Hermes: '+c.hermes:''].filter(Boolean).join(' · '):'';
      var dados={TIPO:reg.tipo,COMENTARIO:reg.texto,NOME:reg.nome||'',CONTEXTO:onde,NAVEGADOR:reg.navegador},corpo=new URLSearchParams();
      Object.keys(gf.campos).forEach(function(k){ corpo.append(gf.campos[k],dados[k]||''); });
      if(!gf.campos.CONTEXTO&&onde) corpo.set(gf.campos.COMENTARIO,reg.texto+'\n\n(Onde: '+onde+')');
      FB.enviando=true; desenharFeedback();
      /* o Google não deixa ler a resposta de outro site (no-cors): sem erro de rede, conta como enviado */
      fetch(gf.envio,{method:'POST',mode:'no-cors',body:corpo})
        .then(function(){ ok(true); })
        .catch(function(){ ok(false); FB.msg={t:'inf',m:'Não consegui enviar agora (sem internet?). Seu feedback ficou guardado neste navegador e vai junto quando os protocolos forem exportados.'}; desenharFeedback(); });
      return;
    }
    if(typeof FEEDBACK_DESTINO!=='undefined'&&FEEDBACK_DESTINO&&FEEDBACK_DESTINO.url){
      FB.enviando=true; desenharFeedback();
      fetch(FEEDBACK_DESTINO.url.replace(/\/$/,'')+'/rest/v1/'+(FEEDBACK_DESTINO.tabela||'feedback'),{method:'POST',headers:{'apikey':FEEDBACK_DESTINO.chave,'Authorization':'Bearer '+FEEDBACK_DESTINO.chave,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(reg)})
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); ok(true); })
        .catch(function(){ ok(false); FB.msg={t:'inf',m:'Não consegui enviar agora. Seu feedback ficou guardado neste navegador e vai junto quando os protocolos forem exportados.'}; desenharFeedback(); });
    } else ok(false);
  }
  function tallyId(){ return typeof FEEDBACK_TALLY!=='undefined'&&/^[\w-]+$/.test(FEEDBACK_TALLY||'')?FEEDBACK_TALLY:''; }
  window.addEventListener('message',function(e){
    if(!/tally\.so$/.test(String(e.origin).replace(/^https?:\/\//,''))) return;
    var d=e.data; try{ if(typeof d==='string') d=JSON.parse(d); }catch(x){ return; }
    if(d&&d.event==='Tally.FormSubmitted'&&FB.aberto){ FB.enviadoTally=true; desenharFeedback(); }
  });
  function desenharFeedback(){
    var h=$('feedback'); h.textContent=''; if(!FB.aberto){ h.style.display='none'; return; } h.style.display='';
    var c=contextoFeedback(),fechar=function(){ FB.aberto=false; FB.msg=null; FB.enviadoTally=false; desenharFeedback(); };
    var tid=tallyId();
    if(tid&&!FB.local){
      var q=['alignLeft=1','hideTitle=1','transparentBackground=1'];
      [['aba',c.aba],['passo',c.passo],['natureza',c.natureza],['pergunta',c.item],['painel',c.painel],['hermes',c.hermes],['navegador',navigator.userAgent.slice(0,160)]].forEach(function(x){ if(x[1]) q.push(x[0]+'='+encodeURIComponent(x[1])); });
      var url='https://tally.so/embed/'+tid+'?'+q.join('&');
      h.appendChild(el('div',{class:'ajBox fbBox fbTally',role:'dialog','aria-label':'Dar feedback'},[
        el('div',{class:'row'},[el('h2',{class:'grow',text:'Dar feedback sobre o protótipo'}),el('button',{class:'btn sm',onclick:fechar},['Fechar ',el('kbd',{text:'Esc'})])]),
        FB.enviadoTally?el('div',{class:'msg okm',role:'status',text:'Obrigado! Seu feedback foi enviado.'}):null,
        el('p',{class:'muted',text:'Vai junto: '+([c.aba,c.passo,c.natureza,c.item].filter(Boolean).join(' · ')||'a tela atual')+'.'}),
        el('iframe',{src:url,title:'Formulário de feedback',loading:'lazy'}),
        el('div',{class:'row'},[el('a',{class:'lnk',href:url.replace('/embed/','/r/'),target:'_blank',rel:'noopener',text:'Abrir em outra aba'}),el('button',{class:'lnk',text:'Sem internet? Escrever aqui e guardar no navegador',onclick:function(){ FB.local=true; desenharFeedback(); }})])]));
      return;
    }
    var tipos=['Problema','Sugestão','Dúvida','Elogio'];
    var ta=el('textarea',{rows:'5',id:'fbTxt','aria-label':'Seu comentário',placeholder:'O que aconteceu, o que você esperava, o que mudaria…',value:FB.texto,oninput:function(e){ FB.texto=e.target.value; }});
    h.appendChild(el('div',{class:'ajBox fbBox',role:'dialog','aria-label':'Dar feedback'},[
      el('h2',{text:'Dar feedback sobre o protótipo'}),
      el('div',{class:'row',role:'radiogroup','aria-label':'Tipo'},tipos.map(function(t){ return el('button',{class:'btn sm'+(FB.tipo===t?' pri':''),role:'radio','aria-checked':FB.tipo===t?'true':'false',text:t,onclick:function(){ FB.tipo=t; desenharFeedback(); var x=$('fbTxt'); if(x) x.focus(); }}); })),
      ta,
      el('input',{type:'text','aria-label':'Seu nome (opcional)',placeholder:'Seu nome (opcional)',value:FB.nome,oninput:function(e){ FB.nome=e.target.value; }}),
      el('label',{class:'row',style:'gap:6px;font-size:13px'},[el('input',{type:'checkbox',checked:FB.ctx,onchange:function(e){ FB.ctx=e.target.checked; }}),'Incluir onde eu estava: '+[c.aba,c.passo,c.natureza,c.item].filter(Boolean).join(' · ')]),
      el('p',{class:'muted',text:'Não escreva dados reais de ocorrência nem de pessoas.'+(feedbackRemoto()?'':' O feedback fica guardado neste navegador até os protocolos serem exportados.')}),
      FB.msg?el('div',{class:'msg '+FB.msg.t,role:'status',text:FB.msg.m}):null,
      el('div',{class:'row'},[el('button',{class:'btn ok',disabled:FB.enviando,text:FB.enviando?'Enviando…':'Enviar',onclick:enviarFeedback}),el('button',{class:'btn',onclick:fechar},['Fechar ',el('kbd',{text:'Esc'})])])]));
    if(!FB.msg) ta.focus();
  }
  $('bFeedback').addEventListener('click',function(){ FB.aberto=true; FB.msg=null; FB.local=false; FB.enviadoTally=false; desenharFeedback(); });

  /* ---------- navegação entre as três áreas ---------- */
  function mostrar(v){
    V.view=v;
    ['atend','prot','ocorr'].forEach(function(x){ $('v'+x.charAt(0).toUpperCase()+x.slice(1)).style.display=x===v?'':'none'; var b=$('t_'+x); b.className=x===v?'on':''; b.setAttribute('aria-selected',x===v?'true':'false'); });
    if(v==='prot') desenharProt(); else if(v==='ocorr') desenharOcorr(); else if(!$('centro')&&!$('bNova')) desenharAtend();
  }
  ['atend','prot','ocorr'].forEach(function(x){ $('t_'+x).addEventListener('click',function(){ mostrar(x); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#pTabs button'),function(b){ b.addEventListener('click',function(){ S.aba=b.getAttribute('data-tab'); S.msg=null; desenharLado(); }); });
  if(window.mermaid){ try{ window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',flowchart:{useMaxWidth:false}}); }catch(e){} }
  desenharAtend(); mostrar('atend');
  window.__hefesto={DB:DB,estado:function(){ return A; }};
})();
