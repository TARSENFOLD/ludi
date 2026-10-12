import {describe,it,expect} from 'vitest'
import {seenQuestionIds,rememberQuestion,clearQuestionHistory,QUESTION_HISTORY_TTL} from './ludi-question-history'
import type {LudiView} from '@doot-games/games/ludi/contracts'
const storage=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)},removeItem:(k:string)=>{m.delete(k)},m}}
const view=(id:string)=>({phase:'active',content:{officialId:id},ownText:'PRIVATE',players:[{name:'PRIVATE'}]} as LudiView)
describe('browser question history',()=>{
 it('stores only official IDs with timestamps, expires at 30 days and can be cleared',()=>{
  const s=storage(),now=QUESTION_HISTORY_TTL*2
  rememberQuestion(view('en-choice-001'),s,now);rememberQuestion(view('en-story-003'),s,now+1);rememberQuestion(view('custom-private'),s,now+2)
  expect(seenQuestionIds(s,now+2)).toEqual(['en-choice-001','en-story-003']);expect([...s.m.values()].join('')).not.toContain('PRIVATE')
  expect(seenQuestionIds(s,now+QUESTION_HISTORY_TTL)).toEqual(['en-story-003']);clearQuestionHistory(s);expect(seenQuestionIds(s,now+2)).toEqual([])
 })
 it('tolerates unavailable, corrupt and malicious storage and bounds entries',()=>{
  const s=storage();s.setItem('ludi:official-questions:v1','bad json');expect(seenQuestionIds(s,1000)).toEqual([])
  s.setItem('ludi:official-questions:v1',JSON.stringify({version:1,entries:[['en-choice-001',Infinity],['en-choice-002',2000],['not-official',500],['en-story-001',500]]}));expect(seenQuestionIds(s,1000)).toEqual(['en-story-001'])
  const fail={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}}
  expect(()=>rememberQuestion(view('en-choice-001'),fail,1000)).not.toThrow();expect(seenQuestionIds(fail,1000)).toEqual([])
  for(let i=0;i<230;i++)rememberQuestion(view(`en-choice-${String(i).padStart(3,'0')}`),s,1000+i)
  expect(seenQuestionIds(s,1300)).toHaveLength(200)
 })
})
