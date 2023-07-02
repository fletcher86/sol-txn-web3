import {Account} from "./Account";
import {Header} from "./Header";

export interface Message {
    accountKeys: Account[];
    header: Header;
    instructions: any[]; // If you know the exact structure, replace `any` with that
    recentBlockhash: string;
}
