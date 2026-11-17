// 저장소 (Upstash Redis) — 서버 전용. 다른 YES 앱과 같은 데이터베이스를 써도 되도록 키는 'recruit:'로 시작
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { normalizeAd, BULLETIN_SEED } from './ads';
import { sha } from './secure';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasStore = Boolean(url && token);
const redis = hasStore ? new Redis({ url, token }) : null;

const P = 'recruit:';
const K = {
  ads: P + 'ads',
  resp: (adId) => P + 'resp:' + adId,
  lock: (n) => P + 'lock:' + n,
  rl: (k) => P + 'rl:' + k,
  seeded: P + 'seeded',
};

function need() { if (!redis) throw new Error('저장소(Upstash Redis)가 연결되지 않았습니다.'); }
const parse = (v) => (v == null ? null : typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return null; } })() : v);

// 같은 것을 두 사람이 동시에 저장해도 덮어쓰지 않도록
async function withLock(name, fn) {
  need();
  const id = 'L' + crypto.randomBytes(8).toString('hex');
  const until = Date.now() + 8000;
  while (!(await redis.set(K.lock(name), id, { nx: true, px: 15000 }))) {
    if (Date.now() > until) throw new Error('다른 저장이 진행 중입니다. 잠시 뒤 다시 해 주세요.');
    await new Promise((r) => setTimeout(r, 120));
  }
  try { return await fn(); } finally { if ((await redis.get(K.lock(name))) === id) await redis.del(K.lock(name)); }
}

// ---- 광고
export async function getAds() {
  need();
  let list = parse(await redis.get(K.ads));
  if (!Array.isArray(list)) {
    // 처음 한 번: 이번 주 주보 광고로 시작
    if (await redis.set(K.seeded, '1', { nx: true })) {
      list = BULLETIN_SEED.map((a, i) => normalizeAd(a, i));
      await redis.set(K.ads, JSON.stringify(list));
    } else list = [];
  }
  return list.sort((a, b) => a.order - b.order);
}
export async function updateAds(fn) {
  return withLock('ads', async () => {
    const cur = await getAds();
    const next = (await fn(cur)).map((a, i) => ({ ...a, order: i }));
    await redis.set(K.ads, JSON.stringify(next));
    return next;
  });
}
export async function getAd(id) { return (await getAds()).find((a) => a.id === id) || null; }
export async function bumpClicks(id) {
  try { await updateAds((list) => list.map((a) => (a.id === id ? { ...a, clicks: (a.clicks || 0) + 1 } : a))); } catch { /* 숫자 하나 놓쳐도 괜찮음 */ }
}

// ---- 신청 (광고별 목록)
export async function getResponses(adId) { need(); return parse(await redis.get(K.resp(adId))) || []; }
export async function getAllResponses(ids) {
  need();
  if (!ids.length) return {};
  const vals = await redis.mget(...ids.map(K.resp));
  return Object.fromEntries(ids.map((id, i) => [id, parse(vals[i]) || []]));
}
export async function updateResponses(adId, fn) {
  return withLock('resp:' + adId, async () => {
    const cur = await getResponses(adId);
    const next = await fn(cur);
    await redis.set(K.resp(adId), JSON.stringify(next));
    return next;
  });
}
export async function deleteResponsesOf(adId) { need(); await redis.del(K.resp(adId)); }

// ---- 시도 제한
export async function rateLimit(bucket, who, limit, windowSec) {
  if (!redis) return true;
  const k = K.rl(`${bucket}:${sha(who).slice(0, 24)}:${Math.floor(Date.now() / 1000 / windowSec)}`);
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, windowSec + 5);
  return n <= limit;
}
