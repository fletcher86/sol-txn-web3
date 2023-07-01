import { Meta } from './Meta';
import { Transaction } from './Transaction';

export interface Result {
    blockTime: number;
    meta: Meta;
    slot: number;
    transaction: Transaction;
}
