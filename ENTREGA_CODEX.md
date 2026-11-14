# JV Estética — entrega da versão Codex

Data: 14/11/2026. Branch: codex/redesign-jv. Base: e74310d.

## Prévia

http://127.0.0.1:8767

Cópia isolada: C:\Users\luis.borges\jv-estetica-codex.
O clone em jv-estetica-automotiva e seu redesenho concorrente foram preservados.
A prévia usa Flask com DB_PATH apontado para .qa/preview.sqlite3, separado dos dados existentes.
Luis pediu salvar a versão em uma branch do GitHub para continuar em casa. Esse envio não autoriza merge nem publicação do site.

## Interface

- Direção preto e azul da referência, fotografia principal, fontes locais e áreas claras para leitura.
- Serviços, valores iniciais, adicionais, telefone e endereço preservados da versão base.
- Escolha de serviço integrada ao formulário e resumo de valor.
- Alternância Moto/Carro. A API base agenda apenas motos; carros são consulta pelo WhatsApp.
- Menu móvel com estado acessível e fechamento por Escape; foco de teclado e movimento reduzido.
- Consulta da agenda com cancelamento de respostas antigas, estados vazio/erro e proteção contra envio duplicado.
- WhatsApp com link alternativo quando o navegador bloqueia a nova janela.
- Fotografias ilustrativas do Pexels; fontes sob OFL, com créditos/licenças em css/assets/.

## Arquivos

index.html, css/style.css, css/fonts.css, css/creditos.html, css/assets/,
js/script.js, build.mjs, package.json, scripts/smoke-ui.mjs, .gitignore e registros Markdown.
Backend, funções Netlify, migrações e painel administrativo não foram alterados.

## Validação executada nesta etapa

- npm run build: passou.
- npm test: 29 verificações de navegador com API simulada local.
- Larguras: 320, 375, 390, 768, 820, 1024 e 1440 px, sem rolagem horizontal.
- Inclui fluxo de serviço, formulário inválido, consentimento, cancelamento de consulta, concorrência de respostas, horário ocupado, agenda vazia/indisponível, sucesso, popup bloqueado, foco e movimento reduzido.
- Seis verificações HTTP sobre o Flask real com banco de teste isolado: página, CSS, fontes, foto, créditos e contrato de disponibilidade.
- node --check em js/script.js, scripts/smoke-ui.mjs e build.mjs: passou.
- git diff --check: passou.
- Capturas desktop, celular e tablet em .qa/. Pasta ignorada pelo Git.
- Não há scripts de lint ou typecheck neste projeto JavaScript; não foram instaladas dependências para criá-los.
- Não foi enviada reserva ao banco real, mensagem no WhatsApp ou solicitação a serviços de produção.
- Persistência em Netlify e envio real pelo WhatsApp não foram validados.

## Revisão

Revisão independente confirmou e acompanhou duas correções:
1. Ativos e créditos foram movidos para /css/, servido pelo Flask existente.
2. aria-busy é limpo ao cancelar uma consulta antes de retornar.

Também foram corrigidos contraste de texto/foco e hierarquia de h2 no celular.
A última revisão estática não encontrou novos problemas confirmados.
Isso não equivale à aprovação do Claude nem à autorização para publicar.

## Limite da checagem Taste

GATE: FAIL 42 (round 1 of 3), na primeira versão, antes dos últimos ajustes de contraste, foco e títulos.
Não houve nova execução completa do gate depois deles.

O checker exige a estrutura e o ritmo do próprio kit (seções de uma tela inteira, classes específicas, momentos sorteados e fotos em quase todas as seções), não adotados integralmente nesta proposta.
Também apontou contatos reais e quebra de linha da marca como falhas: os contatos vieram do projeto e a marca tem duas linhas.
A checagem auxiliar check.mjs não encontrou Chrome automaticamente; capturas e testes independentes usaram o Edge disponível.
Aprovação visual completa pelo Taste permanece pendente. Os 29 testes funcionais não substituem essa aprovação.

## Referências

https://tasteskill.dev/
https://transitions.dev/
https://reactbits.dev/get-started/index
https://dribbble.com/shots/popular/web-design

Skills consultadas para a proposta: Taste Skill e Frontend Design; orientação de acessibilidade/craft e revisão de código.
A versão é guardada na branch codex/redesign-jv por pedido do Luis, para continuar em casa. A escolha entre os visuais e os ajustes antes de integrar ou publicar continuam pendentes.
