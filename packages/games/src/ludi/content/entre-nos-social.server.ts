/** Original Portuguese editorial bank. Server-only: never export through the client catalogue. */
import type { SessionRelationship } from '../contracts';
import type { MomentType } from '../social-rounds';
export interface SocialQuestion {
  id: string; prompt: string; type: MomentType; options?: string[];
  depth: 1 | 2 | 3 | 4; contexts: SessionRelationship[];
  minPlayers: number; sensitivity: 'low' | 'moderate'; tags: string[];
}
const all: SessionRelationship[] = ['strangers', 'friends', 'couple', 'group', 'close', 'random'];
// Each row is an authored question, not a template multiplied into artificial variants.
const choices = `
O teu sábado ideal começa como?|Sem despertador|Com um passeio|Com música|Com gente à mesa
Numa viagem, o que te entusiasma primeiro?|A comida|As paisagens|As pessoas|Sair da rotina
O que torna uma casa acolhedora para ti?|Luz natural|Cheiro a comida|Livros e objetos|Pessoas à vontade
Quando descobres uma música boa, o que fazes?|Repito sem parar|Envio a alguém|Guardo numa lista|Procuro o artista
Num dia de chuva, qual é o teu plano?|Ver um filme|Cozinhar|Ler ou desenhar|Sair na mesma
Se ganhasses uma tarde livre, onde a passavas?|Num jardim|À beira de água|Num café|Em casa
O que te faz rir mais depressa?|Uma situação absurda|Uma imitação|Um trocadilho|Uma memória partilhada
Como preferes descobrir um lugar novo?|A pé sem plano|Com alguém de lá|Com um mapa|Numa visita guiada
Qual destes pequenos luxos escolhias hoje?|Lençóis acabados de mudar|Pequeno-almoço demorado|Uma sesta|Um banho tranquilo
Numa mesa de petiscos, qual é o teu papel?|Provar tudo|Recomendar o favorito|Pedir mais uma coisa|Garantir que todos comem
Como escolhes um filme?|Pela história|Pelo realizador ou elenco|Pela recomendação|Pelo estado de espírito
Qual destas pausas te recarrega mais?|Silêncio|Movimento|Uma conversa|Fazer algo com as mãos
Que tipo de surpresa te sabe melhor?|Uma visita combinada em segredo|Uma mensagem inesperada|Um passeio improvisado|Um presente pensado para mim
Se pudesses aprender algo numa tarde, escolhias o quê?|Um prato novo|Um passo de dança|Um truque de cartas|Uma técnica de desenho
Numa festa pequena, onde te encontras?|Na conversa à mesa|A escolher música|A ajudar na cozinha|A circular entre grupos
Como guardas uma boa memória?|Tiro uma fotografia|Conto a alguém|Guardo um objeto|Fico com ela na cabeça
O que preferes num passeio?|Um destino bonito|Boa companhia|Descobertas pelo caminho|Tempo sem pressa
Quando um plano muda à última hora, o que procuras?|Uma alternativa clara|Uma forma de improvisar|Saber o que todos preferem|Um momento para pensar
Qual seria o teu canto numa livraria?|Ficção|Viagens e histórias reais|Arte e fotografia|Ciência e curiosidades
Que presente pequeno gostas mais de receber?|Algo feito à mão|Algo útil|Algo para partilhar|Algo que me faça rir
Qual é o teu ritmo numa manhã livre?|Lento|Ativo desde cedo|Depende da companhia|Sem ritmo definido
Num jogo novo, como aprendes?|Lendo as regras|Vendo alguém jogar|Experimentando logo|Pedindo um exemplo
Qual destes sons te traz calma?|Chuva|Ondas|Música suave|Uma casa em atividade
Que atividade querias fazer mais vezes?|Dançar|Passear|Cozinhar com alguém|Criar alguma coisa
Num café, o que te faz ficar mais tempo?|A conversa|A vista|A música|O conforto
O que escolhias para uma noite sem ecrãs?|Um jogo|Uma caminhada|Uma conversa longa|Uma receita nova
Como preferes celebrar uma pequena vitória?|Contar a alguém|Fazer algo especial|Guardar o momento|Partilhar uma refeição
Que companhia aprecias quando estás cansado?|Quem escuta|Quem me faz rir|Quem respeita o silêncio|Quem propõe algo simples
Se organizasses um encontro, qual seria o centro?|A comida|Uma atividade|A conversa|Uma surpresa
Que objeto levarias para uma tarde no parque?|Uma manta|Uma bola|Um livro|Uma coluna pequena
Como decides onde comer com amigos?|Sugiro um favorito|Procuro algo novo|Sigo a maioria|Faço uma lista curta
Qual é o melhor final para uma viagem?|Voltar descansado|Ter uma história|Conhecer alguém|Querer regressar
O que te prende numa história?|As personagens|O mistério|O humor|A forma de contar
Que tipo de fotografia gostas mais de tirar?|Pessoas espontâneas|Paisagens|Pequenos detalhes|Momentos engraçados
Numa tarefa em grupo, por onde começas?|Definir o objetivo|Ouvir as ideias|Experimentar uma solução|Dividir tarefas
O que te faz sentir bem recebido?|Ser chamado pelo nome|Ter espaço para falar|Um gesto de cuidado|Um ambiente descontraído
Que rotina gostarias de proteger melhor?|Dormir a horas|Ter tempo para amigos|Mexer o corpo|Ter tempo sem obrigações
Como preferes receber uma recomendação?|Com uma história|Com uma razão concreta|Com entusiasmo|Experimentando em conjunto
Qual destas aventuras pequenas aceitavas?|Sair numa paragem desconhecida|Provar um prato novo|Ir a um concerto sem conhecer a banda|Aprender uma atividade em grupo
Que talento discreto valorizas?|Saber ouvir|Encontrar soluções|Reparar nos detalhes|Juntar pessoas
Quando tens uma ideia, o que fazes primeiro?|Escrevo|Conto a alguém|Começo a testar|Deixo amadurecer
Que tipo de conversa te faz perder a noção do tempo?|Ideias para o futuro|Histórias de vida|Curiosidades|Recordações engraçadas
Como gostas de ajudar alguém?|Com uma solução prática|Ouvindo|Fazendo companhia|Dando uma nova perspetiva
Que detalhe te faz gostar de um bairro?|As pessoas|Os espaços verdes|O comércio local|Os lugares para estar
Qual seria a tua contribuição para um piquenique?|Um prato preparado|Música|Um jogo|Uma manta e organização
Quando uma receita corre mal, o que fazes?|Improviso|Peço ajuda|Começo de novo|Transformo em história
Qual é o teu jeito de dizer que gostas de alguém?|Dar atenção|Fazer pequenos favores|Dizer diretamente|Partilhar tempo
Que coisa simples melhora um dia comum?|Uma mensagem|Uma boa refeição|Ar livre|Conseguir terminar algo
Quando conheces alguém, o que notas primeiro?|O humor|A forma de escutar|A energia|Os interesses
O que te deixa com vontade de repetir um encontro?|A conversa fácil|Ter rido muito|Ter descoberto algo|Sentir-me à vontade
Se pudesses escolher uma habilidade para o grupo, qual seria?|Tocar música|Cozinhar muito bem|Orientar-se em qualquer sítio|Contar boas histórias
Que plano costuma parecer melhor depois de começar?|Sair para caminhar|Arrumar um espaço|Ir conhecer gente|Experimentar algo difícil
Qual destas qualidades gostarias de praticar mais?|Paciência|Coragem|Curiosidade|Consistência
O que te ajuda quando uma decisão parece difícil?|Escrever opções|Conversar|Dormir sobre o assunto|Dar um primeiro passo pequeno
Qual destes elogios te toca mais?|Fazes-me sentir à vontade|Posso contar contigo|Tens ideias interessantes|Contigo rio-me muito
Como gostarias de usar uma hora extra por dia?|Aprender|Descansar|Estar com pessoas|Criar
O que preferes que alguém faça quando te enganas?|Ajude a corrigir|Dê espaço|Mostre que acontece a todos|Explique com calma
Que coisa aprecias mais com o passar do tempo?|Rotinas simples|Amizades antigas|Tempo livre|Experiências novas
Qual destas promessas pequenas é mais importante para ti?|Chegar quando combinámos|Responder com atenção|Ser sincero|Lembrar-me do que contaste
Quando sentes orgulho em ti, costuma ser por quê?|Ter tentado|Ter ajudado|Ter terminado|Ter aprendido
Que tipo de desafio te dá vontade de tentar?|Criativo|Físico|De raciocínio|Social
Como preferes preparar uma conversa importante?|Pensar sozinho|Escrever o que quero dizer|Falar com alguém de confiança|Encontrar o momento e começar
O que te faz sentir parte de um grupo?|Ser incluído nos planos|Ser ouvido|Poder ser eu próprio|Ter histórias em comum
Que hábito dos outros te inspira?|Cuidar das amizades|Aprender sempre|Cumprir pequenas promessas|Encontrar tempo para brincar
Qual destas coisas gostavas de fazer com mais leveza?|Pedir ajuda|Dizer que não sei|Experimentar e errar|Mudar de opinião
O que gostas de levar de uma boa conversa?|Uma ideia|Uma gargalhada|Uma sensação de proximidade|Uma pergunta nova
Quando estás a aprender, que apoio preferes?|Incentivo|Exemplos|Tempo para tentar|Feedback concreto
Que diferença entre pessoas te parece enriquecedora?|Ritmos|Gostos|Experiências|Formas de resolver problemas
O que te faria guardar um bilhete antigo?|A pessoa que estava comigo|O lugar|O que senti|A história desse dia
Qual é o melhor sinal de confiança para ti?|Poder discordar|Poder pedir ajuda|Poder ficar em silêncio|Poder ser espontâneo
Que parte de um projeto gostas mais?|Imaginar|Começar|Aperfeiçoar|Partilhar
Se o grupo fizesse uma viagem, o que querias garantir?|Tempo livre|Uma experiência especial|Conforto básico|Espaço para todos escolherem
Qual destes convites aceitavas mais depressa?|Vamos ver o pôr do sol|Vamos experimentar uma receita|Vamos a um sítio novo|Vamos ficar a conversar
Que coisa tens aprendido a valorizar nos outros?|Clareza|Gentileza|Disponibilidade|Humor
O que te ajuda a sentir coragem?|Preparação|Companhia|Uma razão forte|Saber que posso voltar atrás
Como preferes resolver um mal-entendido pequeno?|Falar logo|Pensar e falar depois|Fazer uma pergunta|Ouvir primeiro
Que gesto de amizade faz mais diferença para ti?|Lembrar uma data|Perguntar como correu|Aparecer quando faz falta|Incluir-me num plano
O que querias que as pessoas percebessem melhor sobre ti?|O meu ritmo|O meu sentido de humor|A minha forma de cuidar|O que me entusiasma
Quando estás sem inspiração, o que procuras?|Novos lugares|Outras pessoas|Silêncio|Algo que já adoro
Que tipo de tradição criarias com amigos?|Um jantar regular|Uma viagem anual|Um desafio novo|Uma chamada sem motivo
O que torna uma conversa difícil mais fácil?|Tempo|Humor com cuidado|Perguntas claras|Sentir que não há julgamento
Qual destas coisas gostavas de partilhar mais?|Ideias por acabar|Pequenas vitórias|Dúvidas|Histórias antigas
Num dia cheio, o que gostas que alguém te ofereça?|Ajuda concreta|Uma pausa|Companhia tranquila|Uma mensagem curta
Que marca gostavas de deixar num grupo?|Boa energia|Confiança|Curiosidade|Memórias
Quando pensas numa mudança, o que te atrai?|A novidade|O que posso aprender|As pessoas que vou conhecer|A possibilidade de simplificar
Qual destas coisas aproxima mais duas pessoas?|Fazer algo juntos|Conversar com honestidade|Rir das mesmas coisas|Superar um pequeno desafio
O que gostavas de celebrar mais vezes?|Progresso pequeno|Amizades|Coragem para tentar|Dias comuns bons
Que atitude te faz querer conhecer melhor alguém?|Fazer boas perguntas|Escutar sem interromper|Rir de si próprio|Mostrar curiosidade
Quando um amigo precisa de espaço, o que te parece melhor?|Perguntar o que prefere|Deixar uma mensagem sem pressão|Combinar falar depois|Oferecer companhia silenciosa
Que lugar ocupa a espontaneidade na tua vida?|Procuro-a|Gosto quando surge|Preciso de algum plano|Depende do dia
Qual destas coisas querias aprender com alguém daqui?|Um interesse|Uma habilidade|Uma forma de pensar|Uma maneira de relaxar
O que dá mais valor ao tempo passado juntos?|Atenção|Liberdade|Uma atividade partilhada|Uma conversa inesperada
Que tipo de recordação gostavas de criar hoje?|Algo engraçado|Uma descoberta|Um plano futuro|Um momento tranquilo
Como sabes que estás à vontade com alguém?|Não penso no que dizer|Consigo discordar|Não preciso preencher silêncios|Posso mostrar entusiasmo
O que preferes num pedido de desculpa?|Clareza|Escuta|Mudança concreta|Um gesto de reparação
Que parte de ti aparece mais entre amigos?|O humor|A curiosidade|O cuidado|A espontaneidade
Qual destas perguntas gostas mais de receber?|O que te entusiasma agora?|Como posso ajudar?|Queres fazer alguma coisa?|O que aprendeste ultimamente?
Que plano gostavas de transformar em hábito com alguém?|Caminhar|Cozinhar|Aprender algo|Conversar sem ecrãs
Quando olhas para um ano bom, o que costuma destacar-se?|As pessoas|As experiências|O que aprendi|O equilíbrio que encontrei
O que gostavas que este grupo levasse desta sessão?|Uma história nova|Uma ideia para fazer juntos|Mais curiosidade uns pelos outros|Vontade de repetir
`.trim().split('\n');
const stories = `
Conta uma descoberta pequena que melhorou a tua rotina.
Que comida te lembra um lugar e qual é a história?
Conta uma vez em que um plano improvisado correu bem.
Que objeto comum guardas por causa de uma boa memória?
Qual foi a última coisa que aprendeste por curiosidade?
Conta uma pequena confusão que hoje te faz rir.
Que lugar perto de ti recomendarias a alguém e porquê?
Que hábito teu começou por influência de outra pessoa?
Conta uma vez em que te surpreendeste com uma habilidade tua.
Que música te transporta para uma ocasião concreta?
Que brincadeira gostavas de fazer em criança?
Conta uma refeição de que te lembras pela companhia.
Que recomendação recebida por acaso acabou por ser boa?
Qual foi um passeio simples que ficou na memória?
Conta uma coisa que achavas aborrecida e aprendeste a apreciar.
Que pequena tradição gostavas de recuperar?
Conta uma vez em que te perdeste e descobriste algo interessante.
Que detalhe de uma casa antiga ainda recordas?
Qual foi um presente simples que acertou em cheio?
Conta um momento em que alguém te fez sentir incluído.
Que atividade gostarias de voltar a experimentar sem obrigação de ser bom?
Que coisa começaste por brincadeira e levaste mais longe?
Conta uma vez em que mudar de opinião te fez bem.
Que conselho pequeno realmente usaste?
Que parte do teu dia gostarias de tornar mais tua?
Conta algo que aprendeste ao ajudar alguém.
Que pequena decisão abriu uma oportunidade inesperada?
Que pessoa te mostrou uma forma diferente de ver algo?
Que lugar te dá vontade de abrandar?
Conta um momento em que pedir ajuda tornou tudo mais simples.
Que habilidade de alguém próximo gostavas de aprender?
Conta uma ocasião em que escolher descansar foi uma boa decisão.
Que rotina partilhada te dá sensação de proximidade?
Qual é uma coisa que hoje fazes com menos vergonha do que antes?
Que esforço teu passou despercebido mas te deixou satisfeito?
Conta uma vez em que ouvir primeiro mudou a conversa.
Que projeto pequeno gostarias de concluir só pelo prazer de o fazer?
Que gesto de gentileza ainda te lembras de ter recebido?
Qual foi uma primeira impressão tua que mudou com o tempo?
Que coisa simples gostavas de agradecer mais vezes?
Que conversa te deixou com uma pergunta interessante?
Conta um momento em que alguém percebeu o teu humor.
Que memória gostavas de recriar com uma versão diferente?
O que tens aprendido sobre o teu próprio ritmo?
Que curiosidade sobre alguém daqui gostavas de explorar com calma?
Que coisa gostavas de fazer acompanhado em vez de sozinho?
Conta uma pequena vitória que ainda não tiveste ocasião de celebrar.
Que plano antigo ainda te dá vontade de tentar?
Que história gostavas que este grupo pudesse contar daqui a um ano?
Que pergunta desta sessão gostavas de continuar fora do jogo?
`.trim().split('\n');
const group = `
Quem aqui escolheria a música de uma viagem?
Quem aqui encontraria um café acolhedor numa rua desconhecida?
Quem aqui levaria um jogo para um encontro?
Quem aqui repararia primeiro num detalhe engraçado?
Quem aqui inventaria um plano com o que há à mão?
Quem aqui faria a melhor lista de coisas para levar?
Quem aqui convenceria o grupo a experimentar um prato novo?
Quem aqui guardaria uma fotografia espontânea de todos?
Quem aqui se lembraria de levar água para o passeio?
Quem aqui faria uma pergunta que ninguém esperava?
Quem aqui transformaria uma espera numa brincadeira?
Quem aqui escolheria uma boa paragem para ver a paisagem?
Quem aqui descobriria uma atividade nova para o grupo?
Quem aqui saberia improvisar uma sobremesa?
Quem aqui começaria a dançar primeiro?
Quem aqui ficaria a conversar depois de todos se levantarem?
Quem aqui escolheria um bom nome para a equipa?
Quem aqui encontraria uma solução simples para um imprevisto?
Quem aqui faria uma recomendação muito específica?
Quem aqui criaria uma tradição para este grupo?
Quem aqui levaria mais tempo a escolher um livro?
Quem aqui proporia um passeio sem destino?
Quem aqui faria o grupo rir com uma história do dia?
Quem aqui repararia que alguém ainda não falou?
Quem aqui transformaria uma tarefa numa competição amigável?
Que interesse desta pessoa gostarias de conhecer melhor?
Que primeira impressão tiveste desta pessoa e o que já descobriste entretanto?
Que atividade simples gostavas de experimentar com esta pessoa?
Que qualidade desta pessoa torna a conversa mais fácil?
Que diferença entre ti e esta pessoa pode tornar um plano mais interessante?
Que curiosidade inofensiva gostavas de perguntar a esta pessoa?
Que pequeno talento desta pessoa gostavas que ela mostrasse?
Que tipo de lugar achas que esta pessoa te recomendaria?
Que assunto faz esta pessoa ganhar energia quando fala?
Que experiência gostavas de partilhar com esta pessoa?
Que pergunta desta pessoa te fez pensar de outra forma?
Que gosto em comum descobriste com esta pessoa?
Que plano escolherias para apresentar esta pessoa aos teus amigos?
Que coisa desta pessoa gostavas de aprender a fazer?
Que gesto desta pessoa te fez sentir bem recebido?
Que surpresa boa sobre esta pessoa levas desta conversa?
Que tradição pequena podias criar com esta pessoa?
Que tipo de desafio criativo gostavas de fazer com esta pessoa?
Que história gostavas de ouvir esta pessoa contar com mais tempo?
Que escolha desta pessoa te deixou curioso?
Que parte do teu mundo gostavas de mostrar a esta pessoa?
Que plano futuro fica mais interessante com esta pessoa?
Que palavra descreve a energia desta pessoa hoje, e porquê?
Que conversa entre vocês merece uma segunda parte?
Que convite simples gostavas de fazer a esta pessoa depois do jogo?
`.trim().split('\n');
export const socialQuestions: readonly SocialQuestion[] = [
  ...choices.map((row, i): SocialQuestion => {
    const [prompt, ...options] = row.split('|');
    return { id: `en-choice-${String(i + 1).padStart(3, '0')}`, prompt: prompt!, options,
      type: i % 3 === 0 ? 'prediction' : i % 3 === 1 ? 'sync' : 'quick-choice',
      depth: i < 35 ? 1 : i < 70 ? 2 : i < 90 ? 3 : 4,
      contexts: i >= 75 && i < 90 ? all.filter(c => c !== 'strangers') : all,
      minPlayers: 2, sensitivity: i >= 75 && i < 90 ? 'moderate' : 'low', tags: [i < 50 ? 'quotidiano' : 'relações'] };
  }),
  ...stories.map((prompt, i): SocialQuestion => ({ id: `en-story-${String(i + 1).padStart(3, '0')}`, prompt, type: 'story', depth: i < 20 ? 1 : i < 35 ? 2 : 3, contexts: all, minPlayers: 2, sensitivity: 'low', tags: ['memória', 'história'] })),
  ...group.map((prompt, i): SocialQuestion => ({ id: `en-social-${String(i + 1).padStart(3, '0')}`, prompt, type: i < 25 ? 'who-here' : 'perception', depth: i < 25 ? 2 : 4, contexts: all, minPlayers: i < 25 ? 3 : 2, sensitivity: 'low', tags: [i < 25 ? 'grupo' : 'descoberta'] })),
];
