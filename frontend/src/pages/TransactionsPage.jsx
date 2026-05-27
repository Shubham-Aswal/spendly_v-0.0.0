import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const categoryOptions = [
  { label: 'Food', value: 'Food' },
  { label: 'Cab', value: 'Cab' },
  { label: 'Grocery', value: 'Grocery' },
  { label: 'Other', value: 'Other' },
];

const getWeekNumber = (dateString) => {
  const date = new Date(dateString);
  return Math.floor((date.getDate() - 1) / 7) + 1;
};

const getMonthDays = (date = new Date()) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const getHeatColor = (amount, safeSpendLimit) => {
  if (!amount) return 'neutral';
  if (!safeSpendLimit || safeSpendLimit <= 0) return 'neutral';

  const ratio = amount / safeSpendLimit;
  if (ratio <= 0.5) return 'green';
  if (ratio <= 1) return 'yellow';
  return 'red';
};

const formatDay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

function TransactionsPage() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('spendly_token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSummary = async () => {
    const response = await axios.get('http://localhost:3000/api/dashboard');
    setSummary(response.data.summary || null);
  };

  const fetchTransactions = async () => {
    const response = await axios.get('http://localhost:3000/api/transactions');
    setTransactions(response.data.transactions || []);
  };

  const fetchHeatmap = async () => {
    const response = await axios.get('http://localhost:3000/api/transactions/heatmap');
    setHeatmap(response.data.heatmap || []);
  };

  const fetchPageData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchSummary(), fetchTransactions(), fetchHeatmap()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to load transaction data.');
    } finally {
      setLoading(false);
    }
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const transactionDescription = category === 'Other' ? description.trim() : category;
    if (category === 'Other' && !transactionDescription) {
      setError('Please enter an expense name when selecting Other.');
      setSubmitting(false);
      return;
    }

    try {
      await axios.post('http://localhost:3000/api/transactions', {
        type: 'expense',
        category,
        amount: Number(amount),
        description: transactionDescription,
      });

      setSuccess('Transaction recorded and balance updated.');
      setDescription('');
      setAmount('');
      await fetchPageData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const weekCount = useMemo(() => Math.ceil(getMonthDays() / 7), []);

  const visibleTransactions = useMemo(() => {
    if (selectedWeek === 0) return transactions;
    return transactions.filter((transaction) => getWeekNumber(transaction.date) === selectedWeek);
  }, [selectedWeek, transactions]);

  const weekTotal = useMemo(
    () => visibleTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [visibleTransactions]
  );

  const displayedHeatmap = useMemo(() => {
    if (selectedWeek === 0) return heatmap;
    return heatmap.filter((entry) => getWeekNumber(entry.date) === selectedWeek);
  }, [heatmap, selectedWeek]);

  const heatmapWeeks = useMemo(
    () => Array.from({ length: weekCount }, (_, index) => index + 1),
    [weekCount]
  );

  return (
    <div>
      <div className="transactions-page-header">
        <div>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>Transactions</p>
          <h1>Daily spend</h1>
        </div>

        <div className="summary-badges">
          <div className="summary-badge">
            <span>{selectedWeek === 0 ? 'Month spend total' : `Week ${selectedWeek} total`}</span>
            <strong>₹ {weekTotal.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {error && <div className="message error" style={{ marginTop: 20 }}>{error}</div>}
      {success && <div className="message success" style={{ marginTop: 20 }}>{success}</div>}
      {loading && <div style={{ marginTop: 20 }}>Loading...</div>}

      <section className="card" style={{ marginTop: 24 }}>
        <div className="transactions-panel">
          <div className="heatmap-panel">
            <div className="list-header" style={{ marginBottom: 18 }}>
              <div>
                <h2>Heatmap</h2>
              </div>
            </div>

            <div className="week-controls">
              <button
                type="button"
                className={`toggle-button ${selectedWeek === 0 ? 'active' : ''}`}
                onClick={() => setSelectedWeek(0)}
              >
                Full month
              </button>
              {heatmapWeeks.map((week) => (
                <button
                  key={week}
                  type="button"
                  className={`toggle-button ${selectedWeek === week ? 'active' : ''}`}
                  onClick={() => setSelectedWeek(week)}
                >
                  Week {week}
                </button>
              ))}
            </div>

            <div className="legend-row">
              <span className="heatmap-legend green">Good</span>
              <span className="heatmap-legend yellow">Warning</span>
              <span className="heatmap-legend red">Over</span>
            </div>

            <div className="heatmap-grid">
              {displayedHeatmap.map((entry) => {
                const label = getHeatColor(entry.total, summary?.safeSpendLimit);
                return (
                  <div key={entry.date} className={`heatmap-cell ${label}`}>
                    <div>
                      <strong>{formatDay(entry.date)}</strong>
                      <small style={{ color: '#475569' }}>{entry.total ? `₹ ${entry.total}` : 'No spend'}</small>
                    </div>
                    {entry.total > 0 && (
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.total <= (summary?.safeSpendLimit || 0) ? 'On track' : 'Over limit'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="expense-form-panel">
            <div className="list-header" style={{ marginBottom: 18 }}>
              <div>
                <h2>Add expense</h2>
              </div>
            </div>

            <form className="drawer-form" onSubmit={submitTransaction}>
              <div className="field-group category-group">
                <label>Expense category</label>
                <div className="category-options">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`category-chip ${category === option.value ? 'active' : ''}`}
                      onClick={() => {
                        setCategory(option.value);
                        if (option.value !== 'Other') {
                          setDescription('');
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {category === 'Other' ? (
                <div className="field-group">
                  <label>Expense name</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter expense name"
                    required
                  />
                </div>
              ) : (
                <div className="field-group">
                  <label>Expense name</label>
                  <input
                    type="text"
                    value={category}
                    readOnly
                  />
                </div>
              )}

              <div className="field-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Add expense'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <div className="list-header" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>Transactions</h2>
          </div>
          <span className="filter-pill">
            {selectedWeek === 0 ? 'Full month' : `Week ${selectedWeek}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18, color: '#475569' }}>
          <span>{visibleTransactions.length} transactions</span>
          <span>· ₹ {weekTotal.toFixed(2)} spent</span>
        </div>

        <div className="list-group" style={{ marginTop: 18 }}>
          {visibleTransactions.length === 0 ? (
            <div className="card">No transactions for this period.</div>
          ) : (
            visibleTransactions.map((transaction) => (
              <div key={transaction._id} className="list-item">
                <div>
                  <strong>{transaction.description || transaction.category || 'Expense'}</strong>
                  <small>{new Date(transaction.date).toLocaleDateString()} · {transaction.category}</small>
                </div>
                <span>₹ {transaction.amount}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default TransactionsPage;
