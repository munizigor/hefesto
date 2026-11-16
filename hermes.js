/* ===== HERMES · DEMONSTRAÇÃO (sem DOM) =====
   O Hermes não está ligado neste protótipo. Estes roteiros simulam o que ele faria numa ligação:
   transcrever a conversa e sugerir o preenchimento, sempre para o atendente aceitar ou descartar.

   Roteiro: {id, titulo, resumo, natureza, audio, falas:[{t, quem, txt, sug:[...]}]}
     t      segundos desde o início da ligação (ou do áudio) em que a fala aparece
     quem   'atendente' ou 'solicitante'
     sug    o que o Hermes sugere a partir daquela fala:
            {c:'natureza', v:<id da natureza>}
            {c:'local'|'ref'|'nome'|'tel', v:'texto'}
            {c:'ra', v:'Nome da região administrativa'}   (igual à lista RAS de app.js)
            {c:'resp', id:<id do item da entrevista>, v:{ops:[...]}|{valor:'...'}|true}
            {c:'obs', v:'texto para Observações do atendente'}

   ÁUDIO (desenvolvimento futuro): coloque o arquivo em audios/ e preencha audio:'audios/nome.mp3'.
   Com áudio, a transcrição segue o tempo do áudio; ajuste os "t" de cada fala para bater com a gravação.
   Sem áudio, as falas aparecem pelo relógio da demonstração. Use só gravações simuladas, nunca ligações reais. */
