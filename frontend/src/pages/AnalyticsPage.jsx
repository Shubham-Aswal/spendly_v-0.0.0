import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const formatCurrency = (value) => `₹ ${Number(value || 0).toFixed(2)}`;

const getFormattedDate = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const sortCategoryEntries = (breakdown) => {
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
};

const isRecentSummaryValid = () => {
  try {
    const stored = localStorage.getItem('spendly_analytics_last_generated');
    if (!stored) return false;
    const timestamp = Number(stored);
    return Number.isFinite(timestamp) && Date.now() - timestamp < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const loadCachedAnalytics = () => {
  try {
    const stored = localStorage.getItem('spendly_analytics_last_report');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveAnalyticsCache = (data) => {
  try {
    localStorage.setItem('spendly_analytics_last_generated', String(Date.now()));
    localStorage.setItem('spendly_analytics_last_report', JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
};

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('spendly_token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const cached = loadCachedAnalytics();
    const recent = isRecentSummaryValid();

    if (recent && cached) {
      setAnalytics(cached);
      setMessage('You have already generated your monthly AI financial summary within the last 24 hours. Showing your cached report.');
      setLoading(false);
      return;
    }

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.get('http://localhost:3000/api/analytics');
      const payload = response.data;
      setAnalytics(payload);
      saveAnalyticsCache(payload);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('spendly_token');
        navigate('/');
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const categoryRows = useMemo(() => {
    if (!analytics?.categoryBreakdown) return [];
    return sortCategoryEntries(analytics.categoryBreakdown);
  }, [analytics]);

  const topTransactions = useMemo(() => {
    if (!analytics?.transactions) return [];
    return analytics.transactions.slice(0, 6);
  }, [analytics]);

  return (
    <div className="dashboard-main">
      <div>
        <div className="dashboard-top">
          <div>
            <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>
              AI analytics
            </p>
            <h1>Monthly summary</h1>
          </div>
        </div>

        {message && <div className="message success" style={{ margin: '20px 0' }}>{message}</div>}
        {error && <div className="message error" style={{ margin: '20px 0' }}>{error}</div>}
        {loading && <div style={{ margin: '20px 0' }}>Loading analytics...</div>}

        {analytics && (
          <>
            <section className="dashboard-cards" style={{ marginTop: 18 }}>
              <div className="card card-highlight">
                <h2>Month</h2>
                <p>{analytics.month}</p>
                <span className="chip">Summary period</span>
              </div>
              <div className="card card-highlight">
                <h2>Income</h2>
                <p>{formatCurrency(analytics.income)}</p>
                <span className="chip">Total earned</span>
              </div>
              <div className="card card-highlight">
                <h2>Expenses</h2>
                <p>{formatCurrency(analytics.expenses)}</p>
                <span className="chip">Total spend</span>
              </div>
            </section>

            <section className="dashboard-cards" style={{ marginTop: 18 }}>
              <div className="card card-highlight">
                <h2>Savings</h2>
                <p>{formatCurrency(analytics.savings)}</p>
                <span className="chip">Net savings</span>
              </div>
              <div className="card card-highlight">
                <h2>Safe spend</h2>
                <p>{formatCurrency(analytics.safeSpendLimit)}</p>
                <span className="chip">Daily limit</span>
              </div>
              <div className="card card-highlight">
                <h2>Budget usage</h2>
                <p>{analytics.safeSpendUsed}%</p>
                <span className="chip">Safe limit paced</span>
              </div>
            </section>

            <div className="dashboard-actions" style={{ marginTop: 24 }}>
              <div className="action-card">
                <div>
                  <h3>Top spending categories</h3>
                  <p>Review where the most money went this month.</p>
                </div>
              </div>
            </div>

            <section className="card" style={{ marginTop: 24 }}>
              {categoryRows.length > 0 ? (
                categoryRows.map(([category, amount]) => (
                  <div key={category} className="list-item" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{category}</strong>
                      <small>{((amount / analytics.expenses) * 100 || 0).toFixed(0)}% of expenses</small>
                    </div>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                ))
              ) : (
                <p>No category breakdown available for this month.</p>
              )}
            </section>

            <div className="dashboard-actions" style={{ marginTop: 24 }}>
              <div className="action-card">
                <div>
                  <h3>Loan overview</h3>
                  <p>Monthly EMI burden and active credit obligations.</p>
                </div>
              </div>
            </div>

            <section className="card" style={{ marginTop: 24 }}>
              {analytics.loans.length > 0 ? (
                analytics.loans.map((loan, index) => (
                  <div key={`${loan.loanName}-${index}`} className="fixed-item">
                    <div>
                      <strong>{loan.loanName}</strong>
                      <small>{loan.interestRate}% interest</small>
                    </div>
                    <div className="fixed-item-meta">
                      <span className="fixed-amount">₹ {loan.monthlyEMI.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>No loan data found.</p>
              )}
            </section>

            <section className="card" style={{ marginTop: 24 }}>
              <div className="fixed-expense-header">
                <div>
                  <h2>Recent transactions</h2>
                  <p style={{ margin: 0, color: '#64748b' }}>Most recent activity from the current month.</p>
                </div>
              </div>
              <div className="fixed-expense-list">
                {topTransactions.length > 0 ? (
                  topTransactions.map((tx, index) => (
                    <div key={`${tx.title}-${index}`} className="fixed-item">
                      <div>
                        <strong>{tx.title}</strong>
                        <small>{getFormattedDate(tx.date)} · {tx.type}</small>
                      </div>
                      <div className="fixed-item-meta">
                        <span className="fixed-amount">{formatCurrency(tx.amount)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No recent transactions available.</p>
                )}
              </div>
            </section>

            <section className="card" style={{ marginTop: 24 }}>
              <div className="fixed-expense-header">
                <div>
                  <h2>Behavioral insights</h2>
                </div>
                <div className="fixed-expense-meta">
                  <span className="chip">Weekend overspending: {analytics.behavioralData.weekendOverspending ? 'Yes' : 'No'}</span>
                  <span className="chip">Late-night spend: {analytics.behavioralData.lateNightSpending ? 'Yes' : 'No'}</span>
                  <span className="chip">Frequent small transactions: {analytics.behavioralData.frequentSmallTransactions ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="list-group" style={{ marginTop: 18 }}>
                <div className="list-item">
                  <div>
                    <strong>Safe spend exceeded days</strong>
                    <small>Days above the safe daily limit so far.</small>
                  </div>
                  <span>{analytics.behavioralData.safeSpendExceededDays}</span>
                </div>
                <div className="list-item">
                  <div>
                    <strong>Expense change vs previous month</strong>
                    <small>Growth in spending compared to last month.</small>
                  </div>
                  <span>{analytics.previousMonthComparison.expenseChangePercent}%</span>
                </div>
                <div className="list-item">
                  <div>
                    <strong>Savings change vs previous month</strong>
                    <small>Net savings performance.</small>
                  </div>
                  <span>{analytics.previousMonthComparison.savingsChangePercent}%</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
