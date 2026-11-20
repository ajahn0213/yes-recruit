import { redirect } from 'next/navigation';
import { adminSession } from '@/lib/auth';
import { hasStore } from '@/lib/store';
import AdminApp from '@/components/AdminApp';

export const dynamic = 'force-dynamic';
export const metadata = { title: '모집·신청 관리' };

export default async function Admin() {
  if (!(await adminSession())) redirect('/admin/login');
  if (!hasStore) {
    return <div className="narrow" style={{ paddingTop: 60 }}><p className="note warn">Upstash Redis(KV_REST_API_URL, KV_REST_API_TOKEN)가 연결되지 않았습니다. Vercel → Storage에서 연결한 뒤 다시 배포해 주세요.</p></div>;
  }
  return <AdminApp appUrl={(process.env.APP_URL || '').replace(/\/$/, '')} />;
}
