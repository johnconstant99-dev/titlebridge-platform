import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

const MOCK_VEHICLES = [
  { vin: '1HGBH41JXMN109186', year: 2021, make: 'Honda', model: 'Civic', status: 'Titled' },
  { vin: '5YJSA1E14HF000001', year: 2017, make: 'Tesla', model: 'Model S', status: 'Pending transfer' },
];

export function VehiclesPage() {
  return (
    <div className="page">
      <PageHeader title="My Vehicles" subtitle="Registered vehicles and title status" />
      {MOCK_VEHICLES.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          description="Add a vehicle to start managing titles and records."
        />
      ) : (
        <div className="list">
          {MOCK_VEHICLES.map((v) => (
            <Card key={v.vin}>
              <div className="list-item">
                <div>
                  <strong>
                    {v.year} {v.make} {v.model}
                  </strong>
                  <p className="muted">VIN: {v.vin}</p>
                  <span className="badge">{v.status}</span>
                </div>
                <Link to={`/dashboard/vehicles/${v.vin}`} className="btn btn-sm">
                  Details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
