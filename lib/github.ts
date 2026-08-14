const BASE_URL = 'https://api.github.com';

function getConfig() {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const owner = (process.env.GITHUB_OWNER || 'nonxe').trim();
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set on the server. Please add it to Vercel Environment Variables.');
  return {
    token,
    owner,
    repos: {
      users: (process.env.GITHUB_REPO_USERS || 'userdb').trim(),
      msgs:  (process.env.GITHUB_REPO_MSGS  || 'msgdb').trim(),
      system:(process.env.GITHUB_REPO_SYSTEM|| 'systemdb').trim(),
    } as const,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'NONCHAT-App/1.0',
    },
  };
}

type RepoKey = 'users' | 'msgs' | 'system';

/** GET a file's content from a repo. Returns { content, sha } or null if not found */
export async function getFile(
  repo: RepoKey,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const { owner, repos, headers } = getConfig();
  const repoName = repos[repo];
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${BASE_URL}/repos/${owner}/${repoName}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;

  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET ${repoName}/${cleanPath} failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json.content) return null;
  const content = Buffer.from(json.content, 'base64').toString('utf-8');
  return { content, sha: json.sha };
}

/** GET parsed JSON from a repo file */
export async function getJSON<T>(
  repo: RepoKey,
  path: string
): Promise<{ data: T; sha: string } | null> {
  const file = await getFile(repo, path);
  if (!file) return null;
  try {
    return { data: JSON.parse(file.content) as T, sha: file.sha };
  } catch {
    throw new Error(`Failed to parse JSON at ${path}: ${file.content.slice(0, 200)}`);
  }
}

/** PUT (create or update) a file in a repo */
export async function putFile(
  repo: RepoKey,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const { owner, repos, headers } = getConfig();
  const repoName = repos[repo];
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${BASE_URL}/repos/${owner}/${repoName}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;
  const encoded = Buffer.from(content, 'utf-8').toString('base64');

  const body: Record<string, string> = { message, content: encoded };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${repoName}/${cleanPath} failed (${res.status}): ${text}`);
  }
}

/** PUT JSON object to a repo file */
export async function putJSON<T>(
  repo: RepoKey,
  path: string,
  data: T,
  message: string,
  sha?: string
): Promise<void> {
  return putFile(repo, path, JSON.stringify(data, null, 2), message, sha);
}

/** Delete a file from a repo */
export async function deleteFile(
  repo: RepoKey,
  path: string,
  sha: string,
  message: string
): Promise<void> {
  const { owner, repos, headers } = getConfig();
  const repoName = repos[repo];
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${BASE_URL}/repos/${owner}/${repoName}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ message, sha }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub DELETE ${repoName}/${cleanPath} failed (${res.status}): ${text}`);
  }
}

/** List directory contents */
export async function listDir(
  repo: RepoKey,
  path: string
): Promise<Array<{ name: string; path: string; sha: string; type: 'file' | 'dir' }> | null> {
  const { owner, repos, headers } = getConfig();
  const repoName = repos[repo];
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${BASE_URL}/repos/${owner}/${repoName}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub LIST ${repoName}/${cleanPath} failed (${res.status})`);
  return res.json();
}
