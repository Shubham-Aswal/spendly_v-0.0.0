import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [expenseSetting, setExpenseSetting] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('budget');
  const [budgetValue, setBudgetValue] = useState('');
  const [fixedType, setFixedType] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [userName, setUserName] = useState(() => {
    try {
      const saved = localStorage.getItem('spendly_user');
      return saved ? JSON.parse(saved).name : 'Spendly user';
    } catch {
      return 'Spendly user';
    }
  });
  const [greeting, setGreeting] = useState(getTimeBasedGreeting());

  const navigate = useNavigate();
  const token = localStorage.getItem('spendly_token');

  const canUpdateBudget = useMemo(() => token || summary?.totalBudget === 1, [token, summary]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:3000/api/dashboard');
      if (res?.data?.summary) {
        setSummary(res.data.summary);
        setExpenseSetting(res.data.expenseSetting || null);
        setTransactions(res.data.transactions || []);
        setUserName(res.data.user?.name || 'Spendly user');
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('spendly_token');
        navigate('/');
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (mode = 'budget') => {
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setBudgetValue('');
    setFixedType('');
    setFixedAmount('');
  };

  const submitBudget = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/expenses/budget', { monthlyBudget: Number(budgetValue) });
      await fetchDashboard();
      closeDrawer();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to update budget');
    }
  };

  const submitFixed = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/expenses/fixed', { type: fixedType, amount: Number(fixedAmount) });
      await fetchDashboard();
      closeDrawer();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to add fixed expense');
    }
  };

  return (
    <div className="dashboard-main">
      <div>
        <div className="dashboard-top">
          <div>
            <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>
              {greeting}, {userName}
            </p>
            <h1>Dashboard</h1>
          </div>
        </div>

        {error && <div style={{ margin: '16px 0' }} className="message error">{error}</div>}
        {loading && <div style={{ margin: '16px 0' }}>Loading...</div>}

        {summary && (
          <>
            <div className="dashboard-cards">
              <section className="card card-highlight">
                <h2>Available balance</h2>
                <p>₹ {summary.currentBalance}</p>
                <span className="chip">Current balance</span>
              </section>
              <section className="card card-highlight">
                <h2>Monthly budget</h2>
                <p>₹ {summary.totalBudget}</p>
                <span className="chip">Budget tracked</span>
              </section>
              <section className="card card-highlight">
                <h2>Safe spend</h2>
                <p>₹ {summary.safeSpendLimit}/day</p>
                <span className="chip">Daily safe limit</span>
              </section>
            </div>

            <div className="dashboard-actions">
              <div className="action-card">
                <div>
                  <h3>Budget</h3>
                </div>
                <div className="action-buttons">
                  {canUpdateBudget && (
                    <button className="action-btn" onClick={() => openDrawer('budget')}>
                      Update budget
                    </button>
                  )}
                  <button className="action-btn secondary" onClick={() => openDrawer('fixed')}>
                    Add fixed expense
                  </button>
                </div>
              </div>
            </div>

            <section className="card" style={{ marginTop: 24 }}>
              <div className="fixed-expense-header">
                <div>
                  <h2>Fixed expenses</h2>
                </div>
                <div className="fixed-expense-meta">
                  <span className="chip">Total fixed ₹ {summary.totalFixedExpenses}</span>
                </div>
              </div>

              {expenseSetting?.fixedExpenses?.length > 0 ? (
                <div className="fixed-expense-list">
                  {expenseSetting.fixedExpenses.map((fixed) => (
                    <div key={fixed._id || `${fixed.type}-${fixed.amount}`} className="fixed-item">
                      <div>
                        <strong>{fixed.type}</strong>
                        <small>Added {new Date(fixed.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div className="fixed-item-meta">
                        <span className="fixed-amount">₹ {fixed.amount}</span>
                        <button
                          className="delete-btn"
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm('Delete this fixed expense?');
                            if (!confirmed) return;
                            try {
                              await axios.delete(`http://localhost:3000/api/expenses/fixed/${fixed._id}`);
                              await fetchDashboard();
                            } catch (err) {
                              setError(err?.response?.data?.message || err.message || 'Unable to delete fixed expense');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ marginTop: 18 }}>
                  No fixed expenses yet.
                </div>
              )}
            </section>
          </>
        )}

        <h2 className="section-title">Recent activity</h2>
        <div className="list-group">
          {transactions.length === 0 && <div className="card">No recent transactions</div>}
          {transactions.map((t) => (
            <div key={t._id} className="list-item">
              <div>
                <strong>{t.description || t.category || 'Transaction'}</strong>
                <small>{new Date(t.date).toLocaleDateString()} · {t.type}</small>
              </div>
              <span>₹ {t.amount}</span>
            </div>
          ))}
        </div>

        <div className={`drawer-backdrop ${drawerOpen ? 'active' : ''}`} onClick={closeDrawer} />
        <aside className={`drawer-panel ${drawerOpen ? 'active' : ''}`}>
          <div className="drawer-header">
            <div>
              <p className="eyebrow">{drawerMode === 'budget' ? 'Budget update' : 'Fixed expense'}</p>
              <h2>{drawerMode === 'budget' ? 'Update monthly budget' : 'Add a new fixed expense'}</h2>
            </div>
            <button className="drawer-close" onClick={closeDrawer}>&times;</button>
          </div>
          <div className="drawer-body">
            {drawerMode === 'budget' ? (
              <form className="drawer-form" onSubmit={submitBudget}>
                <div className="field-group">
                  <label>Monthly Budget (₹)</label>
                  <input
                    type="number"
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <button className="submit-btn" type="submit">Save budget</button>
              </form>
            ) : (
              <form className="drawer-form" onSubmit={submitFixed}>
                <div className="field-group">
                  <label>Expense name</label>
                  <input
                    value={fixedType}
                    onChange={(e) => setFixedType(e.target.value)}
                    placeholder="Rent, utilities, subscription"
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <button className="submit-btn" type="submit">Add expense</button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;
