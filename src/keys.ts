import {
  generateKeyPair,
  exportJWK,
  type JWK,
  calculateJwkThumbprint,
  importJWK,
} from "jose";
import type { SigningKey } from "./types.js";

export const generateSigningKeyJwk = async (): Promise<JWK> => {
  const { privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });

  return exportJWK(privateKey);
};

export const createSigningKey = async (jwk: JWK): Promise<SigningKey> => {
  if (jwk.kty !== "RSA") {
    throw new Error("Key type must be RSA");
  }

  if (!jwk.d || !jwk.n || !jwk.e) {
    throw new Error("Key must have a private part, n, and e");
  }

  const kid = await calculateJwkThumbprint(jwk, "sha256");
  const privateKey = await importJWK({ ...jwk, kty: "RSA" as const }, "RS256");

  return { kid, n: jwk.n, e: jwk.e, privateKey };
};

export const toJwks = (keys: SigningKey[]) => {
  return {
    keys: keys.map((key) => ({
      kid: key.kid,
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: key.n,
      e: key.e,
    })),
  };
};
