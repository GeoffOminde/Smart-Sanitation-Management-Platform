import { FC } from 'react';
import { Navigation, Globe, RefreshCw } from 'lucide-react';
import { Unit } from '../../types';

interface MapControlsProps {
  units: Unit[];
  onFitToMarkers: () => void;
  onResetView: () => void;
  onRefresh: () => void;
}

export const MapControls: FC<MapControlsProps> = ({
  units,
  onFitToMarkers,
  onResetView,
  onRefresh,
}) => {
  const activeCount = units.filter(u => u.status === 'active').length;
  const maintenanceCount = units.filter(u => u.status === 'maintenance').length;
  const offlineCount = units.filter(u => u.status === 'offline').length;

  return (
    <>
      {/* Status Bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-md shadow-md flex items-center space-x-4 z-[1000]">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span className="text-xs text-gray-600">Active: {activeCount}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
          <span className="text-xs text-gray-600">Maintenance: {maintenanceCount}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span className="text-xs text-gray-600">Offline: {offlineCount}</span>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 space-y-2 z-[1000]">
        <button
          onClick={onRefresh}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Refresh data"
        >
          <RefreshCw className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={onFitToMarkers}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Fit to markers"
        >
          <Navigation className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={onResetView}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Reset view"
        >
          <Globe className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </>
  );
};
