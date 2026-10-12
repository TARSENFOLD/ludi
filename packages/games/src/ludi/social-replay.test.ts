import {describe,it,expect} from 'vitest'
import {createSocialComposer} from './social-session.server'
import {socialQuestions} from './content/entre-nos-social.server'
import type {SessionRelationship} from './contracts'
const environment=(initial=4)=>{let seed=initial;return {now:()=>10,random:()=>((seed=(seed*1664525+1013904223)>>>0)/2**32)}}
const roster=(n:number)=>Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Pessoa ${i}`}))
describe('Entre Nós replay selection',()=>{
 it.each([2,3,6].flatMap(count=>(['strangers','friends','couple','group','close','random'] as SessionRelationship[]).map(context=>({count,context}))))('simulates 30 matches with $count people, $context: avoids premature repetition',({count,context})=>{
  const players=roster(count),compose=createSocialComposer(environment()),game=compose({context,mode:'entre-nos'},players,[]),seen=new Set<string>(),routes=new Set<string>()
  for(let match=0;match<30;match++) {
   const rounds=match===0?game.rounds:game.nextRounds!('replay'),ids:string[]=[],types:string[]=[]
   for(const r of rounds){const c=r.publicContent();if(!('officialId' in c)||!c.officialId)throw Error('missing official ID');const q=socialQuestions.find(q=>q.id===c.officialId)!;ids.push(q.id);types.push(q.type)
    if(seen.has(q.id))expect(socialQuestions.filter(other=>other.type===q.type&&other.minPlayers<=count&&other.contexts.includes(context)&&other.sensitivity!=='moderate').every(other=>seen.has(other.id))).toBe(true)
    seen.add(q.id)
   }
   expect(new Set(ids).size).toBe(10);expect(types.every((kind,i)=>i===0||kind!==types[i-1])).toBe(true);routes.add(types.join(','))
  }
  expect(routes.size).toBeGreaterThan(20);expect(seen.size).toBeGreaterThan(count===2?130:140)
 })
 it('honours previous-browser IDs as preferences while preserving eligibility and determinism',()=>{
  const trace=(previous:string[]=[])=>{const game=createSocialComposer(environment(),()=>previous)({context:'strangers',mode:'entre-nos'},roster(2),[]);return game.rounds.map(r=>r.publicContent()).map(c=>'officialId'in c?c.officialId!:'')}
  const first=trace(),second=trace(first);expect(trace(first)).toEqual(second);expect(second.some(id=>first.includes(id))).toBe(false)
  expect(second.every(id=>{const q=socialQuestions.find(q=>q.id===id)!;return q.contexts.includes('strangers')&&q.minPlayers<=2})).toBe(true)
 })
 it.each(['strangers','friends','couple','group','close','random'] as SessionRelationship[])('retains ten varied, bounded moments for %s',context=>{
  const game=createSocialComposer(environment())({context,mode:'entre-nos'},roster(6),[]),questions=game.rounds.map(r=>{const c=r.publicContent();return socialQuestions.find(q=>'officialId'in c&&q.id===c.officialId)!})
  expect(questions.filter(q=>q.sensitivity==='moderate').length).toBeLessThanOrEqual(2);expect(new Set(questions.flatMap(q=>q.tags)).size).toBeGreaterThanOrEqual(5)
 })
})
