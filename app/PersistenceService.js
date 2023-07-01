"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceService = void 0;
const mysql_1 = require("mysql");
const date_fns_1 = require("date-fns");
// import {format, fromUnixTime} from 'date-fns';
class PersistenceService {
    constructor(SHIT_TOKEN_MAP) {
        this.E9 = 1000000000;
        this.DRIVER = 'mysql';
        this.URL = process.env["SOL_DB"] || "defaultDB";
        this.USER = process.env["SOL_PW"] || "defaultUser";
        this.PASSWORD = process.env["SOL_PW"] || "defaultPw";
        this.SQL = (0, mysql_1.createConnection)({
            host: this.URL,
            user: this.USER,
            password: this.PASSWORD,
            database: this.DRIVER
        });
        this.SHIT_TOKEN_MAP = SHIT_TOKEN_MAP;
        this.SHIT_LIST_STR = JSON.stringify(Array.from(SHIT_TOKEN_MAP.entries()));
    }
    selectTransaction(txn) {
        let selectTxnQuery = "SELECT ID FROM SOL_TXN_DATA WHERE SIGNATURE=?";
        return new Promise((resolve, reject) => {
            this.SQL.query(selectTxnQuery, [txn], (error, results, fields) => {
                if (error) {
                    reject(error);
                }
                resolve(results[0] ? results[0].ID : null);
            });
        });
    }
    updateTxnDetails(solTxnDetails, signature) {
        const updateQuery = `
      UPDATE SOL_TXN_DATA SET
          CREATED_UTC_TS=?,
          UPDATED_TS=?,
          ERR=?, 
          FEE=?, 
          CONFIRMATION_STATUS=?, 
          PRE_BALANCE_1=?, 
          PRE_BALANCE_2=?, 
          POST_BALANCE_1=?, 
          POST_BALANCE_2=?, 
          NUM_SOL_XFERED=?,
          TOKEN_NAME=?, 
          ACCOUNT_KEYS_1=?, 
          ACCOUNT_KEYS_2=?, 
          ADDRESS_FROM=?, 
          ADDRESS_TO=?, 
          BLOCK_HASH=?,
          NFT_XFER=?
      WHERE SIGNATURE=?
    `;
        const utcTsStr = this.convertLongTsToString(solTxnDetails.result.blockTime);
        const updatedTs = new Date().toISOString();
        let err = "n/a";
        if (solTxnDetails.result.meta.err) {
            err = JSON.stringify(solTxnDetails.result.meta.err);
        }
        const fee = solTxnDetails.result.meta.fee;
        const sig = solTxnDetails.result.transaction.signatures[0];
        let status = null;
        if (solTxnDetails.result.meta.status) {
            status = solTxnDetails.result.meta.status.has("Ok") ? "Ok" : null;
        }
        const postBal1 = solTxnDetails.result.meta.postBalances[0];
        const postBal2 = solTxnDetails.result.meta.postBalances[1];
        const preBal1 = solTxnDetails.result.meta.preBalances[0];
        const preBal2 = solTxnDetails.result.meta.preBalances[1];
        // Assuming you have getFromAddress, getToAddress, getNumberOfTokensTransferred, getTokenName functions available in your TypeScript code.
        const addr1 = this.getFromAddress(solTxnDetails, signature);
        const addr2 = this.getToAddress(solTxnDetails, signature);
        const blockHash = solTxnDetails.result.transaction.message.recentBlockhash;
        let nftXfer = "false";
        const nuTokensXferred = this.getNumberOfTokensTransferred(solTxnDetails, signature);
        if (nuTokensXferred === 1.0) {
            nftXfer = "true";
        }
        const tokenName = this.getTokenName(solTxnDetails);
        const params = [
            utcTsStr,
            updatedTs,
            err,
            fee,
            status,
            preBal1,
            preBal2,
            postBal1,
            postBal2,
            nuTokensXferred,
            tokenName,
            addr1,
            addr2,
            addr1,
            addr2,
            blockHash,
            nftXfer,
            sig
        ];
        this.SQL.query(updateQuery, params, (error, results, fields) => {
            if (error) {
                console.log('An error occurred while executing the query: ', error);
                return;
            }
            console.log('The result of the update operation: ', results);
        });
    }
    close() {
        this.SQL.end(err => {
            if (err) {
                console.log('Error while closing the connection:', err);
            }
            else {
                console.log('Connection closed successfully.');
            }
        });
    }
    selectRawTransactionString(signature) {
        const selectTxnQuery = 'SELECT RAW_TXN_DATA_STR FROM SOL_TXN_DATA WHERE SIGNATURE=?';
        try {
            const [row] = this.SQL.query(selectTxnQuery, [signature]);
            const rawData = row === null || row === void 0 ? void 0 : row.RAW_TXN_DATA_STR;
            return rawData !== null && rawData !== void 0 ? rawData : '';
        }
        catch (error) {
            console.log(`Failed to execute query: ${selectTxnQuery}`);
            throw error;
        }
    }
    insertRawTxnDataStr(txnData, signature) {
        const updateQuery = `
    UPDATE SOL_TXN_DATA
    SET RAW_TXN_DATA_STR = ?
    WHERE SIGNATURE = ?
  `;
        const params = [txnData, signature];
        this.SQL.query(updateQuery, params, (error, results) => {
            if (error) {
                console.log(`Failed to execute query: ${updateQuery}`);
                throw error;
            }
            console.log('Update query executed successfully');
        });
    }
    insertTxnMetadata(signature, blockTime_sec, ldt, slot) {
        // before doing anything, let's check to make sure we don't already have it persisted.
        const id = this.selectTransaction(signature);
        if (id === null) {
            const insertQuery = `
            INSERT INTO SOL_TXN_DATA 
            (SIGNATURE, TS_LONG, CREATED_LOCAL_TS, CREATED_UTC_TS, SLOT)
            VALUES 
            (?, ?, ?, ?, ?)
        `;
            const dbTs = ldt;
            const utcTsStr = this.convertLongTsToString(blockTime_sec);
            const params = [signature, blockTime_sec, dbTs, utcTsStr, slot];
            this.SQL.query(insertQuery, params, (error, results, fields) => {
                if (error) {
                    console.log("Error: ", error);
                }
                else {
                    console.log("Results: ", results);
                }
            });
        }
        else {
            console.log(`Skip, we already have this txn in the db for signature - > '${signature}'`);
        }
    }
    convertLongTsToString(blockTime_sec) {
        return (0, date_fns_1.format)(new Date(blockTime_sec * 1000), 'yyyy-MM-dd HH:mm:ss');
    }
    getFromAddress(solTxnDetails, signature) {
        var _a, _b;
        let fromAddress;
        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            fromAddress = (_b = (_a = solTxnDetails.result.transaction.message.instructions[i].parsed) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.source;
            if (fromAddress !== undefined) {
                break;
            }
        }
        if (fromAddress === undefined) {
            for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
                for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                    fromAddress = solTxnDetails.result.meta.innerInstructions[i].instructions[j].get("parsed").get("info").get("source");
                    if (fromAddress !== undefined) {
                        break;
                    }
                }
                if (fromAddress !== undefined) {
                    break;
                }
            }
        }
        return fromAddress;
    }
    getToAddress(solTxnDetails, signature) {
        var _a, _b, _c, _d;
        let toAddress;
        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            toAddress = (_b = (_a = solTxnDetails.result.transaction.message.instructions[i].parsed) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.destination;
            if (toAddress === undefined) {
                toAddress = (_d = (_c = solTxnDetails.result.transaction.message.instructions[i].parsed) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.wallet;
            }
            if (toAddress !== undefined) {
                break;
            }
        }
        if (toAddress === undefined) {
            for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
                for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                    toAddress = solTxnDetails.result.meta.innerInstructions[i].instructions[j].get("parsed").get("info").get("destination");
                    if (toAddress !== undefined) {
                        break;
                    }
                }
                if (toAddress !== undefined) {
                    break;
                }
            }
        }
        return toAddress;
    }
    getNumberOfTokensTransferred(solTxnDetails, signature) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const E9 = Math.pow(10, 9);
        let numTokens = null;
        let lamports = null;
        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            lamports = ((_b = (_a = solTxnDetails.result.transaction.message.instructions[i].parsed) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.lamports) || null;
            if (lamports !== null) {
                break;
            }
        }
        if (lamports !== null) {
            numTokens = lamports / E9;
        }
        if (numTokens === null) {
            for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
                numTokens = ((_e = (_d = (_c = solTxnDetails.result.transaction.message.instructions[i].parsed) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.tokenAmount) === null || _e === void 0 ? void 0 : _e.uiAmount) || null;
                if (numTokens !== null) {
                    break;
                }
            }
        }
        if (numTokens === null) {
            for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
                for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                    const amt = (_f = solTxnDetails.result.meta.innerInstructions[i].instructions[j]) === null || _f === void 0 ? void 0 : _f.get("parsed").get("info").get("amount");
                    if (amt !== undefined) {
                        lamports = Number(amt);
                        break;
                    }
                }
                if (lamports !== null) {
                    break;
                }
            }
        }
        if (lamports !== null) {
            numTokens = lamports / E9;
        }
        if (numTokens === null) {
            for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
                for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                    lamports = (_j = (_h = (_g = solTxnDetails.result.meta.innerInstructions[i].instructions[j]) === null || _g === void 0 ? void 0 : _g.get("parsed")) === null || _h === void 0 ? void 0 : _h.get("info")) === null || _j === void 0 ? void 0 : _j.get("lamports");
                    if (lamports !== null) {
                        break;
                    }
                }
                if (lamports !== null) {
                    break;
                }
            }
        }
        if (lamports !== null) {
            numTokens = lamports / E9;
        }
        if (numTokens === null) {
            numTokens = 0;
        }
        return numTokens;
    }
    getTokenName(solTxnDetails) {
        var _a, _b, _c;
        let mintAddress;
        for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
            for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                mintAddress = (_b = (_a = solTxnDetails.result.meta.innerInstructions[i].instructions[j].get("parsed")) === null || _a === void 0 ? void 0 : _a.get("info")) === null || _b === void 0 ? void 0 : _b.get("mint");
                if (mintAddress !== undefined) {
                    break;
                }
            }
            if (mintAddress !== undefined) {
                break;
            }
        }
        let tokenName = (_c = this.SHIT_TOKEN_MAP.get("tokens").find((token) => token.address === mintAddress)) === null || _c === void 0 ? void 0 : _c.name;
        if (tokenName === undefined) {
            if (this.isSimpleSolTransfer(solTxnDetails)) { // This function needs to be defined in your TypeScript code
                return "SOLANA!";
            }
            else {
                if (this.SHIT_LIST_STR && this.SHIT_LIST_STR.includes(mintAddress !== null && mintAddress !== void 0 ? mintAddress : "xxx12319919911991191")) {
                    console.log(""); // Replace this with your desired logging functionality
                }
                else {
                    console.log("EMTPY SHITLIST?"); // Replace this with your desired logging functionality
                }
                tokenName = mintAddress !== null && mintAddress !== void 0 ? mintAddress : "";
            }
        }
        return tokenName;
    }
    isSimpleSolTransfer(solTxnDetails) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        // if 1st instruction has source/destination/lamports and is 'transfer
        const source = (_d = (_c = (_b = (_a = solTxnDetails.result.transaction.message.instructions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.parsed) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.source;
        const destination = (_h = (_g = (_f = (_e = solTxnDetails.result.transaction.message.instructions) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.parsed) === null || _g === void 0 ? void 0 : _g.info) === null || _h === void 0 ? void 0 : _h.destination;
        const lamports = (_m = (_l = (_k = (_j = solTxnDetails.result.transaction.message.instructions) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.parsed) === null || _l === void 0 ? void 0 : _l.info) === null || _m === void 0 ? void 0 : _m.lamports;
        const type = (_q = (_p = (_o = solTxnDetails.result.transaction.message.instructions) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.parsed) === null || _q === void 0 ? void 0 : _q.type;
        return !!(source && destination && lamports > 0 && type === "transfer");
    }
}
exports.PersistenceService = PersistenceService;
