import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSigningKey, generateSigningKeyJwk, type SigningKey } from '@rolloutit/lti-platform'

// Gitignored. Delete the file to get a new key (and with it a new kid).
const KEY_FILE = fileURLToPath(new URL('../keys/private.jwk.json', import.meta.url))

/**
 * Loads the signing key from KEY_FILE, generating and saving one on the first start. File handling
 * is the host's job, the library only deals with the JWK.
 */
export async function loadSigningKey(): Promise<SigningKey> {
  let json: string
  try {
    json = await readFile(KEY_FILE, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err

    json = `${JSON.stringify(await generateSigningKeyJwk(), null, 2)}\n`
    await mkdir(dirname(KEY_FILE), { recursive: true, mode: 0o700 })
    // Owner-only: the file holds the private key.
    await writeFile(KEY_FILE, json, { mode: 0o600 })
    console.log(`Generated a new signing key in ${KEY_FILE}`)
  }

  return createSigningKey(JSON.parse(json))
}
