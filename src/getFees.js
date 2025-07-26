import { ethers } from "ethers";

// ————————————————————————————————————————————
// 1) Setup provider + contracts
// ————————————————————————————————————————————
const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc.hyperliquid.xyz/evm"
);

const POOL_ADDRESS    = "0x…";       // your HYPE/USDT pool address
const POSITION_MANAGER = "0x…";      // Hyperswap’s V3 PositionManager

const poolAbi = [
  "function feeGrowthGlobal0X128() view returns (uint256)",
  "function feeGrowthGlobal1X128() view returns (uint256)",
  "function ticks(int24) view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

const positionAbi = [
  "function positions(uint256 tokenId) view returns (uint96 nonce,address operator,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)"
];

const poolContract = new ethers.Contract(POOL_ADDRESS, poolAbi, provider);
const manager     = new ethers.Contract(POSITION_MANAGER, positionAbi, provider);

// ————————————————————————————————————————————
// 2) Helper to compute feeGrowthInsideX128
// ————————————————————————————————————————————
async function getFeeGrowthInside(pool, tickLower, tickUpper) {
  // 2.1 fetch global growth
  const [global0, global1] = await Promise.all([
    pool.feeGrowthGlobal0X128(),
    pool.feeGrowthGlobal1X128()
  ]);

  // 2.2 fetch outside growth at both ticks
  const lower = await pool.ticks(tickLower);
  const upper = await pool.ticks(tickUpper);

  // 2.3 fetch current tick
  const { tick: currentTick } = await pool.slot0();

  // 2.4 compute inside growth for each token
  const inside0 = currentTick >= tickLower && currentTick < tickUpper
    ? global0.sub(lower.feeGrowthOutside0X128).sub(upper.feeGrowthOutside0X128)
    : lower.feeGrowthOutside0X128.add(upper.feeGrowthOutside0X128);

  const inside1 = currentTick >= tickLower && currentTick < tickUpper
    ? global1.sub(lower.feeGrowthOutside1X128).sub(upper.feeGrowthOutside1X128)
    : lower.feeGrowthOutside1X128.add(upper.feeGrowthOutside1X128);

  return { inside0, inside1 };
}

// ————————————————————————————————————————————
// 3) Main: compute unclaimed fees for your position
// ————————————————————————————————————————————
async function computeUnclaimed(posRaw) {
  // 3.1 read your position
  const pos = await manager.positions(tokenId);
  const { tickLower, tickUpper, liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128, token0, token1 } = pos;

  // 3.2 get current “inside” fee growth
  const { inside0, inside1 } = await getFeeGrowthInside(poolContract, tickLower, tickUpper);

  // 3.3 delta growth since last update
  const delta0 = inside0.sub(feeGrowthInside0LastX128);
  const delta1 = inside1.sub(feeGrowthInside1LastX128);

  // 3.4 convert Q128‐growth → token amounts: (liquidity * delta) / 2^128
  const Q128 = ethers.BigNumber.from(2).pow(128);
  const owed0 = liquidity.mul(delta0).div(Q128);
  const owed1 = liquidity.mul(delta1).div(Q128);

  // 3.5 format with decimals
  const erc20 = [
    new ethers.Contract(token0, ["function decimals() view returns (uint8)"], provider),
    new ethers.Contract(token1, ["function decimals() view returns (uint8)"], provider)
  ];
  const [dec0, dec1] = await Promise.all(erc20.map(c => c.decimals()));
  const human0 = ethers.formatUnits(owed0, dec0);
  const human1 = ethers.formatUnits(owed1, dec1);

  return {
    [token0]: human0,   // e.g. WHYPE
    [token1]: human1    // e.g. USDHL
  };
}
