import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function StaffAuditPage() {
  return (
    <div className="page">
      <PageHeader title="Audit logs" subtitle="Security and operational audit trail" />
      <Card>
        <EmptyState
          title="Audit trail"
          description="Immutable logs of authentication, data access, and configuration changes will appear here."
        />
      </Card>
    </div>
  );
}
