// 광고 제목이 같은 모집인지 (서버·화면 공용)
export const normTitle = (t) => String(t || '').toLowerCase()
  .replace(/모집|신청|안내|함께해요|상시|단원|합니다|하세요/g, '')
  .replace(/[\s()·\-—_.,:!~'"“”‘’/|]/g, '');

const bigrams = (s) => { const out = new Set(); for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2)); if (s.length === 1) out.add(s); return out; };

// 0~1. 짧은 쪽 제목이 긴 쪽에 얼마나 들어 있는지
export function titleSimilarity(a, b) {
  const x = normTitle(a), y = normTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  // '3부'와 '4부'처럼 예배·부서 번호가 다르면 다른 모집
  const nx = x.match(/\d+부/g)?.join(), ny = y.match(/\d+부/g)?.join();
  if (nx && ny && nx !== ny) return 0;
  const A = bigrams(x), B = bigrams(y);
  let hit = 0; for (const g of A) if (B.has(g)) hit++;
  return hit / Math.min(A.size, B.size);
}

// 비슷한 광고 짝 찾기 — 먼저 만든 광고(주보에 이미 실린 주소)를 남기는 쪽으로
export function findDuplicatePairs(ads, min = 0.7) {
  const pairs = [], used = new Set();
  const list = [...ads].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  for (let i = 0; i < list.length; i++) {
    if (used.has(list[i].id)) continue;
    for (let j = i + 1; j < list.length; j++) {
      if (used.has(list[j].id)) continue;
      const s = titleSimilarity(list[i].title, list[j].title);
      if (s >= min) { pairs.push({ keep: list[i], drop: list[j], score: s }); used.add(list[j].id); }
    }
  }
  return pairs;
}
