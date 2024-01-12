# Bridge

## Installation

Clone the repository using the following command:
Install the dependencies using the following command:
```shell
npm i
```

## Deployment

Fill in all the required environment variables(copy .env-example to .env and fill it).
Deploy token contract to the chain (polygon-mumbai & binance-testnet):
```shell
npx hardhat run scripts/deploy/deployToken.ts --network polygonMumbai
```
```shell
npx hardhat run scripts/deploy/deployToken.ts --network bscTestnet
```

Deploy bridge contract to the chain (polygon-mumbai & binance-testnet):
```shell
npx hardhat run scripts/deploy/deployBridge.ts --network polygonMumbai
```
```shell
npx hardhat run scripts/deploy/deployBridge.ts --network bscTestnet
```

## Verify

Verify the installation by running the following command:
```shell
npx hardhat verify --network polygonMumbai {TOKEN_ADDRESS} "TestToken" "TT"
```

```shell
npx hardhat verify --network polygonMumbai {BRIDGE_ADDRESS} {VALIDATOR_ADDRESS} {TOKEN_ADDRESS} {CHAIN_ID_FROM} {CHAIN_ID_TO}
```

```shell
npx hardhat verify --network bscTestnet {TOKEN_ADDRESS} "TestToken" "TT"
```

```shell
npx hardhat verify --network bscTestnet {BRIDGE_ADDRESS} {VALIDATOR_ADDRESS} {TOKEN_ADDRESS} {CHAIN_ID_FROM} {CHAIN_ID_TO}
```

## Tasks

Create a new task(s) and save it(them) in the folder "tasks". 
Add a new task_name in the file "tasks/index.ts"

Running a grantMinterRole task:
```shell
npx hardhat grantMinterRole --token {TOKEN_ADDRESS} --bridge {BRIDGE_ADDRESS} --network {NETWORK_NAME}
```

Running a grantBurnerRole task:
```shell
npx hardhat grantBurnerRole --token {TOKEN_ADDRESS} --bridge {BRIDGE_ADDRESS} --network {NETWORK_NAME}
```

Running a swap task:
```shell
npx hardhat swap --bridge {BRIDGE_ADDRESS} --recipient {RECIPIENT_ADDRESS} --amount {AMOUNT_IN_ETHER} --network {NETWORK_NAME}
```

Running a redeem task:
```shell
npx hardhat redeem --bridge {BRIDGE_ADDRESS} --recipient {RECIPIENT_ADDRESS} --amount {AMOUNT_IN_ETHER} --network {NETWORK_NAME}
```