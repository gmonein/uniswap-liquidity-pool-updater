# HyperEVM Liquidity pool updater

## What ?

Uniswap V3 offers the possibility to set ranges to liquidity pool  
this script checks every 5 minutes if the current WHYPE / USDHL pool is active
if the pool is active, it logs the pool value in HYPE and USDC
if the pool is inactive, it updates the pools with the finest range possible

## How ?

Fill the .env file with your WALLET public key and PRIVATE\_KEY

```bash
    RPC_URL=https://api.hyperliquid-testnet.xyz/evm
    ROUTER_V3_ADDRESS=0xD81F56576B1FF2f3Ef18e9Cc71Adaa42516fD990
    USDHL=0xb50a96253abdf803d85efcdce07ad8becbc52bd5
    WHYPE=0x5555555555555555555555555555555555555555
    POSITION_MANAGER=0x6eDA206207c09e5428F281761DdC0D300851fBC8
    POSITION_MODIFIER=0x19967B036bAEE9Ae0A71e9b8611Df8f1d23CCF6E
    FACTORY=0xB1c0fa0B789320044A6F623cFe5eBda9562602E3
    CHAIN_ID=999
    RPC_URL=https://hyperliquid.drpc.org/
    PRIVATE_KEY=
    WALLET=
```

Then run the script using ts-node
```bash
    npm install
    npx ts-node index.ts
```
