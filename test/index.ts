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

  describe("#mint()", function () {
    it("should fail to mint tokens when the public sale is not active", async function () {
      await expect(koDAO.mint(1, { value: mintPrice })).to.be.revertedWith(
        "Sale not active"
      );
    });

    it("should fail to mint tokens when incorrect ETH amount is provided", async function () {
      await koDAO.setSaleActive(true);
      await expect(
        koDAO.mint(1, { value: mintPrice.mul(2) })
      ).to.be.revertedWith("Incorrect ETH value sent");

      await expect(
        koDAO.mint(1, { value: mintPrice.add(1) })
      ).to.be.revertedWith("Incorrect ETH value sent");

      await expect(
        koDAO.mint(1, { value: mintPrice.sub(1) })
      ).to.be.revertedWith("Incorrect ETH value sent");
    });

    it("should be able to mint when sale is open", async function () {
      await koDAO.setSaleActive(true);

      await koDAO.connect(alice).mint(1, { value: mintPrice });

      const balance = await koDAO.balanceOf(alice.address, tokenId);
      expect(balance).to.equal(1);
    });

    it("should not allow to mint more than maxSupply", async function () {
      await koDAO.setSaleActive(true);

      let maxSupply = (await koDAO.maxSupply()).toNumber();

      await expect(
        koDAO.connect(alice).mint(maxSupply, { value: mintPrice })
      ).to.be.revertedWith("Purchase would exceed max supply");

      maxSupply = maxSupply - 1;

      await koDAO
        .connect(alice)
        .mint(maxSupply, { value: mintPrice.mul(maxSupply) });

      await expect(
        koDAO.connect(alice).mint(1, { value: mintPrice })
      ).to.be.revertedWith("Purchase would exceed max supply");
    });
  });

  describe("#claim", function () {
    it("should fail to mint tokens when the public sale is not active", async function () {
      await expect(koDAO.claim()).to.be.revertedWith("Sale not active");
    });

    it("Should be able to claim if the account is in the presaled list", async function () {
      await koDAO.setSaleActive(true);

      await koDAO["setPresaled(address,uint256)"](alice.address, 2);
      await koDAO.connect(alice).claim();
      expect(await koDAO.balanceOf(alice.address, tokenId)).to.be.equal(2);
    });
  });

  describe("#setURI", function () {
    it("should emit correct Event", async function () {
      const uri = "http://gm.fren";
      await expect(koDAO.setURI(uri))
        .to.emit(koDAO, "URI")
        .withArgs(uri, tokenId);
    });

    it("should be able to set baseUri", async function () {
      await koDAO.setSaleActive(true);

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
