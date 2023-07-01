import {Account} from "./Account";

interface Instruction {
    accounts: Account[];
    parsed: Map<string, any>;
    data: string;
    programIdIndex: number;
}
