"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bet {
  player: string;
  game_date: string;
  team1: string;
  team2: string;
  predicted_winner: string;
  resolved: boolean;
  correct: boolean | null;
}

interface ContractMonitorProps {
  contractAddress: `0x${string}`;
}

// ─── GenLayer client (singleton per render) ───────────────────────────────────

function getClient() {
  return createClient({
    chain: studionet,
    endpoint: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL as string,
  });
}

// ─── ContractMonitor ──────────────────────────────────────────────────────────

export default function ContractMonitor({ contractAddress }: ContractMonitorProps) {
  const queryClient = useQueryClient();
  const client = getClient();

  // ── Read: fetch all bets ───────────────────────────────────────────────────
  const {
    data: bets,
    isLoading,
    error,
  } = useQuery<Bet[]>({
    queryKey: ["bets", contractAddress],
    queryFn: async () => {
      const result = await client.readContract({
        address: contractAddress,
        functionName: "get_bets",
        args: [],
      });
      return result as Bet[];
    },
    refetchInterval: 8_000,
  });

  // ── Write: create a bet ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    game_date: "",
    team1: "",
    team2: "",
    predicted_winner: "",
  });

  const createBet = useMutation({
    mutationFn: async () => {
      const tx = await client.writeContract({
        address: contractAddress,
        functionName: "create_bet",
        args: [form.game_date, form.team1, form.team2, form.predicted_winner],
      });
      await client.waitForTransactionReceipt({ hash: tx });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bets", contractAddress] });
      setForm({ game_date: "", team1: "", team2: "", predicted_winner: "" });
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="contract-monitor">
      <header className="cm-header">
        <h2 className="cm-title">Contract Monitor</h2>
        <p className="cm-address">{contractAddress}</p>
      </header>

      {/* ── Create Bet Form ── */}
      <div className="cm-card">
        <h3 className="cm-section-title">Place a Bet</h3>
        <div className="cm-form">
          <input
            className="cm-input"
            placeholder="Game date (YYYY-MM-DD)"
            value={form.game_date}
            onChange={(e) => setForm((f) => ({ ...f, game_date: e.target.value }))}
          />
          <input
            className="cm-input"
            placeholder="Team 1"
            value={form.team1}
            onChange={(e) => setForm((f) => ({ ...f, team1: e.target.value }))}
          />
          <input
            className="cm-input"
            placeholder="Team 2"
            value={form.team2}
            onChange={(e) => setForm((f) => ({ ...f, team2: e.target.value }))}
          />
          <input
            className="cm-input"
            placeholder="Predicted winner (or 'draw')"
            value={form.predicted_winner}
            onChange={(e) =>
              setForm((f) => ({ ...f, predicted_winner: e.target.value }))
            }
          />
          <button
            className="cm-btn"
            disabled={createBet.isPending || !form.game_date || !form.team1}
            onClick={() => createBet.mutate()}
          >
            {createBet.isPending ? "Submitting…" : "Submit Bet"}
          </button>
          {createBet.isError && (
            <p className="cm-error">{String(createBet.error)}</p>
          )}
        </div>
      </div>

      {/* ── Bets Table ── */}
      <div className="cm-card">
        <h3 className="cm-section-title">All Bets</h3>

        {isLoading && <p className="cm-muted">Loading bets…</p>}
        {error && <p className="cm-error">Failed to load bets.</p>}

        {bets && bets.length === 0 && (
          <p className="cm-muted">No bets yet. Place the first one!</p>
        )}

        {bets && bets.length > 0 && (
          <div className="cm-table-wrapper">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Date</th>
                  <th>Match</th>
                  <th>Prediction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet, i) => (
                  <tr key={i}>
                    <td className="cm-mono">{truncate(bet.player)}</td>
                    <td>{bet.game_date}</td>
                    <td>
                      {bet.team1} vs {bet.team2}
                    </td>
                    <td>{bet.predicted_winner}</td>
                    <td>
                      {!bet.resolved ? (
                        <span className="cm-badge cm-badge--pending">Pending</span>
                      ) : bet.correct ? (
                        <span className="cm-badge cm-badge--win">Won ✓</span>
                      ) : (
                        <span className="cm-badge cm-badge--loss">Lost ✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
