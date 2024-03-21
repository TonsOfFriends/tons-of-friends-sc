import { Address, Sender, beginCell, toNano } from '@ton/core';
import { keyPairFromSecretKey, sign } from '@ton/crypto';
import { TonsOfFriendsCore } from '../wrappers/TonsOfFriendsCore';
import { SandboxContract } from '@ton/sandbox';
import { TonsOfFriendsGroups } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsGroups';
import { TonsOfFriendsSettlement } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsSettlement';
import { WalletContractV4 } from '@ton/ton';

export const backendPK =
    '911ed45ff8741203998c5c194df19c021ed50fd7093cdde75c0c703adb6d622bc4d7607943df28d87e8bcd8828187c3b741d480aa97105454e18bb3efc1a1c77';
export const backendPair = keyPairFromSecretKey(Buffer.from(backendPK, 'hex'));
export const backEndSigner = WalletContractV4.create({ workchain: 0, publicKey: backendPair.publicKey });

export const successfullyDeploySettlement = async (
    sender: Sender,
    tonsOfFriendsSettlement: SandboxContract<TonsOfFriendsSettlement>,
) => {
    const settlementDeployResult = await tonsOfFriendsSettlement.send(
        sender,
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    expect(settlementDeployResult.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsSettlement.address,
        deploy: true,
        success: true,
    });
};

export const successfullyUpdateCoreSettlementContractAddress = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    tonsOfFriendsSettlement: SandboxContract<TonsOfFriendsSettlement>,
) => {
    const updateSettlementResult = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano('0.2'),
        },
        {
            $$type: 'SettlementContract',
            settlementContract: tonsOfFriendsSettlement.address,
        },
    );

    expect(updateSettlementResult.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfullyChangePublicKey = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
) => {
    const changePublicKey = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano('0.2'),
        },
        {
            $$type: 'PublicKey',
            key: BigInt(`0x${backEndSigner.publicKey.toString('hex')}`),
        },
    );

    expect(changePublicKey.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfullyCreateGroup = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    power: bigint,
    constant: bigint,
    groupId: bigint,
    referrer: Address = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
) => {
    let hash = beginCell()
        .storeAddress(sender.address)
        .storeUint(BigInt(1), 64)
        .storeUint(696969696969696969, 64)
        .endCell()
        .hash();

    const signedPayload = sign(Buffer.from(hash), backendPair.secretKey);
    const createGroup = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano('0.2'),
        },
        {
            $$type: 'Create',
            groupId,
            power,
            constant,
            referrer,
            signature: beginCell().storeBuffer(signedPayload).endCell(),
            validUntil: BigInt(696969696969696969),
        },
    );

    expect(createGroup.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulBuyShares = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    tonsOfFriendsGroups: SandboxContract<TonsOfFriendsGroups>,
    tonsOfFriendsSettlement: SandboxContract<TonsOfFriendsSettlement>,
    logicGas: bigint,
    refGas: bigint,
    keysAmount: bigint,
    groupId: bigint,
) => {
    const groupKeys = await tonsOfFriendsGroups.getKeys();
    const keysValue = await tonsOfFriendsGroups.getGetPrice(groupKeys, keysAmount);
    const platformFee = await tonsOfFriendsCore.getPlatformFee();
    const groupFee = await tonsOfFriendsCore.getGroupFee();
    const keysValueAndFee =
        keysValue + (keysValue * BigInt(platformFee)) / BigInt(100) + (keysValue * BigInt(groupFee)) / BigInt(100);

    const buyShares = await tonsOfFriendsCore.send(
        sender,
        {
            value: logicGas + refGas + keysValueAndFee,
        },
        {
            $$type: 'BuyCore',
            keysAmount: keysAmount,
            groupId,
            refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
            logicGas,
            refGas,
            keysValue: keysValueAndFee,
        },
    );

    expect(buyShares.transactions).toHaveTransaction({
        from: tonsOfFriendsSettlement.address,
        to: sender.address,
        success: true,
    });
};

export const successfulSellShares = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    tonsOfFriendsSettlement: SandboxContract<TonsOfFriendsSettlement>,
    logicGas: bigint,
    refGas: bigint,
    keysAmount: bigint,
    groupId: bigint,
) => {
    const sellShares = await tonsOfFriendsCore.send(
        sender,
        {
            value: logicGas + refGas,
        },
        {
            $$type: 'SellCore',
            keysAmount,
            groupId,
            refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
            logicGas,
            refGas,
        },
    );

    expect(sellShares.transactions).toHaveTransaction({
        from: tonsOfFriendsSettlement.address,
        to: sender.address,
        success: true,
    });
};

export const successfulChangeSettlementContract = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    settlementContractAddress: Address,
) => {
    const changeSettlementContract = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'SettlementContract',
            settlementContract: settlementContractAddress,
        },
    );

    expect(changeSettlementContract.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangePlatformAddress = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    platformContractAddress: Address,
) => {
    const changePlatformAddress = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'PlatformAddress',
            platformAddress: platformContractAddress,
        },
    );

    expect(changePlatformAddress.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeGlobalPause = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    state: boolean,
) => {
    const changeGlobalPause = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'GlobalPause',
            state,
        },
    );

    expect(changeGlobalPause.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeMaxKeys = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    keys: bigint,
) => {
    const changePlatformFee = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'MaxKeys',
            keys,
        },
    );

    expect(changePlatformFee.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangePlatformFee = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    fee: bigint,
) => {
    const changePlatformFee = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'PlatformFee',
            fee,
        },
    );

    expect(changePlatformFee.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeGroupFee = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    fee: bigint,
) => {
    const changeGroupFee = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'GroupFee',
            fee,
        },
    );

    expect(changeGroupFee.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeReferralFee = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    fee: bigint,
) => {
    const changeReferralFee = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'ReferralFee',
            fee,
        },
    );

    expect(changeReferralFee.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeGasConsumption = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    gas: bigint,
) => {
    const changeGasConsumption = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'GasConsumption',
            gas,
        },
    );

    expect(changeGasConsumption.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeRefGasConsumption = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    gas: bigint,
) => {
    const changeRefGasConsumption = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'RefGasConsumption',
            gas,
        },
    );

    expect(changeRefGasConsumption.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeLogicGasConsumption = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    gas: bigint,
) => {
    const changeLogicGasConsumption = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'LogicGasConsumption',
            gas,
        },
    );

    expect(changeLogicGasConsumption.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};

export const successfulChangeGroupPause = async (
    sender: Sender,
    tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>,
    groupId: bigint,
    state: boolean,
) => {
    const changeLogicGasConsumption = await tonsOfFriendsCore.send(
        sender,
        {
            value: toNano(1),
        },
        {
            $$type: 'GroupPauseCore',
            groupId,
            state,
        },
    );

    expect(changeLogicGasConsumption.transactions).toHaveTransaction({
        from: sender.address,
        to: tonsOfFriendsCore.address,
        success: true,
    });
};
