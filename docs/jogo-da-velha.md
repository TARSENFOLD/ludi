# Jogo da Velha no Ludi

Entrada: `/ludi/jogo-da-velha`, com `modo=solo`, `same-device` ou `room`.

Regras puras e IA em `packages/games/src/ludi/tic-tac-toe`. A IA adapta as estratégias de Computer.js de https://github.com/Smax1988/Tic-Tac-Toe (MIT, copyright 2025 Maximilian Schmidt). O tabuleiro é uma lista imutável; a pesquisa não usa DOM nem estado global. A licença integral acompanha o módulo e é publicada em `/ludi/licenses/tic-tac-toe.txt`.

O controlador específico implementa os envelopes Game Contract v0.2. Usa LocalRoundAuthority no aparelho e RoomRuntime no servidor, através do serviço existente de salas, cookies e SSE. O LocalRuntime do Desafio rápido permanece intacto. A sala admite exatamente duas pessoas; a IA existe apenas em solo. X começa todas as partidas. Revanche mantém participantes, vitórias e empates; recarregar o modo local reinicia tudo.

O tabuleiro é público. Ações answer incluem choice (0–8) e stage (número de jogadas já aceites), além de id, match e round. Comandos são serializados; a autoridade valida identidade, turno, casa livre e tokens. Repetição com o mesmo ID e conteúdo é idempotente, conteúdo diferente é rejeitado. A revanche incrementa match. A reconexão usa o snapshot filtrado atual do mesmo participante.

Testes incluem todas as linhas vencedoras, empate, jogadas inválidas, concorrência, idempotência, tokens atrasados, revanche, isolamento de snapshots, integração com a autoridade Doot e retoma da participação. A IA difícil é verificada contra todas as sequências humanas possíveis. Não há persistência após reinício do servidor nem teste físico em telemóveis nesta entrega.
