// 관리자 인증·요청 보호 — 서버 전용
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sign, verify } from './secure';

export const SESSION_COOKIE = 'recruit_admin';
const DAYS = 14;

export function passwordOk(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function setSession(res) {
  res.cookies.set(SESSION_COOKIE, sign({ who: 'admin', v: 1 }, DAYS * 86400), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DAYS * 86400,
  });
}
export function clearSession(res) { res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 }); }

export async function adminSession() {
  if (!process.env.ADMIN_PASSWORD) return null;
  const p = verify((await cookies()).get(SESSION_COOKIE)?.value);
  return p?.who === 'admin' ? p : null;
}

// 다른 사이트에서 몰래 보내는 요청(CSRF) 막기: 같은 출처 + 전용 헤더
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return req.method === 'GET';
  try {
    const o = new URL(origin).host;
    const h = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return o === h;
  } catch { return false; }
}
export const writeOk = (req) => sameOrigin(req) && req.headers.get('x-yes-recruit') === '1';

export async function guardAdmin(req) {
  const s = await adminSession();
  if (!s) return { error: fail('관리자 로그인이 필요합니다.', 401) };
  if (req.method !== 'GET' && !writeOk(req)) return { error: fail('잘못된 요청입니다.', 403) };
  return { session: s };
}

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
export const fail = (msg, status = 400, extra = {}) => json({ error: msg, ...extra }, status);

export const todayLA = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
