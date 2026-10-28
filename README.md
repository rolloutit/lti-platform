# lti-platform

Platform-side [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) library for Node.js, written in TypeScript. "Platform" is the LMS side of LTI: the course, the user and the link live there, and the platform launches an external tool and tells it who the user is.

State: Currently this is a proof of concept, the API can change and it's not ready for production yet.

## What it does

- **OIDC login initiation** (`initiateLogin`): based on the logged in user and the link it saves the launch and gives back the URL, which the browser will redirect.
- **Authorization endpoint** (`authorize`): verifies the tools request and gives back a signed `id_token`.
- **Signing keys and JWKS** (`generateSigningKeyJwk`, `createSigningKey`, `toJwks`): generating RSA keys and loads the `kid` and the public keys in JWKS form.
- **Auto submit form** (`renderAutoSubmitForm`): HTML content which gets sent in a POST to the tool as the result. The fields are escaped and without JavaScript.

## Plans

- [Deep Linking 2.0](https://www.imsglobal.org/spec/lti-dl/v2p0): the teacher picks content in the tool and the tool sends it back as links.
- Token endpoint (client credentials grant with a signed JWT client assertion) and `/.well-known/openid-configuration`.
- [Names and Role Provisioning Services](https://www.imsglobal.org/spec/lti-nrps/v2p0) and [Assignment and Grade Services](https://www.imsglobal.org/spec/lti-ags/v2p0).
- **Platform-side [Dynamic Registration](https://www.imsglobal.org/spec/lti-dr/v1p0)**, so a tool can be added with one URL instead of copying client IDs and keys by hand.
- [LTI Client Side postMessages](https://www.imsglobal.org/spec/lti-cs-pm/v0p1) platform storage (`lti_storage_target`), and launches in an iframe. Today the launch opens in a new window, because a tool's cookies and `localStorage` are partitioned or blocked in a third-party iframe.
- Database adapters, key rotation, production hardening.
- 1EdTech certification as the long-term goal.

## Install

```sh
git clone https://github.com/rolloutit/lti-platform.git
cd lti-platform
pnpm install
pnpm build
```

Example mini-LMS from the same folder:

```sh
pnpm example
```

## Usage

```ts
import {
  createPlatform,
  createSigningKey,
  renderAutoSubmitForm,
  toJwks,
} from "@rolloutit/lti-platform";

const signingKey = await createSigningKey(privateJwk);

const platform = createPlatform({
  issuer: "https://lms.example.com",
  signingKey,
  registrations: { findByClientId: async (clientId) => /* Tool */ },
  links: { findLink: async (linkId) => /* Link */ },
  users: {
    findUser: async (userId) => /* User */,
    getRoles: async (userId, contextId) => /* role URIs */,
  },
  launches: {
    save: async (record) => { /* store */ },
    consume: async (messageHint) => { /* read and delete */ },
  },
});

// GET /launch/:linkId
const login = await platform.initiateLogin({ linkId, currentUserId });

// GET or POST /lti/authorize
const result = await platform.authorize({ params, currentUserId });

// GET /.well-known/jwks.json
const jwks = toJwks([signingKey]);
```

Step by step:

1. `createSigningKey` turns a private RSA JWK into a signing key. Use `generateSigningKeyJwk` to make a new one. Save it: if the host makes a new key on every restart, the kid changes and you have to register the platform with the tool again.
2. `createPlatform` builds the platform from the issuer, the signing key and the four adapters.
3. When a user clicks an LTI link, the host calls `initiateLogin` with the link ID and the current user, then redirects to the returned URL.
4. The tool sends the browser back to the authorization endpoint. The host passes the request params and the current user to `authorize`, then sends a `form_post` result back as HTML with `renderAutoSubmitForm.`
5. The tool checks the `id_token` signature with the JWKS URL, or with the public key given at registration.

## Example

`examples/express-platform` is a mini-LMS built with Express that launches the [https://saltire.lti.app/tool](https://saltire.lti.app/tool) test tool. Everything is kept in memory, except the signing key.

1. `pnpm example` builds the library and starts the mini-LMS. On start, it prints every field saLTIre asks for.
2. In saLTIre, open the **Security Model** page, set the signature method to RS256, paste the fields and save. saLTIre keeps these settings in its own session, so launch from the same browser.
3. Open [http://localhost:4000](http://localhost:4000) log in and click the link.

## Generative AI usage

Claude Opus 5.5 via Claude Code was used in a read-only mode, it explained specifications and reviewed the code.

## License

[MIT](LICENSE)
