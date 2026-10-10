# Ludi Game Contract v0.2

Estado: contrato implementado nesta branch; aceitação física da migração ainda pendente.
Data: 10 outubro 2026. Doot é a fundação confirmada. Os nomes `@doot-games/*` e o monorepo são preservados.

## Quatro checkpoints

1. **Contrato:** tipos de sessão/descoberta, regras puras de `poll` e `guess`, adapters Doot.
2. **Prova local:** Desafio rápido solo e no mesmo aparelho, com testes sem rede/Vue.
3. **Sala autoritativa:** Entre Nós, identidade anónima, HTTP/SSE, filtragem e reconexão.
4. **Shell:** `/ludi`, filtros, ergonomia mobile, compatibilidade `/duo` e teste físico final.

## Camadas e entidades

```text
engine: state machine / RoundAuthority / LocalRoundAuthority / RoomRuntime / MemoryRelay
  → SDK: LudiManifest / SessionContext / LudiSession / LudiView / LudiAction
    → games: regras de blocks / MatchController / definições / bundles de conteúdo
      → shell: páginas Vue / LocalRuntime ou RoomSession / Nitro HTTP + SSE
```

- **Party** será o contexto social persistente, separado das partidas. Não é implementada aqui.
- **Match** é uma partida temporária com jogo, participantes, rondas e pontuação. `match` aumenta a cada repetição.
- **Sala de execução** é o recurso efémero em `/api/ludi/rooms`, com ligação a um Match corrente. Mantém código e participantes durante a repetição do mesmo jogo. Não implementa Party, matchmaking ou troca de jogo mantendo a Party.
- **Runtime** executa a máquina de estados. O controlador coordena validação, fecho automático, apuração e visão pública. Os componentes apenas apresentam a visão e enviam ações.

O `RoomRuntime` Doot foi experimentado no servidor e funcionou sem alterações internas: aceita relay e relógio injetados e não depende de Vue. O adapter reutiliza fases, armazenamento de inputs por ronda e limpeza de `nextGame`. Identidade, capacidade, roster e permissões Ludi pertencem ao serviço/controlador. Os mecanismos Doot de identidade por nome e host no browser não são usados.

## Manifest e conteúdo

Fonte tipada: `packages/sdk/src/ludi.ts`. Catálogo: `packages/games/src/ludi/catalog.ts`.

Cada manifest declara `id`, `name`, `version`, `description`, `modes`, `vibes`, `capabilities`, `access` e `contentBundle`.

Cada entrada em `modes` declara **separadamente**:

- `mode`: `solo | same-device | room`;
- `execution`: `local | remote`;
- `players: { min, max }`;
- `duration: { min, typical, max }`, em minutos, como estimativa (não é um prazo ou temporizador).

As restrições de descoberta têm de ser satisfeitas no **mesmo modo**. O filtro de tempo usa `typical`. Os resultados só incluem modos implementados.

| Experiência | Modo | Pessoas | Min / típico / máx. estimado | Capacidades |
| --- | --- | --- | --- | --- |
| Entre Nós | room | 2 | 3 / 5 / 10 min | score, hidden-input, reconnect |
| Desafio rápido | solo | 1 | 2 / 3 / 6 min | score, turn-order |
| Desafio rápido | same-device | 2–6 | 4 / 8 / 15 min | score, turn-order |

Reservas para monetização: `access.tier = free | premium | pack`, `packId?`, `guestAccess = included | individual`. Os dois jogos desta etapa são gratuitos com convidados incluídos. Estes campos **não implementam pagamentos nem autorização de entitlements**. Permitem futuramente modelar alguém desbloquear a experiência para convidados.

`contentBundle` declara ID, versão e entrega `local | server`. O conteúdo está em módulos separados das regras. O bundle Entre Nós só é importado no servidor; o quiz é distribuído com a experiência offline. Não existe serviço externo de conteúdos nesta entrega.

## Regras puras e compatibilidade

`poll/rules.ts` e `guess/rules.ts` contêm schemas, validação, apuração e revelação. Os `block.ts` Doot juntam as vistas Vue a essas mesmas regras. `HostDisplay` e `PlayerInput` permanecem nos adapters legados. A sessão Ludi usa superfícies `primary` e `participant`, através de `SessionContext` tipado com modo, execução, idioma `pt-PT`, participante e permissões.

As regras Ludi não importam Vue, rotas, CLASP ou WebSocket. `MatchController` é partilhado por execução local e remota. `RuleEnvironment` recebe relógio e fonte RNG; os conteúdos desta versão têm ordem fixa e não consomem aleatoriedade. IDs de segurança da sala/sessão são gerados criptograficamente no servidor, independentemente do RNG de regras.

Fluxo: `validate → apply`. Schemas estritos rejeitam campos extra; a autoridade confirma identidade, modo, fase, ronda, Match, escolha e permissões, mesmo que o browser mostre um botão desativado. Só a primeira resposta válida de cada pessoa é aceite. Quando todos responderam, a ronda fecha. No Entre Nós o criador revela e avança; no modo local a revelação aparece depois de todos responderem. A pontuação de `guess` vem da agregação Doot; `poll` apresenta distribuições e não soma pontos.

## Fronteira de sessão

