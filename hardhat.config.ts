import * as dotenv from "dotenv";
import { parse } from "csv-parse";
import fs from "fs";

import { HardhatUserConfig, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("setPresaled", "Set presaled list")
  .addParam("presaledList", "File with presaled addresses and NFT amounts")
  .setAction(async ({ presaledList }, hre) => {
    const { ethers, deployments } = hre;

    const ensProvider = new ethers.providers.AlchemyProvider(
      "homestead",
      process.env.ALCHEMY_API_KEY
    );

    const parser = fs.createReadStream(presaledList).pipe(
      parse({
        columns: true,
      })
    );

    const addresses: string[] = [];
    const amounts: string[] = [];

    for await (const record of parser) {
      let address: string = record.address.trim();
      if (address.includes(".eth")) {
        const resolvedAddress = await ensProvider.resolveName(address);
        if (!resolvedAddress) {
          console.log("Can not resolve addr: ", record, resolvedAddress);
          continue;
        }
        address = resolvedAddress;
      }

      if (ethers.utils.isAddress(address)) {
        addresses.push(address);
        amounts.push(record.nftAmount);
      } else {
        console.log("Not valid address: ", record);
      }
    }

    const koDAOdep = await deployments.get("KoDAO");
    const koDAO = await ethers.getContractAt("KoDAO", koDAOdep.address);

    const resp = await koDAO["setPresaled(address[],uint256[])"](
      addresses,
      amounts
    );

    console.log("gas limit: ", resp.gasLimit);
    const receipt = await resp.wait();
    console.log("gas used: ", receipt.gasUsed);
  });

task("setSale", "Set LCA contract sale state")
  .addParam("active", "Sale state", false, types.boolean)
  .setAction(async function ({ active }, { ethers, deployments }) {
    const koDAOdep = await deployments.get("KoDAO");
    const koDAO = await ethers.getContractAt("KoDAO", koDAOdep.address);

    const tx = await koDAO.setSaleActive(active);
    console.log(tx);
  });

const accounts = [process.env.KODAO_DEPLOYER || ""];

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.15",
  networks: {
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 1,
      tags: ["production"],
    },
    localhost: {
      accounts,
      live: false,
      tags: ["local"],
    },
    hardhat: {
      accounts: { mnemonic: process.env.MNEMONIC || "" },
      forking: {
        enabled: process.env.HARDHAT_NETWORK_FORKING === "true",
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: Number(process.env.HARDHAT_NETWORK_BLOCK),
      },
      live: false,
      tags: ["local"],
      chainId: 1337,
      // mining: {
      //   auto: false,
      //   interval: [1000, 3000],
      // },
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 3,
      tags: ["staging"],
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 4,
      tags: ["staging"],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 5,
      tags: ["staging"],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    team: {
      // FIXME
      rinkeby: 0,
      // rinkeny: "0xfDB2eB80Ec340f04F8cbd56d10589f000CBd35D2",
      hardhat: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
