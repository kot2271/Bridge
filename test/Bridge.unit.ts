import { expect } from "chai";
import { ethers } from "hardhat";
import { Bridge } from "../typechain/contracts/Bridge";
import { Token } from "../typechain/contracts/Token";
import { Bridge__factory } from "../typechain/factories/contracts/Bridge__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, Signature } from "ethers";

describe("Bridge", () => {
  let mumbaiBridge: Bridge;
  let bscBridge: Bridge;
  let mumbaiToken: Token;
  let bscToken: Token;

  let validator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const tokenName = "TestToken";
  const tokenSymbol = "TT";

  const mumbaiId: BigNumberish = 80001;
  const bscId: BigNumberish = 97;

  const initialSupply = ethers.utils.parseEther("100");
  const tokenAmount = ethers.utils.parseEther("10");

  beforeEach(async () => {
    [validator, user1, user2] = await ethers.getSigners();

    const MumbaiToken = await ethers.getContractFactory("Token");
    mumbaiToken = (await MumbaiToken.deploy(tokenName, tokenSymbol)) as Token;
    mumbaiToken.deployed();

    const BinanceToken = await ethers.getContractFactory("Token");
    bscToken = (await BinanceToken.deploy(tokenName, tokenSymbol)) as Token;
    bscToken.deployed();

    const bridgeFactory = (await ethers.getContractFactory(
      "Bridge",
      validator
    )) as Bridge__factory;
    mumbaiBridge = await bridgeFactory.deploy(
      validator.address,
      mumbaiToken.address,
      mumbaiId,
      bscId
    );
    bscBridge = await bridgeFactory.deploy(
      validator.address,
      bscToken.address,
      bscId,
      mumbaiId
    );

    // Grant the bridge contract the minter and burner roles
    await mumbaiToken.connect(validator).grantMinterRole(mumbaiBridge.address);
    await mumbaiToken.connect(validator).grantBurnerRole(mumbaiBridge.address);

    await bscToken.connect(validator).grantMinterRole(bscBridge.address);
    await bscToken.connect(validator).grantBurnerRole(bscBridge.address);

    await bscToken.mint(validator.address, initialSupply.mul(2));
    await mumbaiToken.mint(validator.address, initialSupply.mul(2));

    await bscToken.transfer(user1.address, initialSupply);
    await bscToken.transfer(user2.address, initialSupply);

    await mumbaiToken.transfer(user1.address, initialSupply);
    await mumbaiToken.transfer(user2.address, initialSupply);
  });

  describe("swap in Mumbai", () => {
    it("should burn tokens from the sender and emit SwapInitialized event", async () => {
      await expect(mumbaiBridge.connect(user1).swap(user2.address, tokenAmount))
        .to.emit(mumbaiBridge, "SwapInitialized")
        .withArgs(user1.address, user2.address, tokenAmount, mumbaiId, bscId);

      expect(await mumbaiToken.balanceOf(user1.address)).to.equal(
        initialSupply.sub(tokenAmount)
      );
    });

    it("should revert if the burn fails due to insufficient balance", async () => {
      const largeAmount = initialSupply.add(ethers.utils.parseEther("1")); // More than the user has
      await expect(
        mumbaiBridge.connect(user1).swap(user2.address, largeAmount)
      ).to.be.revertedWith("Bridge: Swap failed");
    });

    it("should revert if the burn fails due to lack of burner role", async () => {
      // Revoke the burner role from the bridge contract
      await mumbaiToken
        .connect(validator)
        .revokeRole(await mumbaiToken.BURNER_ROLE(), mumbaiBridge.address);

      await expect(
        mumbaiBridge.connect(user1).swap(user2.address, tokenAmount)
      ).to.be.revertedWith("Bridge: Swap failed");

      // Restore the burner role for other tests
      await mumbaiToken
        .connect(validator)
        .grantBurnerRole(mumbaiBridge.address);
    });
  });

  describe("redeem in BSC", () => {
    let signature: Signature;
    let nonce: BigNumberish;

    beforeEach(async () => {
      await mumbaiBridge.connect(user1).swap(user2.address, tokenAmount);

      nonce = 1;
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "uint256", "uint256", "uint256", "uint256"],
          [user1.address, user2.address, tokenAmount, nonce, bscId, mumbaiId]
        )
      );
      const flatSignature = await validator.signMessage(message);
      signature = ethers.utils.splitSignature(flatSignature);
    });

    it("should mint tokens to the recipient and emit Redeemed event", async () => {
      await expect(
        bscBridge
          .connect(user2)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            signature.v,
            signature.r,
            signature.s
          )
      )
        .to.emit(bscBridge, "Redeemed")
        .withArgs(
          user1.address,
          user2.address,
          tokenAmount,
          nonce,
          bscId,
          mumbaiId
        );

      expect(await bscToken.balanceOf(user2.address)).to.equal(
        initialSupply.add(tokenAmount)
      );
    });

    it("should fail if the recipient is not the sender of the transaction", async () => {
      await expect(
        bscBridge
          .connect(user1)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            signature.v,
            signature.r,
            signature.s
          )
      ).to.be.revertedWith("Only the recipient can collect the tokens");
    });

    it("should fail if the nonce has already been processed", async () => {
      // Process the nonce with a valid redeem operation
      await bscBridge
        .connect(user2)
        .redeem(
          user1.address,
          user2.address,
          tokenAmount,
          nonce,
          signature.v,
          signature.r,
          signature.s
        );

      // Attempt to redeem again with the same nonce
      await expect(
        bscBridge
          .connect(user2)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            signature.v,
            signature.r,
            signature.s
          )
      ).to.be.revertedWith("Bridge: Nonce already processed");
    });

    it("should fail if the signature does not match the validator's signature", async () => {
      // Tamper with the signature to make it invalid
      const invalidSignature = {
        ...signature,
        s: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      };

      await expect(
        bscBridge
          .connect(user2)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            invalidSignature.v,
            invalidSignature.r,
            invalidSignature.s
          )
      ).to.be.revertedWith("Bridge: Invalid signature");
    });

    it("should fail if the mint operation is not successful", async () => {
      // Revoke the minter role from the bridge contract to make the mint operation fail
      await bscToken
        .connect(validator)
        .revokeRole(await bscToken.MINTER_ROLE(), bscBridge.address);

      await expect(
        bscBridge
          .connect(user2)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            signature.v,
            signature.r,
            signature.s
          )
      ).to.be.revertedWith("Bridge: Redeem failed");

      // Restore the minter role for other tests
      await bscToken.connect(validator).grantMinterRole(bscBridge.address);
    });
  });

  describe("swap in BSC", () => {
    it("should burn tokens from the sender and emit SwapInitialized event", async () => {
      await expect(bscBridge.connect(user1).swap(user2.address, tokenAmount))
        .to.emit(bscBridge, "SwapInitialized")
        .withArgs(user1.address, user2.address, tokenAmount, bscId, mumbaiId);

      expect(await bscToken.balanceOf(user1.address)).to.equal(
        initialSupply.sub(tokenAmount)
      );
    });
  });

  describe("redeem in Mumbai", () => {
    let signature: Signature;
    let nonce: BigNumberish;

    beforeEach(async () => {
      await bscBridge.connect(user1).swap(user2.address, tokenAmount);

      nonce = 1;
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["address", "address", "uint256", "uint256", "uint256", "uint256"],
          [user1.address, user2.address, tokenAmount, nonce, mumbaiId, bscId]
        )
      );
      const flatSignature = await validator.signMessage(message);
      signature = ethers.utils.splitSignature(flatSignature);
    });

    it("should mint tokens to the recipient and emit Redeemed event", async () => {
      await expect(
        mumbaiBridge
          .connect(user2)
          .redeem(
            user1.address,
            user2.address,
            tokenAmount,
            nonce,
            signature.v,
            signature.r,
            signature.s
          )
      )
        .to.emit(mumbaiBridge, "Redeemed")
        .withArgs(
          user1.address,
          user2.address,
          tokenAmount,
          nonce,
          mumbaiId,
          bscId
        );

      expect(await mumbaiToken.balanceOf(user2.address)).to.equal(
        initialSupply.add(tokenAmount)
      );
    });
  });
});

