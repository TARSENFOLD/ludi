# Ludi

Jogos para partilhar momentos, a começar por **Entre Nós**: uma partida de quatro rondas para duas pessoas, em que cada uma responde e vê os resultados no próprio ecrã.

A fundação v0.2 usa o [Doot](https://github.com/virgilvox/doot-games), com autoridade das salas no servidor. Inclui **Entre Nós** para duas pessoas em aparelhos separados e **Desafio rápido** a solo ou para 2–6 pessoas no mesmo aparelho. O catálogo Ludi está em `/ludi`.

## Executar localmente

Requisitos: Node.js 22 e Corepack, com pnpm 10.10.0 definido no projeto.

```bash
corepack pnpm install --frozen-lockfile
mkdir -p .data
corepack pnpm --filter @doot-games/web dev
```

Abre [localhost:3000/ludi](http://localhost:3000/ludi) e escolhe um jogo. `/duo` continua a criar salas de Entre Nós. Para simular duas pessoas no computador, usa **browsers ou perfis independentes**: abas do mesmo browser partilham a identidade anónima.

Para aparelhos na mesma rede, inicia com `corepack pnpm --filter @doot-games/web dev --host 0.0.0.0` e abre `http://<IP-LAN>:3000/duo`. O convite usa a origem aberta pelo criador. As salas Ludi usam HTTP/SSE neste servidor e não dependem do relay público. O quiz local funciona sem rede depois de carregar.

## Estado da v0.2

- Doot é a fundação confirmada. Regras de `poll` e `guess` são partilhadas com os adapters legados.
- Identidade anónima por cookie HttpOnly; nome apenas de apresentação. Recarregar no mesmo browser recupera a participação e a resposta confirmada.
- Soluções e respostas privadas das salas ficam no servidor. HTTP e SSE usam a mesma visão filtrada, incluindo para o criador.
- Salas efémeras: uma instância, memória, máximo de oito horas. Reiniciar o servidor termina-as. Não executar várias instâncias atrás de balanceamento nesta versão.
- Partidas locais reiniciam ao recarregar. Cinco perguntas em português, sem temporizador.
- Testes automatizados, typecheck, build e provas HTTP/SSE documentados. **O novo teste acompanhado no iPhone está pendente**; a validação física anterior refere-se ao spike.
- Os restantes jogos Doot continuam disponíveis como legado. Não são automaticamente experiências Ludi adaptadas.

## Verificar

```bash
corepack pnpm exec vitest run packages/games/src/ludi packages/games/src/runtime packages/games/src/catalog.test.ts packages/engine/src/state-machine.test.ts apps/web/server/utils/ludi-rooms.test.ts apps/web/app/utils/ludi-session.test.ts
corepack pnpm typecheck
corepack pnpm --filter @doot-games/web build
node scripts/verify-ludi.mjs
```

O workflow **Verify Ludi** executa estas verificações. O workflow de deployment herdado está limitado ao repositório original do Doot. A publicação do serviço é uma etapa posterior.

## Documentação e origem

- [Game Contract v0.2 e fronteiras da arquitetura](docs/ludi-game-contract-v0.2.md)
- [Evidências e roteiro do teste físico v0.2](docs/ludi-v0.2-validation.md)
- [Histórico do spike validado](LUDI_SPIKE.md)
- [Auditoria dos jogos com fluxo próprio](CUSTOM_FLOW_AUDIT.md)
- [Documentação original do Doot](README_DOOT.md)

O ponto de partida foi o commit Doot `0f78d6d11e7a7863cc9aa575ab2cfa39c5f6bd9b`. A licença e os créditos originais estão preservados em [LICENSE](LICENSE). Os pacotes internos ainda usam os nomes `@doot-games/*`.

Ficheiros `.env`, bases de dados locais, dependências e builds ficam fora do Git. A configuração opcional está descrita em [.env.example](.env.example).
