import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();

  return (
    <div className="page">
      <PageHeader
        title="Case details"
        subtitle={caseId ?? 'Unknown case'}
        actions={
          <Link to="/dashboard/cases" className="btn btn-outline btn-sm">
            Back to cases
          </Link>
        }
      />
      <Card title="Workflow status">
        <p>
          Placeholder for case timeline, assigned staff, required documents, and status
          updates for case <code>{caseId}</code>.
        </p>
      </Card>
    </div>
  );
}
