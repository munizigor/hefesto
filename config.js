/* Configuração do protótipo.
   FEEDBACK_DESTINO: para onde vai o feedback de quem usa o site.
   Sem destino (null), cada feedback fica guardado no navegador da pessoa, aparece na aba Protocolos
   e sai junto no zip exportado (feedback.json).
   Com destino, o site grava direto numa tabela do Supabase, só com permissão de inserir:
   FEEDBACK_DESTINO = { url: 'https://<projeto>.supabase.co', chave: '<chave publishable>', tabela: 'feedback' }; */
var FEEDBACK_DESTINO = null;
