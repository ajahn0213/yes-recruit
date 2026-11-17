// 링크가 있는 모집: 몇 명이 눌렀는지 세고 원래 신청 페이지로 보냄
import { NextResponse } from 'next/server';
import { getAd, bumpClicks, hasStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { id } = await params;
  const home = new URL('/', req.url);
  if (!hasStore) return NextResponse.redirect(home);
  const ad = await getAd(id);
  if (!ad?.link || !ad.visible) return NextResponse.redirect(ad ? new URL('/r/' + ad.id, req.url) : home);
  // 미리보기 봇(카톡·문자 링크 미리보기)은 세지 않음
  const ua = req.headers.get('user-agent') || '';
  if (!/bot|crawl|spider|preview|kakaotalk-scrap|facebookexternalhit|slack|whatsapp/i.test(ua)) await bumpClicks(id);
  return NextResponse.redirect(ad.link, 302);
}
