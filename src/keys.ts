import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  importJWK,
  type CryptoKey,
  type JWK,
} from 'jose'

export type SigningKey = {
  privateKey: CryptoKey
  publicJwk: JWK
  kid: string
  alg: 'RS256'
}

/**
 * Loads the platform's signing key from a private RSA JWK.
 *
 * The `kid` is the RFC 7638 thumbprint of the public key, so a new key always gets a new `kid`.
 * Tools cache the JWKS (ltijs for 5 minutes) and only refetch it for an unknown `kid`.
 *
 * Unlike the request handlers this throws: the key is loaded once at startup, and a bad key is a
 * configuration error the host should fail on.
 */
export async function createSigningKey(privateJwk: JWK): Promise<SigningKey> {
  const { kty, n, e, d } = privateJwk
  if (kty !== 'RSA' || !n || !e) {
    throw new Error('Signing key must be an RSA JWK')
  }
  if (!d) {
    throw new Error('Signing key JWK has no private part')
  }

  const privateKey = await importJWK({ ...privateJwk, kty: 'RSA' as const }, 'RS256')

  // Copy only the public members we know about, so a private member can't end up in the JWKS.
  const publicJwk: JWK = { kty, n, e }
  const kid = await calculateJwkThumbprint(publicJwk, 'sha256')

  return { privateKey, publicJwk, kid, alg: 'RS256' }
}

/** Generates a new private RSA JWK. The host is responsible for storing it. */
export async function generateSigningKeyJwk(): Promise<JWK> {
  const { privateKey } = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true })
  return exportJWK(privateKey)
}
