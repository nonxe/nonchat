const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_OWNER || 'nonxe';
const BASE_URL = 'https://api.github.com';

const REPOS = {
  users: process.env.GITHUB_REPO_USERS || 'userdb',
  msgs: process.env.GITHUB_REPO_MSGS || 'msgdb',
  system: process.env.GITHUB_REPO_SYSTEM || 'systemdb',
} as const;

const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

// In-memory cache to reduce API calls
const cache = new Map<string, { data: unknown; etag: string; ts: number }>();
const CACHE_TTL = 3000; // 3 seconds

async function githubFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, { ...options, headers: { ...headers, ...(options?.headers || {}) } });
}

/** GET a file's content from a repo. Returns { content, sha } or null if not found */
export async function getFile(
  repo: keyof typeof REPOS,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const repoName = REPOS[repo];
  const url = `${BASE_URL}/repos/${OWNER}/${repoName}/contents/${path}`;
  const cacheKey = `${repo}:${path}`;
  const cached = cache.get(cacheKey);

  const reqHeaders: Record<string, string> = { ...headers };
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    reqHeaders['If-None-Match'] = cached.etag;
  }

  const res = await fetch(url, { headers: reqHeaders, cache: 'no-store' });

  if (res.status === 304 && cached) {
    return cached.data as { content: string; sha: string };
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf-8');
  const etag = res.headers.get('etag') || '';
  const result = { content, sha: json.sha };

  cache.set(cacheKey, { data: result, etag, ts: Date.now() });
  return result;
}

/** GET parsed JSON from a repo file */
export async function getJSON<T>(
  repo: keyof typeof REPOS,
  path: string
): Promise<{ data: T; sha: string } | null> {
  const file = await getFile(repo, path);
  if (!file) return null;
  return { data: JSON.parse(file.content) as T, sha: file.sha };
}

/** PUT (create or update) a file in a repo */
export async function putFile(
  repo: keyof typeof REPOS,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const repoName = REPOS[repo];
  const url = `${BASE_URL}/repos/${OWNER}/${repoName}/contents/${path}`;
  const encoded = Buffer.from(content, 'utf-8').toString('base64');

  const body: Record<string, string> = { message, content: encoded };
  if (sha) body.sha = sha;

  const res = await githubFetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);

  // Invalidate cache
  const cacheKey = `${repo}:${path}`;
  cache.delete(cacheKey);
}

/** PUT JSON object to a repo file */
export async function putJSON<T>(
  repo: keyof typeof REPOS,
  path: string,
  data: T,
  message: string,
  sha?: string
): Promise<void> {
  return putFile(repo, path, JSON.stringify(data, null, 2), message, sha);
}

/** Delete a file from a repo */
export async function deleteFile(
  repo: keyof typeof REPOS,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  const repoName = REPOS[repo];
  const url = `${BASE_URL}/repos/${OWNER}/${repoName}/contents/${path}`;

  const res = await githubFetch(url, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha }),
  });

  if (!res.ok) throw new Error(`GitHub DELETE failed: ${res.status} ${await res.text()}`);
  cache.delete(`${repo}:${path}`);
}

/** List files in a directory */
export async function listDir(
  repo: keyof typeof REPOS,
  path: string
): Promise<Array<{ name: string; path: string; sha: string; type: 'file' | 'dir' }> | null> {
  const repoName = REPOS[repo];
  const url = `${BASE_URL}/repos/${OWNER}/${repoName}/contents/${path}`;
  const res = await githubFetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub LIST failed: ${res.status}`);
  return res.json();
}
