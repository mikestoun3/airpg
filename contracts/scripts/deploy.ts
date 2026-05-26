import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const TREASURY = "0x4eEb11f1E1f543d9fAf056Bd9eA728668fFd7579";
const ENV_FILE = join(__dirname, "../../.env.local");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "POL");
  console.log("Treasury :", TREASURY);
  console.log("");

  if (balance === 0n) {
    console.error("❌ Deployer has no POL — fund it first");
    process.exit(1);
  }

  const Market = await ethers.getContractFactory("AirPGMarket");
  console.log("Deploying AirPGMarket…");
  const market = await Market.deploy(TREASURY);
  await market.waitForDeployment();

  const address = await market.getAddress();
  console.log("\n✅ AirPGMarket deployed:", address);

  // Patch .env.local automatically
  let envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";

  const patch = (key: string, value: string) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    envContent = re.test(envContent) ? envContent.replace(re, line) : envContent + `\n${line}`;
  };

  patch("NEXT_PUBLIC_CONTRACT_ADDRESS", address);
  patch("CONTRACT_ADDRESS", address);
  writeFileSync(ENV_FILE, envContent.trimStart());

  console.log("\n.env.local updated:");
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`  CONTRACT_ADDRESS=${address}`);
  console.log("\nRestart the Next.js dev server to pick up the new env vars.");
}

main().catch(err => { console.error(err); process.exit(1); });
