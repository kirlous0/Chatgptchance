import { describe,it,expect } from 'vitest'
import { validateAIProject } from '@/lib/ai/validate'

describe('AI anti-hallucination validation',()=>{
 it('drops unknown technologies and unsupported features',()=>{const out=validateAIProject({title:'Test',shortDescription:null,longDescription:null,category:null,technologies:['Next.js','MadeUp'],features:['Responsive interface','Made up feature'],year:null,projectType:null,presentationType:'LARGE_EDITORIAL',featured:false,qualityScore:80,confidence:0.9,claims:[{claim:'Built with Next.js',evidenceIds:['e1'],confidence:0.99}]},new Set(['e1']));expect(out.technologies).toEqual(['Next.js']);expect(out.features).toEqual(['Responsive interface'])})
 it('removes claims with unknown evidence ids',()=>{const out=validateAIProject({title:'Test',shortDescription:null,longDescription:null,category:null,technologies:[],features:[],year:null,projectType:null,presentationType:'LARGE_EDITORIAL',featured:false,qualityScore:50,confidence:0.5,claims:[{claim:'x',evidenceIds:['bad'],confidence:1}]},new Set(['good']));expect(out.claims).toHaveLength(0);expect(out.confidence).toBeLessThanOrEqual(0.35)})
})
