import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { KoDAO } from "../typechain";
import { parseEther } from "ethers/lib/utils";

const { ethers, deployments } = hre;
const mintPrice = parseEther("0.1");
const tokenId = 0;

let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress;

let koDAO: KoDAO;

describe("KoDAО", function () {
  before(async function () {
    [alice, bob, carol] = await Promise.all(
      (await hre.getUnnamedAccounts()).map((a) => ethers.getSigner(a))
    );
    deployer = await ethers.getSigner((await hre.getNamedAccounts()).deployer);
  });

  beforeEach(async function () {
    await deployments.fixture();
    const koDAOdep = await deployments.get("KoDAO");
    koDAO = await ethers.getContractAt("KoDAO", koDAOdep.address);
  });

  describe("#setURI", function () {
    it("should emit correct Event", async function () {
      const uri = "http://gm.fren";
      await expect(koDAO.setURI(uri))
        .to.emit(koDAO, "URI")
        .withArgs(uri, tokenId);
    });

    it("should be able to set baseUri", async function () {
      await koDAO.connect(alice).mint(1, { value: mintPrice });
      await koDAO.connect(bob).mint(1, { value: mintPrice });

      let tokenUri = await koDAO.uri(tokenId);
      expect(tokenUri).to.not.equal("http://gm.fren");

      await koDAO.setURI("http://gm.fren");
      tokenUri = await koDAO.uri(tokenId);
      expect(tokenUri).to.be.equal("http://gm.fren");
    });
  });
});
