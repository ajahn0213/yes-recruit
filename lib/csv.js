// 신청 목록 → CSV (엑셀·구글 시트에서 한글이 깨지지 않도록 BOM 포함) — 서버 전용
import { RESP_STATUS } from './ads';
import { answerText } from './validate';

const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 수식 주입 막기
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const when = (iso) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export function toCsv(ads, byAd) {
  const multi = ads.length > 1;
  // 여러 광고를 한 파일로: 추가 질문은 "광고 · 질문" 칸으로
  const extra = ads.flatMap((ad) => ad.fields.map((f) => ({ ad, f, head: multi ? `${ad.title} · ${f.label}` : f.label })));
  const head = [...(multi ? ['모집'] : []), '신청일시', '신청번호', '이름', '연락처', '이메일', '소속', ...extra.map((x) => x.head), '남긴 말', '상태', '메모'];
  const rows = [];
  for (const ad of ads) {
    for (const r of byAd[ad.id] || []) {
      rows.push([
        ...(multi ? [ad.title] : []), when(r.createdAt), r.ref, r.name, r.phone, r.email, r.community,
        ...extra.map((x) => (x.ad.id === ad.id ? answerText(r.answers?.[x.f.id]) : '')),
        r.message, RESP_STATUS[r.status]?.label || r.status, r.note,
      ]);
    }
  }
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function csvResponse(csv, name) {
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="recruit.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
      'cache-control': 'no-store',
    },
  });
}
