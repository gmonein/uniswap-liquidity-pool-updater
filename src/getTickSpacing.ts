import * as dotenv from 'dotenv'
dotenv.config()

import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL as string;
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

export async function getTicksForRange(
  poolAddress: string,
  lowPercent: number,
  highPercent: number
) {
  const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24 tick, uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)",
    "function tickSpacing() view returns (int24)"
  ];
  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

  const [slot0, tickSpacing] = await Promise.all([
    pool.slot0(),
    pool.tickSpacing()
  ]);
  const currentTick = slot0.tick;
  const ts         = tickSpacing;
  const price = Math.pow(1.0001, currentTick);
  const priceLower = price * lowPercent;
  const priceUpper = price * highPercent;
  const rawLower = Math.log(priceLower) / Math.log(1.0001);
  const rawUpper = Math.log(priceUpper) / Math.log(1.0001);
  const tickLower = Math.floor(rawLower / ts) * ts;
  const tickUpper = Math.ceil (rawUpper / ts) * ts;

  return { tickLower, tickUpper };
}
