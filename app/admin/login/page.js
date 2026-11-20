'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json', 'x-yes-recruit': '1' }, body: JSON.stringify({ password: pw }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) location.href = '/admin'; else setErr(j.error || '로그인하지 못했습니다.');
  }
  return (
    <>
      <div className="stripe" aria-hidden="true"><i /><i /><i /><i /></div>
      <form className="login" onSubmit={go}>
        <img src="/brand/yes-mark-ink.png" alt="YES" style={{ height: 28, width: 'auto' }} />
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>모집·신청 관리</h1>
        <label className="field">관리자 비밀번호
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        {err && <p className="note bad" role="alert">{err}</p>}
        <button className="btn primary block" disabled={busy || !pw}>{busy ? '확인 중…' : '들어가기'}</button>
        <a href="/" className="muted" style={{ fontSize: 14 }}>← 모집 게시판으로</a>
      </form>
    </>
  );
}
