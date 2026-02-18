/**
 * BellePoule Modern - Pool Management Hook
 * Gestion des poules, scores et classements
 * Licensed under GPL-3.0
 */

import { useState, useCallback } from 'react';
import { Pool, Fencer, Match, MatchStatus, Weapon, PoolRanking } from '../../shared/types';
import { useToast } from '../components/Toast';
import {
  distributeFencersToPoolsSerpentine,
  calculateOptimalPoolCount,
  generatePoolMatchOrder,
  calculatePoolRanking,
  calculatePoolRankingQuest,
  calculateOverallRanking,
  calculateOverallRankingQuest,
} from '../../shared/utils/poolCalculations';

interface UsePoolManagementProps {
  isLaserSabre: boolean;
  poolMaxScore: number;
  showToast: ReturnType<typeof useToast>['showToast'];
}

export const usePoolManagement = ({
  isLaserSabre,
  poolMaxScore,
  showToast,
}: UsePoolManagementProps) => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolHistory, setPoolHistory] = useState<Pool[][]>([]);
  const [currentPoolRound, setCurrentPoolRound] = useState(1);
  const [overallRanking, setOverallRanking] = useState<PoolRanking[]>([]);

  // Helper pour calculer le classement selon le type
  const computePoolRanking = useCallback(
    (pool: Pool) => {
      return isLaserSabre ? calculatePoolRankingQuest(pool) : calculatePoolRanking(pool);
    },
    [isLaserSabre]
  );

  const computeOverallRanking = useCallback(
    (poolsList: Pool[]) => {
      return isLaserSabre
        ? calculateOverallRankingQuest(poolsList)
        : calculateOverallRanking(poolsList);
    },
    [isLaserSabre]
  );

  // Générer les poules
  const generatePools = useCallback(
    (checkedInFencers: Fencer[]) => {
      if (checkedInFencers.length < 4) {
        showToast('Il faut au moins 4 tireurs pointés pour créer les poules.', 'warning');
        return null;
      }

      const poolCount = calculateOptimalPoolCount(checkedInFencers.length, 5, 7);
      const distribution = distributeFencersToPoolsSerpentine(checkedInFencers, poolCount, {
        byClub: true,
        byLeague: true,
        byNation: false,
      });

      const generatedPools: Pool[] = distribution.map((poolFencers, index) => {
        const matchOrder = generatePoolMatchOrder(poolFencers.length);
        const matches: Match[] = matchOrder.map(([a, b], matchIndex) => ({
          id: `match-${index}-${matchIndex}`,
          number: matchIndex + 1,
          fencerA: poolFencers[a - 1],
          fencerB: poolFencers[b - 1],
          scoreA: null,
          scoreB: null,
          maxScore: poolMaxScore,
          status: MatchStatus.NOT_STARTED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        return {
          id: `pool-${index}`,
          number: index + 1,
          phaseId: 'phase-pools',
          fencers: poolFencers,
          matches,
          referees: [],
          isComplete: false,
          hasError: false,
          ranking: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      setPools(generatedPools);
      setCurrentPoolRound(1);
      setPoolHistory([]);

      const ranking = computeOverallRanking(generatedPools);
      setOverallRanking(ranking);

      showToast(`${generatedPools.length} poules créées avec succès`, 'success');
      return generatedPools;
    },
    [poolMaxScore, computeOverallRanking, showToast]
  );

  // Mettre à jour un score
  const updateScore = useCallback(
    (
      poolIndex: number,
      matchIndex: number,
      scoreA: number,
      scoreB: number,
      winnerOverride?: 'A' | 'B',
      specialStatus?: 'abandon' | 'forfait' | 'exclusion'
    ) => {
      setPools(prevPools => {
        const updatedPools = [...prevPools];
        const pool = { ...updatedPools[poolIndex] };
        const match = { ...pool.matches[matchIndex] };

        // Mettre à jour les scores avec la structure Score
        const isVictoryA = winnerOverride === 'A' || (!winnerOverride && scoreA > scoreB);
        const isVictoryB = winnerOverride === 'B' || (!winnerOverride && scoreB > scoreA);

        match.scoreA = {
          value: scoreA,
          isVictory: isVictoryA,
          isAbstention: specialStatus === 'abandon',
          isExclusion: specialStatus === 'exclusion',
          isForfait: specialStatus === 'forfait',
        };

        match.scoreB = {
          value: scoreB,
          isVictory: isVictoryB,
          isAbstention: false,
          isExclusion: false,
          isForfait: false,
        };

        // Mettre à jour le statut
        match.status = MatchStatus.FINISHED;
        match.updatedAt = new Date();

        // Mettre à jour le pool
        pool.matches[matchIndex] = match;
        pool.updatedAt = new Date();

        // Recalculer le classement de la poule
        pool.ranking = computePoolRanking(pool);

        updatedPools[poolIndex] = pool;

        // Recalculer le classement général
        const newOverallRanking = computeOverallRanking(updatedPools);
        setOverallRanking(newOverallRanking);

        return updatedPools;
      });
    },
    [computePoolRanking, computeOverallRanking]
  );

  // Passer au tour de poules suivant
  const nextPoolRound = useCallback(
    (checkedInFencers: Fencer[]) => {
      if (pools.length === 0) return;

      // Sauvegarder l'état actuel dans l'historique
      setPoolHistory(prev => [...prev, pools]);

      // Générer de nouvelles poules avec le classement actuel
      const newPoolCount = calculateOptimalPoolCount(checkedInFencers.length, 5, 7);
      const distribution = distributeFencersToPoolsSerpentine(checkedInFencers, newPoolCount, {
        byClub: true,
        byLeague: true,
        byNation: false,
      });

      const newPools: Pool[] = distribution.map((poolFencers, index) => {
        const matchOrder = generatePoolMatchOrder(poolFencers.length);
        const matches: Match[] = matchOrder.map(([a, b], matchIndex) => ({
          id: `match-round${currentPoolRound + 1}-${index}-${matchIndex}`,
          number: matchIndex + 1,
          fencerA: poolFencers[a - 1],
          fencerB: poolFencers[b - 1],
          scoreA: null,
          scoreB: null,
          maxScore: poolMaxScore,
          status: MatchStatus.NOT_STARTED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        return {
          id: `pool-round${currentPoolRound + 1}-${index}`,
          number: index + 1,
          phaseId: 'phase-pools',
          fencers: poolFencers,
          matches,
          referees: [],
          isComplete: false,
          hasError: false,
          ranking: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      setPools(newPools);
      setCurrentPoolRound(prev => prev + 1);

      const ranking = computeOverallRanking(newPools);
      setOverallRanking(ranking);

      showToast(`Tour ${currentPoolRound + 1} de poules créé`, 'success');
    },
    [pools, currentPoolRound, poolMaxScore, computeOverallRanking, showToast]
  );

  // Vérifier si toutes les poules sont complètes
  const areAllPoolsComplete = useCallback(() => {
    return pools.every(pool => pool.matches.every(match => match.status === MatchStatus.FINISHED));
  }, [pools]);

  // Obtenir les statistiques des poules
  const getPoolStats = useCallback(() => {
    const totalMatches = pools.reduce((sum, pool) => sum + pool.matches.length, 0);
    const completedMatches = pools.reduce(
      (sum, pool) => sum + pool.matches.filter(m => m.status === MatchStatus.FINISHED).length,
      0
    );

    return {
      totalPools: pools.length,
      totalMatches,
      completedMatches,
      completionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    };
  }, [pools]);

  // Gérer le forfait/abandon d'un tireur sur tous ses matchs
  // Les matchs sont marqués comme non disputés (grisés) sans modifier les scores des adversaires
  const handleFencerForfeit = useCallback(
    (fencerId: string) => {
      setPools(prevPools => {
        const updatedPools = [...prevPools];
        let modifiedCount = 0;

        updatedPools.forEach(pool => {
          pool.matches.forEach(match => {
            // Vérifier si le tireur est dans ce match
            const isFencerA = match.fencerA?.id === fencerId;
            const isFencerB = match.fencerB?.id === fencerId;

            if (!isFencerA && !isFencerB) return;

            // Marquer le match comme "non disputé" à cause du forfait/abandon
            // Les scores de l'adversaire restent null (non modifiés)
            if (isFencerA) {
              match.scoreA = {
                value: 0,
                isVictory: false,
                isAbstention: false,
                isExclusion: false,
                isForfait: true,
              };
            } else {
              match.scoreB = {
                value: 0,
                isVictory: false,
                isAbstention: false,
                isExclusion: false,
                isForfait: true,
              };
            }

            // Marquer le match comme terminé mais avec forfait
            match.status = MatchStatus.FINISHED;
            match.updatedAt = new Date();
            modifiedCount++;
          });

          // Recalculer le classement de la pou00le
          if (modifiedCount > 0) {
            pool.ranking = computePoolRanking(pool);
            pool.updatedAt = new Date();
          }
        });

        // Recalculer le classement général
        if (modifiedCount > 0) {
          const newOverallRanking = computeOverallRanking(updatedPools);
          setOverallRanking(newOverallRanking);
          showToast(
            `${modifiedCount} match(s) marqué(s) comme non disputés (forfait/abandon)`,
            'success'
          );
        }

        return updatedPools;
      });
    },
    [computePoolRanking, computeOverallRanking, showToast]
  );

  return {
    pools,
    setPools,
    poolHistory,
    setPoolHistory,
    currentPoolRound,
    setCurrentPoolRound,
    overallRanking,
    setOverallRanking,
    generatePools,
    updateScore,
    nextPoolRound,
    areAllPoolsComplete,
    getPoolStats,
    computePoolRanking,
    computeOverallRanking,
    handleFencerForfeit,
  };
};

export default usePoolManagement;
