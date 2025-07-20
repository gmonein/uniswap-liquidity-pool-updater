import { ethers } from "ethers";
import { findLiquidityPool } from "./src/findEmptyLiquidityPool.ts";
import { getTicksForRange } from "./src/getTickSpacing.ts";
import { refreshLiquidityPool } from "./src/rebalancePool.ts";
import { getHypePrice } from "./src/getHypePrice.ts";

import JSBI from 'jsbi';
import { writeWalletLog } from "./src/writeWalletLog.ts";
import type { LiquidityPool } from "./src/findEmptyLiquidityPool.ts";

const CSV_PATH = './wallet-history.csv';

async function logWalletContent(pool: LiquidityPool): Promise<void> {
  const hypePrice = await getHypePrice()
  if (hypePrice) {
    const hypeCentAmount = parseInt(JSBI.divide(pool.amount0, JSBI.BigInt('10000000000000000')).toString())
    const usdCentAmount = parseInt(JSBI.divide(pool.amount1, JSBI.BigInt('10000')).toString())
    const hypeAmount = hypeCentAmount / 100
    const usdAmount = usdCentAmount / 100

    const totalInHype = Math.trunc((hypeAmount + usdAmount / hypePrice) * 100) / 100
    const totalInUSD = Math.trunc((usdAmount + hypeAmount * hypePrice) * 100) / 100
    console.log(`-----------`)
    console.log(`Total in HYPE: ${totalInHype.toString()}`)
    console.log(`Total in USDC: ${totalInUSD.toString()}`)
    writeWalletLog(CSV_PATH, new Date(), totalInHype, totalInUSD)
  }
}

async function main(): Promise<void> {
  setInterval(async () => {
    const pool = await findLiquidityPool()

    if (!pool) {
      console.log('No liquidity pool')
      return
    }

    logWalletContent(pool)

    if (JSBI.equal(pool.amount0, JSBI.BigInt(0)) || JSBI.equal(pool.amount1, JSBI.BigInt(0))) {
      console.log(`-- refresh pool ${(new Date()).toString()}`)
      const { tickLower, tickUpper } = await getTicksForRange(pool.address, 0.9999999, 1.0000001)
      refreshLiquidityPool(pool.id, tickLower, tickUpper)
      return
    }
  }, 1_000 * 60 * 5)
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
