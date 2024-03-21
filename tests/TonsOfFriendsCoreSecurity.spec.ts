import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import { TonsOfFriendsCore } from '../wrappers/TonsOfFriendsCore';
import '@ton/test-utils';
import pino from 'pino';
import { TonsOfFriendsGroups } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsGroups';
import { TonsOfFriendsSettlement } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsSettlement';
import {
    successfullyCreateGroup,
    successfulBuyShares,
    successfulSellShares,
    successfullyDeploySettlement,
    successfullyUpdateCoreSettlementContractAddress,
    successfulChangeSettlementContract,
    successfulChangeGlobalPause,
    successfulChangePlatformAddress,
    successfulChangePlatformFee,
    successfulChangeGroupFee,
    successfulChangeReferralFee,
    successfulChangeGasConsumption,
    successfulChangeRefGasConsumption,
    successfulChangeLogicGasConsumption,
    successfulChangeGroupPause,
    successfullyChangePublicKey,
} from './utils';
import { TonsOfFriendsBalance } from '../build/TonsOfFriendsCore/tact_TonsOfFriendsBalance';

const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
});

describe('TonsOfFriendsCore', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tonsOfFriendsSettlement: SandboxContract<TonsOfFriendsSettlement>;
    let tonsOfFriendsCore: SandboxContract<TonsOfFriendsCore>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        tonsOfFriendsCore = blockchain.openContract(await TonsOfFriendsCore.fromInit());
        deployer = await blockchain.treasury('deployer');

        tonsOfFriendsSettlement = blockchain.openContract(
            await TonsOfFriendsSettlement.fromInit(tonsOfFriendsCore.address),
        );

        await successfullyDeploySettlement(deployer.getSender(), tonsOfFriendsSettlement);
        await successfullyUpdateCoreSettlementContractAddress(
            deployer.getSender(),
            tonsOfFriendsCore,
            tonsOfFriendsSettlement,
        );
        await successfullyChangePublicKey(deployer.getSender(), tonsOfFriendsCore);
    });

    it('should correctly deploy core and settlement contract', async () => {
        const coreSettlmentAddress = await tonsOfFriendsCore.getSettlementAddress();
        expect(coreSettlmentAddress).toEqualAddress(tonsOfFriendsSettlement.address);
    });

    it('should create vault and not buy once due to not having enough TON for key and refund', async () => {
        const ownerAddress = deployer.getSender();
        const logicGas = toNano('1');
        const refGas = toNano('1');

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));

        const buyShares = await tonsOfFriendsCore.send(
            ownerAddress,
            {
                value: logicGas + refGas,
            },
            {
                $$type: 'BuyCore',
                keysAmount: BigInt(1),
                groupId: BigInt(1),
                refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                logicGas,
                refGas,
                keysValue: BigInt(0),
            },
        );

        expect(buyShares.transactions).toHaveTransaction({
            from: tonsOfFriendsCore.address,
            to: ownerAddress.address,
            success: true,
        });
    });

    it('should create vault and not buy once due to not having enough TON for logic gas and refund', async () => {
        const ownerAddress = deployer.getSender();

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));

        const logicGas = toNano('0');
        const refGas = toNano('1');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));
        const groupKeys = await tonsOfFriendsGroups.getKeys();
        const keysValue = await tonsOfFriendsGroups.getGetPrice(groupKeys, BigInt(1));
        const platformFee = await tonsOfFriendsCore.getPlatformFee();
        const groupFee = await tonsOfFriendsCore.getGroupFee();
        const keysValueAndFee =
            keysValue + (keysValue * BigInt(platformFee)) / BigInt(100) + (keysValue * BigInt(groupFee)) / BigInt(100);

        const buyShares = await tonsOfFriendsCore.send(
            ownerAddress,
            {
                value: logicGas + refGas,
            },
            {
                $$type: 'BuyCore',
                keysAmount: BigInt(1),
                groupId: BigInt(1),
                refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                logicGas,
                refGas,
                keysValue: keysValueAndFee,
            },
        );

        expect(buyShares.transactions).toHaveTransaction({
            from: tonsOfFriendsCore.address,
            to: ownerAddress.address,
            success: true,
        });
    });

    it('should create vault and not buy once due to not having enough TON for ref gas and refund', async () => {
        const ownerAddress = deployer.getSender();

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));

        const logicGas = toNano('1');
        const refGas = toNano('0');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));
        const groupKeys = await tonsOfFriendsGroups.getKeys();
        const keysValue = await tonsOfFriendsGroups.getGetPrice(groupKeys, BigInt(1));
        const platformFee = await tonsOfFriendsCore.getPlatformFee();
        const groupFee = await tonsOfFriendsCore.getGroupFee();
        const keysValueAndFee =
            keysValue + (keysValue * BigInt(platformFee)) / BigInt(100) + (keysValue * BigInt(groupFee)) / BigInt(100);

        const buyShares = await tonsOfFriendsCore.send(
            ownerAddress,
            {
                value: logicGas + refGas,
            },
            {
                $$type: 'BuyCore',
                keysAmount: BigInt(1),
                groupId: BigInt(1),
                refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                logicGas,
                refGas,
                keysValue: keysValueAndFee,
            },
        );

        expect(buyShares.transactions).toHaveTransaction({
            from: tonsOfFriendsCore.address,
            to: ownerAddress.address,
            success: true,
        });
    });

    it('should create vault and not buy once due to attempting to buy too much keys and refund', async () => {
        const ownerAddress = deployer.getSender();

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));

        const logicGas = toNano('1');
        const refGas = toNano('1');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));
        const groupKeys = await tonsOfFriendsGroups.getKeys();
        const keysValue = await tonsOfFriendsGroups.getGetPrice(groupKeys, BigInt(2));
        const platformFee = await tonsOfFriendsCore.getPlatformFee();
        const groupFee = await tonsOfFriendsCore.getGroupFee();
        const keysValueAndFee =
            keysValue + (keysValue * BigInt(platformFee)) / BigInt(100) + (keysValue * BigInt(groupFee)) / BigInt(100);

        const buyShares = await tonsOfFriendsCore.send(
            ownerAddress,
            {
                value: logicGas + refGas,
            },
            {
                $$type: 'BuyCore',
                keysAmount: BigInt(2),
                groupId: BigInt(1),
                refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                logicGas,
                refGas,
                keysValue: keysValueAndFee,
            },
        );

        expect(buyShares.transactions).toHaveTransaction({
            from: tonsOfFriendsCore.address,
            to: ownerAddress.address,
            success: true,
        });
    });

    it('should create vault and buy once and attempt to sell twice but fail on second attempt', async () => {
        const ownerAddress = deployer.getSender();
        const logicGas = toNano('1');
        const refGas = toNano('1');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));
        await successfulBuyShares(
            ownerAddress,
            tonsOfFriendsCore,
            tonsOfFriendsGroups,
            tonsOfFriendsSettlement,
            logicGas,
            refGas,
            BigInt(1),
            BigInt(1),
        );
        await successfulSellShares(
            ownerAddress,
            tonsOfFriendsCore,
            tonsOfFriendsSettlement,
            logicGas,
            refGas,
            BigInt(1),
            BigInt(1),
        );

        const failSellShares = await tonsOfFriendsCore.send(
            ownerAddress,
            {
                value: logicGas + refGas,
            },
            {
                $$type: 'SellCore',
                keysAmount: BigInt(1),
                groupId: BigInt(1),
                refBalance: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                logicGas,
                refGas,
            },
        );

        const tonsOfFriendsBalance = blockchain.openContract(
            await TonsOfFriendsBalance.fromInit(
                tonsOfFriendsCore.address,
                tonsOfFriendsGroups.address,
                ownerAddress.address,
            ),
        );

        expect(failSellShares.transactions).toHaveTransaction({
            from: tonsOfFriendsCore.address,
            to: tonsOfFriendsBalance.address,
            success: false,
        });
    });
});
