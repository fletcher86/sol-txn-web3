"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSolTxns = void 0;
const fs_1 = __importDefault(require("fs"));
const sync_request_1 = __importDefault(require("sync-request"));
const PersistenceService_1 = require("./PersistenceService");
const json5_1 = require("json5");
const https = __importStar(require("https"));
const Sleep_1 = require("./util/Sleep");
class GetSolTxns {
    constructor() {
        const shitTokenJsonFile = "token-list.json";
        let shitTokenJsonStr;
        if (!fs_1.default.existsSync(shitTokenJsonFile) || fs_1.default.readFileSync(shitTokenJsonFile, 'utf8').length == 0) {
            shitTokenJsonStr = this.fetchTokenList(); // fetchTokenList needs to be defined
            fs_1.default.writeFileSync(shitTokenJsonFile, shitTokenJsonStr);
        }
        else {
            shitTokenJsonStr = fs_1.default.readFileSync(shitTokenJsonFile, 'utf8');
        }
        const shitTokenMap = new Map(Object.entries(JSON.parse(shitTokenJsonStr)));
        // const shitTokenMap: {[key: string]: any} = JSON.parse(shitTokenJsonStr);
        this.persistenceService = new PersistenceService_1.PersistenceService(shitTokenMap);
    }
    fetchTokenList() {
        const res = (0, sync_request_1.default)('GET', 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list@latest/solana-tokenlist.json', {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const tokenListJson = JSON.parse(res.getBody('utf8'));
        const prettyJson = JSON.stringify(tokenListJson, null, 4);
        return prettyJson;
    }
    // Function Definition
    getTxns(address) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = "";
            let params = [address];
            let methodName = "getSignaturesForAddress";
            let solRequest = {
                jsonrpc: '2.0',
                id: '1',
                method: methodName,
                params: params
            };
            let solRequestStr = JSON.stringify(solRequest);
            let txnFile = 'sol-txns.json';
            if (!fs_1.default.existsSync(txnFile) || fs_1.default.readFileSync(txnFile, 'utf8').length === 0) {
                let rawUnformattedTxnJson = yield this.executeSolRequest(solRequestStr);
                let txnObj = (0, json5_1.parse)(rawUnformattedTxnJson);
                let prettyTxnList = JSON.stringify(txnObj, null, 2);
                fs_1.default.writeFileSync(txnFile, prettyTxnList);
                let solTxns = (0, json5_1.parse)(fs_1.default.readFileSync(txnFile, 'utf8'));
                yield this.saveTxnsInDb(solTxns);
            }
            else {
                let solTxns = (0, json5_1.parse)(fs_1.default.readFileSync(txnFile, 'utf8'));
                response = fs_1.default.readFileSync(txnFile, 'utf8');
                yield this.saveTxnsInDb(solTxns);
                console.info("");
            }
            return response;
        });
    }
    saveTxnsInDb(slurpedJson) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const res of slurpedJson.result) {
                const blockTime = res.blockTime;
                const signature = res.signature;
                const slot = res.slot;
                const utc = blockTime * 1000;
                const ldt = new Date(utc);
                const id = yield this.persistenceService.selectTransaction(signature);
                if (id === null) {
                    console.log("Sig missed");
                    yield this.persistenceService.insertTxnMetadata(signature, blockTime, ldt, slot);
                    // Assuming fetchAndPersistDetails is an asynchronous function
                    yield this.fetchAndPersistDetails(signature);
                }
                else {
                    console.log(`Sig already in db ${signature}`);
                    yield this.fetchAndPersistDetails(signature);
                    console.log("persisting raw details.");
                }
            }
            this.persistenceService.close();
        });
    }
    fetchAndPersistDetails(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [signature, "jsonParsed"];
            const txnDetailReq = {
                jsonrpc: '2.0',
                id: '1',
                method: 'getTransaction',
                params: params
            };
            const solRequestStr = JSON.stringify(txnDetailReq);
            let rawTxnDetails = yield this.persistenceService.selectRawTransactionString(signature);
            if (!rawTxnDetails) {
                const res = yield this.executeSolRequest(solRequestStr);
                yield this.persistenceService.insertRawTxnDataStr(res, signature);
                console.log("Sleeping 10 sec"); // sleep so we don't get rate limited
                const r = SerdeUtil.convertStringToSolTxnResponse(res);
                yield this.persistenceService.updateTxnDetails(r, signature);
                yield (0, Sleep_1.sleep)(10 * 1000);
            }
            else {
                const r = SerdeUtil.convertStringToSolTxnResponse(rawTxnDetails);
                yield this.persistenceService.updateTxnDetails(r, signature);
            }
        });
    }
    executeSolRequest(solRequestStr) {
        const options = {
            hostname: 'api.mainnet-beta.solana.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                res.setEncoding('utf8');
                let responseBody = '';
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                res.on('end', () => {
                    resolve(responseBody);
                });
            });
            req.on('error', (err) => {
                reject(err);
            });
            req.write(solRequestStr);
            req.end();
        });
    }
}
exports.GetSolTxns = GetSolTxns;
