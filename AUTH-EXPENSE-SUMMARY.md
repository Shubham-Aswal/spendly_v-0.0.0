# Auth + Expense Summary

This file documents how JWT authentication is set up, how the expense modal/button flow operates, and how expense data is stored in the backend.

## JWT Authentication Setup

- The backend uses `jsonwebtoken` and `bcryptjs`.
- User passwords are hashed in `backend/src/models/User.js` using a Mongoose `pre('save')` hook.
- Signup and login are handled in `backend/src/controllers/authController.js`.
- On successful signup or signin, the server creates a JWT with:
  - `jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' })`
  - Payload contains the authenticated user `id` and `email`
- The JWT secret is loaded from `process.env.JWT_SECRET`, with a local fallback.
- The token is returned to the frontend and stored in `localStorage` as `jwtToken`.

### Authorization flow

1. User signs up or signs in via `/api/auth/signup` or `/api/auth/signin`.
2. The backend returns a JWT token.
3. The frontend stores the token locally.
4. Protected API requests include the header:
   - `Authorization: Bearer <token>`
5. `backend/src/middleware/authMiddleware.js` verifies the token.
6. If the token is valid, `req.user` is set and request proceeds.

## Expense Button / Modal Operation

The frontend expense experience is handled by `ui/expense-modal.js`.

- The modal has two tabs:
  - `Update Budget`
  - `Add Fixed Expense`
- Opening the modal runs `openExpenseModal()`, which fetches current expense settings and fixed expenses.
- The budget form sends a `POST` request to `/api/expenses/budget`.
- The fixed expense form sends a `POST` request to `/api/expenses/fixed`.
- Each fixed expense in the list displays edit and delete buttons.
- Clicking edit opens an inline form to update the expense type and amount.
- Clicking delete shows a confirmation dialog and removes the expense.
- After successful submission, the UI refreshes:
  - `loadBudgetStatus()` updates the monthly budget display
  - `loadFixedExpenses()` refreshes the fixed expense list
- The modal displays error or success messages based on the response.

## Daily Expenses Display

The dashboard shows today's expenses that reset daily in the "Today's Expenses" card.

- `dashboard_contents.js` calls `loadDailyExpenses()` on page load.
- Fetches data from `GET /api/transactions/daily` endpoint.
- Displays total daily expenses and transaction count.
- Shows individual expense items with category, description, time, and amount.
- Automatically resets each day (server-side filtering by today's date range).

## Backend Storage and Expense Persistence

The backend stores expense data in MongoDB via Mongoose.

### Models

- `User` (`backend/src/models/User.js`)
  - `name`
  - `email`
  - `phone`
  - `password` (hashed)

- `ExpenseSetting` (`backend/src/models/ExpenseSetting.js`)
  - `user` (reference to the `User` document)
  - `monthlyBudget`
  - `budgetUpdatedAt`
  - `budgetCreditUsed`
  - `budgetCreditMonth`
  - `fixedExpenses` (array of embedded expense objects)

### Expense logic

- `getExpenseSettings()` returns the current user's expense settings.
- `updateMonthlyBudget()` updates or creates the monthly budget and enforces one update per month.
- `addFixedExpense()` appends a new fixed expense to the authenticated user's `ExpenseSetting`.
- `updateFixedExpense()` allows editing an existing fixed expense entry by its ID.
- `deleteFixedExpense()` removes a fixed expense from the user's settings by its ID.
- `getDailyExpenses()` returns only today's expense transactions (resets daily) with total and count.

### API endpoints

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/expenses`
- `POST /api/expenses/budget`
- `POST /api/expenses/fixed`
- `PUT /api/expenses/fixed/:expenseId`
- `DELETE /api/expenses/fixed/:expenseId`
- `GET /api/transactions/daily` (new - daily expenses that reset each day)

## Summary

- JWT auth is used to secure expense routes.
- The frontend stores the JWT in `localStorage` and sends it with expense requests.
- Expense settings are stored per user in MongoDB.
- Fixed expenses and budget settings are persisted on the backend and loaded back into the modal UI.
