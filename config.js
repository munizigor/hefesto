/* Configuração do protótipo: para onde vai o feedback de quem usa o site.
   O site usa o primeiro destino configurado, nesta ordem. Sem nenhum, o feedback fica guardado
   no navegador da pessoa, aparece na aba Protocolos e sai junto no zip exportado (feedback.json). */

/* 1. Tally: id do formulário (https://tally.so/r/<id>). O botão "Dar feedback" abre o formulário
   dentro do site, com aba, passo, natureza e pergunta preenchidos em campos ocultos. */
var FEEDBACK_TALLY = 'GepdoO';

/* 2. Google Form: link pré-preenchido. Como gerar:
     a. Crie um Google Form com 5 perguntas de resposta curta ou parágrafo, nesta ordem:
        Tipo · Comentário · Nome · Onde estava · Navegador (nenhuma obrigatória; deixe desligados
        "Coletar e-mails" e "Restringir a usuários").
     b. No menu ⋮, "Gerar link pré-preenchido", respondendo cada pergunta com a palavra em maiúsculas:
        TIPO · COMENTARIO · NOME · CONTEXTO · NAVEGADOR. Gere, copie e cole entre as aspas. */
var FEEDBACK_FORMULARIO = '';

/* 3. Tabela do Supabase só com permissão de inserir:
   FEEDBACK_DESTINO = { url: 'https://<projeto>.supabase.co', chave: '<chave publishable>', tabela: 'feedback' }; */
var FEEDBACK_DESTINO = null;
