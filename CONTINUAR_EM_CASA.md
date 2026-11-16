# Continuar o JV Estética em casa

Versão alternativa do Codex, preparada em 14/11/2026.
Branch: codex/redesign-jv.
Repositório: https://github.com/luisaugustoborgeshermenegildo-jpg/jv-estetica-automotiva-

## Se ainda não tiver o repositório neste computador

No terminal, na pasta onde deseja guardar o projeto:

    git clone --branch codex/redesign-jv https://github.com/luisaugustoborgeshermenegildo-jpg/jv-estetica-automotiva-.git JV-Estetica-Codex
    cd JV-Estetica-Codex

## Se o repositório já estiver clonado

Confira primeiro o trabalho local com git status; não descarte alterações.
Com a pasta limpa:

    git fetch origin
    git switch --track origin/codex/redesign-jv

Se essa branch local já existir, use:

    git switch codex/redesign-jv
    git pull --ff-only

Não misture com a versão concorrente antes de comparar os visuais.

## Próxima sessão

Peça: "Leia CONTINUAR_EM_CASA.md e ENTREGA_CODEX.md e continue a versão Codex do JV."

- Leia ENTREGA_CODEX.md para testes executados e limitações.
- A proposta usa HTML/CSS/JavaScript; backend original preservado.
- A API desta base agenda apenas motos; carros são consulta por WhatsApp.
- Fotos são ilustrativas e têm créditos; não apresentá-las como trabalhos reais da JV.
- Os testes de interface usam API simulada; não gravam reservas reais.
- A checagem visual rígida do Taste tem pendências documentadas.
- Nenhuma publicação foi autorizada. Compare com a outra versão antes de decidir o que unir.

## Abrir a prévia visual sem instalar dependências

Com Python instalado:

    npm run build
    python -m http.server 8768 --bind 127.0.0.1 --directory dist

Compare as três propostas no navegador.

- Azul original com moto em http://127.0.0.1:8768/css/original.html
- Azul refinada em http://127.0.0.1:8768/
- Preto e vermelho em http://127.0.0.1:8768/css/monochrome.html

O rodapé de cada proposta contém o link para a outra.
A entrada Monochrome está em css/monochrome.html e carrega o estilo adicional css/monochrome.css.
As três entradas usam js/script.js, js/motion.js e css/motion.css e devem receber as mesmas atualizações nos campos e serviços.

Para validar as três propostas após o build, execute os comandos abaixo.

    npm test
    npm test -- /css/original.html
    npm test -- /css/monochrome.html

Essa prévia estática permite comparar o visual, mas a agenda exige o servidor Flask ou Netlify Functions.
Para a prévia com agenda, siga o README e use banco local de teste separado, sem credenciais de produção.

A porta 8767 aberta no computador da empresa não se transfere para o de casa.
Bancos de teste, perfis do navegador, .venv, node_modules e capturas .qa não são enviados pelo Git.
