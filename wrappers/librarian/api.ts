import {
    Address,
    toNano,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Message,
    storeMessage,
} from '@ton/core';
import { LibrarianConfig } from './types';
import { librarianConfigToCell } from './helpers';

export class LibrarianContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    static createFromAddress(address: Address) {
        return new LibrarianContract(address);
    }

    static createFromConfig(config: LibrarianConfig, code: Cell, workchain = -1) {
        const data = librarianConfigToCell(config);
        const init = { code, data };
        return new LibrarianContract(contractAddress(workchain, init), init);
    }
}
