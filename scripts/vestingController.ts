import { Address, fromNano, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingItemContract } from '../wrappers/vesting-item/api';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    // Запрашиваем адрес вестинг контракта
    const vestingAddress = await ui.input('Enter vesting contract address:');

    // Создаем инстанс контракта
    const vesting = provider.open(VestingItemContract.createFromAddress(Address.parse(vestingAddress)));

    ui.write(`Connected to vesting contract: ${vesting.address.toString()}`);

    // Показываем данные контракта
    try {
        const data = await vesting.getContractData();
        ui.write(`
          Vesting Contract Data:
            Beneficiary: ${data.beneficiaryAddress!.toString()}
            Unlockable: ${fromNano(data.unlockableAmount)} TON
            Released: ${fromNano(data.releasedAmount)} TON
            Start: ${new Date(data.startTime * 1000).toLocaleString()}
            Duration: ${data.duration} sec
            Period: ${data.period} sec
            Cliff Period: ${data.cliffPeriod} sec
        `);
    } catch (error) {
        ui.write(`❌ Error reading contract data: ${error}`);
    }

    // Проверяем доступное количество
    try {
        const available = await vesting.getAvaliableAmountToWithdraw();
        ui.write(`✅ Available to claim: ${fromNano(available)} TON`);
    } catch (error) {
        ui.write(`❌ Error checking available amount: ${error}`);
    }

    // Проверяем баланс
    try {
        const balance = await vesting.getContractBalance();
        ui.write(`💰 Contract balance: ${fromNano(balance)} TON`);
    } catch (error) {
        ui.write(`❌ Error checking balance: ${error}`);
    }

    // Предлагаем сделать claim
    const shouldClaim = await ui.prompt('Do you want to claim available tokens?');

    if (shouldClaim) {
        try {
            await vesting.sendClaim(provider.sender(), toNano('0.1'));
            ui.write('✅ Claim transaction sent!');
            await provider.waitForLastTransaction();
        } catch (error) {
            ui.write(`❌ Error claiming tokens: ${error}`);
        }
    }
}
