import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function TermsPage() {
  return (
    <div className="page">
      <PageHeader title="Terms of Service" />
      <Card>
        <p>
          These Terms of Service govern use of the TitleBridge platform for electronic
          vehicle titling and records management. This is a placeholder for the complete
          legal terms.
        </p>
        <p>
          By using TitleBridge you agree to these terms and applicable state regulations
          for vehicle title transactions.
        </p>
      </Card>
    </div>
  );
}
