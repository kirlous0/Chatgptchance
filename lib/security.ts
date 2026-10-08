import crypto from 'node:crypto'

function sessionSecret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters')
  return value
}

export function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function secureCompare(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb)
}

export function hmacSha256(secret: string, value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

function deriveKey() {
  return crypto.createHash('sha256').update(sessionSecret()).digest()
}

export function encryptSecret(plainText: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptSecret(payload: string) {
  const [ivPart, tagPart, encryptedPart] = payload.split('.')
  if (!ivPart || !tagPart || !encryptedPart) throw new Error('Invalid encrypted secret')
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64url')), decipher.final()]).toString('utf8')
}

export function signState(value: string) {
  return `${value}.${hmacSha256(sessionSecret(), value)}`
}

export function verifyState(signedValue: string) {
  const index = signedValue.lastIndexOf('.')
  if (index < 1) return null
  const value = signedValue.slice(0, index)
  const signature = signedValue.slice(index + 1)
  return secureCompare(hmacSha256(sessionSecret(), value), signature) ? value : null
}

export function signOAuthState(userId: string) {
  const payload = JSON.stringify({ userId, nonce: randomToken(24), issuedAt: Date.now() })
  return signState(payload)
}

export function verifyOAuthState(signedValue: string, expectedUserId: string) {
  const raw = verifyState(signedValue)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { userId?: string; nonce?: string; issuedAt?: number }
    if (parsed.userId !== expectedUserId || typeof parsed.nonce !== 'string' || typeof parsed.issuedAt !== 'number') return null
    if (Math.abs(Date.now() - parsed.issuedAt) > 10 * 60 * 1000) return null
    return parsed.nonce
  } catch {
    return null
  }
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}
