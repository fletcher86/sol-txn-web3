import {Message} from "./Message";

export interface Transaction {
    message: Message;
    signatures: string[];
}
