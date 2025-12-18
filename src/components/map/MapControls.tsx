import { FC } from 'react';
import { Navigation, Globe, RefreshCw } from 'lucide-react';

interface MapControlsProps {
  onFitToMarkers: () => void;
  onResetView: () => void;
  onRefresh: () => void;
}

export const MapControls: FC<MapControlsProps> = ({
  onFitToMarkers,
  onResetView,
  onRefresh,
}) => {
  return (
    <>
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
