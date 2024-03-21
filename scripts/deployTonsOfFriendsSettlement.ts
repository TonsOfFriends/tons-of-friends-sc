import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { TonsOfFriendsSettlement } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsSettlement';

export async function run(provider: NetworkProvider) {
    const tonsOfFriendsCore = provider.open(await TonsOfFriendsSettlement.fromInit(Address.parse("")));

    await tonsOfFriendsCore.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(tonsOfFriendsCore.address);

    // run methods on `tonsOfFriendsCore`
}
