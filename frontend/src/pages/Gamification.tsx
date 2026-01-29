import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Star,
  TrendingUp,
  Users,
  Target,
  Zap,
  Crown,
  Shield,
  Calendar,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  score: number;
  rank: number;
  metrics: {
    prospectsCreated?: number;
    appointmentsBooked?: number;
    quotesSigned?: number;
    totalCA?: number;
    conversionRate?: number;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  target?: number;
}

const badgeIcons: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-8 h-8" />,
  medal: <Medal className="w-8 h-8" />,
  award: <Award className="w-8 h-8" />,
  star: <Star className="w-8 h-8" />,
  target: <Target className="w-8 h-8" />,
  zap: <Zap className="w-8 h-8" />,
  crown: <Crown className="w-8 h-8" />,
  shield: <Shield className="w-8 h-8" />,
};

const defaultBadges: Badge[] = [
  { id: '1', name: 'Premier pas', description: 'Créer votre premier prospect', icon: 'star', earned: true, earnedAt: '2024-01-15' },
  { id: '2', name: 'Qualificateur', description: 'Qualifier 10 prospects', icon: 'target', earned: true, earnedAt: '2024-01-20' },
  { id: '3', name: 'Téléprospecteur Bronze', description: 'Prendre 25 RDV', icon: 'medal', earned: true, earnedAt: '2024-02-01' },
  { id: '4', name: 'Téléprospecteur Argent', description: 'Prendre 50 RDV', icon: 'medal', earned: false, progress: 35, target: 50 },
  { id: '5', name: 'Téléprospecteur Or', description: 'Prendre 100 RDV', icon: 'trophy', earned: false, progress: 35, target: 100 },
  { id: '6', name: 'Vendeur Bronze', description: 'Signer 10 devis', icon: 'award', earned: false, progress: 5, target: 10 },
  { id: '7', name: 'Vendeur Argent', description: 'Signer 25 devis', icon: 'award', earned: false, progress: 5, target: 25 },
  { id: '8', name: 'Vendeur Or', description: 'Signer 50 devis', icon: 'crown', earned: false, progress: 5, target: 50 },
  { id: '9', name: 'Top Performer', description: 'Être #1 du classement mensuel', icon: 'zap', earned: false },
  { id: '10', name: 'Parrain', description: 'Obtenir 5 parrainages', icon: 'shield', earned: false, progress: 2, target: 5 },
];

export const Gamification: React.FC = () => {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>(defaultBadges);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');

  useEffect(() => {
    fetchGamificationData();
  }, [period]);

  const fetchGamificationData = async () => {
    setLoading(true);
    try {
      const res = await api.getStatsGamification({ period });
      const data = (res as any).data;
      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
      if (data?.badges) {
        setBadges(data.badges);
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      // Use mock data for demo
      setLeaderboard([
        { userId: '1', firstName: 'Jean', lastName: 'Dupont', role: 'COMMERCIAL', score: 15200, rank: 1, metrics: { quotesSigned: 12, totalCA: 85000, conversionRate: 45 } },
        { userId: '2', firstName: 'Marie', lastName: 'Martin', role: 'COMMERCIAL', score: 13800, rank: 2, metrics: { quotesSigned: 10, totalCA: 72000, conversionRate: 42 } },
        { userId: '3', firstName: 'Pierre', lastName: 'Durand', role: 'SDR', score: 12500, rank: 3, metrics: { prospectsCreated: 85, appointmentsBooked: 42, conversionRate: 49 } },
        { userId: '4', firstName: 'Sophie', lastName: 'Bernard', role: 'COMMERCIAL', score: 11200, rank: 4, metrics: { quotesSigned: 8, totalCA: 58000, conversionRate: 38 } },
        { userId: '5', firstName: 'Lucas', lastName: 'Petit', role: 'SDR', score: 10800, rank: 5, metrics: { prospectsCreated: 72, appointmentsBooked: 35, conversionRate: 48 } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
            {rank}
          </div>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const myRank = leaderboard.find(e => e.userId === user?.id);
  const earnedBadges = badges.filter(b => b.earned);
  const pendingBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gamification</h1>
          <p className="text-gray-600">Classements et badges</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      {/* My Stats Card */}
      {myRank && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getRankBadge(myRank.rank)}
              <div>
                <p className="text-blue-100">Votre classement</p>
                <p className="text-3xl font-bold">#{myRank.rank}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100">Score total</p>
              <p className="text-3xl font-bold">{myRank.score.toLocaleString()} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trophy className="w-5 h-5 inline-block mr-2" />
            Classement
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'badges'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="w-5 h-5 inline-block mr-2" />
            Badges ({earnedBadges.length}/{badges.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'leaderboard' ? (
        /* Leaderboard */
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rang</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Collaborateur</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Métriques</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaderboard.map((entry) => (
                <tr
                  key={entry.userId}
                  className={`hover:bg-gray-50 ${entry.userId === user?.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    {getRankBadge(entry.rank)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-600">
                        {entry.firstName[0]}{entry.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{entry.firstName} {entry.lastName}</p>
                        {entry.userId === user?.id && (
                          <span className="text-xs text-blue-600">C'est vous !</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      entry.role === 'COMMERCIAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.role === 'COMMERCIAL' ? 'Commercial' : 'SDR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {entry.metrics.quotesSigned !== undefined && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {entry.metrics.quotesSigned} signés
                        </span>
                      )}
                      {entry.metrics.appointmentsBooked !== undefined && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {entry.metrics.appointmentsBooked} RDV
                        </span>
                      )}
                      {entry.metrics.totalCA !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {formatCurrency(entry.metrics.totalCA)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xl font-bold text-gray-900">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Badges */
        <div className="space-y-8">
          {/* Earned Badges */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Badges obtenus ({earnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-white rounded-xl border p-4 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white">
                    {badgeIcons[badge.icon] || <Award className="w-8 h-8" />}
                  </div>
                  <h4 className="font-semibold text-gray-900">{badge.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                  {badge.earnedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending Badges */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" />
              Badges à débloquer ({pendingBadges.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pendingBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-white rounded-xl border p-4 text-center opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    {badgeIcons[badge.icon] || <Award className="w-8 h-8" />}
                  </div>
                  <h4 className="font-semibold text-gray-700">{badge.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                  {badge.progress !== undefined && badge.target !== undefined && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(badge.progress / badge.target) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {badge.progress} / {badge.target}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gamification;
