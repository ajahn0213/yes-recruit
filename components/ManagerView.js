'use client';
import { useCallback, useEffect, useState } from 'react';
import Responses from './Responses';

export default function ManagerView({ ad, k }) {
  const [list, setList] = useState(null);
  const [toast, setToast] = useState('');
  const q = `ad=${encodeURIComponent(ad.id)}&k=${encodeURIComponent(k)}`;
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const load = useCallback(async () => {
    const r = await fetch('/api/manager?' + q); const j = await r.json().catch(() => ({}));
    if (r.ok) setList(j.responses); else say(j.error || '불러오지 못했습니다');
  }, [q]);
  useEffect(() => { load(); }, [load]);

  async function patch(_, id, p) {
    setList((l) => l.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const r = await fetch('/api/manager', { method: 'POST', headers: { 'content-type': 'application/json', 'x-yes-recruit': '1' }, body: JSON.stringify({ ad: ad.id, k, id, ...p }) });
    if (r.ok) say('저장했습니다'); else { say('저장하지 못했습니다'); load(); }
  }

  return (
    <>
      <div className="stripe" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="adm-head">
        <img src="/brand/yes-mark-ink.png" alt="YES" />
        <b>담당자 · 신청 현황</b>
      </header>
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 60 }}>
        <div className="cat" data-c={ad.category} style={{ marginBottom: 18 }}>
          <span className="tag">{ad.category}</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>{ad.title}</h1>
          <p className="muted" style={{ fontSize: 14 }}>이 링크는 이 모집 담당자용입니다. 신청하신 분들의 연락처가 있으니 다른 곳에 올리지 말아 주세요.</p>
        </div>
        {!list ? <p className="muted">불러오는 중…</p>
          : <Responses single ads={[ad]} byAd={{ [ad.id]: list }} onPatch={patch} csvHref={() => '/api/manager?csv=1&' + q} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
