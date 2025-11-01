import { beginCell, Cell } from '@ton/core';
import { VestingItemContractConfig } from './types';

import * as Constants from '../constants';

export function vestingItemContractConfigToCell(config: VestingItemContractConfig): Cell {
    return beginCell()
        .storeAddress(config.beneficiaryAddress)
        .storeCoins(config.unlockableAmount)
        .storeUint(config.startTime, Constants.TIME_SIZE)
        .storeUint(config.duration, Constants.TIME_SIZE)
        .storeUint(config.period, Constants.TIME_SIZE)
        .storeUint(config.cliffPeriod, Constants.TIME_SIZE)
        .endCell();
}
