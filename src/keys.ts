import {
  generateKeyPair,
  exportJWK,
  type JWK,
  calculateJwkThumbprint,
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

  if (!jwk.d) {
    throw new Error("Key must have a private part");
  }

  const kid = await calculateJwkThumbprint(jwk, "sha256");

  return { kid };
};
