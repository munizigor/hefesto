/* Monta ../protocolos.js a partir da pasta protocolos/ (a fonte de verdade).
   Uso: node ferramentas/montar.js            monta a partir de protocolos/
        node ferramentas/montar.js arq.zip    antes, aplica um zip exportado pelo site (Protocolos, Exportar)
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
var arg=process.argv[2];
if(arg){
  var z=lerZip(fs.readFileSync(arg)),mud=[];
  Object.keys(z).forEach(function(nome){
    var m=/(?:^|\/)protocolos\/([a-z0-9_]+)\.json$|(?:^|\/)(naturezas)\.json$/.exec(nome); if(!m) return;
    var alvo=path.join(dir,(m[1]||m[2])+'.json'),novo=z[nome].toString('utf8');
    JSON.parse(novo);
    var velho=fs.existsSync(alvo)?fs.readFileSync(alvo,'utf8'):null;
    if(velho!==novo){ fs.writeFileSync(alvo,novo); mud.push((velho==null?'nova  ':'mudou ')+(m[1]||m[2])); }
  });
  console.log(mud.length?mud.join('\n'):'Nada mudou.');
  var fbk=Object.keys(z).filter(function(k){ return /(^|\/)feedback\.json$/.test(k); })[0];
  if(fbk){ /* feedback pode ter nome de quem escreveu: fica fora do Git (feedback-recebido/ está no .gitignore) */
    var lista=JSON.parse(z[fbk].toString('utf8')),pasta=path.join(raiz,'feedback-recebido'); if(!fs.existsSync(pasta)) fs.mkdirSync(pasta);
    var destino=path.join(pasta,path.basename(arg).replace(/\.zip$/i,'')+'.json'); fs.writeFileSync(destino,JSON.stringify(lista,null,1)+'\n');
    console.log(lista.length+' feedback(s) no zip, salvos em '+path.relative(raiz,destino)+' (fora do Git):');
    lista.forEach(function(f){ console.log('  ['+f.tipo+'] '+f.texto.replace(/\s+/g,' ').slice(0,120)+(f.contexto&&f.contexto.natureza?' · '+f.contexto.natureza:'')); });
  }
}
var nats=JSON.parse(fs.readFileSync(path.join(dir,'naturezas.json'),'utf8')),prot={},notas={};
var listados={}; nats.forEach(function(n){ listados[n.id+'.json']=1; });
var orfaos=fs.readdirSync(dir).filter(function(f){ return /\.json$/.test(f)&&f!=='naturezas.json'&&!listados[f]; });
if(orfaos.length) console.log('Atenção: estes arquivos não estão em naturezas.json (natureza excluída?) e ficaram fora do site: '+orfaos.join(', ')+'. Apague com git rm se for o caso.');
nats.forEach(function(n){ var f=path.join(dir,n.id+'.json'); var o=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{itens:[]}; prot[n.id]=o.itens||[]; if(o.notas&&o.notas.length) notas[n.id]=o.notas; });
var out='/* GERADO por ferramentas/montar.js a partir da pasta protocolos/. Não edite à mão. */\n'
 +'NATUREZAS = '+JSON.stringify(nats,null,0).replace(/\},\{/g,'},\n  {')+';\n'
 +'var PROTOCOLOS_PUBLICADOS = '+JSON.stringify(prot)+';\n'
 +'var NOTAS_PROTOCOLOS = '+JSON.stringify(notas)+';\n'
 +'exemplos = function(){ return JSON.parse(JSON.stringify(PROTOCOLOS_PUBLICADOS)); };\n'
 +"if(typeof module!=='undefined') module.exports={NATUREZAS:NATUREZAS,PROTOCOLOS_PUBLICADOS:PROTOCOLOS_PUBLICADOS,NOTAS_PROTOCOLOS:NOTAS_PROTOCOLOS};\n";
fs.writeFileSync(path.join(raiz,'protocolos.js'),out);
console.log('protocolos.js montado: '+nats.length+' naturezas.');
