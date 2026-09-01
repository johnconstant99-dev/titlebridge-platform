import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function StaffVehiclesPage() {
  return (
    <div className="page">
      <PageHeader title="Vehicles" subtitle="Platform vehicle and title records" />
      <Card>
        <EmptyState
          title="Vehicle registry"
          description="Search vehicles by VIN, owner, or title status. Backend integration pending."
        />
      </Card>
    </div>
  );
}
