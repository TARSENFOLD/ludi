/** Primary themes reviewed against each stable content ID, not inferred at runtime. */
const choices = `
rotinas viagem casa música lazer natureza humor viagem descanso comida
cinema descanso surpresas aprendizagem encontros memória natureza planos livros presentes
rotinas jogos música lazer encontros lazer celebração cuidado encontros natureza
comida viagem histórias fotografia cooperação acolhimento rotinas recomendações aventura qualidades
criatividade conversa cuidado lugares comida cozinha afeto bem-estar descoberta encontros
talentos motivação crescimento decisões afeto tempo cuidado crescimento confiança celebração
desafios conversa pertença amizade coragem conversa aprendizagem diferenças memória confiança
criatividade viagem convites qualidades coragem conflitos amizade identidade criatividade tradições
conversa partilha cuidado pertença mudança proximidade celebração descoberta amizade espontaneidade
aprendizagem proximidade memória confiança conflitos amizade cuidado rotinas memória pertença
`.trim().split(/\s+/);
const stories = `
rotinas comida espontaneidade memória aprendizagem humor lugares influência talentos música
infância comida recomendações natureza crescimento tradições aventura casa presentes pertença
lazer criatividade crescimento conselhos tempo cuidado decisões perspetivas descanso ajuda
aprendizagem descanso proximidade coragem celebração escuta criatividade gentileza descoberta gratidão
conversa humor memória rotinas descoberta companhia celebração planos pertença conversa
`.trim().split(/\s+/);
const social = `
música lugares jogos humor criatividade organização comida fotografia cuidado descoberta
jogos natureza aventura cozinha dança conversa criatividade decisões recomendações tradições
livros natureza humor escuta jogos
interesses descoberta companhia escuta diferenças descoberta talentos lugares interesses companhia
perspetivas afinidades amizade aprendizagem acolhimento descoberta tradições criatividade histórias afinidades
partilha planos qualidades conversa convites
`.trim().split(/\s+/);
export function editorialTheme(kind: 'choice' | 'story' | 'social', index: number): string {
  const theme = ({ choice: choices, story: stories, social })[kind][index];
  if (!theme) throw new Error(`Missing editorial theme: ${kind} ${index + 1}`);
  return theme;
}
export const contextThemes: Record<string, readonly string[]> = {
  strangers: ['interesses', 'lazer', 'descoberta', 'humor', 'viagem', 'comida', 'música', 'talentos'],
  friends: ['amizade', 'tradições', 'memória', 'humor', 'aventura', 'convites', 'jogos'],
  couple: ['proximidade', 'afeto', 'cuidado', 'confiança', 'companhia', 'rotinas', 'convites'],
  group: ['cooperação', 'pertença', 'jogos', 'criatividade', 'planos', 'comida', 'aventura'],
  close: ['memória', 'gratidão', 'crescimento', 'escuta', 'perspetivas', 'partilha', 'qualidades'],
  random: [],
};
