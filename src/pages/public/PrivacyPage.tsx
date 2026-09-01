import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';

export function PrivacyPage() {
  return (
    <div className="page">
      <PageHeader title="Privacy Policy" />
      <Card>
        <p>
          TitleBridge is committed to protecting your privacy. This page is a placeholder
          for the full privacy policy governing collection, use, and protection of personal
          and vehicle-related data.
        </p>
        <p>
          Contact privacy@titlebridge.example for questions about our data practices.
        </p>
      </Card>
    </div>
  );
}
