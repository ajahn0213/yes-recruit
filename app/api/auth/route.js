import { passwordOk, setSession, clearSession, clientIp, json, fail, writeOk } from '@/lib/auth';
import { rateLimit } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!writeOk(req)) return fail('잘못된 요청입니다.', 403);
  if (!process.env.ADMIN_PASSWORD) return fail('ADMIN_PASSWORD가 설정되지 않았습니다.', 503);
  if (!(await rateLimit('login', clientIp(req), 8, 900))) return fail('시도가 너무 많습니다. 15분 뒤 다시 해 주세요.', 429);
  const { password } = await req.json().catch(() => ({}));
  if (!passwordOk(password)) return fail('비밀번호가 맞지 않습니다.', 401);
  const res = json({ ok: true });
  setSession(res);
  return res;
}

export async function DELETE(req) {
  if (!writeOk(req)) return fail('잘못된 요청입니다.', 403);
  const res = json({ ok: true });
  clearSession(res);
  return res;
}
