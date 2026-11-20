import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/libre-franklin/wght.css';
import './globals.css';

export const metadata = {
  title: '모집·신청 · 남가주 사랑의교회',
  description: '남가주 사랑의교회 모집 광고를 한곳에서 보고 바로 신청하세요.',
  robots: { index: false, follow: false },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
