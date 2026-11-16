# JV Estética: ordem de serviço, vistoria e fotos

## Objetivo
O João quer acompanhar cada moto da chegada à entrega e ter fotos como evidência, para que o cliente não diga que a lavagem manchou a moto.

O cliente acompanha as etapas pelo app (PWA). O João opera pelo painel `/admin`.

## Referência (somente inspiração)
- O EficeAuto (eficeauto.com.br) tem um fluxo de agendamento, vistoria, execução, aviso de pronto, pagamento e retorno.
- Use apenas as páginas públicas do site deles.
- Não é permitido:
  - entrar no `/painel`, que exige login, nem tentar contornar o login;
  - copiar código, layout, textos ou imagens deles.
- Construa o nosso jeito, com a marca da JV (versão Monochrome, azul `#2861ed`).

## Stack atual (manter)
- Site estático (HTML/CSS/JS) e PWA (`manifest.webmanifest`, `sw.js`).
- Netlify em produção: `build.mjs` gera o `dist/`, a API fica em `netlify/functions/bookings.mjs` e os dados no Netlify Database.
- Flask (`app.py`) com SQLite no modo local.
- A CSP é rígida:
  - nada de `style=""` nem de `<script>` inline;
  - o JS usa `style.setProperty`.
- Arquivos da versão app: `monochrome.html`, `css/mono-app.css`, `js/mono-app.js`.
- Agendamento: `js/script.js`, que dispara o evento `jv:booked`.
- "Meus horários" fica no `localStorage` (`jv:agendamentos`).
- Não mexer na versão azul (`index.html`).

## Etapas (uma de cada vez; teste e commit em cada uma)

### 1. Ordem de serviço com etapas
- Status do agendamento:
  1. `agendado`
  2. `recebida`
  3. `em_lavagem`
  4. `pronta`
  5. `entregue`
  6. `cancelado`, usado apenas para cancelar.
- Registrar a data e hora de cada mudança (histórico).
- No painel:
  - um botão para avançar a etapa;
  - quando chegar a "pronta", um botão que abre o WhatsApp com a mensagem pronta (`wa.me`, sem API paga).
- No app, em "Meus horários": uma linha do tempo das etapas, com a etapa atual destacada.
- Acesso do cliente: um código secreto por agendamento, gerado no servidor com no mínimo 128 bits.
  - Exemplo: `GET /api/os/:codigo`.
  - Não expor nome nem telefone de outros clientes.

### 2. Vistoria de chegada
- No painel, ao marcar "recebida", o João preenche:
  - **fotos guiadas:** frente, traseira, lateral esquerda, lateral direita, painel e tanque, mais fotos livres;
  - **checklist de avarias:** riscos, manchas, amassados, peças soltas e outros, cada item com um campo de observação;
  - **observação geral.**
- Fotos:
  - comprimidas no navegador antes do envio (máximo de cerca de 1600px, WebP ou JPEG, até cerca de 300KB);
  - guardadas no Netlify Blobs, nunca no banco.
- O cliente vê a vistoria no app e toca em "Confirmo o estado da moto". Salvar a data e hora da confirmação.
- A vistoria trava depois de confirmada: não pode ser editada.

### 3. Fotos de entrega
- Ao marcar "pronta", o João tira as fotos de depois, com os mesmos ângulos.
- O app mostra o antes e o depois lado a lado.

### 4. Convite para voltar (depois)
- Uma lista no painel com os clientes que não voltam há 30, 45, 60 ou 90 dias.
- Botão de WhatsApp com a mensagem pronta.

## Dados (rascunho)
- `bookings`: adicionar `status`, `codigo_acesso` (hash) e `vistoria_confirmada_em`.
- `booking_eventos`: `id`, `booking_id`, `status`, `criado_em`.
- `vistoria_itens`: `booking_id`, `item`, `tem_avaria`, `observacao`.
- `fotos`: `booking_id`, `tipo` (`chegada`/`entrega`), `angulo`, `blob_key`, `criado_em`.
- Fazer a migração sem apagar os agendamentos que já existem.

## Segurança e LGPD
- As rotas do painel exigem o login de admin que já existe.
- O cliente só acessa as fotos com o código do agendamento.
- Upload:
  - só imagem, com o tipo conferido no servidor;
  - limite de tamanho;
  - nome do arquivo gerado no servidor.
- `sw.js`: `/api` e `/admin` nunca vão para o cache.
- Fotos apagadas automaticamente depois de 90 dias da entrega.
- Aviso de privacidade no site.

## Roteiro completo (este plano + levantamento do Codex)
A ordem vem do que o JV pediu primeiro.

1. **OS com etapas:** etapas, linha do tempo no app e botão de WhatsApp "pronta" (seção 1 acima).
2. **Vistoria de chegada:** fotos, checklist e confirmação do cliente (seção 2).
3. **Fotos de entrega:** antes e depois (seção 3).
4. **Visão geral do painel:**
   - agenda do dia, em lavagem, prontas para retirar e recebido hoje;
   - contagem por etapa;
   - clientes e veículos com histórico e busca.
5. **Agenda configurável:**
   - expediente por dia da semana e almoço;
   - duração de cada serviço, intervalo entre atendimentos, capacidade simultânea;
   - antecedência mínima e cancelamento online.
6. **Catálogo editável no painel:** preço por porte (moto e carro), duração, prazo de retorno e se aparece no agendamento online.
7. **Financeiro simples:** entradas e despesas, formas de pagamento e meta do mês.
8. **Retorno e lembretes:**
   - lista de quem não volta há 30, 45, 60 ou 90 dias, desde que não tenha agendamento novo;
   - botão de WhatsApp com a mensagem pronta.
9. **Crescimento:** orçamentos por veículo, pátio (veículos presentes e vaga), estoque com consumo por OS e resumo de vendas.
10. **Equipe e comissões:** funcionários, percentual por serviço e comissões pendentes.
11. **Simulador de preço:** custo por hora, insumos, margem e preço sugerido.

O painel tem as mesmas áreas do EficeAuto, com visual próprio da JV (preto e azul `#2861ed`, tipografia da Monochrome). Nada de copiar telas, cores ou textos deles.

**Não fazer:**
- WhatsApp automático por conexão não oficial (risco de bloqueio do número);
- assistentes de IA;
- copiar textos, layout ou código do EficeAuto.

**Onde a JV fica melhor que o EficeAuto:**
- vistoria com fotos confirmada pelo cliente;
- app do cliente com a linha do tempo da moto;
- marca própria;
- sem mensalidade.

## Pronto quando
- O fluxo completo funciona no celular:
  1. agendar;
  2. João recebe e faz a vistoria com fotos;
  3. cliente confirma no app;
  4. João avança para lavagem e depois para pronta, com as fotos de entrega;
  5. o WhatsApp abre com a mensagem pronta;
  6. o cliente vê a linha do tempo e o antes e depois.
- O `npm run build` passa e a API foi testada localmente.
- Nada inline que quebre a CSP.
