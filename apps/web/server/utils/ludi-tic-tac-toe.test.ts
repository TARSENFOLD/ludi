import { it, expect } from 'vitest';
import { LudiRoomService } from './ludi-rooms';
it('plays through the Doot room authority and reconnects with the same identity and board', async () => {
  const rooms = new LudiRoomService();
  try {
    const first = await rooms.create('alice', 'Ana', 'create-000', 'test', 'jogo-da-velha'); const code = first.code!;
    const second = rooms.join(code, 'bob', 'Bia');
    await rooms.action(code, 'alice', { id: 'start-000', type: 'start', match: 1, round: 0 });
    let sequence = 0;
    for (const [i, choice] of [0,3,1,4,2].entries()) {
      await rooms.action(code, i % 2 ? 'bob' : 'alice', { id: `answer-${sequence++}`, type: 'answer', match: 1, round: 0, stage: String(i), choice });
    }
    const resumed = rooms.join(code, 'bob', 'Ignored');
    expect(resumed.context.participantId).toBe(second.context.participantId); expect(resumed.ticTacToe?.outcome).toBe('X'); expect(resumed.phase).toBe('results');
    const snapshots: unknown[] = []; const off = rooms.subscribe(code, 'bob', v => snapshots.push(v.ticTacToe?.board), () => {});
    expect(snapshots).toHaveLength(1); off();
    await rooms.action(code, 'alice', { id: 'replay-00', type: 'replay', match: 1, round: 0 });
    expect(rooms.view(code, 'bob').match).toBe(2); expect(rooms.view(code, 'bob').scores?.[0].score).toBe(1);
    rooms.expire(code); expect(() => rooms.view(code, 'bob')).toThrow();
  } finally { rooms.dispose(); }
});
