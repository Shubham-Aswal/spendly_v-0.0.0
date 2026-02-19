# spently_v-0.0.0
<p>a beta version of a payment app which helps students manage money and trac their expensis</p>

## Function Explanations

Based on the code in `logic.js` and `main.js`, this appears to be a simple budgeting application that helps users calculate their daily safe spending amount based on their total balance, fixed expenses, and remaining days in the month. Below is a detailed explanation of each exported function in `logic.js`, including:

- **What values it takes as input** (parameters).
- **What it returns**.
- **How other developers should use it** to process values from the frontend (e.g., user inputs from forms or UI elements) and display results to the user.
- **Example usage** based on the code in `main.js`.

These functions are designed to be modular and reusable. Frontend developers can call them with data collected from the UI (e.g., via HTML inputs), process the calculations, and update the UI to show results like remaining balance or daily spend limits.

### 1. `fixedExpensis(...fixData)`
   - **Purpose**: Calculates the total sum of all fixed expenses or goals provided as arguments. This is useful for aggregating multiple recurring costs (e.g., rent, utilities, subscriptions) into a single total.
   - **Input Values**:
     - `...fixData`: A rest parameter that accepts any number of numeric values (e.g., individual expense amounts like 100, 200, 50). Each value should be a positive number representing a fixed expense. If no values are provided, it defaults to summing an empty array (resulting in 0).
   - **Return Value**: A single number (the total sum of all provided expenses). If no expenses are passed, returns 0.
   - **Usage for Frontend Integration**:
     - Collect fixed expense values from the frontend (e.g., via multiple input fields or a list where users add expenses dynamically).
     - Pass them as arguments to this function to get the total fixed expenses.
     - Use the result in further calculations (e.g., subtracting from balance) and display it to the user (e.g., "Total Fixed Expenses: $X").
     - **Example**: If a user enters expenses like rent ($500), groceries ($200), and utilities ($100), call `fixedExpensis(500, 200, 100)` to get 800. Display this total in the UI.
   - **Code Example from `main.js`**:
     ```javascript
     let fixedExpense = fixedExpensis(1, 2, 3, 4, 5);  // Returns 15 (sum of 1+2+3+4+5)
     ```

### 2. `remDays()`
   - **Purpose**: Calculates the number of days remaining in the current month, including the current day. This helps determine how many days are left for spending calculations.
   - **Input Values**: None (no parameters required). It uses the current date automatically via `new Date()`.
   - **Return Value**: A number representing the days left in the month (inclusive of today). For example, if today is the 15th of a 30-day month, it returns 16 (30 - 15 + 1, but the code actually does 30 - 15 = 15, wait—looking closely: `let date = daysInmonth - d.getDate();` returns days remaining *excluding* today? Wait, the comment says "including the current day," but the code subtracts `d.getDate()` directly, which gives days after today. Actually, re-reading: `daysInmonth - d.getDate()` gives the days left *after* today. But the comment says "including the current day." This might be a bug—perhaps it should be `daysInmonth - d.getDate() + 1`. Based on usage, it seems intended as days left including today, but the code doesn't match. I'll note this for devs to verify.)
   - **Usage for Frontend Integration**:
     - Call this function whenever you need the remaining days (e.g., on page load or when calculating budgets). No user input is needed.
     - Use the result to divide remaining money for daily spend calculations.
     - Display to the user (e.g., "Days left in month: X") to provide context for their budget.
     - **Example**: On February 19, 2026 (a 28-day month), it would return 9 (28 - 19), but per the comment, it should include today (so maybe 10). Devs should test and possibly adjust the logic if "including today" is critical.
   - **Code Example from `main.js`**:
     ```javascript
     let days = remDays();  // Returns the calculated days left (e.g., 9 on Feb 19, 2026)
     ```

### 3. `remMoney(balance, value = 0)`
   - **Purpose**: Calculates the remaining money after subtracting fixed expenses from the total balance. It includes a safety check to prevent negative balances.
   - **Input Values**:
     - `balance`: A number representing the user's total available money (e.g., account balance). Must be a positive number.
     - `value`: A number representing the total fixed expenses (default is 0 if not provided). This is typically the output from `fixedExpensis()`.
   - **Return Value**: A number (remaining balance after subtraction). If `value > balance`, returns -1 as an error indicator (to signal insufficient funds).
   - **Usage for Frontend Integration**:
     - Get `balance` from user input (e.g., an input field for "Total Balance").
     - Get `value` by first calling `fixedExpensis()` with user-provided expenses.
     - Call this function to get the spendable amount.
     - Display the result to the user (e.g., "Remaining Balance: $X" or an error message if -1 is returned, like "Insufficient funds for fixed expenses").
     - **Example**: If balance is $1000 and fixed expenses total $800, call `remMoney(1000, 800)` to get 200. If expenses exceed balance (e.g., 1200), it returns -1—show a warning in the UI.
   - **Code Example from `main.js`**:
     ```javascript
     let remBalance = remMoney(balance, fixedExpense);  // balance=1000, fixedExpense=15 → Returns 985
     ```

### 4. `dailySafespend(rM, rD)`
   - **Purpose**: Calculates the safe daily spending amount by dividing remaining money by remaining days, then truncating to an integer (to avoid fractional cents).
   - **Input Values**:
     - `rM`: A number representing the remaining money (typically the output from `remMoney()`).
     - `rD`: A number representing the remaining days (typically the output from `remDays()`).
   - **Return Value**: A number (the daily safe spend amount, truncated to an integer). If `rD` is 0 or negative, this could cause division by zero—devs should handle this (e.g., check if `rD > 0` before calling).
   - **Usage for Frontend Integration**:
     - Use outputs from `remMoney()` and `remDays()` as inputs.
     - Call this to get the per-day budget.
     - Display to the user (e.g., "Daily Safe Spend: $X") to guide their spending.
     - **Example**: With remaining money of $985 and 9 days left, call `dailySafespend(985, 9)` to get 109 (985 / 9 truncated). Show this in the UI as a daily limit.
   - **Code Example from `main.js`**:
     ```javascript
     let dailySafecount = dailySafespend(remBalance, days);  // remBalance=985, days=9 → Returns 109
     ```

### Overall Workflow for Frontend Developers
1. **Collect User Inputs**: Use HTML forms or UI elements to get values like total balance and individual fixed expenses.
2. **Process with Functions**:
   - Sum fixed expenses using `fixedExpensis()`.
   - Get remaining days using `remDays()`.
   - Calculate remaining balance using `remMoney()`.
   - Compute daily safe spend using `dailySafespend()`.
3. **Handle Edge Cases**: Check for errors (e.g., negative balance from `remMoney()`, division by zero in `dailySafespend()`). Validate inputs (e.g., ensure numbers are positive).
4. **Display Results**: Update the UI (e.g., via DOM manipulation in `ui.js`) to show totals, remaining balance, days left, and daily spend. For example, log or render the final `dailySafecount` as in `main.js`.
5. **Integration Tips**: Import these functions into your frontend JS files (e.g., `ui.js`). Ensure dates are handled correctly (e.g., `remDays()` relies on the system clock). Test with real dates to verify calculations.

If you need code examples for integrating with the UI, updating the functions, or fixing potential bugs (like the "including today" issue in `remDays()`), let me know!


####


