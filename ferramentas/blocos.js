/* Encontra trechos de fluxo idênticos e os transforma em blocos reutilizáveis, sem mudar o atendimento.
   Uso: node ferramentas/blocos.js [--aplicar] [natureza ...]
     sem natureza: procura em todas as naturezas juntas (blocos podem servir a várias)
     sem --aplicar: só mostra o que faria
   Garantia: depois de aplicar, cada natureza é comparada com a original percorrendo todos os caminhos da
   entrevista em paralelo (mesmas perguntas, mesmas respostas, mesmos destinos). Se algo diferir, nada é gravado. */
var fs=require('fs'),path=require('path'),L=require('../logic.js');
var raiz=path.join(__dirname,'..'),dir=path.join(raiz,'protocolos'),dirB=path.join(dir,'blocos');
var args=process.argv.slice(2),aplicar=args.indexOf('--aplicar')>=0,alvoNats=args.filter(function(a){ return a[0]!=='-'; });
var nats=JSON.parse(fs.readFileSync(path.join(dir,'naturezas.json'),'utf8'));
var listaB=fs.existsSync(path.join(dir,'blocos.json'))?JSON.parse(fs.readFileSync(path.join(dir,'blocos.json'),'utf8')):[];
var blocos={}; listaB.forEach(function(b){ blocos[b.id]={nome:b.nome,itens:JSON.parse(fs.readFileSync(path.join(dirB,b.id+'.json'),'utf8')).itens}; });
var getB=function(id){ return blocos[id]; };
var prot={}; nats.forEach(function(n){ if(!alvoNats.length||alvoNats.indexOf(n.id)>=0) prot[n.id]=JSON.parse(fs.readFileSync(path.join(dir,n.id+'.json'),'utf8')).itens; });
var original=JSON.parse(JSON.stringify(prot));

/* ---------- assinatura de um item (sem o id) ---------- */
function local(x){ return JSON.stringify(x.tipo==='bloco'?['bloco',x.bloco]:[x.tipo,x.texto,!!x.obrig,!!x.outro,!!x.despacho,!!x.video,x.relato!==false,x.mermaid||'',x.opcoes.map(function(o){ return [o.rotulo,o.relato!==false]; })]); }
function grafoDe(itens){ var g=L.grafo(itens),s={}; itens.forEach(function(x){ s[x.id]=x.opcoes.map(function(o){ return o.vai||g.def[x.id]; }).concat([g.def[x.id]]); }); return {item:g.item,succ:s,ini:itens[0]&&itens[0].id}; }

/* ---------- equivalência: percorre as duas entrevistas em paralelo ---------- */
function equivalentes(a,b){
  var A=grafoDe(a),B=grafoDe(b),visto={},fila=[[A.ini,B.ini]];
  while(fila.length){
    var p=fila.pop(),x=p[0],y=p[1],k=x+'|'+y;
    if(visto[k]) continue; visto[k]=1;
    if(x==='FIM'||y==='FIM'){ if(x!==y) return 'fim diferente em '+x+' / '+y; continue; }
    if(!A.item[x]||!B.item[y]) return 'item ausente '+x+' / '+y;
    var ia=JSON.parse(local(A.item[x])),ib=JSON.parse(local(B.item[y]));
    if(JSON.stringify(ia)!==JSON.stringify(ib)) return 'item diferente: '+x+' / '+y;
    for(var i=0;i<A.succ[x].length;i++) fila.push([A.succ[x][i],B.succ[y][i]]);
  }
  return '';
}

