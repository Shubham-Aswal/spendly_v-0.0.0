import {fixedExpensis,remDays,remMoney,dailySafespend} from "./logics/logic.js"; 


let balance = 1000;

let fixedExpense  = fixedExpensis(1,2,3,4,5);
let days = remDays();
let remBalance = remMoney(balance,fixedExpense);
let dailySafecount = dailySafespend(remBalance,days);
console.log(dailySafecount);












