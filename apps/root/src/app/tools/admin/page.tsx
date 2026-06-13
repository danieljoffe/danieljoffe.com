import { redirect } from 'next/navigation';

export default function ToolsAdminIndex() {
  redirect('/tools/admin/audit');
}
