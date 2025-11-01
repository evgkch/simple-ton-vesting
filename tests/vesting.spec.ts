import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { VestingDeployerSandbox } from '../wrappers/vesting-deployer';
import {
    ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW,
    ERROR_UNAUTHORIZED,
    ERROR_VESTING_NOT_STARTED,
} from '../wrappers/constants';
import { VestingItemSandbox } from '../wrappers/vesting-item';

describe('Vesting Test', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let beneficiary: SandboxContract<TreasuryContract>;
    let scammer: SandboxContract<TreasuryContract>;
    let vestingDeployer: VestingDeployerSandbox;
    let vestingItem: VestingItemSandbox;

    // Вспомогательная функция для расчета доступной суммы
    function calculateAvailableAmount(
        currentTime: number,
        startTime: number,
        duration: number,
        cliffPeriod: number,
        period: number,
        unlockableAmount: bigint,
        releasedAmount: bigint = 0n,
    ): bigint {
        const dt = Math.min(duration, Math.max(0, currentTime - startTime));

        if (dt < cliffPeriod) {
            return 0n;
        }

        const passedSteps = Math.floor(dt / period);
        const totalSteps = Math.floor(duration / period);

        // Расчет progress_amount = unlockableAmount * passedSteps / totalSteps
        const progressAmount = (unlockableAmount * BigInt(passedSteps)) / BigInt(totalSteps);

        const available = progressAmount - releasedAmount;
        return available > 0n ? available : 0n;
    }

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        deployer = await blockchain.treasury('deployer');
        beneficiary = await blockchain.treasury('beneficiary');
        scammer = await blockchain.treasury('scammer');
        vestingDeployer = await VestingDeployerSandbox.create(blockchain, deployer);
    });

    const START_TIME_DURATION = 1000;
    let config: any;
    let totalClaimed = 0n;
    const initialContractBalance = toNano(10); // unlockableAmount

    it('Deploy -> SUCCESS', async () => {
        config = {
            beneficiaryAddress: beneficiary.address,
            unlockableAmount: initialContractBalance,
            startTime: blockchain.now! + START_TIME_DURATION,
            duration: 1000,
            period: 10,
            cliffPeriod: 100,
        };

        const deployRes = await vestingDeployer.deploy(deployer.getSender(), toNano(11), config);
        deployRes.shouldSuccess();

        vestingItem = await VestingItemSandbox.create(blockchain, await vestingDeployer.getVestingAddress());

        // Проверяем все данные контракта
        await vestingItem.toMatchData({
            beneficiaryAddress: config.beneficiaryAddress,
            unlockableAmount: config.unlockableAmount,
            releasedAmount: 0n,
            startTime: config.startTime,
            duration: config.duration,
            period: config.period,
            cliffPeriod: config.cliffPeriod,
        });

        // Проверяем начальный баланс
        expect(await vestingItem.getContractBalance()).toEqual(initialContractBalance);
    });

    it('Claim -> ERROR_UNAUTHORIZED', async () => {
        const claimResult = await vestingItem.claim(scammer.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_UNAUTHORIZED);

        // Проверяем что состояние не изменилось
        await vestingItem.toMatchData({
            releasedAmount: 0n,
        });
    });

    it('Claim -> ERROR_VESTING_NOT_STARTED', async () => {
        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_VESTING_NOT_STARTED);

        // Проверяем что состояние не изменилось
        await vestingItem.toMatchData({
            releasedAmount: 0n,
        });
    });

    it('Claim -> ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW \n\t WHERE t < startTime', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(expectedAmount).toEqual(0n);
        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW);

        // Проверяем что состояние не изменилось
        await vestingItem.toMatchData({
            releasedAmount: 0n,
        });
    });

    it('Claim -> ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW \n\t WHERE startTime <= now < startTime + cliffPeriod', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.cliffPeriod - 1;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(expectedAmount).toEqual(0n);
        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW);

        // Проверяем что состояние не изменилось
        await vestingItem.toMatchData({
            releasedAmount: 0n,
        });
    });

    it('Claim -> SUCCESS \n\t WHERE startTime + cliffPeriod <= now AND 0 claims', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.cliffPeriod;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldSuccess();

        // Обновляем totalClaimed и проверяем состояние
        totalClaimed += expectedAmount;

        // Проверяем обновленные данные в контракте
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });

        // Проверяем баланс контракта
        const expectedBalance = initialContractBalance - totalClaimed;
        expect(await vestingItem.getContractBalance()).toEqual(expectedBalance);

        // Проверяем что доступная сумма теперь 0
        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(0n);
    });

    it('Claim -> ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW \n\t WHERE startTime + cliffPeriod <= now < 1 * period', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.cliffPeriod + data.period - 1;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(expectedAmount).toEqual(0n);
        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW);

        // Проверяем что состояние не изменилось
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });
    });

    it('Claim -> SUCCESS \n\t WHERE startTime + cliffPeriod <= now = 1 * period', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.cliffPeriod + data.period;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldSuccess();

        // Обновляем totalClaimed
        totalClaimed += expectedAmount;

        // Проверяем обновленные данные в контракте
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });

        // Проверяем баланс контракта
        const expectedBalance = initialContractBalance - totalClaimed;
        expect(await vestingItem.getContractBalance()).toEqual(expectedBalance);

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(0n);
    });

    it('Claim -> SUCCESS \n\t WHERE startTime + cliffPeriod <= now = 5 * period', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.cliffPeriod + 5 * data.period;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldSuccess();

        // Обновляем totalClaimed
        totalClaimed += expectedAmount;

        // Проверяем обновленные данные в контракте
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });

        // Проверяем баланс контракта
        const expectedBalance = initialContractBalance - totalClaimed;
        expect(await vestingItem.getContractBalance()).toEqual(expectedBalance);

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(0n);
    });

    it('Claim -> SUCCESS \n\t WHERE startTime + cliffPeriod <= now = startTime + duration + eps', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.duration + data.period;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldSuccess();

        // Обновляем totalClaimed
        totalClaimed += expectedAmount;

        // Проверяем обновленные данные в контракте
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });

        // Проверяем баланс контракта (должен быть 0)
        const expectedBalance = initialContractBalance - totalClaimed;
        expect(await vestingItem.getContractBalance()).toEqual(expectedBalance);
        expect(expectedBalance).toEqual(0n);

        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(0n);
    });

    it('Claim -> ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW \n\t WHERE startTime + cliffPeriod <= now = startTime + duration + eps', async () => {
        const data = vestingItem.getCachedData();
        blockchain.now = data.startTime + data.duration + data.period;

        const expectedAmount = calculateAvailableAmount(
            blockchain.now!,
            data.startTime,
            data.duration,
            data.cliffPeriod,
            data.period,
            data.unlockableAmount,
            data.releasedAmount,
        );

        expect(expectedAmount).toEqual(0n);
        expect(await vestingItem.getAvaliableAmountToWithdraw()).toEqual(expectedAmount);

        const claimResult = await vestingItem.claim(beneficiary.getSender(), toNano(0.01));
        claimResult.shouldError(ERROR_NO_AVALIABLE_AMOUNT_TO_WITHDRAW);

        // Проверяем что состояние не изменилось (все уже забрали)
        await vestingItem.toMatchData({
            releasedAmount: totalClaimed,
        });

        // Баланс должен остаться 0
        expect(await vestingItem.getContractBalance()).toEqual(0n);
    });
});
