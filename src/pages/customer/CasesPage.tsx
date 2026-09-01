import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

const MOCK_CASES = [
  {
    caseId: 'CASE-2026-00142',
    title: 'Title transfer – Honda Civic',
    status: 'in_progress' as const,
  },
  {
    caseId: 'CASE-2026-00098',
    title: 'Lien release request',
    status: 'pending' as const,
  },
];

export function CasesPage() {
  return (
    <div className="page">
      <PageHeader title="My Cases" subtitle="Title and service workflows" />
      {MOCK_CASES.length === 0 ? (
        <EmptyState title="No open cases" description="Cases appear here when you start a title or service request." />
      ) : (
        <div className="list">
          {MOCK_CASES.map((c) => (
            <Card key={c.caseId}>
              <div className="list-item">
                <div>
                  <strong>{c.title}</strong>
                  <p className="muted">{c.caseId}</p>
                  <span className="badge">{c.status.replace('_', ' ')}</span>
                </div>
                <Link to={`/dashboard/cases/${c.caseId}`} className="btn btn-sm">
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
