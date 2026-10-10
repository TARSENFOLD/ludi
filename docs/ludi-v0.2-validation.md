# Evidências da fundação v0.2

## Verificações automatizadas

- `packages/games/src/ludi/local.test.ts`: partidas completas com 1, 2 e 6 pessoas, cinco perguntas, passagem de dispositivo, revelação, pontuação, repetição, determinismo, validação de escolhas e descoberta. `fetch` bloqueado durante a partida.
- `apps/web/server/utils/ludi-rooms.test.ts`: Doot RoomRuntime real com relay em memória, quatro rondas, visão do criador/convidado, snapshots de reconexão, SSE via subscrição do serviço, reentrada, nome duplicado, capacidade atómica, identidade falsificada, payload inválido, controlo por convidado, ronda antiga, resposta tardia, idempotência, TTL, recuperação de lobbies abandonados, limite de salas por IP e reinício simulado.
- `apps/web/app/utils/ludi-session.test.ts`: ordem monotónica entre HTTP/SSE, ignorar eventos repetidos, repetir pedido com o mesmo ID após resposta perdida, encerrar após expiração, reconstruir SSE fechado com backoff e tratar erros HTTP sem JSON.
- `scripts/verify-ludi.mjs`: inicia o **build Nitro de produção** isolado, usa sessões HTTP independentes e SSE real, percorre as quatro rondas, retoma snapshots, verifica cookies/origem/capacidade/payloads, repete a partida e inspeciona todos os JS/mapas do cliente para ausência do conteúdo de Entre Nós.
- Regressões Doot afetadas: runtime, catálogo e state machine.
- Typecheck de todos os pacotes e build Nuxt/Nitro.

```bash
corepack pnpm exec vitest run packages/games/src/ludi packages/games/src/runtime packages/games/src/catalog.test.ts packages/engine/src/state-machine.test.ts apps/web/server/utils/ludi-rooms.test.ts apps/web/app/utils/ludi-session.test.ts
corepack pnpm typecheck
corepack pnpm --filter @doot-games/web build
node scripts/verify-ludi.mjs
```

O workflow Verify Ludi executa estas verificações no PR. O script HTTP não publica serviço: inicia uma porta aleatória em loopback e termina o processo ao concluir. Credenciais de sessão são efémeras e não são escritas em logs.

## Resultado registado

- 230 testes passaram em 26 ficheiros na bateria acima.
- Typecheck de todos os pacotes e build Nuxt/Nitro passaram.
- O teste HTTP/SSE de produção passou e verificou 64 assets JavaScript/mapas do browser sem conteúdo das salas Entre Nós.
- Lint dos 25 ficheiros TypeScript/JavaScript novos ou extraídos passou.
- CodeRabbit: corrigidos os apontamentos de retoma de SSE encerrado, tratamento de resposta não JSON e capacidade de salas abandonadas/IP. Na revisão seguinte restou uma sugestão menor para registar ações parcialmente falhadas. Não foi adotado marcar uma ação falhada como concluída: os dois adapters atuais operam em memória, sem I/O externo na aplicação de regras. Uma futura autoridade com efeitos externos precisará de transação/recuperação explícita, não de confirmação artificial.

## Inspeção de interface

Observado no browser integrado: descoberta, combinação sala/3 pessoas sem resultados, limpar filtros, preparar solo, responder com teclado, pontuação após respostas, vista 390×844 e 844×390. Em paisagem, o controlo principal permanece fixo e as opções podem ser percorridas com scroll. Também observado: sala com identidades separadas por origens/cookies independentes, lobby 2/2 corrigido, convite compacto em jogo, recargas do criador e do convidado preservando identidade/ronda/resposta confirmada, e revelação sincronizada. Não equivale a um teste em Safari/iPhone físico.

## Gate físico após migração — pendente

O teste anterior do spike foi confirmado pelo utilizador, incluindo iPhone e reconexão. A identidade e a autoridade mudaram; essa evidência **não aprova a migração v0.2**.

1. Na mesma rede do computador, abrir `http://<IP-LAN>:3000/duo` num aparelho e criar uma sala.
2. Abrir o convite no outro aparelho, no Safari do iPhone. Entrar com nome diferente. Confirmar roster 2/2 e mensagem “Já estão os dois aqui”.
3. Começar e responder no criador. Recarregar a página: identidade, sala, ronda e resposta confirmada têm de continuar iguais, sem reintroduzir nome.
4. Responder no iPhone; recarregar e confirmar que a resposta também permanece. Uma tentativa de substituir resposta deve estar indisponível.
5. Revelar no criador, percorrer as quatro rondas, comparar resultados. Rodar cada aparelho para paisagem e confirmar que o botão principal fica acessível.
6. Tocar em Jogar novamente: mesma sala e pessoas; ronda 1, sem resposta nem pontuação herdada.
7. Opcional: desligar Wi-Fi e voltar a ligar durante uma ronda; verificar retoma sem ação duplicada. Abrir o mesmo nome num browser diferente deve ser recusado, sem assumir a identidade.
8. Em `/ludi`, carregar Desafio rápido, preparar solo/mesmo aparelho e só depois desligar a rede: concluir as perguntas e repetir. Recarregar deve reiniciar o jogo.

Registar: versão/commit, data, aparelhos, versões dos browsers/iOS e resultado dos passos. A etapa permanece com aceitação física pendente até confirmação explícita.

## Limitações intencionais

Uma instância, memória apenas, TTL de oito horas. Sem migração de salas do relay, persistência local/durável, Party/matchmaking, pagamentos ou publicação do serviço. O conteúdo local é inspecionável no aparelho; a privacidade adversarial testada aplica-se à fronteira da sala no servidor. Soluções de perguntas públicas podem ser conhecidas por outras fontes, incluindo este repositório público.
