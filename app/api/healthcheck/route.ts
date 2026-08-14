import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string | boolean> = {};

  // 1. Check env vars
  checks['GITHUB_TOKEN'] = !!process.env.GITHUB_TOKEN ? '✅ set' : '❌ MISSING';
  checks['GITHUB_OWNER'] = process.env.GITHUB_OWNER || '⚠️ not set (using default: nonxe)';
  checks['GITHUB_REPO_USERS'] = process.env.GITHUB_REPO_USERS || '⚠️ not set (using default: userdb)';
  checks['GITHUB_REPO_MSGS'] = process.env.GITHUB_REPO_MSGS || '⚠️ not set (using default: msgdb)';
  checks['GITHUB_REPO_SYSTEM'] = process.env.GITHUB_REPO_SYSTEM || '⚠️ not set (using default: systemdb)';
  checks['JWT_SECRET'] = !!process.env.JWT_SECRET ? '✅ set' : '⚠️ using fallback (change for production)';

  // 2. Try GitHub API connectivity
  if (process.env.GITHUB_TOKEN) {
    const owner = process.env.GITHUB_OWNER || 'nonxe';
    const repo = process.env.GITHUB_REPO_USERS || 'userdb';
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        checks['github_userdb_access'] = '✅ reachable';
      } else {
        const txt = await res.text();
        checks['github_userdb_access'] = `❌ HTTP ${res.status}: ${txt.slice(0, 100)}`;
      }
    } catch (e) {
      checks['github_userdb_access'] = `❌ fetch error: ${String(e)}`;
    }

    // Try write test on msgdb
    const msgrepo = process.env.GITHUB_REPO_MSGS || 'msgdb';
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${msgrepo}`, {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
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
