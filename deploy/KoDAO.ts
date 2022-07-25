import { HardhatRuntimeEnvironment } from "hardhat/types";
// eslint-disable-next-line node/no-missing-import
import { DeployFunction } from "hardhat-deploy/types";

const URI = "ipfs://QmVjWuDVjbtTeDT3JtEndGFLwkjW3xxXZnSeFRVbUgwToR";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer, team } = await getNamedAccounts();

  log(`Deploying KoDAO(
    uri=${URI},
    beneficiary=${team}
  )`);

  await deploy("KoDAO", {
    from: deployer,
    args: [URI, team],
    log: true,
  });
};

export default func;

func.tags = ["KoDAO"];
func.dependencies = [];
