import {InnerInstruction} from "./InnerInstruction";
import {AccountBalance} from "./AccountBalance";

export interface Meta {
    computeUnitsConsumed: number;
    err: Map<string, any>;
    fee: number;
    innerInstructions: InnerInstruction[];
    loadedAddresses: Map<string, string[]>;
    logMessages: string[];
    postBalances: number[];
    postTokenBalances: AccountBalance[];
    preBalances: number[];
    preTokenBalances: AccountBalance[];
    rewards: number[];
    status: Map<string, any>;
}