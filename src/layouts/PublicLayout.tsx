import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

export function PublicLayout() {
  return (
    <div className="layout layout-public">
      <Navbar variant="public" />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <p>&copy; {new Date().getFullYear()} TitleBridge. Secure electronic vehicle titling.</p>
      </footer>
    </div>
  );
}
