import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { KoDAO } from "../typechain";
import { parseEther } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const { ethers, deployments } = hre;
const mintPrice = parseEther("0.12");
const tokenId = 0;

let team: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress;

let koDAO: KoDAO;

describe("KoDAО", function () {
  before(async function () {
    [alice, bob, carol] = await Promise.all(
      (await hre.getUnnamedAccounts()).map((a) => ethers.getSigner(a))
    );

    const namedAccounts = await hre.getNamedAccounts();
    team = await ethers.getSigner(namedAccounts.team);
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

    it("should not be able to mint more than maxSellAmount", async function () {
      await koDAO.setSaleActive(true);

      const maxSellAmount = (await koDAO.maxSellAmount()).toNumber() - 1;

      await expect(
        koDAO.connect(alice).mint(maxSellAmount + 1, { value: mintPrice })
      ).to.be.revertedWith("Mint would exceed max supply");

      await koDAO
        .connect(alice)
        .mint(maxSellAmount, { value: mintPrice.mul(maxSellAmount) });

      await expect(
        koDAO.connect(alice).mint(1, { value: mintPrice })
      ).to.be.revertedWith("Mint would exceed max supply");

      expect(await koDAO["totalSupply()"]()).to.be.equal(maxSellAmount);
    });
  });

  describe("#claim", function () {
    it("should fail to mint tokens when the public sale is not active", async function () {
      await expect(koDAO.claim()).to.be.revertedWith("Sale not active");
    });

    it("should be able to claim if the account is in the presaled list", async function () {
      await koDAO.setSaleActive(true);

      await koDAO["setPresaled(address,uint256)"](alice.address, 2);
      await koDAO.connect(alice).claim();
      expect(await koDAO.balanceOf(alice.address, tokenId)).to.be.equal(2);
    });

    it("should not be able to claim if the account is not in the presaled list", async function () {
      await koDAO.setSaleActive(true);

      await expect(koDAO.connect(alice).claim()).to.be.revertedWith(
        "Address not eligible for claim"
      );
      expect(await koDAO.balanceOf(alice.address, tokenId)).to.be.equal(0);
    });

    it("should not be able to claim more than maxClaimAmount", async function () {
      await koDAO.setSaleActive(true);

      const maxClaimAmount = (await koDAO.maxClaimAmount()).toNumber() - 1;
      await koDAO["setPresaled(address,uint256)"](
        alice.address,
        maxClaimAmount - 1
      );
      await koDAO["setPresaled(address,uint256)"](bob.address, 2);
      await koDAO["setPresaled(address,uint256)"](carol.address, 1);

      await koDAO.connect(alice).claim();
      expect(await koDAO.totalClaimed()).to.be.equal(maxClaimAmount - 1);
      await expect(koDAO.connect(bob).claim()).to.be.revertedWith(
        "Claim would exceed max supply"
      );

      await koDAO.connect(carol).claim();
      expect(await koDAO.totalClaimed()).to.be.equal(maxClaimAmount);
    });

    it("should be abe to mint and claim up to maxSupply (maxClaimAmount + maxSellAmount)", async function () {
      await koDAO.setSaleActive(true);

      const maxClaimAmount = (await koDAO.maxClaimAmount()).toNumber() - 1;
      const aliceClaim = maxClaimAmount - 2;
      const bobClaim = 2;
      await koDAO["setPresaled(address,uint256)"](alice.address, aliceClaim);
      await koDAO["setPresaled(address,uint256)"](bob.address, bobClaim);
      await koDAO["setPresaled(address,uint256)"](carol.address, 1);

      const maxSellAmount = (await koDAO.maxSellAmount()).toNumber() - 1;
      const aliceMint = 4;
      await koDAO
        .connect(alice)
        .mint(aliceMint, { value: mintPrice.mul(aliceMint) });

      expect(await koDAO["totalSupply()"]()).to.be.equal(aliceMint);

      await koDAO.connect(bob).claim();

      expect(await koDAO["totalSupply()"]()).to.be.equal(aliceMint + bobClaim);

      const bobMint = maxSellAmount - aliceMint;
      await koDAO.connect(bob).mint(bobMint, {
        value: mintPrice.mul(bobMint),
      });

      await expect(
        koDAO.connect(alice).mint(1, { value: mintPrice })
      ).to.be.revertedWith("Mint would exceed max supply");

      expect(await koDAO["totalSupply()"]()).to.be.equal(
        maxSellAmount + bobClaim
      );

      await koDAO.connect(alice).claim();
      expect(await koDAO["totalSupply()"]()).to.be.equal(
        maxSellAmount + maxClaimAmount
      );

      await expect(koDAO.connect(carol).claim()).to.be.revertedWith(
        "Claim would exceed max supply"
      );
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

  describe("#setPresaled", function () {
    it("should be able to set presaled list", async function () {
      await koDAO.setSaleActive(true);

      await koDAO["setPresaled(address[],uint256[])"](
        [alice.address, bob.address, carol.address],
        [2, 3, 4]
      );

      expect(await koDAO.presaled(alice.address)).to.be.equal(2);
      expect(await koDAO.presaled(bob.address)).to.be.equal(3);
      expect(await koDAO.presaled(carol.address)).to.be.equal(4);
    });

    it("should fail when incorrect data is provided", async function () {
      await koDAO.setSaleActive(true);

      await expect(
        koDAO["setPresaled(address[],uint256[])"](
          [alice.address, bob.address, carol.address],
          [2, 3, 4, 5]
        )
      ).to.be.revertedWith("Incorrect data");
    });
  });

  describe("#withdraw", function () {
    it("should be able to withdraw ETH", async function () {
      await koDAO.setSaleActive(true);

      await koDAO.connect(alice).mint(1, { value: mintPrice });
      await koDAO.connect(bob).mint(2, { value: mintPrice.mul(2) });
      await koDAO.connect(carol).mint(3, { value: mintPrice.mul(3) });

      const amount = mintPrice.mul(6);

      await expect(await koDAO.withdraw()).to.changeEtherBalances(
        [team, koDAO],
        [amount, BigNumber.from(0).sub(amount)]
      );
    });
  });

  describe("#totalSupply()", function () {
    it("should return the supply for tokenID=0", async function () {
      expect(await koDAO["totalSupply()"]()).to.equals(0);

      await koDAO.setSaleActive(true);

      await koDAO.connect(alice).mint(1, { value: mintPrice });
      await koDAO.connect(bob).mint(2, { value: mintPrice.mul(2) });

      expect(await koDAO["totalSupply()"]()).to.equals(3);

      await koDAO.connect(carol).mint(3, { value: mintPrice.mul(3) });

      expect(await koDAO["totalSupply()"]()).to.equals(6);
    });
  });

  describe("#setBeneficiary", function () {
    it("should be able to set beneficiary", async function () {
      await koDAO.setBeneficiary(alice.address);
      expect(await koDAO.beneficiary()).to.be.equal(alice.address);
    });
  });
});
