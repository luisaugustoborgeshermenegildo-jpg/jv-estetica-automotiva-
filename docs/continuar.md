# Onde paramos (17/11/2026)

Leia este arquivo antes de continuar o projeto em outro PC.

## O que está no ar
- **Cloudflare Worker `jv-estetica`:** https://jv-estetica.jv-estetica-automotiva.workers.dev
  - O deploy é automático a cada push na branch `feat/redesign-site` (Workers Builds ligado ao GitHub).
  - Banco: D1 `jv-db`. As migrações ficam em `migrations/` e rodam com `npx wrangler d1 migrations apply jv-db --remote`.
  - Senha do painel: secret `ADMIN_PASSWORD`, criada com `npx wrangler secret put ADMIN_PASSWORD`. Nunca vai no código.
- **Site do cliente:** `/monochrome`. O app de agendamento é `/monochrome?app=1`, e o link `/app` abre a instalação.
- **JV Sistema (só para o João):** `/sistema/`. Tem visão geral, agenda (dia/semana/mês), horários, ordens de serviço com vistoria, clientes, orçamentos e pátio (estoque e vendas), financeiro, equipe e comissões, serviços e configurações, agendamento online e automações (WhatsApp com 1 toque).
- **Netlify:** ainda é o site oficial antigo (https://jv-estetica-automotiva.netlify.app), até trocarmos o endereço.

## Pendências
1. **R2 para as fotos da vistoria.** O Luis vai ativar o R2 no painel da Cloudflare, o que pede cartão (custo R$ 0 dentro do limite grátis). Depois:
   - rodar `npx wrangler r2 bucket create jv-fotos`;
   - tirar o comentário da linha `r2_buckets` no `wrangler.jsonc`;
   - testar o envio de fotos (`worker/inspection.mjs`; hoje a API devolve 503 sem o R2);
   - fazer commit e push.
2. Apagar as fotos depois de 90 dias (LGPD), com um Cron Trigger no Worker.
3. Criar "Novo serviço" do zero (hoje só dá para editar os 7 serviços do site).
4. Login separado para funcionários (hoje existe uma senha só, a do admin).
5. Copiar os agendamentos da Netlify para o D1, decidir o domínio próprio e desligar a Netlify.
6. Preço do carro: o João preenche em Serviços e configurações; vazio aparece como "sob consulta".

## Rodar no PC
```bash
pnpm install
npm run build
npx wrangler d1 migrations apply jv-db --local
npx wrangler dev --port 8787 --local
```
- Para o teste local, a senha fica em `.dev.vars` (`ADMIN_PASSWORD=...`). Esse arquivo não vai para o git; crie o seu.
- No Windows, se o `wrangler dev` responder 404 com código antigo, sobrou um `workerd.exe` preso na porta. Encerre o processo e inicie de novo.

## Referências
- Plano e roteiro: `docs/planejamento-os-vistoria.md` e `docs/migracao-cloudflare.md`.
- Referência funcional: EficeAuto, usado só como ideia de funções. Não copiar código, layout nem textos.
