"use client";
import React, { useState, useEffect } from 'react';
import { OptimismConnectButton } from './optimism-connect-button';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRCAT_ADDRESS } from '@/utils/contractAddress';
import { ABI } from '@/utils/ABI';
import { formatUnits } from 'viem';
import Link from 'next/link';

// Status mapping with colors
const ESCROW_STATUS = {
  0: { text: "Created", color: "bg-yellow-500" },
  1: { text: "Delivered", color: "bg-blue-500" },
  2: { text: "Completed", color: "bg-green-500" },
  3: { text: "Cancelled", color: "bg-red-500" }
} as const;

interface EscrowDetails {
  id: string;
  sender: string;
  receiver: string;
  amount: string;
  status: number;
}

export default function EscrowDetails() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<EscrowDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(1);

  // Fetch escrow count
  const { data: escrowCount } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "escrowCount",
  });

  // Get current escrow ID
  const currentEscrowId = BigInt(currentIndex);

  // Fetch current escrow details
  const { data: currentEscrowDetails } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "escrows",
    args: [currentEscrowId],
    query: { enabled: true },
  });

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    if (!escrowCount) {
      setLoading(false);
      return;
    }

    try {
      if (currentEscrowDetails && Array.isArray(currentEscrowDetails)) {
        const [sender, receiver, amount, status] = currentEscrowDetails as [string, string, bigint, number];
        const newEscrowDetail = {
          id: currentEscrowId.toString(),
          sender,
          receiver,
          amount: formatUnits(amount, 18),
          status: Number(status)
        };

        setEscrows(prevEscrows => [...prevEscrows, newEscrowDetail]);
        
        // Move to next escrow if available
        if (currentIndex < Number(escrowCount)) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error processing escrow details:', error);
      setLoading(false);
    }
  }, [address, currentEscrowId, currentEscrowDetails, currentIndex, escrowCount]);

  // Function to truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <OptimismConnectButton />
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <OptimismConnectButton />
        <h1 className="text-3xl font-bold text-white text-center md:text-left">All Escrows</h1>
        <Link 
          href="/escrow"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition duration-200"
        >
          + Create New Escrow
        </Link>
      </div>
  
      {escrows.length === 0 ? (
        <div className="text-white text-center py-10 bg-gray-800 rounded-lg shadow">
          No escrows found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-white bg-gray-800 rounded-lg shadow border border-gray-700">
            <thead>
              <tr className="bg-gray-900 text-sm md:text-base">
                <th className="px-4 py-3 border border-gray-700 text-left">Escrow ID</th>
                <th className="px-4 py-3 border border-gray-700 text-left">Sender</th>
                <th className="px-4 py-3 border border-gray-700 text-left">Receiver</th>
                <th className="px-4 py-3 border border-gray-700 text-left">Amount</th>
                <th className="px-4 py-3 border border-gray-700 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((escrow) => (
                <tr
                  key={escrow.id}
                  className="hover:bg-gray-700 transition duration-150"
                >
                  <td className="px-4 py-3 border border-gray-700">{escrow.id}</td>
                  <td className="px-4 py-3 border border-gray-700">
                    {truncateAddress(escrow.sender)}
                  </td>
                  <td className="px-4 py-3 border border-gray-700">
                    {truncateAddress(escrow.receiver)}
                  </td>
                  <td className="px-4 py-3 border border-gray-700">
                    {escrow.amount}
                  </td>
                  <td className="px-4 py-3 border border-gray-700">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${ESCROW_STATUS[escrow.status as keyof typeof ESCROW_STATUS].color}`}>
                      {ESCROW_STATUS[escrow.status as keyof typeof ESCROW_STATUS].text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  
}