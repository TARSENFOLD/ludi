# Ludi

Jogos para partilhar momentos, a começar por **Entre Nós**: uma partida de quatro rondas para duas pessoas, em que cada uma responde e vê os resultados no próprio ecrã.

Este repositório contém o primeiro protótipo técnico do Ludi, desenvolvido sobre o [Doot](https://github.com/virgilvox/doot-games). O criador da sala também joga no seu dispositivo e controla o avanço das rondas.

## Executar localmente

Requisitos: Node.js 22 e Corepack, com pnpm 10.10.0 definido no projeto.

```bash
corepack pnpm install --frozen-lockfile
mkdir -p .data
corepack pnpm --filter @doot-games/web dev
```

Abre [localhost:3000/duo](http://localhost:3000/duo), escreve o teu nome e cria uma sala. O convite permite à outra pessoa entrar. Para experimentar no mesmo computador, abre o convite numa segunda aba.

Para dois dispositivos na mesma rede, inicia com `corepack pnpm --filter @doot-games/web dev --host 0.0.0.0` e abre `http://<IP-LAN>:3000/duo`. O convite usa o endereço aberto pelo criador. O fluxo requer ligação à Internet para o relay CLASP configurado no projeto.

## Estado do protótipo

- Criação, entrada, quatro rondas e resultados foram observados em duas sessões browser na mesma máquina.
- A recarga do criador e a reconexão do convidado foram verificadas nesse cenário.
- O teste de integração cobre runtimes separados, ocultação da resposta correta e pontuação.
- Falta validar dois telemóveis físicos, incluindo toque, teclado e condições de rede.
- Doot continua a ser uma base técnica em avaliação; os outros jogos do catálogo não estão automaticamente adaptados ao Ludi.

## Verificar

```bash
corepack pnpm exec vitest run packages/games/src/runtime/duo.integration.test.ts packages/games/src/catalog.test.ts
corepack pnpm --filter @doot-games/web typecheck
```

O workflow **Verify Ludi** executa estas verificações. O workflow de deployment herdado está limitado ao repositório original do Doot.

## Documentação e origem

- [Spike, evidências e roteiro de teste](LUDI_SPIKE.md)
- [Auditoria dos jogos com fluxo próprio](CUSTOM_FLOW_AUDIT.md)
- [Documentação original do Doot](README_DOOT.md)

O ponto de partida foi o commit Doot `0f78d6d11e7a7863cc9aa575ab2cfa39c5f6bd9b`. A licença e os créditos originais estão preservados em [LICENSE](LICENSE). Os pacotes internos ainda usam os nomes `@doot-games/*`.

Ficheiros `.env`, bases de dados locais, dependências e builds ficam fora do Git. A configuração opcional está descrita em [.env.example](.env.example).
