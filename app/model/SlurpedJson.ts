interface SlurpedJson {
    result: Array<{
        blockTime: number;
        signature: string;
        slot: number;
    }>;
}