import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Loans', path: '/dashboard', disabled: true },
  { label: 'Goals', path: '/dashboard', disabled: true },
  { label: 'Analytics', path: '/dashboard', disabled: true },
  { label: 'Settings', path: '/dashboard', disabled: true },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem('spendly_token');
    localStorage.removeItem('spendly_user');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/');
  };

  return (
    <div className="dashboard-shell">
      <aside className="nav-panel">
        <div>
          <h3>Spendly</h3>
          <h2>Expense manager</h2>
        </div>

        <div className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-link ${activePath === item.path ? 'active' : ''}`}
              onClick={() => !item.disabled && navigate(item.path)}
              disabled={item.disabled}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button className="submit-btn" type="button" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
