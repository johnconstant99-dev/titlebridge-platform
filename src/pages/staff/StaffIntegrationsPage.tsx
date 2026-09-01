import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function StaffIntegrationsPage() {
  return (
    <div className="page">
      <PageHeader title="Integrations" subtitle="External systems and data exchanges" />
      <Card title="Connected systems">
        <p>
          Placeholder for DMV interfaces, lienholder feeds, identity providers, and other
          third-party integrations.
        </p>
      </Card>
    </div>
  );
}
