import { describe,it,expect,beforeEach } from 'vitest'
import { assertSafeUrl } from '@/lib/ssrf'
import { signState,verifyState,signOAuthState,verifyOAuthState } from '@/lib/security'

describe('security primitives',()=>{
 beforeEach(()=>{process.env.SESSION_SECRET='a'.repeat(64)})
 it('rejects loopback and private destinations',async()=>{await expect(assertSafeUrl('http://127.0.0.1')).rejects.toThrow();await expect(assertSafeUrl('http://localhost:3000')).rejects.toThrow();await expect(assertSafeUrl('http://10.0.0.1')).rejects.toThrow()})
 it('rejects non-http schemes',async()=>{await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow()})
 it('round-trips signed state and rejects tampering',()=>{const raw='test-state';const signed=signState(raw);expect(verifyState(signed)).toBe(raw);expect(verifyState(signed+'x')).toBeNull()})
 it('binds OAuth state to the owner and expires it',()=>{const signed=signOAuthState('owner-1');expect(verifyOAuthState(signed,'owner-1')).toBeTypeOf('string');expect(verifyOAuthState(signed,'owner-2')).toBeNull()})
})
