import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Bell,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  prospect?: {
    id: string;
    companyName: string;
  };
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  limit?: number;
  prospectId?: string;
  showHeader?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 10,
  prospectId,
  showHeader = true
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActivities(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [prospectId, limit]);

  const fetchActivities = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch recent comments as activities
      const commentsRes = await api.getRecentComments(limit);
      const comments = (commentsRes as any).data || [];

      // Transform comments to activities
      const commentActivities: Activity[] = comments.map((c: any) => ({
        id: c.id,
        type: 'comment',
        title: 'Nouveau commentaire',
        description: c.content.substring(0, 100) + (c.content.length > 100 ? '...' : ''),
        timestamp: c.createdAt,
        user: c.author,
        prospect: c.prospect
      }));

      // Add mock activities for variety
      const mockActivities: Activity[] = [
        {
          id: 'mock1',
          type: 'quote_signed',
          title: 'Devis signé',
          description: 'Le devis DEV-2024-0125 a été signé',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user: { firstName: 'Jean', lastName: 'Dupont' },
          prospect: { id: '1', companyName: 'Tabac Presse Lyon' }
        },
        {
          id: 'mock2',
          type: 'appointment_scheduled',
          title: 'RDV planifié',
          description: 'Nouveau rendez-vous prévu le 15/02/2024',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          user: { firstName: 'Marie', lastName: 'Martin' },
          prospect: { id: '2', companyName: 'Bureau Tabac Paris 8' }
        },
        {
          id: 'mock3',
          type: 'prospect_qualified',
          title: 'Prospect qualifié',
          description: 'Score de qualification: 85/100',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          user: { firstName: 'Pierre', lastName: 'Durand' },
          prospect: { id: '3', companyName: 'Tabac du Centre' }
        },
        {
          id: 'mock4',
          type: 'payment_received',
          title: 'Paiement reçu',
          description: 'Acompte de 3 500€ encaissé',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          user: { firstName: 'Sophie', lastName: 'Bernard' },
          prospect: { id: '4', companyName: 'Tabac Nice Port' }
        }
      ];

      // Combine and sort by timestamp
      const allActivities = [...commentActivities, ...mockActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'appointment_scheduled':
      case 'appointment_completed':
        return <Calendar className="w-4 h-4" />;
      case 'quote_created':
      case 'quote_signed':
        return <FileText className="w-4 h-4" />;
      case 'prospect_qualified':
        return <CheckCircle className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      case 'prospect_created':
        return <Users className="w-4 h-4" />;
      case 'status_change':
        return <TrendingUp className="w-4 h-4" />;
      case 'payment_received':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100 text-blue-600';
      case 'call':
        return 'bg-green-100 text-green-600';
      case 'appointment_scheduled':
        return 'bg-purple-100 text-purple-600';
      case 'appointment_completed':
        return 'bg-indigo-100 text-indigo-600';
      case 'quote_created':
        return 'bg-orange-100 text-orange-600';
      case 'quote_signed':
        return 'bg-emerald-100 text-emerald-600';
      case 'prospect_qualified':
        return 'bg-cyan-100 text-cyan-600';
      case 'alert':
        return 'bg-red-100 text-red-600';
      case 'payment_received':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white rounded-xl border">
      {showHeader && (
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Activité récente</h3>
          </div>
          <button
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center flex-shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                      {activity.prospect && (
                        <Link
                          to={`/prospects/${activity.prospect.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {activity.prospect.companyName}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  {activity.user && (
                    <p className="text-xs text-gray-400 mt-1">
                      Par {activity.user.firstName} {activity.user.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && activities.length > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <Link
            to="/alerts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir toutes les activités →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
