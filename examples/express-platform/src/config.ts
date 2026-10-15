import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}

export const PORT = 4000

// Always localhost, never 127.0.0.1: the issuer, the cookie's host and the URLs registered in the
// tool have to match, and the browser treats the two as different sites.
export const ISSUER = `http://localhost:${PORT}`

// The tool has to register the platform with the same client_id.
export const CLIENT_ID = 'ltijs-demo'

// Sessions live in memory, so a new secret on every start loses nothing.
export const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('base64url')

// The ltijs demo runs behind a tunnel whose address changes on every restart. Everything the
// platform knows about the tool is derived from this one value.
const TOOL_URL = requireEnv('TOOL_URL').replace(/\/+$/, '')

export const tool = {
  clientId: CLIENT_ID,
  deploymentIds: ['1'],
  oidcLoginInitiationUrl: `${TOOL_URL}/lti/login`,
  targetLinkUri: `${TOOL_URL}/lti/launch`,
  redirectUris: [`${TOOL_URL}/lti/launch`],
  // Not used by the PoC, but part of the registration.
  jwksUrl: `${TOOL_URL}/lti/keys`,
}
