// Configuração global dos testes.
// Fixa o fuso horário (São Paulo) para que os testes de data/streak sejam determinísticos,
// inclusive em torno de transições de horário de verão histórico (ex.: 04/11/2018).
process.env.TZ = 'America/Sao_Paulo';
