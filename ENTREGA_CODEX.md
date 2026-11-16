# Fluidez nas três propostas — 16/11/2026

Três entradas disponíveis na prévia local da porta 8768.

- Azul com moto em /css/original.html, com conteúdo recuperado do commit 7ccfef2 e os estilos e correções atuais.
- Azul com lavagem em /.
- Preto e vermelho em /css/monochrome.html.

## Interações implementadas

Profundidade 3D por perspectiva CSS nas fotografias ao mover o mouse, entrada coordenada de textos e imagem, botões com resposta ao toque, serviços com destaque de seleção, indicador deslizante Moto/Carro, entrada suave do painel e resumo do agendamento.
Navegação entre seções e seleção de serviço com rolagem suave e foco acessível.
A preferência de movimento reduzido desativa as transformações e animações. O efeito de ponteiro é ativado para mouse com ponteiro preciso.

Frontend Design orientou a composição. React Bits e Transitions foram consultados como referências de movimento. A implementação usa CSS e JavaScript do próprio projeto.
Referências consultadas em https://reactbits.dev/ e https://transitions.dev/.
As fotografias continuam ilustrativas, com créditos existentes.

## Verificação desta etapa

Build passou. Foram executadas 37 verificações por entrada, total de 111, com API simulada.
As verificações incluem sete larguras, mouse, retorno do efeito 3D ao repouso, navegação com foco, menu, formulário e movimento reduzido.
Capturas de abertura desktop e celular conferidas. A revisão estática independente foi concluída.
Foi corrigida a sobreposição transitória do menu ao entrar no breakpoint móvel.
O servidor anterior na porta 8767 deixou de responder. A prévia atual usa a porta 8768 e o banco isolado .qa/preview-motion.sqlite3.
Os resultados Taste abaixo pertencem às etapas anteriores. A checagem completa Taste desta etapa permanece pendente.

# Atualização com duas propostas — 14/11/2026

Luis solicitou o refinamento da versão azul e uma alternativa baseada em Monochrome Studio.
As duas estão na mesma branch codex/redesign-jv, com links de comparação no rodapé.

- Azul em http://127.0.0.1:8767/
- Monochrome em http://127.0.0.1:8767/css/monochrome.html
- Referência e decisões visuais em PLANO_REFINAMENTO.md.

## Alterações desta etapa

- Azul com lavagem na fotografia principal e conteúdo mais compacto.
- Monochrome com fotografia em preto e branco, títulos grandes, acentos vermelhos e serviços comparáveis em linhas.
- Foco da escolha de serviço corrigido para manter o campo visível abaixo do cabeçalho no celular.
- Formulário, estilos de base e comportamento compartilhados pelas duas propostas.
- Fotografias ilustrativas já licenciadas no projeto. Créditos em css/assets/CREDITOS.md.

## Verificações desta etapa

- Build executado com sucesso.
- Teste de navegador em cada entrada com API simulada, 32 verificações por versão, total de 64.
- Sete larguras por entrada, de 320 a 1440 px.
- As dez entradas do formulário têm os mesmos nomes, tipos e obrigatoriedade nas duas páginas.
- Seis GETs no servidor Flask local retornaram 200, incluindo a nova página, seu CSS, o script e as fotografias.
- Capturas de desktop e celular inspecionadas em .qa/azul-desktop.png, .qa/azul-mobile.png, .qa/monochrome-desktop.png e .qa/monochrome-mobile.png.
- Na captura de 390 px, a página azul passou de 6507 para 5801 px de altura.
- Revisão estática independente concluída, com validação funcional e visual pelo coordenador.
- Integração com produção e envio real de WhatsApp seguem pendentes.

O primeiro teste detectou o campo de serviço fora da área visível no celular. A seleção agora centraliza o campo e transfere o foco, com cobertura de regressão nas duas entradas.
O teste de fonte foi ajustado para conferir o peso usado pelo título de cada proposta, 600 na azul e 700 na Monochrome.

## Checagem visual desta etapa

GATE: OPEN 68 (rounds used up), na proposta Monochrome.
O Taste registra divergências com seu sistema de layout, como seções de tela inteira, nomes de classes, fotos em cada seção, alinhamentos internos e estilos de botão.
A direção solicitada por Luis utiliza preto, branco, vermelho, imagem de fundo, tipografia central e conteúdo compacto. Essas decisões estão preservadas para comparação.
O relatório também marca endereço e telefone vindos do projeto e títulos em português. A fotografia de referência continua identificada nos créditos.
A rodada anterior registrou 71 apontamentos. O ajuste de rolagem por teclado resolveu três apontamentos de foco.
O apontamento restante do primeiro link motivou uma regra de maior especificidade para o contorno preto com halo branco. Esse ajuste final foi validado nos testes das duas páginas, após a última rodada do gate.
A aprovação integral pelo Taste continua pendente. A versão azul refinada foi conferida pelos testes e capturas desta etapa.
Foram usadas zero dispensas de apontamentos. A lista abaixo preserva os 68 apontamentos da última execução do gate.

