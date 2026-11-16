# Hefesto · protótipo de atendimento e protocolos

Protótipo estático para validar, com a área de negócio, a tela de atendimento do 193 e a edição da entrevista por natureza. Não é o sistema Hefesto e não se conecta a ele.

## O que tem

- **Atendimento:** simula uma ligação e percorre os quatro passos (local e natureza, entrevista, solicitante, fechamento), com ficha da ocorrência, observações do atendente e registro. O encaminhamento ao despacho acontece no ponto do fluxo da natureza marcado como despacho imediato, ou antes, pelo botão "Adiantar despacho".
- **Demonstração com o Hermes:** três ligações roteirizadas sobre os fluxos do Miro (incêndio em vegetação, vazamento de gás, pessoa atropelada). O Hermes transcreve a conversa e sugere natureza, local, região, respostas da entrevista, instruções ditas e observações. Cada sugestão aparece no painel e junto do campo, e só entra na ficha quando o atendente aplica. A ocorrência registrada guarda quantas sugestões foram aplicadas e descartadas.
- **Protocolos (gestor):** edita a entrevista de cada natureza no editor de itens, no **editor visual** em tela cheia (caixas e setas no padrão do quadro do Miro), no fluxo em Mermaid (no padrão de cores do quadro do Miro ou na notação compacta) ou no formulário em JSON, com validação e teste. Cada resposta diz se vai ou não para o relato final.
- **Feedback:** o botão "Dar feedback", no topo, coleta problemas, sugestões e dúvidas com o contexto da tela.
- **Importar do Miro:** cola o Mermaid do fluxograma feito no Miro e converte em entrevista, de forma automática ou com um prompt pronto para um assistente de IA. Os dois caminhos mostram o que revisar antes de usar.
- **Ocorrências:** lista o que foi registrado, com tempo até o encaminhamento e duração da ligação.

## Avisos

- As naturezas e as entrevistas vêm dos fluxogramas do quadro do Miro da equipe (veja "Protocolos do Miro" abaixo). Ainda são rascunho: não são a tabela do SINESPCAD nem protocolo validado.
- **Não registre dados reais de ocorrência.** O site é público.
- Protocolos e ocorrências ficam guardados no navegador de cada pessoa (`localStorage`). Para levar protocolos de um navegador a outro ou enviá-los para publicação, use "Exportar (.zip)" e "Importar" na aba Protocolos.
- O Hermes não está ligado neste protótipo. A demonstração é roteirizada: as falas e as sugestões estão escritas em `hermes.js`.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos |
| `logic.js` | Motor da entrevista, validação, Mermaid e JSON, importação do Miro e prompt para IA, naturezas e protocolos de exemplo. Sem DOM, roda também em Node |
| `hermes.js` | Roteiros da demonstração do Hermes |
| `desenho.js` | Editor visual do fluxo (caixas e setas), sem biblioteca externa |
| `config.js` | Destino do feedback |
| `protocolos/` | **Fonte de verdade** das entrevistas: `naturezas.json` e um `<id>.json` por natureza |
| `protocolos.js` | Montado a partir de `protocolos/` por `ferramentas/montar.js`. Não edite à mão |
| `ferramentas/montar.js` | Monta o `protocolos.js` e aplica um zip exportado pelo site |
| `miro/` | Arquivo histórico da importação do Miro: código de cada diagrama, manifesto e conversor |
| `app.js` | Interface: atendimento, editor de protocolos e ocorrências |

Não há etapa de build. Dependências externas, carregadas por CDN: Google Fonts e Mermaid 10.9.1 (só para desenhar os fluxogramas).

## Rodar

Abra o `index.html` no navegador, ou publique pelo GitHub Pages: Settings, Pages, "Deploy from a branch", branch `main`, pasta `/ (root)`.

## Onde mexer

- Naturezas e entrevistas: `protocolos/`. Depois de mudar, rode `node ferramentas/montar.js`.
- Regiões administrativas e UFs: `RAS` e `UFS` no início de `app.js`.
- Roteiros do Hermes: `ROTEIROS` em `hermes.js`. Cada fala tem o segundo em que aparece e as sugestões que gera.
- Prompt de conversão do Miro: `promptMiro()` em `logic.js`.
- Chave do armazenamento local: `KEY` em `app.js`. Trocar a chave zera os dados salvos de quem já usou.

## Áudios para a demonstração do Hermes

