import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string | boolean> = {};

  const token = (process.env.GITHUB_TOKEN || '').trim();
  const owner = (process.env.GITHUB_OWNER || 'nonxe').trim();
  const userRepo = (process.env.GITHUB_REPO_USERS || 'userdb').trim();
  const msgRepo = (process.env.GITHUB_REPO_MSGS || 'msgdb').trim();
  const systemRepo = (process.env.GITHUB_REPO_SYSTEM || 'systemdb').trim();

  // 1. Check env vars
  checks['GITHUB_TOKEN'] = !!token ? `✅ set (${token.slice(0, 12)}...)` : '❌ MISSING';
  checks['GITHUB_OWNER'] = owner;
  checks['GITHUB_REPO_USERS'] = userRepo;
  checks['GITHUB_REPO_MSGS'] = msgRepo;
  checks['GITHUB_REPO_SYSTEM'] = systemRepo;
  checks['JWT_SECRET'] = !!process.env.JWT_SECRET ? '✅ set' : '⚠️ using fallback';

  // 2. Try GitHub API connectivity
  if (token) {
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
      if (res.ok) {
        checks['github_userdb_access'] = '✅ reachable';
      } else {
        const txt = await res.text();
        checks['github_userdb_access'] = `❌ HTTP ${res.status}: ${txt.slice(0, 120)}`;
      }
    } catch (e) {
      checks['github_userdb_access'] = `❌ fetch error: ${String(e)}`;
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
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks,
  });
}
