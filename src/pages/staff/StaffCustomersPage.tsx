import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function StaffCustomersPage() {
  return (
    <div className="page">
      <PageHeader title="Customers" subtitle="Customer account management" />
      <Card>
        <EmptyState
          title="Customer directory"
          description="Search, view, and manage customer profiles. Backend integration pending."
        />
      </Card>
    </div>
  );
}
