import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function VehicleDetailPage() {
  const { vin } = useParams<{ vin: string }>();

  return (
    <div className="page">
      <PageHeader
        title="Vehicle details"
        subtitle={vin ? `VIN: ${vin}` : 'Unknown vehicle'}
        actions={
          <Link to="/dashboard/vehicles" className="btn btn-outline btn-sm">
            Back to vehicles
          </Link>
        }
      />
      <Card title="Title & ownership">
        <p>
          Placeholder for electronic title status, ownership history, liens, and related
          case activity for VIN <code>{vin}</code>.
        </p>
      </Card>
    </div>
  );
}
