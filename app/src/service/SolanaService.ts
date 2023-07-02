import {clusterApiUrl, Connection, Keypair, PublicKey} from "@solana/web3.js";
import {keypairIdentity, Metaplex} from "@metaplex-foundation/js";

class SolanaService {
    public static async getSignaturesForAddress(mintAddress: string): Promise<string> {
        const mintAddressPublicKey = new PublicKey(mintAddress);


        const connection = new Connection(clusterApiUrl("mainnet-beta"));

        const signatures = await connection.getSignaturesForAddress(mintAddressPublicKey);

        return JSON.stringify(signatures);
    }
    public static async getParseTransaction(signature: string): Promise<string> {
        const connection = new Connection(clusterApiUrl("mainnet-beta"));

        const parseTxn = await connection.getParsedTransaction("signature");

        return JSON.stringify(parseTxn);
    }

    public static async getNftMetadata(mintAddress: string): Promise<string> {
        const connection = new Connection(clusterApiUrl("mainnet-beta"));
        const keypair = Keypair.generate();
        const metaplex = new Metaplex(connection);
        metaplex.use(keypairIdentity(keypair));

        const mintAddressPublicKey = new PublicKey(mintAddress);

        const nft = await metaplex.nfts().findByMint({ mintAddress: mintAddressPublicKey });

        return JSON.stringify(nft);
    }
}

export default SolanaService;
