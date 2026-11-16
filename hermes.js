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
    id:'hr_vegetacao', natureza:'incendio_em_vegetacao', audio:'',
    titulo:'Fogo no cerrado em Sobradinho II',
    resumo:'Fogo perto das casas e da rede elétrica, espalhando com o vento.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Tá pegando fogo no mato aqui atrás de casa, na DF-150, perto do quilômetro três!',
        sug:[{c:'natureza',v:'incendio_em_vegetacao'},{c:'local',v:'DF-150, próximo ao km 3'}]},
      {t:10, quem:'atendente', txt:'Qual a cidade?'},
      {t:12, quem:'solicitante', txt:'Sobradinho II, atrás da escola da quadra.',
        sug:[{c:'ra',v:'Sobradinho II'},{c:'ref',v:'Atrás da escola'}]},
      {t:17, quem:'atendente', txt:'O fogo está em qual tipo de área?'},
      {t:20, quem:'solicitante', txt:'É um terreno baldio grande, cheio de mato, do lado das casas.',
        sug:[{c:'resp',id:'fogo_tipo_area',v:{ops:['lote_terreno_urbano']}}]},
      {t:25, quem:'atendente', txt:'O socorro já foi acionado e está a caminho. Vou fazer algumas perguntas rápidas para ajudar a equipe.',
        sug:[{c:'resp',id:'despacho',v:true}]},
      {t:31, quem:'atendente', txt:'O fogo já atingiu alguma casa ou construção?'},
      {t:34, quem:'solicitante', txt:'Não, ainda não chegou nas casas.',
        sug:[{c:'resp',id:'fogo_ja_atingiu',v:{ops:['nao']}}]},
      {t:37, quem:'atendente', txt:'E algum veículo?'},
      {t:39, quem:'solicitante', txt:'Também não.',
        sug:[{c:'resp',id:'fogo_atingiu_veiculo',v:{ops:['nao']}}]},
      {t:42, quem:'atendente', txt:'Está perto de casas, pessoas, animais ou rede elétrica?'},
      {t:45, quem:'solicitante', txt:'Tá vindo pro lado das casas, uns trinta metros. E tem os postes de energia ali do lado.',
        sug:[{c:'resp',id:'fogo_perto_casas',v:{ops:['sim']}},{c:'resp',id:'distancia_fogo_casas',v:{ops:['menos_de_50_metros']}},{c:'obs',v:'Rede elétrica próxima ao fogo.'}]},
      {t:53, quem:'atendente', txt:'Qual o tamanho da área queimando?'},
      {t:56, quem:'solicitante', txt:'Uns três ou quatro lotes, mais ou menos.',
        sug:[{c:'resp',id:'tamanho_aproximado_area',v:{ops:['media_varios_lotes']}}]},
      {t:60, quem:'atendente', txt:'Está se espalhando rápido?'},
      {t:62, quem:'solicitante', txt:'Tá, com esse vento tá indo rápido.',
        sug:[{c:'resp',id:'fogo_espalhando_rapido',v:{ops:['sim']}}]},
      {t:66, quem:'atendente', txt:'Tem alguém ferido ou cercado pelo fogo?'},
      {t:68, quem:'solicitante', txt:'Não, ninguém.',
        sug:[{c:'resp',id:'ferido_cercado_pelo',v:{ops:['nao']}}]},
      {t:71, quem:'atendente', txt:'Por onde a viatura consegue chegar?'},
      {t:74, quem:'solicitante', txt:'Pela estrada de terra do lado da escola, ela vai direto pro terreno.',
        sug:[{c:'resp',id:'onde_viatura_consegue',v:{valor:'Estrada de terra ao lado da escola'}}]},
      {t:80, quem:'atendente', txt:'Afaste-se do fogo e da fumaça, fique contra o vento e não tente apagar.',
        sug:[{c:'resp',id:'afaste_fogo_fumaca',v:true}]},
      {t:85, quem:'solicitante', txt:'Tá bom. Meu nome é Lúcia.', sug:[{c:'nome',v:'Lúcia'}]}
    ]
  },
  {
    id:'hr_gas', natureza:'vazamento_de_gas_glp', audio:'',
    titulo:'Cheiro de gás em apartamento de Taguatinga',
    resumo:'Botijão vazando na cozinha, idosa com tontura, cheiro forte em todo o apartamento.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Tá vazando gás aqui no apartamento da minha mãe, o cheiro tá muito forte!',
        sug:[{c:'natureza',v:'vazamento_de_gas_glp'}]},
      {t:8, quem:'atendente', txt:'Qual o endereço?'},
      {t:10, quem:'solicitante', txt:'QNA 15, casa 22, Taguatinga Norte. É no segundo andar, perto da feira.',
        sug:[{c:'local',v:'QNA 15, casa 22, Taguatinga Norte, 2º andar'},{c:'ra',v:'Taguatinga'},{c:'ref',v:'Perto da feira'}]},
      {t:17, quem:'atendente', txt:'É botijão, gás encanado ou cilindro?'},
      {t:19, quem:'solicitante', txt:'É botijão, o da cozinha.',
        sug:[{c:'resp',id:'botijao_gas_encanado',v:{ops:['botijao']}}]},
      {t:22, quem:'atendente', txt:'Está pegando fogo?'},
      {t:24, quem:'solicitante', txt:'Não, fogo não. Só o cheiro.',
        sug:[{c:'resp',id:'pegando_fogo',v:{ops:['nao']}}]},
      {t:27, quem:'atendente', txt:'O socorro já foi acionado e está a caminho. Vou fazer algumas perguntas rápidas.',
        sug:[{c:'resp',id:'despacho',v:true}]},
      {t:32, quem:'atendente', txt:'Já houve alguma explosão?'},
      {t:34, quem:'solicitante', txt:'Não, graças a Deus.',
        sug:[{c:'resp',id:'ja_houve_explosao',v:{ops:['nao']}}]},
      {t:37, quem:'atendente', txt:'Onde está o vazamento?'},
      {t:39, quem:'solicitante', txt:'Na cozinha, e a janela tá fechada.',
        sug:[{c:'resp',id:'onde_vazamento',v:{ops:['cozinha_area_fechada']}}]},
      {t:43, quem:'atendente', txt:'Ainda tem gente no local? Alguém passando mal?'},
      {t:46, quem:'solicitante', txt:'Minha mãe tá aqui, ela tem oitenta anos e tá falando que tá tonta.',
        sug:[{c:'resp',id:'ainda_gente_local',v:{ops:['sim']}},{c:'obs',v:'Idosa de 80 anos no local relatando tontura.'}]},
      {t:53, quem:'atendente', txt:'O cheiro é forte em todo o ambiente ou só perto do botijão?'},
      {t:56, quem:'solicitante', txt:'No apartamento todo.',
        sug:[{c:'resp',id:'cheiro_forte_todo',v:{ops:['todo_o_ambiente']}}]},
      {t:59, quem:'atendente', txt:'Não acenda luz, não ligue nem desligue aparelhos, não use isqueiro. Feche o registro se der e saiam do apartamento.',
        sug:[{c:'resp',id:'nao_acenda_luz',v:true}]},
      {t:67, quem:'solicitante', txt:'Tá, vou descer com ela agora. Meu nome é Carla.', sug:[{c:'nome',v:'Carla'}]}
    ]
  },
  {
    id:'hr_atropelada', natureza:'pessoa_atropelada', audio:'',
    titulo:'Motociclista atropela pedestre na W3 Sul',
    resumo:'Uma vítima consciente, no meio da via com trânsito passando.',
    falas:[
      {t:0, quem:'atendente', txt:'Corpo de Bombeiros, qual a sua emergência?'},
      {t:3, quem:'solicitante', txt:'Uma moto atropelou um senhor aqui na W3 Sul, na altura da 508!',
        sug:[{c:'natureza',v:'pessoa_atropelada'},{c:'local',v:'W3 Sul, altura da quadra 508'},{c:'ra',v:'Plano Piloto'}]},
      {t:10, quem:'atendente', txt:'Atropelado por qual veículo?'},
      {t:12, quem:'solicitante', txt:'Por uma moto.',
        sug:[{c:'resp',id:'atropelada_veiculo',v:{ops:['moto']}}]},
      {t:14, quem:'atendente', txt:'O socorro já foi acionado e está a caminho. Vou fazer algumas perguntas rápidas.',
        sug:[{c:'resp',id:'despacho',v:true}]},
      {t:19, quem:'atendente', txt:'A pessoa se jogou na frente do veículo?'},
      {t:22, quem:'solicitante', txt:'Não, ele tava atravessando na faixa e a moto não parou.',
        sug:[{c:'resp',id:'pessoa_jogou_frente',v:{ops:['nao']}},{c:'ref',v:'Na faixa de pedestres'}]},
      {t:28, quem:'atendente', txt:'Quantas vítimas?'},
      {t:30, quem:'solicitante', txt:'Só o senhor. O motoqueiro levantou, tá andando.',
        sug:[{c:'resp',id:'vitimas',v:{ops:['1']}},{c:'obs',v:'Motociclista de pé, deambulando.'}]},
      {t:35, quem:'atendente', txt:'Ele está acordado e responde quando você chama?'},
      {t:38, quem:'solicitante', txt:'Tá acordado, tá gemendo, falando que dói a perna.',
        sug:[{c:'resp',id:'vitima_acordada_responde__vitima_acordada_responde',v:{ops:['sim']}},{c:'obs',v:'Vítima consciente, queixa de dor na perna.'}]},
      {t:43, quem:'atendente', txt:'Ele respira normalmente?'},
      {t:45, quem:'solicitante', txt:'Respira sim.',
        sug:[{c:'resp',id:'vitima_acordada_responde__ela_respira_normalmente',v:{ops:['sim']}}]},
      {t:47, quem:'atendente', txt:'Ele está preso embaixo de algum veículo?'},
      {t:49, quem:'solicitante', txt:'Não, tá no chão do lado da moto.',
        sug:[{c:'resp',id:'pessoa_presa_embaixo',v:{ops:['nao']}}]},
      {t:53, quem:'atendente', txt:'Está no meio da via com trânsito passando?'},
      {t:55, quem:'solicitante', txt:'Tá na faixa da direita, os carros tão desviando.',
        sug:[{c:'resp',id:'meio_via_transito',v:{ops:['sim']}}]},
      {t:60, quem:'atendente', txt:'Sinalize a via se for seguro. Não mova a vítima.',
        sug:[{c:'resp',id:'sinalize_via_for',v:true}]},
      {t:64, quem:'solicitante', txt:'Certo. Meu nome é Rafael.', sug:[{c:'nome',v:'Rafael'}]}
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
