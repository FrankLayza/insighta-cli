import { getCredentials, isTokenExpired } from "./config.js";
import { refreshToken } from "./auth.js";

const BACKEND_URL = process.env.INSIGHTA_BACKEND_URL || "http://localhost:3110";

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Auto-refresh if expired
  if (isTokenExpired()) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      throw new Error("Session expired. Please run: insighta login");
    }
  }

  const creds = getCredentials();
  if (!creds) throw new Error("Not authenticated. Run: insighta login");

  return {
    Authorization: `Bearer ${creds.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function listProfiles(params: Record<string, string> = {}): Promise<any> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${BACKEND_URL}/api/v1/profiles?${query}`, { headers });
  return response.json();
}

export async function getProfile(id: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BACKEND_URL}/api/v1/profiles/${id}`, { headers });
  return response.json();
}

export async function deleteProfile(id: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BACKEND_URL}/api/v1/profiles/${id}`, {
    method: "DELETE",
    headers,
  });
  return response.json();
}

export async function searchProfiles(query: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${BACKEND_URL}/api/v1/profiles/search?q=${encodeURIComponent(query)}`,
    { headers }
  );
  return response.json();
}

export async function exportProfiles(): Promise<string> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BACKEND_URL}/api/v1/profiles/export`, { headers });
  if (!response.ok) throw new Error("Export failed");
  return response.text();
}

export async function whoami(): Promise<any> {
  const creds = getCredentials();
  return creds?.user || null;
}
