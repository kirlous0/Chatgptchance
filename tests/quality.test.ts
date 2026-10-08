import { describe,it,expect } from 'vitest'
import { qualityGate } from '@/screenshot-worker/src/quality'
describe('screenshot quality gate',()=>{it('rejects server errors',()=>{const q=qualityGate({httpStatus:500,title:'Internal Server Error',bodyText:'error',brokenImages:0});expect(q.accepted).toBe(false);expect(q.score).toBe(0)});it('accepts a normal rendered page',()=>{const q=qualityGate({httpStatus:200,title:'Portfolio',bodyText:'A polished digital product with case study and details.',brokenImages:0});expect(q.accepted).toBe(true)})})
