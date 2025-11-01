import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { VestingDeployerSandbox } from '../wrappers/vesting-deployer';
import {
    ERROR_UNAUTHORIZED,
    ERROR_UNVALID_VESTING_CLIFF_PERIOD,
    ERROR_UNVALID_VESTING_DURATION,
    ERROR_UNVALID_VESTING_PERIOD,
    ERROR_UNVALID_VESTING_UNLOCKABLE_AMOUNT,
    ACTION_ERROR_NOT_ENOUTH_TONCOIN,
} from '../wrappers/constants';
import { VestingItemSandbox } from '../wrappers/vesting-item';

describe('Deployment Test', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let beneficiary: SandboxContract<TreasuryContract>;
    let scammer: SandboxContract<TreasuryContract>;
    let vestingDeployer: VestingDeployerSandbox;
    let vestingItem: VestingItemSandbox;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        deployer = await blockchain.treasury('deployer');
        beneficiary = await blockchain.treasury('beneficiary');
        scammer = await blockchain.treasury('scammer');
        vestingDeployer = await VestingDeployerSandbox.create(blockchain, deployer);
    });

    it('Deploy -> ERROR_UNAUTHORIZED', async () => {
        const deployRes = await vestingDeployer.deploy(scammer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(9),
            startTime: blockchain.now!,
            duration: 1000,
            period: 10,
            cliffPeriod: 100,
        });
        deployRes.shouldError(ERROR_UNAUTHORIZED);
    });

    it('Deploy -> ERROR_UNVALID_VESTING_UNLOCKABLE_AMOUNT', async () => {
        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(0),
            startTime: blockchain.now!,
            duration: 1000,
            period: 10,
            cliffPeriod: 100,
        });
        deployRes.shouldError(ERROR_UNVALID_VESTING_UNLOCKABLE_AMOUNT);
    });

    it('Deploy -> ERROR_UNVALID_VESTING_DURATION', async () => {
        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(10),
            startTime: blockchain.now!,
            duration: 0,
            period: 10,
            cliffPeriod: 100,
        });
        deployRes.shouldError(ERROR_UNVALID_VESTING_DURATION);
    });

    it('Deploy -> ERROR_UNVALID_VESTING_PERIOD', async () => {
        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(10),
            startTime: blockchain.now!,
            duration: 1000,
            period: 11,
            cliffPeriod: 100,
        });
        deployRes.shouldError(ERROR_UNVALID_VESTING_PERIOD);
    });

    it('Deploy -> ERROR_UNVALID_VESTING_cliffPeriod', async () => {
        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(10),
            startTime: blockchain.now!,
            duration: 1000,
            period: 10,
            cliffPeriod: 1001,
        });
        deployRes.shouldError(ERROR_UNVALID_VESTING_CLIFF_PERIOD);
    });

    it('Deploy -> ACTION_ERROR_NOT_ENOUTH_TONCOIN', async () => {
        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(10), {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(10),
            startTime: blockchain.now!,
            duration: 1000,
            period: 10,
            cliffPeriod: 100,
        });
        deployRes.shouldError(0, ACTION_ERROR_NOT_ENOUTH_TONCOIN);
    });

    it('Deploy -> SUCCESS', async () => {
        const config = {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: toNano(10),
            startTime: blockchain.now!,
            duration: 1000,
            period: 10,
            cliffPeriod: 100,
        };

        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(11), config);
        deployRes.shouldSuccess();

        vestingItem = await VestingItemSandbox.create(blockchain, await vestingDeployer.getVestingAddress());

        await vestingItem.toMatchData(config);
    });
});
