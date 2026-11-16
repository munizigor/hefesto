# Hefesto · protótipo de atendimento e protocolos

Protótipo estático para validar, com a área de negócio, a tela de atendimento do 193 e a edição da entrevista por natureza. Não é o sistema Hefesto e não se conecta a ele.

## O que tem

- **Atendimento:** simula uma ligação e percorre os quatro passos (local e natureza, entrevista, solicitante, fechamento), com ficha da ocorrência, observações do atendente e registro.
- **Demonstração com o Hermes:** três ligações roteirizadas (capotamento, incêndio em vegetação, adriça). O Hermes transcreve a conversa e sugere natureza, local, região, respostas da entrevista, instruções ditas e observações. Cada sugestão aparece no painel e junto do campo, e só entra na ficha quando o atendente aplica. A ocorrência registrada guarda quantas sugestões foram aplicadas e descartadas.
- **Protocolos (gestor):** edita a entrevista de cada natureza no editor visual, no fluxo em Mermaid ou no formulário em JSON, com validação e teste.
- **Importar do Miro:** cola o Mermaid do fluxograma feito no Miro e converte em entrevista, de forma automática ou com um prompt pronto para um assistente de IA. Os dois caminhos mostram o que revisar antes de usar.
- **Ocorrências:** lista o que foi registrado, com tempo até o encaminhamento e duração da ligação.

## Avisos

- O conteúdo é **ilustrativo**. A lista de naturezas, as perguntas e as instruções não são a tabela do SINESPCAD nem protocolo validado.
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
| `app.js` | Interface: atendimento, editor de protocolos e ocorrências |

Não há etapa de build. Dependências externas, carregadas por CDN: Google Fonts e Mermaid 10.9.1 (só para desenhar os fluxogramas).

## Rodar

Abra o `index.html` no navegador, ou publique pelo GitHub Pages: Settings, Pages, "Deploy from a branch", branch `main`, pasta `/ (root)`.

## Onde mexer

- Naturezas e protocolos de exemplo: `NATUREZAS` e `exemplos()` em `logic.js`.
- Regiões administrativas e UFs: `RAS` e `UFS` no início de `app.js`.
- Roteiros do Hermes: `ROTEIROS` em `hermes.js`. Cada fala tem o segundo em que aparece e as sugestões que gera.
- Prompt de conversão do Miro: `promptMiro()` em `logic.js`.
- Chave do armazenamento local: `KEY` em `app.js`. Trocar a chave zera os dados salvos de quem já usou.

## Áudios para a demonstração do Hermes

Cada roteiro tem o campo `audio`, hoje vazio. Para tocar uma gravação junto da transcrição:

1. Grave uma ligação **simulada** (nunca use gravação real de ocorrência; o site é público).
2. Coloque o arquivo na pasta `audios/`, por exemplo `audios/capotamento.mp3`.
3. Em `hermes.js`, preencha `audio:'audios/capotamento.mp3'` e ajuste o `t` de cada fala para o segundo em que ela acontece na gravação.

Com áudio, a transcrição e as sugestões seguem o tempo do áudio, e os botões pausar, velocidade e próxima fala controlam a gravação. Se o arquivo não carregar, a demonstração segue pelo relógio. Para um quarto áudio, copie um roteiro, troque `id`, `titulo`, `resumo`, `natureza` e as falas.

## Fluxogramas do Miro

O Mermaid do Miro descreve um desenho: caixas, losangos e setas. A entrevista precisa de mais do que isso: saber o que é pergunta, o que é lido ao solicitante, o que é só aviso ao atendente, quais opções existem e qual é obrigatória. Por isso a aba **Importar do Miro** oferece dois caminhos, e os dois param numa prévia validada antes de substituir a entrevista:

- **Conversão automática** (`importarMermaidLivre` em `logic.js`): aceita os formatos de nó e seta do Mermaid, tira início e fim, transforma losangos e caixas com setas rotuladas em pergunta, o texto da seta em opção, ações como “Acionar viatura” em informação ao atendente, retira laços e lista tudo o que mudou.
- **Prompt para IA** (`promptMiro`): leva o código do Miro e as regras do formato. O assistente devolve `{"itens":[...],"revisar":[...]}`, que a aba confere e mostra com o desenho.
