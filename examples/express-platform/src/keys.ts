import { createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  createSigningKey,
  generateSigningKeyJwk,
  type SigningKey,
} from "@rolloutit/lti-platform";

// Gitignored. Delete it to get a new key (and a new kid).
const KEY_DIR = new URL("../keys/", import.meta.url);
const KEY_FILE = new URL("private.jwk.json", KEY_DIR);

export const loadSigningKey = async (): Promise<SigningKey> => {
  let json: string;
  try {
    json = await readFile(KEY_FILE, "utf8");
  } catch {
    json = JSON.stringify(await generateSigningKeyJwk(), null, 2);
    await mkdir(KEY_DIR, { recursive: true });
    await writeFile(KEY_FILE, json, { mode: 0o600 });
  }
  return createSigningKey(JSON.parse(json));
};

export const publicKeyPem = (key: SigningKey) =>
  createPublicKey({
    key: { kty: "RSA", n: key.n, e: key.e },
    format: "jwk",
  }).export({ type: "spki", format: "pem" });
