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
    successfulChangeMaxKeys,
    successfullyChangePublicKey,
} from './utils';

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

    it('should create vault and buy once and only have the key value inside the core', async () => {
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
    });

    it('should create vault and buy once and sell once and have almost 0 in the vault, minus gas', async () => {
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
    });

    it('should create vault and buy once and sell multiple times and have almost 0 in the vault, minus gas', async () => {
        const ownerAddress = deployer.getSender();
        const logicGas = toNano('1');
        const refGas = toNano('1');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));
        for (let i = 0; i < 10; i++) {
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
        }

        for (let i = 0; i < 10; i++) {
            await successfulSellShares(
                ownerAddress,
                tonsOfFriendsCore,
                tonsOfFriendsSettlement,
                logicGas,
                refGas,
                BigInt(1),
                BigInt(1),
            );
        }
    });

    it('should create vault and buy once and sell multiple times on the same key and have almost 0 in the vault, minus gas', async () => {
        const ownerAddress = deployer.getSender();
        const logicGas = toNano('1');
        const refGas = toNano('1');
        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));

        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));
        for (let i = 0; i < 150; i++) {
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
        }
    });

    it('should utilise all utility functions in core & group contract', async () => {
        const ownerAddress = deployer.getSender();

        const tonsOfFriendsGroups = blockchain.openContract(await TonsOfFriendsGroups.fromInit(BigInt(1)));
        await successfullyCreateGroup(ownerAddress, tonsOfFriendsCore, BigInt(3), BigInt(21_000), BigInt(1));
        const beforeGroupPause = await tonsOfFriendsGroups.getPaused();
        await successfulChangeGroupPause(ownerAddress, tonsOfFriendsCore, BigInt(1), true);
        const afterGroupPause = await tonsOfFriendsGroups.getPaused();
        expect(afterGroupPause).not.toEqual(beforeGroupPause);

        const beforeSettlementAddress = await tonsOfFriendsCore.getSettlementAddress();
        await successfulChangeSettlementContract(
            ownerAddress,
            tonsOfFriendsCore,
            Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
        );
        const afterSettlementAddress = await tonsOfFriendsCore.getSettlementAddress();
        expect(afterSettlementAddress).not.toEqual(beforeSettlementAddress);

        const beforePlatformAddress = await tonsOfFriendsCore.getPlatformAddress();
        await successfulChangePlatformAddress(
            ownerAddress,
            tonsOfFriendsCore,
            Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
        );
        const afterPlatformAddress = await tonsOfFriendsCore.getPlatformAddress();
        expect(afterPlatformAddress).not.toEqual(beforePlatformAddress);

        const beforeMaxKeys = await tonsOfFriendsCore.getMaxKeys();
        await successfulChangeMaxKeys(ownerAddress, tonsOfFriendsCore, BigInt(2));
        const afterMaxKeys = await tonsOfFriendsCore.getMaxKeys();
        expect(afterMaxKeys).not.toEqual(beforeMaxKeys);

        const beforeGlobalPause = await tonsOfFriendsCore.getGlobalPause();
        await successfulChangeGlobalPause(ownerAddress, tonsOfFriendsCore, true);
        const afterGlobalPause = await tonsOfFriendsCore.getGlobalPause();
        expect(afterGlobalPause).not.toEqual(beforeGlobalPause);

        const beforePlatformFee = await tonsOfFriendsCore.getPlatformFee();
        await successfulChangePlatformFee(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterPlatformFee = await tonsOfFriendsCore.getPlatformFee();
        expect(afterPlatformFee).not.toEqual(beforePlatformFee);

        const beforeGroupFee = await tonsOfFriendsCore.getGroupFee();
        await successfulChangeGroupFee(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterGroupFee = await tonsOfFriendsCore.getGroupFee();
        expect(afterGroupFee).not.toEqual(beforeGroupFee);

        const beforeReferralFee = await tonsOfFriendsCore.getReferralFee();
        await successfulChangeReferralFee(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterReferralFee = await tonsOfFriendsCore.getReferralFee();
        expect(afterReferralFee).not.toEqual(beforeReferralFee);

        const beforeGasConsumption = await tonsOfFriendsCore.getGasConsumption();
        await successfulChangeGasConsumption(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterGasConsumption = await tonsOfFriendsCore.getGasConsumption();
        expect(afterGasConsumption).not.toEqual(beforeGasConsumption);

        const beforeRefGasConsumption = await tonsOfFriendsCore.getRefGasConsumption();
        await successfulChangeRefGasConsumption(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterRefGasConsumption = await tonsOfFriendsCore.getRefGasConsumption();
        expect(afterRefGasConsumption).not.toEqual(beforeRefGasConsumption);

        const beforeLogicGasConsumption = await tonsOfFriendsCore.getLogicGasConsumption();
        await successfulChangeLogicGasConsumption(ownerAddress, tonsOfFriendsCore, BigInt(1));
        const afterLogicGasConsumption = await tonsOfFriendsCore.getLogicGasConsumption();
        expect(afterLogicGasConsumption).not.toEqual(beforeLogicGasConsumption);
    });
});
