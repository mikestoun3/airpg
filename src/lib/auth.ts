import { createHmac } from 'crypto';
import type { NextRequest } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'airpg-dev-secret-change-in-prod';
export const COOKIE_NAME = 'airpg_session';

export function makeSessionValue(walletAddress: string): string {
  const addr = walletAddress.toLowerCase();
  const mac = createHmac('sha256', SESSION_SECRET).update(addr).digest('hex');
  return `${addr}.${mac}`;
}

export function parseSessionCookie(value: string): string | null {
  const dot = value.lastIndexOf('.');
  if (dot < 0) return null;
  const addr = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = createHmac('sha256', SESSION_SECRET).update(addr).digest('hex');
  if (mac !== expected) return null;
  return addr;
}

export function getSessionWallet(req: NextRequest): string | null {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie) return null;
  return parseSessionCookie(cookie.value);
}
