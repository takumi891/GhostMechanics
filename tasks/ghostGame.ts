import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the GhostMechanicsGame address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;

  const ghostGame = await deployments.get("GhostMechanicsGame");

  console.log("GhostMechanicsGame address is " + ghostGame.address);
});

task("task:start-game", "Initializes your encrypted score and clears previous attempts")
  .addOptionalParam("address", "Optionally specify the GhostMechanicsGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const ghostGameDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("GhostMechanicsGame");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("GhostMechanicsGame", ghostGameDeployment.address);

    const tx = await contract.connect(signer).startGame();
    console.log(`Waiting for tx ${tx.hash}...`);
    await tx.wait();
    console.log("Game initialized for", signer.address);
  });

task("task:submit-path", "Submits an encrypted path attempt (four comma-separated numbers)")
  .addParam("values", "Comma-separated path choices, e.g. 1,2,3,2")
  .addOptionalParam("address", "Optionally specify the GhostMechanicsGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const pathValues = String(taskArguments.values)
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !Number.isNaN(v));

    if (pathValues.length !== 4) {
      throw new Error(`--values must contain exactly 4 integers`);
    }

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("GhostMechanicsGame");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("GhostMechanicsGame", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(pathValues[0])
      .add32(pathValues[1])
      .add32(pathValues[2])
      .add32(pathValues[3])
      .encrypt();

    const tx = await contract
      .connect(signer)
      .submitPath(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.inputProof,
      );
    console.log(`Waiting for tx ${tx.hash}...`);
    await tx.wait();
    console.log("Path submitted for", signer.address);
  });

task("task:decrypt-score", "Decrypts your latest encrypted score and path")
  .addOptionalParam("player", "Player address to inspect")
  .addOptionalParam("address", "Optionally specify the GhostMechanicsGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("GhostMechanicsGame");
    const target = taskArguments.player ?? (await ethers.getSigners())[0].address;

    const signer = (await ethers.getSigners())[0];
    const contract = await ethers.getContractAt("GhostMechanicsGame", deployment.address);

    const encryptedScore = await contract.getEncryptedScore(target);
    const encryptedPath = await contract.getEncryptedPath(target);
    const encryptedResult = await contract.getLastResult(target);

    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      deployment.address,
      signer,
    );

    const clearPath = await Promise.all(
      encryptedPath.map((step) =>
        fhevm.userDecryptEuint(FhevmType.euint32, step, deployment.address, signer),
      ),
    );

    const pathResult = await fhevm.userDecryptEbool(encryptedResult, deployment.address, signer);

    console.log(`Score for ${target}: ${clearScore}`);
    console.log(`Last path: ${clearPath.join(", ")}`);
    console.log(`Was correct: ${pathResult}`);
  });
