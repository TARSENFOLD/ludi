# Entre Nós — regras consolidadas e implementação social

11 outubro 2026. Fonte: [Documento do Jogo](https://app.notion.com/p/3f514ba90ba6814d8b37eee13ae7828f). O utilizador autorizou consolidar as divergências e implementar a evolução completa.

## Decisões consolidadas

1. **Fluxo:** entrada → sala e convite → contexto → modo → preparação individual → partida. O anfitrião escolhe contexto e modo dentro da sala. Os convidados não repetem configuração.
2. **Participantes:** 2–6, sem conta, fixos após o primeiro início. Fechar o browser não é sair; reconexão e revanche mantêm as identidades. Reconfigurar após resultados mantém o mesmo grupo; outro grupo exige nova sala.
3. **Contexto:** desconhecidos, amigos, casal/date, grupo, conhecemo-nos bem ou aleatório. Filtra conteúdo compatível e muda a progressão de profundidade; desconhecidos não recebem itens de sensibilidade moderada. No máximo dois desses itens por bloco.
4. **Entre Nós:** dez momentos, com conteúdo oficial e perguntas próprias opcionais. É válido ficar pronto com zero perguntas.
5. **Quem Me Conhece?:** usa apenas perguntas próprias, pelo menos uma submetida por participante. Não há teto editorial de 2–5. Teto operacional por pessoa: 50, configurável por `LUDI_CUSTOM_QUESTION_LIMIT` (intervalo seguro 1–100).
6. **Perguntas:** prompt até 240 caracteres; 2–5 opções de até 120 caracteres, quatro por defeito, sem opções duplicadas ignorando maiúsculas; exatamente uma correta. Texto de controlo e campos adicionais são rejeitados. Rascunhos guardados também precisam de conteúdo válido, mas não entram na partida.
7. **Preparação privada:** cada pessoa cria/edita/apaga apenas as próprias perguntas. Os outros, incluindo anfitrião, só recebem contagem e readiness. Ficar pronto bloqueia edição; pode voltar a não pronto antes do início. A partida congela conteúdo, roster, sequência e ordem das opções.
8. **Pergunta própria:** identifica a pessoa sobre quem se pergunta. Autor não responde; quorum exclui-o. A solução só aparece na revelação. A identidade do autor não é prometida como anónima.
9. **Previsão:** restantes participantes preveem; depois responde o alvo, sem ver previsões. Validação de papel e etapa na autoridade. Uma passagem conta para quorum, sem erro/ponto ou resposta inventada.
10. **Conversa oral:** sem resposta textual, áudio ou pontuação. Anfitrião avança; qualquer participante pode passar sem explicar.
11. **Resultados:** resumo de sintonia, escolhas divididas, previsões e perguntas próprias, sem classificação. «Mais 5» usa conteúdo próprio ainda não utilizado e novos itens oficiais. Repetir pode voltar ao pool próprio, com nova ordem. Configurar de novo mantém perguntas privadas na sala; nova sala não as herda.
12. **Vida dos dados:** apenas em memória na sala, até oito horas. Reinício/expiração termina a sala e elimina conteúdo. Sem perfis globais, biblioteca pessoal ou IA geradora de opções.

Estas regras prevalecem sobre os limites antigos e a ordem de ecrãs contraditória preservados como histórico no Notion.

## Implementação

- `LudiRound`: elegibilidade, quorum, necessidade de input e etapa declaradas pelo adapter; o `MatchController` coordena sem conhecer `entre-nos`.
- `PreparedRoom`: preparação separada, fila de operações, revisão otimista, idempotência, ownership e filtro único de snapshots. Materializa a definição antes de criar `MatchController` e `RoomRuntime`.
- Reutilização de poll/guess para escolhas sociais; novos adapters puros para previsão e conversa. Spectrum, Ballpark e quiz mantêm comportamento.
- Banco servidor com **200 perguntas originais** e IDs estáveis, profundidade, contextos, mínimo de participantes, sensibilidade e etiquetas. Seleção determinística com RNG injetável e janela recente de 30 perguntas oficiais por sala.
- `POST /api/ludi/rooms` aceita `experience: "social"` apenas para o ID allowlisted `entre-nos`. A comparação idempotente inclui essa experiência. Omissão preserva o protocolo v0.2 de quatro rondas para clientes existentes; a nova entrada sempre envia `social`. Este caminho é compatibilidade de migração, não um segundo produto no catálogo.
- `POST /api/ludi/rooms/:code/preparation`: comandos estritos com `id` e `revision`. Mesmos cookies, origem, limites, HTTP/SSE e serializador das salas atuais.
- Nova entrada `/ludi/entre-nos`; `/duo` abre a mesma experiência. Editor usa os tokens, inputs, botões, revelação, convite e superfícies Ludi. Sem redesign da homepage.

## Evidências

- Suite completa: **1112 testes passaram**, seis testes externos/opcionais ignorados; 94 ficheiros passaram, dois ignorados.
- Verificação final após os ajustes: 16 testes de regras/serviço passaram (inclui o novo caso de «Mais 5» com perguntas próprias por utilizar). Typecheck e build Nuxt/Nitro passaram novamente.
- HTTP/SSE social: quatro sessões independentes; privacidade da preparação e das etapas, ownership, congelamento, dez momentos, retoma e continuação idempotente passaram.
- Regras/serviço: partidas completas de 2/4/6 pessoas; autor fora do quorum; previsões e passagem; prontidão; CRUD privado; revisões; identidade; replay e reconfiguração passaram.
- Regressões HTTP/SSE: Entre Nós v0.2 e Na Mesma Onda 2/3/6 passaram. Desafio rápido local coberto na suite, incluindo 1/2/6 participantes.
- 70 assets de cliente verificados sem os marcadores de conteúdo exclusivo do servidor, incluindo o novo banco.
- Browser: criação, convite com sessão independente, perguntas de ambos, privacidade visível, recarregar para recuperar pergunta/identidade/resposta, teclado, confirmação, revelação e resumo de Quem Me Conhece? verificados.
- Viewports por iframe real, pois o override do browser não alterou a dimensão: 390×844 e 844×390 sem overflow horizontal na revelação; CTA dentro do viewport. Preparação inspecionada em retrato. O controlo do browser não conseguiu acionar elementos dentro do iframe; o editor foi validado na página principal. Teclado móvel e rotação do editor permanecem no teste físico.
- CodeRabbit CLI 0.7.6 reviu 31 ficheiros; uma observação menor sobre proteção contra duplo início, corrigida. Nenhum problema crítico/aviso reportado.

## Estado de entrega

Implementação concluída na branch `feat/entre-nos-social`, pendente de aceitação física e publicação. A produção continua na release `2189d51` de Na Mesma Onda. O teste físico da versão anterior não valida esta evolução: editor com teclado móvel, previsão e retoma precisam de nova aceitação nos aparelhos. Não se reivindica teste VoiceOver real.
