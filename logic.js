/* ===== LÓGICA PURA (sem DOM) =====
   Item: {id, tipo, texto, obrig, outro, mermaid, prox, opcoes:[{id, rotulo, vai}]}
   prox: '' = próximo da lista; id; 'FIM'.   vai: '' = segue o padrão do item; id; 'FIM'. */
var TIPOS = [['unica','Pergunta · escolha única'],['multipla','Pergunta · múltipla escolha'],['lista','Pergunta · lista de seleção'],['numero','Pergunta · número'],['texto','Pergunta · texto curto'],['instrucao','Instrução ao solicitante'],['informacao','Informação ao atendente'],['diagrama','Fluxograma de consulta'],['troca','Troca de natureza'],['bloco','Bloco reutilizável']];
function temOpcoes(it){ return it.tipo==='unica'||it.tipo==='multipla'||it.tipo==='lista'; }
function ehPergunta(it){ return temOpcoes(it)||it.tipo==='numero'||it.tipo==='texto'; }
function slug(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,28)||'item'; }
function idLivre(base,usados){ var b=slug(base); if(/^fim$/.test(b)) b='item_fim'; var id=b,n=2; while(usados[id]){ id=b+'_'+n; n++; } usados[id]=1; return id; }
function usados(itens){ var u={}; itens.forEach(function(i){u[i.id]=1;}); return u; }
function I(id,tipo,texto,x){ var it={id:id,tipo:tipo,texto:texto,obrig:false,outro:false,mermaid:'',prox:'',opcoes:[]}; for(var k in (x||{})) it[k]=x[k]; return it; }
function O(id,rotulo,vai){ return {id:id,rotulo:rotulo,vai:vai||''}; }
function exemplo(){
  return [
    I('preso','unica','Tem alguém preso dentro do veículo?',{obrig:true,prox:'vitimas',opcoes:[O('sim','Sim','nao_remover'),O('nao','Não'),O('nao_sabe','Não sabe')]}),
    I('nao_remover','instrucao','Não tente tirar a pessoa de dentro do carro. Peça para ela não se mexer.'),
    I('preso_consciente','unica','A vítima presa está consciente?',{opcoes:[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]}),
    I('vitimas','numero','Quantas vítimas?',{obrig:true}),
    I('risco','multipla','Há risco no local?',{outro:true,prox:'aguarde',opcoes:[O('fogo','Fogo ou fumaça','afastar'),O('combustivel','Vazamento de combustível','afastar'),O('pista','Veículo sobre a pista','sinalizar'),O('nenhum','Nenhum')]}),
    I('afastar','instrucao','Afaste todos do veículo agora.'),
    I('cor_chamas','unica','Qual a cor das chamas?',{prox:'aguarde',opcoes:[O('amarela','Amarela ou laranja'),O('azul','Azul','info_gas'),O('nao_ve','Não vê chamas')]}),
    I('info_gas','informacao','Chama azul pode indicar gás (GNV). Avise a guarnição e não oriente uso de água.',{prox:'aguarde'}),
    I('sinalizar','instrucao','Se for seguro, ligue o pisca-alerta e sinalize a pista antes do carro.',{prox:'aguarde'}),
    I('aguarde','instrucao','Fique em local seguro e aguarde as viaturas.',{prox:'FIM'})
  ];
}
/* resolve '' em destinos concretos */
function grafo(itens){
  var g={inicio:itens.length?itens[0].id:null,def:{},op:{},item:{}};
  itens.forEach(function(it,i){
    g.item[it.id]=it;
    g.def[it.id]=it.prox||(i+1<itens.length?itens[i+1].id:'FIM');
    g.op[it.id]={};
    if(temOpcoes(it)) it.opcoes.forEach(function(o){ if(o.vai) g.op[it.id][o.id]=o.vai; });
  });
  return g;
}
function vizinhos(g,id){ var v=[]; var it=g.item[id]; if(!it) return v; Object.keys(g.op[id]).forEach(function(k){ v.push(g.op[id][k]); }); var todas=it.tipo!=='multipla'&&temOpcoes(it)&&it.opcoes.length&&it.opcoes.every(function(o){return o.vai;}); if(!todas) v.push(g.def[id]); return v; }
function alcanca(g,de,alvo){ var visto={},fila=[de]; while(fila.length){ var x=fila.shift(); if(x===alvo) return true; if(x==='FIM'||visto[x]||!g.item[x]) continue; visto[x]=1; vizinhos(g,x).forEach(function(y){fila.push(y);}); } return false; }
function validar(itens){
  var erros=[],avisos=[],vistos={};
  if(!itens.length){ erros.push('A entrevista está vazia.'); return {erros:erros,avisos:avisos}; }
  itens.forEach(function(it){
    if(!it.id||!/^[a-z0-9_]+$/.test(it.id)) erros.push('Identificador inválido: “'+it.id+'” (use letras minúsculas, números e _).');
    else if(it.id==='fim') erros.push('“fim” é reservado para o fechamento.');
    else if(vistos[it.id]) erros.push('Identificador repetido: “'+it.id+'”.');
    vistos[it.id]=1;
    if(it.tipo==='diagrama'){ if(!String(it.mermaid||'').trim()) erros.push('“'+it.id+'”: fluxograma de consulta sem código.'); }
    else if(!String(it.texto||'').trim()) erros.push('“'+it.id+'”: sem texto.');
    if(temOpcoes(it)){
      if(it.opcoes.length<2) erros.push('“'+it.id+'”: informe pelo menos 2 opções.');
      var vo={}; it.opcoes.forEach(function(o){ if(!o.id||vo[o.id]) erros.push('“'+it.id+'”: opção com identificador vazio ou repetido (“'+o.id+'”).'); vo[o.id]=1; if(!String(o.rotulo||'').trim()) erros.push('“'+it.id+'”: opção sem rótulo.'); });
    }
  });
  if(erros.length) return {erros:erros,avisos:avisos};
  var g=grafo(itens);
  itens.forEach(function(it){
    var alvo=function(t,de){ if(t!=='FIM'&&!g.item[t]) erros.push('“'+de+'” aponta para “'+t+'”, que não existe no formulário.'); };
    alvo(g.def[it.id],it.id);
    Object.keys(g.op[it.id]).forEach(function(k){ alvo(g.op[it.id][k],it.id+' / '+k); });
  });
  if(erros.length) return {erros:erros,avisos:avisos};
  var cor={},ciclo=null;
  (function dfs(id,trilha){ if(id==='FIM'||ciclo) return; if(cor[id]===1){ ciclo=trilha.slice(trilha.indexOf(id)).concat(id).join(' → '); return; } if(cor[id]===2) return; cor[id]=1; vizinhos(g,id).forEach(function(y){ dfs(y,trilha.concat(id)); }); cor[id]=2; })(g.inicio,[]);
  if(ciclo) erros.push('O fluxo tem um ciclo: '+ciclo+'. A entrevista precisa chegar ao fechamento.');
  itens.forEach(function(it){ if(!cor[it.id]) avisos.push('“'+it.id+'” está no formulário, mas nenhum caminho do fluxo chega até ele.'); });
  if(!ciclo) itens.forEach(function(it){ if(it.tipo!=='multipla') return; var j=g.def[it.id]; Object.keys(g.op[it.id]).forEach(function(k){ var t=g.op[it.id][k]; if(j!=='FIM'&&t!=='FIM'&&!alcanca(g,t,j)) avisos.push('“'+it.id+' / '+k+'”: o desvio não volta para “'+j+'”; a entrevista termina nesse ramo.'); }); });
  return {erros:erros,avisos:avisos};
}
/* Motor: caminha pelo grafo conforme as respostas. Para na primeira pendência. */
function respondido(it,r){
  if(!ehPergunta(it)) return r===true;
  if(!r) return false;
  if(temOpcoes(it)) return (r.ops&&r.ops.length>0)||(!!r.outro&&String(r.outro).trim()!=='')||r.pulada===true;
  return r.pulada===true||(r.valor!==undefined&&String(r.valor).trim()!=='');
}
function caminhar(itens,resp){
  var g=grafo(itens),path=[],pend=null,passos=0;
  function ir(cur,parar){
    while(true){
      if(cur==='FIM'||!g.item[cur]) return 'fim';
      if(cur===parar) return 'volta';
      if(++passos>500) return 'fim';
      var it=g.item[cur],r=resp[cur]; if(path.indexOf(cur)<0) path.push(cur);
      if(!respondido(it,r)){ pend=cur; return 'pend'; }
      if(it.tipo==='multipla'){
        var junta=g.def[cur],ops=(r.ops||[]);
        for(var k=0;k<it.opcoes.length;k++){ var o=it.opcoes[k]; if(ops.indexOf(o.id)<0||!g.op[cur][o.id]) continue; var res=ir(g.op[cur][o.id],junta); if(res!=='volta') return res; }
        cur=junta;
      } else if(temOpcoes(it)){ var e=r.ops&&r.ops[0]; cur=(e&&g.op[cur][e])||g.def[cur]; }
      else cur=g.def[cur];
    }
  }
  var fim=g.inicio?ir(g.inicio,null):'fim';
  return {path:path,pendente:pend,fim:fim==='fim'};
}
/* Mermaid: só o fluxo, com identificadores. comRotulos inclui os textos para o desenho. */
function aspas(s){ return '"'+String(s).replace(/"/g,"'").replace(/\n/g,' ')+'"'; }
function fluxoMermaid(itens,comRotulos){
  var g=grafo(itens),L=['flowchart TD'];
  if(comRotulos) itens.forEach(function(it){ var t=aspas((it.tipo==='diagrama'?'Fluxograma: ':'')+(it.texto||it.id)); L.push('  '+it.id+(temOpcoes(it)||it.tipo==='numero'||it.tipo==='texto'?'{'+t+'}':it.tipo==='informacao'?'('+t+')':it.tipo==='diagrama'?'[['+t+']]':it.tipo==='troca'?'{{'+aspas('Trocar natureza: '+it.texto)+'}}':'['+t+']')); });
  var vivo={}; (function v(id){ if(id==='FIM'||vivo[id]||!g.item[id]) return; vivo[id]=1; vizinhos(g,id).forEach(v); })(g.inicio);
  itens.forEach(function(it){
    if(!vivo[it.id]) return;
    var rot={}; it.opcoes.forEach(function(o){ rot[o.id]=o.rotulo; });
    Object.keys(g.op[it.id]).forEach(function(k){ L.push('  '+it.id+' -- '+(comRotulos?aspas(rot[k]||k):k)+' --> '+g.op[it.id][k]); });
    var todas=it.tipo!=='multipla'&&temOpcoes(it)&&it.opcoes.length&&it.opcoes.every(function(o){return o.vai;});
    if(!todas) L.push('  '+it.id+' --> '+g.def[it.id]);
  });
  if(comRotulos) L.push('  FIM(["Fechamento"])');
  return L.join('\n');
}
/* Aplica um fluxo Mermaid sobre o formulário atual. Cria o que faltar. */
function aplicarFluxo(itensAtuais,src){
  var itens=JSON.parse(JSON.stringify(itensAtuais)),erros=[],criados=[];
  var strs=[];
  var txt=String(src).replace(/"([^"]*)"/g,function(_,s){ strs.push(s); return '\u0001'+(strs.length-1)+'\u0001'; });
  var rest=function(s){ return String(s==null?'':s).replace(/\u0001(\d+)\u0001/g,function(_,i){ return strs[+i]; }).trim(); };
  var nos={},ordem=[],arestas=[];
  function no(tok){
    tok=tok.trim().replace(/:::[\w-]+\s*$/,'').trim(); if(!tok) return null;
    var m=tok.match(/^([A-Za-z0-9_À-ſ]+)\s*([\s\S]*)$/); if(!m) return null;
    var bruto=m[1],forma=m[2].trim(),id=/^fim$/i.test(bruto)?'FIM':slug(bruto),tipo=null,texto=null;
    if(forma){
      if(/^\{\{/.test(forma)){ tipo='troca'; texto=forma.replace(/^\{+/,'').replace(/\}+$/,''); }
      else if(forma[0]==='{'){ tipo='unica'; texto=forma.replace(/^\{+/,'').replace(/\}+$/,''); }
      else if(/^\(\[/.test(forma)||/^\(\(/.test(forma)){ tipo='fim'; texto=''; }
      else if(/^\[\[/.test(forma)){ tipo='diagrama'; texto=forma.replace(/^\[+/,'').replace(/\]+$/,''); }
      else if(forma[0]==='('){ tipo='informacao'; texto=forma.replace(/^\(+/,'').replace(/\)+$/,''); }
      else if(forma[0]==='['){ tipo='instrucao'; texto=forma.replace(/^\[+/,'').replace(/\]+$/,''); }
      else return null;
      texto=rest(texto);
    }
    if(tipo==='fim') id='FIM';
    if(!nos[id]){ nos[id]={id:id,tipo:null,texto:null}; ordem.push(id); }
    if(tipo&&tipo!=='fim'){ nos[id].tipo=tipo; nos[id].texto=texto; }
    return id;
  }
  txt.split(/\r?\n|;/).forEach(function(linha,n){
    var l=linha.replace(/%%.*$/,'').trim();
    if(!l||/^(flowchart|graph|classDef|class |style |linkStyle|subgraph|end$|direction|click )/i.test(l)) return;
    var partes=[],rots=[],re=/\s*(?:--+\s*([^->|][^>|]*?)\s*--+>|(?:--+>|---+)\s*(?:\|([^|]*)\|)?)\s*/g,ult=0,m;
    while((m=re.exec(l))){ partes.push(l.slice(ult,m.index)); rots.push(rest(m[1]||m[2]||'')); ult=re.lastIndex; }
    partes.push(l.slice(ult));
    var ids=partes.map(no);
    if(ids.some(function(x){return !x;})){ erros.push('Linha '+(n+1)+' não reconhecida: '+rest(l).slice(0,60)); return; }
    for(var k=0;k<rots.length;k++) arestas.push({de:ids[k],para:ids[k+1],rot:rots[k]});
  });
  var nomes=ordem.filter(function(id){return id!=='FIM';});
  if(!nomes.length) return {itens:null,erros:erros.length?erros:['Nenhum item encontrado. Comece com “flowchart TD”.'],criados:[]};
  var porId={}; itens.forEach(function(it){ porId[it.id]=it; it.prox='FIM'; it.opcoes.forEach(function(o){ o.vai=''; }); });
  var rotulada={}; arestas.forEach(function(a){ if(a.rot) rotulada[a.de]=1; });
  nomes.forEach(function(id){
    var n=nos[id];
    if(!porId[id]){ var tipo=n.tipo||(rotulada[id]?'unica':'instrucao'); if(rotulada[id]&&tipo!=='unica') tipo='unica'; porId[id]=I(id,tipo,n.texto||id,{prox:'FIM',mermaid:tipo==='diagrama'?'flowchart TD\n  A --> B':''}); itens.push(porId[id]); criados.push(id); }
    else if(n.texto&&n.texto!==id) porId[id].texto=n.texto;
  });
  arestas.forEach(function(a){
    if(a.de==='FIM') return;
    var it=porId[a.de];
    if(!a.rot){ it.prox=a.para; return; }
    if(!temOpcoes(it)){ erros.push('“'+a.de+'” não é pergunta com opções, mas a seta tem o rótulo “'+a.rot+'”.'); return; }
    var alvo=slug(a.rot),o=it.opcoes.filter(function(x){ return x.id===a.rot||x.id===alvo||slug(x.rotulo)===alvo; })[0];
    if(!o){ o=O(idLivre(a.rot,(function(){var u={};it.opcoes.forEach(function(x){u[x.id]=1;});return u;})()),a.rot,''); it.opcoes.push(o); criados.push(a.de+' / '+o.id); }
    o.vai=a.para;
  });
  var entra={}; arestas.forEach(function(a){ entra[a.para]=1; });
  var ini=nomes.filter(function(id){return !entra[id];})[0]||nomes[0];
  var seq=[ini].concat(nomes.filter(function(id){return id!==ini;}));
  var fora=itens.filter(function(it){ return seq.indexOf(it.id)<0; });
  itens=seq.map(function(id){return porId[id];}).concat(fora);
  itens.forEach(function(it){ if(criados.indexOf(it.id)>=0&&it.tipo==='unica'&&!it.opcoes.length) it.opcoes=[O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; });
  return {itens:itens,erros:erros,criados:criados};
}
/* JSON: só o formulário, sem o fluxo */
function formJSON(itens){
  var o={}; itens.forEach(function(it){ var x={tipo:it.tipo};
    if(it.tipo==='diagrama'){ x.titulo=it.texto; x.mermaid=it.mermaid; } else x.texto=it.texto;
    if(ehPergunta(it)&&it.obrig) x.obrigatoria=true;
    if(it.despacho) x.despacho=true; if(it.video) x.videochamada=true; if(it.relato===false) x.relato=false;
    if(temOpcoes(it)){ x.opcoes=it.opcoes.map(function(p){ var q={id:p.id,rotulo:p.rotulo}; if(p.relato===false) q.relato=false; return q; }); if(it.outro) x.permiteOutro=true; }
    o[it.id]=x; });
  return JSON.stringify(o,null,2);
}
function aplicarForm(itensAtuais,src){
  var o=JSON.parse(src); if(!o||typeof o!=='object'||Array.isArray(o)) throw new Error('O JSON deve ser um objeto: { "identificador": { ... } }.');
  var ant={}; itensAtuais.forEach(function(it){ ant[it.id]=it; });
  var tipos=TIPOS.map(function(t){return t[0];});
  return Object.keys(o).map(function(id){
    var x=o[id]||{},a=ant[id];
    if(tipos.indexOf(x.tipo)<0) throw new Error('“'+id+'”: tipo inválido “'+x.tipo+'”.');
    var it=I(id,x.tipo,x.tipo==='diagrama'?(x.titulo||''):(x.texto||''),{obrig:!!x.obrigatoria,outro:!!x.permiteOutro,mermaid:x.mermaid||'',prox:a?a.prox:''}); if(x.despacho) it.despacho=true; if(x.videochamada) it.video=true; if(x.relato===false) it.relato=false;
    if(temOpcoes(it)) it.opcoes=(x.opcoes||[]).map(function(p){ var pa=a?a.opcoes.filter(function(q){return q.id===p.id;})[0]:null; var op=O(p.id,p.rotulo,pa?pa.vai:''); if(p.relato===false) op.relato=false; return op; });
    return it;
  });
}
function renomear(itens,de,para){ itens.forEach(function(it){ if(it.prox===de) it.prox=para; it.opcoes.forEach(function(o){ if(o.vai===de) o.vai=para; }); }); }
/* ===== NATUREZAS (lista ilustrativa, padronizada pelo sistema) e protocolos de exemplo ===== */
var NATUREZAS = [
  {id:'capotamento',nome:'Acidente de trânsito · Capotamento'},
  {id:'colisao',nome:'Acidente de trânsito · Colisão'},
  {id:'atropelamento',nome:'Acidente de trânsito · Atropelamento'},
  {id:'inc_vegetacao',nome:'Incêndio · Vegetação'},
  {id:'inc_edificacao',nome:'Incêndio · Edificação'},
  {id:'pcr',nome:'Emergência médica · Parada cardiorrespiratória'},
  {id:'engasgo',nome:'Emergência médica · Engasgo'},
  {id:'adrica',nome:'Serviço · Colocação de adriça'}
];
var SNS = function(){ return [O('sim','Sim'),O('nao','Não'),O('nao_sabe','Não sabe')]; };
function exemplos(){
  return {
    capotamento: [
      I('preso','unica','Tem alguém preso dentro do veículo?',{obrig:true,prox:'feridos',opcoes:[O('sim','Sim','nao_remover'),O('nao','Não'),O('nao_sabe','Não sabe')]}),
      I('nao_remover','instrucao','Não tente tirar a pessoa de dentro do carro. Peça para ela não se mexer, principalmente o pescoço.'),
      I('sinalizar','instrucao','Se for seguro, ligue o pisca-alerta e sinalize a pista antes do carro.',{prox:'feridos'}),
      I('feridos','lista','Quantas pessoas estão feridas?',{obrig:true,opcoes:[O('nenhuma','Nenhuma'),O('1','1'),O('2','2'),O('3_ou_mais','3 ou mais'),O('nao_sabe','Não sabe')]}),
      I('inconsciente','unica','Alguma vítima está inconsciente?',{opcoes:SNS()}),
      I('riscos','multipla','Há algum destes riscos no local?',{outro:true,prox:'veiculos',opcoes:[O('fogo','Fogo ou fumaça','afastar'),O('combustivel','Vazamento de combustível','afastar'),O('produto','Carga perigosa ou produto químico','info_produto'),O('nenhum','Nenhum')]}),
      I('afastar','instrucao','Afaste todos do veículo agora e não deixe ninguém fumar por perto.',{prox:'veiculos'}),
      I('info_produto','informacao','Produto perigoso: peça o número do painel laranja, se der para ver de longe, e anote nas observações.',{prox:'veiculos'}),
      I('veiculos','unica','Quantos veículos estão envolvidos?',{opcoes:[O('1','1'),O('2','2'),O('3_ou_mais','3 ou mais')]}),
      I('via','unica','A via está bloqueada?',{opcoes:[O('sim','Sim'),O('parcial','Parcialmente'),O('nao','Não')]}),
      I('placa','texto','Qual é a placa do veículo?',{prox:'FIM'})
    ],
    inc_vegetacao: [
      I('ameaca','multipla','O fogo está perto de quê?',{obrig:true,outro:true,prox:'tamanho',opcoes:[O('casas','Casas ou edificações','afastar_casas'),O('rede','Rede elétrica'),O('rodovia','Rodovia','info_fumaca'),O('nada','Nada por perto')]}),
      I('afastar_casas','instrucao','Peça para as pessoas saírem das casas próximas e ficarem longe da fumaça.',{prox:'tamanho'}),
      I('info_fumaca','informacao','Fumaça sobre rodovia: avise o despacho para acionar o órgão de trânsito.',{prox:'tamanho'}),
      I('tamanho','unica','Qual o tamanho da área queimando?',{opcoes:[O('pequena','Pequena (um lote)'),O('media','Média (um campo de futebol)'),O('grande','Grande (maior que isso)'),O('nao_sabe','Não sabe')]}),
      I('pessoas','unica','Há pessoas ou animais em risco?',{opcoes:SNS()}),
      I('acesso','texto','Qual o melhor acesso para a viatura?',{prox:'FIM'})
    ],
    adrica: [
      I('local_mastro','unica','O mastro fica em área interna ou externa?',{opcoes:[O('interna','Interna'),O('externa','Externa')]}),
      I('altura','numero','Qual a altura aproximada do mastro, em metros?'),
      I('agendar','informacao','Serviço sem urgência: informe que o atendimento será agendado conforme disponibilidade.',{prox:'FIM'})
    ]
  };
}
/* ===== BLOCOS REUTILIZÁVEIS =====
   Item {tipo:'bloco', bloco:<id do bloco>, texto:<nome>, prox}. O bloco é uma lista de itens como a de uma natureza.
   Dentro do bloco, o destino 'SAIDA' (e o fim da lista) continua para o "depois" do item que usa o bloco;
   'FIM' encerra a entrevista. expandir() devolve a lista plana que o atendimento usa: os itens do bloco entram
   no lugar, com identificadores <item do bloco na natureza>__<item dentro do bloco>. getBloco(id) -> {nome, itens}. */
function expandir(itens,getBloco,_pref,_saida,_prof){
  _pref=_pref||''; _prof=_prof||0; itens=itens||[];
  var emBloco=_saida!=null,porId={},def={},exp={},emCurso={};
  itens.forEach(function(x,i){ porId[x.id]=x; def[x.id]=x.prox||(i+1<itens.length?itens[i+1].id:(emBloco?'SAIDA':'FIM')); });
  function alvo(t,guarda){
    if(t==='FIM') return 'FIM';
    if(t==='SAIDA') return emBloco?_saida:'FIM';
    var x=porId[t]; if(!x) return _pref+t;
    if(x.tipo!=='bloco') return _pref+t;
    guarda=guarda||{}; if(guarda[t]) return 'FIM'; guarda[t]=1;
    var e=expBloco(t); return e.length?e[0].id:alvo(def[t],guarda);
  }
  function expBloco(id){
    if(exp[id]) return exp[id];
    if(emCurso[id]) return [];
    emCurso[id]=1;
    var x=porId[id],B=getBloco?getBloco(x.bloco):null,saida=alvo(def[id]),r;
    if(!B||_prof>6) r=[I(_pref+id,'informacao','Bloco “'+(x.texto||x.bloco||'?')+'” não encontrado na biblioteca de blocos.',{prox:saida})];
    else { r=expandir(B.itens,getBloco,_pref+id+'__',saida,_prof+1); r.forEach(function(y){ if(!y._doBloco) y._doBloco=B.nome||x.texto; }); }
    exp[id]=r; return r;
  }
  var out=[];
  itens.forEach(function(x){
    if(x.tipo==='bloco'){ out=out.concat(expBloco(x.id)); return; }
    var y=JSON.parse(JSON.stringify(x)); y.id=_pref+x.id; y.prox=alvo(def[x.id]);
    y.opcoes.forEach(function(o){ if(o.vai) o.vai=alvo(o.vai); });
    out.push(y);
  });
  return out;
}
function temBlocos(itens){ return (itens||[]).some(function(x){ return x.tipo==='bloco'; }); }
/* validação de um bloco: expande dentro de uma natureza fictícia e devolve as mensagens sem o prefixo */
function validarBloco(itens,getBloco,id){
  var lista=expandir([I('b','bloco','',{bloco:'__este',prox:'FIM'})],function(b){ return b==='__este'?{nome:'',itens:itens}:getBloco(b); });
  var v=validar(lista),limpa=function(m){ return m.replace(/b__/g,'').replace(/__/g,' › '); };
  (itens||[]).forEach(function(x){ if(x.tipo==='bloco'&&x.bloco===id) v.erros.push('O bloco usa a si mesmo em “'+x.id+'”.'); });
  return {erros:v.erros.map(limpa),avisos:v.avisos.map(limpa)};
}
/* texto da resposta de um item, para ficha, relato e registro */
function valorResposta(it,r){
  if(!ehPergunta(it)) return r===true?(it.tipo==='instrucao'?'dita':it.tipo==='troca'?'natureza mantida':'ciente'):'';
  if(!r) return '';
  if(r.pulada) return 'não respondida';
  if(temOpcoes(it)) return it.opcoes.filter(function(o){ return (r.ops||[]).indexOf(o.id)>=0; }).map(function(o){ return o.rotulo; }).concat(r.outro&&String(r.outro).trim()?[String(r.outro).trim()]:[]).join(', ');
  return String(r.valor==null?'':r.valor);
}
/* o que a resposta põe no relato final: opções marcadas com relato:false ficam de fora; item com relato:false não entra */
function valorRelato(it,r){
  if(it.relato===false||!r||r.pulada) return '';
  if(temOpcoes(it)) return it.opcoes.filter(function(o){ return (r.ops||[]).indexOf(o.id)>=0&&o.relato!==false; }).map(function(o){ return o.rotulo; }).concat(r.outro&&String(r.outro).trim()?[String(r.outro).trim()]:[]).join(', ');
  return valorResposta(it,r);
}
/* itens que ainda devem aparecer depois do pendente, seguindo o caminho padrão */
function previsao(itens,resp,pend){
  var g=grafo(itens),out=[],visto={},cur=pend,n=0;
  while(cur&&cur!=='FIM'&&g.item[cur]&&!visto[cur]&&n++<200){
    visto[cur]=1; out.push(cur);
    var it=g.item[cur],r=resp[cur],e=(it.tipo!=='multipla'&&temOpcoes(it)&&r&&r.ops&&r.ops[0])||null;
    cur=(e&&g.op[cur][e])||g.def[cur];
  }
  return out;
}
/* ===== IMPORTAÇÃO DE FLUXOGRAMA LIVRE (Miro e similares) =====
   O Mermaid do Miro desenha o protocolo com ids sem sentido (A, B, C), textos sem aspas, início e fim como nós
   e às vezes laços ou ramos paralelos. Aqui ele vira um rascunho de entrevista, com um relatório do que revisar. */
var PARADAS=' a o as os e de do da dos das em no na nos nas um uma uns umas que se ao aos à às para pra com por sem ou tem há ha existe está esta estão estao qual quais quantas quantos alguém alguem alguma algum é foi ser '.split(' ');
function idTexto(txt,usadosMap){
  var pal=String(txt||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(function(w){ return w&&PARADAS.indexOf(w)<0; });
  var base=pal.slice(0,3).join('_').slice(0,24)||'item';
  return idLivre(base,usadosMap);
}
function limparTexto(t){
  return String(t==null?'':t).replace(/^`+|`+$/g,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/&quot;|&#34;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/#quot;/g,'"').replace(/\\n/g,' ').replace(/\s+/g,' ').trim();
}
var FORMAS=[['([','])','terminal'],['((','))','terminal'],['[[',']]','sub'],['[(',')]','banco'],['{{','}}','decisao'],['[/','/]','para'],['[/','\\]','para'],['[\\','\\]','para'],['[\\','/]','para'],['{','}','decisao'],['[',']','ret'],['(',')','arred'],['>',']','bandeira']];
function lerMermaidLivre(src){
  var strs=[],avisos=[],nos={},ordem=[],arestas=[],grupos={},pilhaG=[];
  var txt=String(src||'').replace(/"([^"]*)"/g,function(_,x){ strs.push(x); return '\u0001'+(strs.length-1)+'\u0001'; });
  var rest=function(x){ return limparTexto(String(x==null?'':x).replace(/\u0001(\d+)\u0001/g,function(_,i){ return strs[+i]; })); };
  function lerNo(l,i){
    var m=/^\s*([A-Za-z0-9_À-ſ][A-Za-z0-9_À-ſ.-]*)/.exec(l.slice(i)); if(!m) return null;
    var id=m[1],j=i+m[0].length,forma=null,texto=null;
    for(var k=0;k<FORMAS.length;k++){ var f=FORMAS[k]; if(l.substr(j,f[0].length)===f[0]){ var fim=l.indexOf(f[1],j+f[0].length); if(fim<0) continue; forma=f[2]; texto=rest(l.slice(j+f[0].length,fim)); j=fim+f[1].length; break; } }
    var cl=/^:::([\w-]+)/.exec(l.slice(j)); if(cl) j+=cl[0].length;
    if(!nos[id]){ nos[id]={id:id,forma:null,texto:'',classe:''}; ordem.push(id); }
    if(cl) nos[id].classe=cl[1];
    if(pilhaG.length&&!grupos[id]){ var gg=grupos[pilhaG[pilhaG.length-1]]; if(gg.membros.indexOf(id)<0) gg.membros.push(id); }
    if(forma){ nos[id].forma=forma; nos[id].texto=texto; }
    return {id:id,j:j};
  }
  function lerGrupo(l,i){
    var ids=[],r=lerNo(l,i); if(!r) return null; ids.push(r.id); i=r.j;
    while(true){ var m=/^\s*&\s*/.exec(l.slice(i)); if(!m) break; r=lerNo(l,i+m[0].length); if(!r) return null; ids.push(r.id); i=r.j; }
    return {ids:ids,j:i};
  }
  var SETA_MEIO=/^\s*(?:--|==|-\.)\s*([^\-=.>|\s][^|]*?)\s*(?:-{2,}>|={2,}>|\.-+>|-{3,}|={3,})\s*/;
  var SETA=/^\s*<?(?:-{2,}>|-{3,}|={2,}>|={3,}|-\.+->|-\.+-|--[ox])(?:\s*\|([^|]*)\|)?\s*/;
  txt.split(/\r?\n/).forEach(function(bruta,n){
    bruta.split(';').forEach(function(linha){
      var l=linha.replace(/%%.*$/,'').trim();
      var cm=/^class\s+([\w,\s]+?)\s+([\w-]+)\s*$/.exec(l);
      var sg=/^subgraph\s+([\w-]+)\s*(?:\[(.*)\])?\s*$/.exec(l);
      if(sg){ grupos[sg[1]]={id:sg[1],titulo:rest(sg[2]||sg[1]),membros:[]}; pilhaG.push(sg[1]); return; }
      if(/^end$/i.test(l)){ pilhaG.pop(); return; }
      if(cm){ cm[1].split(',').forEach(function(x){ x=x.trim(); if(!x) return; if(!nos[x]){ nos[x]={id:x,forma:null,texto:'',classe:''}; ordem.push(x); } nos[x].classe=cm[2]; }); return; }
      if(!l||/^(flowchart|graph|classDef|class\s|style\s|linkStyle|subgraph\b|end$|direction\s|click\s|accTitle|accDescr|---$|title:|config:)/i.test(l)) return;
      var g=lerGrupo(l,0); if(!g){ avisos.push('Linha '+(n+1)+' ignorada: '+rest(l).slice(0,60)); return; }
      var i=g.j,ant=g.ids;
      while(i<l.length){
        var resto=l.slice(i); if(!resto.trim()) break;
        var m=SETA_MEIO.exec(resto),rot='';
        if(m) rot=rest(m[1]); else { m=SETA.exec(resto); if(m) rot=rest(m[1]||''); }
        if(!m){ avisos.push('Linha '+(n+1)+': trecho não reconhecido “'+rest(resto).slice(0,40)+'”.'); break; }
        var g2=lerGrupo(l,i+m[0].length); if(!g2){ avisos.push('Linha '+(n+1)+': seta sem destino.'); break; }
        var ponto=/-\.|\.-/.test(m[0]);
        ant.forEach(function(a){ g2.ids.forEach(function(b){ arestas.push({de:a,para:b,rot:rot,ponto:ponto}); }); });
        ant=g2.ids; i=g2.j;
      }
    });
  });
  /* grupos (subgraph): seta que sai do grupo vale para cada nó dele; o grupo em si não é nó */
  var gids=Object.keys(grupos);
  if(gids.length){
    var novas=[];
    arestas.forEach(function(a){
      /* seta de uma caixa para um grupo é associação (ex.: fala do despacho ligada ao grupo "Despacho imediato"): vale como grupo -> caixa */
      if(grupos[a.para]&&!grupos[a.de]){ a={de:a.para,para:a.de,rot:a.rot,ponto:a.ponto}; }
      var de=grupos[a.de]?grupos[a.de].membros:[a.de],para=grupos[a.para]?grupos[a.para].membros.slice(0,1):[a.para];
      de.forEach(function(x){ para.forEach(function(y){ novas.push({de:x,para:y,rot:a.rot,ponto:a.ponto}); }); });
    });
    arestas=novas; ordem=ordem.filter(function(id){ return !grupos[id]; }); gids.forEach(function(g){ delete nos[g]; });
  }
  return {nos:nos,ordem:ordem,arestas:arestas,avisos:avisos,grupos:grupos};
}
function importarMermaidLivre(src){
  var L=lerMermaidLivre(src),nos=L.nos,avisos=L.avisos.slice(),sai={},entra={};
  if(!L.ordem.length) return {itens:[],avisos:avisos.length?avisos:['Nenhum nó encontrado. Cole o código que começa com “flowchart” ou “graph”.']};
  L.ordem.forEach(function(id){ sai[id]=[]; entra[id]=[]; });
  L.arestas.forEach(function(a){ sai[a.de].push(a); entra[a.para].push(a); });
  var ehTerm=function(n){ return n.forma==='terminal'||/^(in[ií]cio|inicio|start|come[cç]o|fim|final|end|t[ée]rmino|encerra)/i.test(n.texto||n.id); };
  /* início: nós sem entrada; nó terminal com uma saída é só o ponto de partida */
  var raizes=L.ordem.filter(function(id){ return !entra[id].length; });
  if(!raizes.length) raizes=[L.ordem[0]];
  if(raizes.length>1) avisos.push('O fluxograma tem '+raizes.length+' pontos de partida ('+raizes.map(function(r){return nos[r].texto||r;}).join(', ')+'). A entrevista começa pelo primeiro; ligue os outros ou exclua.');
  var pula={},FIMs={};
  L.ordem.forEach(function(id){
    var n=nos[id];
    if(!sai[id].length&&(ehTerm(n)||!n.texto)) FIMs[id]=1;
    else if(!entra[id].length&&ehTerm(n)&&sai[id].length===1&&!sai[id][0].rot) pula[id]=sai[id][0].para;
  });
  var destino=function(id){ var v={}; while(pula[id]&&!v[id]){ v[id]=1; id=pula[id]; } return FIMs[id]?'FIM':id; };
  /* ordem de visita (pré-ordem) e retirada de laços */
  var visto={},pilha={},seq=[],laco=[];
  function dfs(id){
    if(FIMs[id]||visto[id]) return; visto[id]=1; pilha[id]=1; if(!pula[id]) seq.push(id);
    sai[id].forEach(function(a){ if(pilha[a.para]){ a.laco=true; laco.push(a); return; } dfs(a.para); });
    pilha[id]=0;
  }
  raizes.forEach(dfs); L.ordem.forEach(function(id){ if(!visto[id]&&!FIMs[id]&&!pula[id]){ dfs(id); } });
  laco.forEach(function(a){ avisos.push('Laço retirado: “'+(nos[a.de].texto||a.de)+'” voltava para “'+(nos[a.para].texto||a.para)+'”. A entrevista não repete itens: a resposta “'+(a.rot||'sem rótulo')+'” passou a encerrar a entrevista. Descreva a repetição no texto da instrução (ex.: “continue até a viatura chegar”).'); });
  var u={},novoId={};
  seq.forEach(function(id){ novoId[id]=idTexto(nos[id].texto||id,u); });
  var alvoId=function(id){ var d=destino(id); return d==='FIM'?'FIM':(novoId[d]||'FIM'); };
  var itens=seq.map(function(id){
    var n=nos[id],ss=sai[id].filter(function(a){ return !a.laco; }),rot=sai[id].filter(function(a){ return a.rot; }),sem=ss.filter(function(a){ return !a.rot; });
    var texto=n.texto||id,pergunta=n.forma==='decisao'||rot.length>0||/\?\s*$/.test(texto);
    var it;
    if(pergunta){
      it=I(novoId[id],'unica',texto,{prox:'FIM'});
      var ou={};
      rot.forEach(function(a){ var ex=it.opcoes.filter(function(o){ return slug(o.rotulo)===slug(a.rot); })[0]; if(ex){ avisos.push('“'+texto+'”: duas setas com a resposta “'+a.rot+'”; ficou só a primeira.'); return; } it.opcoes.push(O(idLivre(a.rot,ou),a.rot,a.laco?'FIM':alvoId(a.para))); });
      if(sem.length){ it.prox=alvoId(sem[0].para); if(sem.length>1) avisos.push('“'+texto+'”: '+sem.length+' setas sem resposta; só a primeira virou o caminho padrão.'); }
      else if(it.opcoes.length) it.prox=it.opcoes[0].vai;
      var tem=function(r){ return it.opcoes.some(function(o){ return slug(o.rotulo)===r; }); };
      if(it.opcoes.length<2){
        if(!it.opcoes.length&&n.forma!=='decisao'&&!/\?\s*$/.test(texto)){ it.tipo='instrucao'; }
        else {
          ['sim','nao','nao_sabe'].forEach(function(r,k){ if(it.opcoes.length<3&&!tem(r)) it.opcoes.push(O(idLivre(r,(function(){var x={};it.opcoes.forEach(function(o){x[o.id]=1;});return x;})()),['Sim','Não','Não sabe'][k],'')); });
          avisos.push('“'+texto+'”: pergunta com menos de duas respostas no desenho; foram acrescentadas opções. Confira.');
        }
      }
      if(it.tipo==='unica'&&it.opcoes.length&&it.opcoes.every(function(o){ return o.vai; })&&!sem.length) it.prox=it.opcoes[0].vai;
    } else {
      var info=/^(acionar|despachar|enviar|deslocar|empenhar|registrar|anotar|verificar|consultar|informar (ao|a|à) (despacho|guarni|equipe|central)|aten[cç][aã]o|obs|nota|alerta)/i.test(texto)||n.forma==='arred'||n.forma==='sub'||n.forma==='banco';
      it=I(novoId[id],info?'informacao':'instrucao',texto,{prox:sem.length?alvoId(sem[0].para):'FIM'});
      if(sem.length>1) avisos.push('“'+texto+'”: '+sem.length+' saídas em paralelo; ficou só a primeira (“'+(nos[sem[0].para].texto||sem[0].para)+'”). Coloque as outras em sequência.');
      if(info) avisos.push('“'+texto+'” virou informação ao atendente (ação do sistema ou da central, não é lida ao solicitante). Confira.');
    }
    return it;
  });
  if(!itens.length) avisos.push('Depois de tirar início e fim, não sobrou nenhum item.');
  return {itens:itens,avisos:avisos};
}
/* ===== CONVENÇÃO DO QUADRO DO MIRO (CBMDF) =====
   Cada natureza é um diagrama Mermaid em que a COR diz o papel do nó:
   titulo (marrom) · perg (branco) · opc (amarelo claro) · ns (lilás, "Não sabe") · ab (vermelho, resposta aberta)
   desp (rosa, despacho imediato) · acao (branco, borda cinza) · orient (amarelo, orientação) · video (verde, videochamada)
   troca (roxo, trocar natureza) · relato (verde claro, relato final). Nos diagramas "(original)" as classes têm o nome
   da cor (cfff6b6, cdedaff...), então o papel é lido pelo preenchimento declarado no classDef. */
var MIRO_CORES={'ff9e9e':'desp','c6dcff':'azul','fe9f4d':'acao','af7e04':'titulo','fff6b6':'opc','dedaff':'ns','ff6464':'ab','ffc6c6':'desp','ffdc4a':'orient','adf0c7':'relato','d5f2e0':'relato','8f7fee':'troca','2dc75c':'video','f8d3af':'recl'};
var MIRO_PAPEIS=['titulo','perg','opc','ns','ab','desp','acao','orient','relato','troca','video','recl','diag','bloco'];
function ehConvencaoMiro(src){ return /classDef\s+(perg|opc|cfff6b6|cdedaff)\b/.test(String(src||'')); }
function papeisMiro(src){
  var m={},re=/classDef\s+([\w-]+)\s+([^\n]*)/g,x;
  while((x=re.exec(String(src||'')))){
    var nome=x[1],fill=(/fill:\s*#?([0-9a-fA-F]{3,6})/.exec(x[2])||[])[1],stroke=(/stroke:\s*#?([0-9a-fA-F]{3,6})/.exec(x[2])||[])[1];
    fill=(fill||'').toLowerCase(); stroke=(stroke||'').toLowerCase();
    if(nome==='cvideo') m[nome]='video';
    else if(MIRO_PAPEIS.indexOf(nome)>=0) m[nome]=nome;
    else if(nome==='ctitulo') m[nome]='titulo';
    else if(fill==='ffffff'||fill==='fff') m[nome]=stroke==='757575'?'acao':'perg';
    else m[nome]=MIRO_CORES[fill]||'';
  }
  return m;
}
function naturezaParecida(nome,naturezas){
  var chave=function(t){ return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/[^a-z0-9]+/g,''); };
  var dist=function(a,b){ var m=[],i,j; for(i=0;i<=a.length;i++){ m[i]=[i]; } for(j=0;j<=b.length;j++) m[0][j]=j; for(i=1;i<=a.length;i++) for(j=1;j<=b.length;j++) m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return m[a.length][b.length]; };
  var k=chave(nome),melhor=null,md=1e9;
  (naturezas||[]).forEach(function(n){ var d=dist(k,chave(n.nome)); if(d<md){ md=d; melhor=n; } });
  return melhor&&md<=Math.max(2,Math.floor(k.length*0.12))?melhor:null;
}
function importarMiroHefesto(src,naturezas){
  var gerado=/%%\s*hefesto/.test(String(src||'')); /* desenhado no próprio site: sem as heurísticas para o desenho à mão */
  var L=lerMermaidLivre(src),nos=L.nos,cls=papeisMiro(src),avisos=L.avisos.slice(),sai={},entra={},titulo='';
  var paiPerg={}; L.arestas.forEach(function(a){ var c=nos[a.de]&&(cls[nos[a.de].classe]||nos[a.de].classe); if(c==='perg') paiPerg[a.para]=1; });
  var papel=function(id){ var n=nos[id]; if(!n) return ''; var p=cls[n.classe]||(MIRO_PAPEIS.indexOf(n.classe)>=0?n.classe:'');
    if(p==='azul') p=paiPerg[id]?'opc':'acao';
    if(gerado) return p||'acao'; /* azul claro aparece como opção e como nota */
    if((p==='opc'||p==='ns')&&String(n.texto).length>70) p='acao'; /* caixa de aviso com a cor de opção */
    if((p==='opc'||p==='ns')&&/^(resposta\s+)?aberta\b|^resposta\s+livre/i.test(n.texto)) p='ab';
    if(p) return p;
    if(n.forma==='decisao') return 'perg'; if(n.forma==='terminal') return /relato|fim/i.test(n.texto)?'relato':'titulo'; return /\?\s*$/.test(n.texto)?'perg':'orient'; };
  var ehOpc=function(id){ var p=papel(id); return p==='opc'||p==='ns'||p==='ab'; };
  /* opção que abre outras opções (ex.: "Animal doméstico" -> Cachorro, Gato) = pergunta de detalhamento */
  L.ordem.slice().forEach(function(id){
    if(!ehOpc(id)||papel(id)==='ab') return;
    var filhos=L.arestas.filter(function(a){ return a.de===id&&!a.ponto; });
    if(filhos.length<2||!filhos.every(function(a){ return ehOpc(a.para); })) return;
    var q=id+'__q'; nos[q]={id:q,forma:null,texto:nos[id].texto+': qual?',classe:'perg'}; L.ordem.push(q);
    filhos.forEach(function(a){ a.de=q; }); L.arestas.push({de:id,para:q,rot:''});
  });
  /* desenho incompleto: resposta sem seta enquanto há um bloco solto no diagrama -> liga a resposta ao bloco */
  (function(){
    for(var volta=0;volta<20;volta++){
      var de={},entraN={}; L.arestas.forEach(function(a){ (de[a.de]=de[a.de]||[]).push(a.para); entraN[a.para]=1; });
      var raiz=L.ordem.filter(function(id){ return papel(id)==='titulo'; }); if(!raiz.length) return;
      var vis={},fila=raiz.slice(); while(fila.length){ var x=fila.shift(); if(vis[x]) continue; vis[x]=1; (de[x]||[]).forEach(function(y){ fila.push(y); }); }
      var soltos=L.ordem.filter(function(id){ var p=papel(id); return !vis[id]&&!entraN[id]&&p!=='titulo'&&p!=='relato'&&!ehOpc(id)&&nos[id].texto; });
      var mortos=L.ordem.filter(function(id){ return vis[id]&&ehOpc(id)&&!de[id]; });
      if(!soltos.length||!mortos.length) return;
      mortos.forEach(function(m){ L.arestas.push({de:m,para:soltos[0],rot:''}); });
      avisos.push('No quadro, '+(mortos.length===1?'a resposta “'+nos[mortos[0]].texto+'” não tem seta':'as respostas '+mortos.map(function(m){ return '“'+nos[m].texto+'”'; }).join(', ')+' não têm seta')+' e “'+nos[soltos[0]].texto.slice(0,80)+'” está solto. Foram ligados aqui; confira no quadro.');
    }
  })();
  /* caixa lateral sem saída própria (nota pontilhada, "Acionar PMDF", videochamada...) ao lado do caminho principal
     = passo no caminho, antes do destino principal. Cada origem ganha sua cópia, porque a caixa pode estar em vários caminhos. */
  (function(){
    var temSaida=function(id){ return L.arestas.some(function(a){ return a.de===id; }); };
    var ehNota=function(id){ var p=papel(id); return !temSaida(id)&&p!=='relato'&&!ehOpc(id); };
    var porDe={}; L.arestas.forEach(function(a){ (porDe[a.de]=porDe[a.de]||[]).push(a); });
    /* sequência lateral: caixas em fila, cada uma com uma saída, até uma caixa sem saída ou o relato final */
    var soPontilhada={}; L.arestas.forEach(function(a){ if(soPontilhada[a.para]===undefined) soPontilhada[a.para]=true; if(!a.ponto) soPontilhada[a.para]=false; });
    var cadeia=function(id){ var c=[],v={},prim=true; while(id&&!v[id]){ v[id]=1; var p=papel(id); if(prim&&!soPontilhada[id]) return null; prim=false; if(p==='relato') return c; if(ehOpc(id)||p==='perg') return null; c.push(id); var s=porDe[id]||[]; if(s.length>1) return null; id=s.length?s[0].para:null; } return c; };
    var usadoNota={},novas=L.arestas.slice();
    Object.keys(porDe).forEach(function(de){
      if(papel(de)==='perg') return;
      var sa=porDe[de],notas=[],mains=[];
      sa.forEach(function(a){ var c=ehNota(a.para)?[a.para]:(a.ponto?cadeia(a.para):null); if(c&&c.length) notas.push(c); else mains.push(a); });
      if(!notas.length||(notas.length===1&&!mains.length)) return;
      var cad=[];
      notas.forEach(function(c){ c.forEach(function(nn){ if(!usadoNota[nn]){ usadoNota[nn]=1; cad.push(nn); return; } var k=nn+'__'+de; nos[k]=JSON.parse(JSON.stringify(nos[nn])); nos[k].id=k; L.ordem.push(k); cad.push(k); }); });
      var naCadeia={}; notas.forEach(function(c){ c.forEach(function(x){ naCadeia[x]=1; }); });
      novas=novas.filter(function(a){ return sa.indexOf(a)<0&&!naCadeia[a.de]; });
      novas.push({de:de,para:cad[0],rot:''});
      for(var k=0;k+1<cad.length;k++) novas.push({de:cad[k],para:cad[k+1],rot:''});
      mains.forEach(function(a){ novas.push({de:cad[cad.length-1],para:a.para,rot:a.rot}); });
    });
    L.arestas=novas;
  })();
  L.ordem.forEach(function(id){ sai[id]=[]; entra[id]=[]; });
  L.arestas.forEach(function(a){ sai[a.de].push(a); entra[a.para].push(a); });
  var ehItem=function(id){ var p=papel(id); return p&&p!=='titulo'&&p!=='relato'&&!ehOpc(id); };
  var tit=L.ordem.filter(function(id){ return papel(id)==='titulo'; });
  if(tit.length) titulo=nos[tit[0]].texto.replace(/^natureza\s*:\s*/i,'').trim();
  /* destino concreto de uma seta: item, FIM, ou o que vem depois de uma opção solta */
  function alvo(id,visto){
    visto=visto||{}; if(visto[id]) return 'FIM'; visto[id]=1;
    var p=papel(id); if(p==='relato') return 'FIM';
    if(ehItem(id)) return id;
    var s=sai[id]; if(!s.length) return 'FIM';
    return alvo(s[0].para,visto);
  }
  var inicio=[]; tit.forEach(function(t){ sai[t].forEach(function(a){ inicio.push(a.para); }); });
  if(!inicio.length) inicio=L.ordem.filter(function(id){ return ehItem(id)&&!entra[id].length; });
  /* ordem e laços */
  var visto={},pilha={},seq=[],laco={};
  function prox(id){ var r=[]; sai[id].forEach(function(a){ var t=a.para; if(ehOpc(t)&&papel(id)==='perg'){ sai[t].forEach(function(b){ r.push({de:t,para:alvo(b.para)}); }); if(!sai[t].length) r.push({de:t,para:'FIM'}); } else r.push({de:id,para:alvo(t)}); }); return r; }
  function dfs(id){
    if(id==='FIM'||visto[id]) return; visto[id]=1; pilha[id]=1; seq.push(id);
    prox(id).forEach(function(e){ if(pilha[e.para]){ laco[e.de+'>'+e.para]=1; avisos.push('Laço retirado: “'+(nos[e.de].texto||e.de)+'” voltava para “'+(nos[e.para].texto||e.para)+'”; esse caminho passou a ir para o fechamento.'); return; } dfs(e.para); });
    pilha[id]=0;
  }
  inicio.map(function(x){ return alvo(x); }).forEach(dfs);
  L.ordem.forEach(function(id){ if(ehItem(id)&&!visto[id]){ avisos.push('“'+(nos[id].texto||id)+'” não está ligado ao início do fluxo.'); dfs(id); } });
  var u={},nid={};
  var idBom=function(x){ return /^[a-z][a-z0-9_]*$/.test(x)&&!/^[nxs]\d+$/.test(x)&&x.indexOf('__')<0&&x!=='fim'&&x!=='inicio'; };
  seq.forEach(function(id){ if(idBom(id)) nid[id]=idLivre(id,u); });
  seq.forEach(function(id){ if(nid[id]) return; var p=papel(id); nid[id]=p==='desp'?idLivre('despacho',u):idTexto(nos[id].texto.replace(/^(🔁\s*)?trocar natureza\s*:\s*/i,'troca ').replace(/^orienta[cç][aã]o ao solicitante\s*:\s*/i,''),u); });
  var dest=function(de,para){ if(laco[de+'>'+para]) return 'FIM'; return para==='FIM'?'FIM':nid[para]||'FIM'; };
  var itens=seq.map(function(id){
    var n=nos[id],p=papel(id),txt=n.texto,it;
    if(p==='perg'){
      var opcs=sai[id].filter(function(a){ return ehOpc(a.para); }).map(function(a){ return a.para; });
      var diretos=sai[id].filter(function(a){ return !ehOpc(a.para); }).map(function(a){ return dest(id,alvo(a.para)); });
      var alvoOpc=function(o){ var s=sai[o]; if(s.length>1) avisos.push('“'+txt+'” / “'+nos[o].texto+'”: a resposta leva a '+s.length+' caixas ao mesmo tempo; ficou só “'+(nos[s[0].para].texto||s[0].para)+'”.'); return s.length?dest(o,alvo(s[0].para)):'FIM'; };
      var abertas=opcs.filter(function(o){ return papel(o)==='ab'; }),fechadas=opcs.filter(function(o){ return papel(o)!=='ab'; });
      if(!fechadas.length&&!abertas.length&&!/\?\s*$/.test(txt)) return I(nid[id],'informacao',txt,{prox:diretos[0]||'FIM'});
      if(!fechadas.length){
        var pa=abertas.length?alvoOpc(abertas[0]):(diretos[0]||'FIM');
        it=I(nid[id],/^quant[oa]s\b/i.test(txt)&&!/e onde|quais/i.test(txt)?'numero':'texto',txt,{prox:pa});
        return it;
      }
      var multi=/\bquais\b|mais de uma|marque todas/i.test(txt);
      it=I(nid[id],multi?'multipla':(fechadas.length>7?'lista':'unica'),txt,{});
      var uo={},alvos=[];
      fechadas.forEach(function(o){ var a=alvoOpc(o); alvos.push(a); var oid=(/__([a-z0-9_]+)$/.exec(o)||[])[1],op=O(oid&&!uo[oid]?(uo[oid]=1,oid):idLivre(oid||nos[o].texto,uo),nos[o].texto,a); if(papel(o)==='ns') op.relato=false; it.opcoes.push(op); });
      if(abertas.length){ it.outro=true; var aa=alvoOpc(abertas[0]); alvos.push(aa); it._outro=aa; }
      if(diretos.length) alvos=alvos.concat(diretos);
      var cont={},padrao=alvos[0]; alvos.forEach(function(a){ cont[a]=(cont[a]||0)+1; if(cont[a]>cont[padrao]) padrao=a; });
      if(diretos.length) padrao=diretos[0];
      else if(it.outro) padrao=it._outro; /* a resposta aberta só segue o caminho padrão */
      it.prox=padrao;
      it.opcoes.forEach(function(o){ if(o.vai===padrao) o.vai=''; });
      if(it.outro&&it._outro!==padrao) avisos.push('“'+txt+'”: a resposta aberta seguia para outro lugar; no protótipo ela segue o caminho padrão.');
      delete it._outro;
      if(multi) avisos.push('“'+txt+'” virou múltipla escolha pelo texto da pergunta. Confira.');
      return it;
    }
    var seg=sai[id].length?dest(id,alvo(sai[id][0].para)):'FIM';
    if(sai[id].length>1) avisos.push('“'+txt.slice(0,60)+'” tem '+sai[id].length+' saídas sem pergunta; ficou só a primeira.');
    if(p==='troca'&&/manter natureza/i.test(txt)) return I(nid[id],'informacao',txt.replace(/^[^A-Za-zÀ-ú]+/,''),{prox:seg});
    if(p==='troca'){ var alvoNat=txt.replace(/^(🔁\s*)?trocar natureza\s*:\s*/i,'').trim(),nn=naturezaParecida(alvoNat,naturezas); it=I(nid[id],'troca',nn?nn.nome:alvoNat,{prox:seg}); if(naturezas&&!nn) avisos.push('Troca para “'+alvoNat+'”: essa natureza não tem fluxo no quadro.'); else if(nn&&nn.nome!==alvoNat) avisos.push('Troca para “'+alvoNat+'” entendida como “'+nn.nome+'”.'); return it; }
    if(p==='desp'){ var fala=(/fala\s*:\s*(.*)$/i.exec(txt)||[])[1]; it=I(nid[id],'instrucao',fala||txt,{prox:seg,despacho:true}); return it; }
    if(p==='orient') return I(nid[id],'instrucao',txt.replace(/^orienta[cç][aã]o ao solicitante\s*:\s*/i,''),{prox:seg});
    if(p==='video') return I(nid[id],'informacao',txt.replace(/^📞\s*/,''),{prox:seg,video:true});
    if(p==='bloco') return I(nid[id],'bloco',txt.replace(/^🧩\s*/,'').replace(/^bloco\s*:\s*/i,''),{prox:seg});
    if(p==='diag') return I(nid[id],'diagrama',txt.replace(/^fluxograma\s*:\s*/i,''),{prox:seg,mermaid:'flowchart LR\n  A --> B'});
    return I(nid[id],'informacao',txt,{prox:seg});
  });
  return {titulo:titulo,itens:itens,avisos:avisos};
}
/* Desenho no padrão do quadro do Miro (cores por papel), para a aba Fluxo. Volta pelo mesmo conversor da importação. */
var MIRO_CLASSES=['classDef titulo fill:#af7e04,stroke:#1a1a1a,color:#1a1a1a','classDef perg fill:#ffffff,stroke:#1a1a1a,color:#1a1a1a','classDef opc fill:#fff6b6,stroke:#af7e04,color:#1a1a1a','classDef ns fill:#dedaff,stroke:#6631d7,color:#1a1a1a','classDef ab fill:#ff6464,stroke:#bd0a0a,color:#1a1a1a','classDef desp fill:#ffc6c6,stroke:#bd0a0a,color:#1a1a1a','classDef acao fill:#ffffff,stroke:#757575,color:#1a1a1a','classDef orient fill:#ffdc4a,stroke:#af7e04,color:#1a1a1a','classDef video fill:#2dc75c,stroke:#067429,color:#1a1a1a','classDef troca fill:#8f7fee,stroke:#6631d7,color:#ffffff,stroke-width:3px','classDef diag fill:#f8f6ff,stroke:#5b3fc4,color:#1a1a1a','classDef bloco fill:#e3f2fd,stroke:#1565c0,color:#1a1a1a,stroke-width:3px','classDef relato fill:#adf0c7,stroke:#067429,color:#1a1a1a'];
function fluxoMiro(itens,natureza){
  var g=grafo(itens),L=['flowchart TD','  %% hefesto: desenho no padrão do quadro do Miro'].concat(MIRO_CLASSES.map(function(c){ return '  '+c; })),E=[];
  /* textos longos quebram em linhas (<br/>); na volta, o conversor junta com espaço */
  var quebra=function(t){ var pal=String(t).split(' '),l=[],cur=''; pal.forEach(function(w){ if(cur&&(cur+' '+w).replace(/<[^>]+>/g,'').length>48){ l.push(cur); cur=w; } else cur=cur?cur+' '+w:w; }); if(cur) l.push(cur); return l.join('<br/>'); };
  var q=function(t){ return '"'+quebra(String(t==null?'':t).replace(/"/g,"'").replace(/\n/g,' '))+'"'; };
  var d=function(t){ return t==='FIM'?'fim':t; };
  L.push('  inicio(['+q('<b>Natureza: '+(natureza||'')+'</b>')+']):::titulo');
  if(itens.length) E.push('  inicio --> '+itens[0].id);
  itens.forEach(function(it){
    var prox=g.def[it.id];
    if(temOpcoes(it)){
      L.push('  '+it.id+'['+q(it.texto)+']:::perg');
      it.opcoes.forEach(function(o){ var n=it.id+'__'+o.id; L.push('  '+n+'('+q(o.rotulo)+'):::'+(o.relato===false?'ns':'opc')); E.push('  '+it.id+' --> '+n); E.push('  '+n+' --> '+d(o.vai||prox)); });
      if(it.outro){ L.push('  '+it.id+'__outro('+q('Aberta')+'):::ab'); E.push('  '+it.id+' --> '+it.id+'__outro'); E.push('  '+it.id+'__outro --> '+d(prox)); }
      else if(!it.opcoes.some(function(o){ return !o.vai||o.vai===prox; })) E.push('  '+it.id+' -.-> '+d(prox)); /* caminho de quem pula a pergunta */
    } else if(it.tipo==='numero'||it.tipo==='texto'){
      L.push('  '+it.id+'['+q(it.texto)+']:::perg'); L.push('  '+it.id+'__resp('+q('Aberta')+'):::ab'); E.push('  '+it.id+' --> '+it.id+'__resp'); E.push('  '+it.id+'__resp --> '+d(prox));
    } else {
      if(it.tipo==='instrucao'&&it.despacho) L.push('  '+it.id+'['+q('🚒 <b>Despacho imediato</b><br/>Fala: '+it.texto)+']:::desp');
      else if(it.tipo==='instrucao') L.push('  '+it.id+'('+q('<b>Orientação ao solicitante:</b> '+it.texto)+'):::orient');
      else if(it.tipo==='informacao'&&it.video) L.push('  '+it.id+'>'+q('📞 '+it.texto)+']:::video');
      else if(it.tipo==='troca') L.push('  '+it.id+'{{'+q('🔁 Trocar natureza: '+it.texto)+'}}:::troca');
      else if(it.tipo==='diagrama') L.push('  '+it.id+'[['+q('Fluxograma: '+it.texto)+']]:::diag');
      else if(it.tipo==='bloco') L.push('  '+it.id+'[['+q('🧩 Bloco: '+it.texto)+']]:::bloco');
      else L.push('  '+it.id+'['+q(it.texto)+']:::acao');
      E.push('  '+it.id+' --> '+d(prox));
    }
  });
  L.push('  fim(['+q('Relato final')+']):::relato');
  return L.concat(E).join('\n');
}
/* Aplica o desenho sobre a entrevista atual: o que o desenho não carrega (obrigatória, múltipla escolha, lista, número,
   código do fluxograma de consulta, "fora do relato" de perguntas abertas) é mantido pelo identificador. */
function aplicarFluxoMiro(itensAtuais,src,naturezas){
  var r=importarMiroHefesto(src,naturezas),ant={},pos={};
  itensAtuais.forEach(function(it,i){ ant[it.id]=it; pos[it.id]=i; });
  if(!r.itens.length) return {itens:null,erros:['Nenhum item encontrado. O desenho precisa começar no nó da natureza (classe titulo) ou ter caixas com as classes do quadro.'],avisos:r.avisos};
  r.itens.forEach(function(it){
    var a=ant[it.id]; if(!a) return;
    if(temOpcoes(it)&&temOpcoes(a)) it.tipo=a.tipo;
    else if((it.tipo==='texto'||it.tipo==='numero')&&(a.tipo==='texto'||a.tipo==='numero')) it.tipo=a.tipo;
    else if(it.tipo==='informacao'&&a.tipo==='diagrama') it.tipo='diagrama';
    if(ehPergunta(it)&&a.obrig) it.obrig=true;
    if(it.tipo==='diagrama') it.mermaid=a.mermaid||it.mermaid;
    if(it.tipo==='bloco'&&a.tipo==='bloco') it.bloco=a.bloco;
    if(a.relato===false&&!temOpcoes(it)) it.relato=false;
  });
  /* caminho padrão: mantém o anterior quando ele ainda é destino de alguma resposta */
  var gA=grafo(itensAtuais),gN=grafo(r.itens);
  r.itens.forEach(function(it){
    var a=ant[it.id]; if(!a||!temOpcoes(it)) return;
    var velho=gA.def[a.id],novo=gN.def[it.id]; if(velho===novo) return;
    var alvos=it.opcoes.map(function(o){ return o.vai||novo; }); if(it.outro) alvos.push(novo);
    if(alvos.indexOf(velho)<0) return;
    it.opcoes.forEach(function(o){ if(!o.vai) o.vai=novo; if(o.vai===velho) o.vai=''; });
    it.prox=velho;
  });
  var ini=r.itens[0],resto=r.itens.slice(1);
  resto.forEach(function(it,i){ it._o=pos[it.id]!=null?pos[it.id]:1e6+i; });
  resto.sort(function(a,b){ return a._o-b._o; }); resto.forEach(function(it){ delete it._o; });
  var novos=r.itens.filter(function(it){ return !ant[it.id]; }).map(function(it){ return it.id; }),sumiram=itensAtuais.filter(function(a){ return !r.itens.some(function(it){ return it.id===a.id; }); }).map(function(a){ return a.id; });
  return {itens:[ini].concat(resto),erros:[],avisos:r.avisos,novos:novos,removidos:sumiram};
}
/* Resposta de uma IA: tolera texto em volta e cercas de código. Aceita {itens:[...], revisar:[...]} ou só a lista. */
function lerRespostaIA(texto){
  var t=String(texto||'').trim(),m=/```(?:json)?\s*([\s\S]*?)```/i.exec(t); if(m) t=m[1].trim();
  var a=t.search(/[\[{]/); if(a<0) throw new Error('Não encontrei JSON na resposta.');
  var b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']')); t=t.slice(a,b+1);
  var o=JSON.parse(t),lista=Array.isArray(o)?o:(o.itens||o.items),revisar=Array.isArray(o)?[]:(o.revisar||[]);
  if(!Array.isArray(lista)) throw new Error('O JSON precisa ter a lista "itens".');
  var tipos=TIPOS.map(function(x){return x[0];});
  var itens=lista.map(function(x,k){
    if(!x||typeof x!=='object') throw new Error('Item '+(k+1)+' não é um objeto.');
    if(tipos.indexOf(x.tipo)<0) throw new Error('“'+(x.id||k+1)+'”: tipo inválido “'+x.tipo+'”.');
    var dest=function(v){ v=v==null?'':String(v); return /^fim$/i.test(v)?'FIM':v; };
    var it=I(String(x.id||''),x.tipo,String(x.texto||x.titulo||''),{obrig:!!(x.obrig||x.obrigatoria),outro:!!(x.outro||x.permiteOutro),mermaid:String(x.mermaid||''),prox:dest(x.prox)});
    if(temOpcoes(it)) it.opcoes=(x.opcoes||[]).map(function(p){ return O(String(p.id||slug(p.rotulo)),String(p.rotulo||p.id||''),dest(p.vai)); });
    return it;
  });
  return {itens:itens,revisar:revisar.map(String)};
}
function promptMiro(natureza,codigo){
  return [
'Você vai converter um fluxograma de atendimento de emergência (193, Corpo de Bombeiros) em uma entrevista estruturada para o protótipo Hefesto.',
'',
'# Entrada',
'Natureza da ocorrência: '+(natureza||'(informe a natureza)'),
'Fluxograma em Mermaid, exportado do Miro. Os identificadores dos nós (A, B, C...) não têm significado; os losangos {} costumam ser perguntas e o texto das setas costuma ser a resposta.',
'```mermaid',
String(codigo||'').trim()||'(cole aqui o código do Miro)',
'```',
'',
'# Saída',
'Responda SOMENTE com um JSON válido, sem comentários, no formato:',
'{"itens":[ ... ],"revisar":[ "ponto que o gestor precisa conferir", ... ]}',
'',
'Cada item da lista "itens":',
'{"id":"preso","tipo":"unica","texto":"Tem alguém preso dentro do veículo?","obrig":true,"outro":false,"prox":"vitimas","opcoes":[{"id":"sim","rotulo":"Sim","vai":"nao_remover"},{"id":"nao","rotulo":"Não","vai":""},{"id":"nao_sabe","rotulo":"Não sabe","vai":""}]}',
'',
'Tipos (campo "tipo"):',
'- "unica": pergunta de escolha única, poucas opções, uma resposta. É o tipo de quase todo losango.',
'- "multipla": várias opções podem valer ao mesmo tempo (ex.: riscos no local). Pode ter "outro":true para resposta livre.',
'- "lista": escolha única com muitas opções (mais de 6).',
'- "numero": quantidade. "texto": resposta curta livre (placa, ponto de acesso). Sem "opcoes".',
'- "instrucao": frase que o atendente LÊ para o solicitante (orientação, primeiros socorros).',
'- "informacao": aviso só para o atendente, não é lido (ex.: "Acionar SAMU", "avisar a guarnição sobre gás").',
'- "diagrama": fluxograma de consulta mostrado ao atendente; usa "texto" como título e "mermaid" com o código. Use só se o desenho tiver uma tabela ou árvore de consulta que não seja pergunta ao solicitante.',
'',
'Regras do fluxo:',
'1. A lista está em ordem; o primeiro item inicia a entrevista.',
'2. "prox" é para onde o item vai depois. "" significa o próximo da lista; "FIM" encerra a entrevista. Prefira escrever o id explícito.',
'3. Em "unica" e "lista", cada opção tem "vai": o id do próximo item para aquela resposta, ou "" para seguir o "prox" do item.',
'4. Em "multipla", cada opção marcada abre um desvio pelo "vai" dela; cada desvio precisa voltar ao "prox" da pergunta (o último item do desvio aponta para ele).',
'5. Não pode haver ciclo: nenhum caminho volta a um item anterior. Se o desenho tem laço (ex.: "reavaliar respiração", "repetir compressões"), transforme a repetição no texto da instrução ("continue até a viatura chegar") e cite isso em "revisar".',
'6. Ramos paralelos sem pergunta (uma caixa com duas setas sem texto) viram sequência.',
'7. Nós de início e fim do desenho não viram itens. Ações do sistema ou do despacho (acionar viatura, empenhar, registrar) viram "informacao" ou somem, e isso vai para "revisar".',
'8. Todo id e todo "vai"/"prox" precisa existir na lista (ou ser "FIM").',
'',
'Regras de conteúdo:',
'- ids: letras minúsculas sem acento, números e _, curtos e com sentido (ex.: "preso", "cor_chamas"). Nunca "fim". Ids de opção também ("sim", "nao", "nao_sabe").',
'- Uma pergunta por item, do jeito que o atendente fala. Se uma caixa tem duas perguntas, separe em dois itens.',
'- Toda pergunta com opções tem pelo menos 2 opções. Inclua "Não sabe" quando o solicitante puder não saber, levando ao caminho mais seguro.',
'- "obrig":true só nas perguntas sem as quais não dá para registrar a ocorrência.',
'- Mantenha o sentido dos textos do desenho. NÃO invente orientação clínica ou operacional que não esteja no fluxograma; se faltar algo, aponte em "revisar".',
'- Escreva em português do Brasil, frases curtas, sem travessão.',
'- Em "revisar", liste em frases curtas tudo o que você interpretou, mudou ou não teve certeza.'
  ].join('\n');
}
/* ===== ZIP sem biblioteca =====
   zipCriar grava sem compressão (funciona em qualquer navegador). zipLer lê arquivos sem compressão e,
   se o navegador tiver DecompressionStream, também os comprimidos (zip refeito pelo sistema operacional). */
var CRC_T=(function(){ var t=[],c,n,k; for(n=0;n<256;n++){ c=n; for(k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ var c=0xFFFFFFFF; for(var i=0;i<b.length;i++) c=CRC_T[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function utf8(t){ return new TextEncoder().encode(t); }
function zipCriar(arquivos,data){
  var d=data||new Date(),hora=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dia=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  var partes=[],central=[],pos=0,n=0;
  var u16=function(v){ return [v&255,(v>>>8)&255]; },u32=function(v){ return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]; };
  Object.keys(arquivos).forEach(function(nome){
    var nb=utf8(nome),db=typeof arquivos[nome]==='string'?utf8(arquivos[nome]):arquivos[nome],crc=crc32(db);
    var comum=[].concat(u16(20),u16(0x0800),u16(0),u16(hora),u16(dia),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0));
    var loc=new Uint8Array([0x50,0x4b,0x03,0x04].concat(comum));
    partes.push(loc,nb,db);
    central.push(new Uint8Array([0x50,0x4b,0x01,0x02].concat(u16(20),comum,u16(0),u16(0),u16(0),u32(0),u32(pos))),nb);
    pos+=loc.length+nb.length+db.length; n++;
  });
  var tam=central.reduce(function(a,x){ return a+x.length; },0);
  var fim=new Uint8Array([0x50,0x4b,0x05,0x06].concat(u16(0),u16(0),u16(n),u16(n),u32(tam),u32(pos),u16(0)));
  var tudo=partes.concat(central,[fim]),total=tudo.reduce(function(a,x){ return a+x.length; },0),out=new Uint8Array(total),o=0;
  tudo.forEach(function(x){ out.set(x,o); o+=x.length; });
  return out;
}
function zipLer(buf){
  var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),dv=new DataView(b.buffer,b.byteOffset,b.byteLength),fim=-1;
  for(var i=b.length-22;i>=0&&i>=b.length-65557;i--){ if(dv.getUint32(i,true)===0x06054b50){ fim=i; break; } }
  if(fim<0) return Promise.reject(new Error('o arquivo não é um zip válido'));
  var n=dv.getUint16(fim+10,true),p=dv.getUint32(fim+16,true),dec=new TextDecoder(),tarefas=[];
  for(var k=0;k<n;k++){
    var metodo=dv.getUint16(p+10,true),comp=dv.getUint32(p+20,true),tn=dv.getUint16(p+28,true),te=dv.getUint16(p+30,true),tc=dv.getUint16(p+32,true),loc=dv.getUint32(p+42,true);
    var nome=dec.decode(b.subarray(p+46,p+46+tn)); p+=46+tn+te+tc;
    var ini=loc+30+dv.getUint16(loc+26,true)+dv.getUint16(loc+28,true),dados=b.subarray(ini,ini+comp);
    if(/\/$/.test(nome)) continue;
    tarefas.push((function(nome,metodo,dados){
      if(metodo===0) return Promise.resolve([nome,dec.decode(dados)]);
      if(metodo===8&&typeof DecompressionStream!=='undefined') return new Response(new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(function(t){ return [nome,t]; });
      return Promise.reject(new Error('“'+nome+'” está comprimido de um jeito que este navegador não lê. Use o zip exportado pelo site, sem refazer.'));
    })(nome,metodo,dados));
  }
  return Promise.all(tarefas).then(function(ps){ var o={}; ps.forEach(function(x){ o[x[0]]=x[1]; }); return o; });
}
/* Link pré-preenchido do Google Forms -> endereço de envio e campos.
   As respostas de exemplo (TIPO, COMENTARIO, NOME, CONTEXTO, NAVEGADOR) dizem qual entry.N é cada campo. */
function lerFormularioGoogle(link){
  var t=String(link||'').trim(); if(!t) return null;
  var m=/https:\/\/docs\.google\.com\/forms\/d\/e\/([\w-]+)\//.exec(t); if(!m) return {erro:'O link não é de um Google Form publicado (docs.google.com/forms/d/e/...).'};
  var campos={},q=t.split('?')[1]||'';
  q.split('&').forEach(function(par){ var kv=par.split('='); if(!/^entry\.\d+$/.test(kv[0])) return; var v=decodeURIComponent((kv[1]||'').replace(/\+/g,' ')).trim().normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase(); if(['TIPO','COMENTARIO','NOME','CONTEXTO','NAVEGADOR'].indexOf(v)>=0) campos[v]=kv[0]; });
  if(!campos.COMENTARIO) return {erro:'O link não tem a resposta COMENTARIO. Gere de novo o link pré-preenchido respondendo cada pergunta com a palavra indicada em config.js.'};
  return {envio:'https://docs.google.com/forms/d/e/'+m[1]+'/formResponse',campos:campos};
}
if(typeof module!=='undefined') module.exports={exemplo:exemplo,exemplos:exemplos,NATUREZAS:NATUREZAS,grafo:grafo,validar:validar,caminhar:caminhar,previsao:previsao,valorResposta:valorResposta,valorRelato:valorRelato,respondido:respondido,fluxoMermaid:fluxoMermaid,aplicarFluxo:aplicarFluxo,formJSON:formJSON,idLivre:idLivre,usados:usados,expandir:expandir,temBlocos:temBlocos,validarBloco:validarBloco,lerFormularioGoogle:lerFormularioGoogle,zipCriar:zipCriar,zipLer:zipLer,aplicarForm:aplicarForm,I:I,O:O,importarMermaidLivre:importarMermaidLivre,importarMiroHefesto:importarMiroHefesto,fluxoMiro:fluxoMiro,aplicarFluxoMiro:aplicarFluxoMiro,ehConvencaoMiro:ehConvencaoMiro,slug:slug,lerRespostaIA:lerRespostaIA,promptMiro:promptMiro,ehPergunta:ehPergunta,temOpcoes:temOpcoes};
