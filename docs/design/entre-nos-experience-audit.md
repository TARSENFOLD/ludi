# Entre Nós — consolidação da auditoria de experiência

12 outubro 2026. Conferência estática do código local em `3696012`, do comentário do utilizador e da auditoria anexada. As quatro imagens recebidas orientam o acabamento visual; não são especificações automáticas de regras. Não foram disponibilizadas nesta revisão as 15 capturas referidas pelo texto anexado. As secções de diagnóstico abaixo preservam o estado encontrado antes das correções. A implementação e as evidências posteriores estão em `docs/entre-nos-social.md`.

## Diagnóstico e prioridade

O fluxo tecnicamente validado ainda exige demasiada coordenação, tem apresentação de formulário e oferece um ritmo previsível. A próxima etapa deve tratar três frentes em conjunto: autonomia do grupo, apresentação de cada momento e rejogabilidade. Aumentar o banco, isoladamente, não resolve estes problemas.

### Comportamentos confirmados

| Prioridade | Achado | Evidência e efeito |
| --- | --- | --- |
| P0 | Passagem oral avança para todos | `controller.ts`, ramo `skip` sem input, chama `advanceConversation`. A intenção individual interrompe o grupo. |
| P0 | Conversa depende de um canal externo | `LudiGame.vue` apresenta «sem escrever respostas»; rondas de conversa não recolhem texto. |
| P0 | Revelação e avanço dependem do criador | Ações de controlo continuam reservadas ao criador; sair do browser não transfere o controlo. É uma limitação conhecida da entrega anterior. |
| P1 | Preparação tem conflitos entre pessoas | `PreparedRoom` exige igualdade com uma revisão global; duas gravações independentes com a mesma revisão podem produzir um 409. |
| P1 | Resultado afirma algo não medido | «Escolhas que deram conversa» apresenta `summary.divided`, que conta distribuições de escolhas e não conversas. |
| P1 | Ritmo e contexto pouco distintos | Sequência fixa de mecânicas; maioria do conteúdo partilha os seis contextos. |
| P1 | Repetição controlada apenas a curto prazo | Histórico em memória por sala, com janela máxima de 30 IDs; não atravessa salas. |

## Rejogabilidade: prioridade de produto

### Banco atual verificado

| Mecânica | Perguntas |
| --- | ---: |
| Escolha rápida | 33 |
| Previsão | 34 |
| Sintonia | 33 |
| História | 50 |
| Quem aqui…? | 25 |
| Perceção | 25 |
| **Total** | **200** |

| Configuração | Elegíveis |
| --- | ---: |
| 2 pessoas, desconhecidos | 160 |
| 2 pessoas, restantes contextos | 175 |
| 3–6 pessoas, desconhecidos | 185 |
| 3–6 pessoas, restantes contextos | 200 |

Estes totais descrevem o pool elegível global. As restrições por mecânica, profundidade e sensibilidade reduzem as opções de cada momento.

### O que a seleção faz e o que não garante

- Impede repetir o mesmo ID oficial dentro do bloco materializado.
- Guarda até 30 IDs oficiais recentes no composer da sala. Se todos os candidatos da mecânica estiverem nesse histórico, remove os mais antigos até conseguir escolher. Portanto, nem os últimos 30 são uma proibição absoluta.
- Escolhe entre candidatos frescos pela proximidade à profundidade desejada, com desempate aleatório determinístico quando o RNG é injetado.
- Mantém a sequência e as opções estáveis ao recarregar; muda opções e alvos entre materializações.
- Não usa `tags` na seleção. As etiquetas atuais são amplas e atribuídas por grupos de linhas, não por uma classificação temática detalhada de cada pergunta.
- As mecânicas das 100 escolhas também são atribuídas pela posição no banco (`i % 3`), não por compatibilidade editorial declarada por pergunta.
- A ordem normal é escolha → previsão → sintonia → história → grupo/perceção → própria → previsão → sintonia → perceção → própria. Sem pergunta própria, entra uma escolha oficial. «Mais 5» tem outro padrão fixo.
- `replay` limpa os IDs próprios utilizados; duas perguntas próprias podem originar novamente as mesmas duas perguntas em Quem Me Conhece?.
- Nova sala perde todo este histórico. Não existe identidade persistente do grupo.

**Não prometer 30 partidas sem repetição.** Trinta partidas de dez perguntas oficiais exigem 300 utilizações; o pool máximo atual é 200. Além disso, com duas pessoas, o padrão exige duas perceções por partida e há apenas 25: mesmo num ciclo ideal sem repetição, essa categoria esgota-se na 13.ª partida. O algoritmo atual pode repetir antes devido à janela e à preferência de profundidade. Isto é um limite calculado, não o resultado de uma simulação executada.

### Proposta para seleção

1. Preservar as 200 perguntas e rever os metadados individualmente: afinidade real por contexto, tema, profundidade, sensibilidade e mecânicas compatíveis.
2. Substituir o roteiro fixo por composição com restrições: abertura acessível, alternância de mecânicas e alvos, distribuição de profundidade e momentos próprios. Variar a ordem sem entregar a experiência ao acaso puro.
3. Usar ciclos sem reposição por pool elegível. Só reciclar conteúdo quando as restrições efetivas o exigirem; preferir os IDs menos recentes. Registar o motivo do fallback nos testes, sem respostas privadas.
4. Distribuir temas e evitar sequências semanticamente semelhantes. As etiquetas precisam de ser suficientemente específicas para tornar isto verificável.
5. Em Quem Me Conhece?, tornar explícito quando o conteúdo acabou. Oferecer acrescentar perguntas ou repetir conscientemente; não apresentar repetição do mesmo pool como conteúdo novo.
6. Considerar sessões curtas/médias/longas depois de validar ritmo e conteúdo. Duração é uma estimativa; conversas não têm tempo previsível. Os tamanhos continuam por decidir.

