import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export function DocumentsPage() {
  return (
    <div className="page">
      <PageHeader title="Documents" subtitle="Title documents and supporting files" />
      <Card>
        <EmptyState
          title="No documents yet"
          description="Uploaded and issued documents will appear here."
        />
      </Card>
    </div>
  );
}
