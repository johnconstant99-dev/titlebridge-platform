import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function StaffDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <PageHeader
        title="Staff Dashboard"
        subtitle={`Signed in as ${user?.firstName} ${user?.lastName} (${user?.role})`}
      />
      <div className="grid grid-3">
        <Card title="Customers">
          <p>Search and manage customer accounts.</p>
          <Link to="/staff/customers" className="btn btn-sm">
            Open
          </Link>
        </Card>
        <Card title="Vehicles">
          <p>Platform-wide vehicle and title records.</p>
          <Link to="/staff/vehicles" className="btn btn-sm">
            Open
          </Link>
        </Card>
        <Card title="Cases">
          <p>Work queues and case management.</p>
          <Link to="/staff/cases" className="btn btn-sm">
            Open
          </Link>
        </Card>
        <Card title="Integrations">
          <p>External systems and data exchanges.</p>
          <Link to="/staff/integrations" className="btn btn-sm">
            Open
          </Link>
        </Card>
        <Card title="State configuration">
          <p>State rules and title configurations.</p>
          <Link to="/staff/states" className="btn btn-sm">
            Open
          </Link>
        </Card>
        <Card title="Audit logs">
          <p>Security and operational audit trail.</p>
          <Link to="/staff/audit" className="btn btn-sm">
            Open
          </Link>
        </Card>
      </div>
    </div>
  );
}