var ROTEIROS = [
  {
    id:'hr_capotamento', natureza:'capotamento', audio:'',
    titulo:'Capotamento na EPTG',
    resumo:'Carro capotado, motorista preso e consciente, cheiro de combustível.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Moço, um carro acabou de capotar aqui na EPTG, sentido Taguatinga!',
        sug:[{c:'natureza',v:'capotamento'},{c:'local',v:'EPTG, sentido Taguatinga'}]},
      {t:9, quem:'atendente', txt:'Em que altura da EPTG?'},
      {t:12, quem:'solicitante', txt:'Logo depois do viaduto do Guará, em frente ao posto de gasolina.',
        sug:[{c:'ra',v:'Guará'},{c:'ref',v:'Depois do viaduto do Guará, em frente ao posto de gasolina'}]},
      {t:19, quem:'atendente', txt:'Tem alguém preso dentro do veículo?'},
      {t:22, quem:'solicitante', txt:'Tem sim, o motorista tá preso pelo cinto, mas tá falando comigo.',
        sug:[{c:'resp',id:'preso',v:{ops:['sim']}}]},
      {t:28, quem:'atendente', txt:'Não tente tirar ele do carro. Peça para ele não se mexer, principalmente o pescoço.',
        sug:[{c:'resp',id:'nao_remover',v:true}]},
      {t:34, quem:'solicitante', txt:'Tá bom, tô falando pra ele ficar parado.'},
      {t:37, quem:'atendente', txt:'Se for seguro, ligue o pisca-alerta e sinalize a pista antes do carro.',
        sug:[{c:'resp',id:'sinalizar',v:true}]},
      {t:42, quem:'atendente', txt:'Quantas pessoas estão feridas?'},
      {t:45, quem:'solicitante', txt:'Só ele, o carro tava só com ele. Tá acordado, mas a cabeça tá sangrando bastante.',
        sug:[{c:'resp',id:'feridos',v:{ops:['1']}},{c:'resp',id:'inconsciente',v:{ops:['nao']}},{c:'obs',v:'Vítima presa consciente, com sangramento na cabeça.'}]},
      {t:53, quem:'atendente', txt:'Tem fogo, fumaça ou vazamento de combustível?'},
      {t:56, quem:'solicitante', txt:'Fogo não, mas tá com um cheiro forte de gasolina.',
        sug:[{c:'resp',id:'riscos',v:{ops:['combustivel']}}]},
      {t:61, quem:'atendente', txt:'Afaste todo mundo do veículo agora e não deixe ninguém fumar perto.',
        sug:[{c:'resp',id:'afastar',v:true}]},
      {t:66, quem:'solicitante', txt:'Beleza, já tô pedindo pro pessoal sair de perto.'},
      {t:69, quem:'atendente', txt:'Tem outro veículo envolvido?'},
      {t:72, quem:'solicitante', txt:'Não, foi só esse. Bateu no meio-fio e virou. Tá ocupando a faixa da esquerda.',
        sug:[{c:'resp',id:'veiculos',v:{ops:['1']}},{c:'resp',id:'via',v:{ops:['parcial']}}]},
      {t:79, quem:'atendente', txt:'Consegue ver a placa?'},
      {t:82, quem:'solicitante', txt:'J, K, L, um, dois, três, quatro.',
        sug:[{c:'resp',id:'placa',v:{valor:'JKL1234'}}]},
      {t:87, quem:'atendente', txt:'Qual o seu nome?'},
      {t:89, quem:'solicitante', txt:'Marcos.', sug:[{c:'nome',v:'Marcos'}]},
      {t:92, quem:'atendente', txt:'Marcos, a viatura já está a caminho. Fique em local seguro.'}
    ]
  },
  {
    id:'hr_vegetacao', natureza:'inc_vegetacao', audio:'',
    titulo:'Fogo no cerrado em Sobradinho II',
    resumo:'Fogo perto de casas e da rede elétrica, animal preso no cercado.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Tá pegando fogo no mato aqui atrás de casa, na DF-150, perto do quilômetro três!',
        sug:[{c:'natureza',v:'inc_vegetacao'},{c:'local',v:'DF-150, próximo ao km 3'}]},
      {t:10, quem:'atendente', txt:'Qual a cidade?'},
      {t:12, quem:'solicitante', txt:'Sobradinho II, atrás da escola da quadra.',
        sug:[{c:'ra',v:'Sobradinho II'},{c:'ref',v:'Atrás da escola'}]},
      {t:17, quem:'atendente', txt:'O fogo está perto de quê?'},
      {t:20, quem:'solicitante', txt:'Das casas, tá vindo pro lado das casas. E tem aqueles postes grandes de energia ali do lado.',
        sug:[{c:'resp',id:'ameaca',v:{ops:['casas','rede']}}]},
      {t:28, quem:'atendente', txt:'Peça para as pessoas saírem das casas próximas e ficarem longe da fumaça.',
        sug:[{c:'resp',id:'afastar_casas',v:true}]},
      {t:33, quem:'solicitante', txt:'Tá, vou avisar os vizinhos.'},
      {t:36, quem:'atendente', txt:'Qual o tamanho da área queimando?'},
      {t:39, quem:'solicitante', txt:'Ah, uns um campo de futebol, mais ou menos. E tá aumentando com o vento.',
        sug:[{c:'resp',id:'tamanho',v:{ops:['media']}},{c:'obs',v:'Solicitante relata que o fogo aumenta com o vento.'}]},
      {t:46, quem:'atendente', txt:'Tem pessoas ou animais em risco?'},
      {t:49, quem:'solicitante', txt:'Tem um cavalo preso no cercado do vizinho.',
        sug:[{c:'resp',id:'pessoas',v:{ops:['sim']}},{c:'obs',v:'Animal (cavalo) preso em cercado próximo ao fogo.'}]},
      {t:54, quem:'atendente', txt:'Qual o melhor caminho para a viatura chegar?'},
      {t:57, quem:'solicitante', txt:'Entra pela estrada de terra do lado da escola, ela vai direto pro mato.',
        sug:[{c:'resp',id:'acesso',v:{valor:'Estrada de terra ao lado da escola'}}]},
      {t:63, quem:'atendente', txt:'Qual o seu nome?'},
      {t:65, quem:'solicitante', txt:'Lúcia.', sug:[{c:'nome',v:'Lúcia'}]}
    ]
  },
  {
    id:'hr_adrica', natureza:'adrica', audio:'',
    titulo:'Adriça arrebentada em escola de Ceilândia',
    resumo:'Serviço sem urgência: mastro externo de cerca de oito metros.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Bom dia, não é emergência não. A corda da bandeira do mastro da escola arrebentou e precisamos trocar.',
        sug:[{c:'natureza',v:'adrica'}]},
      {t:11, quem:'atendente', txt:'Qual o endereço da escola?'},
      {t:13, quem:'solicitante', txt:'Escola Classe da QNN 14, Ceilândia Norte.',
        sug:[{c:'local',v:'Escola Classe, QNN 14, Ceilândia Norte'},{c:'ra',v:'Ceilândia'}]},
      {t:19, quem:'atendente', txt:'O mastro fica em área interna ou externa?'},
      {t:22, quem:'solicitante', txt:'Fica no pátio da frente, do lado de fora.',
        sug:[{c:'resp',id:'local_mastro',v:{ops:['externa']}}]},
      {t:26, quem:'atendente', txt:'Qual a altura aproximada?'},
      {t:28, quem:'solicitante', txt:'Uns oito metros, eu acho.',
        sug:[{c:'resp',id:'altura',v:{valor:'8'}}]},
      {t:32, quem:'atendente', txt:'Esse serviço não é urgente. Vamos agendar conforme a disponibilidade da equipe.',
        sug:[{c:'resp',id:'agendar',v:true}]},
      {t:38, quem:'solicitante', txt:'Tudo bem. Meu nome é Ana, sou a diretora.',
        sug:[{c:'nome',v:'Ana'},{c:'obs',v:'Solicitante é a diretora da escola.'}]}
    ]
  }
];
/* Situação de uma sugestão diante do que já está preenchido: 'igual' (já está assim), 'invalida' (não se aplica) ou 'nova' */
function hermesSituacao(s,ctx){
  var c=s.c;
  if(c==='natureza') return !ctx.natureza(s.v)?'invalida':ctx.A.nat===s.v?'igual':'nova';
  if(c==='ra') return ctx.ras.indexOf(s.v)<0?'invalida':ctx.A.ra===s.v?'igual':'nova';
  if(c==='local'||c==='ref'||c==='nome'||c==='tel') return String(ctx.A[c]||'').trim()===s.v?'igual':'nova';
  if(c==='obs') return String(ctx.A.obs||'').indexOf(s.v)>=0?'igual':'nova';
  if(c==='resp'){
    if(!ctx.A.nat) return 'espera';
    var it=ctx.item(s.id); if(!it) return 'invalida';
    var r=ctx.A.resp[s.id];
    if(s.v===true) return ehPergunta(it)?'invalida':r===true?'igual':'nova';
    if(!ehPergunta(it)) return 'invalida';
    if(s.v.ops){ if(!temOpcoes(it)) return 'invalida'; var ids=it.opcoes.map(function(o){return o.id;}); if(s.v.ops.some(function(x){return ids.indexOf(x)<0;})) return 'invalida';
      var tem=(r&&r.ops)||[]; return s.v.ops.every(function(x){return tem.indexOf(x)>=0;})&&(it.tipo==='multipla'||tem.length===1)?'igual':'nova'; }
    if(temOpcoes(it)) return 'invalida';
    return r&&String(r.valor)===String(s.v.valor)?'igual':'nova';
  }
  return 'invalida';
}
if(typeof module!=='undefined') module.exports={ROTEIROS:ROTEIROS,hermesSituacao:hermesSituacao};
