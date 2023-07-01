import fs from 'fs';
import request from 'sync-request';
import {PersistenceService} from './PersistenceService';
import {Connection, clusterApiUrl, Keypair, PublicKey} from '@solana/web3.js';
import {Metaplex, keypairIdentity} from "@metaplex-foundation/js";
import fetch from 'node-fetch';
import {parse} from 'json5';
import {SolRequest} from './model/signaturesforaddress/request/SolRequest';
import https, {IncomingMessage} from 'https';
import {SolTxnResponse1} from "./model/signaturesforaddress/response/SolTxnResponse1";
import {sleep} from "./util/Sleep";
import SerdeUtil from "./util/SerdeUtil";
import {SolTxnResponse2} from "./model/transactions/response/SolTxnResponse2";


export class GetSolTxns {

    private persistenceService: PersistenceService;

    constructor() {
        const shitTokenJsonFile = "token-list.json";

        let shitTokenJsonStr: string;
        if (!fs.existsSync(shitTokenJsonFile) || fs.readFileSync(shitTokenJsonFile, 'utf8').length == 0) {
            shitTokenJsonStr = this.fetchTokenList(); // fetchTokenList needs to be defined
            fs.writeFileSync(shitTokenJsonFile, shitTokenJsonStr);
        } else {
            shitTokenJsonStr = fs.readFileSync(shitTokenJsonFile, 'utf8');
        }

        const shitTokenMap: Map<string, any> = new Map(Object.entries(JSON.parse(shitTokenJsonStr)));

        // const shitTokenMap: {[key: string]: any} = JSON.parse(shitTokenJsonStr);
        this.persistenceService = new PersistenceService(shitTokenMap);
    }

    fetchTokenList(): string {

        const res = request('GET', 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list@latest/solana-tokenlist.json', {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const tokenListJson = JSON.parse(res.getBody('utf8'));
        const prettyJson = JSON.stringify(tokenListJson, null, 4);
        return prettyJson;
    }


// Function Definition
    async getTxns(address: string): Promise<string> {
        let response = "";
        let params: string[] = [address];
        let methodName = "getSignaturesForAddress";

        let solRequest: SolRequest = {
            jsonrpc: '2.0',
            id: '1',
            method: methodName,
            params: params
        }

        let solRequestStr = JSON.stringify(solRequest);
        let txnFile = 'sol-txns.json';

        if (!fs.existsSync(txnFile) || fs.readFileSync(txnFile, 'utf8').length === 0) {
            let rawUnformattedTxnJson = this.executeSolRequest(solRequestStr);
            let txnObj = parse(rawUnformattedTxnJson);
            let prettyTxnList = JSON.stringify(txnObj, null, 2);
            fs.writeFileSync(txnFile, prettyTxnList);
            let solTxns = parse(fs.readFileSync(txnFile, 'utf8'));
            this.saveTxnsInDb(solTxns);
        } else {
            let solTxns = parse(fs.readFileSync(txnFile, 'utf8'));
            response = fs.readFileSync(txnFile, 'utf8');
            this.saveTxnsInDb(solTxns);
            console.info("");
        }

        return response;
    }


    async saveTxnsInDb(slurpedJson: SlurpedJson) {
        for (const res of slurpedJson.result) {
            const blockTime = res.blockTime;
            const signature = res.signature;
            const slot = res.slot;
            const utc = blockTime * 1000;
            const ldt = new Date(utc);

            const id = this.persistenceService.selectTransaction(signature);

            if (id === null) {
                console.log("Sig missed");
                this.persistenceService.insertTxnMetadata(signature, blockTime, ldt, slot);
                // Assuming fetchAndPersistDetails is an asynchronous function
                this.fetchAndPersistDetails(signature);
            } else {
                console.log(`Sig already in db ${signature}`);
                this.fetchAndPersistDetails(signature);

                console.log("persisting raw details.");
            }
        }
        this.persistenceService.close();
    }

    async fetchAndPersistDetails(signature: string) {
        const params: string[] = [signature, "jsonParsed"];
        const txnDetailReq: SolRequest = {
            jsonrpc: '2.0',
            id: '1',
            method: 'getTransaction',
            params: params
        };

        const solRequestStr: string = JSON.stringify(txnDetailReq);
        let rawTxnDetails: string | null = this.persistenceService.selectRawTransactionString(signature);

        if (!rawTxnDetails) {
            const res: string = await this.executeSolRequest(solRequestStr);
            this.persistenceService.insertRawTxnDataStr(res, signature);
            console.log("Sleeping 10 sec"); // sleep so we don't get rate limited
            const r: SolTxnResponse2 = SerdeUtil.convertStringToSolTxnResponse(res);
            this.persistenceService.updateTxnDetails(r, signature);
            sleep(10 * 1000);
        } else {
            const r: SolTxnResponse2 = SerdeUtil.convertStringToSolTxnResponse(rawTxnDetails);
            this.persistenceService.updateTxnDetails(r, signature);
        }
    }


    executeSolRequest(solRequestStr: string): string {
        const options = {
            hostname: 'api.mainnet-beta.solana.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const response = https.request(options);
        response.write(solRequestStr);
        response.end();

        // Synchronously wait for the response
        const res = response.;
        const responseBody = res.getBody('utf8');

        return responseBody;
    }


}
