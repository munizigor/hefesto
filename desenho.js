/* ===== EDITOR VISUAL DO FLUXO (tela cheia, no padrão de cores do quadro do Miro) =====
   Cada item da entrevista é uma caixa. Perguntas mostram as respostas como linhas, cada uma com um ponto de saída:
   puxe do ponto até outra caixa para dizer para onde aquela resposta leva. O ponto de baixo é o caminho padrão.
   Sem biblioteca externa. Usa do logic.js: TIPOS, temOpcoes, ehPergunta, grafo, validar, idLivre, usados, I, O.
   Uso: HefestoDesenho.abrir(api) com
     api.itens()            itens da natureza (o próprio array, editado no lugar)
     api.setItens(lista)    troca o array (desfazer)
     api.natureza           {id, nome}
     api.naturezas          lista de naturezas (para a troca)
     api.layout() / api.setLayout(mapa)   posições {id:{x,y}} desta natureza
     api.mudou()            salva e redesenha o resto da tela */
var HefestoDesenho=(function(){
  var API=null,R=null,V={tx:40,ty:40,k:1},sel=null,multi={},ultimoClique={id:null,t:0},pilha=[],arraste=null,ligacao=null,raiz=null;
  var PAPEL={titulo:['#af7e04','#1a1a1a'],perg:['#ffffff','#1a1a1a'],desp:['#ffc6c6','#bd0a0a'],orient:['#ffdc4a','#af7e04'],acao:['#ffffff','#757575'],video:['#2dc75c','#067429'],troca:['#8f7fee','#6631d7'],diag:['#f8f6ff','#5b3fc4'],fim:['#adf0c7','#067429'],bloco:['#e3f2fd','#1565c0'],saida:['#e3f2fd','#1565c0']};
  function papel(it){ if(it.tipo==='bloco') return 'bloco'; if(ehPergunta(it)) return 'perg'; if(it.tipo==='instrucao') return it.despacho?'desp':'orient'; if(it.tipo==='informacao') return it.video?'video':'acao'; if(it.tipo==='troca') return 'troca'; if(it.tipo==='diagrama') return 'diag'; return 'acao'; }
  function nomeTipo(it){ var p=papel(it); return {perg:it.tipo==='texto'||it.tipo==='numero'?'Pergunta aberta':it.tipo==='multipla'?'Pergunta · várias respostas':'Pergunta',desp:'🚒 Despacho imediato',orient:'Orientação ao solicitante',acao:'Informação ao atendente',video:'📞 Videochamada',troca:'🔁 Trocar natureza',diag:'Fluxograma de consulta',bloco:'🧩 Bloco reutilizável'}[p]; }
  function h(tag,attrs,kids){ var e=document.createElement(tag); for(var k in (attrs||{})){ var v=attrs[k]; if(k==='class') e.className=v; else if(k==='text') e.textContent=v; else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else if(v!==false&&v!=null) e.setAttribute(k,v); } (kids||[]).forEach(function(c){ if(c) e.appendChild(typeof c==='string'?document.createTextNode(c):c); }); return e; }
  function itens(){ return API.itens(); }
  /* destinos resolvidos; dentro de um bloco, o fim da lista é a saída do bloco */
  function gr(){ var g=grafo(itens()),l=itens(); if(API.emBloco&&l.length){ var u=l[l.length-1]; if(!u.prox) g.def[u.id]='SAIDA'; } return g; }
  function porId(id){ return itens().filter(function(x){ return x.id===id; })[0]||null; }
  function lay(){ return API.layout()||{}; }
  /* ---------- desfazer ---------- */
  function guardar(){ pilha.push(JSON.stringify({itens:itens(),layout:lay()})); if(pilha.length>60) pilha.shift(); }
  function desfazer(){ var x=pilha.pop(); if(!x) return; x=JSON.parse(x); API.setItens(x.itens); API.setLayout(x.layout); sel=null; API.mudou(); desenhar(); }
  function mudou(){ API.mudou(); desenhar(); }
  /* ---------- organização automática em camadas ---------- */
  function organizar(tam){
    var it=itens(),g=gr(),camada={},ordem=[];
    var viz=function(id){ var x=g.item[id]; if(!x) return []; var v=[]; if(temOpcoes(x)) x.opcoes.forEach(function(o){ v.push(o.vai||g.def[id]); }); v.push(g.def[id]); return v.filter(function(y,i,a){ return a.indexOf(y)===i; }); };
    /* caminho mais longo a partir do início (a entrevista não tem ciclo) */
    var prof={},visit=function(id,d){ if(id==='FIM'||!g.item[id]) return; if(prof[id]!=null&&prof[id]>=d) return; prof[id]=d; viz(id).forEach(function(y){ visit(y,d+1); }); };
    if(it.length) visit(it[0].id,1);
    var max=0; it.forEach(function(x){ if(prof[x.id]!=null) max=Math.max(max,prof[x.id]); });
    var soltos=it.filter(function(x){ return prof[x.id]==null; });
    var L={}; it.forEach(function(x){ if(prof[x.id]!=null) (L[prof[x.id]]=L[prof[x.id]]||[]).push(x.id); });
    var pos={},y=0,LARG=280;
    pos.__inicio={x:0,y:0}; y=90;
    for(var d=1;d<=max;d++){
      var linha=L[d]||[];
      /* ordena pelo x médio de quem aponta para cada caixa */
      linha.sort(function(a,b){ var m=function(id){ var s=0,n=0; it.forEach(function(p){ if(pos[p.id]&&viz(p.id).indexOf(id)>=0){ s+=pos[p.id].x; n++; } }); return n?s/n:0; }; return m(a)-m(b); });
      var alt=0,w=linha.length*LARG,x0=-w/2+LARG/2;
      linha.forEach(function(id,i){ pos[id]={x:Math.round(x0+i*LARG-((tam[id]||{w:240}).w/2)),y:y}; alt=Math.max(alt,(tam[id]||{h:80}).h); });
      y+=alt+70;
    }
    pos.__fim={x:-60,y:y}; if(API.emBloco) pos.__saida={x:-320,y:y};
    soltos.forEach(function(x,i){ pos[x.id]={x:Math.round(LARG*Math.ceil(((L[1]||[]).length+1)/2)+200),y:90+i*((tam[x.id]||{h:80}).h+40)}; });
    pos.__inicio.x=pos[it[0]&&it[0].id]?pos[it[0].id].x:0;
    return pos;
  }
  /* ---------- desenho ---------- */
  function abrir(api){
    API=api; sel=null; multi={}; pilha=[]; V={tx:60,ty:40,k:1};
    fechar();
    raiz=h('div',{class:'dz',role:'dialog','aria-label':'Editor visual do fluxo'});
    document.body.appendChild(raiz);
    document.addEventListener('keydown',tecla,true);
    desenhar(true);
  }
  function fechar(){ if(raiz){ raiz.remove(); raiz=null; document.removeEventListener('keydown',tecla,true); } }
  function tecla(e){
    if(!raiz) return;
    var emCampo=/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'');
    if(e.key==='Escape'&&!emCampo){ e.preventDefault(); e.stopPropagation(); if(sel){ sel=null; desenhar(); } else fechar(); return; }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!emCampo){ e.preventDefault(); e.stopPropagation(); desfazer(); return; }
    if(e.key==='Escape'&&!emCampo&&Object.keys(multi).length){ multi={}; desenhar(); return; }
    if((e.key==='Delete'||e.key==='Backspace')&&!emCampo&&sel){ e.preventDefault(); e.stopPropagation(); excluir(sel); }
  }
  function desenhar(ajustar){
    if(!raiz) return;
    var foco=document.activeElement&&raiz.contains(document.activeElement)&&document.activeElement.getAttribute('data-k');
    raiz.textContent='';
    var v=itens().length?API.validar():{erros:[],avisos:[]},nMulti=Object.keys(multi).length,listaB=API.blocos?API.blocos():[];
    /* barra */
    var paleta=[['Pergunta','perg'],['Pergunta aberta','aberta'],['Orientação','orient'],['Despacho','desp'],['Informação','acao'],['Videochamada','video'],['Trocar natureza','troca']];
    raiz.appendChild(h('div',{class:'dzBarra'},[
      API.voltar?h('button',{class:'btn sm',text:'‹ Voltar para '+API.voltar.nome,onclick:API.voltar.fn}):null,
      h('b',{text:(API.emBloco?'Bloco · ':'Editor visual · ')+API.natureza.nome}),
      h('span',{class:'dzSep'}),
      h('span',{class:'muted',text:'Adicionar:'})].concat(paleta.map(function(p){ return h('button',{class:'dzAdd dz-'+(p[1]==='aberta'?'perg':p[1]),text:'+ '+p[0],onclick:function(){ adicionar(p[1]); }}); })).concat([
      listaB.length?h('select',{class:'dzAddB','aria-label':'Adicionar bloco',onchange:function(e){ if(e.target.value) adicionar('bloco',e.target.value); }},[h('option',{value:'',text:'+ Bloco…'})].concat(listaB.map(function(b){ return h('option',{value:b.id,text:b.nome+' ('+b.n+' itens)'}); }))):null,
      nMulti>=2?h('button',{class:'btn sm ok',text:'🧩 Transformar em bloco ('+nMulti+')',title:'Junta as caixas selecionadas num bloco reutilizável',onclick:transformar}):null,
      h('span',{class:'grow'}),
      h('button',{class:'btn sm',text:'↶ Desfazer',disabled:!pilha.length,title:'Ctrl+Z',onclick:desfazer}),
      h('button',{class:'btn sm',text:'Reorganizar',title:'Refaz a disposição automática das caixas',onclick:function(){ guardar(); API.setLayout({}); desenhar(true); }}),
      h('button',{class:'btn sm',text:'−',title:'Diminuir',onclick:function(){ zoom(0.8); }}),
      h('button',{class:'btn sm',text:'+',title:'Aumentar',onclick:function(){ zoom(1.25); }}),
      h('button',{class:'btn sm',text:'Ver tudo',onclick:function(){ caber(true); }}),
      h('button',{class:'btn sm pri',text:'Fechar',onclick:fechar})])));
    var proc=API.processo?API.processo():[],altos=proc.filter(function(x){ return x.nivel==='alto'; });
    if(altos.length) raiz.appendChild(h('div',{class:'dzStatus err',title:altos.map(function(x){ return x.msg; }).join('\n'),text:'🚒 '+altos.length+' caminho'+(altos.length>1?'s':'')+' termina'+(altos.length>1?'m':'')+' sem despacho. '+altos[0].msg+(altos.length>1?' (veja todos no painel “Testar” ao lado da entrevista)':'')}));
    var status=v.erros.length?h('div',{class:'dzStatus err',text:'⚠ '+v.erros.length+' erro(s): '+v.erros[0]+(v.erros.length>1?' …':'')+' A entrevista não aparece no atendimento até corrigir.'}):v.avisos.length?h('div',{class:'dzStatus inf',text:v.avisos.length+' aviso(s): '+v.avisos[0]}):h('div',{class:'dzStatus ok',text:'Fluxo sem erros · '+itens().length+' itens. Puxe do ponto ● de uma resposta até outra caixa para ligar. Duplo clique no fundo ajusta a tela.'});
    raiz.appendChild(status);
    var corpo=h('div',{class:'dzCorpo'}),tela=h('div',{class:'dzTela'}),mundo=h('div',{class:'dzMundo'}),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','dzSvg'); mundo.appendChild(svg); tela.appendChild(mundo); corpo.appendChild(tela);
    corpo.appendChild(painel()); raiz.appendChild(corpo);
    R={tela:tela,mundo:mundo,svg:svg,nos:{}};
    /* caixas */
    R.nos.__inicio=caixaSimples('__inicio','titulo',(API.emBloco?'Bloco: ':'Natureza: ')+API.natureza.nome,'Início');
    itens().forEach(function(it){ R.nos[it.id]=caixa(it); });
    R.nos.__fim=caixaSimples('__fim','fim','Relato final','Encerra a entrevista');
    if(API.emBloco) R.nos.__saida=caixaSimples('__saida','saida','Saída do bloco','Continua o fluxo de quem usa o bloco');
    for(var k in R.nos) mundo.appendChild(R.nos[k]);
    /* posições */
    var L=lay(),faltam=!L.__inicio||itens().some(function(it){ return !L[it.id]; });
    if(faltam){ var tam={}; for(var k2 in R.nos) tam[k2]={w:R.nos[k2].offsetWidth,h:R.nos[k2].offsetHeight}; var auto=organizar(tam); var novo={}; for(var k3 in auto) novo[k3]=L[k3]||auto[k3]; API.setLayout(novo); L=novo; ajustar=true; }
    for(var k4 in R.nos){ var p=L[k4]||{x:0,y:0}; R.nos[k4].style.left=p.x+'px'; R.nos[k4].style.top=p.y+'px'; }
    aplicarVista(); arestas();
    if(ajustar) caber();
    eventosTela();
    if(foco){ var f=raiz.querySelector('[data-k="'+foco+'"]'); if(f){ f.focus(); if(f.setSelectionRange&&f.value) f.setSelectionRange(f.value.length,f.value.length); } }
  }
  function caixaSimples(id,p,texto,sub){
    var n=h('div',{class:'dzNo dz-'+p+(sel===id?' sel':''),'data-id':id},[h('div',{class:'dzTipo',text:sub}),h('div',{class:'dzTxt',text:texto})]);
    if(id==='__inicio') n.appendChild(h('span',{class:'dzPorta dzPad','data-de':'__inicio','data-o':'',title:'Puxe até a caixa que inicia a entrevista'}));
    arrastavel(n,id); return n;
  }
  function caixa(it){
    var p=papel(it),n=h('div',{class:'dzNo dz-'+p+(sel===it.id?' sel':'')+(multi[it.id]?' multi':''),'data-id':it.id});
    if(it.tipo==='bloco'){
      var b=(API.blocos?API.blocos():[]).filter(function(x){ return x.id===it.bloco; })[0];
      n.appendChild(h('div',{class:'dzTipo',text:'🧩 Bloco'+(b?' · '+b.n+' itens · usado em '+b.usos:' · não encontrado')}));
      n.appendChild(h('div',{class:'dzTxt',text:it.texto||it.bloco}));
      n.appendChild(h('div',{class:'dzDica',text:'Duplo clique para abrir'}));
      n.appendChild(h('span',{class:'dzPorta dzPad','data-de':it.id,'data-o':'',title:'Depois do bloco'}));
      arrastavel(n,it.id); return n;
    }
    n.appendChild(h('div',{class:'dzTipo',text:nomeTipo(it)+(it.obrig?' · obrigatória':'')}));
    n.appendChild(h('div',{class:'dzTxt',text:it.texto||'(sem texto)'}));
    if(temOpcoes(it)){
      var ops=h('div',{class:'dzOps'});
      it.opcoes.forEach(function(o){ ops.appendChild(h('div',{class:'dzOp'+(o.relato===false?' ns':''),title:o.relato===false?'Fora do relato':'Vai para o relato'},[h('span',{text:o.rotulo}),h('span',{class:'dzPorta','data-de':it.id,'data-o':o.id,title:'Puxe até a próxima caixa desta resposta'})])); });
      if(it.outro) ops.appendChild(h('div',{class:'dzOp ab'},[h('span',{text:'Aberta (outra resposta)'})]));
      n.appendChild(ops);
    } else if(it.tipo==='texto'||it.tipo==='numero') n.appendChild(h('div',{class:'dzOps'},[h('div',{class:'dzOp ab'},[h('span',{text:it.tipo==='numero'?'Aberta (número)':'Aberta'})])]));
    n.appendChild(h('span',{class:'dzPorta dzPad','data-de':it.id,'data-o':'',title:temOpcoes(it)?'Caminho padrão (respostas sem ligação própria e pergunta pulada)':'Próximo passo'}));
    arrastavel(n,it.id); return n;
  }
  /* ---------- setas ---------- */
  function centro(el){ var r=el.getBoundingClientRect(),t=R.tela.getBoundingClientRect(); return {x:(r.left+r.width/2-t.left-V.tx)/V.k,y:(r.top+r.height/2-t.top-V.ty)/V.k}; }
  function topo(id){ var n=R.nos[id]; if(!n) return null; return {x:n.offsetLeft+n.offsetWidth/2,y:n.offsetTop}; }
  function curva(a,b,pad){ var dy=Math.max(40,Math.abs(b.y-a.y)/2); return 'M'+a.x+','+a.y+' C'+(pad?a.x:a.x+60)+','+(pad?a.y+dy:a.y)+' '+b.x+','+(b.y-dy)+' '+b.x+','+b.y; }
  function arestas(){
    var svg=R.svg; while(svg.firstChild) svg.removeChild(svg.firstChild);
    var defs=document.createElementNS(svg.namespaceURI,'defs');
    defs.innerHTML='<marker id="dzSeta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker><marker id="dzSetaF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#bbb"/></marker>';
    svg.appendChild(defs);
    var g=itens().length?gr():{def:{}},dest=function(t){ return t==='SAIDA'?'__saida':t==='FIM'||!t?'__fim':t; };
    var linha=function(a,b,pad,fraca){ if(!a||!b) return; var p=document.createElementNS(svg.namespaceURI,'path'); p.setAttribute('d',curva(a,b,pad)); p.setAttribute('class','dzLinha'+(fraca?' fraca':'')); p.setAttribute('marker-end',fraca?'url(#dzSetaF)':'url(#dzSeta)'); svg.appendChild(p); };
    if(itens().length) linha(centro(R.nos.__inicio.querySelector('.dzPorta')),topo(itens()[0].id),true);
    itens().forEach(function(it){
      var n=R.nos[it.id]; if(!n) return;
      if(temOpcoes(it)) it.opcoes.forEach(function(o){ var pt=n.querySelector('.dzOp .dzPorta[data-o="'+o.id+'"]'); if(pt) linha(centro(pt),topo(dest(o.vai||g.def[it.id])),false,!o.vai); });
      var usaPad=!temOpcoes(it)||it.outro||it.opcoes.some(function(o){ return !o.vai; })||!it.obrig;
      linha(centro(n.querySelector('.dzPad')),topo(dest(g.def[it.id])),true,temOpcoes(it)&&!usaPad);
    });
  }
  /* ---------- vista: mover e aproximar ---------- */
  function aplicarVista(){ R.mundo.style.transform='translate('+V.tx+'px,'+V.ty+'px) scale('+V.k+')'; }
  function zoom(f,cx,cy){ var t=R.tela.getBoundingClientRect(); if(cx==null){ cx=t.width/2; cy=t.height/2; } var k=Math.max(0.2,Math.min(2.5,V.k*f)); V.tx=cx-(cx-V.tx)*(k/V.k); V.ty=cy-(cy-V.ty)*(k/V.k); V.k=k; aplicarVista(); }
  function limites(){ var b={minx:1e9,miny:1e9,maxx:-1e9,maxy:-1e9}; for(var k in R.nos){ var n=R.nos[k]; b.minx=Math.min(b.minx,n.offsetLeft); b.miny=Math.min(b.miny,n.offsetTop); b.maxx=Math.max(b.maxx,n.offsetLeft+n.offsetWidth); b.maxy=Math.max(b.maxy,n.offsetTop+n.offsetHeight); } return b; }
  /* tudo: o fluxo inteiro na tela. Sem "tudo": cabe na largura, legível (no mínimo 85%), começando do topo */
  function caber(tudo){
    var b=limites(),t=R.tela.getBoundingClientRect(),kw=(t.width-60)/(b.maxx-b.minx||1),kh=(t.height-60)/(b.maxy-b.miny||1);
    var kk=tudo?Math.min(kw,kh):Math.max(0.85,Math.min(kw,kh)); kk=Math.min(1.1,Math.max(0.2,Math.min(kk,kw)));
    V.k=kk; V.tx=(t.width-(b.maxx-b.minx)*kk)/2-b.minx*kk; V.ty=30-b.miny*kk; aplicarVista();
  }
  function eventosTela(){
    var t=R.tela;
    t.addEventListener('wheel',function(e){ e.preventDefault(); var r=t.getBoundingClientRect(); zoom(e.deltaY<0?1.1:0.9,e.clientX-r.left,e.clientY-r.top); },{passive:false});
    t.addEventListener('dblclick',function(e){ if(e.target===t||e.target===R.svg||e.target===R.mundo) caber(true); });
    t.addEventListener('pointerdown',function(e){
      if(e.target.classList&&e.target.classList.contains('dzPorta')){ iniciarLigacao(e); return; }
      if(e.target!==t&&e.target!==R.svg&&e.target!==R.mundo&&!(e.target.closest&&e.target.closest('.dzSvg'))) return;
      var x0=e.clientX,y0=e.clientY,tx=V.tx,ty=V.ty,moveu=false;
      t.setPointerCapture(e.pointerId); t.classList.add('mov');
      var mv=function(ev){ moveu=true; V.tx=tx+ev.clientX-x0; V.ty=ty+ev.clientY-y0; aplicarVista(); };
      var up=function(){ t.removeEventListener('pointermove',mv); t.removeEventListener('pointerup',up); t.classList.remove('mov'); if(!moveu&&sel){ sel=null; desenhar(); } };
      t.addEventListener('pointermove',mv); t.addEventListener('pointerup',up);
    });
  }
  function arrastavel(n,id){
    n.addEventListener('pointerdown',function(e){
      if(e.target.classList.contains('dzPorta')) return;
      e.stopPropagation();
      var x0=e.clientX,y0=e.clientY,l0=n.offsetLeft,t0=n.offsetTop,moveu=false;
      n.setPointerCapture(e.pointerId);
      var mv=function(ev){ var dx=(ev.clientX-x0)/V.k,dy=(ev.clientY-y0)/V.k; if(!moveu&&Math.abs(dx)+Math.abs(dy)<3) return; if(!moveu){ guardar(); moveu=true; } n.style.left=Math.round(l0+dx)+'px'; n.style.top=Math.round(t0+dy)+'px'; arestas(); };
      var up=function(){ n.removeEventListener('pointermove',mv); n.removeEventListener('pointerup',up);
        if(moveu){ var L=JSON.parse(JSON.stringify(lay())); L[id]={x:n.offsetLeft,y:n.offsetTop}; API.setLayout(L); API.mudou(); }
        else if(e.shiftKey&&id.indexOf('__')!==0){ if(multi[id]) delete multi[id]; else multi[id]=1; if(sel&&!multi[sel]&&Object.keys(multi).length===1&&sel!==id) multi[sel]=1; sel=null; desenhar(); }
        else {
          /* duplo clique feito aqui: o primeiro clique redesenha a tela e o navegador perderia o dblclick */
          var agora=Date.now(),it=porId(id);
          if(ultimoClique.id===id&&agora-ultimoClique.t<450&&it&&it.tipo==='bloco'&&API.abrirBloco){ ultimoClique={id:null,t:0}; API.abrirBloco(it.bloco); return; }
          ultimoClique={id:id,t:agora}; multi={}; sel=id.indexOf('__')===0?null:id; desenhar();
        } };
      n.addEventListener('pointermove',mv); n.addEventListener('pointerup',up);
    });
  }
  /* ---------- ligar ---------- */
  function iniciarLigacao(e){
    e.stopPropagation(); e.preventDefault();
    var porta=e.target,de=porta.getAttribute('data-de'),o=porta.getAttribute('data-o'),a=centro(porta),svg=R.svg;
    var p=document.createElementNS(svg.namespaceURI,'path'); p.setAttribute('class','dzLinha nova'); svg.appendChild(p);
    var t=R.tela; t.setPointerCapture(e.pointerId);
    var mv=function(ev){ var r=t.getBoundingClientRect(),b={x:(ev.clientX-r.left-V.tx)/V.k,y:(ev.clientY-r.top-V.ty)/V.k}; p.setAttribute('d',curva(a,b,!o)); };
    var up=function(ev){
      t.removeEventListener('pointermove',mv); t.removeEventListener('pointerup',up); p.remove();
      var alvo=document.elementFromPoint(ev.clientX,ev.clientY),no=alvo&&alvo.closest&&alvo.closest('.dzNo'),para=no&&no.getAttribute('data-id');
      ligar(de,o,para||null);
    };
    t.addEventListener('pointermove',mv); t.addEventListener('pointerup',up);
  }
  function ligar(de,o,para){
    if(para===de||para==='__inicio') return;
    var alvo=para==='__fim'?'FIM':para==='__saida'?'SAIDA':para;
    if(de==='__inicio'){ if(!alvo||alvo==='FIM') return; guardar(); var l=itens(),i=l.indexOf(porId(alvo)); if(i>0){ var x=l.splice(i,1)[0]; l.unshift(x); } mudou(); return; }
    var it=porId(de); if(!it) return;
    guardar();
    if(o){ var op=it.opcoes.filter(function(x){ return x.id===o; })[0]; if(op) op.vai=alvo||''; }
    else it.prox=alvo||'FIM';
    mudou();
  }
  /* ---------- criar e excluir ---------- */
  function adicionar(tipo,bid){
    guardar();
    var u=usados(itens()),base={perg:'pergunta',aberta:'pergunta_aberta',orient:'orientacao',desp:'despacho',acao:'informacao',video:'videochamada',troca:'troca',bloco:bid||'bloco'}[tipo],id=idLivre(base,u),it;
    if(tipo==='bloco'){ var b=API.blocos().filter(function(x){ return x.id===bid; })[0]; it=I(id,'bloco',b?b.nome:bid,{prox:'FIM',bloco:bid}); }
    else if(tipo==='perg') it=I(id,'unica','Nova pergunta?',{prox:'FIM',opcoes:[O('sim','Sim'),O('nao','Não'),{id:'nao_sabe',rotulo:'Não sabe',vai:'',relato:false}]});
    else if(tipo==='aberta') it=I(id,'texto','Nova pergunta aberta?',{prox:'FIM'});
    else if(tipo==='orient') it=I(id,'instrucao','Nova orientação ao solicitante.',{prox:'FIM'});
    else if(tipo==='desp') it=I(id,'instrucao','O socorro já foi acionado e está a caminho.',{prox:'FIM',despacho:true});
    else if(tipo==='acao') it=I(id,'informacao','Nova informação ao atendente.',{prox:'FIM'});
    else if(tipo==='video') it=I(id,'informacao','Realize a videochamada e faça as orientações.',{prox:'FIM',video:true});
    else it=I(id,'troca',(API.naturezas[0]||{nome:''}).nome,{prox:'FIM'});
    itens().push(it);
    /* nasce à direita do desenho, na altura do que está na tela, para não cobrir outra caixa */
    var t=R.tela.getBoundingClientRect(),L=JSON.parse(JSON.stringify(lay())),b=limites();
    L[id]={x:Math.round(b.maxx+60),y:Math.round(Math.max(b.miny,(t.height/3-V.ty)/V.k))};
    var x=L[id].x+120; if(x*V.k+V.tx>t.width-40) V.tx=t.width-40-x*V.k-140;
    API.setLayout(L); sel=id; mudou();
  }
  function excluir(id){
    var it=porId(id); if(!it) return;
    guardar();
    var g=gr(),seg=g.def[id],l=itens();
    /* quem apontava para a caixa passa a apontar para o que vinha depois dela */
    l.forEach(function(x){ if(x.prox===id) x.prox=seg; x.opcoes.forEach(function(o){ if(o.vai===id) o.vai=seg===x.id?'':seg; }); });
    var i=l.indexOf(it),antes=i>0?l[i-1]:null;
    if(antes&&!antes.prox) antes.prox=seg; /* o anterior seguia "o próximo da lista" */
    l.splice(i,1); sel=null; mudou();
  }
  /* ---------- transformar caixas selecionadas em bloco ---------- */
  function transformar(){
    var S_=multi,l=itens(),g=gr(),ids=l.filter(function(x){ return S_[x.id]; }).map(function(x){ return x.id; });
    var alvos=function(x){ return x.opcoes.map(function(o){ return o.vai||g.def[x.id]; }).concat([g.def[x.id]]); };
    var entradas={},saidas={};
    l.forEach(function(x){ if(S_[x.id]) return; alvos(x).forEach(function(t){ if(S_[t]) entradas[t]=1; }); });
    if(l.length&&S_[l[0].id]) entradas[l[0].id]=1;
    ids.forEach(function(id){ alvos(g.item[id]).forEach(function(t){ if(!S_[t]&&t!=='FIM') saidas[t]=1; }); });
    var en=Object.keys(entradas),sa=Object.keys(saidas);
    if(!en.length){ alert('Nenhuma caixa de fora leva às caixas selecionadas. Selecione um trecho que esteja ligado ao fluxo.'); return; }
    if(en.length>1){ alert('O trecho selecionado tem mais de uma entrada: '+en.join(', ')+'. Um bloco precisa começar por uma caixa só (as setas de fora devem chegar todas à mesma caixa).'); return; }
    if(sa.length>1){ alert('O trecho selecionado sai para mais de um lugar: '+sa.map(function(t){ return t==='SAIDA'?'saída do bloco':t; }).join(', ')+'. Um bloco tem uma saída só; o Fechamento pode aparecer à vontade. Inclua ou tire caixas até sobrar uma saída.'); return; }
    var nome=prompt('Nome do bloco (ex.: Riscos do acidente):'); if(!nome) return;
    var e=en[0],ordem=[e].concat(ids.filter(function(id){ return id!==e; }));
    var mapa=function(t){ return S_[t]?t:t==='FIM'?'FIM':'SAIDA'; };
    var itensB=ordem.map(function(id){ var x=JSON.parse(JSON.stringify(g.item[id])); x.prox=mapa(g.def[id]); x.opcoes.forEach(function(o){ o.vai=mapa(o.vai||g.def[id]); if(o.vai===x.prox) o.vai=''; }); return x; });
    var r=API.criarBloco(nome,itensB); if(r.erro){ alert(r.erro); return; }
    guardar();
    var ent=g.item[e],pos=l.indexOf(ent),novo=I(e,'bloco',nome.trim(),{bloco:r.id,prox:sa[0]||'FIM'});
    var resto=l.filter(function(x){ return !S_[x.id]||x.id===e; }); resto[resto.indexOf(ent)]=novo;
    API.setItens(resto); multi={}; sel=e; mudou();
  }
  /* ---------- painel da caixa selecionada ---------- */
  function painel(){
    var p=h('aside',{class:'dzPainel'});
    var it=sel&&porId(sel);
    if(it&&it.tipo==='bloco'){
      var bs=API.blocos(),b=bs.filter(function(x){ return x.id===it.bloco; })[0];
      p.appendChild(h('h3',{text:'🧩 Bloco reutilizável'}));
      p.appendChild(h('label',{class:'dzRot',text:'Bloco'}));
      p.appendChild(h('select',{'data-k':'bloco',onchange:function(e){ guardar(); it.bloco=e.target.value; var nb=bs.filter(function(x){ return x.id===it.bloco; })[0]; it.texto=nb?nb.nome:it.bloco; mudou(); }},(b?[]:[h('option',{value:it.bloco,text:'(não encontrado)',selected:true})]).concat(bs.map(function(x){ return h('option',{value:x.id,text:x.nome,selected:x.id===it.bloco}); }))));
      if(b) p.appendChild(h('p',{class:'muted',text:b.n+' itens · usado em '+b.usos+(b.usos===1?' lugar':' lugares')+'. Mudanças no bloco valem em todos.'}));
      p.appendChild(h('div',{class:'row',style:'margin-top:10px'},[b?h('button',{class:'btn sm pri',text:'Abrir o bloco',onclick:function(){ API.abrirBloco(it.bloco); }}):null,h('button',{class:'btn sm del',text:'Tirar daqui',onclick:function(){ excluir(it.id); }})]));
      p.appendChild(h('p',{class:'muted',text:'O ponto embaixo da caixa diz para onde o fluxo vai quando o bloco termina.'}));
      return p;
    }
    if(!it){
      p.appendChild(h('h3',{text:'Como usar'}));
      p.appendChild(h('ul',{},['Clique numa caixa para editar o texto, as respostas e o tipo.','Puxe do ponto ● ao lado de uma resposta até a caixa seguinte. O ponto embaixo da caixa é o caminho padrão.','Solte a seta no vazio para desfazer a ligação daquela resposta.','Puxe do ponto da caixa da natureza para escolher a primeira pergunta.','Arraste o fundo para mover a tela e use a roda do mouse para aproximar.','Resposta amarela vai para o relato; lilás fica fora (clique no rótulo no painel para trocar).','Delete apaga a caixa selecionada; Ctrl+Z desfaz.','Shift+clique seleciona várias caixas; “Transformar em bloco” junta o trecho num bloco reutilizável.','Caixa azul é um bloco: duplo clique abre o bloco para editar.'].map(function(t){ return h('li',{text:t}); })));
      return p;
    }
    var ed=function(fn){ return function(e){ guardar(); fn(e); API.mudou(); atualizarCaixa(); }; };
    p.appendChild(h('h3',{text:nomeTipo(it)}));
    p.appendChild(h('label',{class:'dzRot',text:'Identificador'}));
    p.appendChild(h('code',{text:it.id}));
    var tipos=TIPOS.map(function(t){ return h('option',{value:t[0],text:t[1],selected:t[0]===it.tipo}); });
    p.appendChild(h('label',{class:'dzRot',text:'Tipo'}));
    p.appendChild(h('select',{'data-k':'tipo',onchange:function(e){ guardar(); it.tipo=e.target.value; if(temOpcoes(it)&&it.opcoes.length<2) it.opcoes=[O('sim','Sim'),O('nao','Não')]; if(it.tipo==='diagrama'&&!it.mermaid) it.mermaid='flowchart LR\n  A --> B'; mudou(); }},tipos));
    if(it.tipo==='troca'){
      p.appendChild(h('label',{class:'dzRot',text:'Trocar para a natureza'}));
      p.appendChild(h('select',{'data-k':'troca',onchange:function(e){ guardar(); it.texto=e.target.value; mudou(); }},API.naturezas.map(function(n){ return h('option',{value:n.nome,text:n.nome,selected:n.nome===it.texto}); })));
    } else {
      p.appendChild(h('label',{class:'dzRot',text:it.tipo==='diagrama'?'Título':ehPergunta(it)?'Pergunta':'Texto'}));
      var ta=h('textarea',{'data-k':'texto',rows:'4'}); ta.value=it.texto||'';
      ta.addEventListener('focus',function(){ guardar(); });
      ta.addEventListener('input',function(){ it.texto=ta.value; atualizarCaixa(); });
      ta.addEventListener('change',function(){ API.mudou(); });
      p.appendChild(ta);
    }
    var marca=function(rot,val,fn){ return h('label',{class:'dzMarca'},[h('input',{type:'checkbox',checked:!!val,onchange:ed(function(e){ fn(e.target.checked); })}),rot]); };
    if(ehPergunta(it)) p.appendChild(marca('Obrigatória',it.obrig,function(v){ it.obrig=v; }));
    if(temOpcoes(it)) p.appendChild(marca('Aceita resposta aberta (outra)',it.outro,function(v){ it.outro=v; }));
    if(it.tipo==='instrucao') p.appendChild(marca('É o despacho imediato (encaminha a ocorrência)',it.despacho,function(v){ if(v) it.despacho=true; else delete it.despacho; }));
    if(it.tipo==='informacao') p.appendChild(marca('É videochamada',it.video,function(v){ if(v) it.video=true; else delete it.video; }));
    if(it.tipo==='texto'||it.tipo==='numero'||it.tipo==='instrucao') p.appendChild(marca('Vai para o relato',it.relato!==false,function(v){ if(v) delete it.relato; else it.relato=false; }));
    if(temOpcoes(it)){
      p.appendChild(h('label',{class:'dzRot',text:'Respostas'}));
      it.opcoes.forEach(function(o,j){
        var inp=h('input',{type:'text','data-k':'op'+j,value:o.rotulo});
        inp.addEventListener('focus',function(){ guardar(); });
        inp.addEventListener('input',function(){ o.rotulo=inp.value; atualizarCaixa(); });
        inp.addEventListener('change',function(){ API.mudou(); });
        p.appendChild(h('div',{class:'dzOpEd'},[inp,
          h('button',{class:'relTg'+(o.relato===false?' off':''),title:'Vai ou não para o relato final',text:o.relato===false?'fora do relato':'no relato',onclick:function(){ guardar(); if(o.relato===false) delete o.relato; else o.relato=false; mudou(); }}),
          h('button',{class:'btn ic del',text:'✕','aria-label':'Remover resposta '+o.rotulo,disabled:it.opcoes.length<=2,onclick:function(){ guardar(); it.opcoes.splice(j,1); mudou(); }})]));
      });
      p.appendChild(h('button',{class:'btn dash sm',text:'+ Resposta',onclick:function(){ guardar(); var u={}; it.opcoes.forEach(function(x){ u[x.id]=1; }); it.opcoes.push(O(idLivre('resposta',u),'Nova resposta')); mudou(); }}));
    }
    if(it.tipo==='diagrama'){ p.appendChild(h('label',{class:'dzRot',text:'Código do fluxograma'})); var tm=h('textarea',{'data-k':'mm',rows:'6',class:'code'}); tm.value=it.mermaid||''; tm.addEventListener('change',function(){ guardar(); it.mermaid=tm.value; API.mudou(); }); p.appendChild(tm); }
    p.appendChild(h('div',{class:'row',style:'margin-top:14px'},[
      itens()[0]!==it?h('button',{class:'btn sm',text:'Começar por esta',onclick:function(){ ligar('__inicio','',it.id); }}):null,
      h('button',{class:'btn sm del',text:'Excluir caixa',onclick:function(){ excluir(it.id); }})]));
    return p;
  }
  /* troca só o conteúdo da caixa editada, sem redesenhar a tela (mantém o cursor no painel) */
  function atualizarCaixa(){
    var it=sel&&porId(sel),n=it&&R.nos[it.id]; if(!n) return;
    var novo=caixa(it); novo.style.left=n.style.left; novo.style.top=n.style.top; n.replaceWith(novo); R.nos[it.id]=novo; arestas();
  }
  return {abrir:abrir,fechar:fechar};
})();
if(typeof module!=='undefined') module.exports=HefestoDesenho;
