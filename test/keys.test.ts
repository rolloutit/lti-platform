import { expect, test } from "vitest";
import {
  generateSigningKeyJwk,
  createSigningKey,
  toJwks,
} from "../src/index.js";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
  jwtVerify,
  createLocalJWKSet,
} from "jose";

test("generates a private RSA JWK", async () => {
  const jwk = await generateSigningKeyJwk();

  expect(jwk.kty).toBe("RSA");
  // Only private keys have a "d" property
  expect(jwk).toHaveProperty("d");
});

test("key id comes from the key itself", async () => {
  const jwk = await generateSigningKeyJwk();
  const key = await createSigningKey(jwk);

  expect(key.kid).toBe(await calculateJwkThumbprint(jwk, "sha256"));
});

test("rejects a non-RSA key", async () => {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(privateKey);

  await expect(createSigningKey(jwk)).rejects.toThrow("RSA");
});

test("rejects a key without a private part", async () => {
  const { publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);

  await expect(createSigningKey(jwk)).rejects.toThrow("private");
});

test("jwks contains the public key", async () => {
  const jwk = await generateSigningKeyJwk();
  const key = await createSigningKey(jwk);

  const jwks = toJwks([key]);

  expect(jwks.keys[0]).toEqual({
    kty: "RSA",
    n: jwk.n,
    e: jwk.e,
    kid: key.kid,
    alg: "RS256",
    use: "sig",
  });
});

test("jwks leaves out the private parts", async () => {
  const jwk = await generateSigningKeyJwk();
  const key = await createSigningKey(jwk);

  const jwks = toJwks([key]);
  const publicKey = jwks.keys[0];

  expect(publicKey).not.toHaveProperty("d");
  expect(publicKey).not.toHaveProperty("p");
  expect(publicKey).not.toHaveProperty("q");
  expect(publicKey).not.toHaveProperty("dp");
  expect(publicKey).not.toHaveProperty("dq");
  expect(publicKey).not.toHaveProperty("qi");
});

test("a token signed with the key can be verified with the jwks", async () => {
  const jwk = await generateSigningKeyJwk();
  const key = await createSigningKey(jwk);

  // sign
  const jwt = await new SignJWT({ sub: "1234" })
    .setProtectedHeader({ alg: "RS256", kid: key.kid })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key.privateKey);

  // verify
  const { payload, protectedHeader } = await jwtVerify(
    jwt,
    createLocalJWKSet(toJwks([key])),
  );
  expect(payload.sub).toBe("1234");
  expect(protectedHeader.kid).toBe(key.kid);
});
