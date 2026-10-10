# Ludi — direção de arte da descoberta

## Auditoria da versão anterior

O problema não era legibilidade, mas ausência de contraste entre níveis. Header discreto, hero Figtree, filtros redondos e dois painéis pastel partilhavam o mesmo vocabulário. Os símbolos de conversa/relâmpago eram pequenos demais para constituir arte. O espaço vazio separava blocos sem construir uma composição. A simetria fazia ambos os jogos parecer variantes de um mesmo componente. A assinatura reduzia-se ao logótipo.

## Três direções

| Elemento | Editorial premium | Playful luxury — escolhida | Digital playground |
|---|---|---|---|
| Tipografia | Serif de alto contraste + sans pequena | Fraunces 700/itálico para gesto editorial; Figtree para ações | Sans larga/condensada, numerais enormes |
| Paleta | Papel, preto, vermelho editorial | Papel quente, tinta quase preta; terracota/ameixa para conversa; azul elétrico/lima para quiz | Azul, lima, magenta e superfícies escuras |
| Grelha | Colunas de revista, regras finas, margens assimétricas | Hero dominante e jogos 1,25/1 com desfasamento vertical | Módulos, sobreposições e zonas interativas |
| Motion | Entrada de texto e sublinhados | Objetos inclinam ao hover/foco; compressão ao premir; entrada breve, sem movimento infinito | Objetos reativos, transições entre módulos |
| Jogos | Capas editoriais com números de edição | Dois pequenos cartazes ilustrados, composições próprias | Brinquedos com previews manipuláveis |
| Fundo | Papel liso com linhas estruturais | Papel liso, regras de impressão e estrela recorrente; textura desenhada nos objetos | Grelha ou campo de jogo |
| Iconografia | Marcas gráficas finas | Peças vetoriais: balões em diálogo e fichas de resposta; estrela Ludi | Símbolos geométricos, cursores e feedback cinético |
| Mobile | Uma coluna; título continua expressivo | Arte recomposta, sem esconder ações; assimetria no interior, leitura vertical | Elementos convertidos para toque, sem depender de hover |

## Escolha e referências

Playful luxury com estrutura editorial. Das imagens de Poch: contraste tipográfico e autonomia da arte. Das imagens de Flying Papers: escala, presença e energia. Do case [Editorial New / Locomotive](https://locomotive.ca/en/work/editorial-new): tipografia como parte da experiência e microinteração. Não são reutilizadas fontes comerciais, mascotes, fotografias ou assets destas marcas.

## Alterações justificadas antes da execução

1. Header: slogan periférico dá lugar a um pequeno masthead com marca, assinatura “o tempo é para jogar” e atalho para jogos.
2. Hero: título compacto torna-se composição tipográfica de grande escala, com uma linha itálica e um selo gráfico próprio. Copy funcional passa a nota lateral.
3. Jogos: os retângulos pastel passam a cartazes com arte SVG própria, cor contrastante e formatos distintos. As ligações e modos conservam o destino e significado existentes.
4. Filtros: mantêm semântica e comportamento, mas ganham tratamento de índice editorial. Estado vazio continua explícito.
5. Motion: só transform/opacity, resposta ao hover/focus/press, sem ciclo infinito, sem scroll controlado e com reduced-motion.

## Limites

Esta iteração redesenha a descoberta. Regras, catálogo, identidade de sessão, transporte, lobby e partidas não são alterados. A tipografia expressiva é carregada apenas nesta página. Arte vetorial inline, sem bibliotecas de animação ou imagens pesadas. As ações continuam links nativos e os filtros continuam controlos nativos.

## Catálogo escalável e prioridade de ação

“Luxury” significa acabamento, confiança visual e detalhe. Os CTA são links explícitos, sempre disponíveis sem hover. As cores dos jogos diferem, mas tipografia, estrela, regras finas, arte em peças e ações partilham a mesma gramática.

`LudiGameCard` aceita `featured`, `standard` e `compact`. O modelo `LudiCatalogEntry` guarda apresentação e links na shell; não altera manifests ou regras. `LudiCatalog` limita o destaque a dois itens; outros destaques passam à grelha standard. Itens compactos são uma lista independente. Cada jogo aparece uma vez. A grelha regular usa 3/2/1 colunas. Arte é opcional e tem fallback gráfico. A ausência de rota nunca encaminha um jogo desconhecido para o quiz.

A homepage não inclui placeholders ou promessas de jogos inexistentes. A rota de desenvolvimento `/dev/ludi-catalog?count=12` permite inspecionar 4, 6 e 12 entradas sintéticas (com estados sem rota e nomes longos). Essas entradas são fixtures, não novos jogos. Rotas dev são removidas no build público.

## Evidência desta iteração

- Composição real inspecionada em 1280 × 900; poster de conversa e poster de quiz, CTA primário/secundário e navegação por teclado.
- Mobile 390 × 844: primeiro CTA terminou inicialmente em 907 px; após compactar ritmo e arte, termina em 837 px. Em 320 px não há overflow; CTA mede 73,5 px de altura.
- Fixtures de 12 itens em 1280 px: 2 featured, 6 standard, 4 compact; sem duplicação; largura útil/scroll 1265/1265.
- 4 itens em 844 × 390: grelha standard de duas colunas; largura útil/scroll 829/829.
- 6 itens em 390 × 844: uma coluna; largura útil/scroll 375/375.
- 12 itens em 320 × 740: uma coluna, compactos e nomes longos inspecionados; largura útil/scroll 305/305.
- Redução de movimento definida em CSS; nenhuma ação depende de hover. Não substitui teste físico Safari.
- Tipos da aplicação passaram. CodeRabbit CLI reviu os nove ficheiros desta iteração sem apontamentos.
- Filtro solo por teclado, combinação sem resultados, reposição e link para preparação do quiz verificados no browser após hidratação.
