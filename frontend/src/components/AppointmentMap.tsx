import { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Calendar,
  User,
  Building,
  Phone,
  Route,
  Maximize2,
  List,
  Filter,
  RefreshCw
} from 'lucide-react';

interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  prospect: {
    id: string;
    companyName: string;
    address: string;
    city: string;
    postalCode: string;
    decisionMakerName: string;
    decisionMakerMobile: string;
    lat?: number;
    lng?: number;
  };
  commercial?: {
    firstName: string;
    lastName: string;
  };
}

interface AppointmentMapProps {
  appointments: Appointment[];
  selectedDate?: Date;
  onSelectAppointment?: (appointment: Appointment) => void;
  showRoute?: boolean;
}

// Default center on France
const DEFAULT_CENTER = { lat: 46.603354, lng: 1.888334 };
const DEFAULT_ZOOM = 6;

export const AppointmentMap: React.FC<AppointmentMapProps> = ({
  appointments,
  selectedDate,
  onSelectAppointment,
  showRoute = true
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showList, setShowList] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter(apt =>
        apt.scheduledAt.startsWith(dateStr)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    // Sort by time
    return filtered.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [appointments, selectedDate, filterStatus]);

  // Calculate distances between appointments
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate route info
  const routeInfo = useMemo(() => {
    const validAppointments = filteredAppointments.filter(
      apt => apt.prospect.lat && apt.prospect.lng
    );

    if (validAppointments.length < 2) return null;

    let totalDistance = 0;
    const segments: { from: string; to: string; distance: number; time: number }[] = [];

    for (let i = 0; i < validAppointments.length - 1; i++) {
      const from = validAppointments[i];
      const to = validAppointments[i + 1];

      if (from.prospect.lat && from.prospect.lng && to.prospect.lat && to.prospect.lng) {
        const distance = calculateDistance(
          from.prospect.lat, from.prospect.lng,
          to.prospect.lat, to.prospect.lng
        );
        totalDistance += distance;

        segments.push({
          from: from.prospect.companyName,
          to: to.prospect.companyName,
          distance: Math.round(distance),
          time: Math.round(distance / 50 * 60) // Estimate 50km/h average
        });
      }
    }

    return {
      totalDistance: Math.round(totalDistance),
      totalTime: Math.round(totalDistance / 50 * 60),
      segments
    };
  }, [filteredAppointments]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-500';
      case 'CONFIRMED': return 'bg-green-500';
      case 'DONE': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Planifié';
      case 'CONFIRMED': return 'Confirmé';
      case 'DONE': return 'Effectué';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  };

  const openInMaps = (appointment: Appointment) => {
    const address = encodeURIComponent(
      `${appointment.prospect.address}, ${appointment.prospect.postalCode} ${appointment.prospect.city}`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const openRouteInMaps = () => {
    if (filteredAppointments.length < 2) return;

    const waypoints = filteredAppointments
      .map(apt => `${apt.prospect.address}, ${apt.prospect.postalCode} ${apt.prospect.city}`)
      .join('/');

    const origin = encodeURIComponent(
      `${filteredAppointments[0].prospect.address}, ${filteredAppointments[0].prospect.city}`
    );
    const destination = encodeURIComponent(
      `${filteredAppointments[filteredAppointments.length - 1].prospect.address}, ${filteredAppointments[filteredAppointments.length - 1].prospect.city}`
    );

    let url = `https://www.google.com/maps/dir/${origin}`;

    // Add waypoints
    if (filteredAppointments.length > 2) {
      for (let i = 1; i < filteredAppointments.length - 1; i++) {
        const wp = encodeURIComponent(
          `${filteredAppointments[i].prospect.address}, ${filteredAppointments[i].prospect.city}`
        );
        url += `/${wp}`;
      }
    }

    url += `/${destination}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${mapExpanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Carte des RDV</h3>
            <p className="text-sm text-gray-500">
              {filteredAppointments.length} rendez-vous
              {routeInfo && ` • ${routeInfo.totalDistance} km`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1"
          >
            <option value="">Tous les statuts</option>
            <option value="SCHEDULED">Planifiés</option>
            <option value="CONFIRMED">Confirmés</option>
            <option value="DONE">Effectués</option>
          </select>
          <button
            onClick={() => setShowList(!showList)}
            className={`p-2 rounded-lg ${showList ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Afficher la liste"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Agrandir"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex" style={{ height: mapExpanded ? 'calc(100% - 60px)' : '500px' }}>
        {/* Map placeholder - Using static map or iframe */}
        <div className={`${showList ? 'w-2/3' : 'w-full'} relative bg-gray-100`}>
          {/* Placeholder for map */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                Carte interactive
              </p>
              {filteredAppointments.length > 0 && (
                <button
                  onClick={openRouteInMaps}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                >
                  <Navigation className="w-4 h-4" />
                  Ouvrir l'itinéraire dans Google Maps
                </button>
              )}
            </div>
          </div>

          {/* Appointment markers overlay */}
          <div className="absolute top-4 left-4 space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto">
            {filteredAppointments.map((apt, index) => (
              <div
                key={apt.id}
                onClick={() => {
                  setSelectedAppointment(apt);
                  onSelectAppointment?.(apt);
                }}
                className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedAppointment?.id === apt.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full ${getStatusColor(apt.status)} text-white text-xs flex items-center justify-center font-bold`}>
                  {index + 1}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{apt.prospect.companyName}</p>
                  <p className="text-gray-500">{formatTime(apt.scheduledAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointment list */}
        {showList && (
          <div className="w-1/3 border-l overflow-y-auto">
            {/* Route summary */}
            {routeInfo && showRoute && (
              <div className="p-4 bg-blue-50 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Route className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Itinéraire du jour</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-500">Distance totale</p>
                    <p className="font-bold text-gray-900">{routeInfo.totalDistance} km</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-500">Temps de trajet</p>
                    <p className="font-bold text-gray-900">~{routeInfo.totalTime} min</p>
                  </div>
                </div>
                <button
                  onClick={openRouteInMaps}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Naviguer
                </button>
              </div>
            )}

            {/* Appointments */}
            <div className="divide-y">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucun rendez-vous</p>
                </div>
              ) : (
                filteredAppointments.map((apt, index) => (
                  <div
                    key={apt.id}
                    onClick={() => {
                      setSelectedAppointment(apt);
                      onSelectAppointment?.(apt);
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedAppointment?.id === apt.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full ${getStatusColor(apt.status)} text-white text-sm flex items-center justify-center font-bold flex-shrink-0`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 truncate">
                            {apt.prospect.companyName}
                          </h4>
                          <span className="text-sm font-medium text-blue-600">
                            {formatTime(apt.scheduledAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {apt.prospect.address}, {apt.prospect.city}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {apt.prospect.decisionMakerName}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {apt.duration} min
                          </span>
                        </div>

                        {/* Distance to next */}
                        {routeInfo && index < filteredAppointments.length - 1 && routeInfo.segments[index] && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" />
                              {routeInfo.segments[index].distance} km • ~{routeInfo.segments[index].time} min vers le suivant
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openInMaps(apt);
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            Voir
                          </button>
                          <a
                            href={`tel:${apt.prospect.decisionMakerMobile}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            Appeler
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentMap;
