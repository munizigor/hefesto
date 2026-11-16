# Hefesto · protótipo de atendimento e protocolos

Protótipo estático para validar, com a área de negócio, a tela de atendimento do 193 e a edição da entrevista por natureza. Não é o sistema Hefesto e não se conecta a ele.

## O que tem

- **Atendimento:** simula uma ligação e percorre os quatro passos (local e natureza, entrevista, solicitante, fechamento), com ficha da ocorrência, observações do atendente e registro.
- **Demonstração com o Hermes:** três ligações roteirizadas sobre os fluxos do Miro (incêndio em vegetação, vazamento de gás, pessoa atropelada). O Hermes transcreve a conversa e sugere natureza, local, região, respostas da entrevista, instruções ditas e observações. Cada sugestão aparece no painel e junto do campo, e só entra na ficha quando o atendente aplica. A ocorrência registrada guarda quantas sugestões foram aplicadas e descartadas.
- **Protocolos (gestor):** edita a entrevista de cada natureza no editor visual, no fluxo em Mermaid ou no formulário em JSON, com validação e teste.
- **Importar do Miro:** cola o Mermaid do fluxograma feito no Miro e converte em entrevista, de forma automática ou com um prompt pronto para um assistente de IA. Os dois caminhos mostram o que revisar antes de usar.
- **Ocorrências:** lista o que foi registrado, com tempo até o encaminhamento e duração da ligação.

## Avisos

- As naturezas e as entrevistas vêm dos fluxogramas do quadro do Miro da equipe (veja "Protocolos do Miro" abaixo). Ainda são rascunho: não são a tabela do SINESPCAD nem protocolo validado.
- **Não registre dados reais de ocorrência.** O site é público.
- Protocolos e ocorrências ficam guardados no navegador de cada pessoa (`localStorage`). Para levar protocolos de um navegador a outro, use "Copiar todos" e "Importar" na aba Protocolos.
- O Hermes não está ligado neste protótipo. A demonstração é roteirizada: as falas e as sugestões estão escritas em `hermes.js`.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos |
| `logic.js` | Motor da entrevista, validação, Mermaid e JSON, importação do Miro e prompt para IA, naturezas e protocolos de exemplo. Sem DOM, roda também em Node |
| `hermes.js` | Roteiros da demonstração do Hermes |
| `protocolos-miro.js` | Naturezas e entrevistas convertidas do Miro. Gerado, não edite à mão |
| `miro/` | Código Mermaid de cada diagrama do quadro (`<id>.mmd`), o `manifesto.tsv` e o gerador `gerar.js` |
| `app.js` | Interface: atendimento, editor de protocolos e ocorrências |

Não há etapa de build. Dependências externas, carregadas por CDN: Google Fonts e Mermaid 10.9.1 (só para desenhar os fluxogramas).

## Rodar

Abra o `index.html` no navegador, ou publique pelo GitHub Pages: Settings, Pages, "Deploy from a branch", branch `main`, pasta `/ (root)`.

## Onde mexer

- Naturezas e entrevistas: vêm de `protocolos-miro.js`. Os exemplos antigos de `logic.js` só valem se esse arquivo não for carregado.
- Regiões administrativas e UFs: `RAS` e `UFS` no início de `app.js`.
- Roteiros do Hermes: `ROTEIROS` em `hermes.js`. Cada fala tem o segundo em que aparece e as sugestões que gera.
- Prompt de conversão do Miro: `promptMiro()` em `logic.js`.
- Chave do armazenamento local: `KEY` em `app.js`. Trocar a chave zera os dados salvos de quem já usou.

## Áudios para a demonstração do Hermes

Cada roteiro tem o campo `audio`, hoje vazio. Para tocar uma gravação junto da transcrição:

1. Grave uma ligação **simulada** (nunca use gravação real de ocorrência; o site é público).
2. Coloque o arquivo na pasta `audios/`, por exemplo `audios/capotamento.mp3`.
3. Em `hermes.js`, preencha `audio:'audios/capotamento.mp3'` e ajuste o `t` de cada fala para o segundo em que ela acontece na gravação.

Com áudio, a transcrição e as sugestões seguem o tempo do áudio, e os botões pausar, velocidade e próxima fala controlam a gravação. Se o arquivo não carregar, a demonstração segue pelo relógio. Para um quarto áudio, copie um roteiro, troque `id`, `titulo`, `resumo`, `natureza` e as falas. Os `id` das perguntas são os de `protocolos-miro.js`.

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

Para atualizar depois de mudanças no quadro: extraia de novo o código dos diagramas para `miro/<id>.mmd` (o conector do Miro do Claude faz isso), confira o `manifesto.tsv` e rode `node miro/gerar.js`. Como a chave do armazenamento local mudou, quem já tinha usado o protótipo passa a ver os protocolos do Miro.
