/* Monta ../protocolos.js a partir da pasta protocolos/ (a fonte de verdade).
   Uso: node ferramentas/montar.js            monta a partir de protocolos/
        node ferramentas/montar.js arq.zip    antes, aplica um zip exportado pelo site (Protocolos, Exportar)
        node ferramentas/montar.js arq.zip --so-aprovadas   aplica só as naturezas e blocos aprovados na revisão técnica
   Ao aplicar um zip, mostra o que mudou em cada natureza e a situação da revisão, e acrescenta
   o registro em protocolos/historico.json (mostrado no site, no topo de cada natureza).
   protocolos/naturezas.json   lista [{id, nome, fonte}]
   protocolos/<id>.json        {"natureza":{id,nome}, "itens":[...], "notas":[...]} */
var fs=require('fs'),path=require('path'),zlib=require('zlib');
var raiz=path.join(__dirname,'..'),dir=path.join(raiz,'protocolos');
function lerZip(buf){ /* leitor mínimo: arquivos guardados (store) ou comprimidos (deflate) */
  var out={},fim=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06])); if(fim<0) throw new Error('zip inválido');
  var n=buf.readUInt16LE(fim+10),p=buf.readUInt32LE(fim+16);
  for(var i=0;i<n;i++){
    var metodo=buf.readUInt16LE(p+10),comp=buf.readUInt32LE(p+20),tn=buf.readUInt16LE(p+28),te=buf.readUInt16LE(p+30),tc=buf.readUInt16LE(p+32),loc=buf.readUInt32LE(p+42);
    var nome=buf.slice(p+46,p+46+tn).toString('utf8'); p+=46+tn+te+tc;
    var ini=loc+30+buf.readUInt16LE(loc+26)+buf.readUInt16LE(loc+28),dados=buf.slice(ini,ini+comp);
    if(!/\/$/.test(nome)) out[nome]=metodo===8?zlib.inflateRawSync(dados):dados;
  }
  return out;
}
var args=process.argv.slice(2),soAprovadas=args.indexOf('--so-aprovadas')>=0,arg=args.filter(function(a){ return !/^--/.test(a); })[0];
var L=require('../logic.js'),SIT={rascunho:'rascunho',pronta:'aguardando revisão',aprovada:'aprovada',devolvida:'devolvida'};
var lerJ=function(f,pad){ return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):pad; };
if(arg){
  var z=lerZip(fs.readFileSync(arg)),mud=[],achar=function(re){ return Object.keys(z).filter(function(k){ return re.test(k); })[0]; };
  var rk=achar(/(^|\/)revisao\.json$/),rev=rk?JSON.parse(z[rk].toString('utf8')):{};
  var fk=achar(/(^|\/)falas\.json$/); L.definirFalas(fk?JSON.parse(z[fk].toString('utf8')):lerJ(path.join(dir,'falas.json'),{}));
  var natsAntes=lerJ(path.join(dir,'naturezas.json'),[]),bloAntes=lerJ(path.join(dir,'blocos.json'),[]);
  var nomeDe=function(k,lista){ var id=k.replace(/^bloco:/,''),x=lista.filter(function(y){ return y.id===id; })[0]; return x?x.nome:null; };
  var nk=achar(/(^|\/)naturezas\.json$/),bk=achar(/(^|\/)blocos\.json$/),natsZ=nk?JSON.parse(z[nk].toString('utf8')):natsAntes,bloZ=bk?JSON.parse(z[bk].toString('utf8')):bloAntes;
  var pulou={},hoje=new Date().toISOString().slice(0,10),hist=lerJ(path.join(dir,'historico.json'),[]),relatorio=[];
  /* 1. entrevistas e blocos: diferença, revisão e (com --so-aprovadas) filtro */
  Object.keys(z).forEach(function(nome){
    var m=/(?:^|\/)protocolos\/([a-z0-9_]+)\.json$|(?:^|\/)blocos\/([a-z0-9_]+)\.json$/.exec(nome); if(!m) return;
    var k=m[1]||'bloco:'+m[2],alvo=m[1]?path.join(dir,m[1]+'.json'):path.join(dir,'blocos',m[2]+'.json');
    var velho=lerJ(alvo,null),novo=JSON.parse(z[nome].toString('utf8')),lista=m[1]?natsZ:bloZ,listaA=m[1]?natsAntes:bloAntes;
    var meta=function(l){ var x=l.filter(function(y){ return y.id===k.replace(/^bloco:/,''); })[0]; return x?JSON.stringify([x.nome,x.despacho||'',x.sinonimos||[]]):''; };
    var dif=L.diferencas(velho?velho.itens:[],novo.itens).map(function(d){ return d.msg; });
    if(!velho) dif.unshift(m[1]?'Natureza nova.':'Bloco novo.'); else if(nomeDe(k,listaA)!==nomeDe(k,lista)) dif.unshift('Nome: “'+nomeDe(k,listaA)+'” → “'+nomeDe(k,lista)+'”.');
    if(velho&&meta(listaA)!==meta(lista)&&nomeDe(k,listaA)===nomeDe(k,lista)) dif.unshift('Despacho ou outros nomes para a busca mudaram.');
    if(!dif.length) return;
    var r=rev[k]||{sit:'rascunho'};
    if(soAprovadas&&r.sit!=='aprovada'){ pulou[k]=1; relatorio.push('PULADA  '+(nomeDe(k,lista)||k)+' ('+SIT[r.sit]+')'); return; }
    relatorio.push((r.sit==='aprovada'?'APROVADA ':'ATENÇÃO  ')+(nomeDe(k,lista)||k)+' · '+SIT[r.sit]+(r.autor?' · alterada por '+r.autor:'')+(r.revisor?' · revisão: '+r.revisor:'')+'\n'+dif.map(function(d){ return '           - '+d; }).join('\n'));
    hist.push({data:hoje,chave:k,nome:nomeDe(k,lista)||k,sit:r.sit,autor:r.autor||'',revisor:r.sit==='aprovada'?r.revisor||'':'',parecer:r.parecer||'',mudancas:dif});
  });
  /* naturezas e blocos puladas mantêm a versão de antes na lista (ou ficam fora, se eram novas) */
  var filtra=function(lz,la,pre){ return lz.filter(function(x){ return !pulou[pre+x.id]||la.some(function(y){ return y.id===x.id; }); }).map(function(x){ return pulou[pre+x.id]?la.filter(function(y){ return y.id===x.id; })[0]:x; }); };
  Object.keys(z).forEach(function(nome){
    var m=/(?:^|\/)protocolos\/([a-z0-9_]+)\.json$|(?:^|\/)(naturezas|blocos|falas)\.json$|(?:^|\/)blocos\/([a-z0-9_]+)\.json$/.exec(nome); if(!m) return;
    if(pulou[m[1]]||pulou['bloco:'+m[3]]) return;
    if(m[2]==='naturezas'&&soAprovadas) z[nome]=Buffer.from(JSON.stringify(filtra(natsZ,natsAntes,''),null,1)+'\n');
    if(m[2]==='blocos'&&soAprovadas) z[nome]=Buffer.from(JSON.stringify(filtra(bloZ,bloAntes,'bloco:'),null,1)+'\n');
    if(m[3]&&!fs.existsSync(path.join(dir,'blocos'))) fs.mkdirSync(path.join(dir,'blocos'));
    var alvo=m[3]?path.join(dir,'blocos',m[3]+'.json'):path.join(dir,(m[1]||m[2])+'.json'),novo=z[nome].toString('utf8');
    JSON.parse(novo);
    var velho=fs.existsSync(alvo)?fs.readFileSync(alvo,'utf8'):null;
    if(velho!==novo){ fs.writeFileSync(alvo,novo); mud.push((velho==null?'nova  ':'mudou ')+(m[3]?'bloco '+m[3]:(m[1]||m[2]))); }
  });
  console.log(mud.length?mud.join('\n'):'Nada mudou.');
  if(relatorio.length){ console.log('\nRevisão técnica e o que mudou:\n'+relatorio.join('\n'));
    var nao=relatorio.filter(function(l){ return /^ATENÇÃO/.test(l); }).length; if(nao) console.log('\n'+nao+' alteração(ões) aplicadas sem aprovação. Para aplicar só as aprovadas: --so-aprovadas'); }
  fs.writeFileSync(path.join(dir,'historico.json'),JSON.stringify(hist,null,1)+'\n');
  var fbk=Object.keys(z).filter(function(k){ return /(^|\/)feedback\.json$/.test(k); })[0];
  if(fbk){ /* feedback pode ter nome de quem escreveu: fica fora do Git (feedback-recebido/ está no .gitignore) */
    var lista=JSON.parse(z[fbk].toString('utf8')),pasta=path.join(raiz,'feedback-recebido'); if(!fs.existsSync(pasta)) fs.mkdirSync(pasta);
    var destino=path.join(pasta,path.basename(arg).replace(/\.zip$/i,'')+'.json'); fs.writeFileSync(destino,JSON.stringify(lista,null,1)+'\n');
    console.log(lista.length+' feedback(s) no zip, salvos em '+path.relative(raiz,destino)+' (fora do Git):');
    lista.forEach(function(f){ console.log('  ['+f.tipo+'] '+f.texto.replace(/\s+/g,' ').slice(0,120)+(f.contexto&&f.contexto.natureza?' · '+f.contexto.natureza:'')); });
  }
}
var nats=JSON.parse(fs.readFileSync(path.join(dir,'naturezas.json'),'utf8')),prot={},notas={},lays={};
/* blocos reutilizáveis: protocolos/blocos.json e protocolos/blocos/<id>.json */
var blocos=fs.existsSync(path.join(dir,'blocos.json'))?JSON.parse(fs.readFileSync(path.join(dir,'blocos.json'),'utf8')):[];
blocos.forEach(function(b){ var f=path.join(dir,'blocos',b.id+'.json'); var o=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{itens:[]}; prot['bloco:'+b.id]=o.itens||[]; if(o.layout) lays['bloco:'+b.id]=o.layout; });
var listados={'historico.json':1,'impressoes-publicadas.json':1,'blocos.json':1,'falas.json':1}; nats.forEach(function(n){ listados[n.id+'.json']=1; });
var orfaos=fs.readdirSync(dir).filter(function(f){ return /\.json$/.test(f)&&f!=='naturezas.json'&&!listados[f]; });
if(orfaos.length) console.log('Atenção: estes arquivos não estão em naturezas.json (natureza excluída?) e ficaram fora do site: '+orfaos.join(', ')+'. Apague com git rm se for o caso.');
nats.forEach(function(n){ var f=path.join(dir,n.id+'.json'); var o=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{itens:[]}; prot[n.id]=o.itens||[]; if(o.notas&&o.notas.length) notas[n.id]=o.notas; if(o.layout) lays[n.id]=o.layout; });
/* impressão digital de cada versão publicada de cada natureza (mesma conta do site, em app.js).
   O site usa a lista para saber se a cópia do navegador é só uma versão publicada antiga, e então atualiza. */
