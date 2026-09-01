import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.firstName ?? 'Customer'}`}
      />
      <div className="grid grid-3">
        <Card title="Vehicles">
          <p>Manage your registered vehicles and titles.</p>
          <Link to="/dashboard/vehicles" className="btn btn-sm">
            View vehicles
          </Link>
        </Card>
        <Card title="Cases">
          <p>Track title transfers, liens, and service requests.</p>
          <Link to="/dashboard/cases" className="btn btn-sm">
            View cases
          </Link>
        </Card>
        <Card title="Documents">
          <p>Access title documents and supporting files.</p>
          <Link to="/dashboard/documents" className="btn btn-sm">
            View documents
          </Link>
        </Card>
      </div>
    </div>
  );
}