/* ---------- casamento de dois trechos a partir de duas raízes ---------- */
function casar(G,r,s,limite){
  var m={},inv={},saidaT=null,saidaS=null,ok=true,pilha=[[r,s]];
  m[r.k]=s; inv[s.k]=r;
  var no=function(nat,id){ return {nat:nat,id:id,k:nat+':'+id}; };
  while(pilha.length&&ok){
    var p=pilha.pop(),t=p[0],u=p[1],st=G[t.nat].succ[t.id],su=G[u.nat].succ[u.id];
    for(var i=0;i<st.length;i++){
      var a=st[i],b=su[i];
      if(a==='FIM'&&b==='FIM') continue;
      var na=a==='FIM'?null:no(t.nat,a),nb=b==='FIM'?null:no(u.nat,b),dentro=false;
      if(na&&nb&&na.k!==nb.k&&(!limite||limite[na.k])){
        var xa=G[t.nat].item[a],xb=G[u.nat].item[b];
        if(xa&&xb&&local(xa)===local(xb)){
          if(!m[na.k]&&!inv[nb.k]){ m[na.k]=nb; inv[nb.k]=na; pilha.push([na,nb]); dentro=true; }
          else if(m[na.k]&&m[na.k].k===nb.k) dentro=true;
        }
      }
      if(!dentro){
        var ea=a==='FIM'?'FIM':na.k,eb=b==='FIM'?'FIM':nb.k;
        if(ea==='FIM'||eb==='FIM'){ ok=false; break; } /* um termina e o outro segue: não é o mesmo trecho */
        if(saidaT===null){ saidaT=ea; saidaS=eb; } else if(saidaT!==ea||saidaS!==eb){ ok=false; break; }
      }
    }
  }
  return ok?{mapa:m,saidaT:saidaT,saidaS:saidaS,n:Object.keys(m).length}:null;
}

