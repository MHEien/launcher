/**
 * GitHub App Integration Library
 * 
 * Handles JWT generation, installation tokens, and webhook verification
 * for the GitHub App that manages plugin builds.
 */

import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "crypto";

// Environment variables
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Check if GitHub App is configured
 */
export function isGitHubAppConfigured(): boolean {
  return !!(GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY);
}

/**
 * Generate a JWT for authenticating as the GitHub App
 * JWTs are valid for up to 10 minutes
 */
export function generateAppJWT(): string {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App credentials not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.");
  }

  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iat: now - 60, // Issued 60 seconds ago to account for clock drift
    exp: now + (10 * 60), // Expires in 10 minutes
    iss: GITHUB_APP_ID,
  };

  return jwt.sign(payload, GITHUB_APP_PRIVATE_KEY, { algorithm: "RS256" });
}

/**
 * Get an installation access token for a specific installation
 * These tokens are valid for 1 hour
 */
export async function getInstallationToken(installationId: number): Promise<{
  token: string;
  expiresAt: string;
}> {
  const appJwt = generateAppJWT();

  const response = await fetch(
    `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

/**
 * Verify a GitHub webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const hmac = createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * GitHub App installation info
 */
export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    type: "User" | "Organization";
  };
  repositorySelection: "all" | "selected";
  permissions: Record<string, string>;
  events: string[];
}

/**
 * Get all installations of the GitHub App
 */
export async function getAppInstallations(): Promise<GitHubInstallation[]> {
  const appJwt = generateAppJWT();

  const response = await fetch(`${GITHUB_API_BASE}/app/installations`, {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installations: ${response.status} - ${error}`);
  }

  const installations = await response.json();
  return installations.map((inst: Record<string, unknown>) => ({
    id: inst.id as number,
    account: inst.account as GitHubInstallation["account"],
    repositorySelection: inst.repository_selection as "all" | "selected",
    permissions: inst.permissions as Record<string, string>,
    events: inst.events as string[],
  }));
}

/**
 * Find the installation that has access to a specific repository
 */
export async function getInstallationForRepo(
  owner: string,
  repo: string
): Promise<GitHubInstallation | null> {
  const appJwt = generateAppJWT();

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (response.status === 404) {
    return null; // App not installed on this repo
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get repo installation: ${response.status} - ${error}`);
  }

  const inst = await response.json();
  return {
    id: inst.id,
    account: inst.account,
    repositorySelection: inst.repository_selection,
    permissions: inst.permissions,
    events: inst.events,
  };
}

/**
 * Get the repositories accessible to an installation
 */
export async function getInstallationRepositories(installationId: number): Promise<{
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}[]> {
  const { token } = await getInstallationToken(installationId);

  const response = await fetch(`${GITHUB_API_BASE}/installation/repositories`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation repos: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.repositories.map((repo: Record<string, unknown>) => ({
    id: repo.id as number,
    name: repo.name as string,
    fullName: repo.full_name as string,
    private: repo.private as boolean,
    defaultBranch: repo.default_branch as string,
  }));
}

/**
 * Get the latest release for a repository using installation token
 */
export async function getLatestRelease(
  installationId: number,
  owner: string,
  repo: string
): Promise<{
  id: number;
  tagName: string;
  name: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  tarballUrl: string;
  publishedAt: string;
} | null> {
  const { token } = await getInstallationToken(installationId);

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/latest`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (response.status === 404) {
    return null; // No releases
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get latest release: ${response.status} - ${error}`);
  }

  const release = await response.json();
  return {
    id: release.id,
    tagName: release.tag_name,
    name: release.name,
    body: release.body,
    draft: release.draft,
    prerelease: release.prerelease,
    tarballUrl: release.tarball_url,
    publishedAt: release.published_at,
  };
}

/**
 * Download a file from GitHub using installation token
 */
export async function downloadWithInstallationToken(
  installationId: number,
  url: string
): Promise<Response> {
  const { token } = await getInstallationToken(installationId);

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/octet-stream",
      "User-Agent": "Launcher-Build-Service/1.0",
    },
  });
}

/**
 * Get the GitHub App's public page URL for installation
 */
export function getAppInstallUrl(state?: string): string {
  // The app slug is derived from the app name (lowercase, hyphens)
  // This should be configured via environment variable
  const appSlug = process.env.GITHUB_APP_SLUG || "launcher-plugin-builder";
  const baseUrl = `https://github.com/apps/${appSlug}/installations/new`;
  
  if (state) {
    return `${baseUrl}?state=${encodeURIComponent(state)}`;
  }
  return baseUrl;
}

/**
 * Check if the GitHub App has access to a specific repository
 */
export async function checkRepoAccess(
  owner: string,
  repo: string
): Promise<{ hasAccess: boolean; installationId: number | null }> {
  try {
    const installation = await getInstallationForRepo(owner, repo);
    if (!installation) {
      return { hasAccess: false, installationId: null };
    }
    return { hasAccess: true, installationId: installation.id };
  } catch {
    return { hasAccess: false, installationId: null };
  }
}


