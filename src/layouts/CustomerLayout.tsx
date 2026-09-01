import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

export function CustomerLayout() {
  return (
    <div className="layout layout-customer">
      <Navbar variant="customer" />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
