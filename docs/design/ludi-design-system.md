# Ludi — sistema visual mínimo

## Direção

Uma pequena pausa que apetece partilhar. Forma reconhecível, texto direto e resposta imediata. Mantêm-se descoberta → preparação → lobby → resposta → confirmação → revelação → resultado. Sem alterar ações, fases, regras, sessão ou transporte.

## Tokens

| Área | Decisão |
| --- | --- |
| Tipografia | Figtree, sistema como fallback; 400/600/700/800. Display 40–64, pergunta 28–40, título 24–32, corpo 16–18, auxiliar 14, etiqueta 12. Uma família, headings compactos, corpo 1.5. |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64. Gutter 20 px no telemóvel, 32 px amplo. |
| Radius | 8 para detalhes, 12 para campos/opções/botões, 24 apenas nas duas peças do catálogo; círculo para avatar. |
| Cor | Papel #FAF9F6; tinta #24382E; texto secundário #59675E; verde de ação #254E3B; amarelo #F2D45C como assinatura; lavanda #E8E0F2 para Entre Nós; verde suave #DDECE1 para quiz. |
| Superfícies | Página plana, superfície branca para inputs/respostas, fundo por jogo no catálogo, confirmação verde clara. Sem gradiente, grain ou glass. |
| Elevation | Zero na maioria; sombra curta apenas no controlo fixo quando necessário para separação. |
| Botões | Primário sólido, secundário delineado, discreto textual. Área de toque ≥48 px, foco 3 px, disabled legível, busy com texto específico. |
| Estados | Seleção com contorno + check; confirmado com check + texto; erro com texto + contorno; reconexão com estado persistente. Nunca só cor. |
| Motion | 120 ms em interação, 180 ms na entrada de fase; sem loops decorativos, sem atraso de ações. Respeitar reduced motion. |
| Feedback | Seleção local não é confirmação; confirmar apenas após snapshot. Clipboard anuncia sucesso/falha no convite. Uma linha de status na zona de ação. |

## Comparação antes de cada fase

1. **Foundation:** cores e medidas repetidas → tokens e componentes de marca/header. Isolar o Ludi da textura/fontes do Doot preserva o legado.
2. **/ludi:** quatro filtros pesados + cards iguais → título expressivo, modo imediato, filtros secundários, duas peças reconhecíveis por jogo. Reduz trabalho antes da primeira escolha.
3. **Lobby:** caixa vazia + caixa de código → participantes e convite como conteúdo central, pronto/aguarda explícitos. Preparação fica leve e mantém a mesma entrada.
4. **Jogo:** pergunta dentro de painel com informação redundante → pergunta livre, progresso pequeno, opções com letras e seleção evidente, confirmação visível. Ação principal continua ao alcance.
5. **Reveal/results:** valores em lista sem hierarquia → resposta/contagem com destaque e resultado de partida legível; replay continua primário. Sem inventar pontuação para escolhas sociais.
6. **Portrait/landscape:** reserva fixa do footer + redução genérica → altura real, safe areas, colunas para landscape baixo, nomes longos e teclado sem scroll horizontal.

## Reutilização

Manter `LudiGame` como renderer da interface de sessão. Extrair só apresentação repetida: header, símbolo de jogo, participantes/pontuação e progresso. Manter elementos nativos (`button`, `radio`, `details`, `select`) e rotas existentes. Nenhuma biblioteca de animação ou UI adicional.
