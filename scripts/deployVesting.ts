import { compile, NetworkProvider } from '@ton/blueprint';
import { fromNano, toNano } from '@ton/core';

import { VestingDeployerContract } from '../wrappers/vesting-deployer';
import { type VestingItemContractConfig } from '../wrappers/vesting-item';
import { promptUserFriendlyAddress } from '../wrappers/ui-utils';
import { fromCodeLibrary } from '../wrappers/librarian';

export async function run(provider: NetworkProvider) {
    const isTestnet = provider.network() !== 'mainnet';
    const ui = provider.ui();

    // Компилируем код VestingDeployer
    const vestingDeployerCode = await compile('VestingDeployer');

    // Компилируем код VestingItem и преобразуем через fromCodeLibrary (это библиотечный код)
    const vestingItemCompiledCode = await compile('VestingItem');
    const vestingItemLibrarianCode = fromCodeLibrary(vestingItemCompiledCode);

    // Генерируем случайную соль
    const crypto = await import('crypto');
    const salt = crypto.randomBytes(32);

    // Создаем контракт VestingDeployer
    const vestingDeployer = provider.open(
        VestingDeployerContract.createFromConfig(
            {
                owner: provider.sender().address!,
                salt: salt,
            },
            vestingDeployerCode,
        ),
    );

    // Создаем VestingItem через деплоер
    const createVesting = await ui.prompt('Do you want to create a vesting item?');

    if (createVesting) {
        // Запрашиваем параметры для VestingItem
        const beneficiary = await promptUserFriendlyAddress('Enter beneficiary address:', ui, isTestnet);
        const startTime = Math.floor(Date.now() / 1000);
        const duration = Number(await ui.input('Enter vesting duration in seconds:'));
        const period = Number(await ui.input('Enter vesting period in seconds:'));
        const cliffPeriod = Number(await ui.input('Enter vesting cliff period in seconds:'));
        const amount = toNano(await ui.input('Enter token amount:'));

        const vestingItemConfig: VestingItemContractConfig = {
            beneficiaryAddress: beneficiary.address,
            startTime,
            duration,
            period,
            cliffPeriod,
            unlockableAmount: amount,
        };

        // Подтверждаем создание VestingItem
        const okVesting = await ui.prompt(`
        Deployer:
          Deployer: ${provider.sender().address!.toString()}
          VestingItemAddress: ${vestingDeployer.address.toString()}

        VestingItem configuration:
          Beneficiary: ${beneficiary.address.toString()}
          Start Time: ${new Date(startTime * 1000).toLocaleString()}
          Duration: ${duration} seconds (${Math.floor(duration / 86400)} days)
          Period: ${period} seconds (${Math.floor(period / 86400)} days)
          Cliff Period: ${cliffPeriod} seconds (${Math.floor(cliffPeriod / 86400)} days)
          Amount: ${fromNano(amount)} TON

        Create VestingItem?
        `);

        if (!okVesting) throw `VestingItem creation cancelled`;

        // Отправляем транзакцию для создания VestingItem
        // Передаем vestingItemCode как библиотечный код
        await vestingDeployer.sendDeploy(
            provider.sender(),
            toNano(0.1) + amount,
            vestingItemLibrarianCode,
            vestingItemConfig,
        );

        ui.write('VestingItem deployment transaction sent!');
        await provider.waitForDeploy(vestingDeployer.address);
    }
}
