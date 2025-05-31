"use client";
import React, { useState, useEffect } from 'react';
import { OptimismConnectButton } from './optimism-connect-button';
import { useContract, TokenApprove } from '@/utils/useContract';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRCAT_ADDRESS, Token } from '@/utils/contractAddress';
import { ABI } from '@/utils/ABI';
import { parseUnits, formatUnits } from 'viem';
import { TOKEN_ABI } from '@/utils/ERC20ABI';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '@/wagmi';


// Status mapping for better readability
const ESCROW_STATUS = {
  0: "Created",
  1: "Delivered",
  2: "Completed",
  3: "Cancelled"
};

interface EscrowDetails {
  sender: string;
  receiver: string;
  amount: bigint;
  status: number; // 0: Created, 1: Delivered, 2: Completed, 3: Cancelled
}

function Escrow() {
  const { address: walletAddress } = useAccount();
  // allownace check for token
  const { data: allowance } = useReadContract({
    address: Token,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: [walletAddress, CONTRCAT_ADDRESS],
  });
  console.log("Allowance:", allowance);
  

  // Fetch escrow count
  const { data: escrowCountData, refetch: refetchEscrowCount } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "escrowCount",
  });

  // Fetch sender escrow IDs
  const { data: senderEscrowIds, refetch: refetchSenderEscrows } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "getSenderEscrows",
    account: walletAddress,
  });

  // Fetch receiver escrow IDs
  const { data: receiverEscrowIds, refetch: refetchReceiverEscrows } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "getReceiverEscrows",
    account: walletAddress,
  });

  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [escrowId, setEscrowId] = useState<string>('');
  const [escrowDetails, setEscrowDetails] = useState<EscrowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch escrow details for a specific ID
  const { data: escrowDetailsData, refetch: refetchEscrowDetails } = useReadContract({
    address: CONTRCAT_ADDRESS,
    abi: ABI,
    functionName: "escrows",
    args: [escrowId ? BigInt(escrowId) : 0],
    query: { enabled: !!escrowId },
  }); 
  console.log("Escrow Details Data:", escrowDetailsData);

  const { newEscrow, cancelEscrow, confirmDelivery, markDelivery } = useContract();
  const { approveToken } = TokenApprove();

  // Update escrow details when fetched
  useEffect(() => {
    if (escrowDetailsData && Array.isArray(escrowDetailsData)) {
      const [sender, receiver, amount, status] = escrowDetailsData as [string, string, bigint, number];
      setEscrowDetails({ sender, receiver, amount, status });
    } else {
      setEscrowDetails(null);
    }
  }, [escrowDetailsData]);
  
  // Combine sender and receiver escrow IDs
  function isBigIntArray(value: unknown): value is bigint[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'bigint');
  }
  
  const userEscrowIds = [
    ...(isBigIntArray(senderEscrowIds) ? senderEscrowIds.map((id: bigint) => id.toString()) : []),
    ...(isBigIntArray(receiverEscrowIds) ? receiverEscrowIds.map((id: bigint) => id.toString()) : []),
  ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

  const handleCreateEscrow = async () => {
    if (!receiverAddress || !amount) {
      setError("Please provide a valid receiver address and amount.");
      return;
    }
  
    setIsLoading(true);
    setError('');
    try {
      const weiAmount = parseUnits(amount, 18);
      const currentAllowance = typeof allowance === 'bigint' ? allowance : BigInt(0);
  
      // Step 1: Approve if needed
      if (currentAllowance < weiAmount) {
        const approvalTx = await approveToken();
        await waitForTransactionReceipt(config, { hash: approvalTx });
      }
  
      // Step 2: Create Escrow
      const tx = await newEscrow(receiverAddress, weiAmount);
      console.log("Escrow created:", tx);
  
      // Step 3: Reset input fields
      setReceiverAddress('');
      setAmount('');
  
      // Step 4: Wait for transaction to finalize (optional but safer)
      await new Promise(resolve => setTimeout(resolve, 1000)); // slight delay for indexing
  
      // Step 5: Refetch all escrow IDs freshly
      const senderResult = await refetchSenderEscrows();
      const receiverResult = await refetchReceiverEscrows();
  
      const senderIds = senderResult?.data;
      const receiverIds = receiverResult?.data;
  
      const allIds = [
        ...(isBigIntArray(senderIds) ? senderIds.map(id => id.toString()) : []),
        ...(isBigIntArray(receiverIds) ? receiverIds.map(id => id.toString()) : []),
      ];
  
      const uniqueSortedIds = [...new Set(allIds)].sort((a, b) => Number(b) - Number(a));
      const latestId = uniqueSortedIds[0];
  
      // Step 6: Set ID + fetch details
      setEscrowId(latestId);
      await refetchEscrowDetails();
      refetchEscrowCount();
  
    } catch (error) {
      console.error("Escrow creation error:", error);
      setError(`Error creating escrow: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  

  const handleGetEscrowDetails = async () => {
    if (!escrowId || isNaN(Number(escrowId))) {
      setError("Please enter a valid escrow ID.");
      return;
    }
    setIsLoadingDetails(true);
    setError('');
    try {
      await refetchEscrowDetails();
    } catch (error) {
      setError(`Error fetching escrow details: ${error}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCancelEscrow = async () => {
    if (!escrowId) {
      setError("Please enter a valid escrow ID.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await cancelEscrow(BigInt(escrowId));
      console.log("Escrow cancelled successfully");
      await refetchEscrowDetails();
    } catch (error) {
      setError(`Error cancelling escrow: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!escrowId) {
      setError("Please enter a valid escrow ID.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await confirmDelivery(BigInt(escrowId));
      console.log("Delivery confirmed successfully");
      await refetchEscrowDetails();
    } catch (error) {
      setError(`Error confirming delivery: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDelivery = async () => {
    if (!escrowId) {
      setError("Please enter a valid escrow ID.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await markDelivery(BigInt(escrowId));
      console.log("Delivery marked successfully");
      await refetchEscrowDetails();
    } catch (error) {
      setError(`Error marking delivery: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format amount safely
  const formatAmount = (amount: bigint | undefined) => {
    if (amount === undefined) return '0';
    try {
      return formatUnits(amount, 18);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black py-10 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto bg-white/90 dark:bg-gray-900 backdrop-blur-xl rounded-2xl shadow-2xl p-8 ring-1 ring-gray-200 dark:ring-gray-700">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Escrow System</h1>
          <OptimismConnectButton />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 dark:bg-red-800 text-red-900 dark:text-red-200 px-6 py-4 rounded-xl shadow text-center font-bold text-lg">
            {error}
          </div>
        )}

        {/* Show Escrow IDs for sender or receiver */}
        {walletAddress && userEscrowIds.length > 0 && (
          <div className="mb-6 bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200 px-6 py-4 rounded-xl shadow text-center font-bold text-lg">
            Your Escrow IDs: {userEscrowIds.join(', ')}
          </div>
        )}

        {/* Create Escrow Section */}
        <div className="mb-10 p-6 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Create New Escrow</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Receiver Address</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="Enter receiver address"
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white text-black placeholder-gray-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 px-4 py-3 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token Amount (in whole tokens)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter token amount"
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white text-black placeholder-gray-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 px-4 py-3 transition"
              />
            </div>
            <button
              onClick={handleCreateEscrow}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 transform hover:scale-105"
            >
              {isLoading ? 'Creating...' : 'Create Escrow'}
            </button>
          </div>
        </div>

        {/* Escrow Operations Section */}
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Escrow Operations</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Escrow ID</label>
            <div className="flex rounded-xl shadow-sm overflow-hidden">
              <input
                type="text"
                value={escrowId}
                onChange={(e) => setEscrowId(e.target.value)}
                placeholder="Enter escrow ID"
                className="flex-1 rounded-l-xl border border-gray-300 dark:border-gray-700 bg-white text-black placeholder-gray-500 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                onClick={handleGetEscrowDetails}
                disabled={isLoadingDetails}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-r-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
              >
                {isLoadingDetails ? 'Loading...' : 'Get Details'}
              </button>
            </div>
          </div>

          {/* Escrow Details Display */}
          {escrowDetails && (
            <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Escrow Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-sm text-gray-500">Sender</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{escrowDetails.sender}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-sm text-gray-500">Receiver</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{escrowDetails.receiver}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-sm text-gray-500">Token Amount</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatAmount(escrowDetails.amount)} tokens
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {ESCROW_STATUS[escrowDetails.status as keyof typeof ESCROW_STATUS]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operation Buttons */}
          {escrowDetails && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleCancelEscrow}
                disabled={isLoading || !escrowId || escrowDetails.status !== 0}
                className="bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition transform hover:scale-105"
              >
                Cancel Escrow
              </button>

              {walletAddress?.toLowerCase() === escrowDetails.sender?.toLowerCase() && escrowDetails.status === 0 && (
                <button
                  onClick={handleMarkDelivery}
                  disabled={isLoading}
                  className="bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition transform hover:scale-105"
                >
                  Mark Delivery
                </button>
              )}

              {walletAddress?.toLowerCase() === escrowDetails.receiver?.toLowerCase() && escrowDetails.status === 1 && (
                <button
                  onClick={handleConfirmDelivery}
                  disabled={isLoading}
                  className="bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition transform hover:scale-105"
                >
                  Confirm Delivery
                </button>
              )}
            </div>
          )}
        </div>

        {/* Escrow Count Display */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Escrows: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{escrowCountData?.toString() || '0'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Escrow;