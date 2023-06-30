import {Connection, clusterApiUrl, Keypair, PublicKey} from '@solana/web3.js';
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";

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

main().catch(console.error);
