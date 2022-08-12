// const budgetId = 'your budget id here';
// const accessToken = 'your access token here';

// --OR--

// from separate file:
import { accessToken, budgetId } from "./credentials.js";
import fs from 'fs';
import ynab from 'ynab';

const ynabAPI = new ynab.API(accessToken);

// function returns true if timeB is exactly one day before timeA.
const dayspan = (a, b) => {
    const timeA = new Date(a);
    const timeB = new Date(b);
    const result = timeA.valueOf() - timeB.valueOf();
    return result === 86400000;
};

// variable & function to log server knowledge and non-duplicate transactions.
const record = (server_knowledge, transactions) => {
    fs.writeFileSync('./history.txt', `{"server_knowledge": "${server_knowledge}", "transactions": ${JSON.stringify(transactions)}}`, 
    err => console.err(err));
};

const checkForHistory = async () => {
    try {
        // check for history. 
        const history = fs.readFileSync('./history.txt', 'utf-8');
        const server_knowledge = parseInt(JSON.parse(history).server_knowledge);
        const oldTransactions = JSON.parse(history).transactions;
        const oldTransactionsLength = oldTransactions.length;
        
        const response = await ynabAPI.transactions.getTransactions(budgetId, undefined, undefined, server_knowledge || undefined);
        const newTransactions = response.data.transactions;
        console.log(`${oldTransactions.length} transactions gathered from history. ${response.data.transactions.length} gathered from YNAB.`);
        const transactions = [...oldTransactions, ...newTransactions];
        return { transactions, oldTransactionsLength };
    } catch {
        const response = await ynabAPI.transactions.getTransactions(budgetId);
        const transactions = response.data.transactions;
        console.log(`No prior history found. ${transactions.length} gathered from YNAB.`);
        return { transactions, oldTransactionsLength: 0 };
    }
}
const history = await checkForHistory();
const originalTransactions = history.transactions;
const oldTransactionsLength = history.oldTransactionsLength;

const extractDuplicates = (originalTransactions) => { // returns { duplicates, nonDuplicates }
    // set increment for comparing array lengths from oldTransactions.
    let i = -1;

    // check for transactions with same amount && one day before
    let duplicates = [];
    let nonDuplicates = [];
    // TODO: method to log string descriptors of duplicate transactions to the console to see results more easily.

    originalTransactions.forEach(transaction => {
        i++;
        // skip over previously flagged as dupe transactions.
        if (transaction.flag_color != 'blue' && transaction.flag_color != 'orange' && transaction.deleted === false) {
            const dupe = originalTransactions.find(t => {
                // look for a duplicate.
                return t.amount === transaction.amount &&
                t.id !== transaction.id &&
                dayspan(transaction.date, t.date) &&
                t.import_id !== transaction.import_id &&
                t.account_id === transaction.account_id;
            });
            if (dupe) {
                if(dupe.approved === true) {
                    // move all transaction info on dupe to later, correct transaction.
                    let flaggedDupe = dupe;
                    flaggedDupe.flag_color = 'orange';

                    let updatedOriginal = transaction;
                    updatedOriginal.memo = dupe.memo;
                    updatedOriginal.payee_id = dupe.payee_id;
                    updatedOriginal.payee_name = dupe.payee_name;
                    updatedOriginal.category_id = dupe.category_id;
                    updatedOriginal.category_name = dupe.category_name;
                    updatedOriginal.flag_color = 'blue';

                    duplicates.push(flaggedDupe);
                    duplicates.push(updatedOriginal);
                 } else { 
                    // modify transactions
                    let flaggedDupe = dupe;
                    flaggedDupe.flag_color = 'orange';
                   
                    let flaggedOriginal = transaction;
                    flaggedOriginal.flag_color = 'blue';

                    duplicates.push(flaggedDupe);
                    duplicates.push(flaggedOriginal);
                    // console.log({flaggedDupe, flaggedOriginal});
                };
            } else if (i >= oldTransactionsLength) {
                // if there is not a duplicate, store this transaction for next check.
                nonDuplicates.push(transaction);
            };
        };
    });
    console.log(`${duplicates.length / 2} duplicate(s) found.`);
    const log = duplicates.map(dupe => {
        return `$${dupe.amount / 1000} on ${dupe.date} to ${dupe.payee_name} flagged ${dupe.flag_color}`
    });
    console.log(log);

    return { duplicates, nonDuplicates }
};

const transactions = extractDuplicates(originalTransactions);

if (transactions.duplicates.length > 0) {
    const data = { "transactions": transactions.duplicates }
    ynabAPI.transactions.updateTransactions(budgetId, data).then(res => {
        console.log(res)
        const server_knowledge = res.data.server_knowledge;

        // record non-duplicates.
        record(server_knowledge, transactions.nonDuplicates);
        console.log(`${data.transactions.length} transactions updated, ${transactions.nonDuplicates.length} non-duplicates stored.`)
    }).catch(err => { console.log(err) })
} else {
    console.log('no duplicates to update');
};