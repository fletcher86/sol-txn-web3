import {createConnection, Connection, MysqlError, FieldInfo} from 'mysql';
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

    // Continue with other methods...
}
