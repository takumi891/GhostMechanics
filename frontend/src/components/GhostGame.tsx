import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/GameStyles.css';

const DEFAULT_PATH = [2, 2, 2, 2];
const PATH_OPTIONS = [1, 2, 3];

export function GhostGame() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const contractReady = true

  const [pathChoices, setPathChoices] = useState<number[]>(DEFAULT_PATH);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [decryptedScore, setDecryptedScore] = useState<string>('');
  const [decryptedPath, setDecryptedPath] = useState<number[] | null>(null);
  const [decryptedOutcome, setDecryptedOutcome] = useState<string>('');

  const { data: hasStarted, refetch: refetchStarted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasStarted',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractReady,
    },
  });

  const { data: encryptedScore, refetch: refetchScore } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedScore',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractReady,
      refetchInterval: 12000,
    },
  });

  const { data: encryptedPath, refetch: refetchPath } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedPath',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractReady,
      refetchInterval: 12000,
    },
  });

  const { data: encryptedResult, refetch: refetchResult } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLastResult',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractReady,
      refetchInterval: 12000,
    },
  });

  const updateChoice = (index: number, value: number) => {
    setPathChoices(prev => prev.map((entry, i) => (i === index ? value : entry)));
  };

  const handleStartGame = async () => {
    if (!isConnected || !address) {
      setStatusMessage('Connect your wallet to initialize your encrypted score.');
      return;
    }
    if (!contractReady) {
      setStatusMessage('Deploy to Sepolia and paste the address into the frontend config.');
      return;
    }

    setIsStarting(true);
    setStatusMessage('Signing start transaction...');

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer not found.');
      }
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.startGame();
      await tx.wait();

      setStatusMessage('Encrypted score set to 100. Choose your four turns.');
      await Promise.all([refetchStarted(), refetchScore(), refetchPath(), refetchResult()]);
    } catch (err) {
      console.error(err);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to start the game.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setStatusMessage('Connect your wallet before sending a path.');
      return;
    }
    if (!instance) {
      setStatusMessage('Waiting for the Zama relayer to be ready.');
      return;
    }
    if (!contractReady) {
      setStatusMessage('Deploy to Sepolia and update the contract address.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Encrypting your path and sending to the contract...');

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer not found.');
      }

      const input = instance
        .createEncryptedInput(CONTRACT_ADDRESS, address)
        .add32(pathChoices[0])
        .add32(pathChoices[1])
        .add32(pathChoices[2])
        .add32(pathChoices[3]);
      const encrypted = await input.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.submitPath(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.handles[3],
        encrypted.inputProof
      );
      await tx.wait();

      setStatusMessage('Path submitted. Decrypt to see if the ghost is pleased.');
      await Promise.all([refetchScore(), refetchPath(), refetchResult()]);
    } catch (err) {
      console.error(err);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to submit path.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const decryptState = async () => {
    if (!instance || !address) {
      setStatusMessage('Connect wallet and ensure relayer is ready to decrypt.');
      return;
    }
    if (!encryptedScore || !encryptedPath || !encryptedResult) {
      setStatusMessage('No encrypted state to decrypt yet.');
      return;
    }

    setIsDecrypting(true);
    setStatusMessage('Requesting user decryption from the relayer...');

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer not found.');
      }

      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const pathHandles = encryptedPath ? Array.from(encryptedPath as readonly string[]) : [];

      const handles = [
        { handle: encryptedScore as string, contractAddress: CONTRACT_ADDRESS },
        ...pathHandles.map(handle => ({ handle, contractAddress: CONTRACT_ADDRESS })),
        { handle: encryptedResult as string, contractAddress: CONTRACT_ADDRESS },
      ];

      const decrypted = await instance.userDecrypt(
        handles,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const scoreValue = decrypted[encryptedScore as string];
      const pathValues = pathHandles.map(handle => Number(decrypted[handle] ?? 0));
      const outcomeValue = decrypted[encryptedResult as string];

      setDecryptedScore(scoreValue !== undefined ? String(scoreValue) : '');
      setDecryptedPath(pathValues);
      setDecryptedOutcome(outcomeValue === true || outcomeValue === 'true' || outcomeValue === '1' ? 'Correct route!' : 'Still lost in the maze.');
      setStatusMessage('Decryption complete.');
    } catch (err) {
      console.error(err);
      setStatusMessage(err instanceof Error ? err.message : 'Unable to decrypt your state.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const renderPathSelectors = () =>
    pathChoices.map((choice, index) => (
      <div key={`step-${index}`} className="path-step">
        <div className="step-label">Gate {index + 1}</div>
        <div className="option-row">
          {PATH_OPTIONS.map(option => (
            <button
              key={option}
              className={`option-chip ${choice === option ? 'active' : ''}`}
              onClick={() => updateChoice(index, option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="game-shell">
      <div className="game-hero">
        <div>
          <p className="eyebrow">Ghost Mechanics</p>
          <h1 className="headline">4 enchanted turns. Only one path keeps your encrypted score alive.</h1>
          <p className="lede">
            Start with 100 hidden points. Choose four turns through the maze. Hit the secret 2-2-2-2 path to earn a
            +100 encrypted bounty.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={handleStartGame} disabled={isStarting || !isConnected}>
              {isStarting ? 'Starting...' : 'Start encrypted run'}
            </button>
            <ConnectButton />
          </div>
          {zamaLoading && <p className="hint">Bootstrapping relayer...</p>}
          {zamaError && <p className="error-text">{zamaError}</p>}
        </div>
        <div className="score-card">
          <div className="score-header">
            <span className="score-title">Current score (encrypted)</span>
            <span className={`pill ${hasStarted ? 'pill-live' : 'pill-idle'}`}>
              {hasStarted ? 'Active' : 'Not started'}
            </span>
          </div>
          <div className="score-body">
            <div className="score-number">{decryptedScore || '???'}</div>
            <p className="score-subline">Decrypt after each run to reveal your balance.</p>
            <button className="ghost-btn" onClick={decryptState} disabled={isDecrypting || !isConnected}>
              {isDecrypting ? 'Decrypting...' : 'Decrypt latest state'}
            </button>
          </div>
        </div>
      </div>

      <div className="game-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Path composer</p>
              <h3>Pick your four turns</h3>
            </div>
            <button
              className="ghost-link"
              onClick={() => setPathChoices(DEFAULT_PATH)}
              disabled={isSubmitting}
            >
              Reset to 2-2-2-2
            </button>
          </div>
          <div className="path-grid">{renderPathSelectors()}</div>
          <button className="primary-btn wide" onClick={handleSubmit} disabled={isSubmitting || !hasStarted}>
            {isSubmitting ? 'Submitting...' : 'Submit encrypted path'}
          </button>
          <p className="hint">All choices and rewards are kept fully encrypted by Zama FHE.</p>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Latest decrypt</p>
              <h3>Reveal your ghost trail</h3>
            </div>
          </div>
          <div className="decrypted-block">
            <div className="decrypted-row">
              <span className="label">Score</span>
              <span className="value">{decryptedScore || 'Hidden'}</span>
            </div>
            <div className="decrypted-row">
              <span className="label">Last path</span>
              <span className="value">
                {decryptedPath ? decryptedPath.join(' → ') : 'Encrypted'}
              </span>
            </div>
            <div className="decrypted-row">
              <span className="label">Outcome</span>
              <span className="value">{decryptedOutcome || 'Encrypted'}</span>
            </div>
          </div>
          <div className="status-badge">{statusMessage || 'Make a move to wake the ghost.'}</div>
        </div>
      </div>
    </div>
  );
}
