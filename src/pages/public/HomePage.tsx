import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';

export function HomePage() {
  return (
    <div className="page home-page">
      <PageHeader
        title="TitleBridge"
        subtitle="Secure electronic vehicle titling and vehicle records management"
      />
      <section className="hero">
        <p>
          TitleBridge provides a secure platform for electronic vehicle titles, ownership
          records, case workflows, and state integrations.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary">
            Get started
          </Link>
          <Link to="/login" className="btn btn-outline">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
