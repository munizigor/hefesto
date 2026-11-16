/* ===== INTERFACE ===== */
(function(){
  if(typeof document==='undefined') return;
  var KEY='hefesto-prototipo-v1';
  var $=function(id){return document.getElementById(id);};
  function el(tag,attrs,kids){ var e=document.createElement(tag); for(var k in (attrs||{})){ var v=attrs[k]; if(k==='class') e.className=v; else if(k==='text') e.textContent=v; else if(k==='value'&&(tag==='textarea'||tag==='select')) e._v=v; else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else if(v!==false&&v!=null) e.setAttribute(k,v); } (kids||[]).forEach(function(c){ if(c) e.appendChild(typeof c==='string'?document.createTextNode(c):c); }); if(e._v!==undefined){ e.value=e._v; } return e; }
  var RAS=['Plano Piloto','Gama','Taguatinga','Brazlândia','Sobradinho','Planaltina','Paranoá','Núcleo Bandeirante','Ceilândia','Guará','Cruzeiro','Samambaia','Santa Maria','São Sebastião','Recanto das Emas','Lago Sul','Riacho Fundo','Lago Norte','Candangolândia','Águas Claras','Riacho Fundo II','Sudoeste/Octogonal','Varjão','Park Way','SCIA/Estrutural','Sobradinho II','Jardim Botânico','Itapoã','SIA','Vicente Pires','Fercal','Sol Nascente/Pôr do Sol','Arniqueira','Arapoanga','Água Quente'];
  var UFS=['DF','GO','MG'];
  var PASSOS=['Local e natureza','Entrevista','Solicitante','Fechamento'];

  /* ---------- dados ---------- */
  var DB={protocolos:null,ocorrencias:[],seq:1};
  try{ var salvo=JSON.parse(localStorage.getItem(KEY)||'null'); if(salvo&&salvo.protocolos){ DB.protocolos=salvo.protocolos; DB.ocorrencias=salvo.ocorrencias||[]; DB.seq=salvo.seq||1; } }catch(e){}
  if(!DB.protocolos) DB.protocolos=exemplos();
  NATUREZAS.forEach(function(n){ if(!Array.isArray(DB.protocolos[n.id])) DB.protocolos[n.id]=[]; });
  function status(t){ var s=$('status'); if(s) s.textContent=t; }
  function salvar(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); status('Salvo neste navegador'); }catch(e){ status('Não foi possível salvar neste navegador'); } }
  var natPorId=function(id){ return NATUREZAS.filter(function(n){return n.id===id;})[0]||null; };
  var norm=function(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); };
  var mmss=function(x){ x=Math.max(0,x|0); return (x<600?'0':'')+Math.floor(x/60)+':'+(x%60<10?'0':'')+(x%60); };

  var V={view:'atend',aviso:null,pausa:false,help:false};
  var A=null,tick=null;

  /* ---------- atendimento: estado ---------- */
  function seg(){ return A?Math.floor((Date.now()-A.t0)/1000):0; }
  function novaLigacao(){
    var r=function(){ return String(1000+Math.floor(Math.random()*9000)); };
    var fone='(61) 9'+r()+'-'+r();
    A={t0:Date.now(),fone:fone,passo:0,max:0,natTxt:'',nat:'',local:'',uf:'DF',ra:'',quartel:'',ref:'',resp:{},nome:'',nomeNI:false,tel:fone,relato:'',relManual:false,relEdit:false,obs:'',entOpen:false,encS:null,conf:null,erro:''};
    V.aviso=null; V.pausa=false;
    if(tick) clearInterval(tick);
    tick=setInterval(relogio,1000);
    desenharAtend(); foco();
  }
  function fimLigacao(){ A=null; if(tick){ clearInterval(tick); tick=null; } desenharAtend(); }
  function protocolo(){
    var itens=(A&&A.nat&&DB.protocolos[A.nat])||[];
    if(!itens.length) return {vazio:true,lista:[],itens:[]};
    var v=validar(itens); if(v.erros.length) return {erro:true,lista:[],itens:itens};
    var est=caminhar(itens,A.resp),g=grafo(itens),lista=est.path.slice();
    if(est.pendente) previsao(itens,A.resp,est.pendente).forEach(function(id){ if(lista.indexOf(id)<0) lista.push(id); });
    return {itens:itens,g:g,est:est,lista:lista};
  }
  function quartelAuto(){ return A.ra?'[GBM da área de '+A.ra+']':''; }
  function quartelAtual(){ return A.quartel||quartelAuto(); }
  function relatoAuto(){
    if(!A) return '';
    var n=natPorId(A.nat),p=[];
    if(n) p.push(n.nome+'.');
    if(A.local) p.push('Local: '+A.local+(A.ra?', '+A.ra:'')+'/'+A.uf+'.');
    if(A.ref) p.push('Referência: '+A.ref+'.');
    var P=protocolo();
    if(P.est) P.est.path.forEach(function(id){ var it=P.g.item[id],r=A.resp[id]; if(!respondido(it,r)) return;
      if(ehPergunta(it)){ if(!r.pulada) p.push(it.texto.replace(/\?\s*$/,'')+': '+valorResposta(it,r)+'.'); }
      else if(it.tipo==='instrucao') p.push('Orientado: '+it.texto); });
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
  function ir(p){ if(!A) return; p=Math.max(0,Math.min(3,p)); if(p>0&&A.encS==null) return; A.passo=p; A.max=Math.max(A.max,p); A.erro=''; desenharPassos(); desenharCentro(); desenharFicha(); foco(); }
  function encaminhar(){
    var f=faltasEncaminhar();
    if(f.length){ A.erro='Para encaminhar falta: '+f.join(', ')+'.'; desenharCentro(); foco(); return; }
    if(A.encS==null) A.encS=seg();
    relogio(); ir(1);
  }
  function avancar(){ if(!A) return; if(A.passo===0) encaminhar(); else ir(A.passo+1); }
  function responder(id,r){ if(r==null) delete A.resp[id]; else A.resp[id]=r; desenharCentro(); desenharFicha(); foco(); }
  function registrar(forcar,depois){
    if(!A) return;
    if(A.encS==null){ A.erro='Encaminhe a ocorrência antes de registrar.'; A.passo=0; desenharPassos(); desenharCentro(); return; }
    var f=faltasRegistro();
    if(f.length&&!forcar){ A.conf={tipo:'reg',faltas:f}; desenharConf(); return; }
    var P=protocolo(),n=natPorId(A.nat),ent=[];
    if(P.est) P.est.path.forEach(function(id){ var it=P.g.item[id],r=A.resp[id]; if(respondido(it,r)) ent.push({id:id,tipo:it.tipo,texto:it.texto,resposta:valorResposta(it,r)}); });
    var o={numero:DB.seq++,ts:Date.now(),natureza:A.nat,naturezaNome:n?n.nome:'',local:A.local,uf:A.uf,ra:A.ra,quartel:quartelAtual(),referencia:A.ref,solicitante:A.nomeNI?'Não informado':A.nome,telefone:A.tel,entrevista:ent,relato:relatoAtual(),observacoes:A.obs,segEncaminhar:A.encS,segTotal:seg(),pendencias:f};
    DB.ocorrencias.unshift(o); salvar();
    V.aviso={t:'okm',m:'Ocorrência nº '+o.numero+' registrada. Encaminhada em '+mmss(o.segEncaminhar)+', ligação de '+mmss(o.segTotal)+'.'};
    V.pausa=depois==='pausa';
    fimLigacao();
  }
  function pedirEncerrar(tipo){ if(!A) return; A.conf={tipo:tipo}; desenharConf(); }
  function encerrarSemRegistrar(){ var t=A.conf&&A.conf.tipo; V.aviso={t:'inf',m:A.encS!=null?'Ligação encerrada sem registro da ficha.':'Ligação encerrada. Nada foi encaminhado.'}; V.pausa=t==='pausa'; fimLigacao(); }

  /* ---------- atendimento: desenho ---------- */
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
        el('button',{class:'btn ok grande',id:'bNova',text:V.pausa?'Sair da pausa e simular nova ligação':'Simular nova ligação',onclick:novaLigacao}),
        el('p',{class:'muted',text:'O Hermes não está ligado neste protótipo. A tela funciona inteira sem ele, como deve funcionar no sistema.'})]);
      r.appendChild(box); return;
    }
    r.appendChild(el('div',{class:'chamada'},[
      el('div',{class:'chLinha'},[
        el('span',{class:'chNum',text:'193'}),
        el('span',{class:'chFone',text:A.fone}),
        el('span',{class:'chTimer',id:'timer',role:'timer','aria-label':'Tempo de ligação',text:'00:00'}),
        el('span',{class:'chip verde',id:'chipEnc',style:'display:none'}),
        el('span',{class:'chip cinza',text:'Hermes desligado'}),
        el('span',{class:'grow'}),
        el('button',{class:'btn laranja',text:'Transferir',onclick:function(){ A.erro='Transferência não faz parte deste protótipo.'; desenharCentro(); }}),
        el('button',{class:'btn verm',onclick:function(){ pedirEncerrar('enc'); }},['Encerrar']),
        el('button',{class:'btn vermv',onclick:function(){ pedirEncerrar('pausa'); }},['Encerrar e pausar'])]),
      el('div',{class:'chBarra','aria-hidden':'true'},[el('div',{id:'barra'}),el('span',{class:'marca',title:'60 s'})])]));
    r.appendChild(el('div',{id:'conf'}));
    r.appendChild(el('nav',{id:'passos','aria-label':'Passos do atendimento'}));
    r.appendChild(el('div',{class:'grade'},[el('main',{id:'centro'}),el('aside',{id:'ficha','aria-label':'Ficha da ocorrência'})]));
    relogio(); desenharConf(); desenharPassos(); desenharCentro(); desenharFicha();
  }
  function desenharConf(){
    var c=$('conf'); if(!c) return; c.textContent=''; if(!A||!A.conf) return;
    var fechar=function(){ A.conf=null; desenharConf(); };
    var k=A.conf,kids=[];
    if(k.tipo==='reg'){
      kids.push(el('div',{class:'confTxt'},[el('b',{text:'Faltam dados para o registro:'}),el('ul',{},k.faltas.map(function(x){ return el('li',{text:x}); }))]));
      kids.push(el('button',{class:'btn ok',text:'Registrar mesmo assim',onclick:function(){ registrar(true); }}));
      kids.push(el('button',{class:'btn',text:'Voltar e completar',onclick:fechar}));
    } else {
      var pausa=k.tipo==='pausa';
      kids.push(el('div',{class:'confTxt'},[el('b',{text:A.encS!=null?'A ocorrência foi encaminhada, mas a ficha ainda não foi registrada.':'Nada foi encaminhado. Encerrar agora descarta o que foi preenchido.'})]));
      if(A.encS!=null) kids.push(el('button',{class:'btn ok',text:'Registrar e '+(pausa?'pausar':'encerrar'),onclick:function(){ registrar(true,pausa?'pausa':''); }}));
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
      var feito=i<=A.max&&i!==A.passo,agora=i===A.passo,pode=feito&&(i===0||A.encS!=null);
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
    if(A.passo===0&&A.encS==null){ var ok=!faltasEncaminhar().length; kids.push(el('button',{class:'btn grande '+(ok?'ok':'apag'),id:'bEnc',onclick:encaminhar},['Encaminhar e avançar ',el('kbd',{text:'Ctrl+Enter'}),' ›'])); }
    else if(A.passo<3) kids.push(el('button',{class:'btn pri grande',onclick:avancar},['Próximo ',el('kbd',{text:'Alt+PgDn'}),' ›']));
    return el('div',{class:'nav'},kids);
  }
  function atualizarEnc(){ var f=faltasEncaminhar().length,b=$('bEnc'); if(b) b.className='btn grande '+(f?'apag':'ok'); if(!f&&A.erro){ A.erro=''; var m=document.querySelector('#centro > .msg.err'); if(m) m.remove(); } }
  function desenharCentro(){
    var c=$('centro'); if(!c||!A) return; c.textContent='';
    if(A.erro) c.appendChild(el('div',{class:'msg err',role:'alert',text:A.erro}));
    if(A.passo===0) passoLocal(c); else if(A.passo===1) passoEntrevista(c); else if(A.passo===2) passoSolicitante(c); else passoFechamento(c);
    c.appendChild(navBotoes());
  }
  function passoLocal(c){
    c.appendChild(el('h1',{class:'tit',text:'O que aconteceu e onde?'}));
    var dl=el('datalist',{id:'dlNat'},NATUREZAS.map(function(n){ return el('option',{value:n.nome}); }));
    var infoNat=el('span',{class:'apoio',id:'infoNat'});
    var pintaNat=function(){ var n=natPorId(A.nat); if(!A.natTxt.trim()) infoNat.textContent='Digite parte do nome e escolha na lista.'; else if(!n) infoNat.textContent='Natureza não reconhecida. Escolha uma da lista.'; else { var q=DB.protocolos[n.id].length; infoNat.textContent=!q?'Esta natureza ainda não tem entrevista cadastrada.':validar(DB.protocolos[n.id]).erros.length?'A entrevista desta natureza está com erros no editor e não será usada.':'Entrevista desta natureza: '+q+' itens.'; } };
    var iNat=el('input',{type:'text',id:'fNat',list:'dlNat',value:A.natTxt,autocomplete:'off','data-foco':A.natTxt?null:'1',placeholder:'Ex.: capotamento, incêndio',oninput:function(e){
      A.natTxt=e.target.value; var alvo=norm(A.natTxt),ach=NATUREZAS.filter(function(n){ return norm(n.nome)===alvo; })[0];
      var novo=ach?ach.id:''; if(novo!==A.nat){ A.nat=novo; A.resp={}; } pintaNat(); pintaDup(); atualizarEnc(); desenharFicha(); }});
    c.appendChild(campo('Natureza',iNat,[obrig()])); c.appendChild(dl); c.appendChild(infoNat); pintaNat();
    c.appendChild(campo('Local',el('input',{type:'text',id:'fLocal',value:A.local,autocomplete:'off',placeholder:'Via, número, quadra, sentido',oninput:function(e){ A.local=e.target.value; atualizarEnc(); desenharFicha(); }}),[obrig()]));
    var qt=el('input',{type:'text',id:'fQt',value:quartelAtual(),placeholder:'Preenchido pela região',oninput:function(e){ A.quartel=e.target.value; desenharFicha(); }});
    c.appendChild(el('div',{class:'tres'},[
      campo('UF',el('select',{id:'fUf',value:A.uf,onchange:function(e){ A.uf=e.target.value; desenharFicha(); }},UFS.map(function(u){ return el('option',{value:u,text:u}); })),[obrig()]),
      campo('Região administrativa',el('select',{id:'fRa',value:A.ra,onchange:function(e){ A.ra=e.target.value; if(!A.quartel) qt.value=quartelAuto(); pintaDup(); atualizarEnc(); desenharFicha(); }},[el('option',{value:'',text:'Selecione…'})].concat(RAS.map(function(x){ return el('option',{value:x,text:x}); }))),[obrig()]),
      el('div',{class:'campo'},[el('label',{class:'rot',for:'fQt',text:'Quartel'}),qt,el('span',{class:'apoio',text:'Preenchido pelo local. Altere só se precisar.'})])]));
    c.appendChild(campo('Ponto de referência',el('input',{type:'text',id:'fRef',value:A.ref,autocomplete:'off',placeholder:'Opcional',oninput:function(e){ A.ref=e.target.value; desenharFicha(); }})));
    var dup=el('div',{id:'dup'}); c.appendChild(dup);
    function pintaDup(){ dup.textContent=''; var o=duplicada(); if(o) dup.appendChild(el('div',{class:'msg inf',role:'status',text:'Possível mesma ocorrência: nº '+o.numero+', '+o.naturezaNome+', em '+o.local+' ('+o.ra+'), registrada há '+Math.max(1,Math.round((Date.now()-o.ts)/60000))+' min.'})); }
    pintaDup();
  }
  function opBtn(rot,on,fut,fn,tecla){ return el('button',{class:'op'+(on?' on':''),'aria-pressed':on?'true':'false',onclick:fn},[(on?'✓ ':'')+rot,tecla?el('span',{class:'tk',text:tecla}):null]); }
  function passoEntrevista(c){
    var P=protocolo(),n=natPorId(A.nat),ct=contagem(P);
    c.appendChild(el('div',{class:'titLinha'},[el('h1',{class:'tit semb',text:'Entrevista · '+(n?n.nome:'')}),P.est?el('span',{class:'muted',text:ct.n+' de '+ct.t+' perguntas respondidas'}):null]));
    if(P.vazio){ c.appendChild(el('div',{class:'msg inf',text:'Esta natureza ainda não tem entrevista cadastrada. Siga para o solicitante. O gestor cadastra as perguntas na aba Protocolos.'})); return; }
    if(P.erro){ c.appendChild(el('div',{class:'msg err',text:'O protocolo desta natureza está com erros no editor e não pode ser usado. Siga para o solicitante e avise o gestor.'})); return; }
    var lista=el('div',{class:'qlista'});
    P.lista.forEach(function(id){
      var it=P.g.item[id],r=A.resp[id],ans=respondido(it,r),cur=id===P.est.pendente,fut=P.est.path.indexOf(id)<0;
      var row=el('div',{class:'qrow'+(cur?' cur':'')+(fut?' fut':'')+' t-'+it.tipo});
      if(it.tipo==='instrucao'||it.tipo==='informacao'||it.tipo==='diagrama'){
        var bloco=el('div',{class:'bloco '+it.tipo},[
          el('span',{class:'bTag',text:it.tipo==='instrucao'?'Diga ao solicitante':it.tipo==='informacao'?'Para você, não ler ao solicitante':'Fluxograma de consulta'}),
          el('span',{class:'bTxt',text:it.texto})]);
        if(it.tipo==='diagrama'){ var d=el('div',{class:'diag'}); bloco.appendChild(d); if(!fut) desenhar(it.mermaid,d); }
        if(ans) bloco.appendChild(el('span',{class:'feito',text:it.tipo==='instrucao'?'✓ Dita':'✓ Ciente'}));
        else if(!fut) bloco.appendChild(el('button',{class:'btn '+(it.tipo==='instrucao'?'ok':'pri'),text:it.tipo==='instrucao'?'✓ Dito':'Ciente',onclick:function(){ responder(id,true); }}));
        row.appendChild(bloco);
      } else {
        var ctl=el('div',{class:'qctl'}),sel=(r&&r.ops)||[];
        if(it.tipo==='unica') it.opcoes.forEach(function(o,k){ var on=sel.indexOf(o.id)>=0; ctl.appendChild(opBtn(o.rotulo,on,fut,function(){ responder(id,on?null:{ops:[o.id]}); },cur&&k<9?String(k+1):'')); });
        else if(it.tipo==='multipla'){
          it.opcoes.forEach(function(o){ var on=sel.indexOf(o.id)>=0; ctl.appendChild(opBtn(o.rotulo,on,fut,function(){ var ops=sel.filter(function(x){return x!==o.id;}); if(!on) ops.push(o.id); var out=(r&&r.outro)||''; responder(id,(ops.length||out)?{ops:ops,outro:out}:null); })); });
          if(it.outro) ctl.appendChild(el('input',{type:'text',class:'curto',value:(r&&r.outro)||'',placeholder:'Outro: descreva','aria-label':'Outro, em '+it.texto,onchange:function(e){ var t=e.target.value.trim(); responder(id,(sel.length||t)?{ops:sel,outro:t}:null); }}));
        }
        else if(it.tipo==='lista') ctl.appendChild(el('select',{'aria-label':it.texto,value:sel[0]||'',onchange:function(e){ responder(id,e.target.value?{ops:[e.target.value]}:null); }},[el('option',{value:'',text:'Selecione…'})].concat(it.opcoes.map(function(o){ return el('option',{value:o.id,text:o.rotulo}); }))));
        else ctl.appendChild(el('input',{type:'text',class:'curto',inputmode:it.tipo==='numero'?'numeric':'text',value:(r&&r.valor)||'',placeholder:it.tipo==='numero'?'0':'Digite','aria-label':it.texto,
          onkeydown:function(e){ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } },
          onchange:function(e){ var x=e.target.value.trim(); if(it.tipo==='numero'&&x&&!/^\d+([.,]\d+)?$/.test(x)){ e.target.value=''; return; } responder(id,x?{valor:x}:null); }}));
        if(cur&&!it.obrig) ctl.appendChild(el('button',{class:'lnk',text:'Pular',onclick:function(){ responder(id,{pulada:true,ops:[]}); }}));
        if(r&&r.pulada) ctl.appendChild(el('span',{class:'muted',text:'pulada'}));
        row.appendChild(el('div',{class:'qlinha'},[el('span',{class:'qtxt'},[it.texto,it.obrig?obrig():null]),ctl]));
      }
      lista.appendChild(row);
    });
    c.appendChild(lista);
    if(!P.est.pendente) c.appendChild(el('div',{class:'msg okm',role:'status',text:'Entrevista concluída. Siga para o solicitante.'}));
  }
  function passoSolicitante(c){
    c.appendChild(el('h1',{class:'tit',text:'Quem está ligando?'}));
    var iNome=el('input',{type:'text',id:'fNome',value:A.nomeNI?'':A.nome,disabled:A.nomeNI,autocomplete:'off','data-foco':'1',placeholder:A.nomeNI?'Não informado':'Nome do solicitante',oninput:function(e){ A.nome=e.target.value; desenharFicha(); }});
    c.appendChild(el('div',{class:'campo'},[el('label',{class:'rot',for:'fNome',text:'Nome do solicitante'}),el('div',{class:'linhaBtn'},[iNome,el('button',{class:'btn '+(A.nomeNI?'pri':'azulv'),'aria-pressed':A.nomeNI?'true':'false',text:(A.nomeNI?'✓ ':'')+'Não informado',onclick:function(){ A.nomeNI=!A.nomeNI; desenharCentro(); desenharFicha(); foco(); }})])]));
    c.appendChild(campo('Telefone para retorno',el('input',{type:'text',id:'fTel',value:A.tel,autocomplete:'off',oninput:function(e){ A.tel=e.target.value; desenharFicha(); }})));
    c.appendChild(el('span',{class:'apoio',text:'O telefone veio da origem da chamada. Se o solicitante não disser o nome, marque “Não informado”.'}));
  }
  function passoFechamento(c){
    c.appendChild(el('h1',{class:'tit',text:'Relato'}));
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
    f.appendChild(el('div',{class:'fTopo'},[el('h2',{text:'Ficha da ocorrência'}),A.encS!=null?el('span',{class:'chip verde',text:'Encaminhada '+mmss(A.encS)}):el('span',{class:'chip cinza',text:'Não encaminhada'})]));
    var linha=function(rot,val,passo){ var vazio=!String(val||'').trim(); return el('div',{class:'fl'+(A.passo===passo?' at':'')},[el('div',{class:'flc'},[el('span',{class:'fr',text:rot}),el('span',{class:'fv'+(vazio?' vz':''),text:vazio?'—':val})]),el('button',{class:'caneta','aria-label':'Corrigir '+rot,title:'Corrigir',disabled:passo>0&&A.encS==null,onclick:function(){ ir(passo); }},['✎'])]); };
    f.appendChild(linha('Natureza',n?n.nome:'',0)); f.appendChild(linha('Local',A.local,0)); f.appendChild(linha('UF',A.uf,0));
    f.appendChild(linha('Região administrativa',A.ra,0)); f.appendChild(linha('Quartel',quartelAtual(),0)); f.appendChild(linha('Ponto de referência',A.ref,0));
    if(!n) f.appendChild(el('div',{class:'fgrupo',text:'Entrevista'})),f.appendChild(el('div',{class:'fnota',text:'As perguntas aparecem depois de definida a natureza.'}));
    else if(P.vazio||P.erro) f.appendChild(el('div',{class:'fgrupo',text:'Entrevista'})),f.appendChild(el('div',{class:'fnota',text:P.vazio?'Natureza sem entrevista cadastrada.':'Protocolo com erros.'}));
    else {
      f.appendChild(el('button',{class:'ftoggle','aria-expanded':A.entOpen?'true':'false',onclick:function(){ A.entOpen=!A.entOpen; desenharFicha(); }},[el('span',{'aria-hidden':'true',text:A.entOpen?'▾':'▸'}),el('span',{class:'ftl',text:'Entrevista'}),el('span',{class:'fts',text:ct.n+' de '+ct.t+' respondidas'})]));
      if(A.entOpen) P.lista.forEach(function(id){ var it=P.g.item[id]; if(P.est.path.indexOf(id)<0&&!respondido(it,A.resp[id])) { if(ehPergunta(it)) f.appendChild(linha(it.texto,'',1)); return; } if(it.tipo==='informacao'||it.tipo==='diagrama') return; f.appendChild(linha(it.tipo==='instrucao'?'Instrução: '+it.texto:it.texto,valorResposta(it,A.resp[id]),1)); });
    }
    f.appendChild(el('div',{class:'fgrupo',text:'Solicitante'}));
    f.appendChild(linha('Nome do solicitante',A.nomeNI?'Não informado':A.nome,2)); f.appendChild(linha('Telefone para retorno',A.tel,2));
    var rel=el('div',{class:'frel'});
    rel.appendChild(el('div',{class:'frelTopo'},[el('span',{class:'fr',text:'Relato'}),el('span',{class:'tag',text:A.relManual?'editado':'automático'}),el('button',{class:'caneta','aria-label':A.relEdit?'Concluir edição do relato':'Editar relato',onclick:function(){ A.relEdit=!A.relEdit; desenharFicha(); if(A.passo===3) desenharCentro(); }},[A.relEdit?'✓':'✎'])]));
    if(A.relEdit) rel.appendChild(el('textarea',{id:'relEd',rows:'6','aria-label':'Editar relato',value:relatoAtual(),oninput:function(e){ A.relato=e.target.value; A.relManual=true; var c2=$('fRel'); if(c2) c2.value=A.relato; }}));
    else rel.appendChild(el('span',{class:'fv',id:'relFicha',text:relatoAtual()||'—'}));
    f.appendChild(rel);
    f.appendChild(el('div',{class:'frel'},[el('label',{class:'fr',for:'obsF',text:'Observações do atendente'}),el('textarea',{id:'obsF',rows:'3',placeholder:'Algo a destacar para a equipe que vai atender a ocorrência',value:A.obs,oninput:function(e){ A.obs=e.target.value; }}),el('span',{class:'apoio',text:'Pode escrever a qualquer momento do atendimento.'})]));
    var pode=A.encS!=null;
    f.appendChild(el('div',{class:'frod'},[
      el('button',{class:'btn grande '+(pode?'ok':'apag'),id:'bReg',onclick:function(){ registrar(false); }},['Registrar ocorrência ✓ ',el('kbd',{text:'F8'})]),
      el('span',{class:'apoio',text:pode?(A.passo<3?'Se a ligação cair, registre com o que já tem.':'Confira os dados acima antes de registrar.'):'Liberado depois do encaminhamento.'})]));
    f.scrollTop=st; if(foc==='relEd'||foc==='obsF'){ var x=$(foc); if(x) x.focus(); }
  }
  function desenharAjuda(){
    var h=$('ajuda'); h.textContent=''; if(!V.help){ h.style.display='none'; return; } h.style.display='';
    var itens=[['Encaminhar e avançar (passo 1)','Ctrl+Enter'],['Próximo passo','Alt+PgDn'],['Passo anterior','Alt+PgUp'],['Responder a pergunta destacada','1 a 9'],['Registrar ocorrência','F8'],['Fechar confirmação ou esta ajuda','Esc'],['Abrir esta ajuda','F1']];
    h.appendChild(el('div',{class:'ajBox',role:'dialog','aria-label':'Atalhos de teclado'},[el('h2',{text:'Atalhos de teclado'}),el('table',{},itens.map(function(x){ return el('tr',{},[el('td',{text:x[0]}),el('td',{},[el('kbd',{text:x[1]})])]); })),el('button',{class:'btn pri',text:'Fechar',onclick:function(){ V.help=false; desenharAjuda(); }})]));
    h.querySelector('button').focus();
  }
  document.addEventListener('keydown',function(e){
    var k=e.key;
    if(k==='Escape'){ if(V.help){ V.help=false; desenharAjuda(); e.preventDefault(); return; } if(A&&A.conf){ A.conf=null; desenharConf(); e.preventDefault(); return; } }
    if(V.view!=='atend') return;
    if(k==='F1'){ e.preventDefault(); V.help=!V.help; desenharAjuda(); return; }
    if(!A||A.conf||V.help) return;
    if(e.ctrlKey&&k==='Enter'){ e.preventDefault(); if(A.passo===0) encaminhar(); return; }
    if(e.altKey&&k==='PageDown'){ e.preventDefault(); avancar(); return; }
    if(e.altKey&&k==='PageUp'){ e.preventDefault(); ir(A.passo-1); return; }
    if(k==='F8'){ e.preventDefault(); registrar(false); return; }
    var t=(e.target&&e.target.tagName)||''; var emTexto=t==='INPUT'||t==='TEXTAREA'||t==='SELECT';
    if(!emTexto&&A.passo===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&k>='1'&&k<='9'){
      var P=protocolo(); if(P.est&&P.est.pendente){ var it=P.g.item[P.est.pendente]; if(it.tipo==='unica'&&it.opcoes[+k-1]){ e.preventDefault(); responder(it.id,{ops:[it.opcoes[+k-1].id]}); } }
    }
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
        o.pendencias&&o.pendencias.length?el('div',{class:'msg inf',text:'Registrada com pendências: '+o.pendencias.join('; ')+'.'}):null]);
      r.appendChild(el('details',{class:'oc'},[el('summary',{},[el('b',{text:'Nº '+o.numero}),' · '+hora+' · '+o.naturezaNome+' · '+o.local+' ('+o.ra+')']),corpo]));
    });
  }
  function copiar(t){ try{ navigator.clipboard.writeText(t).then(function(){ status('Copiado'); },function(){ status('Não foi possível copiar; selecione o texto e copie.'); }); }catch(e){ status('Não foi possível copiar; selecione o texto e copie.'); } }

  /* ---------- protocolos (editor do gestor) ---------- */
  var S={nat:NATUREZAS[0].id,aba:'teste',resp:{},fluxo:'',fluxoSujo:false,form:'',formSujo:false,msg:null};
  Object.defineProperty(S,'itens',{get:function(){ return DB.protocolos[S.nat]; },set:function(v){ DB.protocolos[S.nat]=v; }});
  function mudou(estrutura){ S.resp={}; S.fluxoSujo=false; S.formSujo=false; salvar(); if(estrutura) desenharEditor(); desenharLado(); desenharNats(); }
  function desenharNats(){
    var n=$('pNats'); n.textContent='';
    n.appendChild(el('h2',{text:'Naturezas'}));
    n.appendChild(el('p',{class:'muted',text:'A lista é padronizada pelo sistema. O gestor edita só a entrevista de cada uma.'}));
    NATUREZAS.forEach(function(x){ var q=DB.protocolos[x.id].length,erro=q&&validar(DB.protocolos[x.id]).erros.length;
      n.appendChild(el('button',{class:'natBtn'+(x.id===S.nat?' on':''),'aria-current':x.id===S.nat?'true':null,onclick:function(){ S.nat=x.id; S.msg=null; S.resp={}; S.fluxoSujo=false; S.formSujo=false; desenharProt(); }},[el('span',{text:x.nome}),el('span',{class:'natQ'+(erro?' er':q?'':' vz'),text:erro?'com erros':q?q+' itens':'sem entrevista'})])); });
    var ta=el('textarea',{class:'code',style:'min-height:90px','aria-label':'Cópia de segurança dos protocolos em JSON',placeholder:'Cole aqui um JSON de protocolos para importar'});
    n.appendChild(el('h2',{style:'margin-top:16px',text:'Cópia dos protocolos'}));
    n.appendChild(el('div',{class:'row',style:'margin-top:8px'},[
      el('button',{class:'btn sm',text:'Copiar todos',onclick:function(){ copiar(JSON.stringify(DB.protocolos)); }}),
      el('button',{class:'btn sm',text:'Importar',onclick:function(){ try{ var o=JSON.parse(ta.value); if(!o||typeof o!=='object'||Array.isArray(o)) throw new Error('formato'); NATUREZAS.forEach(function(x){ if(Array.isArray(o[x.id])) DB.protocolos[x.id]=o[x.id]; }); salvar(); status('Protocolos importados'); desenharProt(); }catch(e){ status('JSON inválido: nada foi importado'); } }})]));
    n.appendChild(ta);
  }
  function desenharProt(){ desenharNats(); desenharEditor(); desenharLado(); }
  /* ---------- editor visual ---------- */
  function seletorDestino(valor,proprio,padrao,aria,aoMudar){
    var ops=[el('option',{value:'',text:padrao,selected:valor===''})];
    S.itens.forEach(function(x){ if(x.id!==proprio) ops.push(el('option',{value:x.id,text:'→ '+x.id,selected:valor===x.id})); });
    ops.push(el('option',{value:'FIM',text:'■ Fechamento',selected:valor==='FIM'}));
    return el('select',{'aria-label':aria,onchange:function(e){ aoMudar(e.target.value); mudou(false); }},ops);
  }
  function desenharItem(it,i){
    var box=el('div',{class:'item '+it.tipo});
    box.appendChild(el('div',{class:'row'},[
      el('input',{type:'text',class:'id',value:it.id,'aria-label':'Identificador',onchange:function(e){ var novo=slug(e.target.value); var u=usados(S.itens); delete u[it.id]; novo=idLivre(novo,u); renomear(S.itens,it.id,novo); it.id=novo; mudou(true); }}),
      el('select',{'aria-label':'Tipo do item '+it.id,onchange:function(e){ it.tipo=e.target.value; if(temOpcoes(it)&&it.opcoes.length<2) it.opcoes=[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; if(it.tipo==='diagrama'&&!it.mermaid) it.mermaid='flowchart LR\n  A[Chama amarela] --> B[Combustível comum]\n  C[Chama azul] --> D[Gás: não usar água]'; mudou(true); }},TIPOS.map(function(t){ return el('option',{value:t[0],text:t[1],selected:t[0]===it.tipo}); })),
      el('span',{class:'grow'}),
      el('button',{class:'btn ic','aria-label':'Mover para cima',text:'↑',onclick:function(){ if(i>0){ var x=S.itens[i]; S.itens[i]=S.itens[i-1]; S.itens[i-1]=x; mudou(true); } }}),
      el('button',{class:'btn ic','aria-label':'Mover para baixo',text:'↓',onclick:function(){ if(i<S.itens.length-1){ var x=S.itens[i]; S.itens[i]=S.itens[i+1]; S.itens[i+1]=x; mudou(true); } }}),
      el('button',{class:'btn ic del','aria-label':'Excluir '+it.id,text:'✕',onclick:function(){ S.itens.splice(i,1); mudou(true); }})]));
    box.appendChild(el('div',{class:'row',style:'margin-top:8px'},[el('input',{type:'text',class:'grow',value:it.texto,placeholder:it.tipo==='diagrama'?'Título do fluxograma':'Texto','aria-label':'Texto de '+it.id,oninput:function(e){ it.texto=e.target.value; mudou(false); }})]));
    if(it.tipo==='diagrama'){ var ta=el('textarea',{class:'code',style:'min-height:110px;margin-top:8px','aria-label':'Código Mermaid do fluxograma de consulta',spellcheck:'false'}); ta.value=it.mermaid||''; ta.addEventListener('input',function(){ it.mermaid=ta.value; mudou(false); }); box.appendChild(ta); }
    var linha=el('div',{class:'row',style:'margin-top:8px'});
    if(ehPergunta(it)) linha.appendChild(el('label',{class:'row',style:'gap:6px'},[el('input',{type:'checkbox',checked:!!it.obrig,onchange:function(e){ it.obrig=e.target.checked; mudou(false); }}),'Obrigatória']));
    if(it.tipo==='multipla') linha.appendChild(el('label',{class:'row',style:'gap:6px'},[el('input',{type:'checkbox',checked:!!it.outro,onchange:function(e){ it.outro=e.target.checked; mudou(false); }}),'Incluir “Outro”']));
    linha.appendChild(el('span',{class:'lbl',text:it.tipo==='multipla'?'Depois dos desvios:':temOpcoes(it)?'Depois (padrão):':'Depois:'}));
    linha.appendChild(seletorDestino(it.prox,it.id,'próximo da lista','Depois de '+it.id,function(v){ it.prox=v; }));
    box.appendChild(linha);
    if(temOpcoes(it)){
      var opts=el('div',{class:'opts'});
      it.opcoes.forEach(function(o,j){
        opts.appendChild(el('div',{class:'row'},[
          el('input',{type:'text',class:'id',style:'width:110px',value:o.id,'aria-label':'Identificador da opção',onchange:function(e){ var u={}; it.opcoes.forEach(function(x){ if(x!==o) u[x.id]=1; }); o.id=idLivre(e.target.value,u); mudou(true); }}),
          el('input',{type:'text',class:'grow',value:o.rotulo,'aria-label':'Rótulo da opção '+o.id,oninput:function(e){ o.rotulo=e.target.value; mudou(false); }}),
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
    ed.appendChild(el('div',{class:'row',style:'margin-top:10px'},TIPOS.filter(function(t){return ['unica','instrucao','informacao','diagrama'].indexOf(t[0])>=0;}).map(function(t){
      return el('button',{class:'btn dash sm',text:'+ '+({unica:'Pergunta',instrucao:'Instrução',informacao:'Informação',diagrama:'Fluxograma'})[t[0]],onclick:function(){ var id=idLivre(t[0]==='unica'?'pergunta':t[0],usados(S.itens)); var it=I(id,t[0],t[0]==='unica'?'Nova pergunta':t[0]==='diagrama'?'Fluxograma de consulta':'Novo texto'); if(t[0]==='unica') it.opcoes=[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; if(t[0]==='diagrama') it.mermaid='flowchart LR\n  A[Chama amarela] --> B[Combustível comum]\n  C[Chama azul] --> D[Gás: não usar água]'; S.itens.push(it); mudou(true); }}); })));
  }

  /* ---------- validação ---------- */
  function desenharValidacao(v){
    var d=$('pValid'); d.textContent='';
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
    var est=caminhar(S.itens,S.resp),g=grafo(S.itens),it=est.pendente?g.item[est.pendente]:null;
    p.appendChild(el('div',{class:'row',style:'justify-content:space-between'},[el('span',{class:'muted',text:'Percorrer o fluxo, um item por vez'+(it?' · item “'+it.id+'”':'')}),el('button',{class:'btn sm',text:'Recomeçar',onclick:function(){ S.resp={}; desenharLado(); }})]));
    var responder=function(r){ S.resp[it.id]=r; desenharLado(); };
    if(!it) p.appendChild(el('div',{class:'msg okm',style:'font-size:16px;font-weight:700',text:'Entrevista concluída. Segue para o fechamento.'}));
    else if(it.tipo==='instrucao'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Diga ao solicitante'})); p.appendChild(el('div',{class:'instr',text:it.texto})); p.appendChild(el('button',{class:'btn ok',text:'✓ Dito, continuar',onclick:function(){ responder(true); }})); }
    else if(it.tipo==='informacao'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Informação para você (não ler ao solicitante)'})); p.appendChild(el('div',{class:'info',text:it.texto})); p.appendChild(el('button',{class:'btn pri',text:'Ciente, continuar',onclick:function(){ responder(true); }})); }
    else if(it.tipo==='diagrama'){ p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Fluxograma de consulta'})); p.appendChild(el('div',{style:'font-weight:700;font-size:17px;margin:4px 0',text:it.texto})); var d=el('div',{class:'diag'}); p.appendChild(d); desenhar(it.mermaid,d); p.appendChild(el('button',{class:'btn pri',style:'margin-top:10px',text:'Ciente, continuar',onclick:function(){ responder(true); }})); }
    else {
      p.appendChild(el('div',{class:'q',text:it.texto+(it.obrig?' *':'')}));
      var a=el('div',{class:'ans'});
      if(it.tipo==='unica') it.opcoes.forEach(function(o){ a.appendChild(el('button',{class:'op',text:o.rotulo,onclick:function(){ responder({ops:[o.id]}); }})); });
      else if(it.tipo==='lista'){ var s=el('select',{'aria-label':it.texto},[el('option',{value:'',text:'Selecione…'})].concat(it.opcoes.map(function(o){ return el('option',{value:o.id,text:o.rotulo}); }))); a.appendChild(s); a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ if(s.value) responder({ops:[s.value]}); }})); }
      else if(it.tipo==='multipla'){
        var cs=it.opcoes.map(function(o){ var c=el('input',{type:'checkbox',value:o.id}); a.appendChild(el('label',{},[c,o.rotulo])); return c; });
        var out=null; if(it.outro){ out=el('input',{type:'text',placeholder:'Outro: descreva','aria-label':'Outro'}); a.appendChild(out); }
        a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ var m=cs.filter(function(c){return c.checked;}).map(function(c){return c.value;}); var t=out?out.value.trim():''; if(m.length||t) responder({ops:m,outro:t}); }}));
      } else { var inp=el('input',{type:'text',inputmode:it.tipo==='numero'?'numeric':'text',placeholder:it.tipo==='numero'?'0':'Digite a resposta','aria-label':it.texto}); a.appendChild(inp); a.appendChild(el('button',{class:'btn pri',text:'Confirmar',onclick:function(){ var x=inp.value.trim(); if(x&&(it.tipo!=='numero'||/^\d+$/.test(x))) responder({valor:x}); }})); }
      p.appendChild(a);
      if(!it.obrig) p.appendChild(el('button',{class:'btn sm',style:'margin-top:8px',text:'Pular (não obrigatória)',onclick:function(){ responder({pulada:true,ops:[]}); }}));
    }
    var feitos=est.path.filter(function(id){ return respondido(g.item[id],S.resp[id]); });
    if(feitos.length){
      var h=el('ul',{class:'hist','aria-label':'Caminho percorrido'});
      feitos.forEach(function(id){ var x=g.item[id],r=S.resp[id],val;
        if(!ehPergunta(x)) val=x.tipo==='instrucao'?'dito':'ciente'; else if(r.pulada) val='pulada'; else if(temOpcoes(x)) val=x.opcoes.filter(function(o){return r.ops.indexOf(o.id)>=0;}).map(function(o){return o.rotulo;}).concat(r.outro?[r.outro]:[]).join(', '); else val=r.valor;
        h.appendChild(el('li',{},[el('code',{text:id}),' '+(x.texto||'')+' ',el('b',{text:'→ '+val})])); });
      p.appendChild(h);
    }
  }
  /* ---------- fluxo (mermaid) ---------- */
  function painelFluxo(p,v){
    if(!S.fluxoSujo) S.fluxo=v.erros.length&&!S.fluxo?'':fluxoMermaid(S.itens,false);
    p.appendChild(el('div',{class:'muted'},['Só a ordem e as ramificações, ligando identificadores do formulário. O texto da seta é o identificador da opção. Um identificador novo cria o item: use ',el('code',{text:'id{"pergunta"}'}),', ',el('code',{text:'id["instrução"]'}),' ou ',el('code',{text:'id("informação")'}),'.']));
    var ta=el('textarea',{class:'code','aria-label':'Fluxo em Mermaid',spellcheck:'false',style:'margin-top:8px'}); ta.value=S.fluxo;
    ta.addEventListener('input',function(){ S.fluxo=ta.value; S.fluxoSujo=true; });
    p.appendChild(ta);
    var diag=el('div',{class:'diag'});
    p.appendChild(el('div',{class:'row',style:'margin-top:8px'},[
      el('button',{class:'btn pri',text:'Aplicar fluxo',onclick:function(){
        var r=aplicarFluxo(S.itens,ta.value);
        if(!r.itens||r.erros.length){ S.msg={t:'err',m:r.erros.slice(0,3).join(' ')}; S.fluxo=ta.value; S.fluxoSujo=true; desenharLado(); return; }
        S.itens=r.itens; S.msg={t:'okm',m:'Fluxo aplicado.'+(r.criados.length?' Criados no formulário: '+r.criados.join(', ')+'.':'')}; mudou(true); }}),
      el('button',{class:'btn',text:'Gerar do editor',onclick:function(){ S.fluxoSujo=false; S.msg=null; desenharLado(); }}),
      el('button',{class:'btn',text:'Copiar',onclick:function(){ copiar(ta.value); }})]));
    if(S.msg) p.appendChild(el('div',{class:'msg '+S.msg.t,text:S.msg.m}));
    p.appendChild(el('div',{class:'muted',style:'margin-top:10px',text:'Desenho (com os textos do formulário):'}));
    p.appendChild(diag); if(!v.erros.length) desenhar(fluxoMermaid(S.itens,true),diag); else diag.appendChild(el('span',{class:'muted',text:'Corrija os erros para ver o desenho.'}));
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
  + '<h3>4. Escrever o fluxo em Mermaid</h3>'
  + '<p>Na aba <b>Fluxo</b>, cada linha é uma seta entre identificadores. O texto no meio da seta é o identificador da opção.</p>'
  + '<pre>flowchart TD\n  preso -- sim --&gt; nao_remover\n  preso --&gt; vitimas\n  nao_remover --&gt; vitimas\n  vitimas --&gt; FIM</pre>'
  + '<p>Para rascunhar do zero, escreva o formato junto do identificador e o item é criado ao aplicar:</p>'
  + '<pre>fogo{"Tem fogo?"} -- Sim --&gt; afastar["Afaste todos do veículo."]\nfogo -- Não --&gt; FIM\nafastar --&gt; gas("Chama azul pode indicar gás.") --&gt; FIM</pre>'
  + '<table><tr><th>Formato</th><th>Cria</th></tr><tr><td><code>id{"texto"}</code></td><td>Pergunta de escolha única</td></tr><tr><td><code>id["texto"]</code></td><td>Instrução ao solicitante</td></tr><tr><td><code>id("texto")</code></td><td>Informação ao atendente</td></tr><tr><td><code>id[["texto"]]</code></td><td>Fluxograma de consulta</td></tr><tr><td><code>FIM</code></td><td>Fechamento</td></tr></table>'
  + '<p>Depois de aplicar, ajuste no editor o tipo de resposta, a obrigatoriedade e os rótulos.</p>'
  + '<h3>5. Escrever o formulário em JSON</h3>'
  + '<p>Na aba <b>Formulário</b>, cada identificador tem tipo, texto e, nas perguntas com opções, a lista de opções.</p>'
  + '<pre>{\n  "preso": {\n    "tipo": "unica",\n    "texto": "Tem alguém preso?",\n    "obrigatoria": true,\n    "opcoes": [\n      { "id": "sim", "rotulo": "Sim" },\n      { "id": "nao", "rotulo": "Não" }\n    ]\n  },\n  "vitimas": { "tipo": "numero", "texto": "Quantas vítimas?" }\n}</pre>'
  + '<p>Tipos aceitos: <code>unica</code>, <code>multipla</code>, <code>lista</code>, <code>numero</code>, <code>texto</code>, <code>instrucao</code>, <code>informacao</code>, <code>diagrama</code>.</p>'
  + '<h3>6. Mensagens da validação</h3><table><tr><th>Mensagem</th><th>O que fazer</th></tr>'
  + '<tr><td>“aponta para …, que não existe”</td><td>O fluxo cita um identificador que não está no formulário. Crie o item ou corrija o nome.</td></tr>'
  + '<tr><td>“O fluxo tem um ciclo”</td><td>Algum caminho volta para um item anterior. Toda entrevista precisa chegar ao fechamento.</td></tr>'
  + '<tr><td>“nenhum caminho chega até ele”</td><td>O item existe, mas nada aponta para ele. Ligue-o a alguma opção ou exclua.</td></tr>'
  + '<tr><td>“o desvio não volta para …”</td><td>Em múltipla escolha, o ramo termina sem voltar ao tronco. Aponte o último item do ramo para o item de “Depois dos desvios”.</td></tr></table>'
  + '<h3>7. Boas práticas</h3><ul>'
  + '<li>Pergunte primeiro o que muda o recurso enviado ou a instrução dada.</li>'
  + '<li>Uma pergunta por item, com texto curto, do jeito que o atendente fala.</li>'
  + '<li>Marque como obrigatória só a pergunta sem a qual não dá para registrar.</li>'
  + '<li>Inclua “Não sabe” quando o solicitante puder não ter a resposta.</li>'
  + '<li>O texto de instruções de primeiros socorros deve ser validado pela área técnica antes de publicar.</li></ul>'
  + '</div>';
  function desenharLado(){
    Array.prototype.forEach.call(document.querySelectorAll('#pTabs button'),function(b){ var on=b.getAttribute('data-tab')===S.aba; b.className=on?'on':''; b.setAttribute('aria-selected',on?'true':'false'); });
    var p=$('pPanel'); p.textContent='';
    if(!S.itens.length&&S.aba!=='manual'&&S.aba!=='fluxo'&&S.aba!=='form'){ $('pValid').textContent=''; p.appendChild(el('div',{class:'muted',text:'Sem itens para testar. Crie o primeiro item no editor, ou escreva o fluxo na aba Fluxo.'})); return; }
    var v=S.itens.length?validar(S.itens):{erros:[],avisos:[]}; if(S.itens.length) desenharValidacao(v); else $('pValid').textContent='';
    if(S.aba==='teste') painelTeste(p,v); else if(S.aba==='fluxo') painelFluxo(p,v); else if(S.aba==='manual') p.innerHTML=MANUAL; else painelForm(p);
  }
  function desenharEditorTopo(ed){
    var n=natPorId(S.nat),ex=exemplos()[S.nat];
    ed.appendChild(el('div',{class:'row'},[el('h2',{class:'grow',text:'Entrevista · '+n.nome}),
      ex?el('button',{class:'btn sm',text:'Restaurar exemplo',onclick:function(){ S.itens=ex; S.msg=null; mudou(true); }}):null,
      el('button',{class:'btn sm del',text:'Remover entrevista',onclick:function(){ S.itens=[]; S.msg=null; mudou(true); }})]));
    ed.appendChild(el('div',{class:'muted',style:'margin-top:6px',text:'Cada item tem um identificador. O primeiro da lista inicia a entrevista. Em “Depois” e em cada opção você escolhe para onde o fluxo vai. O que você muda aqui vale na próxima ligação da aba Atendimento.'}));
    if(!S.itens.length) ed.appendChild(el('div',{class:'msg inf',text:'Esta natureza está sem entrevista: no atendimento, o passo Entrevista avisa e segue direto para o solicitante. Use os botões abaixo para criar o primeiro item.'}));
  }

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
