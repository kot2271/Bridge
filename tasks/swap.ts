import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { Bridge } from "../typechain";
import { BigNumber } from "ethers";

task("swap", "Swap tokens on the source chain")
  .addParam("bridge", "The address of the Bridge contract")
  .addParam("recipient", "The address of the recipient")
  .addParam("amount", "The amount of tokens to swap")
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

      await bridge.swap(recipient, amount);

      const filter = bridge.filters.SwapInitialized();
      const events = await bridge.queryFilter(filter);
      const txSender = events[0].args["sender"];
      const txRecipient = events[0].args["recipient"];
      const txChainIdFrom = events[0].args["srcChainId"];
      const txChainIdTo = events[0].args["dstChainId"];
      const ethAmount = hre.ethers.utils.formatEther(events[0].args["amount"]);
      console.log(`Tokens are swapped: ${ethAmount} ETH`);
      console.log(`From ${txSender} to ${txRecipient}`);
      console.log(
        `From a network with an id: ${txChainIdFrom} to the network with id: ${txChainIdTo}`
      );
    }
  );
