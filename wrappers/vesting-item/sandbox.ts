// @ts-nocheck

import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Address, Sender } from '@ton/core';

import { VestingItemContract } from './api';
import { OP_WITHDRAW } from '../constants';
import { VestingItemContractData } from './types';
import { Maybe } from '@ton/core/src/utils/maybe';

export class VestingItemSandbox {
    static async create(blockchain: Blockchain, address: Address) {
        const api = VestingItemContract.createFromAddress(address);
        return new VestingItemSandbox(blockchain.openContract(api));
    }

    private data: Maybe<VestingItemContractData>;
    private constructor(private api: SandboxContract<VestingItemContract>) {}

    async claim(via: Sender, value: bigint) {
        const claimResult = await this.api.sendClaim(via, value);
        return {
            shouldSuccess: () => {
                expect(claimResult.transactions).toHaveTransaction({
                    from: via.address,
                    to: this.api.address,
                    success: true,
                });
                expect(claimResult.transactions).toHaveTransaction({
                    from: this.api.address,
                    to: via.address,
                    success: true,
                    op: OP_WITHDRAW,
                });
            },
            shouldError: (exitCode: number, actionResultCode?: number) => {
                expect(claimResult.transactions).toHaveTransaction({
                    from: via.address,
                    to: this.api.address,
                    success: false,
                    exitCode,
                    actionResultCode,
                });
            },
        };
    }

    async toMatchData(target: Partial<VestingItemContractData>) {
        const data = await this.api.getContractData();
        if (target.beneficiaryAddress) {
            expect(data.beneficiaryAddress.toString()).toEqual(target.beneficiaryAddress.toString());
        }
        if (target.unlockableAmount) {
            expect(data.unlockableAmount).toEqual(target.unlockableAmount);
        }
        if (target.releasedAmount) {
            expect(data.releasedAmount).toEqual(target.releasedAmount);
        }
        if (target.startTime) {
            expect(data.startTime).toEqual(target.startTime);
        }
        if (target.duration) {
            expect(data.duration).toEqual(target.duration);
        }
        if (target.period) {
            expect(data.period).toEqual(target.period);
        }
        if (target.duration) {
            expect(data.cliffPeriod).toEqual(target.cliffPeriod);
        }
        this.data = data;
    }

    getCachedData(): Readonly<VestingItemContractData> {
        return this.data!;
    }

    async getContractBalance() {
        return await this.api.getContractBalance();
    }

    async getAvaliableAmountToWithdraw() {
        return await this.api.getAvaliableAmountToWithdraw();
    }
}
