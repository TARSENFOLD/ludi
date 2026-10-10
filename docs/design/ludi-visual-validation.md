# Validação visual — Ludi

## Entrega por fases

1. `c3d3d54`: inventário/auditoria, direção visual, tokens, tipografia e marca.
2. `60665df`: descoberta orientada aos jogos e filtros secundários.
3. `e48782e`: entrada e lobby, participantes, convite e retoma.
4. `b62875a`: progresso, seleção, confirmação, mensagens por fase, rodapé medido.
5. `ff7d7d6`: revelação social/desafios, pontuação e resultados.
6. Polish: landscape baixo, 320 px, legibilidade, sala terminada e reconexão sem promessa falsa de resposta guardada.

## Comparação e evidências observadas

- Baseline real em iframe 390 × 844: filtros ocupavam duas linhas, texto explicava o algoritmo de duração e a primeira ação aparecia perto do fundo da tela. A nova descoberta coloca a decisão de modo primeiro e recolhe os restantes filtros; os dois jogos têm identidade própria por cor e símbolo.
- Pergunta em 390 × 844: nome longo, pergunta longa, três opções (uma com várias linhas), sala compacta e botão visível; sem overflow horizontal.
- Antes do polish, 844 × 390 mostrava apenas a pergunta antes do rodapé. Depois: as três opções ficam visíveis ao lado da pergunta; alturas medidas 48/69/48 px; o rodapé termina exatamente nos 390 px, com 67 px de altura.
- Em 320 × 667, o lobby com nome longo conservou o controlo principal no fundo e sem overflow horizontal. O conteúdo pode rolar; a reserva para o rodapé acompanha a sua altura.
- Copy de convidado distingue todos responderam, resultado revelado e partida concluída. Nenhuma presença online é inferida do roster.
- QA corrigiu “Resposta confirmada” numa ligação terminada e a promessa de resposta guardada durante reconexão antes de responder.

## Ferramentas de revisão

- `/dev/ludi-review?width=390&height=844&screen=/ludi`: iframe com viewport verificável.
- `/dev/ludi-state?state=answer`: fixtures de apresentação (conteúdo fictício).
- Estados: `lobby-waiting`, `lobby-ready`, `answer`, `confirmed`, `locked`, `poll-reveal`, `reveal-wrong`, `results`, `handoff`, `reconnecting`, `ended`.
- Parâmetros: `guest=1`, `mode=solo`, `mode=same-device`, `players=6`.
- Rotas `/dev/*` excluídas do build de produção pelo mecanismo já existente. Fixtures não importam conteúdo privado das salas.

## Limites

Dimensões de iframe testam layout, media queries e overflow. Não simulam notch real, teclado do Safari ou uma rotação física. O teste no iPhone da entrega anterior não valida automaticamente esta alteração visual. Não houve troca automática do modelo principal durante a execução; não se atribuem ajustes ou QA a um modelo que não os tenha executado.
