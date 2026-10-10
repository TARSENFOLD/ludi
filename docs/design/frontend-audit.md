# Inventário do frontend — auditoria Ludi

Inventário de todas as rotas Vue em 10 out 2026. A inspeção visual concentra-se nas superfícies públicas Ludi; as rotas legadas foram inventariadas por código e família, não apresentadas como jogos adaptados.

| Rota / ficheiro | Superfície |
| --- | --- |
| `account.vue` | Doot legado (bloqueado no perfil público) |
| `admin.vue` | Doot legado (bloqueado no perfil público) |
| `connect.vue` | Doot legado (bloqueado no perfil público) |
| `create.vue` | Doot legado (bloqueado no perfil público) |
| `decks/[id]/edit.vue` | Doot legado (bloqueado no perfil público) |
| `decks/[id].vue` | Doot legado (bloqueado no perfil público) |
| `decks/index.vue` | Doot legado (bloqueado no perfil público) |
| `decks/new.vue` | Doot legado (bloqueado no perfil público) |
| `dev/controllers.vue` | QA de desenvolvimento (excluída de produção) |
| `dev/results.vue` | QA de desenvolvimento (excluída de produção) |
| `duo.vue` | Ludi público |
| `editor/[plugin].vue` | Doot legado (bloqueado no perfil público) |
| `editor/g/[id].vue` | Doot legado (bloqueado no perfil público) |
| `explore.vue` | Doot legado (bloqueado no perfil público) |
| `g/[id].vue` | Doot legado (bloqueado no perfil público) |
| `game/[id].vue` | Doot legado (bloqueado no perfil público) |
| `host/[plugin].vue` | Doot legado (bloqueado no perfil público) |
| `host/g/[id].vue` | Doot legado (bloqueado no perfil público) |
| `host/playlist/[id].vue` | Doot legado (bloqueado no perfil público) |
| `host/session.vue` | Doot legado (bloqueado no perfil público) |
| `index.vue` | Doot legado; raiz pública encaminha para /ludi |
| `login.vue` | Doot legado (bloqueado no perfil público) |
| `ludi/desafio-rapido.vue` | Ludi público |
| `ludi/index.vue` | Ludi público |
| `ludi/salas/[code].vue` | Ludi público |
| `mine.vue` | Doot legado (bloqueado no perfil público) |
| `oauth/consent.vue` | Doot legado (bloqueado no perfil público) |
| `play/[room].vue` | Entrada compatível: convite Ludi encaminhado; jogo Doot preservado |
| `playlists.vue` | Doot legado (bloqueado no perfil público) |
| `privacy.vue` | Doot legado (bloqueado no perfil público) |
| `saved.vue` | Doot legado (bloqueado no perfil público) |
| `support.vue` | Doot legado (bloqueado no perfil público) |
| `terms.vue` | Doot legado (bloqueado no perfil público) |
| `u/[handle].vue` | Doot legado (bloqueado no perfil público) |
| `watch/[code].vue` | Doot legado (bloqueado no perfil público) |

## Componentes e estilos transversais

- Shell: `app.vue`, `ThemeProvider`, `AccountMenu`, `SiteFooter`, SEO, favicon, fontes e estilos globais.
- Ludi: `LudiGame.vue`, criação/entrada/retoma, descoberta e preparação local. Todos os estados do renderer foram lidos: lobby, passagem, resposta, confirmação, locked, reveal, resultados, histórico e ligação.
- Doot: `HostRoom`, `PlayerRoom`, `AudienceRoom`, `WatchRoom`, `SessionHostRoom` e previews; `GameHost/Player/Audience/Results`; editores de jogos/decks/rounds.
- UI partilhada: controlos, PhoneShell, Stage, RoomTicket, JoinForm, RosterChips, OptionGrid, VoteBars, Leaderboard, WinnerBoard, confetti e temas. Não se deve reutilizar um wrapper de telemóvel/big screen para a experiência Ludi.
- 213 SFCs Vue no inventário inicial de app/UI/games. Os blocks e jogos legados preservam estilos e regras próprios; reestilizá-los em massa ampliaria indevidamente o âmbito.

