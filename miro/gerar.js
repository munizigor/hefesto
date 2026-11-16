/* Gera ../protocolos-miro.js a partir dos diagramas extraídos do quadro do Miro.
   Uso: node miro/gerar.js   (a partir da raiz do repositório)
   Entrada: miro/manifesto.tsv (id do diagrama <TAB> título) e miro/<id>.mmd (código Mermaid de cada diagrama). */
var fs=require('fs'),path=require('path'),L=require('../logic.js');
var dir=__dirname,linhas=fs.readFileSync(path.join(dir,'manifesto.tsv'),'utf8').trim().split('\n').map(function(l){ var p=l.split('\t'); return {id:p[0],titulo:p[1]}; });
var semOrig=function(t){ return t.replace(/\s*\(original\)\s*$/,'').trim(); };
var novos={}; linhas.forEach(function(x){ if(!/\(original\)\s*$/.test(x.titulo)) novos[L.slug(x.titulo)]=1; });
var nats=[],prot={},notas={},usados={},faltam=[];
linhas.forEach(function(x){
  var orig=/\(original\)\s*$/.test(x.titulo),nome=semOrig(x.titulo);
  if(orig&&novos[L.slug(nome)]) return; /* há versão nova do mesmo fluxo */
  var arq=path.join(dir,x.id+'.mmd'); if(!fs.existsSync(arq)){ faltam.push(x.titulo); return; }
  var id=String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40).replace(/_+$/,''),n=2,b=id; while(usados[id]){ id=b+'_'+n; n++; } usados[id]=1;
  nats.push({id:id,nome:nome,fonte:orig?'transcrição do quadro':'fluxo novo',miro:x.id});
});
nats.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });
var resumo=[];
nats.forEach(function(n){
  var src=fs.readFileSync(path.join(dir,n.miro+'.mmd'),'utf8'),r=L.importarMiroHefesto(src,nats),v=L.validar(r.itens);
  prot[n.id]=r.itens; notas[n.id]=r.avisos.concat(v.erros.map(function(e){ return 'Erro: '+e; }),v.avisos);
  resumo.push((v.erros.length?'ERRO ':'ok   ')+n.nome+' · '+r.itens.length+' itens · '+r.avisos.length+' notas'+(v.erros.length?' · '+v.erros.join(' | '):''));
});
var out='/* GERADO por miro/gerar.js a partir dos fluxogramas do quadro do Miro. Não edite à mão: ajuste o quadro, extraia de novo e rode o gerador. */\n'
 +'NATUREZAS = '+JSON.stringify(nats.map(function(n){ return {id:n.id,nome:n.nome,fonte:n.fonte}; }),null,0).replace(/\},\{/g,'},\n  {')+';\n'
 +'var PROTOCOLOS_MIRO = '+JSON.stringify(prot)+';\n'
 +'var NOTAS_MIRO = '+JSON.stringify(notas,null,1)+';\n'
 +'exemplos = function(){ return JSON.parse(JSON.stringify(PROTOCOLOS_MIRO)); };\n'
 +"if(typeof module!=='undefined') module.exports={NATUREZAS:NATUREZAS,PROTOCOLOS_MIRO:PROTOCOLOS_MIRO,NOTAS_MIRO:NOTAS_MIRO};\n";
fs.writeFileSync(path.join(dir,'..','protocolos-miro.js'),out);
console.log(resumo.join('\n')); if(faltam.length) console.log('SEM ARQUIVO: '+faltam.join('; '));
console.log(nats.length+' naturezas');
