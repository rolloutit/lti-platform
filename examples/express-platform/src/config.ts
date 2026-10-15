export const PORT = 4000

// Always localhost, never 127.0.0.1: the issuer, the cookie's host and the URLs registered in the
// tool have to match, and the browser treats the two as different sites.
export const ISSUER = `http://localhost:${PORT}`

// The tool has to register the platform with the same client_id.
export const CLIENT_ID = 'ltijs-demo'
