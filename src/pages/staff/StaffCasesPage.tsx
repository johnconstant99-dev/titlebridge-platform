import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function StaffCasesPage() {
  return (
    <div className="page">
      <PageHeader title="Cases" subtitle="Work queues and case management" />
      <Card>
        <EmptyState
          title="Case queue"
          description="Assign, process, and close title and service cases. Backend integration pending."
        />
      </Card>
    </div>
  );
}
