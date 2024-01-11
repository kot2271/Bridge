import { deployments, getNamedAccounts, network } from "hardhat";
import { verify } from "../helpers/verify";
import { BigNumber } from "ethers";

// Replace these constants with the appropriate values for your deployment
const VALIDATOR_ADDRESS = "0xYourValidatorAddress";
const TOKEN_ADDRESS = "0xYourTokenContractAddress";
// 80001 -> Mumbai testnet chain ID
// 97 -> BSC testnet chain ID

let CHAIN_ID_FROM: BigNumber;
let CHAIN_ID_TO: BigNumber;

if (network.name === "polygonMumbai" || network.name === "localhost") {
  CHAIN_ID_FROM = BigNumber.from(80001);
  CHAIN_ID_TO = BigNumber.from(97);
} else {
  CHAIN_ID_FROM = BigNumber.from(97);
  CHAIN_ID_TO = BigNumber.from(80001);
}

const BRIDGE_NAME = "Bridge";

async function deployFunction() {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const bridgeArgs = [
    VALIDATOR_ADDRESS,
    TOKEN_ADDRESS,
    CHAIN_ID_FROM,
    CHAIN_ID_TO,
  ];
  const bridge = await deploy(BRIDGE_NAME, {
    from: deployer,
    log: true,
    args: bridgeArgs,
    waitConfirmations: 6,
  });

  console.log(
    `Bridge deployed at: ${bridge.address} in ${network.name} network`
  );
  await verify(bridge.address, bridgeArgs);
}

deployFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