var impr=function(itens){ var t=JSON.stringify(itens||[]),h=5381; for(var i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return (h>>>0).toString(36)+'.'+t.length; };
var arqImp=path.join(dir,'impressoes-publicadas.json'),imps=fs.existsSync(arqImp)?JSON.parse(fs.readFileSync(arqImp,'utf8')):{};
Object.keys(prot).forEach(function(k){ var x=impr(prot[k]); imps[k]=imps[k]||[]; if(imps[k].indexOf(x)<0) imps[k].push(x); });
fs.writeFileSync(arqImp,JSON.stringify(imps,null,1)+'\n');
var out='/* GERADO por ferramentas/montar.js a partir da pasta protocolos/. Não edite à mão. */\n'
 +'NATUREZAS = '+JSON.stringify(nats,null,0).replace(/\},\{/g,'},\n  {')+';\n'
 +'var FALAS = '+JSON.stringify(fs.existsSync(path.join(dir,'falas.json'))?JSON.parse(fs.readFileSync(path.join(dir,'falas.json'),'utf8')):{})+';\n'
 +"if(typeof definirFalas==='function') definirFalas(FALAS);\n"
 +'var BLOCOS = '+JSON.stringify(blocos)+';\n'
 +'var PROTOCOLOS_PUBLICADOS = '+JSON.stringify(prot)+';\n'
 +'var NOTAS_PROTOCOLOS = '+JSON.stringify(notas)+';\n'
 +'var LAYOUTS_PUBLICADOS = '+JSON.stringify(lays)+';\n'
 +'var IMPRESSOES_PUBLICADAS = '+JSON.stringify(imps)+';\n'
 +'var HISTORICO = '+JSON.stringify(fs.existsSync(path.join(dir,'historico.json'))?JSON.parse(fs.readFileSync(path.join(dir,'historico.json'),'utf8')):[])+';\n'
 +'exemplos = function(){ return JSON.parse(JSON.stringify(PROTOCOLOS_PUBLICADOS)); };\n'
 +"if(typeof module!=='undefined') module.exports={NATUREZAS:NATUREZAS,BLOCOS:BLOCOS,FALAS:FALAS,PROTOCOLOS_PUBLICADOS:PROTOCOLOS_PUBLICADOS,NOTAS_PROTOCOLOS:NOTAS_PROTOCOLOS};\n";
fs.writeFileSync(path.join(raiz,'protocolos.js'),out);
console.log('protocolos.js montado: '+nats.length+' naturezas, '+blocos.length+' blocos.');
