import {SolTxnResponse2} from "../model/transactions/response/SolTxnResponse2";

class SerdeUtil {
    static convertStringToSolTxnResponse(rawSolTxnDetail: string): SolTxnResponse2 {
        const r: SolTxnResponse2 = JSON.parse(rawSolTxnDetail);
        return r;
    }

    static readValue<T>(str: string, valueType: { new (): T }): T {
        const obj: T = JSON.parse(str);
        return obj;
    }

    static writeValueAsString(o: any): string {
        const str: string = JSON.stringify(o);
        return str;
    }
}

export default SerdeUtil;
