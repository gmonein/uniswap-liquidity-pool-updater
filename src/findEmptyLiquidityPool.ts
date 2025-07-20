import * as dotenv from 'dotenv'
dotenv.config()

import { ethers } from 'ethers';
import { createRequire } from 'module';
import JSBI from 'jsbi';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';

const requireJson = createRequire(import.meta.url);

const PositionManagerJson = requireJson(
  '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
) as { abi: any[] };
const FactoryJson = requireJson(
  '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'
) as { abi: any[] };
const PoolJson = requireJson(
  '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'
) as { abi: any[] };

const RPC_URL = process.env.RPC_URL as string;
const WALLET = process.env.WALLET as string;
const POSITION_MANAGER = process.env.POSITION_MANAGER as string;
const FACTORY = process.env.FACTORY as string;
const WHYPE = process.env.WHYPE as string;
const USDHL = process.env.USDHL as string;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const positionManager = new ethers.Contract(
  POSITION_MANAGER,
  PositionManagerJson.abi,
  provider
);
const factory = new ethers.Contract(
  FACTORY,
  FactoryJson.abi,
  provider
);

interface PositionData {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: ethers.BigNumber;
}

export type LiquidityPool = {
  id: number;
  address: string;
  token0: string;
  token1: string;
  amount0: JSBI;
  amount1: JSBI;
}

export async function findLiquidityPool(): Promise<LiquidityPool | undefined> {
  const balanceBN: ethers.BigNumber = await positionManager.balanceOf(WALLET);
  const count: number = balanceBN.toNumber();

  for (let i = count - 5; i < count; i++) {
    const tokenIdBN: ethers.BigNumber = await positionManager.tokenOfOwnerByIndex(WALLET, i);
    const tokenId: number = tokenIdBN.toNumber();

    const posRaw = await positionManager.positions(tokenId);
    const pos: PositionData = {
      token0: posRaw.token0.toLowerCase(),
      token1: posRaw.token1.toLowerCase(),
      fee: posRaw.fee,
      tickLower: posRaw.tickLower,
      tickUpper: posRaw.tickUpper,
      liquidity: posRaw.liquidity,
    };

    // Only WHYPE/USDHL
    if (!((pos.token0 === WHYPE && pos.token1 === USDHL) ||
          (pos.token0 === USDHL && pos.token1 === WHYPE))) {
      continue;
    }
    if (pos.liquidity.isZero()) { continue; }

    const poolAddress: string = await factory.getPool(posRaw.token0, posRaw.token1, pos.fee);
    const poolC = new ethers.Contract(poolAddress, PoolJson.abi, provider);
    const [liqCurBN, slot0]: [ethers.BigNumber, any] = await Promise.all([
      poolC.liquidity(),
      poolC.slot0()
    ]);

    const liqCur: JSBI = JSBI.BigInt(liqCurBN.toString());
    const sqrtCurrent: JSBI = JSBI.BigInt(slot0.sqrtPriceX96.toString());
    const sqrtLower: JSBI = TickMath.getSqrtRatioAtTick(pos.tickLower);
    const sqrtUpper: JSBI = TickMath.getSqrtRatioAtTick(pos.tickUpper);

    let amount0: JSBI;
    let amount1: JSBI;
    // Calculate token amounts using SqrtPriceMath
    if (JSBI.lessThan(sqrtCurrent, sqrtLower)) {
      amount0 = SqrtPriceMath.getAmount0Delta(
        sqrtLower,
        sqrtUpper,
        JSBI.BigInt(pos.liquidity.toString()),
        true
      );
      amount1 = JSBI.BigInt('0');
    } else if (JSBI.lessThan(sqrtCurrent, sqrtUpper)) {
      amount0 = SqrtPriceMath.getAmount0Delta(
        sqrtCurrent,
        sqrtUpper,
        JSBI.BigInt(pos.liquidity.toString()),
        true
      );
      amount1 = SqrtPriceMath.getAmount1Delta(
        sqrtLower,
        sqrtCurrent,
        JSBI.BigInt(pos.liquidity.toString()),
        true
      );
    } else {
      amount0 = JSBI.BigInt('0');
      amount1 = SqrtPriceMath.getAmount1Delta(
        sqrtLower,
        sqrtUpper,
        JSBI.BigInt(pos.liquidity.toString()),
        true
      );
    }

    return {
      id: tokenId,
      address: poolAddress,
      token0: pos.token0,
      token1: pos.token1,
      amount0: amount0,
      amount1: amount1,
    }
  }
}
