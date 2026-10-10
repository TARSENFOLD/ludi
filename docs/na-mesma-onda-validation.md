# Na Mesma Onda — entrega e validação

Data: 10 outubro 2026. Branch: `feat/na-mesma-onda`.

**Estado: implementado para pré-visualização; não Ludi-ready.** Validação visual no Browser e teste físico da escala em iPhone e outro aparelho pendentes. Não publicado no VPS.

## Implementação

- Reutiliza o Spectrum de consenso do Doot; mantém a curva de proximidade e seis rondas. Não implementa pista/alvo secreto.
- 2–6 pessoas, sala remota, sem temporizador. Criador revela/avança depois das confirmações.
- Scores internos individuais preservados. A dupla vê apenas sintonia comum (1000/ronda, 6000/partida); grupos maiores veem classificação.
- Revanche mantém participantes e identidades. Desligar não significa sair: a ronda aguarda quem falta. Para mudar de grupo, criar nova sala.
- 48 temas originais, etiquetados, sem pedidos de exposição pessoal. Seis distintos por partida; janela de 18 exclusões por sala, libertando os mais antigos se o pool for reduzido.
- Registry de factories no servidor, sem módulos carregados a partir de input. `gameId` ausente continua a criar Entre Nós.
- SDK contém envelopes genéricos. Tipos de conteúdo/ação, schemas e serializadores específicos pertencem à camada games. Controlo de identidade, fase e elegibilidade permanece no controlador.
- `ballparkCloseness` e shuffle Doot extraídos para módulos puros, com exports legados preservados. Não se antecipam os outros jogos da expansão.

## Evidências automáticas

- Suite completa: **1097 testes passaram**, 6 testes externos/opcionais ignorados, 92 ficheiros passaram e 2 ignorados.
- `pnpm typecheck`: passou.
- `pnpm --filter @doot-games/web build`: passou.
- `node scripts/verify-ludi.mjs`: regressão real HTTP/SSE Entre Nós; identidade, quatro rondas, reconexão, privacidade, idempotência, origem, lotação e limites passaram.
- `node scripts/verify-ludi.mjs --onda`: partidas completas com 2/3/6 sessões HTTP independentes, SSE de criador e convidado, privacidade, inputs estritos, recuperação de identidade/resposta e revanche idempotente passaram.
- Inspeção de bundles no mesmo script: 68 assets de cliente sem os marcadores de conteúdo servidor dos dois jogos.
- Bundle headless do módulo de definição executado em Node sem loader Vue nem rede: seis rondas carregadas. Scoring original Spectrum/Ballpark e composições Doot continuam cobertos pela suite.
- Teste de roster: quatro participantes terminam; um stream fecha; a revanche continua com quatro identidades e espera a resposta da pessoa desligada; a reconexão recupera a identidade; nova sala admite grupo de três.
- CodeRabbit: revisão inicial identificou mensagem imprecisa para `gameId` inválido, corrigida. A revisão com os ficheiros novos identificou também a necessidade de regenerar o pedido se o formulário mudar de jogo; corrigida. Não foram reportados problemas críticos ou avisos.

As provas de regras/HTTP não substituem validação de toque, layout nem leitor de ecrã real.

## Ativar apenas num ambiente de teste

A disponibilidade fica desligada por omissão. Para a pré-visualização, configurar **ambos**:

```sh
LUDI_ONDA_PREVIEW=1
NUXT_PUBLIC_LUDI_ONDA_PREVIEW=true
```

A primeira variável permite o jogo no registry do servidor; a segunda apresenta a entrada/card no shell. No desenvolvimento, `LUDI_ONDA_PREVIEW=1` também fornece o valor inicial de runtimeConfig. Os convites continuam em `/ludi/salas/:code`.

- Entrada: `/ludi/na-mesma-onda`.
- Fixtures de desenvolvimento: `/dev/ludi-state?game=onda&state=answer`, `state=locked`, `state=reveal-right`, `state=results`, com `players=2` ou `players=6`.
- Frame para dimensões reais: `/dev/ludi-review?width=390&height=844&screen=...` (codificar a URL da fixture em `screen`). Rotas `/dev` continuam excluídas do build de produção.
- Catálogo normal/API rejeitam o jogo enquanto preview estiver desligado. A CI verifica os dois perfis separadamente.

## Teste físico para fechar a entrega

1. Na mesma rede do computador, abrir a pré-visualização num iPhone e noutro aparelho; criar a sala e entrar pelo convite com nomes distintos.
2. Confirmar 50 sem mover; noutra ronda arrastar até 0/100. Verificar extremos, valor e CTA em retrato e paisagem, sem scroll horizontal.
3. Confirmar uma posição, recarregar o browser e verificar identidade, posição guardada e ausência da posição alheia antes de revelar.
4. Revelar, observar média/posições e uma única métrica de sintonia. A revelação torna dedutível a posição da outra pessoa; anonimato visual não promete privacidade após revelar.
5. Completar seis rondas; repetir; confirmar mesmas identidades, zero pontuação anterior e novos temas.
6. Verificar foco/teclado e VoiceOver: nome da escala, extremos, valor e feedback de confirmação. Com 3+ pessoas, conferir empates e classificação individual.

Só após recolher estas evidências, corrigir eventuais problemas e fechar o PR se deve marcar Ludi-ready e preparar a publicação. Participantes fixos e controlo exclusivo do criador são limites deliberados do MVP.
