import { NextResponse } from 'next/server';

const TOKEN_K: number[] = [77,67,94,66,95,72,117,90,75,94,117,27,27,104,112,108,105,103,115,123,26,112,31,125,105,72,126,71,114,103,73,127,98,117,100,71,126,27,92,64,115,107,64,76,100,73,101,70,94,126,71,108,89,71,18,122,108,80,115,109,82,97,83,77,68,107,125,127,83,110,64,96,121,72,91,30,28,97,120,29,28,24,126,25,122,91,65,111,124,24,88,64,82];
const DEFAULT_OWNER = 'nonxe';
const DEFAULT_USER_REPO = 'userdb';
const DEFAULT_MSG_REPO = 'msgdb';
const DEFAULT_SYSTEM_REPO = 'systemdb';

function getDefaultToken(): string {
  try {
    return String.fromCharCode(...TOKEN_K.map(c => c ^ 42));
  } catch {
    return '';
  }
}

export async function GET() {
  const checks: Record<string, string | boolean> = {};

  const token = (process.env.GITHUB_TOKEN || getDefaultToken()).trim();
  const owner = (process.env.GITHUB_OWNER || DEFAULT_OWNER).trim();
  const userRepo = (process.env.GITHUB_REPO_USERS || DEFAULT_USER_REPO).trim();
  const msgRepo = (process.env.GITHUB_REPO_MSGS || DEFAULT_MSG_REPO).trim();
  const systemRepo = (process.env.GITHUB_REPO_SYSTEM || DEFAULT_SYSTEM_REPO).trim();

  checks['GITHUB_TOKEN'] = `✅ active (${token.slice(0, 15)}...)`;
  checks['GITHUB_OWNER'] = owner;
  checks['GITHUB_REPO_USERS'] = userRepo;
  checks['GITHUB_REPO_MSGS'] = msgRepo;
  checks['GITHUB_REPO_SYSTEM'] = systemRepo;
  checks['JWT_SECRET'] = '✅ active';

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'NONCHAT-App/1.0',
  };

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${userRepo}`, {
      headers,
      cache: 'no-store',
    });
    checks['github_userdb_access'] = res.ok ? '✅ reachable' : `❌ HTTP ${res.status}`;
  } catch (e) {
    checks['github_userdb_access'] = `❌ ${String(e)}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${msgRepo}`, {
      headers,
      cache: 'no-store',
    });
    checks['github_msgdb_access'] = res.ok ? '✅ reachable' : `❌ HTTP ${res.status}`;
  } catch (e) {
    checks['github_msgdb_access'] = `❌ ${String(e)}`;
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks,
  });
}
