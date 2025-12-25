# Ghost Mechanics

Ghost Mechanics is a fully homomorphic encryption (FHE) puzzle game built on Zama's FHEVM. Players navigate a
four-step maze where every choice and score is encrypted end-to-end. The correct route is fixed at 2-2-2-2, and
only an entirely correct path earns the encrypted bonus.

This repository contains the encrypted smart contract, Hardhat tasks and tests, and a React + Vite frontend that
encrypts inputs and decrypts results through the Zama relayer. All gameplay logic is real, on-chain, and encrypted.

## Project Goals

- Protect player choices and scores so they never appear in plaintext on-chain.
- Prove that game logic can run entirely over encrypted values without leaking the answer.
- Provide a production-like frontend that performs encryption, submission, and user-side decryption.
- Keep the contract logic simple, auditable, and easy to extend with new levels or rules.

## Core Gameplay

- Each player starts with 100 encrypted points once they initialize the game.
- The maze has 4 forks, each fork has 3 possible choices (1, 2, 3).
- Only the path 2,2,2,2 is correct.
- Both the player's selections and the hidden answer are encrypted.
- If all four choices are correct, the player receives +100 encrypted points.

## Advantages

- Full confidentiality: choices, scores, and correctness are stored as encrypted ciphertext.
- Fair gameplay: the correct path is never revealed on-chain, even to validators.
- Deterministic reward logic over encrypted values via FHE operations.
- Decryption is user-authorized through the relayer, not on-chain.
- Minimal trust surface: no off-chain game server is required.
- Ready-to-demo UX with real encryption, not mocks.

## Problems This Project Solves

- Prevents on-chain front-running or inference attacks on gameplay decisions.
- Keeps score and solution data private while still enabling verification.
- Demonstrates how FHE can enable confidential games and decision systems.
- Avoids reliance on centralized databases for game state.
- Shows a realistic full-stack path: encrypted contract, encrypted UI inputs, and user decryption.

## Tech Stack

- Solidity 0.8.27 with Zama FHEVM library
- Hardhat + hardhat-deploy + TypeChain
- Zama FHE Relayer SDK for encryption and decryption
- React + Vite frontend
- viem for contract reads
- ethers v6 for contract writes
- wagmi + RainbowKit for wallet connection

## Architecture Overview

- Smart contract: `contracts/GhostMechanicsGame.sol`
  - Stores encrypted score, last encrypted path, and encrypted correctness flag.
  - Validates encrypted inputs and evaluates correctness in encrypted form.
- Relayer SDK: encrypts user inputs and decrypts outputs with user consent.
- Frontend: handles wallet connection, encrypted input creation, transaction submission,
  and relayer-based decryption.
- Hardhat tasks/tests: provide local and Sepolia workflows for encrypted testing.

## Contract Details

- `startGame()` initializes an encrypted score of 100 and clears previous paths.
- `submitPath(step1, step2, step3, step4, proof)` compares encrypted steps to the hidden path.
- `getEncryptedScore(address)` returns the encrypted score.
- `getEncryptedPath(address)` returns the encrypted last path.
- `getLastResult(address)` returns an encrypted boolean indicating success.
- `hasStarted(address)` returns whether the game is initialized for that player.
- Encrypted access control uses `FHE.allow` for the player and `FHE.allowThis` for the contract.
- View functions are parameterized by address and do not depend on `msg.sender`.

## Frontend Behavior

- Sepolia-only network configuration; no localhost networks are used in the UI.
- Reads use viem `useReadContract`, writes use ethers `Contract`.
- No frontend environment variables are used.
- Contract address and ABI live in `frontend/src/config/contracts.ts`.
- Decryption requires a user signature for the Zama relayer (EIP-712 typed data).
- No local storage is used to store gameplay state or secrets.

## Repository Structure

```
contracts/                  Encrypted Solidity contract
deploy/                     Hardhat deploy scripts
tasks/                      Hardhat tasks for CLI flows
test/                       Local and Sepolia tests
frontend/                   React + Vite application
deployments/sepolia/        Deployed ABI and address artifacts
docs/                       Zama reference notes
```

## Setup

### Prerequisites

- Node.js 20+
- npm 7+
- A Sepolia wallet funded with test ETH

### Environment Variables (Hardhat only)

Create a `.env` file in the project root with:

```
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_project_id
ETHERSCAN_API_KEY=optional_for_verification
```

Notes:
- Deployments use a private key, not a mnemonic.
- The frontend does not read environment variables.

## Local Development Workflow

1. Install dependencies:

   ```
   npm install
   ```

2. Compile contracts:

   ```
   npm run compile
   ```

3. Run local tests (FHEVM mock):

   ```
   npm run test
   ```

4. Start a local Hardhat node:

   ```
   npm run chain
   ```

5. Deploy locally:

   ```
   npm run deploy:localhost
   ```

## Sepolia Workflow

1. Run tasks and tests first:

   ```
   npm run test
   npm run test:sepolia
   ```

2. Deploy to Sepolia:

   ```
   npm run deploy:sepolia
   ```

3. Update the frontend contract address and ABI:

   - Copy ABI from `deployments/sepolia/GhostMechanicsGame.json`
   - Paste into `frontend/src/config/contracts.ts`
   - Update `CONTRACT_ADDRESS` with the deployed address

4. Verify on Sepolia (optional):

   ```
   npm run verify:sepolia -- <CONTRACT_ADDRESS>
   ```

## Hardhat Tasks

- Get deployed contract address:
  ```
  npx hardhat task:address --network sepolia
  ```
- Start the game:
  ```
  npx hardhat task:start-game --network sepolia
  ```
- Submit a path:
  ```
  npx hardhat task:submit-path --values 2,2,2,2 --network sepolia
  ```
- Decrypt your score and path:
  ```
  npx hardhat task:decrypt-score --network sepolia
  ```

## Frontend Usage

1. From the `frontend` directory, install dependencies:

   ```
   npm install
   ```

2. Start the dev server:

   ```
   npm run dev
   ```

3. Connect a wallet on Sepolia, start the game, submit your encrypted path,
   and decrypt to see your encrypted score and result.

## Security and Privacy Notes

- The correct path is never stored in plaintext on-chain.
- Scores and choices are encrypted and only decryptable by the user via the relayer.
- The contract never sees plaintext inputs; it validates only encrypted handles and proofs.
- Access control is enforced through FHE allowlists for the player and the contract.
- This project is for demonstration and should be audited before any production use.

## Known Limitations

- Single fixed path; the puzzle is deterministic by design.
- No global leaderboard or shared state between players.
- The contract does not prevent multiple addresses per human.
- Decryption availability depends on the relayer service.

## Future Roadmap

- Add multiple levels with different encrypted solutions.
- Introduce time-based or score-based encrypted challenges.
- Build encrypted leaderboards using aggregated ciphertexts.
- Add optional hints with encrypted cost deductions.
- Support multiple chains as FHEVM expands beyond Sepolia.
- Improve UX around relayer status, retries, and user guidance.

## Documentation

- Zama contract reference: `docs/zama_llm.md`
- Zama relayer reference: `docs/zama_doc_relayer.md`

## License

BSD-3-Clause-Clear. See `LICENSE`.
