# Spendly v-0.0.0

A beta version of a payment app designed to help students manage their money and track expenses effectively.

## Purpose

This application aims to solve the problem of financial management for students by providing tools to calculate daily safe spending amounts based on total balance, fixed expenses, and remaining days in the month. It helps prevent overspending and promotes better budgeting habits.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)

## API Endpoints

### Budget Tracker

The budget tracker automatically calculates and maintains current balance, daily safe spending limits, and budget status.

#### Get Budget Tracker
```
GET /api/budget-tracker
```
Returns the current budget tracker data for the authenticated user.

**Query Parameters:**
- `month` (optional): Month in YYYY-MM format (defaults to current month)

**Response:**
```json
{
  "budgetTracker": {
    "monthlyBudget": 5000,
    "totalFixedExpenses": 1700,
    "currentBalance": 3220,
    "dailySafeSpent": 206.25,
    "remainingDaysInMonth": 16,
    "totalTransactionsThisMonth": 80
  },
  "summary": {
    "monthlyBudget": 5000,
    "totalFixedExpenses": 1700,
    "totalTransactionsThisMonth": 80,
    "currentBalance": 3220,
    "dailySafeSpent": 206.25,
    "remainingDaysInMonth": 16
  }
}
```

#### Update Budget Tracker
```
PUT /api/budget-tracker/update
```
Manually updates transaction totals and recalculates balance.

#### Sync Budget Tracker
```
PUT /api/budget-tracker/sync
```
Syncs budget tracker with latest expense settings.

#### Get Budget Summary
```
GET /api/budget-tracker/summary
```
Returns a simplified budget summary for the current month including today's spending.

### Calculations

- **Current Balance** = Monthly Budget - Total Fixed Expenses - Total Transactions This Month
- **Daily Safe Spent** = Current Balance / Remaining Days in Month
- **Remaining Days** = Days left in current month (calculated automatically)

The budget tracker automatically updates when:
- New transactions are created
- Expense settings are modified (budget or fixed expenses)
- Monthly transitions occur

## Contributors

- Shubham Aswal
- Reyyan
- Kanav Jethi
- Nikhil Moolya

For detailed contributions, see [contributors.md](contributors.md).

## About Database

Backend & Persistence: Spendly uses MongoDB with Mongoose ODM for data persistence. The database stores user information, expense settings, transactions, and budget tracking data. The budget tracker automatically maintains current balance calculations and daily safe spending limits based on monthly budgets, fixed expenses, and transaction history.

**Key Collections:**
- `users`: User authentication and profile data
- `expensesettings`: Monthly budgets and fixed expenses
- `transactions`: All income and expense records
- `budgettrackers`: Calculated budget status and daily limits
- `loans`: Loan information and payments
- `monthlyheatmaps`: Expense visualization data


