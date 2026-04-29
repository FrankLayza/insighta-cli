import crypto from "crypto";

export function generateCodeVerifier(length = 64): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
