import { NextRequest, NextResponse } from 'next/server';
import { checkAdminSecret, makeAdminCookieValue, ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
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
