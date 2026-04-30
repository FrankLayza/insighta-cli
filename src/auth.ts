import http from "http";
import open from "open";
import chalk from "chalk";
import { saveCredentials, getCredentials } from "./config.js";

const BACKEND_URL = process.env.INSIGHTA_BACKEND_URL || "http://localhost:3110";
const CLI_PORT = 9876;
const REDIRECT_URI = `http://localhost:${CLI_PORT}/callback`;

export async function login(): Promise<void> {
  // 1. Get the GitHub auth URL from the backend
  const urlResponse = await fetch(
    `${BACKEND_URL}/api/v1/auth/github/url?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
  );
  const { data } = await urlResponse.json() as any;
  const authUrl = data.url;

  // 2. Start temporary callback server
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${CLI_PORT}`);
      
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        
        if (!code) {
          res.writeHead(400);
          res.end("Missing authorization code");
          server.close();
          reject(new Error("No code received"));
          return;
        }

        try {
          // 3. Exchange code + state with backend
          const tokenResponse = await fetch(`${BACKEND_URL}/api/v1/auth/github/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              state,
              redirect_uri: REDIRECT_URI,
            }),
          });

          const result = await tokenResponse.json() as any;

          if (!tokenResponse.ok) {
            throw new Error(result.message || "Token exchange failed");
          }

          // 4. Save credentials
          const { access_token, refresh_token, user } = result.data;
          saveCredentials({
            access_token,
            refresh_token,
            user,
            expires_at: Date.now() + 15 * 60 * 1000, // 15 min
          });

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family:system-ui;text-align:center;padding:60px">
              <h1>✓ Logged in as ${user.name}</h1>
              <p>Role: ${user.role}</p>
              <p>You can close this tab and return to the terminal.</p>
            </body></html>
          `);
        } catch (err: any) {
          res.writeHead(500);
          res.end(`Login failed: ${err.message}`);
          reject(err);
        } finally {
          server.close();
          resolve();
        }
      }
    });

    server.listen(CLI_PORT, () => {
      console.log(`\nOpening browser for GitHub login...`);
      console.log(chalk.dim(`If the browser doesn't open, click this link:\n${authUrl}\n`));
      open(authUrl);
    });

    // Auto-close after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Login timed out"));
    }, 120_000);
  });
}

export async function refreshToken(): Promise<boolean> {
  const creds = getCredentials();
  if (!creds?.refresh_token) return false;

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refresh_token }),
    });

    if (!response.ok) return false;

    const result = await response.json() as any;
    saveCredentials({
      ...creds,
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token || creds.refresh_token,
      expires_at: Date.now() + 15 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}
