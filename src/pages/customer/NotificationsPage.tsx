import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function NotificationsPage() {
  return (
    <div className="page">
      <PageHeader title="Notifications" subtitle="Alerts and status updates" />
      <Card>
        <EmptyState
          title="You're all caught up"
          description="New notifications about cases, titles, and account activity will show here."
        />
      </Card>
    </div>
  );
}
