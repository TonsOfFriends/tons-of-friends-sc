import "@stdlib/deploy";

message Create {
    groupId: Int;
    referrer: Address;
    power: Int;
    constant: Int;
    validUntil: Int;
    signature: Slice;
}
message PauseGroup {
    groupId: Int;
    state: Bool;
}
message InitGroup {
    owner: Address;
    referrer: Address;
    power: Int;
    constant: Int;
}
message BuyCore {
    keysAmount: Int;
    keysValue: Int;
    groupId: Int;
    refBalance: Address;
    refGas: Int;
    logicGas: Int;
}
message SellCore {
    keysAmount: Int;
    groupId: Int;
    refBalance: Address;
    refGas: Int;
    logicGas: Int;
}
message BuyGroup {
    keysAmount: Int;
    keysValue: Int;
    platformFee: Int;
    groupFee: Int;
    referralFee: Int;
    purchaser: Address;
    refBalance: Address;
}
message SellGroup {
    keysAmount: Int;
    platformFee: Int;
    groupFee: Int;
    referralFee: Int;
    seller: Address;
    refBalance: Address;
    sellerKeys: Int;
}
message BuyBalance {
    keysAmount: Int;
    groupId: Int;
    purchaser: Address;
    refGroup: Address;
    groupOwner: Address;
    refBalance: Address;
    platformFeeValue: Int;
    groupFeeValue: Int;
    refGroupFeeValue: Int;
    refBalanceFeeValue: Int;
    slippageRemainder: Int;
    price: Int;
}
message SellBalance {
    keysAmount: Int;
    groupId: Int;
    refBalance: Address;
    platformFee: Int;
    groupFee: Int;
    referralFee: Int;
}
message BuyCoreCallback {
    purchaser: Address;
    groupId: Int;
    group: Address;
    groupOwner: Address;
    refBalance: Address;
    refGroup: Address;
    platformFeeValue: Int;
    groupFeeValue: Int;
    refBalanceFeeValue: Int;
    refGroupFeeValue: Int;
    slippageRemainder: Int;
    price: Int;
    purchaserKeys: Int;
}
message SellCoreCallback {
    seller: Address;
    groupId: Int;
    soldValue: Int;
    groupOwner: Address;
    refBalance: Address;
    refGroup: Address;
    platformFeeValue: Int;
    groupFeeValue: Int;
    refBalanceFeeValue: Int;
    refGroupFeeValue: Int;
    price: Int;
    sellerKeys: Int;
}
message BuyCoreRefundOnGroupFail{
    refundee: Address;
    keysValue: Int;
    groupId: Int;
}
message SettleAccounts{
    groupOwner: Address;
    groupFeeValue: Int;
    refGroup: Address;
    refGroupFeeValue: Int;
    refBalance: Address;
    refBalanceFeeValue: Int;
    platform: Address;
    platformFeeValue: Int;
    purchaser: Address;
    purchaserValue: Int;
    isBuy: Bool;
}
message SettlementContract{
    settlementContract: Address;
}

message GlobalPause {
    state: Bool;
}
message GroupPauseCore {
    groupId: Int;
    state: Bool;
}
message GroupPauseGroup {
    state: Bool;
}
message PlatformAddress{
    platformAddress: Address;
}
message PlatformFee {
    fee: Int;
}
message GroupFee {
    fee: Int;
}
message ReferralFee {
    fee: Int;
}
message SignedData {
    groupId: Int as uint256;
    adminAddress: Address;
    validUntil: Int as uint256;
}
message BuyEvent{
    keysAmount: Int;
    price: Int;
}
message SellEvent{
    keysAmount: Int;
    price: Int;
}
message GasConsumption{
    gas: Int;
}
message RefGasConsumption{
    gas: Int;
}
message LogicGasConsumption{
    gas: Int;
}
message MaxKeys{
    keys: Int;
}
message PublicKey{
    key: Int;
}

const zeroAddress: Address = address("EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c");