```ts
interface LudiSession {
  observe(listener: (view: LudiView) => void): () => void
  availableActions(): LegalAction[]
  send(action: LudiAction): Promise<void>
  disconnect(): void
}
```

A interface nunca recebe o estado integral da autoridade. `playerView` faz uma serialização por lista de campos permitidos, usada por **todas** as respostas de sala e snapshots SSE. O criador recebe a mesma visão individual, com ações de controlo adicionais.

- Antes da revelação: pergunta atual, opções, roster e resposta da própria pessoa; sem soluções, escolhas alheias, totais de votos ou pontuação da ronda.
- Revelação: solução pública ou contagens agregadas; resposta própria continua visível.
- Resultados: pontuação e resumo público de rondas. Nunca inclui mapa de respostas por participante.
- Em polls com duas pessoas, o resultado agregado pode permitir deduzir a outra escolha; isso faz parte da revelação pública.
- No mesmo aparelho, há um ecrã de passagem antes de cada turno. O conteúdo e a resposta anterior são removidos dessa visão. Isto protege a apresentação, não promete sigilo contra inspeção do JavaScript no próprio aparelho.

`revision` é monotónico na sala (incluindo repetição). Clientes ignoram snapshots com revisão inferior ou igual, mesmo quando SSE ultrapassa a resposta HTTP. Ações levam `{ id, match, round, type, choice? }`. Pedidos repetidos com o mesmo ID/conteúdo não se reaplicam; ID com conteúdo diferente é rejeitado. Tokens `match/round` rejeitam ações atrasadas, sem rejeitar duas respostas legítimas concorrentes à mesma ronda. A cache de ações guarda os 512 IDs mais recentes; tokens antigos continuam protegidos após evicção.

## Protocolo de sala e identidade

| Endpoint | Função |
| --- | --- |
| `POST /api/ludi/rooms` | `{name,id}` cria sala e participação do criador, com idempotência |
| `POST /api/ludi/rooms/:code/join` | `{name}` entra, ou retoma participação já associada ao cookie |
| `GET /api/ludi/rooms/:code` | Snapshot filtrado da participação atual |
| `POST /api/ludi/rooms/:code/actions` | Ação validada na autoridade; devolve snapshot filtrado |
| `GET /api/ludi/rooms/:code/events` | SSE `snapshot` com `id=revision`; `ping` a cada 15 s; `expired` no fim |

Cookie anónimo `ludi_session`: 256 bits aleatórios, `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, caminho `/api/ludi`, validade renovável de oito horas. Não requer conta. O servidor mapeia esse segredo para um ID opaco por sala. O token nunca entra nos snapshots. Um nome repetido é recusado, não recupera identidade. Duas abas do mesmo browser são a **mesma pessoa**; usar browsers/perfis independentes para testar duas identidades.

Criação, entrada e controlo têm limites; comandos são serializados e a reserva da última vaga não contém nenhum `await`. Há até 250 salas/processo, 20 salas abertas por IP (incluindo criações concorrentes), 3 salas por sessão, 3 streams por participante, 240 pedidos/IP/min, 120/sessão/min e 10 criações/IP/min. Corpos JSON têm máximo de 4096 bytes, inclusive com transferência em blocos. Escritas exigem Origin igual à origem configurada/servida. O IP não confia em forwarding arbitrário; num proxy todos os pedidos poderão partilhar o limite até ser definida uma política de proxy confiável numa etapa de publicação.

Quando houver TLS terminado num proxy, configurar `LUDI_PUBLIC_ORIGIN=https://dominio` para comparação de origem e cookie Secure. Não confiar no esquema declarado pelo cliente. Esta etapa não publica o serviço.

## Duração e limpeza

Uma instância Nitro mantém as salas e relays privados em memória durante **no máximo oito horas desde a criação**, sem prolongar por atividade ou repetição. TTL elimina controlador, inputs, tokens, cache de criação, timers e listeners, e encerra SSE. Desligar um browser remove o seu stream, mas mantém a participação para retoma. Lobbies e resultados sem streams nem atividade durante 30 minutos são libertados antecipadamente; partidas ativas mantêm a janela de retoma até ao TTL absoluto. No encerramento do processo, todas as salas são eliminadas. Não existe recuperação após reinício: o cliente mostra mensagem explícita para criar nova sala.

No modo local não existe sala/relay/rede durante a partida. Recarregar reinicia. Não há persistência durável, múltiplas instâncias, migração de host, bots, espectadores, temporizador ou pagamentos nesta entrega.

## Compatibilidade e proveniência

- `/duo` cria Entre Nós; convites `/play/:code?ludi=1` encaminham para `/ludi/salas/:code`. Salas antigas do relay público não são migradas.
- O catálogo original e restantes jogos Doot são legado, não “Ludi-ready”. Entre Nós sai do registry/barrel legado para não distribuir respostas no browser.
- **Doot:** código reutilizado de RoomRuntime, state machine, blocks, schemas, scoring e organização das camadas; MIT e créditos preservados.
- **Parlour:** referência para regras puras, determinismo e simulação sem interface.
- **LAN Games:** referência para validação autoritativa e filtragem por participante.
- **GameNest:** referência para entrada, retoma e descoberta contextual.
- **boardgame.io:** referência para fases/turnos e separação autoridade/transporte; framework não adicionada.

As quatro últimas referências orientam o desenho; não foi copiado código desses projetos nesta etapa.