## Achados

| Prioridade | Evidência atual | Efeito / decisão |
| --- | --- | --- |
| Alta | `ludi.css` hardcodes de cores, 10/12/15/16/22 px de radius e spacing não sistemático | Tokens semânticos limitados ao Ludi. |
| Alta | `LudiGame` usa `ludi-card` para pergunta, convite, confirmação; tudo recebe contorno/sombra | Pergunta diretamente na página, separadores para informação secundária; duas superfícies de jogos no catálogo. |
| Alta | Footer genérico diz que espera outra pessoa em locked/reveal/results | Copy baseada no estado visível e no papel, sem inferir presença nem alterar autoridade. |
| Alta | Footer fixed + reserva fixa de 132 px | Reserva medida pela altura real; padding de ambas safe areas; landscape com colunas só para pergunta/opções. |
| Alta | `aria-live` abrange toda a pergunta, opções, resultados e histórico | Anúncio curto e foco no título quando muda ronda/fase; não interromper seleção quando chega SSE. |
| Média | 4 selects, explicação do algoritmo de tempo e contador antes dos jogos | Modo em opções diretas; filtros adicionais recolhíveis; estimativa junto do jogo. |
| Média | Mesmo peso/cores nos dois jogos | Cor sólida e símbolo estável por jogo; título/ação com hierarquia clara. |
| Média | `app.vue` envolve Ludi no tema Doot; body::after aplica grain | Neutralizar fundo/texture no contexto Ludi; manter temas legados. |
| Média | Baloo 2 e 6 outras famílias no head global | Figtree única no Ludi, com fonte de sistema como fallback; fontes Doot apenas no contexto legado. |
| Média | Favicon com mascote Doot; marca Ludi é apenas texto genérico | Marca tipográfica compacta com ponto amarelo, favicon por contexto. |
| Média | Criar/entrar mostram instruções operacionais longas antes de jogar | Copy principal curta; detalhes de retoma/duração secundários e acessíveis. |
| Média | Botão retomar tem peso de entrar; modo local repete escolha já feita no catálogo | Retoma como ação discreta; modo pré-selecionado mantido e resumo claro. |
| Média | “Copiado” fica indefinidamente; erro de clipboard vai para erro de ação global | Feedback local com anúncio, expiração e input selecionável como alternativa. |
| Média | Busy “A guardar” igual para qualquer ação, falta indicação de seleção | Label conforme ação; confirmação explícita só após snapshot. |
| Média | Reveal com valores crus; pontuação lista monótona e zero em polls | Barras com contagens reais, opção pessoal, pontos como detalhe; resultado com liderança/empate calculado apenas da visão pública. |
| Média | Landscape apenas reduz font/padding; prompt longo ocupa tudo | Duas colunas em landscape baixo; footer compacto e scroll natural. |
| Baixa | Estilos inline e markup comprimido duplicado nos headers | Header e componentes visuais partilhados; código legível. |

## Herança com aparência de SaaS

Account/login/admin, editor com painéis e tabelas, gestão de decks/playlists, filtros densos e grade de cards fazem sentido nas ferramentas Doot. Não devem guiar a descoberta Ludi. Permanecem como legado bloqueado pelo perfil público. No Ludi atual, o maior sinal de dashboard é o formulário de filtros seguido de caixas iguais; resolve-se a hierarquia, não com efeitos decorativos.

## Limites das provas iniciais

A ferramenta de viewport do browser reportou sucesso mas manteve `innerWidth=1280`. Não é uma prova de mobile. A QA usa iframes de dimensões verificadas em rota exclusivamente de desenvolvimento para testar media queries e overflow. Safe areas reais, teclado iOS e gesto/rotação físicos continuam a exigir aparelho; simulação não será descrita como teste físico.
