import { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Wrench, Battery, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusType } from '../../types';

interface UnitMarkerProps {
  unit: {
    id: string;
    serialNo: string;
    location: string;
    fillLevel: number;
    batteryLevel: number;
    status: StatusType;
    lastSeen: string;
    coordinates: [number, number];
  };
  hasRole: (roles: string[]) => boolean;
}

const statusIcons = {
  active: <div className="w-2 h-2 rounded-full bg-green-500" />,
  maintenance: <div className="w-2 h-2 rounded-full bg-yellow-500" />,
  offline: <div className="w-2 h-2 rounded-full bg-red-500" />,
};

const UnitMarker = memo(({ unit, hasRole }: UnitMarkerProps) => {
  const icon = L.divIcon({
    html: `
      <div class="relative">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${
          unit.status === 'active' ? '#10B981' : unit.status === 'maintenance' ? '#F59E0B' : '#EF4444'}" 
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: 'bg-transparent border-none',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });

  return (
    <Marker
      position={[unit.coordinates[0], unit.coordinates[1]]}
      icon={icon}
    >
      <Popup className="custom-popup">
        <div className="custom-popup-content p-4 w-64">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">{unit.serialNo}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              unit.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : unit.status === 'maintenance' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-red-100 text-red-800'
            }`}>
              {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{unit.location}</p>
          
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fill Level</span>
                <span className="font-medium">{Math.round(unit.fillLevel)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className={`h-full rounded-full ${
                    unit.fillLevel > 80 ? 'bg-red-500' : 
                    unit.fillLevel > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${unit.fillLevel}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Battery</span>
                <div className="flex items-center">
                  <Battery className="w-4 h-4 mr-1" />
                  <span className="font-medium">{Math.round(unit.batteryLevel)}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className={`h-full rounded-full ${
                    unit.batteryLevel < 20 ? 'bg-red-500' : 
                    unit.batteryLevel < 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${unit.batteryLevel}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Last updated: {unit.lastSeen}
            </p>
            
            <div className="mt-2 flex space-x-2">
              <Link 
                to={`/units/${unit.id}`}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                View Details
              </Link>
              {hasRole(['admin', 'manager']) && (
                <Link 
                  to={`/units/${unit.id}/edit`}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

UnitMarker.displayName = 'UnitMarker';

export default UnitMarker;
