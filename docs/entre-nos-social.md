# Entre Nós — regras consolidadas e implementação social

Revisto em 12 outubro 2026. Fonte: [Documento do Jogo](https://app.notion.com/p/3f514ba90ba6814d8b37eee13ae7828f). O utilizador autorizou consolidar as divergências e implementar a evolução completa.

## Decisões consolidadas

1. **Fluxo:** entrada → sala e convite → contexto → modo → preparação individual → partida. O anfitrião escolhe contexto e modo dentro da sala. Os convidados não repetem configuração.
2. **Participantes:** 2–6, sem conta, fixos após o primeiro início. Fechar o browser não é sair; reconexão e revanche mantêm as identidades. Reconfigurar após resultados mantém o mesmo grupo; outro grupo exige nova sala.
3. **Contexto:** desconhecidos, amigos, casal/date, grupo, conhecemo-nos bem ou aleatório. Filtra conteúdo compatível e muda a progressão de profundidade; desconhecidos não recebem itens de sensibilidade moderada. No máximo dois desses itens por bloco.
4. **Entre Nós:** dez momentos, com conteúdo oficial e perguntas próprias opcionais. É válido ficar pronto com zero perguntas.
5. **Quem Me Conhece?:** usa apenas perguntas próprias, pelo menos uma submetida por participante. Não há teto editorial de 2–5. Teto operacional por pessoa: 50, configurável por `LUDI_CUSTOM_QUESTION_LIMIT` (intervalo seguro 1–100).
6. **Perguntas:** prompt até 240 caracteres; 2–5 opções de até 120 caracteres, quatro por defeito, sem opções duplicadas ignorando maiúsculas; exatamente uma correta. Texto de controlo e campos adicionais são rejeitados. Rascunhos guardados também precisam de conteúdo válido, mas não entram na partida.
7. **Preparação privada:** cada pessoa cria/edita/apaga apenas as próprias perguntas. Os outros, incluindo anfitrião, só recebem contagem e readiness. Ficar pronto bloqueia edição; pode voltar a não pronto antes do início. A partida congela conteúdo, roster, sequência e ordem das opções.
8. **Pergunta própria:** identifica a pessoa sobre quem se pergunta. Autor não responde; quorum exclui-o. A solução só aparece na revelação. A identidade do autor não é prometida como anónima.
9. **Previsão:** restantes participantes preveem; depois responde o alvo, sem ver previsões. Validação de papel e etapa na autoridade. Uma passagem conta para quorum, sem erro/ponto ou resposta inventada.
10. **Conversa:** cada pessoa confirma texto de 1–500 caracteres ou passa individualmente. A interface funciona sem ligação de voz; a opção de confirmação oral foi retirada. O protocolo conserva respostas orais antigas por compatibilidade, apresentadas como participação sem texto. Texto próprio recuperável ao recarregar, oculto dos outros até todos terminarem; então fica visível no resultado e no histórico da sala. Sem gravação de áudio. Revelação automática no quorum; cada participante toca em Continuar para avançar. Sem timeout nem avanço forçado pelo criador.
11. **Resultados:** resumo de sintonia, escolhas divididas, previsões e perguntas próprias, sem classificação. «Mais 5» usa conteúdo próprio ainda não utilizado e novos itens oficiais. Repetir pode voltar ao pool próprio, com nova ordem. Configurar de novo mantém perguntas privadas na sala; nova sala não as herda.
12. **Vida dos dados:** respostas e conteúdo próprio apenas em memória na sala, até oito horas. Reinício/expiração elimina esse conteúdo. O browser guarda apenas IDs oficiais vistos e timestamps por 30 dias, até 200 entradas, com opção de apagar. Criação/entrada transmite os IDs como preferência de seleção; não identifica grupos. Sem perfis globais, biblioteca pessoal ou IA geradora de opções.
13. **Autonomia:** qualquer participante pode começar quando todos estiverem prontos e escolher Mais 5/repetir nos resultados. Contexto, modo e reconfiguração continuam a cargo do criador. Fechar o browser não remove a pessoa do quorum: é preciso voltar ou criar outra sala.
14. **Preparação simultânea:** alterações independentes de pessoas diferentes aceitam a mesma revisão observada. Alterações antigas da própria pessoa e configuração desatualizada são rejeitadas.

Estas regras prevalecem sobre os limites antigos e a ordem de ecrãs contraditória preservados como histórico no Notion.

## Implementação

- `LudiRound`: elegibilidade, quorum, necessidade de input e etapa declaradas pelo adapter; o `MatchController` coordena sem conhecer `entre-nos`.
- `PreparedRoom`: preparação separada, fila de operações, revisão otimista, idempotência, ownership e filtro único de snapshots. Materializa a definição antes de criar `MatchController` e `RoomRuntime`.
- Reutilização de poll/guess para escolhas sociais; novos adapters puros para previsão e conversa. Spectrum, Ballpark e quiz mantêm comportamento.
- Banco servidor com **200 perguntas originais** e IDs estáveis, profundidade, contextos, mínimo de participantes, sensibilidade e etiquetas. Seleção determinística com RNG injetável, exposição mínima por categoria elegível e preferência pelo conteúdo há mais tempo não utilizado. Ordem variável com abertura leve, penalização de temas repetidos e afinidades de contexto; 200 etiquetas temáticas por ID. Histórico de browsers unido como preferência, limitado aos IDs conhecidos no banco. Nunca repetir ID oficial no mesmo bloco. Categorias pequenas podem esgotar-se antes do banco inteiro.
- `POST /api/ludi/rooms` aceita `experience: "social"` apenas para o ID allowlisted `entre-nos`. A comparação idempotente inclui essa experiência. Omissão preserva o protocolo v0.2 de quatro rondas para clientes existentes; a nova entrada sempre envia `social`. Este caminho é compatibilidade de migração, não um segundo produto no catálogo.
- `POST /api/ludi/rooms/:code/preparation`: comandos estritos com `id` e `revision`. Mesmos cookies, origem, limites, HTTP/SSE e serializador das salas atuais.
- Nova entrada `/ludi/entre-nos`; `/duo` abre a mesma experiência. Editor usa os tokens, inputs, botões, revelação, convite e superfícies Ludi. Sem redesign da homepage.

## Evidências da entrega anterior (11 outubro)

- Suite completa: **1112 testes passaram**, seis testes externos/opcionais ignorados; 94 ficheiros passaram, dois ignorados.
- Verificação final após os ajustes: 16 testes de regras/serviço passaram (inclui o novo caso de «Mais 5» com perguntas próprias por utilizar). Typecheck e build Nuxt/Nitro passaram novamente.
- HTTP/SSE social: quatro sessões independentes; privacidade da preparação e das etapas, ownership, congelamento, dez momentos, retoma e continuação idempotente passaram.
- Regras/serviço: partidas completas de 2/4/6 pessoas; autor fora do quorum; previsões e passagem; prontidão; CRUD privado; revisões; identidade; replay e reconfiguração passaram.
- Regressões HTTP/SSE: Entre Nós v0.2 e Na Mesma Onda 2/3/6 passaram. Desafio rápido local coberto na suite, incluindo 1/2/6 participantes.
- 70 assets de cliente verificados sem os marcadores de conteúdo exclusivo do servidor, incluindo o novo banco.
- Browser: criação, convite com sessão independente, perguntas de ambos, privacidade visível, recarregar para recuperar pergunta/identidade/resposta, teclado, confirmação, revelação e resumo de Quem Me Conhece? verificados.
- Viewports por iframe real, pois o override do browser não alterou a dimensão: 390×844 e 844×390 sem overflow horizontal na revelação; CTA dentro do viewport. Preparação inspecionada em retrato. O controlo do browser não conseguiu acionar elementos dentro do iframe; o editor foi validado na página principal. O utilizador confirmou depois que o teste físico desta evolução passou.
- CodeRabbit CLI 0.7.6 reviu 31 ficheiros; uma observação menor sobre proteção contra duplo início, corrigida. Nenhum problema crítico/aviso reportado.

## Estado da entrega anterior

Teste físico desta evolução aceite pelo utilizador em 11 outubro 2026: «funciona perfeitamente, pode publicar». PR #6 integrada em `88ef8a7753c6bd4a9781bbe94b04d15b86e7d590`. Não se reivindica teste VoiceOver real. A publicação e as provas na origem pública estão registadas em [operação do Ludi](./ludi-publication-plan.md).


## Correções de experiência — 12 outubro 2026

Branch `fix/entre-nos-experience`. Nova apresentação própria do Entre Nós: progresso, participantes, pergunta dominante, seleção com teclado/toque, histórias, revelação, espera com nomes e CTA fixo. Resumo usa “Escolhas diferentes”, sem confundir escolhas divergentes com conversa efetivamente ocorrida.

Sete ilustrações SVG reutilizáveis, associadas a palavras nas opções e com símbolo de fallback. Todas as opções têm apresentação, incluindo conteúdo próprio; não existe arte exclusiva por pergunta nem classificação semântica perfeita. Expansão da família visual fica como evolução editorial.

### Provas desta correção

- Suite completa: **1150 testes passaram**, seis externos/opcionais ignorados. Após o ajuste final da alternância de mecânicas, os 44 testes afetados passaram novamente.
- Typecheck e build de produção passaram; HTTP/SSE do Entre Nós legado, Na Mesma Onda e experiência social passaram. 74 assets do cliente sem marcadores de conteúdo exclusivo do servidor.
- CodeRabbit reviu os 31 ficheiros da correção; normalização dos IDs e fallback de mecânicas corrigidos. A sugestão de avanço forçado pelo criador não foi aplicada: contradiz o quorum coletivo testado.

- Regras/serviço: passagem individual, texto/oral, validação de 500 caracteres, privacidade pré-reveal, recuperação da resposta própria, readiness coletivo, pedidos repetidos, roster fixo e preparação simultânea.
- Rejogabilidade: 30 partidas em cada combinação de seis contextos e 2/3/6 participantes (540 partidas simuladas); sem duplicados no bloco, evita repetir enquanto existem candidatos compatíveis ainda não utilizados, diversidade de rotas e esgotamento exercitados. Simulação não demonstra diversão nem promete 30 partidas sem qualquer repetição.
- Histórico: armazenamento indisponível/corrompido, TTL de 30 dias, exclusão, limites, apenas IDs/timestamps e comparação idempotente normalizada.
- Browser: opções por teclado, erro preserva seleção, texto habilita confirmação, revelação textual e layouts a 390×844 e 844×390 sem overflow horizontal; controlo principal dentro do viewport.
- Teste físico: o utilizador respondeu **“testei, passou”** ao pedido para testar iPhone e outro aparelho, passagem individual, história textual, recarga e Continuar nos dois ecrãs.
- Sem teste real de VoiceOver. Duração configurável, saída definitiva/host migration, revisão editorial de todas as mecânicas por pergunta e ilustrações exclusivas continuam fora desta correção.
- A correção está validada localmente e pendente de integração/publicação. A aceitação física anterior não é usada como prova desta versão; existe a nova confirmação acima.


## Entrada e escolha de sessão — PR #9, 13 de outubro de 2026

- Entrada com ilustrações vetoriais próprias (balões, descanso e passeio), composição centrada no telemóvel e criação direta com nome. A prévia é estática, identificada como ilustrativa e usa conteúdo fictício independente do banco privado.
- A escolha do contexto explica a relação entre as pessoas. A escolha de modo explica a origem das perguntas: Entre Nós traz conteúdo pronto e aceita perguntas opcionais; Quem Me Conhece? exige pelo menos uma pergunta guardada por participante. O CTA identifica o passo seguinte. Convidados também podem ler a explicação dos dois modos enquanto aguardam.
- Histórias partilhadas por texto; resultados convidam a ler e confirmar prontidão. Sem presumir conversa audível, sem adicionar chat ou áudio.
- Verificação local: 21 testes específicos aprovados, typecheck aprovado; criação real de sala pelo formulário/Enter e convite conferidos. Seleção de modos por setas, nomes acessíveis, foco visível, entrada a 320×568/390×844/1280×800 e seleção a 390×844/844×390 inspecionadas no navegador. Corrigida a prioridade CSS do tamanho do emblema após recarga. CodeRabbit: revisão final sem apontamentos.
- A verificação no navegador não substitui VoiceOver nem teclado virtual de um iPhone. A confirmação física anterior refere-se à PR #8. PR #9 continua em avaliação, sem merge/deploy.
