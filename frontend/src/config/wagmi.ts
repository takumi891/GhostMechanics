import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Ghost Mechanics',
  projectId: '3c99bff328de4e7aaa2f510cc1bc0eda',
  chains: [sepolia],
  ssr: false,
});
