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

## Expediente

O expediente configurado é das 8h às 12h e das 13h às 17h, de terça a domingo. Atualize `OPEN_DAYS` e `TIMES` em `app.py` e nas Functions caso o expediente mude.

O projeto inclui cabeçalhos de segurança, validação no servidor, limite do corpo do pedido, campo honeypot e restrições de acesso ao código local. Não coloque credenciais no repositório. Nenhum deploy foi realizado por este projeto.