contract TonsOfFriendsCore with Deployable {
    owner: Address;
    settlementContract: Address = address("EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c");
    platformAddress: Address;
    platformFee: Int = 5;
    referralFee: Int = 10;
    groupFee: Int = 5;
    globalPause: Bool = false;
    gasConsumption: Int = ton("0.04");
    refGasConsumption: Int = ton("0.5");
    logicGasConsumption: Int = ton("0.5");
    maxKeys: Int = 1;
    publicKey: Int = 102011152049181978335681070526027062779510819452711134051654655250217027895489;

    init(){
        self.platformAddress = sender();
        self.owner = sender();
    }

    receive(msg: Create){
        require(self.settlementContract != zeroAddress, "SETTLEMENT_CONTRACT_UNSET");
        require(!self.globalPause, "TONS_OF_FRIENDS_PAUSED");
        require(msg.validUntil >= now(), "EXPIRED_SIGNATURE");
        let hash: Int = beginCell().storeAddress(sender()).storeUint(msg.groupId, 64).storeUint(msg.validUntil, 64).endCell().hash();
        require(checkSignature(hash, msg.signature, self.publicKey), "SIGNATURE_NOT_VERIFIED");
        
        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);

        require(context().value > 0, "NOT_ENOUGH_TON");

        send(SendParameters{
                to: contractAddress(groupInit),
                value: 0,
                body: InitGroup{ 
                    owner: sender(),
                    referrer: msg.referrer,
                    power: msg.power, 
                    constant: msg.constant
                }.toCell(),
                code: groupInit.code,
                data: groupInit.data,
                mode: SendRemainingValue
        });
    }

    receive(msg: BuyCore){
        require(self.settlementContract != zeroAddress, "SETTLEMENT_CONTRACT_UNSET");
        require(!self.globalPause, "GLOBAL_PAUSE_APPLIED");
        require(msg.keysAmount > 0, "MIN_KEYS_REQUIRED");
        require(msg.keysAmount <= self.maxKeys, "MAX_KEYS_EXCEEDED");

        require(context().value >= (msg.logicGas + msg.refGas + msg.keysValue), "NOT_ENOUGH_TON");
        require((msg.refGas + msg.logicGas) >= (self.refGasConsumption + self.logicGasConsumption), "NOT_ENOUGH_GAS");

        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);

        send(SendParameters{
            to: contractAddress(groupInit),
            value: msg.logicGas + msg.refGas - self.gasConsumption,
            body: BuyGroup{
                keysAmount: msg.keysAmount,
                keysValue: msg.keysValue,
                purchaser: sender(),
                refBalance: msg.refBalance,
                platformFee: self.platformFee,
                groupFee: self.groupFee,
                referralFee: self.referralFee
            }.toCell()        
        });
    }

    receive(msg: BuyCoreCallback){
        let balanceInit: StateInit = initOf TonsOfFriendsBalance(myAddress(), msg.group, msg.purchaser);
        let settlementInit: StateInit = initOf TonsOfFriendsSettlement(myAddress());

        require(sender() == contractAddress(balanceInit), "SENDER_NOT_BALANCE");
        
        let settlementValue: Int = msg.refBalanceFeeValue + msg.refGroupFeeValue + msg.groupFeeValue + msg.platformFeeValue + msg.slippageRemainder;

        send(SendParameters{
            to: contractAddress(settlementInit),
            value: settlementValue,
            body: SettleAccounts{
                groupOwner: msg.groupOwner,
                groupFeeValue: msg.groupFeeValue,
                refGroup: msg.refGroup,
                refGroupFeeValue: msg.refGroupFeeValue,
                refBalance: msg.refBalance,
                refBalanceFeeValue: msg.refBalanceFeeValue,
                platform: self.platformAddress,
                platformFeeValue: msg.platformFeeValue,
                purchaser: msg.purchaser,
                purchaserValue:  msg.slippageRemainder,
                isBuy: true
            }.toCell(),
            mode: SendRemainingValue
        });
    }

    receive(msg: BuyCoreRefundOnGroupFail){
        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);
        require(sender() == contractAddress(groupInit), "SENDER_NOT_GROUP");

        send(SendParameters{
            to: msg.refundee,
            value: msg.keysValue,
            mode: SendRemainingValue
        });
    }

    receive(msg: SellCore){
        require(self.settlementContract != zeroAddress, "SETTLEMENT_CONTRACT_UNSET");
        require(!self.globalPause, "GLOBAL_PAUSE_APPLIED");
        require(msg.keysAmount > 0, "MIN_KEYS_REQUIRED");
        require(msg.keysAmount <= self.maxKeys, "MAX_KEYS_EXCEEDED");

        require(context().value >= (msg.logicGas + msg.refGas), "NOT_ENOUGH_TON");
        require((msg.refGas + msg.logicGas) >= (self.refGasConsumption + self.logicGasConsumption), "NOT_ENOUGH_GAS");
        

        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);
        let balanceInit: StateInit = initOf TonsOfFriendsBalance(myAddress(), contractAddress(groupInit), sender());
        
        send(SendParameters{
            to: contractAddress(balanceInit),
            value: msg.logicGas + msg.refGas - self.gasConsumption,
            body: SellBalance{
                keysAmount: msg.keysAmount,
                groupId: msg.groupId,
                refBalance: msg.refBalance,
                platformFee: self.platformFee,
                groupFee: self.groupFee,
                referralFee: self.referralFee
            }.toCell()
        });
    }

    receive(msg: SellCoreCallback){
        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);
        let settlementInit: StateInit = initOf TonsOfFriendsSettlement(myAddress());

        require(sender() == contractAddress(groupInit), "SENDER_NOT_GROUP");

        let settlementValue: Int = msg.refBalanceFeeValue + msg.refGroupFeeValue + msg.groupFeeValue + msg.platformFeeValue + msg.soldValue;
          
        send(SendParameters{
        to: contractAddress(settlementInit),
        value: settlementValue,
        body: SettleAccounts{
            groupOwner: msg.groupOwner,
            groupFeeValue: msg.groupFeeValue,
            refGroup: msg.refGroup,
            refGroupFeeValue: msg.refGroupFeeValue,
            refBalance: msg.refBalance,
            refBalanceFeeValue: msg.refBalanceFeeValue,
            platform: self.platformAddress,
            platformFeeValue: msg.platformFeeValue,
            purchaser: msg.seller,
            purchaserValue:  msg.soldValue,
            isBuy: false
        }.toCell(),
        mode: SendRemainingValue
        });
    }

    receive(msg: SettlementContract){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.settlementContract = msg.settlementContract;
        self.refundGas();
    }

    receive(msg: GlobalPause){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.globalPause = msg.state;
        self.refundGas();
    }

    receive(msg: PlatformAddress){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.platformAddress = msg.platformAddress;
        self.refundGas();
    }

    receive(msg: MaxKeys){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.maxKeys = msg.keys;
        self.refundGas();
    }

    receive(msg: PlatformFee){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.platformFee = msg.fee;
        self.refundGas();
    }

    receive(msg: GroupFee){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.groupFee = msg.fee;
        self.refundGas();
    }

    receive(msg: ReferralFee){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.referralFee = msg.fee;
        self.refundGas();
    }

    receive(msg: PublicKey){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.publicKey = msg.key;
        self.refundGas();
    }

    receive(msg: GroupPauseCore){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);

        send(SendParameters{
            to: contractAddress(groupInit),
            value: 0,
            body: GroupPauseGroup{
                state: msg.state
            }.toCell(),
            mode: SendRemainingValue
        });
    }

    receive(msg: GasConsumption){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.gasConsumption = msg.gas;
        self.refundGas();
    }

    receive(msg: RefGasConsumption){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.refGasConsumption = msg.gas;
        self.refundGas();
    }

    receive(msg: LogicGasConsumption){
        require(sender() == self.owner, "SENDER_NOT_OWNER");
        self.logicGasConsumption = msg.gas;
        self.refundGas();
    }

    get fun max_keys(): Int{
        return self.maxKeys;
    }


    get fun global_pause(): Bool{
        return self.globalPause;
    }

    get fun platform_address(): Address{
        return self.platformAddress;
    }

    get fun settlement_address(): Address{
        return self.settlementContract;
    }

    get fun platform_fee(): Int{
        return self.platformFee;
    }

    get fun group_fee(): Int{
        return self.groupFee;
    }

    get fun referral_fee(): Int{
        return self.referralFee;
    }

    get fun gas_consumption(): Int{
        return self.gasConsumption;
    }

    get fun ref_gas_consumption(): Int{
        return self.refGasConsumption;
    }

    get fun logic_gas_consumption(): Int{
        return self.logicGasConsumption;
    }

    fun refundGas(){
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            bounce: false
        });
    }
  }

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

  contract TonsOfFriendsGroups with Deployable {
    core: Address;
    owner: Address;
    referrer: Address;
    groupId: Int;
    keys: Int = 0;
    paused: Bool = false;

    constant: Int = 0;
    power: Int = 0;

    init(groupId: Int){
        self.core = sender();
        self.groupId = groupId;
        self.owner = sender();
        self.referrer = sender();
    }

    receive(msg: InitGroup){
        require(self.core == sender(), "SENDER_NOT_CORE");
        self.owner = msg.owner; 
        self.referrer = msg.referrer;
        self.power = msg.power;
        self.constant = msg.constant;

        send(SendParameters{
                to: self.owner,
                value: 0,
                mode: SendRemainingValue,
                bounce: false
            });
    }

    receive(msg: BuyGroup){
        require(self.core == sender(), "SENDER_NOT_CORE");
        
        let price: Int = self.get_price(self.keys, msg.keysAmount);        
        let platformFeeValue: Int = (price * msg.platformFee) / 100;
        let groupFeeValue: Int = (price * msg.groupFee) / 100;
        let referralFeeValue: Int = (platformFeeValue * msg.referralFee) / 100;
        platformFeeValue = platformFeeValue - referralFeeValue;
        
        let totalIncludingFees: Int = price + platformFeeValue + groupFeeValue + referralFeeValue;

        if(msg.keysValue < totalIncludingFees){
            send(SendParameters{
                to: self.core,
                value: 0,
                body: BuyCoreRefundOnGroupFail{
                    refundee: msg.purchaser,
                    keysValue: msg.keysValue ,
                    groupId: self.groupId
                }.toCell(),
                mode: SendRemainingValue
            });
            return;
        }

        let slippageRemainder: Int = msg.keysValue - totalIncludingFees;

        self.keys = self.keys + msg.keysAmount;

        let balanceInit: StateInit = initOf TonsOfFriendsBalance(sender(), myAddress(), msg.purchaser);

        send(SendParameters{
            to: contractAddress(balanceInit),
            value: 0,
            body: BuyBalance{
                keysAmount: msg.keysAmount,
                purchaser: msg.purchaser,
                refGroup: self.referrer,
                refBalance: msg.refBalance,
                groupOwner: self.owner,
                platformFeeValue: platformFeeValue,
                groupFeeValue: groupFeeValue,
                refGroupFeeValue: referralFeeValue / 2,
                refBalanceFeeValue: referralFeeValue / 2,
                slippageRemainder: slippageRemainder,
                price: price,
                groupId: self.groupId
            }.toCell(),
            code: balanceInit.code,
            data: balanceInit.data,
            mode: SendRemainingValue
        });

    }

    receive(msg: SellGroup){
        let balanceInit: StateInit = initOf TonsOfFriendsBalance(self.core, myAddress(), msg.seller);
        
        require(contractAddress(balanceInit) == sender(), "SENDER_NOT_GROUP");
        let price: Int = self.get_price(self.keys - msg.keysAmount, msg.keysAmount);

        let platformFeeValue: Int = (price * msg.platformFee) / 100;
        let groupFeeValue: Int = (price * msg.groupFee) / 100;
        let referralFeeValue: Int = (platformFeeValue * msg.referralFee) / 100;
        platformFeeValue = platformFeeValue - referralFeeValue;

        self.keys = self.keys - msg.keysAmount;


        let coreInit: StateInit = initOf TonsOfFriendsCore();
        
        send(SendParameters{
            to: self.core,
            value: 0,
            body: SellCoreCallback{
                seller: msg.seller,
                refGroup: self.referrer,
                refBalance: msg.refBalance,
                groupId: self.groupId,
                soldValue: price - (platformFeeValue + groupFeeValue + referralFeeValue),
                groupOwner: self.owner,
                platformFeeValue: platformFeeValue,
                groupFeeValue: groupFeeValue,
                refGroupFeeValue: referralFeeValue / 2,
                refBalanceFeeValue: referralFeeValue / 2,
                price: price,
                sellerKeys: msg.sellerKeys
            }.toCell(),
            mode: SendRemainingValue
        });
    }

    receive(msg: GroupPauseGroup){
        require(sender() == self.core, "SENDER_NOT_CORE");
        self.paused = msg.state;
    }

    fun dynamic_power(x: Int, num: Int): Int{
        let returnProduct: Int = x;
        repeat(num - 1){
            returnProduct = returnProduct * x;
        }
        return returnProduct;
    }

    get fun get_price(supply: Int, amount: Int): Int{
        let i: Int = supply;
        let sum: Int = 0;
        do{
            i = i + 1;
            sum = sum + (self.dynamic_power(i, self.power)*ton("1")) / (self.constant) + ton("1");
        } until (i >= supply + amount);
        return sum;
    }   


    get fun owner(): Address{
        return self.owner;
    }

    get fun core(): Address{
        return self.core;
    }

    get fun paused(): Bool{
        return self.paused;
    }

    get fun keys(): Int{
        return self.keys;
    }
  }

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

  contract TonsOfFriendsBalance with Deployable {
    owner: Address;
    core: Address;
    group: Address;
    keys: Int = 0;

    init(core: Address,  group: Address, owner: Address){
        self.core = core;
        self.group = group; 
        self.owner = owner;
    }

   receive(msg: BuyBalance){
        require(self.group == sender(), "SENDER_NOT_GROUP");

        self.keys = self.keys + msg.keysAmount;

        let coreInit: StateInit = initOf TonsOfFriendsCore();
        send(SendParameters{
            to: self.core,
            value: 0,
            body: BuyCoreCallback{
                purchaser: self.owner,
                group: self.group,
                groupOwner: msg.groupOwner,
                refGroup: msg.refGroup,
                refBalance: msg.refBalance,
                platformFeeValue: msg.platformFeeValue,
                groupFeeValue: msg.groupFeeValue,
                refGroupFeeValue: msg.refGroupFeeValue,
                refBalanceFeeValue: msg.refBalanceFeeValue,
                slippageRemainder: msg.slippageRemainder,
                price: msg.price,
                groupId: msg.groupId,
                purchaserKeys: self.keys
            }.toCell(),
            mode: SendRemainingValue
        });
    }

    receive(msg: SellBalance){
        require(self.core == sender(), "SENDER_NOT_CORE");
        require(msg.keysAmount <= self.keys, "NOT_ENOUGH_KEYS");

        self.keys = self.keys - msg.keysAmount;

        let groupInit: StateInit = initOf TonsOfFriendsGroups(msg.groupId);
        send(SendParameters{
            to: contractAddress(groupInit),
            value: 0,
            body: SellGroup{
                keysAmount: msg.keysAmount,
                seller: self.owner,
                refBalance: msg.refBalance,
                platformFee: msg.platformFee,
                groupFee: msg.groupFee,
                referralFee: msg.referralFee,
                sellerKeys: self.keys
            }.toCell(),
            mode: SendRemainingValue
        });
    }

    get fun keys(): Int{
        return self.keys;
    }
  }

