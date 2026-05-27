import { NextRequest, NextResponse } from 'next/server';
import { checkAdminSecret, makeAdminCookieValue, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getSessionWallet } from '@/lib/auth';

const ADMIN_WALLET = (process.env.ADMIN_WALLET ?? '').toLowerCase();

// In-memory brute-force guard: max 5 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many attempts' }, { status: 429 });
  }
  const sessionWallet = getSessionWallet(req)?.toLowerCase();
  if (!ADMIN_WALLET || sessionWallet !== ADMIN_WALLET) {
    return NextResponse.json({ ok: false, error: 'Wallet not authorized' }, { status: 403 });
  }
  const { secret } = await req.json() as { secret: string };
  if (!checkAdminSecret(secret)) {
    return NextResponse.json({ ok: false, error: 'Invalid secret' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeAdminCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
