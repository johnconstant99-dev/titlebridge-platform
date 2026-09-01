import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function StaffStatesPage() {
  return (
    <div className="page">
      <PageHeader title="State configuration" subtitle="State rules and title configurations" />
      <Card title="Jurisdictions">
        <p>
          Placeholder for per-state title rules, forms, fees, and electronic titling
          program settings.
        </p>
      </Card>
    </div>
  );
}
