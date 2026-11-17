/* Padroniza respostas e falas dos protocolos, sem mudar para onde cada resposta leva.
   Uso: node ferramentas/padronizar.js [--aplicar]
   1. Respostas do tipo sim/não: ordem Sim, Não, Não sabe ("Não sei" vira "Não sabe"). Cada resposta leva junto
      o seu destino e a marca de relato, então só muda a ordem e a grafia.
   2. Respostas numéricas em ordem crescente ("5ou mais" vira "5 ou mais").
   3. Falas de despacho: as versões da fala padrão e da fala da videochamada passam a apontar para protocolos/falas.json
      (campo "fala"); notas para o atendente ("🚒 Despacho conforme…") ganham "nota": true e deixam de ser lidas ao solicitante.
   Antes de gravar, cada natureza é comparada com a original caminho a caminho (respostas comparadas pelo sentido). */
var fs=require('fs'),path=require('path'),L=require('../logic.js');
var raiz=path.join(__dirname,'..'),dir=path.join(raiz,'protocolos'),aplicar=process.argv.indexOf('--aplicar')>=0;
var FALAS={
  padrao:{nome:'Despacho: socorro a caminho',texto:'O socorro já foi acionado e está a caminho. Vou fazer algumas perguntas rápidas para ajudar a equipe. Mantenha a calma e siga minhas orientações, por favor.'},
  video:{nome:'Despacho: videochamada',texto:'Iremos realizar uma vídeo chamada para orientá-lo(a) até a chegada da guarnição! Mantenha a calma e siga as orientações.'}
};
var norm=function(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); };
var falaDe=function(t){ var n=norm(t); if(n===norm(FALAS.padrao.texto)||n===norm(FALAS.padrao.texto.replace('fazer algumas','fazer mais algumas'))) return 'padrao'; if(n===norm(FALAS.video.texto)) return 'video'; return ''; };
var SN={'sim':0,'nao':1,'nao sei':2,'nao sabe':2};
var contas={respostas:0,numericas:0,falas:0,notas:0};
function padronizarItens(itens){
  itens.forEach(function(x){
    if(x.opcoes.length>1&&x.opcoes.every(function(o){ return SN[norm(o.rotulo)]!=null; })&&new Set(x.opcoes.map(function(o){ return SN[norm(o.rotulo)]; })).size===x.opcoes.length){
      var antes=JSON.stringify(x.opcoes);
      x.opcoes.forEach(function(o){ if(SN[norm(o.rotulo)]===2) o.rotulo='Não sabe'; else if(SN[norm(o.rotulo)]===1) o.rotulo='Não'; else o.rotulo='Sim'; });
      x.opcoes.sort(function(a,b){ return SN[norm(a.rotulo)]-SN[norm(b.rotulo)]; });
      if(JSON.stringify(x.opcoes)!==antes) contas.respostas++;
    }
    if(x.opcoes.length>1&&x.opcoes.every(function(o){ return /^\d/.test(o.rotulo.trim()); })){
      var a2=JSON.stringify(x.opcoes);
      x.opcoes.forEach(function(o){ o.rotulo=o.rotulo.replace(/^(\d+)\s*ou mais/i,'$1 ou mais'); });
      x.opcoes.sort(function(a,b){ return parseFloat(a.rotulo)-parseFloat(b.rotulo); });
      if(JSON.stringify(x.opcoes)!==a2) contas.numericas++;
    }
    if(x.despacho){
      var f=falaDe(x.texto);
      if(f){ if(x.fala!==f){ x.fala=f; x.texto=FALAS[f].texto; contas.falas++; } }
      else if(/^🚒/.test(x.texto)&&!x.nota){ x.nota=true; x.texto=x.texto.replace(/^🚒\s*/,''); contas.notas++; }
    }
  });
  return itens;
}
/* equivalência pelo sentido: mesma sequência de perguntas; respostas comparadas como conjunto {rótulo normalizado: destino} */
var rot=function(r){ var n=norm(r); return SN[n]===2?'nao sabe':n.replace(/^(\d+) ?ou mais$/,'$1 ou mais'); };
function sig(x){ return JSON.stringify([x.tipo,x.nota?'':x.texto,!!x.obrig,!!x.outro,!!x.despacho,x.relato!==false,x.opcoes.map(function(o){ return [rot(o.rotulo),o.relato!==false]; }).sort()]); }
function equivalentes(a,b){
  var A=L.grafo(a),B=L.grafo(b),vis={},f=[[a[0]&&a[0].id,b[0]&&b[0].id]];
  var suc=function(G,x){ var m={}; x.opcoes.forEach(function(o){ m[rot(o.rotulo)]=o.vai||G.def[x.id]; }); m['__padrao']=G.def[x.id]; return m; };
  while(f.length){ var p=f.pop(),x=p[0],y=p[1],k=x+'|'+y; if(vis[k]) continue; vis[k]=1;
    if(x==='FIM'||y==='FIM'){ if(x!==y) return 'fim '+x+'/'+y; continue; }
    var ix=A.item[x],iy=B.item[y]; if(!ix||!iy) return 'ausente '+x+'/'+y;
    var sx=JSON.parse(sig(ix)),sy=JSON.parse(sig(iy)); if(ix.despacho&&ix.texto!==iy.texto&&!iy.fala&&!iy.nota) return 'fala '+x; sx[1]=sy[1]=''; if(JSON.stringify(sx)!==JSON.stringify(sy)) return 'diferente '+x+'/'+y;
    var ma=suc(A,ix),mb=suc(B,iy); Object.keys(ma).forEach(function(r){ f.push([ma[r],mb[r]]); }); }
  return '';
}
var nats=JSON.parse(fs.readFileSync(path.join(dir,'naturezas.json'),'utf8'));
var listaB=fs.existsSync(path.join(dir,'blocos.json'))?JSON.parse(fs.readFileSync(path.join(dir,'blocos.json'),'utf8')):[];
var arquivos=nats.map(function(n){ return path.join(dir,n.id+'.json'); }).concat(listaB.map(function(b){ return path.join(dir,'blocos',b.id+'.json'); }));
var dados={},orig={}; arquivos.forEach(function(f){ dados[f]=JSON.parse(fs.readFileSync(f,'utf8')); orig[f]=JSON.parse(JSON.stringify(dados[f].itens)); padronizarItens(dados[f].itens); });
/* conferência com blocos expandidos (antes x depois) */
var getB=function(fonte){ return function(id){ var f=path.join(dir,'blocos',id+'.json'),b=listaB.filter(function(x){ return x.id===id; })[0]; return b?{nome:b.nome,itens:fonte(f)}:null; }; };
var antesB=getB(function(f){ return orig[f]; }),depoisB=getB(function(f){ return dados[f].itens; });
L.definirFalas(FALAS);
var problemas=[];
nats.forEach(function(n){ var f=path.join(dir,n.id+'.json'),e=equivalentes(L.expandir(orig[f],antesB),L.expandir(dados[f].itens,depoisB)); if(e) problemas.push(n.nome+': '+e); });
console.log('Respostas reordenadas ou corrigidas: '+contas.respostas+' perguntas sim/não, '+contas.numericas+' numéricas.');
console.log('Falas ligadas à biblioteca: '+contas.falas+'. Notas para o atendente separadas: '+contas.notas+'.');
if(problemas.length){ console.log('DIFERENÇAS (nada gravado):\n  '+problemas.join('\n  ')); process.exit(1); }
console.log('Conferência: todas as naturezas seguem os mesmos caminhos.');
if(aplicar){
  arquivos.forEach(function(f){ if(JSON.stringify(orig[f])!==JSON.stringify(dados[f].itens)) fs.writeFileSync(f,JSON.stringify(dados[f],null,1)+'\n'); });
  fs.writeFileSync(path.join(dir,'falas.json'),JSON.stringify(FALAS,null,1)+'\n');
  console.log('Gravado em protocolos/. Rode node ferramentas/montar.js.');
}
