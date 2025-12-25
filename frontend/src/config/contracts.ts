// GhostMechanicsGame contract deployed on Sepolia (update address after deploying via hardhat-deploy)
export const CONTRACT_ADDRESS = '0x1Ac957d185D4Bcef6705132Faf560864b2220faE';

// ABI copied from deployments/sepolia/GhostMechanicsGame.json
export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "ZamaProtocolUnsupported",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address"
      },
      {
        indexed: false,
        internalType: "euint32",
        name: "encryptedScore",
        type: "bytes32"
      }
    ],
    name: "GameStarted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address"
      },
      {
        indexed: false,
        internalType: "euint32",
        name: "encryptedScore",
        type: "bytes32"
      }
    ],
    name: "PathSubmitted",
    type: "event"
  },
  {
    inputs: [],
    name: "confidentialProtocolId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address"
      }
    ],
    name: "getEncryptedPath",
    outputs: [
      {
        internalType: "euint32[4]",
        name: "",
        type: "bytes32[4]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address"
      }
    ],
    name: "getEncryptedScore",
    outputs: [
      {
        internalType: "euint32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address"
      }
    ],
    name: "getLastResult",
    outputs: [
      {
        internalType: "ebool",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address"
      }
    ],
    name: "hasStarted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "startGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "externalEuint32",
        name: "step1",
        type: "bytes32"
      },
      {
        internalType: "externalEuint32",
        name: "step2",
        type: "bytes32"
      },
      {
        internalType: "externalEuint32",
        name: "step3",
        type: "bytes32"
      },
      {
        internalType: "externalEuint32",
        name: "step4",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "proof",
        type: "bytes"
      }
    ],
    name: "submitPath",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
