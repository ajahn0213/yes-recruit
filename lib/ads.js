// 모집 광고 — 모양 정리와 기본값 (서버·화면 공용)

export const CATEGORIES = ['교회 전체', '예배국', '훈련국', '선교국', '친교국', '교육부', '기타'];
export const FIELD_KINDS = { text: '짧은 글', long: '긴 글', choice: '하나 고르기', multi: '여러 개 고르기' };
export const RESP_STATUS = {
  new: { label: '새 신청', tone: 'new' },
  contacted: { label: '연락함', tone: 'mid' },
  confirmed: { label: '확정', tone: 'ok' },
  declined: { label: '취소·보류', tone: 'off' },
};

const s = (v, max = 200) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const rid = () => Math.random().toString(36).slice(2, 9);
const okId = (v) => (/^[a-z0-9_-]{2,40}$/i.test(String(v || '')) ? String(v) : rid());
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

export function safeLink(u) {
  let x = s(u, 500);
  if (!x) return '';
  if (!/^https?:\/\//i.test(x)) x = 'https://' + x;
  try { const p = new URL(x); return p.protocol === 'https:' || p.protocol === 'http:' ? p.toString() : ''; } catch { return ''; }
}

export function normalizeField(f) {
  const kind = FIELD_KINDS[f?.kind] ? f.kind : 'text';
  const options = (Array.isArray(f?.options) ? f.options : String(f?.options || '').split(/[,\n]/)).map((o) => s(o, 60)).filter(Boolean).slice(0, 20);
  return { id: okId(f?.id), label: s(f?.label, 80) || '질문', kind: (kind === 'choice' || kind === 'multi') && !options.length ? 'text' : kind, options, required: !!f?.required, help: s(f?.help, 120) };
}

export function normalizeAd(a, order = 0) {
  const link = safeLink(a?.link);
  const mode = a?.mode === 'link' && link ? 'link' : 'form';
  const fields = (Array.isArray(a?.fields) ? a.fields : []).map(normalizeField).slice(0, 12);
  const seen = new Set(); fields.forEach((f) => { while (seen.has(f.id)) f.id = rid(); seen.add(f.id); });
  return {
    id: okId(a?.id),
    title: s(a?.title, 80) || '새 모집',
    category: s(a?.category, 20) || '교회 전체',
    summary: s(a?.summary, 200),
    details: s(a?.details, 2000),
    contact: s(a?.contact, 300),
    mode, link: mode === 'link' ? link : '',
    fields,
    askCommunity: a?.askCommunity !== false,
    deadline: isDate(a?.deadline) ? a.deadline : '',
    visible: a?.visible !== false,
    notify: s(a?.notify, 300),
    order: Number.isFinite(Number(a?.order)) ? Number(a.order) : order,
    createdAt: a?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    managerKeyHash: typeof a?.managerKeyHash === 'string' ? a.managerKeyHash : '',
    managerKeyEnc: typeof a?.managerKeyEnc === 'string' ? a.managerKeyEnc : '',
    clicks: Number(a?.clicks) || 0,
    // 주보 자동 연동: bulletin = 주보에서 온 광고, manual = 직접 만든 광고
    source: a?.source === 'bulletin' || (!a?.source && SEED_IDS.has(a?.id)) ? 'bulletin' : 'manual',
    locked: !!a?.locked,          // true면 주보 연동이 건드리지 않음
    autoHidden: !!a?.autoHidden,  // 주보에서 빠져서 자동으로 숨긴 광고
  };
}

// 지금 신청을 받는가 (숨김이 아니고 마감일이 지나지 않음)
export const isOpen = (ad, today) => ad.visible && (!ad.deadline || ad.deadline >= today);

// 일반 화면에 내보낼 것 (관리용 값 빼고)
export function publicAd(ad, today) {
  return {
    id: ad.id, title: ad.title, category: ad.category, summary: ad.summary, details: ad.details, contact: ad.contact,
    mode: ad.mode, hasLink: !!ad.link, fields: ad.fields, askCommunity: ad.askCommunity, deadline: ad.deadline, open: isOpen(ad, today),
  };
}

// 이번 주(2026년 11월 셋째 주) 주보 모집 광고 — 처음 열 때 한 번 들어감
export const BULLETIN_SEED = [
  {
    id: 'choir3', title: '3부 Holywave Choir 찬양대 단원 모집', category: '교회 전체',
    summary: '주일 3부 예배를 찬양으로 섬길 찬양대원을 모집합니다.',
    details: '대상: 새가족반 수료 세례·등록교인\n연습: 매주 화요일 저녁',
    contact: '서재필 (714) 392-4552 · Michelle Chung (714) 397-3688', mode: 'form',
    fields: [
      { id: 'part', label: '희망 파트', kind: 'choice', options: ['소프라노', '알토', '테너', '베이스', '잘 모르겠어요'], required: true },
      { id: 'baptized', label: '세례를 받으셨나요?', kind: 'choice', options: ['예', '아니오'], required: true },
      { id: 'newcomer', label: '새가족반을 수료하셨나요?', kind: 'choice', options: ['수료함', '수강 중', '아직 안 함'], required: true },
    ],
  },
  {
    id: 'orch3', title: '3부 사랑 오케스트라 단원 모집', category: '교회 전체',
    summary: '주일 3부 예배 사랑 오케스트라 단원을 모집합니다.',
    details: '대상: 현악·목관·금관 전공자 및 연주 가능한 비전공자',
    contact: '서재필 (714) 392-4552 · Michelle Chung (714) 397-3688', mode: 'form',
    fields: [
      { id: 'inst', label: '악기', kind: 'text', required: true, help: '예: 바이올린, 플루트, 트럼펫' },
      { id: 'major', label: '전공 여부', kind: 'choice', options: ['전공', '비전공'], required: true },
      { id: 'career', label: '연주 경력', kind: 'long', required: false },
    ],
  },
  {
    id: 'orch4', title: '4부 한국어 예배 오케스트라 단원 모집', category: '교회 전체',
    summary: '주일 4부 한국어 예배 오케스트라 단원을 모집합니다.',
    details: '', contact: '우원주 (818) 517-8575', mode: 'form',
    fields: [{ id: 'inst', label: '악기', kind: 'text', required: true }, { id: 'career', label: '연주 경력', kind: 'long', required: false }],
  },
  {
    id: 'sarang', title: '사랑부(장애우) 봉사자 모집', category: '교회 전체',
    summary: '장애우 친구들과 함께 예배드리며 섬길 봉사자를 모집합니다.',
    details: '봉사 시간: 주일 오전 9시 (2부 예배 시간)\n장소: 112호 (사랑부실)',
    contact: '김명숙 전도사 · 박상준 집사 (714) 944-3080', mode: 'form',
    fields: [{ id: 'exp', label: '봉사 경험', kind: 'choice', options: ['있음', '없음'], required: false }],
  },
  {
    id: 'teacher', title: '교육부 교사 모집', category: '교육부',
    summary: '다음 세대를 함께 세워 갈 교사를 모집합니다.',
    details: '3부(오전 11시) 연합 영어중고등부 교사\n4부(낮 12시) 한어 초등부 교사', contact: '', mode: 'form',
    fields: [{ id: 'dept', label: '희망 부서', kind: 'multi', options: ['3부 연합 영어중고등부 (11시)', '4부 한어 초등부 (12시)'], required: true }],
  },
  {
    id: 'nursing', title: '양로사역 함께해요', category: '선교국',
    summary: '어르신들을 만나 사랑을 전하는 일에 함께 동참해 주세요.',
    details: '일시: 11월 21일 (토) 오후 2시 30분\n장소: 비치테라스양로원 (12282 Beach Blvd, Stanton, CA 90680)', contact: '', mode: 'form', deadline: '2026-11-21',
    fields: [{ id: 'ride', label: '이동', kind: 'choice', options: ['직접 갈게요', '라이드 드릴 수 있어요', '라이드가 필요해요'], required: false }],
  },
  {
    id: 'magnolia', title: '맥놀리아 추수감사주일 캠프 봉사자 모집', category: '교회 전체',
    summary: '맥놀리아 교육구 극빈가정 아동 초청 추수감사주일 캠프 봉사자를 모집합니다.',
    details: '뱅큇: 11월 24일 (화) – 11월 25일 (수)\n봉사자 모집: 11월 22일 (주일)', contact: '', mode: 'link', link: 'https://www.holywave.org/magnolia', deadline: '2026-11-25',
  },
  {
    id: 'saeilggun', title: '새일꾼반 신청 (상시)', category: '훈련국',
    summary: '13주 과정. 가능한 시간대에 5~6명이 모이면 반이 열립니다.',
    details: '26년 봄텀부터는 새일꾼반을 수료해야 사역팀에 합류할 수 있습니다.', contact: '', mode: 'link', link: 'https://tinyurl.com/YESGROW2627',
  },
  {
    id: 'gathering', title: '친교국 소모임 — 피클볼 · 풋살', category: '친교국',
    summary: '친교국 소모임이 열렸습니다!',
    details: '피클볼: 월요일 저녁 7–9시 @ Gardenhill Park, La Mirada\n6 vs 6 풋살: 격주 토요일 저녁 7:30–9:30 @ Urban Soccer 5 Center',
    contact: '차수빈 친교국장 (909) 569-4267 · 조창현 순장 (714) 309-5675', mode: 'link', link: 'https://yesgathering.social/',
  },
  {
    id: 'tsae', title: '연말 특새 청년대학 섬김', category: '예배국', visible: false,
    summary: '연말특별새벽부흥회에서 젊은이사역원 청년대학이 섬기는 자리에 함께해 주세요.',
    details: '12월 3일 (목) 연합 찬양인도\n12월 5일 (토) 특송\n12월 12일 (토) 식사 봉사', contact: '', mode: 'form', deadline: '2026-12-12',
    fields: [{ id: 'serve', label: '함께할 섬김', kind: 'multi', options: ['12/3 연합 찬양인도', '12/5 특송', '12/12 식사 봉사'], required: true }],
  },
];

export const SEED_IDS = new Set(BULLETIN_SEED.map((a) => a.id));
