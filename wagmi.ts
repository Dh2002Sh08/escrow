import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  bscTestnet,
  optimismSepolia
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'RainbowKit demo',
  projectId: 'e52b43d1356b7de5a5de2e6e19df345a',
  chains: [
    bscTestnet,
    base,
    optimismSepolia,
    arbitrum,
    optimism,
    polygon,
  ],
  ssr: true,
});
