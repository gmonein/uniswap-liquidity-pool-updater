import * as dotenv from 'dotenv'
dotenv.config()


import { ethers } from 'ethers'

import { NonfungiblePositionManager__factory } from './types/abis/factories/NonfungiblePositionManager__factory.ts';
import { HyperSwapPositionModifier__factory } from './types/abis/factories/HyperSwapPositionModifier__factory.ts';

const RPC_URL = process.env.RPC_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const POSITION_MANAGER = process.env.POSITION_MANAGER as string;
const POSITION_MODIFIER = process.env.POSITION_MODIFIER as string;
const WHYPE = process.env.WHYPE as string;
const USDHL = process.env.USDHL as string;
const WALLET = process.env.WALLET as string;

const provider = new ethers.JsonRpcProvider(RPC_URL)
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const positionManager = NonfungiblePositionManager__factory.connect(POSITION_MANAGER, signer);
const positionModifier = HyperSwapPositionModifier__factory.connect(POSITION_MODIFIER, signer)

export async function refreshLiquidityPool(
  poolId: number,
  lowerTick: number,
  upperTick: number,
) {
  const tx = await positionManager.approve(POSITION_MODIFIER, poolId)
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error("Approval transaction reverted");
  }
  const block = await provider.getBlock("latest");
  const safeLimit = block.gasLimit * BigInt(9) / BigInt(10); 

  const modified = await positionModifier.rebalance(
    {
      token0: WHYPE,
      token1: USDHL,
      fee: 10_000,
      tickLower: lowerTick,
      tickUpper: upperTick,
      param6: 0,
      param7: 0,
      param8: 0,
      param9: 0,
      wallet: WALLET,
      deadline: 0,
    },
    poolId,
    "0x",
    false,
    {
      token0FeeAmount: 0,
      token1FeeAmount: 0,
      tokenOut: "0x0000000000000000000000000000000000000000",
      tokenOutMin: 0,
      swapData0: "0x",
      swapData1: "0x",
      isUnwrapNative: false,
    },
    {
      gasLimit: safeLimit
    }
  )
}
