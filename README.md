## YNAB Deduplication Tool for Citizen's Bank Credit Card

This simple Node application offers an easy way to flag potential duplicate transactions that result as a flaw in YNAB's auto import (Plaid) of transactions from Citizen's Bank Credit Card program.

This application assumes you, like me, connect a Citizen's Bank credit card account through Citizen's standard banking system that integrates with accessmycardonline.com.

## How it works

Occasionally, duplicate transactions from CZ Credit Cards appear a in YNAB, usually one day apart. This node script grabs your transactions, looks for identical transactions that are a day apart, flags the correct ones blue and the incorrect ones orange. If you happened to already categorize the duplicate, all the information from it (including split transactions) will be copied to the correct transaction. You can then easily delete correctly flagged duplicates later.

This application also writes a history of non-duplicate transactions to use in future runs and utilizes server knowledge from the YNAB's API to avoid retrieving all transactions with every run. 

## Setup

You should be familiar with Node and npm to use this application. 

Open the dedupe.js file from the repo and enter your YNAB API key and Budget ID to the script, or import from a separate file. 

Make sure you run `npm install` from the root directory to install the YNAB SDK. 

NOTE: Since this algorithm assumes any day-apart identical transactions are dupes, it will not work on recurring daily transactions like parking or a standard coffee order. You will need to check for duplicates on those ones manually.