### Histórico entre salas: proposta inicial (decisão posterior abaixo)

IDs oficiais guardados no aparelho permitem evitar conteúdo já visto por esse browser; isso não identifica automaticamente o mesmo grupo em aparelhos diferentes. Unir históricos dos participantes evita perguntas já vistas por qualquer pessoa, mas pode esgotar o pool depressa. Intersetá-los evita apenas as perguntas vistas por todos. São políticas diferentes.

Proposta inicial a avaliar: histórico local limitado e versionado de IDs oficiais, com prazo e opção de apagar; o servidor valida IDs e tamanho e usa-os apenas como preferência de seleção. Nunca guardar respostas, perguntas próprias, nomes ou composição do grupo nesse histórico. Não inferir grupos pelo nome. A política de união/interseção, retenção e transferência para a sala precisa de ser fechada antes da implementação.

## Fluxo e apresentação propostos

- Uma ação principal por estado: escolher, confirmar, aguardar, descobrir ou continuar. Progresso indica o que falta sem revelar respostas.
- Passar é individual. Conversas distinguem texto curto, partilha oral e passagem; o grupo conclui segundo um quorum explícito.
- Revelação automática após conclusão do quorum e avanço por prontidão coletiva são propostas. Definir antes como lidar com desligados, recarga, abandono e conclusão simultânea; não acrescentar timeouts implícitos.
- Se houver texto, definir quem o vê e quando, limite, confirmação e retenção. A referência visual de um campo de texto não autoriza por si a recolha de novas respostas.
- Referências visuais: cabeçalho compacto, progresso, presença do grupo, pergunta dominante, opções táteis, seleção evidente e revelação com hierarquia própria.
- Ilustrações apoiam significado. Perguntas próprias e opções sem arte precisam de uma apresentação igualmente acabada, sem depender de imagens específicas para cada resposta.
- Nomes disponíveis por interação e para leitores de ecrã; não depender apenas de avatares. Identidade dos participantes não pode ser confundida com informação sobre as suas respostas.
- «Descobrimos» e uma resposta correta aplicam-se a previsão/pergunta própria. Preferências sem resposta correta pedem apresentação de distribuição, sem inventar vencedor.
- Preservar uma ação principal acessível com teclado móvel, safe area, retrato e paisagem. Motion reduzido e estados de envio/erro/retoma continuam obrigatórios.

## Ordem recomendada de execução

1. Fechar regras de passagem, conversa, revelação, prontidão e reconexão; corrigir a concorrência entre preparações independentes e a linguagem dos resultados.
2. Implementar os estados visuais próprios do Entre Nós sobre essas regras, usando os componentes e tokens Ludi existentes. Não redesenhar a homepage nem alterar os outros jogos por arrasto.
3. Rever metadados e implementar composição variável, ciclos de conteúdo e diversidade temática.
4. Introduzir histórico entre salas apenas com política de privacidade e semântica acordadas; avaliar duração configurável.
5. Validar com pessoas que não conhecem o produto e com grupos que regressam.

## Provas necessárias

- Simulações determinísticas de 10/20/30 partidas por contexto, com 2/3/6 participantes, sem conteúdo próprio e com pools próprios pequenos/grandes. Incluir revanche, continuação e nova sala.
- Medir cobertura do pool, distância entre repetições, repetições evitáveis, sequências de mecânicas, distribuição temática/profundidade e alternância de alvos/autores. Não confundir cobertura global com cobertura de cada categoria.
- Exigir zero repetição de IDs dentro da partida e zero repetição evitável quando existe candidato compatível ainda não utilizado. Exercitar esgotamento e fallbacks explicitamente.
- Recarga e pedidos repetidos preservam a seleção; materializar uma vez não consome histórico várias vezes. Histórico inexistente, inválido, expirado ou de outra versão tem fallback seguro.
- Duas pessoas guardam perguntas diferentes simultaneamente sem perder conteúdo; edição concorrente do mesmo objeto continua protegida.
- Passagem não encerra a participação de outros; texto privado antes da revelação; reconexão recupera a própria submissão; avanço e reveal ocorrem uma única vez.
- Teste humano: clareza da próxima ação, esperas sem saída, desconforto, sensação de variedade e vontade de continuar. As simulações não demonstram diversão nem qualidade editorial.

## Fontes de código

- `packages/games/src/ludi/content/entre-nos-social.server.ts`
- `packages/games/src/ludi/social-session.server.ts`
- `packages/games/src/ludi/social-rounds.ts`
- `packages/games/src/ludi/controller.ts`
- `packages/games/src/ludi/prepared-room.server.ts`
- `packages/games/src/ludi/social.test.ts`
- `apps/web/app/components/LudiGame.vue`

Na auditoria inicial foram conferidos os totais e os ramos acima. Posteriormente o utilizador autorizou guardar apenas IDs oficiais neste browser durante 30 dias. A correção implementa essa preferência, o novo fluxo coletivo e a interface; foram executadas 540 partidas simuladas e o utilizador confirmou que o novo teste físico passou. Ver `docs/entre-nos-social.md` para regras finais e limites.
