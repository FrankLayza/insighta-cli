import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".insighta");
const CRED_FILE = path.join(CONFIG_DIR, "credentials.json");

interface Credentials {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    role: "ADMIN" | "ANALYST";
  };
  expires_at?: number; // Unix timestamp
}

export function getCredentials(): Credentials | null {
  try {
    if (!fs.existsSync(CRED_FILE)) return null;
    const raw = fs.readFileSync(CRED_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2));
}

export function clearCredentials(): void {
  if (fs.existsSync(CRED_FILE)) {
    fs.unlinkSync(CRED_FILE);
  }
}

export function isTokenExpired(): boolean {
  const creds = getCredentials();
  if (!creds?.expires_at) return true;
  return Date.now() > creds.expires_at;
}
