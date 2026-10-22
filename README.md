# JV Estética Automotiva

Site responsivo com consulta de horários e solicitação de agendamento. O formulário exige consentimento, valida os dados no servidor e impede reserva duplicada no banco.

## Ambiente local

O modo local usa Flask e SQLite. No PowerShell:

```powershell
& '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt
& '.\.venv\Scripts\python.exe' app.py
```

Acesse `http://127.0.0.1:8000`. Os pedidos locais ficam em `data/bookings.sqlite3` e não são enviados ao Netlify.

## Netlify

O deploy do Netlify publica apenas `dist/` e usa as Functions em `netlify/functions/`. A API consulta o Netlify Database (PostgreSQL), definido pela migração em `netlify/database/migrations/`. No projeto Netlify, é preciso ativar Netlify Database em **Data & Storage > Database** antes de publicar esta versão. Ele é faturado pelo uso de créditos para computação e tráfego; confira o uso e o plano na conta antes de ativar.

Com o repositório ligado ao Netlify, crie uma branch/PR para gerar um Deploy Preview e valide o fluxo de agenda e envio sem trocar o site de produção. O Netlify Database isola deploy previews em branches próprios. Só publique a branch principal quando a prévia estiver aprovada.

### Painel administrativo

O João Vitor pode consultar os pedidos em `https://SEU-DOMINIO/admin/`. Para o primeiro acesso, o responsável configura `ADMIN_SETUP_TOKEN` como variável privada na Netlify, com pelo menos 32 caracteres, e compartilha esse código somente com o João. Ele entra em `/admin/`, usa o código uma vez e cria a própria senha (mínimo de 16 caracteres). O código não fica salvo no banco. A senha é armazenada usando scrypt; sessões assinadas usam cookie `HttpOnly`, `Secure` e `SameSite=Strict`, expiram após 12 horas e tentativas de login são limitadas. O painel mostra até 250 pedidos e permite abrir uma conversa com o cliente pelo WhatsApp. Se `ADMIN_PASSWORD` estiver configurada, ela continua sendo aceita como alternativa para login direto.

No modo local, defina `ADMIN_PASSWORD` no PowerShell antes de iniciar `app.py`; em HTTPS o cookie administrativo é marcado como seguro. A agenda pública e o painel consultam a base correspondente ao ambiente em que estão rodando. Para o painel online listar reservas dos clientes, o Netlify Database deve estar ativo e ligado a esse deploy. A migração `0002_create_admin_credentials.sql` cria a tabela que armazena apenas o hash da senha do painel.

## Expediente

O expediente configurado é das 8h às 12h e das 13h às 17h, de terça a domingo. Atualize `OPEN_DAYS` e `TIMES` em `app.py` e nas Functions caso o expediente mude.

Os serviços adicionais disponíveis são limpeza e lubrificação da corrente (R$ 20,00) e revitalização de plásticos (R$ 40,00). Eles aparecem na seção de serviços e como opções no formulário; mantenha a lista `SERVICES` sincronizada entre `app.py` e `netlify/functions/bookings.mjs`.

O projeto inclui cabeçalhos de segurança, validação no servidor, limite do corpo do pedido, campo honeypot e restrições de acesso ao código local. Não coloque credenciais no repositório. Nenhum deploy foi realizado por este projeto.