<details>
<summary>Apontamentos completos da última rodada Taste</summary>

- **nav** em `header.header > div.wrap.header-inner > a.brand "JV. Estética Automotiva"` — nav link wraps to a second line
- **no-visual** em `section#cuidado "LIMPEZA, PROTEÇÃO E ACABAMENTO."` — no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** em `section#servicos "ESCOLHA O CUIDADO PARA SEU VEÍCULO."` — no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** em `section#como-funciona "SEU HORÁRIO, EM TRÊS PASSOS."` — no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** em `section#agendar "AGENDE SUA PRÓXIMA LAVAGEM."` — no picture, effect or mock in this section; a feature section needs a visual
- **button-styles** em `(one screen)` — 3 button styles on one screen: square, outline #151515 ("Escolher serviço ↗"); square, fill #faf9f6 ("Agendar horário ↗"); square, fill #c90020, outline #c90020 ("Escolher serviço ↗"); the odd one out: "Escolher serviço ↗"
- **button-styles** em `(the page)` — 4 button styles on the page: square, fill #faf9f6 x1 ("Agendar horário ↗"); square, fill #c90020 x3 ("Agendar minha moto ↗"); square, outline #151515 x2 ("Escolher serviço ↗"); square, fill #c90020, outline #c90020 x1 ("Escolher serviço ↗")
- **same-action** em `header.header > div.wrap.header-inner > a.button.button-blue "Agendar horário ↗"` — "Agendar horário ↗" appears 2 times in different looks: square, fill #faf9f6 and square, fill #c90020
- **same-action** em `div.service-grid > article.service-card:nth-of-type(1) > div.service-bottom > button.button.button-outline "Escolher serviço ↗"` — "Escolher serviço ↗" appears 3 times in different looks: square, outline #151515 and square, fill #c90020, outline #c90020
- **copy-headline** em `h1#hero-title "SEU VEÍCULO. EM EVIDÊNCIA."` — "SEU VEÍCULO. EM EVIDÊNCIA." does not name what is sold (estetica automotiva, estetica, automotiva, from flags)
- **copy-fact** em `h1#hero-title "SEU VEÍCULO. EM EVIDÊNCIA."` — the first screen holds no number, price, date, place, platform or genre
- **copy-headings** em `h2#care-title "LIMPEZA, PROTEÇÃO E ACABAMENTO."` — "LIMPEZA, PROTEÇÃO E ACABAMENTO." names no product, part, place or section (7 headings like it; at most one brand line per page) (and 6 more like it: "Limpeza completa", "Acabamento detalhado", "Agendamento sem ligação", "SEU HORÁRIO, EM TRÊS PAS", ...)
- **off-grid** em `div#moto-services > div.service-grid > article.service-card:nth-of-type(1) > h3 "Lavagem completa"` — left edge at 104px, 24px off the page margin at 80px (24 elements, like h2#services-title); 3 more in this section off the grid too (p.service-desc at 104px, h3 at 104px, p.service-desc at 104px)
- **street-number** em `div.wrap > div.footer-grid > div:nth-of-type(1) > address "Rua São Sérgio, 179"` — a street with its house number: "Rua São Sérgio, 179"; a real door, which the brief does not give (and 1 more like it: div.footer-grid > div:nth-of-type(1) > address > a)
- **phone-number** em `section#agendar > div.wrap.booking-grid > div.booking-intro > a.text-link "https://wa.me/5534984266406"` — a WhatsApp link calls a number in a real dialable format: "https://wa.me/5534984266406"; a visitor can dial it and reach a stranger (and 3 more like it: div.wrap > div.footer-grid > div:nth-of-type(3) > a:nth-of-type(1), div.wrap > div.footer-grid > div:nth-of-type(3) > a.footer-whatsapp, div#car-services > div > a.button.button-blue)
- **focus-visible** em `a.skip "Pular para o agendamento"` — Tab stop 1, a "Pular para o agendamento": its focus change is faint: 2.39:1 against the ground, 3:1 needed
- **hero-enter** em `section#inicio` — the hero does not enter on load: no data-enter on the hero and no head line setting html.m-enter (motion.md, The hero's entrance)
- **moment-none** em `(the page)` — a service page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **hero-screen** em `section#inicio > div.wrap.hero-grid > div.hero-foot > a "Conheça o cuidado da JV"` — "Conheça o cuidado da JV" ends at 892px, below the hero's content line at 876px (the 900px screen less 24px) (SR-1)
- **hero-screen** em `section#inicio > div.wrap.hero-grid > div.hero-foot > p "Cuidado para motos e carros."` — "Cuidado para motos e carros." ends at 878px, below the hero's content line at 876px (the 900px screen less 24px) (SR-1)
- **section-height** em `section#cuidado "Limpeza, proteçãoe acabamento.Da lavagem"` — the section is 458px tall (0.5 screens), 442px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** em `section#como-funciona "Seu horário,em três passos. 01Escolha o "` — the section is 463px tall (0.5 screens), 437px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** em `footer#contato "Seu próximo rolêcomeça com cuidado.Agend"` — the section is 555px tall (0.6 screens), 345px short of one screen (900px): every section after the hero is one screen or two, 2px either way (and 2 more like it: "Agende suapróxima lavage", "Escolha o cuidadopara se") (SR-2)
- **section-height** em `section#servicos "Escolha o cuidadopara seu veículo.Veja o"` — the section starts at 1358px, 442px above the screen grid (2 x 900px): sections start on whole screens (SR-2)
- **section-air** em `div#moto-services > div.service-grid "Lavagem completaUma limpeza para renovar"` — a top border across 100% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines (SR-3)
- **section-air** em `footer#contato > div.wrap > div.footer-top "Seu próximo rolêcomeça com cuidado.Agend"` — a bottom border across 100% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines (SR-3)
- **one-section** em `h2#services-title "Escolha o cuidadopara seu veículo."` — the screen at scroll 900px (stride 1) shows 442px of section 3 and the heading of section 3 whole and the content of 2 sections, over 24px each beside section 2: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** em `h2#booking-title "Agende suapróxima lavagem."` — the screen at scroll 2382px (the top of section 4) shows 438px of section 5 and the heading of section 5 whole and the content of 2 sections, over 24px each beside section 4: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** em `section#agendar "Agende suapróxima lavagem.Escolha o serv"` — the screen at scroll 3541px (the top of section 6) shows 333px of section 5 and the content of 2 sections, over 24px each beside section 6: a screen shows one section (another may peek 8px, 24px WARN) (and 3 more like it: scroll 1800px, scroll 2700px, scroll 100px) (SR-4)
- **one-section** em `div#moto-services > div.service-grid > article.service-card.featured "Lavagem detalhadaMais atenção a cada par"` — a band: a box 90% of the section wide on a ground of its own that holds only text: the section's own ground is the band (SR-4)
- **one-heading** em `h2#services-title "Escolha o cuidadopara seu veículo."` — headings of two sections show whole on one screen at 10 of 71 scroll positions (14.1%; at scroll 650, 700, 750, 800px), here with "Limpeza, proteçãoe acabamento.": at most 3% on a desktop (SR-5)
- **container-edges** em `a.skip "Pular para o agendamento"` — a <a> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** em `header.header "JV.EstéticaAutomotiva Nosso cuidadoServi"` — a <header> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** em `footer#contato "Seu próximo rolêcomeça com cuidado.Agend"` — a <footer> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (and 3 more like it: section#inicio > div.hero-photo, "Estética automotivaUbera", "Estética automotivaUbera") (SR-6)
- **container-edges** em `div.care-details > article:nth-of-type(3) > div > h3 "Agendamento sem ligação"` — 2 text blocks start on a left line at x 828, 748px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (also "Consulte a agenda da moto e esco") (SR-6)
- **container-edges** em `div#moto-services > div.service-grid > article.service-card:nth-of-type(1) > h3 "Lavagem completa"` — 6 text blocks start on a left line at x 104, 24px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (also "Uma limpeza para renovar o visua", "Lavagem detalhada", "Mais atenção a cada parte da mot") (SR-6)
- **container-edges** em `div.wrap > ol.steps > li:nth-of-type(1) > span.step-no "01"` — 1 text block starts on a left line at x 95, 15px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (SR-6)
- **container-edges** em `section#inicio > div.hero-photo > img` — a <img> over half the container wide runs 12-1428px, not on the container's lines at 80-1360px (SR-6)
- **row-lines** em `footer#contato > div.wrap > div.footer-grid "JV.EstéticaAutomotivaEncontre a JVRua Sã"` — a row of 3 items: its first item starts at 419px, the container's left line at 80px (2px either way) (SR-7)
- **split-pair** em `section#cuidado > div.wrap.care-grid "Limpeza, proteçãoe acabamento.Da lavagem"` — the split's columns are off the page's one pair of lines: its right column starts at x 760, on none of the split lines 623 (k=5), 732 (k=6), 841 (k=7) (SR-8)
- **split-pair** em `section#agendar > div.wrap.booking-grid "Agende suapróxima lavagem.Escolha o serv"` — the split's columns are off the page's one pair of lines: its right column starts at x 722, the first split's at 760; its right column starts at x 722, on none of the split lines 623 (k=5), 732 (k=6), 841 (k=7) (SR-8)
- **heading-scale** em `div#moto-services > div.service-grid > article.service-card:nth-of-type(1) > h3 "Lavagem completa"` — h3 headings in 4 sizes, 18px ("Limpeza completa") to 25px (x1.39)
- **off-grid** em `div.service-grid > article.service-card:nth-of-type(1) > ul > li:nth-of-type(1) "Limpeza completa"` — left edge at 35px, 15px off the page margin at 20px (44 elements, like p.service-desc); 5 more in this section off the grid too (li:nth-of-type(2) at 35px, li:nth-of-type(3) at 35px, li:nth-of-type(1) at 35px, li:nth-of-type(2) at 35px, ...)
- **hero-fill** em `section#cuidado "LIMPEZA, PROTEÇÃO E ACABAMENTO."` — the next section shows on the first screen: it starts at 720px on a 800px screen (the hero ends at 720px) (also at 768)
- **edge-left** em `#inicio p.hero-lead "Lavagem, proteção e acabamento p"` — starts at x 1135; the lines are 80 and the column starts
- **edge-left** em `#cuidado div.care-details "Limpeza completaLavagem, pneus e"` — starts at x 760; the lines are 80 and the column starts
- **edge-left** em `#cuidado h3 "Limpeza completa"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#cuidado p "Lavagem, pneus e cera para renov"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#cuidado h3 "Acabamento detalhado"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#cuidado p "Atenção extra aos lugares que co"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#cuidado h3 "Agendamento sem ligação"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#cuidado p "Consulte a agenda da moto e esco"` — starts at x 828; the lines are 80 and the column starts
- **edge-left** em `#servicos p "Veja o que cada lavagem inclui."` — starts at x 1068.5; the lines are 80 and the column starts
- **edge-left** em `#servicos h3 "Lavagem completa"` — starts at x 104; the lines are 80 and the column starts
- **edge-left** em `#servicos p.service-desc "Uma limpeza para renovar o visua"` — starts at x 104; the lines are 80 and the column starts
- **edge-left** em `#servicos ul "Limpeza completaPretinho nos pne"` — starts at x 469.7; the lines are 80 and the column starts
- **edge-left** em `#servicos p.service-price "A partir deR$ 50,00"` — starts at x 868.8; the lines are 80 and the column starts
- **edge-left** em `#servicos h3 "Lavagem premium"` — starts at x 104; the lines are 80 and the column starts
- **edge-left** em `#servicos p.service-desc "Cuidado minucioso, peça por peça"` — starts at x 104; the lines are 80 and the column starts
- **edge-left** em `#servicos ul "Lavagem completa e detalhadaDesm"` — starts at x 469.7; the lines are 80 and the column starts
- **edge-left** em `#servicos p.service-price "A partir deR$ 115,00"` — starts at x 868.8; the lines are 80 and the column starts
- **edge-left** em `#agendar form.booking-form "Solicite seu horárioAgendamento "` — starts at x 722.2; the lines are 80 and the column starts
- **screen-short** em `#inicio section.hero "Estética automotivaUberaba, MG L"` — 800px tall; one screen under the nav is 900px
- **neighbour** em `#cuidado section.care.section-light "Limpeza, proteçãoe acabamento.Da"` — framed, 133px of #servicos section.services.section-light "Escolha o cuidadopara seu veícul" shows
- **neighbour** em `#como-funciona section.process "Seu horário,em três passos. 01Es"` — framed, 253px of #agendar section.booking.section-light "Agende suapróxima lavagem.Escolh" shows
- **screen-height** em `#agendar section.booking.section-light "Agende suapróxima lavagem.Escolh"` — 1030px, 1.14 screens; a section is exactly one or two (--h)
- **hero-fold** em `#inicio section.hero "Estética automotivaUberaba, MG L"` — starts at y 100, not under the nav
- **neighbour** em `#servicos section.services.section-light "Escolha o cuidadopara seu veícul"` — framed, 22px of #como-funciona section.process "Seu horário,em três passos. 01Es" shows

</details>

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
