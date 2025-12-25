import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { GhostMechanicsGame, GhostMechanicsGame__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("GhostMechanicsGame")) as GhostMechanicsGame__factory;
  const contract = (await factory.deploy()) as GhostMechanicsGame;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("GhostMechanicsGame (local mock)", function () {
  let signers: Signers;
  let contract: GhostMechanicsGame;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("starts a game with an encrypted score of 100", async function () {
    await contract.connect(signers.alice).startGame();
    const encryptedScore = await contract.getEncryptedScore(signers.alice.address);

    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );

    expect(clearScore).to.eq(100);
  });

  it("rewards the player when the full path is correct", async function () {
    await contract.connect(signers.alice).startGame();

    const encryptedPath = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(2)
      .add32(2)
      .add32(2)
      .add32(2)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .submitPath(
        encryptedPath.handles[0],
        encryptedPath.handles[1],
        encryptedPath.handles[2],
        encryptedPath.handles[3],
        encryptedPath.inputProof,
      )).wait();

    const encryptedScore = await contract.getEncryptedScore(signers.alice.address);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    expect(clearScore).to.eq(200);

    const encryptedResult = await contract.getLastResult(signers.alice.address);
    const wasCorrect = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
    expect(wasCorrect).to.eq(true);
  });

  it("keeps the same score when the path is wrong", async function () {
    await contract.connect(signers.alice).startGame();

    const encryptedPath = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1)
      .add32(2)
      .add32(3)
      .add32(1)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .submitPath(
        encryptedPath.handles[0],
        encryptedPath.handles[1],
        encryptedPath.handles[2],
        encryptedPath.handles[3],
        encryptedPath.inputProof,
      )).wait();

    const encryptedScore = await contract.getEncryptedScore(signers.alice.address);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    expect(clearScore).to.eq(100);

    const encryptedResult = await contract.getLastResult(signers.alice.address);
    const wasCorrect = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
    expect(wasCorrect).to.eq(false);
  });
});