describe("Token", () => {
  let token: Token;
  let admin: SignerWithAddress;
  let nonAdmin: SignerWithAddress;
  let bridgeAddress: string;

  beforeEach(async () => {
    [admin, nonAdmin] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("Token");
    token = (await TokenFactory.deploy("TestToken", "TT")) as Token;
    await token.deployed();
    bridgeAddress = ethers.Wallet.createRandom().address;
  });

  describe("grantMinterRole", () => {
    it("should allow admin to grant minter role", async () => {
      await expect(token.connect(admin).grantMinterRole(bridgeAddress))
        .to.emit(token, "RoleGranted")
        .withArgs(await token.MINTER_ROLE(), bridgeAddress, admin.address);

      const hasRole = await token.hasRole(token.MINTER_ROLE(), bridgeAddress);
      expect(hasRole).to.be.true;
    });

    it("should prevent non-admin from granting minter role", async () => {
      await expect(
        token.connect(nonAdmin).grantMinterRole(bridgeAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${await token.ADMIN_ROLE()}`
      );
    });
  });

  describe("grantBurnerRole", () => {
    it("should allow admin to grant burner role", async () => {
      await expect(token.connect(admin).grantBurnerRole(bridgeAddress))
        .to.emit(token, "RoleGranted")
        .withArgs(await token.BURNER_ROLE(), bridgeAddress, admin.address);

      const hasRole = await token.hasRole(token.BURNER_ROLE(), bridgeAddress);
      expect(hasRole).to.be.true;
    });

    it("should prevent non-admin from granting burner role", async () => {
      await expect(
        token.connect(nonAdmin).grantBurnerRole(bridgeAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${await token.ADMIN_ROLE()}`
      );
    });
  });
});
