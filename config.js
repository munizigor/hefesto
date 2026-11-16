/* Configuração do protótipo.

   FEEDBACK_FORMULARIO: link pré-preenchido do Google Form que recebe o feedback de quem usa o site.
   Como gerar (uma vez só):
     1. Crie um Google Form com 5 perguntas de resposta curta ou parágrafo, nesta ordem:
        Tipo · Comentário · Nome · Onde estava · Navegador
        (não marque nenhuma como obrigatória e deixe desligado "Coletar e-mails" e "Restringir a usuários")
     2. No menu ⋮ do formulário, "Gerar link pré-preenchido". Responda cada pergunta com a palavra em maiúsculas:
        TIPO · COMENTARIO · NOME · CONTEXTO · NAVEGADOR
     3. Clique em "Gerar link", copie e cole abaixo, entre as aspas.
   As respostas caem na aba Respostas do formulário (e na planilha ligada a ele, se você criar uma).
   Sem link, o feedback fica guardado no navegador da pessoa e sai junto no zip exportado. */
var FEEDBACK_FORMULARIO = '';

/* Alternativa: tabela do Supabase só com permissão de inserir.
   FEEDBACK_DESTINO = { url: 'https://<projeto>.supabase.co', chave: '<chave publishable>', tabela: 'feedback' }; */
var FEEDBACK_DESTINO = null;
