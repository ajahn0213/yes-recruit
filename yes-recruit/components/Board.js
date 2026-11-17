'use client';
import { useMemo, useState } from 'react';
import { dday } from '@/lib/dday';

export default function Board({ ads, today }) {
  const [cat, setCat] = useState('전체');
  const cats = useMemo(() => {
    const m = new Map();
    ads.forEach((a) => m.set(a.category, (m.get(a.category) || 0) + 1));
    return [['전체', ads.length], ...m.entries()];
  }, [ads]);
  const shown = cat === '전체' ? ads : ads.filter((a) => a.category === cat);

  return (
    <>
      {cats.length > 2 && (
        <nav className="filters" aria-label="부서별 보기">
          <div className="in">
            {cats.map(([c, n]) => (
              <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}<small>{n}</small></button>
            ))}
          </div>
        </nav>
      )}
      <div className="wrap">
        {shown.length === 0 ? <p className="empty">지금은 모집 중인 광고가 없습니다.</p> : (
          <div className="grid">
            {shown.map((a) => <Card key={a.id} ad={a} today={today} />)}
          </div>
        )}
      </div>
    </>
  );
}

function Card({ ad, today }) {
  const d = dday(ad.deadline, today);
  const href = `/r/${ad.id}`;
  return (
    <article className={'card cat' + (ad.open ? '' : ' closed')} data-c={ad.category}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="tag">{ad.category}</span>
        {d && <span className={'dday ' + d.cls}>{d.text}</span>}
      </div>
      <h2><a href={href}>{ad.title}</a></h2>
      {ad.summary && <p className="sum">{ad.summary}</p>}
      {ad.details && <p className="det">{ad.details}</p>}
      {ad.contact && <p className="who">문의 · {ad.contact}</p>}
      <div className="foot">
        {!ad.open ? <span className="how">마감되었습니다</span>
          : ad.mode === 'link'
            ? <a className="btn small primary cta" href={`/go/${ad.id}`} target="_blank" rel="noopener">신청 페이지로 이동 ↗</a>
            : <a className="btn small primary cta" href={href}>여기서 바로 신청</a>}
        {ad.open && <span className={'how m-' + ad.mode}>{ad.mode === 'link' ? '외부 신청 링크' : '1분 신청서'}</span>}
      </div>
    </article>
  );
}
