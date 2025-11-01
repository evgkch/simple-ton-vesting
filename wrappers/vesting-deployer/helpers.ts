import { beginCell, Cell } from '@ton/core';

import { VestingDeployerContractConfig } from './types';

export function vestingDeployerContractConfigToCell(config: VestingDeployerContractConfig): Cell {
    return beginCell().storeUint(0, 5).storeAddress(config.owner).storeBuffer(config.salt, 32).endCell();
}
