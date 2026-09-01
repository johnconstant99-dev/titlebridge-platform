import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function StaffSettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Platform and staff preferences" />
      <Card title="General">
        <p>Organization settings, notification defaults, and staff preferences.</p>
      </Card>
    </div>
  );
}
