import { calculateJwkThumbprint, createLocalJWKSet, jwtVerify, SignJWT, type JWK } from 'jose'
import { beforeAll, describe, expect, test } from 'vitest'
import { createSigningKey, generateSigningKeyJwk, toJwks, type SigningKey } from '../src/index.js'

let privateJwk: JWK
let key: SigningKey

beforeAll(async () => {
  privateJwk = await generateSigningKeyJwk()
  key = await createSigningKey(privateJwk)
})

describe('toJwks', () => {
  test('publishes the public key with kid, alg and use', () => {
    const [jwk] = toJwks([key]).keys

    expect(jwk).toEqual({
      kty: 'RSA',
      n: privateJwk.n,
      e: privateJwk.e,
      kid: key.kid,
      alg: 'RS256',
      use: 'sig',
    })
  })

  test('leaves out the private parameters', () => {
    const [jwk] = toJwks([key]).keys

    for (const param of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
      expect(privateJwk).toHaveProperty(param)
      expect(jwk).not.toHaveProperty(param)
    }
  })

  test('JWKS verifies a token signed with the key', async () => {
    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: key.alg, typ: 'JWT', kid: key.kid })
      .setIssuer('http://localhost:4000')
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(key.privateKey)

    const { payload, protectedHeader } = await jwtVerify(token, createLocalJWKSet(toJwks([key])), {
      issuer: 'http://localhost:4000',
    })

    expect(protectedHeader.kid).toBe(key.kid)
    expect(payload.sub).toBe('user-1')
  })
})

describe('createSigningKey', () => {
  test('kid is the RFC 7638 thumbprint of the key', async () => {
    expect(key.kid).toBe(await calculateJwkThumbprint(privateJwk, 'sha256'))
  })

  test('kid is stable when the same key is loaded again', async () => {
    const again = await createSigningKey(structuredClone(privateJwk))
    expect(again.kid).toBe(key.kid)
  })

  test('different keys get different kids', async () => {
    const other = await createSigningKey(await generateSigningKeyJwk())
    expect(other.kid).not.toBe(key.kid)
  })

  test('rejects a non-RSA key', async () => {
    await expect(
      createSigningKey({ kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' }),
    ).rejects.toThrow('RSA')
  })

  test('rejects a public-only key', async () => {
    await expect(createSigningKey(key.publicJwk)).rejects.toThrow('private')
  })
})
