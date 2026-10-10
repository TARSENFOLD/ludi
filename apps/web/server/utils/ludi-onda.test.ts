import { afterEach, describe, expect, it } from 'vitest';
import { LudiRoomService } from './ludi-rooms';
import type { LudiAction, LudiView } from '@doot-games/games/ludi/contracts';
const services: LudiRoomService[] = [];
let sequence = 0;
function service() {
  const s = new LudiRoomService({ now: () => 1000, random: () => 0.31 });
  services.push(s); return s;
}
function command(v: LudiView, type: LudiAction['type'], value?: number): LudiAction {
  return { id: `onda-request-${sequence++}`, match: v.match, round: v.round, type, ...(value !== undefined ? { value } : {}) };
}
async function room(count: number) {
  const s = service();
  const first = await s.create('p0', 'Pessoa 0', 'create-onda', 'local', 'na-mesma-onda');
  const code = first.code!;
  for (let i = 1; i < count; i++) s.join(code, `p${i}`, `Pessoa ${i}`);
  const send = (type: LudiAction['type'], value?: number, token = 'p0') => s.action(code, token, command(s.view(code, token), type, value));
  return { s, code, send };
}
afterEach(() => services.splice(0).forEach(s => s.dispose()));
describe('Na Mesma Onda: server authority and filtered participant views', () => {
  for (const count of [2,3,6]) it(`finishes six rounds with ${count} identities, then replays with new content`, async () => {
    const { s, code, send } = await room(count);
    const roster = s.view(code, 'p0').players;
    const snapshots: LudiView[] = [];
    const off = s.subscribe(code, 'p1', v => snapshots.push(v), () => {});
    await send('start');
    const prompts: string[] = [];
    for (let round = 0; round < 6; round++) {
      prompts.push(s.view(code, 'p0').content!.prompt);
      for (let i = 0; i < count; i++) await send('answer', i === 0 ? 20 : 80, `p${i}`);
      const resumed = s.join(code, 'p0', 'A renamed attempt');
      expect(resumed.context.participantId).toBe(roster[0]!.id);
      expect(resumed.ownValue).toBe(20);
      expect(resumed.players).toEqual(roster);
      expect(resumed.roundState).toBe('locked');
      expect(resumed.reveal).toBeUndefined();
      expect(resumed.scores).toBeUndefined();
      expect(resumed.history).toBeUndefined();
      expect(s.view(code, 'p1').ownValue).toBe(80);
      const reveal = await send('reveal');
      expect(reveal.reveal?.marks).toEqual([20, ...Array(count - 1).fill(80)]);
      expect(reveal.reveal).not.toHaveProperty('players');
      if (count === 2) expect(reveal.reveal?.duoScore).toBe(400);
      await send(round === 5 ? 'finish' : 'next');
    }
    const final = s.view(code, 'p0');
    expect(final.phase).toBe('results');
    expect(final.history).toHaveLength(6);
    if (count === 2) expect(final.scores?.map(p => p.score)).toEqual([2400,2400]);
    const replay = command(final, 'replay');
    await Promise.all([s.action(code, 'p0', replay), s.action(code, 'p0', replay)]);
    const newGame = s.view(code, 'p0');
    expect(newGame.match).toBe(2);
    expect(newGame.players).toEqual(roster);
    expect(newGame.context.participantId).toBe(final.context.participantId);
    expect(newGame.ownValue).toBeUndefined();
    expect(newGame.scores).toBeUndefined();
    expect(prompts).not.toContain(newGame.content!.prompt);
    await send('answer', 50);
    off();
    expect(snapshots.filter(v => v.phase === 'active' && v.roundState !== 'reveal').every(v => !v.reveal && !v.history && !v.scores)).toBe(true);
  });
  it('keeps disconnected participants eligible on replay and allows reconnecting with the same identity', async () => {
    const { s, code, send } = await room(4);
    const roster = s.view(code, 'p0').players;
    const off = s.subscribe(code, 'p3', () => {}, () => {});
    await send('start');
    for (let round = 0; round < 6; round++) {
      for (let i = 0; i < 4; i++) await send('answer', 50, `p${i}`);
      await send('reveal'); await send(round === 5 ? 'finish' : 'next');
    }
    off(); await send('replay');
    for (let i = 0; i < 3; i++) await send('answer', 50, `p${i}`);
    expect(s.view(code, 'p0').roundState).toBe('open');
    expect(s.view(code, 'p0').players).toEqual(roster);
    expect(s.join(code, 'p3', 'ignored').context.participantId).toBe(roster[3]!.id);
    await send('answer', 50, 'p3');
    expect(s.view(code, 'p0').roundState).toBe('locked');
    const different = await room(3);
    expect(different.s.view(different.code, 'p0').players).toHaveLength(3);
  });
  it('allowlists room games and includes game ID in creation idempotency', async () => {
    const s = service();
    for (const id of ['../../games/spectrum', '__proto__', 'desafio-rapido', 'unknown'])
      await expect(s.create('x', 'Ana', 'create-test', 'local', id)).rejects.toThrow('indisponível');
    const a = await s.create('x', 'Ana', 'create-test', 'local', 'na-mesma-onda');
    expect((await s.create('x', 'Ana', 'create-test', 'local', 'na-mesma-onda')).code).toBe(a.code);
    await expect(s.create('x', 'Ana', 'create-test', 'local', 'entre-nos')).rejects.toThrow('Identificador');
  });
  it('rejects overflow, stale inputs, guest controls and forged identities; reserves the last seat once', async () => {
    const { s, code, send } = await room(5);
    const attempts = await Promise.allSettled(['p5','p6'].map(token => Promise.resolve().then(() => s.join(code, token, token))));
    expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(1);
    const before = s.view(code, 'p0');
    await expect(send('start', undefined, 'p1')).rejects.toThrow();
    await send('start');
    await expect(s.action(code, 'forged', command(before, 'answer', 50))).rejects.toThrow();
    for (const value of [-1,101,0.5,NaN]) await expect(send('answer', value)).rejects.toThrow('Resposta inválida');
    const valid = command(s.view(code, 'p0'), 'answer', 20);
    await s.action(code, 'p0', valid);
    await s.action(code, 'p0', valid);
    await expect(s.action(code, 'p0', { ...valid, value: 80 })).rejects.toThrow('Identificador');
    await expect(send('answer', 80)).rejects.toThrow('disponível');
    for (let i = 1; i < 6; i++) await send('answer', 50, `p${i}`);
    await expect(send('answer', 50, 'p1')).rejects.toThrow('disponível');
    await send('reveal'); await send('next');
    await expect(s.action(code, 'p0', { ...valid, id: 'old-round-new-id' })).rejects.toThrow('avançou');
  });
});
