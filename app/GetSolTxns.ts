import fs from 'fs';
import request from 'sync-request';
import { PersistenceService } from './PersistenceService';
import {Connection, clusterApiUrl, Keypair, PublicKey} from '@solana/web3.js';
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
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

    // TODO: Define the fetchTokenList method
    fetchTokenList(): string {
        throw new Error("fetchTokenList method not implemented.");
    }

}
async function main() {

    // Connect to the cluster (you can also use 'devnet' or 'testnet')
    //const connection = new Connection(clusterApiUrl('mainnet-beta'));

    const connection = new Connection(clusterApiUrl("mainnet-beta"));
    const keypair = Keypair.generate();
    const metaplex = new Metaplex(connection);
    metaplex.use(keypairIdentity(keypair));

    const mintAddress = new PublicKey(
        "6VVBtXv7hT7oixWC11fno4u6MAFhwYCC5NtxkqTYPJzN" +
        ""
    );

    const nft = await metaplex.nfts().findByMint({ mintAddress });

    console.log(nft.json);

}


function fetchTokenList(): string {

    // const request = require('sync-request');

    const res = request('GET', 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list@latest/solana-tokenlist.json', {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const tokenListJson = JSON.parse(res.getBody('utf8'));
    const prettyJson = JSON.stringify(tokenListJson, null, 4);
    return prettyJson;
}

main().catch(console.error);
