// Expense Modal Handler
const API_BASE_URL = 'http://localhost:3000/api';
const expenseModal = document.getElementById('expenseModal');
const budgetForm = document.getElementById('budgetForm');
const expenseForm = document.getElementById('expenseForm');
const modalTabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Setup Tab Switching
modalTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        modalTabs.forEach(b => b.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked tab
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Modal Close Button
const closeBtn = document.querySelector('.modal-close');
closeBtn.addEventListener('click', closeExpenseModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === expenseModal) {
        closeExpenseModal();
    }
});

function openExpenseModal() {
    expenseModal.classList.add('active');
    loadBudgetStatus();
    loadFixedExpenses();
}

function closeExpenseModal() {
    expenseModal.classList.remove('active');
    resetForms();
}

function showError(message) {
    const errorDiv = document.getElementById('modalError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('modalSuccess');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Handle Budget Form Submission
async function handleBudgetSubmit(event) {
    event.preventDefault();

    const budgetAmount = parseFloat(document.getElementById('budgetAmount').value);

    if (budgetAmount <= 0) {
        showError('Budget must be greater than 0');
        return;
    }

    const submitBtn = budgetForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.post(`${API_BASE_URL}/expenses/budget`, {
            monthlyBudget: budgetAmount
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        showSuccess('Budget updated successfully!');
        loadBudgetStatus();
        budgetForm.reset();
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Failed to update budget';
        showError(errorMsg);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Budget';
    }
}

// Handle Fixed Expense Form Submission
async function handleExpenseSubmit(event) {
    event.preventDefault();

    const expenseType = document.getElementById('expenseType').value;
    const expenseAmount = parseFloat(document.getElementById('expenseAmount').value);

    if (!expenseType || expenseAmount <= 0) {
        showError('Please fill all fields correctly');
        return;
    }

    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.post(`${API_BASE_URL}/expenses/fixed`, {
            type: expenseType,
            amount: expenseAmount
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        showSuccess('Fixed expense added successfully!');
        expenseForm.reset();
        loadFixedExpenses();
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Failed to add expense';
        showError(errorMsg);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Expense';
    }
}

// Load and Display Budget Status
async function loadBudgetStatus() {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.get(`${API_BASE_URL}/expenses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = response.data.data;
        const budgetStatusDiv = document.getElementById('budgetStatus');
        const budgetNote = document.getElementById('budgetNote');
        const budgetAmount = document.getElementById('budgetAmount');

        // Set current budget value
        budgetAmount.value = data.monthlyBudget || '';

        // Check budget credit status
        if (data.budgetCreditUsed) {
            budgetStatusDiv.style.display = 'block';
            const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            budgetStatusDiv.innerHTML = `
                <strong>Budget Used for ${currentMonth}</strong>\n
                Your monthly budget update token has been used. You can update again next month.
            `;
            budgetForm.querySelector('button[type="submit"]').disabled = true;
            budgetNote.textContent = 'You can only update your budget once per month. Token will reset on ' + getNextMonthDate();
        } else {
            budgetStatusDiv.style.display = 'none';
            budgetForm.querySelector('button[type="submit"]').disabled = false;
            budgetNote.textContent = 'You have 1 monthly update token available.';
        }
    } catch (error) {
        console.log('Could not load budget status');
    }
}

// Load and Display Fixed Expenses
async function loadFixedExpenses() {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await axios.get(`${API_BASE_URL}/expenses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const expenses = response.data.data.fixedExpenses || [];
        const expensesList = document.getElementById('expensesList');

        if (expenses.length === 0) {
            expensesList.innerHTML = '<p style="color: #94a3b8; text-align: center;">No fixed expenses yet</p>';
            return;
        }

        const totalFixedExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        let html = `
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                <p style="color: #cbd5e1; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Fixed Expenses</p>
                <p style="color: #86efac; font-size: 20px; font-weight: 700; margin: 0;">₹${totalFixedExpenses.toFixed(2)}</p>
            </div>
        `;

        expenses.forEach(expense => {
            html += `
                <div class="expense-item">
                    <div class="expense-info">
                        <h4>${expense.type}</h4>
                        <p>Added ${new Date(expense.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                </div>
            `;
        });

        expensesList.innerHTML = html;
    } catch (error) {
        console.log('Could not load expenses');
    }
}

// Helper function to get next month date
function getNextMonthDate() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Reset Forms
function resetForms() {
    budgetForm.reset();
    expenseForm.reset();
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('modalSuccess').style.display = 'none';
}
