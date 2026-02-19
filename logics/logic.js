// collects all the fixed expensis/goals and returns a total value
export function fixedExpensis(...fixData){
    let total = fixData.reduce((x,value)=>{return x+value},0);
    return total;
}


//this function returns days left in the month,including the current day, no argument is required 
export function remDays(){
    const d = new Date();
    let md = d.getMonth()+1;
    let yr = d.getFullYear();
    let daysInmonth = new Date(yr,md,0).getDate();
    let date  = daysInmonth - d.getDate();
    return date;
}

//the value which will be received in the value parameter is of the fixed expensis
export function remMoney(balance,value = 0){

    if(value > balance){
        return -1;
    }
    const remMoney = balance - value;
    return remMoney;   
}


export function dailySafespend(rM,rD){
    const dss = rM/rD;
    return Math.trunc(dss);

}

