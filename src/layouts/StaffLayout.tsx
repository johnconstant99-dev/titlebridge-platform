import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

export function StaffLayout() {
  return (
    <div className="layout layout-staff">
      <Navbar variant="staff" />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
