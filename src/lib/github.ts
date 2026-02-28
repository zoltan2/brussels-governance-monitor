// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * GitHub API helpers for reading/writing files via the Contents API.
 * Extracted from src/app/api/review/publish/route.ts for reuse.
 */

function getConfig(): { token: string; repo: string } {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO must be configured');
  }
  return { token, repo };
}

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export interface GitHubFileResult {
  content: string;
  sha: string;
}

/**
 * Read a file from the GitHub repository via Contents API.
 * Returns the decoded UTF-8 content and the file's SHA (needed for updates).
 */
export async function readGitHubFile(path: string): Promise<GitHubFileResult | null> {
  const { token, repo } = getConfig();
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const res = await fetch(url, {
    headers: getHeaders(token),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub API error reading ${path}: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

/**
 * Write (create or update) a file in the GitHub repository via Contents API.
 * If `sha` is provided, updates the existing file. Otherwise, creates a new file.
 */
export async function writeGitHubFile(
  path: string,
  content: string,
  sha?: string,
  message?: string,
): Promise<{ sha: string; commitSha: string }> {
  const { token, repo } = getConfig();
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const body: Record<string, string> = {
    message: message || `chore: update ${path}`,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error writing ${path}: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    sha: data.content?.sha || '',
    commitSha: data.commit?.sha?.slice(0, 7) || '',
  };
}
