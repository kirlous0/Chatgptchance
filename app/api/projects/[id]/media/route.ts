import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { audit } from '@/lib/audit'
import { ok, fail, routeError } from '@/lib/api'
export const runtime='nodejs'
export const maxDuration=30
const ALLOWED=new Set(['image/png','image/jpeg','image/webp','image/gif'])
function matchesImageSignature(type:string, bytes:Buffer){
  if(type==='image/png') return bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  if(type==='image/jpeg') return bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
  if(type==='image/gif') return bytes.subarray(0,6).toString('ascii')==='GIF87a' || bytes.subarray(0,6).toString('ascii')==='GIF89a'
  if(type==='image/webp') return bytes.length>=12 && bytes.subarray(0,4).toString('ascii')==='RIFF' && bytes.subarray(8,12).toString('ascii')==='WEBP'
  return false
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await assertOwnerApi();const {id}=await params;const form=await request.formData();const file=form.get('file');const kind=String(form.get('kind')??'gallery');if(!(file instanceof File))return fail('Image file is required',422,'VALIDATION_ERROR');if(!ALLOWED.has(file.type))return fail('Only PNG, JPEG, WEBP and GIF images are allowed.',422,'UNSUPPORTED_MEDIA');if(file.size>5*1024*1024)return fail('Maximum image size is 5 MB.',413,'FILE_TOO_LARGE');const bytes=Buffer.from(await file.arrayBuffer());if(!matchesImageSignature(file.type,bytes))return fail('The uploaded file does not match its declared image type.',422,'INVALID_IMAGE_CONTENT');if(!['gallery','screenshot'].includes(kind))return fail('Invalid media kind',422,'VALIDATION_ERROR');const ext=(file.type.split('/')[1]??'png').replace('jpeg','jpg');const path=`uploads/${id}/${crypto.randomUUID()}.${ext}`;const db=createAdminClient();const upload=await db.storage.from('portfolio-media').upload(path,bytes,{contentType:file.type,upsert:false});if(upload.error)throw upload.error;if(kind==='gallery'){const {data,error}=await db.from('project_gallery').insert({project_id:id,storage_path:path,alt_text:String(form.get('alt')??'')||null,caption:String(form.get('caption')??'')||null,sort_order:0}).select('*').single();if(error)throw error;await audit('media.gallery.added','project',id,{path},user.id);return ok(data,201)}const {data:shot,error}=await db.from('project_screenshots').insert({project_id:id,fingerprint:`manual:${crypto.randomUUID()}`,viewport_width:0,viewport_height:0,route:'/',url:'manual-upload',storage_path:path,status:'ready',quality_score:100,metadata:{source:'manual_upload'},captured_at:new Date().toISOString()}).select('*').single();if(error)throw error;await db.from('projects').update({hero_screenshot_id:shot.id,updated_at:new Date().toISOString()}).eq('id',id);await audit('media.screenshot.replaced','project',id,{screenshotId:shot.id},user.id);return ok(shot,201)}catch(e){return routeError(e)}}
