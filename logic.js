/* ===== LÓGICA PURA (sem DOM) =====
   Item: {id, tipo, texto, obrig, outro, mermaid, prox, opcoes:[{id, rotulo, vai}]}
   prox: '' = próximo da lista; id; 'FIM'.   vai: '' = segue o padrão do item; id; 'FIM'. */
var TIPOS = [['unica','Pergunta · escolha única'],['multipla','Pergunta · múltipla escolha'],['lista','Pergunta · lista de seleção'],['numero','Pergunta · número'],['texto','Pergunta · texto curto'],['instrucao','Instrução ao solicitante'],['informacao','Informação ao atendente'],['diagrama','Fluxograma de consulta']];
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
  if(comRotulos) itens.forEach(function(it){ var t=aspas((it.tipo==='diagrama'?'Fluxograma: ':'')+(it.texto||it.id)); L.push('  '+it.id+(temOpcoes(it)||it.tipo==='numero'||it.tipo==='texto'?'{'+t+'}':it.tipo==='informacao'?'('+t+')':it.tipo==='diagrama'?'[['+t+']]':'['+t+']')); });
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
      if(forma[0]==='{'){ tipo='unica'; texto=forma.replace(/^\{+/,'').replace(/\}+$/,''); }
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
    if(temOpcoes(it)){ x.opcoes=it.opcoes.map(function(p){ return {id:p.id,rotulo:p.rotulo}; }); if(it.tipo==='multipla'&&it.outro) x.permiteOutro=true; }
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
    var it=I(id,x.tipo,x.tipo==='diagrama'?(x.titulo||''):(x.texto||''),{obrig:!!x.obrigatoria,outro:!!x.permiteOutro,mermaid:x.mermaid||'',prox:a?a.prox:''});
    if(temOpcoes(it)) it.opcoes=(x.opcoes||[]).map(function(p){ var pa=a?a.opcoes.filter(function(q){return q.id===p.id;})[0]:null; return O(p.id,p.rotulo,pa?pa.vai:''); });
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
/* texto da resposta de um item, para ficha, relato e registro */
function valorResposta(it,r){
  if(!ehPergunta(it)) return r===true?(it.tipo==='instrucao'?'dita':'ciente'):'';
  if(!r) return '';
  if(r.pulada) return 'não respondida';
  if(temOpcoes(it)) return it.opcoes.filter(function(o){ return (r.ops||[]).indexOf(o.id)>=0; }).map(function(o){ return o.rotulo; }).concat(r.outro&&String(r.outro).trim()?[String(r.outro).trim()]:[]).join(', ');
  return String(r.valor==null?'':r.valor);
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
if(typeof module!=='undefined') module.exports={exemplo:exemplo,exemplos:exemplos,NATUREZAS:NATUREZAS,grafo:grafo,validar:validar,caminhar:caminhar,previsao:previsao,valorResposta:valorResposta,respondido:respondido,fluxoMermaid:fluxoMermaid,aplicarFluxo:aplicarFluxo,formJSON:formJSON,aplicarForm:aplicarForm,I:I,O:O};
