# Ludi: primeiro jogo em dois dispositivos

> Registo histórico do spike v0.1. A implementação atual usa autoridade no servidor e identidade por cookie; consulta o [contrato v0.2](docs/ludi-game-contract-v0.2.md) e o [novo roteiro de validação](docs/ludi-v0.2-validation.md). As instruções de relay público e reconexão por nome abaixo aplicam-se apenas ao spike testado.

Este diretório é uma cópia local do [Doot](https://github.com/virgilvox/doot-games), obtida no commit `0f78d6d11e7a7863cc9aa575ab2cfa39c5f6bd9b`. O código original mantém a licença MIT. As alterações do Ludi estão nesta cópia; o repositório upstream não foi alterado.

## Jogar localmente

```bash
corepack pnpm install --frozen-lockfile
mkdir -p .data
corepack pnpm --filter @doot-games/web dev
```

Abre `http://localhost:3000/duo`, escreve o teu nome e cria a sala. Envia o convite a outra pessoa. O criador joga no próprio dispositivo e controla o avanço das rondas na mesma página. O jogo **Entre Nós** tem quatro rondas, compostas com os blocks existentes `poll` e `guess`.

O fluxo usa o relay público CLASP configurado pelo Doot. Para testar com dois telemóveis na mesma rede, o servidor tem de ouvir na interface de rede (`corepack pnpm --filter @doot-games/web dev --host 0.0.0.0`) e o criador deve abrir o endereço LAN da máquina, não `localhost`. O convite herda a origem aberta pelo criador. O endereço LAN atual pode ser visto com `ip -4 -o addr show dev wlo1`. O firewall deve permitir a porta 3000 na interface da rede usada para o teste.

### Roteiro para dois telemóveis

1. Liga ambos à mesma rede do computador e abre `http://<IP-LAN>:3000/duo` no primeiro. Cria a sala e envia o convite ao segundo.
2. Confirma que a sala mostra duas pessoas e que uma terceira tentativa recebe “Esta sala já está cheia”.
3. Inicia o jogo, responde nos dois aparelhos e confirma que ambos veem a revelação sem ecrã externo.
4. Durante uma ronda, recarrega a página do criador e usa “Retomar sala”. O código e a ronda devem manter-se.
5. Envia uma resposta no segundo aparelho, recarrega a página, entra com o mesmo nome e usa “Sou eu, reconectar”. A resposta deve continuar confirmada.
6. Termina as quatro rondas e compara pontuação e escolhas nos dois ecrãs.

## O que foi validado

- Um browser criou a room com uma instância host e outra player no mesmo dispositivo; uma segunda aba entrou como player independente. O mesmo fluxo foi aberto pelo endereço LAN da máquina.
- As duas sessões responderam a perguntas, receberam revelações e viram a pontuação final. O fecho automático ocorreu quando ambas responderam.
- O criador retomou o mesmo código e a mesma ronda após recarregar a página. O convidado reentrou pelo mesmo nome e recuperou uma resposta já enviada. Uma terceira tentativa de entrada no fluxo normal recebeu “Esta sala já está cheia”.
- Um empate na votação passou a ser descrito como “Escolhas divididas”, sem afirmar que os dois jogadores escolheram a mesma opção.
- O teste de integração percorre as quatro rondas com três runtimes separados (host, jogador criador e convidado), incluindo ocultação da resposta correta antes da revelação e scoring.
- `nuxi typecheck` passou. O fluxo foi observado no browser até ao resultado final em ambas as sessões.

## Teste acompanhado pelo utilizador — 10 out 2026

Versão testada: `38bc2d9`. O utilizador executou a partida no dispositivo criador e com um iPhone como convidado, pela rede local.

- As capturas enviadas mostram duas pessoas na sala do criador, a pergunta, respostas fechadas, revelação de escolhas divididas e a partida concluída com resultados.
- O utilizador confirmou que no iPhone conseguiu responder e ver os resultados corretamente.
- Depois do roteiro de recarga do criador e do convidado, o utilizador confirmou: “testado e a reconexao funciona perfeitamente”. A reconexão fica registada como confirmação do utilizador; não foi observada diretamente pelo agente nos aparelhos.
- O acesso inicial do iPhone foi desbloqueado permitindo temporariamente TCP/3000 na zona `nm-shared` do firewall do hotspot. O servidor já estava a responder antes dessa alteração.
- Resultado: fluxo funcional de **Entre Nós** e reconexão confirmados nos dois lados da sessão, incluindo o iPhone convidado.

### Ajustes de interface identificados

As capturas do criador mostram o convite a ocupar espaço durante a partida e o controlo de avanço abaixo da área visível no ecrã em paisagem. Estes ajustes continuam pendentes; não impediram a conclusão reportada da partida.

## Limites

- Os testes anteriores em duas abas foram complementados pelo teste do utilizador com iPhone convidado. O modelo e o ambiente exato do dispositivo criador, as versões dos browsers e do iOS não foram registados.
- A confirmação cobre a sessão reportada na rede local; redes independentes, interrupções prolongadas, suspensão em segundo plano e diferentes tamanhos de ecrã continuam fora desta evidência.
- A compatibilidade observada é para jogos compostos com `poll` e `guess`. Os jogos com fluxo próprio foram avaliados apenas por leitura do código em [CUSTOM_FLOW_AUDIT.md](CUSTOM_FLOW_AUDIT.md); nenhum foi validado em dois aparelhos.
- Isto é um spike local jogável, não uma versão publicada ou uma validação de produção.

## Verificações

```bash
corepack pnpm --filter @doot-games/web typecheck
corepack pnpm exec vitest run packages/games/src/runtime/duo.integration.test.ts packages/games/src/catalog.test.ts
```
