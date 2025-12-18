import { memo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Battery, X, Save } from 'lucide-react';
import { StatusType } from '../../types';
import { apiFetch } from '../../lib/api';

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

const UnitMarker = memo(({ unit, hasRole }: UnitMarkerProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStatus, setEditStatus] = useState(unit.status);
  const [editFillLevel, setEditFillLevel] = useState(unit.fillLevel);
  const [editBatteryLevel, setEditBatteryLevel] = useState(unit.batteryLevel);
  const [editLocation, setEditLocation] = useState(unit.location);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const resp = await apiFetch(`/api/units/${unit.id}`, {
        method: 'PUT',
        data: {
          status: editStatus,
          fillLevel: Math.max(0, Math.min(100, editFillLevel)),
          batteryLevel: Math.max(0, Math.min(100, editBatteryLevel)),
          location: editLocation.trim() || unit.location,
        },
      });

      if (resp.ok) {
        alert('✅ Unit updated successfully!\n\nPlease refresh the page to see changes.');
        setShowEditModal(false);
      } else {
        alert('❌ Failed to update unit. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update unit:', err);
      alert('❌ Error updating unit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const icon = L.divIcon({
    html: `
      <div class="relative">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${unit.status === 'active' ? '#10B981' : unit.status === 'maintenance' ? '#F59E0B' : '#EF4444'}" 
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
    <>
      <Marker
        position={[unit.coordinates[0], unit.coordinates[1]]}
        icon={icon}
      >
        <Popup className="custom-popup">
          <div className="custom-popup-content p-4 w-64">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{unit.serialNo}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${unit.status === 'active'
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
                    className={`h-full rounded-full ${unit.fillLevel > 80 ? 'bg-red-500' :
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
                    className={`h-full rounded-full ${unit.batteryLevel < 20 ? 'bg-red-500' :
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
                <button
                  onClick={() => {
                    const details = `
Unit Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Serial No: ${unit.serialNo}
Location: ${unit.location}
Status: ${unit.status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fill Level: ${unit.fillLevel}%
Battery Level: ${unit.batteryLevel}%
Last Seen: ${unit.lastSeen}
Coordinates: ${unit.coordinates[0].toFixed(6)}, ${unit.coordinates[1].toFixed(6)}
                    `;
                    alert(details.trim());
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  View Details
                </button>
                {hasRole(['admin', 'manager']) && (
                  <button
                    onClick={() => {
                      setEditStatus(unit.status);
                      setEditFillLevel(unit.fillLevel);
                      setEditBatteryLevel(unit.batteryLevel);
                      setEditLocation(unit.location);
                      setShowEditModal(true);
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Unit: {unit.serialNo}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as StatusType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Fill Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fill Level: {editFillLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editFillLevel}
                  onChange={(e) => setEditFillLevel(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Battery Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Level: {editBatteryLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editBatteryLevel}
                  onChange={(e) => setEditBatteryLevel(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter location"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

UnitMarker.displayName = 'UnitMarker';

export default UnitMarker;
