# Entre Nós — leitura da atualização do Notion

Verificado em 11 outubro 2026. Fonte: [Entre Nós — Documento do Jogo](https://app.notion.com/p/3f514ba90ba6814d8b37eee13ae7828f), última edição indicada pelo Notion: 10 outubro 2026, 17:31 UTC.

Esta nota regista requisitos e diferenças; não declara a evolução implementada. A release `2189d51` publica Na Mesma Onda e conserva o Entre Nós atual.

## Direção encontrada

- Aprofundar Entre Nós como jogo de conversa e descoberta: «O jogo pergunta aquilo que talvez nós não perguntaríamos.» O documento escolhe Entre Nós como primeiro jogo a aprofundar; a shortlist anterior ainda prioriza Bomba após Na Mesma Onda.
- Sessões de aproximadamente 10–15 minutos, com 10–12 momentos e progressão de leveza para descoberta e relação. A vontade de continuar e a conversa espontânea são os critérios principais, sem competição obrigatória.
- Contextos: desconhecidos, amigos, casal/date, grupo, conhecemo-nos bem e aleatório. Meta editorial de 200–250 perguntas oficiais, com metadados, composição contextual e proteção contra repetição.
- Sincronia, previsão, histórias, perceção, «Quem aqui…?» e perguntas próprias. Resumo social e «Mais 5» no fecho.
- Dois modos sobre a mesma base: Entre Nós mistura conteúdo oficial e próprio; Quem Me Conhece? usa perguntas dos jogadores.
- Perguntas privadas na sala, autoria e edição autorizadas, 2–5 opções (4 por defeito), uma correta, autor excluído do quorum. Só progresso coletivo durante preparação; respostas ocultas até revelar, incluindo para o anfitrião.
- Preparação e readiness pertencem à sala; a partida recebe rondas materializadas. Sequência e ordem das opções permanecem estáveis ao reconectar. Conteúdo expira com a sala, sem perfil global.
- Reutilizar identidade e componentes Ludi. O plano detalha entrada, contexto, modo, preparação, editor e estados de jogo; não pede redesign da homepage.

## Diferenças face ao código publicado

- `packages/games/src/ludi/content/entre-nos.server.ts` contém quatro perguntas fixas, incluindo duas de conhecimento/guess.
- `MatchController` ainda fecha a ronda quando `inputs.size === players.length`; não delega elegibilidade/quorum ao adapter.
- O contrato permite poll/guess/spectrum, mas ainda não oferece preparação, perguntas próprias, conversa sem resposta ou previsão em várias etapas.
- O plano propõe seis PRs, começando por contrato/quorum e preparação, preservando os três jogos atuais. O primeiro bloco não inclui editor, previsão nem nova UI.

## Pontos contraditórios a consolidar

1. **Ordem do fluxo:** a entrada diz que «Começar» leva ao contexto sem criar sala; a preparação diz explicitamente que a sala vem antes de contexto/modo. O ecrã Modo também alterna entre seguir para personalização e preparação.
2. **Quantidade de perguntas:** trechos iniciais limitam a 1 no Entre Nós e 2–5 no Quem Me Conhece?; a especificação de personalização e o modelo de sala posteriores removem esse teto de produto e admitem um limite técnico configurável.
3. **Mínimo no Quem Me Conhece?:** a personalização diz não impor mínimo rígido na interface, enquanto o modelo de sala exige pelo menos uma pergunta por participante. É necessário distinguir recomendação visual de condição efetiva de início.

As secções detalhadas de preparação/modelo oferecem uma base coerente para consolidar a especificação, mas esta leitura não altera silenciosamente as decisões de produto no Notion.
