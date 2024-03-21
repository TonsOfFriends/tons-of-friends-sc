import { Address, toNano } from '@ton/core';
import { TonsOfFriendsCore } from '../wrappers/TonsOfFriendsCore';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonsOfFriendsCore = provider.open(
        await TonsOfFriendsCore.fromAddress(Address.parse('')),
    );

    await tonsOfFriendsCore.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'SettlementContract',
            settlementContract: Address.parse(''),
        },
    );

    // await provider.waitForDeploy(tonsOfFriendsCore.address);

    // run methods on `tonsOfFriendsCore`
}