/* ---------- um passo: o bloco que mais economiza ---------- */
function melhorBloco(){
  var G={},todos=[];
  Object.keys(prot).forEach(function(n){ G[n]=grafoDe(prot[n]); var alc=alcancaveis(prot[n]); prot[n].forEach(function(x){ if(alc[x.id]&&x.tipo!=='bloco') todos.push({nat:n,id:x.id,k:n+':'+x.id,sig:local(x)}); }); });
  var porSig={}; todos.forEach(function(t){ (porSig[t.sig]=porSig[t.sig]||[]).push(t); });
  var melhor=null;
  Object.keys(porSig).forEach(function(sig){
    var grupo=porSig[sig]; if(grupo.length<2) return;
    grupo.forEach(function(r){
      grupo.forEach(function(s){
        if(s===r) return;
        var c=casar(G,r,s); if(!c||c.n<2) return;
        var lim={}; Object.keys(c.mapa).forEach(function(k){ lim[k]=1; });
        var inst=[{raiz:r,mapa:null,saida:c.saidaT}];
        var usados={}; Object.keys(c.mapa).forEach(function(k){ usados[k]=1; });
        grupo.forEach(function(o){ if(o===r||usados[o.k]) return; var d=casar(G,r,o,lim); if(d&&d.n===c.n&&!Object.keys(d.mapa).some(function(k){ return usados[d.mapa[k].k]; })){ Object.keys(d.mapa).forEach(function(k){ usados[d.mapa[k].k]=1; }); inst.push({raiz:o,saida:d.saidaS}); } });
        var econ=c.n*inst.length-c.n-inst.length;
        var nNat=inst.map(function(i){ return i.raiz.nat; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).length;
        /* só vale a pena se o trecho se repete 3+ vezes ou em mais de uma natureza */
        if(inst.length>=2&&econ>=3&&(inst.length>=3||nNat>=2)&&(!melhor||econ>melhor.econ)) melhor={econ:econ,tpl:r,mapa:c.mapa,inst:inst,n:c.n,saidaT:c.saidaT};
      });
    });
  });
  return melhor?Object.assign(melhor,{G:G}):null;
}
function alcancaveis(itens){ var g=grafoDe(itens),v={},f=[g.ini]; while(f.length){ var x=f.pop(); if(!x||x==='FIM'||v[x]||!g.item[x]) continue; v[x]=1; g.succ[x].forEach(function(y){ f.push(y); }); } return v; }

function nomeBloco(itens){ var p=itens.filter(function(x){ return L.ehPergunta(x); })[0]||itens[0]; return 'Trecho: '+p.texto.replace(/\?$/,'').slice(0,60); }

/* ---------- aplica um bloco ---------- */
function aplicarBloco(b){
  var G=b.G,tn=b.tpl.nat,ids=Object.keys(b.mapa).map(function(k){ return k.split(':')[1]; });
  /* itens do bloco, na ordem em que o trecho é percorrido */
  var ordem=[],visto={},f=[b.tpl.id];
  while(f.length){ var x=f.shift(); if(visto[x]||ids.indexOf(x)<0) continue; visto[x]=1; ordem.push(x); G[tn].succ[x].forEach(function(y){ f.push(y); }); }
  var usadosId={},novoId={}; ordem.forEach(function(id){ novoId[id]=L.idLivre(id.replace(/_\d+$/,''),usadosId); });
  var destino=function(t){ if(t==='FIM') return 'FIM'; if(visto[t]) return novoId[t]; return 'SAIDA'; };
  var itensB=ordem.map(function(id){ var x=JSON.parse(JSON.stringify(G[tn].item[id])); x.id=novoId[id]; var g=G[tn].succ[id]; x.opcoes.forEach(function(o,i){ o.vai=destino(g[i]); }); x.prox=destino(g[g.length-1]); x.opcoes.forEach(function(o){ if(o.vai===x.prox) o.vai=''; }); return x; });
  var usadosB={}; Object.keys(blocos).forEach(function(k){ usadosB[k]=1; });
  var bid=L.idLivre('trecho_'+novoId[ordem[0]],usadosB),nome=nomeBloco(itensB),n2=2; while(Object.keys(blocos).some(function(k){ return blocos[k].nome===nome; })) nome=nomeBloco(itensB)+' ('+(n2++)+')';
  blocos[bid]={nome:nome,itens:itensB};
  /* troca cada ocorrência por um item de bloco */
  b.inst.forEach(function(ins){
    var lista=prot[ins.raiz.nat],x=lista.filter(function(y){ return y.id===ins.raiz.id; })[0];
    var saida=ins.saida?ins.saida.split(':')[1]:'FIM';
    var novo=L.I(x.id,'bloco',nome,{bloco:bid,prox:saida});
    lista[lista.indexOf(x)]=novo;
  });
  /* tira o que ficou sem uso (e era alcançável antes) */
  Object.keys(prot).forEach(function(n){ var antes=alcancaveis(original[n]),agora=alcancaveis(prot[n]); var ref={}; prot[n].forEach(function(x){ x.opcoes.forEach(function(o){ ref[o.vai]=1; }); ref[x.prox]=1; }); prot[n]=prot[n].filter(function(x,i){ return i===0||agora[x.id]||!antes[x.id]||ref[x.id]; }); });
  return bid;
}

/* ---------- laço ---------- */
var criados=[],passo=0;
while(passo++<40){
  var b=melhorBloco(); if(!b) break;
  var bid=aplicarBloco(b);
  criados.push(bid+' · '+blocos[bid].nome+' · '+blocos[bid].itens.length+' itens · usado '+b.inst.length+'x em '+b.inst.map(function(i){ return i.raiz.nat; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', '));
}
/* conferência */
var problemas=[];
Object.keys(prot).forEach(function(n){ var e=equivalentes(original[n],L.expandir(prot[n],getB)); if(e) problemas.push(n+': '+e); var v=L.validar(L.expandir(prot[n],getB)); if(v.erros.length) problemas.push(n+': erro de validação '+v.erros[0]); });
Object.keys(prot).forEach(function(n){ if(JSON.stringify(prot[n])!==JSON.stringify(original[n])) console.log(n+': '+original[n].length+' -> '+prot[n].length+' itens'); });
console.log('\nBlocos criados ('+criados.length+'):\n  '+criados.join('\n  '));
if(problemas.length){ console.log('\nDIFERENÇAS (nada gravado):\n  '+problemas.join('\n  ')); process.exit(1); }
console.log('\nConferência: todos os caminhos de cada entrevista continuam iguais aos originais.');
if(aplicar){
  if(!fs.existsSync(dirB)) fs.mkdirSync(dirB);
  Object.keys(prot).forEach(function(n){ var f=path.join(dir,n+'.json'),o=JSON.parse(fs.readFileSync(f,'utf8')); if(JSON.stringify(o.itens)===JSON.stringify(prot[n])) return; o.itens=prot[n]; delete o.layout; fs.writeFileSync(f,JSON.stringify(o,null,1)+'\n'); });
  var lista=Object.keys(blocos).map(function(k){ return {id:k,nome:blocos[k].nome}; });
  fs.writeFileSync(path.join(dir,'blocos.json'),JSON.stringify(lista,null,1)+'\n');
  lista.forEach(function(b){ fs.writeFileSync(path.join(dirB,b.id+'.json'),JSON.stringify({bloco:b,itens:blocos[b.id].itens},null,1)+'\n'); });
  console.log('Gravado em protocolos/. Rode node ferramentas/montar.js.');
}
