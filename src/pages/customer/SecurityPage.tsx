import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Link } from 'react-router-dom';

export function SecurityPage() {
  return (
    <div className="page">
      <PageHeader
        title="Security"
        subtitle="Password and account security"
        actions={
          <Link to="/dashboard/profile" className="btn btn-outline btn-sm">
            Back to profile
          </Link>
        }
      />
      <Card title="Password">
        <p>Password change and multi-factor authentication settings will be available here.</p>
        <button type="button" className="btn btn-sm" disabled>
          Change password (coming soon)
        </button>
      </Card>
    </div>
  );
}
