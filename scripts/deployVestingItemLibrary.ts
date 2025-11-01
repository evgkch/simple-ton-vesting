import { compile, NetworkProvider } from '@ton/blueprint';

import { promptToncoin } from '../wrappers/ui-utils';
import { LibrarianContract } from '../wrappers/librarian';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    ui.write(
        'The VestingItem contract uses the code from library. This reduces network fees when operating with the jetton.',
    );
    ui.write('Librarian is the contract that stores the library.');
    ui.write(
        "If someone is already storing this Paradox Wallet library on the blockchain - you don't need to deploy librarian.",
    );
    const vestingItemCompiledCode = await compile('VestingItem');
    const vestingItemLibraryCode = await compile('Librarian');

    const tonAmount = await promptToncoin(
        'Enter Toncoin amount to deploy librarian. Some of Toncoins will reserved on the contract to pay storage fees. Excess will be returned.',
        ui,
    );
    const librarian = provider.open(
        LibrarianContract.createFromConfig({ code: vestingItemCompiledCode }, vestingItemLibraryCode),
    );
    await librarian.sendDeploy(provider.sender(), tonAmount);
}
