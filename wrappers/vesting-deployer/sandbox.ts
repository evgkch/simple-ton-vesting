// @ts-nocheck

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Sender } from '@ton/core';
import { compile } from '@ton/blueprint';
import crypto from 'crypto';

import { VestingDeployerContract } from './api';
import { deploySandboxLibrary } from '../librarian';
import { VestingItemContractConfig } from '../vesting-item';
import { OP_EXCESSES } from '../constants';

export class VestingDeployerSandbox {
    static async create(blockchain: Blockchain, deployer: SandboxContract<TreasuryContract>) {
        const [vestingDeployerCompiledCode, vestingItemCompiledCode] = await Promise.all([
            compile('VestingDeployer'),
            compile('VestingItem'),
        ]);
        const vestingItemLibrarianCode = await deploySandboxLibrary(blockchain, vestingItemCompiledCode);
        const api = VestingDeployerContract.createFromConfig(
            {
                owner: deployer.address,
                salt: crypto.randomBytes(32), // random bytes
            },
            vestingDeployerCompiledCode,
        );
        return new VestingDeployerSandbox(blockchain.openContract(api), vestingItemLibrarianCode);
    }

    private constructor(
        private api: SandboxContract<VestingDeployerContract>,
        private vestingItemLibrarianCode: Cell,
    ) {}

    async deploy(via: Sender, value: bigint, config: VestingItemContractConfig) {
        const deployResult = await this.api.sendDeploy(via, value, this.vestingItemLibrarianCode, config);
        return {
            shouldSuccess: () => {
                expect(deployResult.transactions).toHaveTransaction({
                    from: via.address,
                    to: this.api.address,
                    success: true,
                });
                expect(deployResult.transactions).toHaveTransaction({
                    from: this.api.address,
                    to: via.address,
                    success: true,
                    op: OP_EXCESSES,
                });
            },
            shouldError: (exitCode: number, actionResultCode?: number) => {
                expect(deployResult.transactions).toHaveTransaction({
                    from: via.address,
                    to: this.api.address,
                    success: false,
                    actionResultCode,
                    exitCode,
                });
            },
        };
    }

    async getVestingAddress() {
        return this.api.address;
    }
}
