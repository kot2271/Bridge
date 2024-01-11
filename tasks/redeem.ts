import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { Bridge } from "../typechain";
import { BigNumber, Signature } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

task("redeem", "Redeem tokens on the destination chain")
  .addParam("bridge", "The address of the Bridge contract")
  .addParam("recipient", "The address of the recipient")
  .addParam("amount", "The amount of tokens to redeem")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const bridge: Bridge = <Bridge>(
        await hre.ethers.getContractAt("Bridge", taskArgs.bridge as string)
      );

      const recipient: string = taskArgs.recipient;
      const amount: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.amount.toString()
      );

      const sender = await hre.ethers.provider.getSigner().getAddress();
      const nonce = await hre.ethers.providers
        .getDefaultProvider()
        .getTransactionCount(sender);

      const chainIdFrom: BigNumber = await bridge.chainIdFrom();
      const chainIdTo: BigNumber = await bridge.chainIdTo();

      const signers: SignerWithAddress[] = await hre.ethers.getSigners();
      const [validator] = [signers[0]];

      const message = hre.ethers.utils.arrayify(
        hre.ethers.utils.solidityKeccak256(
          ["address", "address", "uint256", "uint256", "uint256", "uint256"],
          [sender, recipient, amount, nonce, chainIdFrom, chainIdTo]
        )
      );

      const flatSignature = await validator.signMessage(message);
      const signature: Signature =
        hre.ethers.utils.splitSignature(flatSignature);

      await bridge.redeem(
        sender,
        recipient,
        amount,
        nonce,
        signature.v,
        signature.r,
        signature.s
      );

      const filter = bridge.filters.Redeemed();
      const events = await bridge.queryFilter(filter);
      const txSender = events[0].args["sender"];
      const txRecipient = events[0].args["recipient"];
      const txNonce = events[0].args["nonce"];
      const txChainIdFrom = events[0].args["srcChainId"];
      const txChainIdTo = events[0].args["dstChainId"];
      const ethAmount = hre.ethers.utils.formatEther(events[0].args["amount"]);

      console.log(`Tokens are redeemed: ${ethAmount} ETH`);
      console.log(`Nonce: ${txNonce}`);
      console.log(`From ${txSender} to ${txRecipient}`);
      console.log(
        `From a network with an id: ${txChainIdFrom} to the network with id: ${txChainIdTo}`
      );
    }
  );
