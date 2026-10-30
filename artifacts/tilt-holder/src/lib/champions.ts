import { createContext, useContext } from 'react';
import { type HistoricalRecord } from '@/data/history';
import { type Player, type PlayerName } from '@/lib/player-stats';

export type SeasonChampion = { season: string; name: PlayerName; net: number; played: number; wins: number };

// Season winners: first place in each season's ranking (net, then win rate, then games,
// like the ranking card), but only for seasons that are over. The running year has no
// champion until it ends.
export function seasonChampions(
  users: Player[],
  historicalRecords: HistoricalRecord[],
  historyDates: string[],
  currentYear = String(new Date().getFullYear()),
): SeasonChampion[] {
  const seasons = Array.from(new Set(historyDates.map((date) => date.slice(0, 4)))).filter((season) => season < currentYear).sort();
  return seasons.flatMap((season) => {
    const indices = historyDates.flatMap((date, index) => (date.startsWith(season) ? [index] : []));
    const [top] = users
      .map((player) => {
        const values = historicalRecords.find((record) => record.name === player.name)?.values ?? [];
        const played = indices.map((index) => values[index]).filter((value): value is number => value !== null && value !== undefined);
        const wins = played.filter((value) => value > 0).length;
        return { name: player.name, net: played.reduce((sum, value) => sum + value, 0), played: played.length, wins };
      })
      .filter((stat) => stat.played > 0)
      .sort((a, b) => b.net - a.net || b.wins / b.played - a.wins / a.played || b.played - a.played);
    return top ? [{ season, ...top }] : [];
  });
}

export const ChampionsContext = createContext<SeasonChampion[]>([]);

export function useChampionTitles(name: PlayerName) {
  return useContext(ChampionsContext).filter((champion) => champion.name === name);
}
