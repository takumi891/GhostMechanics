import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm, deployments } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { GhostMechanicsGame } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("GhostMechanicsGameSepolia", function () {
  let signers: Signers;
  let contract: GhostMechanicsGame;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("GhostMechanicsGame");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("GhostMechanicsGame", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submits the correct path and receives a bonus", async function () {
    steps = 12;

    this.timeout(4 * 40000);

    progress("Starting the game on Sepolia...");
    const startTx = await contract.connect(signers.alice).startGame();
    await startTx.wait();

    progress("Encrypting '2,2,2,2'...");
    const encryptedPath = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(2)
      .add32(2)
      .add32(2)
      .add32(2)
      .encrypt();

    progress(
      `Call submitPath(2,2,2,2) contract=${contractAddress} handle0=${ethers.hexlify(encryptedPath.handles[0])} signer=${signers.alice.address}...`,
    );
    const tx = await contract
      .connect(signers.alice)
      .submitPath(
        encryptedPath.handles[0],
        encryptedPath.handles[1],
        encryptedPath.handles[2],
        encryptedPath.handles[3],
        encryptedPath.inputProof,
      );
    await tx.wait();

    progress(`Call GhostMechanicsGame.getEncryptedScore()...`);
    const encryptedScore = await contract.getEncryptedScore(signers.alice.address);
    expect(encryptedScore).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting GhostMechanicsGame.getEncryptedScore()=${encryptedScore}...`);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    progress(`Clear GhostMechanicsGame.getEncryptedScore()=${clearScore}`);

    const encryptedResult = await contract.getLastResult(signers.alice.address);
    const wasCorrect = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
    progress(`Path success: ${wasCorrect}`);

    expect(clearScore).to.eq(200);
    expect(wasCorrect).to.eq(true);
  });
});
