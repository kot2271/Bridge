import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { Token } from "../typechain";

task("grantBurnerRole", "Grant burner role to bridge contract")
  .addParam("token", "Token contract address")
  .addParam("bridge", "Bridge contract address")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const token: Token = <Token>(
        await hre.ethers.getContractAt("Token", taskArgs.token as string)
      );

      const bridge: string = taskArgs.bridge;

      await token.grantMinterRole(bridge);
      console.log(`Burner role granted to bridge at address: ${bridge}`);
    }
  );
