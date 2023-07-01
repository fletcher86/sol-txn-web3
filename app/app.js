"use strict";
const GetSolTxns = require('./GetSolTxns');
function main() {
    const arg = process.argv[2];
    const getSolTxns = new GetSolTxns();
    const res = getSolTxns.getTxns(arg);
    console.log(res);
}
main();
