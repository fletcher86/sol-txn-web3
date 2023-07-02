import {createConnection, Connection, MysqlError, FieldInfo, Query} from 'mysql';
import {SolTxnResponse2} from "../model/transactions/response/SolTxnResponse2";
import {format} from 'date-fns';
import {SolTxnResponse1} from "../model/signaturesforaddress/response/SolTxnResponse1";

// import {format, fromUnixTime} from 'date-fns';

export class PersistenceService {
    private E9: number = 1000000000;
    private URL: string;
    private USER: string;
    private PASSWORD: string;
    private DRIVER: string = 'mysql';
    private SQL: Connection;
    private SHIT_TOKEN_MAP: Map<string, any>;
    private SHIT_LIST_STR: string;

    constructor(SHIT_TOKEN_MAP: Map<string, any>) {
        this.URL = process.env["SOL_DB"] || "defaultDB";
        this.USER = process.env["SOL_PW"] || "defaultUser";
        this.PASSWORD = process.env["SOL_PW"] || "defaultPw";
        this.SQL = createConnection({
            host: this.URL,
            user: this.USER,
            password: this.PASSWORD,
            database: this.DRIVER
        });
        this.SHIT_TOKEN_MAP = SHIT_TOKEN_MAP;
        this.SHIT_LIST_STR = JSON.stringify(Array.from(SHIT_TOKEN_MAP.entries()));
    }

    selectTransaction(txn: string): Promise<number> {
        let selectTxnQuery = "SELECT ID FROM SOL_TXN_DATA WHERE SIGNATURE=?"
        return new Promise((resolve, reject) => {
            this.SQL.query(selectTxnQuery, [txn], (error: MysqlError | null, results: any[], fields: FieldInfo[] | undefined) => {
                if (error) {
                    reject(error);
                }
                resolve(results[0] ? results[0].ID : null);
            });
        });
    }


    updateTxnDetails(solTxnDetails: SolTxnResponse2, signature: string) {
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
            status = solTxnDetails.result.meta.status.has("Ok") ? "Ok" : null
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

        this.SQL.query(updateQuery, params, (error: MysqlError | null, results?: any, fields?: FieldInfo[]) => {
            if (error) {
                console.log('An error occurred while executing the query: ', error);
                return;
            }
            console.log('The result of the update operation: ', results);
        });
    }

    close(): void {
        this.SQL.end(err => {
            if (err) {
                console.log('Error while closing the connection:', err);
            } else {
                console.log('Connection closed successfully.');
            }
        });
    }

    selectRawTransactionString(signature: string): string {
        const selectTxnQuery = 'SELECT RAW_TXN_DATA_STR FROM SOL_TXN_DATA WHERE SIGNATURE=?';

        try {
            const [row] = this.SQL.query(selectTxnQuery, [signature]) as any;
            const rawData = row?.RAW_TXN_DATA_STR;
            return rawData ?? '';
        } catch (error) {
            console.log(`Failed to execute query: ${selectTxnQuery}`);
            throw error;
        }
    }

    insertRawTxnDataStr(txnData: string, signature: string) {
        const updateQuery = `
    UPDATE SOL_TXN_DATA
    SET RAW_TXN_DATA_STR = ?
    WHERE SIGNATURE = ?
  `;

        const params = [txnData, signature];
        this.SQL.query(updateQuery, params, (error: MysqlError | null, results: any) => {
            if (error) {
                console.log(`Failed to execute query: ${updateQuery}`);
                throw error;
            }
            console.log('Update query executed successfully');
        });
    }

    insertTxnMetadata(signature: string, blockTime_sec: number, ldt: Date, slot: number) {
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
                } else {
                    console.log("Results: ", results);
                }
            });
        } else {
            console.log(`Skip, we already have this txn in the db for signature - > '${signature}'`);
        }
    }

    convertLongTsToString(blockTime_sec: number): string {
        return format(new Date(blockTime_sec * 1000), 'yyyy-MM-dd HH:mm:ss');
    }


    getFromAddress(solTxnDetails: SolTxnResponse2, signature: string): string | undefined {

        let fromAddress: string | undefined;

        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            fromAddress = solTxnDetails.result.transaction.message.instructions[i].parsed?.info?.source;
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

    getToAddress(solTxnDetails: SolTxnResponse2, signature: string): string | undefined {
        let toAddress: string | undefined;

        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            toAddress = solTxnDetails.result.transaction.message.instructions[i].parsed?.info?.destination;
            if (toAddress === undefined) {
                toAddress = solTxnDetails.result.transaction.message.instructions[i].parsed?.info?.wallet;
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

    getNumberOfTokensTransferred(solTxnDetails: SolTxnResponse2, signature: string): number | null {
        const E9 = Math.pow(10, 9);
        let numTokens: number | null = null;
        let lamports: number | null = null;

        for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
            lamports = solTxnDetails.result.transaction.message.instructions[i].parsed?.info?.lamports || null;
            if (lamports !== null) {
                break;
            }
        }

        if (lamports !== null) {
            numTokens = lamports / E9;
        }

        if (numTokens === null) {
            for (let i = 0; i < solTxnDetails.result.transaction.message.instructions.length; i++) {
                numTokens = solTxnDetails.result.transaction.message.instructions[i].parsed?.info?.tokenAmount?.uiAmount || null;
                if (numTokens !== null) {
                    break;
                }
            }
        }

        if (numTokens === null) {
            for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
                for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                    const amt = solTxnDetails.result.meta.innerInstructions[i].instructions[j]?.get("parsed").get("info").get("amount");
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
                    lamports = solTxnDetails.result.meta.innerInstructions[i].instructions[j]?.get("parsed")?.get("info")?.get("lamports");
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


    getTokenName(solTxnDetails: SolTxnResponse2): string {
        let mintAddress: string | undefined;
        for (let i = 0; i < solTxnDetails.result.meta.innerInstructions.length; i++) {
            for (let j = 0; j < solTxnDetails.result.meta.innerInstructions[i].instructions.length; j++) {
                mintAddress = solTxnDetails.result.meta.innerInstructions[i].instructions[j].get("parsed")?.get("info")?.get("mint");
                if (mintAddress !== undefined) {
                    break;
                }
            }
            if (mintAddress !== undefined) {
                break;
            }
        }

        let tokenName: string | undefined = this.SHIT_TOKEN_MAP.get("tokens").find((token: any) => token.address === mintAddress)?.name;

        if (tokenName === undefined) {
            if (this.isSimpleSolTransfer(solTxnDetails)) {  // This function needs to be defined in your TypeScript code
                return "SOLANA!";
            } else {
                if (this.SHIT_LIST_STR && this.SHIT_LIST_STR.includes(mintAddress ?? "xxx12319919911991191")) {
                    console.log("");  // Replace this with your desired logging functionality
                } else {
                    console.log("EMTPY SHITLIST?");  // Replace this with your desired logging functionality
                }
                tokenName = mintAddress ?? "";
            }
        }

        return tokenName;
    }


    isSimpleSolTransfer(solTxnDetails: SolTxnResponse2): boolean {
        // if 1st instruction has source/destination/lamports and is 'transfer
        const source = solTxnDetails.result.transaction.message.instructions?.[0]?.parsed?.info?.source;
        const destination = solTxnDetails.result.transaction.message.instructions?.[0]?.parsed?.info?.destination;
        const lamports = solTxnDetails.result.transaction.message.instructions?.[0]?.parsed?.info?.lamports;
        const type = solTxnDetails.result.transaction.message.instructions?.[0]?.parsed?.type;
        return !!(source && destination && lamports > 0 && type === "transfer");
    }


}