# Hefesto · protótipo de atendimento e protocolos

Protótipo estático para validar, com a área de negócio, a tela de atendimento do 193 e a edição da entrevista por natureza. Não é o sistema Hefesto e não se conecta a ele.

## O que tem

- **Atendimento:** simula uma ligação e percorre os quatro passos (local e natureza, entrevista, solicitante, fechamento), com ficha da ocorrência, observações do atendente e registro.
- **Protocolos (gestor):** edita a entrevista de cada natureza no editor visual, no fluxo em Mermaid ou no formulário em JSON, com validação e teste.
- **Ocorrências:** lista o que foi registrado, com tempo até o encaminhamento e duração da ligação.

## Avisos

- O conteúdo é **ilustrativo**. A lista de naturezas, as perguntas e as instruções não são a tabela do SINESPCAD nem protocolo validado.
- **Não registre dados reais de ocorrência.** O site é público.
- Protocolos e ocorrências ficam guardados no navegador de cada pessoa (`localStorage`). Para levar protocolos de um navegador a outro, use "Copiar todos" e "Importar" na aba Protocolos.
- O Hermes não está ligado neste protótipo.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos |
| `logic.js` | Motor da entrevista, validação, Mermaid e JSON, naturezas e protocolos de exemplo. Sem DOM, roda também em Node |
| `app.js` | Interface: atendimento, editor de protocolos e ocorrências |

Não há etapa de build. Dependências externas, carregadas por CDN: Google Fonts e Mermaid 10.9.1 (só para desenhar os fluxogramas).

## Rodar

Abra o `index.html` no navegador, ou publique pelo GitHub Pages: Settings, Pages, "Deploy from a branch", branch `main`, pasta `/ (root)`.

## Onde mexer

- Naturezas e protocolos de exemplo: `NATUREZAS` e `exemplos()` em `logic.js`.
- Regiões administrativas e UFs: `RAS` e `UFS` no início de `app.js`.
- Chave do armazenamento local: `KEY` em `app.js`. Trocar a chave zera os dados salvos de quem já usou.
