import { findLiquidityPool } from "./findEmptyLiquidityPool.ts";
import { getTicksForRange } from "./getTickSpacing.ts";
import { refreshLiquidityPool } from "./rebalancePool.ts";
import { getHypePrice } from "./getHypePrice.ts";

import JSBI from 'jsbi';
import { writeWalletLog } from "./writeWalletLog.ts";

const CSV_PATH = './wallet-history.csv';

async function logWalletContent(pool: any): Promise<void> {
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
  const pool = await findLiquidityPool()

  if (!pool) {
    console.log('No liquidity pool')
    return
  }

  await logWalletContent(pool)

  if (JSBI.equal(pool.amount0, JSBI.BigInt(0)) || JSBI.equal(pool.amount1, JSBI.BigInt(0))) {
    console.log(`-- refresh pool ${(new Date()).toString()}`)
    const { tickLower, tickUpper } = await getTicksForRange(pool.address, 0.90, 1.1)
    try { 
      // refreshLiquidityPool(pool.id, tickLower, tickUpper)
    } catch {
      console.log('failed to refresh pool')
    }
    return
  }
}

const argv = process.argv.filter(a => !a.includes('index.ts') && !a.includes('ts-node'))
async function runRefresher() { main().catch((err) => { console.error(err) }) }

if (argv[0] == 'watch') {
  runRefresher().catch((err) => { console.error(err); process.exit(1) })
  setInterval(runRefresher, 60_000 * 10)
}

if (argv[0] == 'test') {
}
