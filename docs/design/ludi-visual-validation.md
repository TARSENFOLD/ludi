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
- QA retomada após recuperar o browser: descoberta em 390 × 844, seleção do modo por setas, combinação solo + seis pessoas sem resultados e reposição dos filtros. O catálogo recuperou os dois jogos.
- Quiz solo no build de produção: cinco perguntas, uma resposta errada, quatro pontos finais; repetição voltou à primeira ronda e o primeiro acerto marcou um ponto, sem transportar os quatro anteriores.
- No mesmo aparelho: duas pessoas responderam à primeira pergunta; a passagem escondeu a escolha anterior e a revelação coletiva surgiu apenas depois da segunda resposta, com pontuações 1/0. A simulação completa de 2/6 participantes permanece coberta pelos testes de regras.
- Sala real no build: criação, feedback de convite copiado e recarregamento do lobby preservando nome e identidade. As quatro rondas e reconexão de resposta confirmada foram verificadas pela prova HTTP/SSE.
- Fixtures após hidratação: resultados com seis nomes em 320 × 667, foco no link final acima do rodapé, handoff em 844 × 390, revelação social do convidado em 390 × 844 e sessão terminada em 320 × 667. Resultados: largura útil/scroll 305/305 px, rodapé 75 px, reserva inferior 99 px.
- Erro simulado de submissão após escolha por teclado: seleção preservada e botão disponível para tentar novamente.
- A revisão final encontrou uma solução longa cortada inicialmente em paisagem. Pergunta e revelação passaram a duas colunas apenas nesse formato. Em 844 × 390, a solução termina em 230 px e o rodapé começa em 323 px; largura útil/scroll 829/829 px. A pontuação permanece abaixo, acessível por scroll.

## Ferramentas de revisão

- `/dev/ludi-review?width=390&height=844&screen=/ludi`: iframe com viewport verificável.
- `/dev/ludi-state?state=answer`: fixtures de apresentação (conteúdo fictício).
- Estados: `lobby-waiting`, `lobby-ready`, `answer`, `confirmed`, `locked`, `poll-reveal`, `reveal-wrong`, `results`, `handoff`, `reconnecting`, `ended`.
- Parâmetros: `guest=1`, `mode=solo`, `mode=same-device`, `players=6`.
- Rotas `/dev/*` excluídas do build de produção pelo mecanismo já existente. Fixtures não importam conteúdo privado das salas.

## Verificação técnica

- 232 testes em 27 ficheiros passaram; typecheck de todos os pacotes passou.
- Build Nuxt/Nitro passou. Prova de privacidade em 65 assets passou.
- Prova HTTP/SSE contra o build: cookies, origem, quatro rondas, identidade, reconexão, replay, concorrência, filtragem e limites passaram; favicon Ludi servido e fonte Baloo ausente do carregamento público.
- CodeRabbit CLI: 20 ficheiros revistos, zero apontamentos. Isto é independente do bot GitHub, que ignora PRs em rascunho.
- Contraste calculado dos pares reais: corpo/papel 11,87:1; secundário/papel 5,66:1; botão 9,41:1; texto/lavanda 9,75:1; texto/verde suave 10,21:1; erro 6,32:1.
- A interrupção do browser foi resolvida e a QA acima foi retomada. Leituras anteriores à hidratação foram descartadas; as fixtures usam uma marca explícita de prontidão. O fluxo solo foi percorrido no browser, enquanto os cenários completos de sala continuam comprovados separadamente por HTTP/SSE.

## Limites

Dimensões de iframe testam layout, media queries e overflow. Não simulam notch real, teclado do Safari ou uma rotação física. O teste no iPhone da entrega anterior não valida automaticamente esta alteração visual. Não houve troca automática do modelo principal durante a execução; não se atribuem ajustes ou QA a um modelo que não os tenha executado.
