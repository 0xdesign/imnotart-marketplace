const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Check required environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env.local file");
  }

  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Check if we have enough balance (need at least 0.01 ETH for deployment)
  const minBalance = ethers.parseEther("0.01");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.01 ETH, but have ${ethers.formatEther(balance)} ETH`);
  }

  console.log("Deploying ImNotArtNFT contract...");
  
  const ImNotArtNFT = await ethers.getContractFactory("ImNotArtNFT");
  const contract = await ImNotArtNFT.deploy(deployer.address);
  
  console.log("Waiting for deployment to be mined...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("ImNotArtNFT deployed to:", contractAddress);
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    address: contractAddress,
    deployer: deployer.address,
    network: "base-sepolia",
    chainId: 84532,
    timestamp: new Date().toISOString(),
    blockNumber: await deployer.provider.getBlockNumber()
  };
  
  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment.json");
  
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Network: Base Sepolia");
  console.log("Explorer:", `https://sepolia.basescan.org/address/${contractAddress}`);
  console.log("\nNext steps:");
  console.log("1. Update CONTRACT_ADDRESS in .env.local");
  console.log("2. Verify contract on Basescan (optional)");
  console.log("3. Test contract functions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });