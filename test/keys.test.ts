import { expect, test } from "vitest";
import { generateSigningKeyJwk, createSigningKey } from "../src/index.js";
import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";

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
