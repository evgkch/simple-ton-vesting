import { Address } from '@ton/core';

export type VestingDeployerContractConfig = {
    owner: Address;
    salt: Buffer;
};
