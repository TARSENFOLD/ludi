# Na Mesma Onda — entrega e validação

Data: 10 outubro 2026. Branch: `feat/na-mesma-onda`.

**Estado: Ludi-ready; publicado em 11 outubro 2026 em [ludi.usepdc.com/ludi/na-mesma-onda](https://ludi.usepdc.com/ludi/na-mesma-onda).** O utilizador confirmou «passou» no teste físico em iPhone e outro aparelho: escala, retrato/paisagem, confirmação, recarregamento para retoma, conclusão e revanche. O controlo automatizado do Browser continuou indisponível; não se reivindica uma inspeção visual automatizada nem uma sessão VoiceOver separada. A validação visual em aparelhos reais é a evidência desta entrega.

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

## Disponibilidade após validação física

A restrição temporária de preview foi removida após a confirmação do utilizador. O catálogo apresenta o terceiro jogo e o registry remoto aceita o seu ID, sem flags adicionais. Os IDs desconhecidos continuam recusados.

- Entrada: `/ludi/na-mesma-onda`; convites: `/ludi/salas/:code`.
- Fixtures de desenvolvimento: `/dev/ludi-state?game=onda&state=answer`, `state=locked`, `state=reveal-right`, `state=results`, com `players=2` ou `players=6`.
- Frame: `/dev/ludi-review?width=390&height=844&screen=...` (codificar a URL em `screen`). Rotas `/dev` excluídas de produção.
- CI executa separadamente a prova HTTP/SSE dos jogos Entre Nós e Na Mesma Onda, incluindo a entrada no catálogo.

## Roteiro de teste físico

1. Na mesma rede do computador, abrir a pré-visualização num iPhone e noutro aparelho; criar a sala e entrar pelo convite com nomes distintos.
2. Confirmar 50 sem mover; noutra ronda arrastar até 0/100. Verificar extremos, valor e CTA em retrato e paisagem, sem scroll horizontal.
3. Confirmar uma posição, recarregar o browser e verificar identidade, posição guardada e ausência da posição alheia antes de revelar.
4. Revelar, observar média/posições e uma única métrica de sintonia. A revelação torna dedutível a posição da outra pessoa; anonimato visual não promete privacidade após revelar.
5. Completar seis rondas; repetir; confirmar mesmas identidades, zero pontuação anterior e novos temas.
6. Verificar foco/teclado e VoiceOver: nome da escala, extremos, valor e feedback de confirmação. Com 3+ pessoas, conferir empates e classificação individual.

Confirmação física recebida nesta tarefa; PR #5 integrado e publicação concluída após aprovação da CI. Participantes fixos e controlo exclusivo do criador são limites deliberados do MVP.

## Evidência da publicação — 11 outubro 2026

- [PR #5](https://github.com/TARSENFOLD/ludi/pull/5) integrado em `2189d519c1e1294468d4c021cc03b02da7d843eb`.
- [Release CI](https://github.com/TARSENFOLD/ludi/actions/runs/38038341513): jobs check e image concluídos com sucesso.
- ZIP verificado na VPS: SHA-256 `df3991659dd59a017cd999f0f92bce2023e2102e22fc44dca3b477ef0ed68afe`. Apenas Ludi recriado, saudável; PDC sem reinícios.
- Provas contra HTTPS público: catálogo com o terceiro jogo; Entre Nós com quatro rondas; Na Mesma Onda com **2 e 6 sessões independentes**, seis rondas, privacidade HTTP/SSE, identidade, retoma, inputs estritos e revanche idempotente. Cookies Secure/HttpOnly verificados.
- A matriz 2/3/6 foi validada na CI; a repetição pública cobriu 2/6. O teste físico reportado acima ocorreu na pré-visualização, antes da publicação.
