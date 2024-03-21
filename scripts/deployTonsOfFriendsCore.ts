import { toNano } from '@ton/core';
import { TonsOfFriendsCore } from '../wrappers/TonsOfFriendsCore';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonsOfFriendsCore = provider.open(await TonsOfFriendsCore.fromInit());

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
