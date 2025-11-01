import { Address } from '@ton/core';

export type VestingItemContractConfig = {
    beneficiaryAddress: Address;
    unlockableAmount: bigint;
    startTime: number;
    duration: number;
    period: number;
    cliffPeriod: number;
};

export type VestingItemContractData = VestingItemContractConfig & { releasedAmount: bigint };
