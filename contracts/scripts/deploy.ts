import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Oracle address - in production this should be a separate secure account
  // For now, use deployer as oracle (can be changed later via setOracle)
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  
  console.log("Oracle address:", oracleAddress);

  // Deploy ChessEscrow
  const ChessEscrow = await ethers.getContractFactory("ChessEscrow");
  const chessEscrow = await ChessEscrow.deploy(oracleAddress);
  
  await chessEscrow.waitForDeployment();
  
  const contractAddress = await chessEscrow.getAddress();
  
  console.log("\n========================================");
  console.log("ChessEscrow deployed to:", contractAddress);
  console.log("========================================\n");
  
  // Log configuration
  console.log("Contract Configuration:");
  console.log("- Commission:", await chessEscrow.commissionBps(), "bps (basis points)");
  console.log("- Min bet:", ethers.formatEther(await chessEscrow.minBetAmount()), "ETH");
  console.log("- Max bet:", ethers.formatEther(await chessEscrow.maxBetAmount()), "ETH");
  console.log("- Join timeout:", (await chessEscrow.joinTimeout()).toString(), "seconds");
  console.log("- Game timeout:", (await chessEscrow.gameTimeout()).toString(), "seconds");
  
  console.log("\n--- Add to your .env file ---");
  console.log(`CHESS_ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("-----------------------------\n");
  
  // Verification instructions
  console.log("To verify on Basescan, run:");
  console.log(`npx hardhat verify --network base ${contractAddress} "${oracleAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
