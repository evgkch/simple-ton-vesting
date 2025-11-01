import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

import { VestingDeployerContractConfig } from './types';
import { vestingDeployerContractConfigToCell } from './helpers';
import { VestingItemContractConfig, vestingItemContractConfigToCell } from '../vesting-item';

export class VestingDeployerContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new VestingDeployerContract(address);
    }

    static createFromConfig(config: VestingDeployerContractConfig, code: Cell, workchain = 0) {
        const data = vestingDeployerContractConfigToCell(config);
        const init = { code, data };
        return new VestingDeployerContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        code: Cell,
        config: VestingItemContractConfig,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeRef(code).storeRef(vestingItemContractConfigToCell(config)).endCell(),
        });
    }
}
