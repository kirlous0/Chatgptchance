import { z } from 'zod'

export const PresentationTypeSchema = z.enum(['LARGE_EDITORIAL','SPLIT_EDITORIAL','FULL_WIDTH','BROWSER_PREVIEW','DEVICE_SHOWCASE','GALLERY','CASE_STUDY'])
export const AIClaimSchema = z.object({ claim: z.string().min(1).max(300), evidenceIds: z.array(z.string().min(1)).min(1).max(8), confidence: z.number().min(0).max(1) })
export const AIProjectSchema = z.object({
  title: z.string().min(1).max(100),
  shortDescription: z.string().max(220).nullable(),
  longDescription: z.string().max(900).nullable(),
  category: z.string().max(80).nullable(),
  technologies: z.array(z.string().max(60)).max(20),
  features: z.array(z.string().max(100)).max(20),
  year: z.number().int().min(2000).max(2100).nullable(),
  projectType: z.string().max(80).nullable(),
  presentationType: PresentationTypeSchema,
  featured: z.boolean(),
  qualityScore: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  claims: z.array(AIClaimSchema).max(30),
})

export const AIVisionSchema = z.object({
  rankings: z.array(z.object({ screenshotId:z.string().uuid(), score:z.number().int().min(0).max(100), reason:z.string().min(1).max(300), recommended:z.boolean() })).max(20),
})

export type AIProject = z.infer<typeof AIProjectSchema>
export type AIVision = z.infer<typeof AIVisionSchema>

export const AI_PROJECT_JSON_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title','shortDescription','longDescription','category','technologies','features','year','projectType','presentationType','featured','qualityScore','confidence','claims'],
  properties: {
    title:{type:'string'}, shortDescription:{type:['string','null']}, longDescription:{type:['string','null']}, category:{type:['string','null']},
    technologies:{type:'array',items:{type:'string'}}, features:{type:'array',items:{type:'string'}}, year:{type:['integer','null']}, projectType:{type:['string','null']},
    presentationType:{type:'string',enum:PresentationTypeSchema.options}, featured:{type:'boolean'}, qualityScore:{type:'integer'}, confidence:{type:'number'},
    claims:{type:'array',items:{type:'object',additionalProperties:false,required:['claim','evidenceIds','confidence'],properties:{claim:{type:'string'},evidenceIds:{type:'array',items:{type:'string'}},confidence:{type:'number'}}}},
  },
}

export const AI_VISION_JSON_SCHEMA = {
  type:'object', additionalProperties:false, required:['rankings'], properties:{ rankings:{ type:'array', items:{ type:'object', additionalProperties:false, required:['screenshotId','score','reason','recommended'], properties:{screenshotId:{type:'string'},score:{type:'integer'},reason:{type:'string'},recommended:{type:'boolean'}} } } },
}
