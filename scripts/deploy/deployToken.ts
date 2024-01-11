import { getNamedAccounts, deployments } from "hardhat";
import { verify } from "../helpers/verify";

const TOKEN_NAME = "TestToken";
const TOKEN_SYMBOL = "TT";

async function deployFunction() {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const tokenArgs = [TOKEN_NAME, TOKEN_SYMBOL];
  const token = await deploy(TOKEN_NAME, {
    from: deployer,
    log: true,
    args: tokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${TOKEN_NAME} deployed at: ${token.address}`);
  await verify(token.address, tokenArgs);
}

deployFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
