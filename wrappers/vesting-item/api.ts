import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    TupleItemInt,
    TupleItemSlice,
} from '@ton/core';

import { OP_CLAIM, OP_SIZE, QUERY_ID_SIZE } from '../constants';
import { VestingItemContractData } from './types';

export class VestingItemContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new VestingItemContract(address);
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OP_CLAIM, OP_SIZE).storeUint(0, QUERY_ID_SIZE).endCell(),
        });
    }

    async getAvaliableAmountToWithdraw(provider: ContractProvider) {
        const result = await provider.get('get_avaliable_amount_to_withdraw', []);
        return (result.stack.pop() as TupleItemInt).value;
    }

    async getContractBalance(provider: ContractProvider) {
        const result = await provider.get('get_contract_balance', []);
        return (result.stack.pop() as TupleItemInt).value;
    }

    async getContractData(provider: ContractProvider): Promise<VestingItemContractData> {
        const result = await provider.get('get_contract_data', []);
        return {
            beneficiaryAddress: (result.stack.pop() as TupleItemSlice).cell.asSlice().loadAddress(),
            unlockableAmount: (result.stack.pop() as TupleItemInt).value,
            releasedAmount: (result.stack.pop() as TupleItemInt).value,
            startTime: Number((result.stack.pop() as TupleItemInt).value),
            duration: Number((result.stack.pop() as TupleItemInt).value),
            period: Number((result.stack.pop() as TupleItemInt).value),
            cliffPeriod: Number((result.stack.pop() as TupleItemInt).value),
        };
    }
}