Cada roteiro tem o campo `audio`, hoje vazio. Para tocar uma gravação junto da transcrição:

1. Grave uma ligação **simulada** (nunca use gravação real de ocorrência; o site é público).
2. Coloque o arquivo na pasta `audios/`, por exemplo `audios/capotamento.mp3`.
3. Em `hermes.js`, preencha `audio:'audios/capotamento.mp3'` e ajuste o `t` de cada fala para o segundo em que ela acontece na gravação.

Com áudio, a transcrição e as sugestões seguem o tempo do áudio, e os botões pausar, velocidade e próxima fala controlam a gravação. Se o arquivo não carregar, a demonstração segue pelo relógio. Para um quarto áudio, copie um roteiro, troque `id`, `titulo`, `resumo`, `natureza` e as falas. Os `id` das perguntas são os de `protocolos/<natureza>.json`.

## Fluxogramas do Miro

O Mermaid do Miro descreve um desenho: caixas, losangos e setas. A entrevista precisa de mais do que isso: saber o que é pergunta, o que é lido ao solicitante, o que é só aviso ao atendente, quais opções existem e qual é obrigatória. Por isso a aba **Importar do Miro** oferece dois caminhos, e os dois param numa prévia validada antes de substituir a entrevista:

- **Conversão automática** (`importarMermaidLivre` em `logic.js`): aceita os formatos de nó e seta do Mermaid, tira início e fim, transforma losangos e caixas com setas rotuladas em pergunta, o texto da seta em opção, ações como “Acionar viatura” em informação ao atendente, retira laços e lista tudo o que mudou.
- **Prompt para IA** (`promptMiro`): leva o código do Miro e as regras do formato. O assistente devolve `{"itens":[...],"revisar":[...]}`, que a aba confere e mostra com o desenho.

## Protocolos do Miro

O quadro do Miro tem 52 diagramas Mermaid: 35 fluxos novos e 17 marcados "(original)", que transcrevem os quadros desenhados à mão. Quando existem as duas versões de uma natureza, vale a nova. Ficaram 51 naturezas.

A cor de cada caixa diz o papel dela, e o conversor (`importarMiroHefesto` em `logic.js`) lê por aí:

| Cor no quadro | Vira no protótipo |
| --- | --- |
| Branco (pergunta) e as caixas amarelas e lilases ligadas a ela | Pergunta com opções; "Não sabe" é opção |
| Vermelho "Aberta" | Resposta livre: pergunta de texto, ou campo "Outra resposta" ao lado das opções |
| Rosa "Despacho imediato" | Fala do despacho ao solicitante, destacada |
| Amarelo "Orientação ao solicitante" | Instrução ao solicitante |
| Branco de borda cinza, laranja | Informação ao atendente (ações como "Acionar PMDF") |
| Verde "Videochamada" | Informação ao atendente |
| Roxo "Trocar natureza" | Troca de natureza: o atendente troca ou mantém |
| Verde claro "Relato final" | Fechamento |

Nos diagramas "(original)" o conversor também entende grupos ("Despacho imediato" em volta das respostas que disparam o despacho), setas pontilhadas para caixas laterais e opções que abrem outras opções. O que não dá para representar fica nas **Notas da importação do Miro**, no topo do editor de cada natureza. As mais comuns são caixas que o desenho deixa sem ligação e trocas para naturezas que ainda não têm fluxo.

O Miro deixou de ser a fonte: a importação foi feita uma vez e as entrevistas agora são mantidas no site. As notas da importação continuam no editor até alguém corrigir os fluxos.

## Como as correções chegam ao site

A fonte de verdade é a pasta `protocolos/`. Quem corrige não precisa mexer no repositório:

1. Edita as entrevistas na aba Protocolos. Tudo fica salvo só no navegador dela, e a coluna da esquerda mostra quantas naturezas estão alteradas e quando foi a última exportação.
2. Clica em **Exportar (.zip)**. O arquivo tem `naturezas.json`, um `protocolos/<id>.json` por natureza e um `LEIA-ME.txt` com a lista do que mudou. O zip é gerado pelo próprio site, sem biblioteca externa.
3. Para continuar em outro computador, usa **Importar** com o mesmo arquivo. Antes de aplicar, o site mostra quais naturezas mudam e avisa se alguma substitui uma edição local.
4. Para publicar, manda o zip para quem cuida do repositório, que roda `node ferramentas/montar.js caminho/do/arquivo.zip`, confere o `git diff` (cada natureza é um arquivo, então a revisão é linha a linha) e faz o commit.

