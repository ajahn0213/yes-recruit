'use client';
import { useMemo, useState } from 'react';
import { RESP_STATUS } from '@/lib/ads';

const fmt = (iso) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const ansText = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

// 신청 표 — 관리자(여러 모집)·담당자(한 모집) 공용
export default function Responses({ ads, byAd, onPatch, onDelete, csvHref, single }) {
  const [adF, setAdF] = useState(single ? ads[0]?.id : 'all');
  const [stF, setStF] = useState('active');
  const [q, setQ] = useState('');

  const adMap = useMemo(() => Object.fromEntries(ads.map((a) => [a.id, a])), [ads]);
  const rows = useMemo(() => {
    const out = [];
    for (const a of ads) for (const r of byAd[a.id] || []) out.push({ ...r, adId: a.id });
    return out.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  }, [ads, byAd]);
  const t = q.trim().toLowerCase();
  const shown = rows.filter((r) => (adF === 'all' || r.adId === adF)
    && (stF === 'all' || (stF === 'active' ? r.status !== 'declined' : r.status === stF))
    && (!t || [r.name, r.phone, r.email, r.community, r.ref].some((x) => String(x || '').toLowerCase().includes(t))));

  const scope = rows.filter((r) => adF === 'all' || r.adId === adF);
  const n = (s) => scope.filter((r) => r.status === s).length;

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{scope.filter((r) => r.status !== 'declined').length}</b><span>전체 신청</span></div>
        <div className="stat"><b style={{ color: 'var(--red)' }}>{n('new')}</b><span>새 신청 (아직 연락 전)</span></div>
        <div className="stat"><b>{n('contacted')}</b><span>연락함</span></div>
        <div className="stat"><b style={{ color: 'var(--ok)' }}>{n('confirmed')}</b><span>확정</span></div>
      </div>
      <div className="toolbar">
        {!single && (
          <select value={adF} onChange={(e) => setAdF(e.target.value)} aria-label="모집 고르기">
            <option value="all">모든 모집</option>
            {ads.map((a) => <option key={a.id} value={a.id}>{a.title} ({(byAd[a.id] || []).length})</option>)}
          </select>
        )}
        <select value={stF} onChange={(e) => setStF(e.target.value)} aria-label="상태 고르기">
          <option value="active">취소 빼고 모두</option>
          {Object.entries(RESP_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}만</option>)}
          <option value="all">전부</option>
        </select>
        <input type="search" placeholder="이름·연락처 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="찾기" />
        <span className="grow" />
        {csvHref && <a className="btn small" href={csvHref(adF)}>엑셀(CSV) 받기</a>}
      </div>
      {shown.length === 0 ? <p className="empty">{rows.length ? '조건에 맞는 신청이 없습니다.' : '아직 신청이 없습니다.'}</p> : (
        <div className="tscroll">
          <table className="t">
            <thead><tr>
              <th>신청</th>{!single && <th>모집</th>}<th>이름 · 연락처</th><th>답변</th><th>상태</th><th>메모</th>{onDelete && <th />}
            </tr></thead>
            <tbody>
              {shown.map((r) => {
                const ad = adMap[r.adId];
                return (
                  <tr key={r.id} className={'st-' + r.status}>
                    <td className="nowrap">{fmt(r.createdAt)}<br /><span className="muted" style={{ fontSize: 12, fontFamily: 'var(--latin)' }}>{r.ref}</span></td>
                    {!single && <td style={{ minWidth: 150 }}><span className="tag cat" data-c={ad?.category}>{ad?.category}</span><br />{ad?.title}</td>}
                    <td className="nowrap"><b>{r.name}</b><br /><a href={'tel:' + r.phone.replace(/[^\d+]/g, '')}>{r.phone}</a>{r.email && <><br /><a href={'mailto:' + r.email} style={{ fontSize: 13 }}>{r.email}</a></>}</td>
                    <td className="ans" style={{ minWidth: 200 }}>
                      {r.community && <div><b>소속</b> {r.community}</div>}
                      {(ad?.fields || []).map((f) => ansText(r.answers?.[f.id]) && <div key={f.id}><b>{f.label}</b> {ansText(r.answers[f.id])}</div>)}
                      {r.message && <div style={{ whiteSpace: 'pre-wrap' }}><b>남긴 말</b> {r.message}</div>}
                    </td>
                    <td>
                      <select className="st" data-s={r.status} value={r.status} onChange={(e) => onPatch(r.adId, r.id, { status: e.target.value })} aria-label={`${r.name} 상태`}>
                        {Object.entries(RESP_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                      </select>
                    </td>
                    <td><Memo value={r.note} onSave={(note) => onPatch(r.adId, r.id, { note })} label={`${r.name} 메모`} /></td>
                    {onDelete && <td className="nowrap"><button className="link" style={{ color: 'var(--red)', fontSize: 13 }} onClick={() => onDelete(r.adId, r.id, r.name)}>삭제</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Memo({ value, onSave, label }) {
  const [v, setV] = useState(value || '');
  return <input className="memo" value={v} aria-label={label} placeholder="메모" maxLength={500}
    onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value || '') && onSave(v)}
    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />;
}
