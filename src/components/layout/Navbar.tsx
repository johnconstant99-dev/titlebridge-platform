import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
  variant?: 'public' | 'customer' | 'staff';
}

export function Navbar({ variant = 'public' }: NavbarProps) {
  const { user, logout, isStaff } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to={variant === 'staff' ? '/staff' : variant === 'customer' ? '/dashboard' : '/'}>
          TitleBridge
        </Link>
      </div>

      <nav className="navbar-nav" aria-label="Main">
        {variant === 'public' && (
          <>
            <NavLink to="/login">Sign in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}

        {variant === 'customer' && (
          <>
            <NavLink to="/dashboard" end>
              Dashboard
            </NavLink>
            <NavLink to="/dashboard/vehicles">Vehicles</NavLink>
            <NavLink to="/dashboard/cases">Cases</NavLink>
            <NavLink to="/dashboard/documents">Documents</NavLink>
            <NavLink to="/dashboard/notifications">Notifications</NavLink>
            <NavLink to="/dashboard/profile">Profile</NavLink>
          </>
        )}

        {variant === 'staff' && (
          <>
            <NavLink to="/staff" end>
              Dashboard
            </NavLink>
            <NavLink to="/staff/customers">Customers</NavLink>
            <NavLink to="/staff/vehicles">Vehicles</NavLink>
            <NavLink to="/staff/cases">Cases</NavLink>
            <NavLink to="/staff/integrations">Integrations</NavLink>
            <NavLink to="/staff/states">States</NavLink>
            <NavLink to="/staff/audit">Audit Logs</NavLink>
            <NavLink to="/staff/settings">Settings</NavLink>
          </>
        )}
      </nav>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user">
              {user.firstName} {user.lastName}
              {isStaff && <span className="badge">Staff</span>}
            </span>
            {isStaff && variant === 'customer' && (
              <Link to="/staff" className="btn btn-sm">
                Staff Portal
              </Link>
            )}
            {variant === 'staff' && (
              <Link to="/dashboard" className="btn btn-sm">
                Customer View
              </Link>
            )}
            <button type="button" className="btn btn-outline" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
