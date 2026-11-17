// 주보(Google 문서) → 앱 자동 반영 — 서버 전용
// 규칙
//  · 주보에 새로 생긴 모집 → 광고 추가 (공개)
//  · 주보에 있는 모집 → 제목·소개·안내·문의·링크·마감일을 주보 기준으로 고침
//      (추가 질문, 알림 메일, 담당자 링크, 신청 기록은 그대로)
//  · 주보에서 빠진 모집 → 숨김 (지우지 않음, 신청 기록 그대로)
//  · '직접 관리'로 잠근 광고와 직접 만든 광고는 건드리지 않음
import crypto from 'crypto';
import { getAds, updateAds, getSyncState, setSyncState, claimSyncRun, releaseSyncRun } from './store';
import { normalizeAd, safeLink } from './ads';
import { parseBulletin } from './importer';

export const textHash = (t) => crypto.createHash('sha256').update(String(t).replace(/\s+/g, ' ').trim()).digest('hex');
const norm = (t) => String(t || '').replace(/[\s()·\-—_.,:!]/g, '').replace(/모집|신청|안내|함께해요|상시/g, '').toLowerCase();

async function addLog(entry, hash, text) {
  const st = await getSyncState();
  await setSyncState({ hash: hash ?? st.hash, text: text ?? st.text ?? '', at: entry.at, log: [entry, ...(st.log || [])].slice(0, 15) });
}

export async function runSync(text, today, { force = false } = {}) {
  const at = new Date().toISOString();
  const hash = textHash(text);
  const st = await getSyncState();
  if (!force && st.hash === hash) return { status: 'unchanged' };
  if (!(await claimSyncRun())) return { status: 'busy' };
  try {
    const before = await getAds();
    const candidates = before.filter((a) => a.source === 'bulletin' && !a.locked);
    const found = await parseBulletin(text, today, candidates.map((a) => ({ id: a.id, title: a.title })));
    if (!found.length) {
      const e = { at, ok: false, message: '모집 광고를 하나도 찾지 못해서 아무것도 바꾸지 않았습니다. 주보 탭이 맞는지 확인해 주세요.' };
      await addLog(e, st.hash);
      return { status: 'empty', ...e };
    }

    const changes = { added: [], updated: [], hidden: [], shown: [] };
    await updateAds((cur) => {
      const next = [...cur];
      const used = new Set();
      const pickMatch = (f) => {
        const byId = f.match_id && next.find((a) => a.id === f.match_id && a.source === 'bulletin' && !a.locked && !used.has(a.id));
        if (byId) return byId;
        return next.find((a) => a.source === 'bulletin' && !a.locked && !used.has(a.id) && norm(a.title) === norm(f.title)) || null;
      };
      // 잠근 광고와 같은 모집이면 새로 만들지 않음
      const isLockedTwin = (f) => next.some((a) => (a.locked || a.source === 'manual') && (a.id === f.match_id || norm(a.title) === norm(f.title)));

      for (const f of found) {
        const link = safeLink(f.link);
        const old = pickMatch(f);
        if (old) {
          used.add(old.id);
          const mode = link ? 'link' : 'form';
          const fields = mode === 'form' ? (old.fields?.length ? old.fields : f.fields || []) : old.fields;
          const merged = normalizeAd({
            ...old,
            title: f.title, category: f.category, summary: f.summary, details: f.details, contact: f.contact,
            deadline: f.deadline || '', mode, link, fields,
            visible: old.autoHidden ? true : old.visible, autoHidden: false,
          }, old.order);
          const fixed = { ...merged, id: old.id, createdAt: old.createdAt, clicks: old.clicks, managerKeyHash: old.managerKeyHash, managerKeyEnc: old.managerKeyEnc, order: old.order, source: 'bulletin' };
          const key = (a) => JSON.stringify([a.title, a.category, a.summary, a.details, a.contact, a.deadline, a.mode, a.link, a.visible]);
          if (key(fixed) !== key(old)) {
            if (old.autoHidden) changes.shown.push(fixed.title); else changes.updated.push(fixed.title);
            next[next.indexOf(old)] = fixed;
          } else used.add(old.id);
        } else if (!isLockedTwin(f)) {
          let ad = normalizeAd({ ...f, id: undefined, link, mode: link ? 'link' : 'form', fields: link ? [] : f.fields, source: 'bulletin', visible: true }, 0);
          while (next.some((a) => a.id === ad.id)) ad.id += Math.random().toString(36).slice(2, 4);
          ad = { ...ad, source: 'bulletin' };
          used.add(ad.id);
          next.unshift(ad);
          changes.added.push(ad.title);
        }
      }
      // 주보에서 빠진 모집은 숨김
      return next.map((a) => {
        if (a.source !== 'bulletin' || a.locked || used.has(a.id) || !a.visible) return a;
        changes.hidden.push(a.title);
        return { ...a, visible: false, autoHidden: true, updatedAt: at };
      });
    });

    const n = changes.added.length + changes.updated.length + changes.hidden.length + changes.shown.length;
    const e = { at, ok: true, found: found.length, ...changes, message: n ? `추가 ${changes.added.length} · 수정 ${changes.updated.length + changes.shown.length} · 숨김 ${changes.hidden.length}` : '바뀐 모집이 없습니다.' };
    await addLog(e, hash, String(text).slice(0, 40000));
    return { status: 'done', ...e };
  } catch (err) {
    const e = { at, ok: false, message: err.message || '반영하지 못했습니다.' };
    await addLog(e, st.hash);
    return { status: 'error', ...e };
  } finally {
    await releaseSyncRun();
  }
}
