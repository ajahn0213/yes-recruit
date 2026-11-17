import { guardAdmin, json, fail } from '@/lib/auth';
import { getAds, updateAds, getAllResponses, deleteResponsesOf, hasStore } from '@/lib/store';
import { normalizeAd } from '@/lib/ads';
import { randomToken, sha, encrypt, decrypt } from '@/lib/secure';
import { aiReady } from '@/lib/importer';
import { mailReady } from '@/lib/mail';

export const dynamic = 'force-dynamic';

// 관리 화면으로 보낼 모양 (암호 값은 빼고, 담당자 링크 키만 풀어서)
function forAdmin(ad, counts) {
  const { managerKeyHash, managerKeyEnc, ...rest } = ad;
  const key = managerKeyEnc ? decrypt(managerKeyEnc) : null;
  return { ...rest, managerKey: key || '', counts: counts || { total: 0, new: 0 } };
}

export async function GET(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  if (!hasStore) return fail('저장소가 연결되지 않았습니다.', 503);
  const ads = await getAds();
  const all = await getAllResponses(ads.filter((a) => a.mode === 'form').map((a) => a.id));
  const counts = (id) => { const l = all[id] || []; return { total: l.filter((r) => r.status !== 'declined').length, new: l.filter((r) => r.status === 'new').length }; };
  return json({ ads: ads.map((a) => forAdmin(a, counts(a.id))), ai: aiReady(), mail: mailReady() });
}

export async function POST(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (action === 'save' || action === 'saveMany') {
    const incoming = action === 'save' ? [body.ad] : (Array.isArray(body.ads) ? body.ads : []).slice(0, 30);
    if (!incoming.length) return fail('저장할 광고가 없습니다.');
    let savedIds = [];
    const list = await updateAds((cur) => {
      const next = [...cur];
      for (const raw of incoming) {
        const i = raw?.id ? next.findIndex((a) => a.id === raw.id) : -1;
        const old = i >= 0 ? next[i] : null;
        let ad = normalizeAd({ ...raw, id: old ? old.id : undefined }, next.length);
        // 바꾸면 안 되는 값은 원래 것으로
        if (old) ad = { ...ad, createdAt: old.createdAt, clicks: old.clicks, managerKeyHash: old.managerKeyHash, managerKeyEnc: old.managerKeyEnc, order: old.order };
        else while (next.some((a) => a.id === ad.id)) ad.id = ad.id + Math.random().toString(36).slice(2, 4);
        if (old) next[i] = ad; else next.unshift(ad);
        savedIds.push(ad.id);
      }
      return next;
    });
    return json({ ok: true, ids: savedIds, ads: list.map((a) => forAdmin(a)) });
  }

  if (action === 'delete') {
    await updateAds((cur) => cur.filter((a) => a.id !== body.id));
    if (body.withResponses) await deleteResponsesOf(String(body.id));
    return json({ ok: true });
  }

  if (action === 'move') {
    await updateAds((cur) => {
      const i = cur.findIndex((a) => a.id === body.id), j = i + (body.dir === 'up' ? -1 : 1);
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
    return json({ ok: true });
  }

  if (action === 'toggle') {
    await updateAds((cur) => cur.map((a) => (a.id === body.id ? { ...a, visible: !a.visible, updatedAt: new Date().toISOString() } : a)));
    return json({ ok: true });
  }

  // 담당자 링크 만들기·새로 만들기 (예전 링크는 바로 막힘)
  if (action === 'managerKey') {
    const key = randomToken(18);
    let found = false;
    await updateAds((cur) => cur.map((a) => (a.id === body.id ? (found = true, { ...a, managerKeyHash: body.revoke ? '' : sha('mgr:' + key), managerKeyEnc: body.revoke ? '' : encrypt(key) }) : a)));
    if (!found) return fail('광고를 찾을 수 없습니다.', 404);
    return json({ ok: true, managerKey: body.revoke ? '' : key });
  }

  return fail('알 수 없는 요청입니다.');
}
