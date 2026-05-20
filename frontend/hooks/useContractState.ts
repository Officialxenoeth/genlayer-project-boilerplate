/**
 * @hook useContractState
 * @description 
 * A custom React hook for reactive data fetching from the GenLayer blockchain.
 * * * KEY FUNCTIONALITIES:
 * 1. Automated Polling: Implements a 5-second interval to ensure the UI stays 
 * synced with the Intelligent Contract's global state without manual refreshes.
 * 2. RPC Integration: Standardizes the JSON-RPC 'gen_call' structure required 
 * to interact with GenLayer's unique consensus-driven read methods.
 * 3. Lifecycle Management: Properly handles interval cleanup on component 
 * unmount to prevent memory leaks and unnecessary network overhead.
 * * * PARAMETERS:
 * @param contractAddress - The deployed hex address of the Intelligent Contract.
 * @param playerAddress - The wallet address of the user whose points are being queried.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export function useContractState(contractAddress: string, playerAddress: string) {
  const query = useQuery({
    queryKey: ['contract-points', contractAddress, playerAddress],
    enabled: Boolean(contractAddress && playerAddress),
    refetchInterval: 5000, // Safely handles the 5-second polling loop automatically
    queryFn: async ({ signal }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GENLAYER_RPC_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'gen_call',
          params: [contractAddress, 'get_points', [playerAddress]],
          id: 1,
        }),
        signal, // Automatically aborts stale network tasks
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.result || 0;
    },
  });

  return {
    points: query.data ?? 0,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
}
