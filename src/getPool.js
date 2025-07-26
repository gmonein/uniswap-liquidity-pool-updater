import { PoolAddress } from "@uniswap/v3-sdk";
import { Token, FeeAmount } from "@uniswap/sdk-core";

// 2) Calculez l’adresse
const poolAddress = PoolAddress.computeAddress({
  factoryAddress: process.env.FACTORY,           // adresse de la UniswapV3Factory sur HyperEVM
  key: {
    token0: token0.address,
    token1: token1.address,
    fee: FeeAmount.MEDIUM
  }
});

console.log("Pool address (deterministe) :", poolAddress);
