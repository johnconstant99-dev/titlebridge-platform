import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Link } from 'react-router-dom';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <PageHeader
        title="Profile"
        subtitle="Your account information"
        actions={
          <Link to="/dashboard/security" className="btn btn-outline btn-sm">
            Security settings
          </Link>
        }
      />
      <Card title="Account">
        <dl className="detail-list">
          <dt>Name</dt>
          <dd>
            {user?.firstName} {user?.lastName}
          </dd>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
          <dt>Role</dt>
          <dd>{user?.role}</dd>
        </dl>
      </Card>
    </div>
  );
}
