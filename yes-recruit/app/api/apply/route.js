import { getAd, updateResponses, rateLimit, hasStore } from '@/lib/store';
import { isOpen } from '@/lib/ads';
import { checkApplication } from '@/lib/validate';
import { notifyNew } from '@/lib/mail';
import { clientIp, json, fail, sameOrigin, todayLA } from '@/lib/auth';
import { refCode, randomToken, decrypt } from '@/lib/secure';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!hasStore) return fail('아직 저장소가 연결되지 않았습니다.', 503);
  if (!sameOrigin(req)) return fail('잘못된 요청입니다.', 403);
  let body;
  try { body = await req.json(); } catch { return fail('잘못된 요청입니다.'); }
  // 자동 등록 봇 거르기 (사람에게는 보이지 않는 칸)
  if (body?.website) return json({ ok: true, ref: 'YR-OK' });

  const ip = clientIp(req);
  if (!(await rateLimit('apply', ip, 12, 600))) return fail('잠시 뒤 다시 시도해 주세요.', 429);

  const ad = await getAd(String(body?.adId || ''));
  if (!ad || ad.mode !== 'form') return fail('이 모집을 찾을 수 없습니다.', 404);
  if (!isOpen(ad, todayLA())) return fail('이 모집은 마감되었습니다.', 410);

  const { errors, value } = checkApplication(ad, body);
  if (Object.keys(errors).length) return fail('입력한 내용을 확인해 주세요.', 422, { errors });

  const phoneKey = value.phone.replace(/\D/g, '');
  let dup = false;
  const rec = { id: randomToken(9), ref: refCode(), createdAt: new Date().toISOString(), ...value, status: 'new', note: '' };
  await updateResponses(ad.id, (list) => {
    // 같은 사람이 10분 안에 같은 모집에 또 누르면 한 번만 저장
    const recent = list.find((r) => r.phone.replace(/\D/g, '') === phoneKey && Date.now() - Date.parse(r.createdAt) < 600000);
    if (recent) { dup = true; rec.ref = recent.ref; return list; }
    return [rec, ...list].slice(0, 2000);
  });

  if (!dup) {
    const appUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
    try { await notifyNew(ad, rec, appUrl, ad.managerKeyEnc ? decrypt(ad.managerKeyEnc) || '' : ''); } catch (e) { console.error('[mail]', e.message); }
  }
  return json({ ok: true, ref: rec.ref });
}
