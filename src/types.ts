import type { CryptoKey } from "jose";

export type SigningKey = {
  kid: string;
  n: string;
  e: string;
  privateKey: CryptoKey;
};
