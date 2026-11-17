// 부서 담당자용 링크 확인 — 서버 전용
import crypto from 'crypto';
import { getAd } from './store';
import { sha } from './secure';

export async function adForManager(adId, key) {
  if (!adId || !key || String(key).length < 16) return null;
  const ad = await getAd(String(adId));
  if (!ad?.managerKeyHash) return null;
  const a = Buffer.from(ad.managerKeyHash), b = Buffer.from(sha('mgr:' + key));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? ad : null;
}
