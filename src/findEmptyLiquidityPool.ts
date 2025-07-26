import * as dotenv from 'dotenv'
dotenv.config()

import { ethers, toBigInt } from 'ethers';
import JSBI from 'jsbi';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';

import { UniswapV3Pool__factory } from './types/abis/factories/UniswapV3Pool__factory.ts'
import { NonfungiblePositionManager__factory } from './types/abis/factories/NonfungiblePositionManager__factory.ts'
import { UniswapV3Factory__factory } from './types/abis/factories/UniswapV3Factory__factory.ts'

const RPC_URL = process.env.RPC_URL as string;
const WALLET = process.env.WALLET as string;
const POSITION_MANAGER = process.env.POSITION_MANAGER as string;
const FACTORY = process.env.FACTORY as string;
const WHYPE = process.env.WHYPE as string;
const USDHL = process.env.USDHL as string;

const provider = new ethers.JsonRpcProvider(RPC_URL)
const positionManager = NonfungiblePositionManager__factory.connect(POSITION_MANAGER, provider);
const factory = UniswapV3Factory__factory.connect(FACTORY, provider);

interface PositionData {
  token0: string;
  token1: string;
  fee: bigint;
  tickLower: bigint;
  tickUpper: bigint;
  liquidity: bigint;
}

type LiquidityPool = {
  id: bigint;
  address: string;
  token0: string;
  token1: string;
  amount0: JSBI;
  amount1: JSBI;
}

export async function findLiquidityPool(): Promise<LiquidityPool | undefined> {
  const balanceBN = await positionManager.balanceOf(WALLET);
  const count = toBigInt(balanceBN);

  for (let i = count - BigInt(1); i < count; i++) {
    const tokenIdBN = await positionManager.tokenOfOwnerByIndex(WALLET, i);

    const posRaw = await positionManager.positions(tokenIdBN);

    const pos: PositionData = {
      token0: posRaw.token0.toLowerCase(),
      token1: posRaw.token1.toLowerCase(),
      fee: posRaw.fee,
      tickLower: toBigInt(posRaw.tickLower),
      tickUpper: toBigInt(posRaw.tickUpper),
      liquidity: toBigInt(posRaw.liquidity),
    };

    // Only WHYPE/USDHL
    if (!((pos.token0 === WHYPE && pos.token1 === USDHL) ||
          (pos.token0 === USDHL && pos.token1 === WHYPE))) {
      continue;
    }
    if (pos.liquidity == BigInt(0)) { continue; }

    const poolAddress = await factory.getPool(posRaw.token0, posRaw.token1, pos.fee);
    const poolC = UniswapV3Pool__factory.connect(poolAddress, provider);
    const [liqCurBN, slot0, global0, global1] = await Promise.all([
      poolC.liquidity(),
      poolC.slot0(),
      poolC.feeGrowthGlobal0X128(),
      poolC.feeGrowthGlobal1X128(),
    ]);

    const delta0 = posRaw.feeGrowthInside0LastX128
    const delta1 = posRaw.feeGrowthInside1LastX128

    const Q128 = BigInt(2) ** BigInt(128);
    const owed0 = pos.liquidity * delta0 / Q128;
    const owed1 = pos.liquidity * delta1 / Q128;

    const erc20 = [
      new ethers.Contract(pos.token0, ["function decimals() view returns (uint8)"], provider),
      new ethers.Contract(pos.token1, ["function decimals() view returns (uint8)"], provider)
    ];
    const [dec0, dec1] = await Promise.all(erc20.map(c => c.decimals()));
    const human0 = ethers.formatUnits(owed0, dec0);
    const human1 = ethers.formatUnits(owed1, dec1);
    console.log(human0, human1)

    const liqCur: JSBI = JSBI.BigInt(liqCurBN.toString());
    const sqrtCurrent: JSBI = JSBI.BigInt(slot0.sqrtPriceX96.toString());
    const sqrtLower: JSBI = TickMath.getSqrtRatioAtTick(Number(pos.tickLower));
    const sqrtUpper: JSBI = TickMath.getSqrtRatioAtTick(Number(pos.tickUpper));

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
      id: tokenIdBN,
      address: poolAddress,
      token0: pos.token0,
      token1: pos.token1,
      amount0: amount0,
      amount1: amount1,
    }
  }
}
