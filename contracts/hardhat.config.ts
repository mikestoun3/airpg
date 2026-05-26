import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Load DEPLOYER_PRIVATE_KEY from parent .env.local if present
import { readFileSync } from "fs";
import { join } from "path";

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(join(__dirname, "../.env.local"), "utf8");
    return Object.fromEntries(
      raw.split("\n")
        .filter(l => l && !l.startsWith("#") && l.includes("="))
        .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    );
  } catch { return {}; }
}

const env = loadEnv();
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? env.DEPLOYER_PRIVATE_KEY ?? "";
const POLYGON_RPC  = process.env.POLYGON_RPC_URL ?? env.POLYGON_RPC_URL ?? "https://polygon-bor-rpc.publicnode.com";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  paths: {
    sources: "./src",
    artifacts: "./artifacts",
    cache: "./cache",
    tests: "./test",
  },
  networks: {
    polygon: {
      url: POLYGON_RPC,
      accounts: DEPLOYER_KEY ? [`0x${DEPLOYER_KEY.replace(/^0x/, "")}`] : [],
      chainId: 137,
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: DEPLOYER_KEY ? [`0x${DEPLOYER_KEY.replace(/^0x/, "")}`] : [],
      chainId: 80002,
    },
  },
};

export default config;
