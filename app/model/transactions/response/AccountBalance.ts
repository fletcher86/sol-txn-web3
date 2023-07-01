import {UiTokenAmount} from "./UiTokenAmount";

export interface AccountBalance {
    accountIndex: number;
    mint: string;
    owner: string;
    programId: string;
    uiTokenAmount: UiTokenAmount;
}