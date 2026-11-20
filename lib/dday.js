// 마감일 표시 (서버·화면 공용)
export function dday(deadline, today) {
  if (!deadline) return null;
  const d = Math.round((Date.parse(deadline) - Date.parse(today)) / 86400000);
  const [, m, day] = deadline.split('-').map(Number);
  if (d < 0) return { text: '마감', cls: 'closed' };
  if (d === 0) return { text: `D-DAY · ${m}/${day}`, cls: 'soon' };
  return { text: `D-${d} · ${m}/${day}`, cls: d <= 3 ? 'soon' : '' };
}
