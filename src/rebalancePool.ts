import * as dotenv from 'dotenv'
dotenv.config()

import { ethers } from 'ethers'
import { createRequire } from 'module';

const requireJson = createRequire(import.meta.url);
const PositionManagerJson = requireJson(
  '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
) as { abi: any[] };

const RPC_URL = process.env.RPC_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const POSITION_MANAGER = process.env.POSITION_MANAGER as string;
const POSITION_MODIFIER = process.env.POSITION_MODIFIER as string;
const WHYPE = process.env.WHYPE as string;
const USDHL = process.env.USDHL as string;
const WALLET = process.env.WALLET as string;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const positionManager = new ethers.Contract(
  POSITION_MANAGER,
  PositionManagerJson.abi,
  signer,
);
const positionModifier = new ethers.Contract(
  POSITION_MODIFIER,
  requireJson('./position-modifier-abi.json'),
  signer
)

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
  const safeLimit = block.gasLimit.mul(9).div(10); 

  const modified = await positionModifier.rebalance(
    [
      WHYPE,
      USDHL,
      3000,
      lowerTick,
      upperTick, 0, 0, 0, 0,
      WALLET,
      parseInt(((new Date().getTime()) / 1000)) + 600
    ],
    poolId,
    "0x",
    false,
    [0, 0, "0x0000000000000000000000000000000000000000", 0, "0x", "0x", false],
    {
      gasLimit: safeLimit
    }
  )
}