### Naturezas

Na coluna da esquerda da aba Protocolos, **+ Nova natureza** cria uma natureza vazia, pronta para receber a entrevista. No editor de cada uma há **Renomear** e **Excluir natureza**. Ao renomear, as trocas de natureza das outras entrevistas que apontavam para o nome antigo são atualizadas. Ao excluir, o site avisa quantas trocas ficam sem destino. Nas trocas de natureza, o destino é escolhido numa lista, então uma natureza criada com o nome que a troca já usava (por exemplo "Incêndio em veículo", citada em Acidente de trânsito) passa a funcionar na hora.

Tudo isso vai no zip (`naturezas.json`). Ao importar, naturezas novas e renomeadas entram; naturezas que existem no navegador e não no arquivo ficam como estão. No repositório, `montar.js` avisa quando sobra o arquivo de uma natureza excluída, para apagar com `git rm`.

Quando uma versão nova é publicada, cada navegador atualiza sozinho as entrevistas que a pessoa não editou e mantém as que ela editou. Com a lista de naturezas é igual: o que a publicação criou, renomeou ou removeu chega, e o que a pessoa criou ou renomeou no navegador fica. "Restaurar versão publicada", no editor, descarta a edição local de uma natureza.

## Relato final

Cada resposta de pergunta com opções tem a marca **no relato** ou **fora do relato**. O relato automático só leva as respostas marcadas "no relato"; quando a resposta escolhida está fora, a pergunta some do relato. A ficha e o registro da ocorrência continuam guardando todas as respostas. Perguntas abertas e orientações têm a caixa "No relato".

Na importação, as respostas lilases do quadro do Miro (quase sempre "Não", "Não sei" e "Não sabe") ficaram "fora do relato": 219 respostas em 51 naturezas.

## Despacho

O passo 1 (local e natureza) só leva à entrevista. A ocorrência é encaminhada no item de despacho imediato do fluxo, que traz o botão "Encaminhar ao despacho e dizer a fala", no lugar onde o quadro do Miro o colocou. O botão "Adiantar despacho", no topo da ligação, adianta o encaminhamento. Se a entrevista terminar sem despacho, o fechamento avisa; dá para registrar mesmo assim, com confirmação.

## Feedback

O botão **Dar feedback** abre um formulário curto (tipo, comentário, nome opcional) e guarda junto onde a pessoa estava: aba, passo, natureza e a pergunta da vez.

O destino é o formulário do Tally "Hefesto · feedback do protótipo" (https://tally.so/r/GepdoO), configurado em `config.js`. O botão abre o formulário dentro do site, e aba, passo, natureza, pergunta da vez e navegador vão em campos ocultos. As respostas ficam no painel do Tally. `config.js` também aceita um Google Form ou uma tabela do Supabase.

Sem destino configurado, ou quando a pessoa escolhe "Sem internet? Escrever aqui", o feedback fica no navegador, aparece na coluna da esquerda da aba Protocolos e sai no zip exportado (`feedback.json`). Ao aplicar o zip, `montar.js` lista os feedbacks e salva em `feedback-recebido/`, que fica fora do Git porque o repositório é público. `config.js` também aceita uma tabela do Supabase como alternativa.

## Editor visual

O botão **✏️ Editor visual** abre o fluxo da natureza em tela cheia, com as cores do quadro do Miro. Cada item é uma caixa; as respostas de uma pergunta aparecem como linhas dentro dela, amarelas (vão para o relato) ou lilases (ficam fora), cada uma com um ponto ● de saída. Puxe do ponto até a caixa seguinte para ligar; solte no vazio para desfazer a ligação daquela resposta. O ponto embaixo da caixa é o caminho padrão, e o da caixa da natureza escolhe a primeira pergunta. A barra de cima cria caixas (pergunta, pergunta aberta, orientação, despacho, informação, videochamada, troca de natureza) e o painel da direita edita a caixa selecionada. Ctrl+Z desfaz e Delete apaga a caixa, ligando quem vinha antes ao que vinha depois. A validação aparece no alto, ao vivo.

A posição das caixas fica no navegador, vai no zip (`layout` em cada `protocolos/<id>.json`) e é publicada pelo `montar.js`. Sem posição salva, o editor organiza o fluxo em camadas a partir do início ("Reorganizar" refaz isso).