/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

 contract TonsOfFriendsSettlement with Deployable {
    core: Address;

    init(core: Address){
        self.core = core;
    }

    receive(msg: SettleAccounts){
        require(self.core == sender(), "SENDER_NOT_CORE");
        if(msg.refBalance != zeroAddress){
            send(SendParameters{
                to: msg.refBalance,
                value: msg.refBalanceFeeValue,
                mode: SendPayGasSeparately
            });
        }
        else{
            send(SendParameters{
                to: msg.platform,
                value: msg.refBalanceFeeValue,
                mode: SendPayGasSeparately
            });
        }

        if(msg.refGroup != zeroAddress){
          send(SendParameters{
                to: msg.refGroup,
                value: msg.refGroupFeeValue,
                mode: SendPayGasSeparately
            });
        }
        else{
            send(SendParameters{
                to: msg.platform,
                value: msg.refGroupFeeValue,
                mode: SendPayGasSeparately
            });
        }

        send(SendParameters{
            to: msg.groupOwner,
            value: msg.groupFeeValue,
            mode: SendPayGasSeparately
        });

        send(SendParameters{
            to: msg.platform,
            value: msg.platformFeeValue,
            mode: SendPayGasSeparately 
        });
        

        if (msg.isBuy) {
            send(SendParameters{
                to: msg.purchaser, 
                value: msg.purchaserValue,
                mode: SendRemainingBalance,
                body: "Successfully bought".asComment()
            });
        } else {    
            send(SendParameters{
                to: msg.purchaser, 
                value: msg.purchaserValue,
                mode: SendRemainingBalance,
                body: "Successfully sold".asComment()
            });   
        }
    }
 } 