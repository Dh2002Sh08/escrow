"use client";
import { useReadContract, useWriteContract } from "wagmi";
import { CONTRCAT_ADDRESS } from "./contractAddress";
import { ABI } from "./ABI";

export function useContract() {
    const { writeContract } = useWriteContract();

    const getReadTokenAddress = () => {
        const result = useReadContract({
            address: CONTRCAT_ADDRESS,
            abi: ABI,
            functionName: "token",
        });
        return result.data || "0x";
    };

    const newEscrow = async (
        receiver: string,
        amount: bigint,
    ) => {
        try {
            const result = await writeContract({
                address: CONTRCAT_ADDRESS,
                abi: ABI,
                functionName: "createEscrow",
                args: [receiver, amount],
            });
            return result;
        } catch (error) {
            console.error("Error in newEscrow:", error);
            throw error;
        }
    };

    const cancelEscrow = async (escrowId: bigint) => {
        try {
            const result = await writeContract({
                address: CONTRCAT_ADDRESS,
                abi: ABI,
                functionName: "cancelEscrow",
                args: [escrowId],
            });
            return result;
        } catch (error) {
            console.error("Error in cancelEscrow:", error);
            throw error;
        }
    }

    const confirmDelivery = async (escrowId: bigint) => {
        try {
            const result = await writeContract({
                address: CONTRCAT_ADDRESS,
                abi: ABI,
                functionName: "confirmDelivery",
                args: [escrowId],
            });
            return result;
        } catch (error) {
            console.error("Error in confirmDelivery:", error);
            throw error;
        }
    }

    const markDelivery = async (escrowId: bigint) => {
        try {
            const result = await writeContract({
                address: CONTRCAT_ADDRESS,
                abi: ABI,
                functionName: "markDelivered",
                args: [escrowId],
            });
            return result;
        } catch (error) {
            console.error("Error in markDelivery:", error);
            throw error;
        }
    };

    const escrowCount = () => {
        const result = useReadContract({
            address: CONTRCAT_ADDRESS,
            abi: ABI,
            functionName: "escrowCount",
        });
        return result;
    };

    // const getEscrowDetails = async (escrowId: bigint) => {
    //     const result = useReadContract({
    //         address: CONTRCAT_ADDRESS,
    //         abi: ABI,
    //         functionName: "getEscrowDetails",
    //         args: [escrowId],
    //     });
    //     console.log("Escrow Details:", result);
    //     return result;
    // };

    const getTokenAddress = (address: string) => {
        const result = useReadContract({
            address: CONTRCAT_ADDRESS,
            abi: ABI,
            functionName: "token",
            args: [address],
        });
        return result;
    };

    return {
        getReadTokenAddress,
        newEscrow,
        cancelEscrow,
        confirmDelivery,
        markDelivery,
        // escrowCount,
        // getEscrowDetails,
        getTokenAddress,
    };
}