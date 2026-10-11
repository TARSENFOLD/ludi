import { afterEach, describe, expect, it } from 'vitest';
import { LudiRoomService } from './ludi-rooms';
import type { LudiView, SocialMode } from '@doot-games/games/ludi/contracts';
let sequence = 0;
const key = () => `social-test-${++sequence}`;
const services: LudiRoomService[] = [];
afterEach(() => { services.splice(0).forEach(s => s.dispose()); });
async function setup(count = 2, mode: SocialMode = 'entre-nos') {
  const s = new LudiRoomService({ now: () => 1000, random: () => .27 }); services.push(s);
  const tokens = Array.from({ length: count }, (_,i) => `person-${i}`);
  const created = await s.create(tokens[0]!, 'Pessoa 0', key(), 'internal', 'entre-nos', 'social'), code = created.code!;
  for (let i = 1; i < count; i++) s.join(code,tokens[i]!,`Pessoa ${i}`);
  const view = (i = 0) => s.view(code, tokens[i]!);
  const prep = (i: number, payload: object) => s.prepare(code,tokens[i]!,{ id: key(), revision: view(i).revision, ...payload });
  const send = (i: number, type: string, extra = {}) => s.action(code,tokens[i]!,{ id: key(), match: view(i).match, round: view(i).round, type, ...extra });
  await prep(0,{ type:'advance' }); await prep(0,{ type:'context',context:'friends' }); await prep(0,{ type:'mode', mode });
  return { s, code, tokens, view, prep, send };
}
const question = (prompt = 'Só o autor conhece esta pergunta privada') => ({ id: key(), prompt, options: ['A','B','C','D'], correctIndex: 2, status:'submitted' as const });
describe('social preparation over real RoomRuntime', () => {
  it('keeps own questions private even from creator and rehydrates readiness, drafts and ownership', async () => {
    const {s,code,tokens,view,prep} = await setup();
    const q = question(); const events: LudiView[] = [];
    const close = s.subscribe(code,tokens[0]!,v=>events.push(v),()=>{});
    await prep(1,{type:'save-question',question:q});
    expect(view(1).preparation!.ownQuestions).toEqual([q]);
    expect(view().preparation!.ownQuestions).toEqual([]);
    expect(JSON.stringify(events)).not.toContain(q.prompt);
    expect(view().preparation!.progress[1]).toMatchObject({count:1,ready:false});
    await expect(prep(0,{type:'save-question',question:q})).rejects.toMatchObject({status:403});
    await expect(prep(0,{type:'delete-question',questionId:q.id})).rejects.toMatchObject({status:403});
    await prep(1,{type:'readiness',ready:true});
    await expect(prep(1,{type:'save-question',question:{...q,prompt:'Mudou'}})).rejects.toMatchObject({status:409});
    close(); expect(s.join(code,tokens[1]!, 'Outro nome').context.participantId).toBe(view(1).context.participantId);
    expect(view(1).preparation!.progress[1]!.ready).toBe(true);
    await prep(1,{type:'readiness',ready:false}); await prep(1,{type:'delete-question',questionId:q.id});
    expect(view(1).preparation!.ownQuestions).toEqual([]);
  });
  it('validates question schema, revisions, authorization and idempotent retries', async () => {
    const {s,code,tokens,view,prep} = await setup();
    for (const invalid of [{...question(),options:['A','a']},{...question(),correctIndex:9},{...question(),prompt:''},{...question(),options:['A']},{...question(),authorPlayerId:'fake'}]) await expect(prep(0,{type:'save-question',question:invalid})).rejects.toMatchObject({status:400});
    const cmd = {id:key(),revision:view(1).revision,type:'save-question',question:question()};
    const [a,b] = await Promise.all([s.prepare(code,tokens[1]!,cmd),s.prepare(code,tokens[1]!,cmd)]);
    expect(a.preparation!.ownQuestions).toHaveLength(1); expect(b.preparation!.ownQuestions).toHaveLength(1);
    await expect(s.prepare(code,tokens[1]!,{...cmd,question:question()})).rejects.toMatchObject({status:409});
    await expect(s.prepare(code,tokens[1]!,{...cmd,id:key()})).rejects.toMatchObject({status:409});
    await expect(prep(1,{type:'back'})).rejects.toMatchObject({status:403});
  });
  it('requires one submitted question per person only in custom mode; drafts do not count', async () => {
    const {prep,view,send} = await setup(2,'quem-me-conhece');
    const q = question(); await prep(0,{type:'save-question',question:{...q,status:'draft'}});
    await expect(prep(0,{type:'readiness',ready:true})).rejects.toMatchObject({status:409});
    await prep(0,{type:'save-question',question:q}); await prep(0,{type:'readiness',ready:true});
    await expect(send(0,'start')).rejects.toMatchObject({status:409});
    await prep(1,{type:'save-question',question:question('Pergunta do convidado')}); await prep(1,{type:'readiness',ready:true}); await send(0,'start');
    expect(view().totalRounds).toBe(2);
  });
  it.each([2,4,6])('plays a full social session with %i identities, private stages, continuation and replay', async count => {
    const {s,code,tokens,view,prep,send} = await setup(count);
    for (let i=0;i<count;i++) { await prep(i,{type:'save-question',question:question(`Pergunta de Pessoa ${i}`)}); await prep(i,{type:'readiness',ready:true}); }
    const roster=view().players;
    await send(0,'start');
    expect(()=>s.join(code,'late-person','Tarde')).toThrow();
    const prompts:string[]=[];
    for(let guard=0;view().phase==='active' && guard<100;guard++) {
      const current=view();
      if(!prompts.includes(current.content!.prompt)) prompts.push(current.content!.prompt);
      if(current.content!.kind==='conversation') { await send(1,'skip'); continue; }
      for(let i=0;i<count;i++) {
        const v=view(i), a=v.actions.find(a=>a.type==='answer');
        if(a) { await send(i,'answer',{choice:0,...(a.stage?{stage:a.stage}:{})}); expect(view(i).ownChoice).toBe(0); expect(view(i).reveal).toBeUndefined(); }
      }
      if(view().roundState==='locked') { await send(0,'reveal'); expect(view().reveal).toBeDefined(); }
      if(view().roundState==='reveal') await send(0,view().round===view().totalRounds-1?'finish':'next');
    }
    expect(view().phase).toBe('results'); expect(view().summary).toBeDefined(); expect(view().scores).toBeUndefined(); expect(view().history).toHaveLength(10);
    const v=view(), request={id:key(),match:v.match,round:v.round,type:'continue'};
    const [a,b]=await Promise.all([s.action(code,tokens[0]!,request),s.action(code,tokens[0]!,request)]);
    expect(a.match).toBe(2); expect(b.content).toEqual(a.content); expect(a.totalRounds).toBe(5); expect(a.players).toEqual(roster);
    expect(prompts).not.toContain(a.content!.prompt);
    expect(s.join(code,tokens[count-1]!, 'Renomeado').context.participantId).toBe(roster[count-1]!.id);
    await expect(send(0,'answer',{choice:0,match:1})).rejects.toMatchObject({status:409});
  });
  it('keeps the fixed roster on reconfiguration and carries no prior score or answer', async () => {
    const {s,code,tokens,view,prep,send} = await setup(2,'quem-me-conhece');
    for(let i=0;i<2;i++){await prep(i,{type:'save-question',question:question()});await prep(i,{type:'readiness',ready:true});}
    await send(0,'start');
    for(let r=0;r<2;r++){for(let i=0;i<2;i++)if(view(i).actions.some(a=>a.type==='answer'))await send(i,'answer',{choice:0});await send(0,'reveal');await send(0,r===1?'finish':'next');}
    const roster=view().players;
    await send(0,'replay');expect(view().match).toBe(2);expect(view().players).toEqual(roster);expect(view().ownChoice).toBeUndefined();
    for(let r=0;r<2;r++){for(let i=0;i<2;i++)if(view(i).actions.some(a=>a.type==='answer'))await send(i,'skip');await send(0,'reveal');await send(0,r===1?'finish':'next');}
    await prep(0,{type:'configure-again'});expect(view().phase).toBe('preparation');expect(view().match).toBe(3);expect(view().preparation!.ownQuestions).toHaveLength(1);
    expect(()=>s.join(code,'new-person','Nova')).toThrow();
    expect(s.join(code,tokens[1]!, 'B').players).toEqual(roster);
  });
});
