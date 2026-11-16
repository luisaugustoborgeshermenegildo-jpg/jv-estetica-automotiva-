# Migração Netlify → Cloudflare

## Por que mudar
- **R2** guarda as fotos da vistoria sem cobrar pela saída dos arquivos.
- **D1** é um banco SQLite. O esquema é o mesmo do `app.py`, então o modo local e a produção ficam parecidos.
- O plano gratuito cobre com folga o movimento da JV.

## Arquitetura
Um único **Worker** com:
- **Static Assets:** a pasta `dist/` que o `build.mjs` já gera, com o site, o app e o painel;
- **rotas `/api/*`:** as mesmas de hoje (`bookings`, `availability`, `os`, `admin/*`);
- **D1 `jv-db`:** tabelas `bookings`, `booking_events` e `admin_credentials`;
- **R2 `jv-fotos`:** fotos da vistoria e da entrega, a partir da etapa 2;
- **Secret `ADMIN_PASSWORD`:** criado com `wrangler secret put`, nunca no código;
- **Rate limiting** (binding nativo) na criação de agendamento e na consulta da OS.

Os cabeçalhos de segurança (CSP) e o link `/app` passam para os arquivos `_headers` e `_redirects` dentro do `dist/`.

## Passos (um de cada vez, com teste em cada um)

1. **Base:** criar `wrangler.jsonc` e `worker/index.mjs` (roteador).
   - Portar as funções de `netlify/functions/` trocando o `db.sql` da Netlify por `env.DB.prepare().bind()` do D1.
   - Criar as migrações do D1 em `migrations/`.
2. **Teste local:** rodar `wrangler dev` e repetir os testes da API (criar, etapas, login, erros).
3. **Publicar** no endereço gratuito `jv-estetica.<conta>.workers.dev` e testar no celular.
4. **Copiar os dados:** exportar os agendamentos do banco da Netlify e importar no D1. São poucos registros.
5. **Trocar o endereço:**
   - **Recomendado:** comprar um domínio próprio, por exemplo `jvestetica.com.br`, cerca de R$ 40 por ano, e ligar na Cloudflare. Assim, numa próxima troca de hospedagem, o endereço continua o mesmo.
   - O app instalado no celular fica preso ao endereço antigo. A Netlify vai redirecionar para o novo (301), e quem tem o app instalado vai precisar instalar de novo uma vez.
6. **Desligar a Netlify** quando a Cloudflare estiver estável por uns dias. Antes disso, manter as duas no ar.

## O que o Luis precisa fazer
- Rodar no terminal `npx wrangler login` e autorizar no navegador. Não mandar senha nem token no chat.
- Decidir sobre o domínio próprio, antes do passo 5.

## Cuidados
- Não versionar `.dev.vars`, porque guarda os secrets locais. Ele vai para o `.gitignore`.
- D1 não é Oracle: a regra do Oracle XE vale para sistemas internos no PC do Luis, e o site público precisa de um banco na nuvem.
- Durante a migração, não apagar nada da Netlify.
