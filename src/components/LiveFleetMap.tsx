import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import UnitMarker from './map/UnitMarker';
import { MapControls } from './map/MapControls';

// Nairobi Coordinates
const CENTER = [-1.2921, 36.8219] as [number, number];

// Component to handle map resizing and fitting bounds - Only on initial load
const FitBounds = ({ markers }: { markers: [number, number][] }) => {
    const map = useMap();
    const [hasInitialized, setHasInitialized] = React.useState(false);

    useEffect(() => {
        map.invalidateSize();

        // Only fit bounds on initial load, not on every update
        if (!hasInitialized && markers.length > 0) {
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [50, 50] });
            setHasInitialized(true);
        }
    }, [map, markers, hasInitialized]);

    return null;
};

// Component to update markers without resetting map view
const MarkerUpdater = ({ units, trucks }: { units: any[], trucks: any[] }) => {
    const map = useMap();

    useEffect(() => {
        // Just invalidate size to ensure proper rendering
        // Don't change zoom or center - let user control that
        map.invalidateSize();
    }, [units, trucks, map]);

    return null;
};

interface LiveFleetMapProps {
    units: any[];
    trucks: any[];
    onRefresh?: () => void;
}

const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ units = [], trucks = [], onRefresh = () => { } }) => {
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    // Collect all points for bounds fitting
    const allPoints: [number, number][] = [];

    // Process Units
    const processedUnits = units.map(unit => {
        let pos = [-1.2921, 36.8219] as [number, number];
        if (Array.isArray(unit.coordinates) && unit.coordinates.length === 2) {
            pos = unit.coordinates as [number, number];
        } else if (unit.lastLat && unit.lastLng) {
            pos = [unit.lastLat, unit.lastLng] as [number, number];
        }
        allPoints.push(pos);
        return {
            ...unit,
            coordinates: pos
        };
    });

    // Process Trucks - Only show technicians and drivers
    const validTrucks = trucks
        .filter(t => t.lastLat && t.lastLng)
        .filter(t => {
            const role = t.role?.toLowerCase() || '';
            return role.includes('technician') || role.includes('driver') || role.includes('field');
        })
        .map(t => {
            const pos = [t.lastLat, t.lastLng] as [number, number];
            allPoints.push(pos);
            return { ...t, pos };
        });

    const handleFitBounds = () => {
        if (mapInstance && allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            mapInstance.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    const handleResetView = () => {
        if (mapInstance) {
            mapInstance.setView(CENTER, 13);
        }
    };

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden relative z-0">
            <MapContainer
                center={CENTER}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                ref={setMapInstance}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds markers={allPoints} />
                <MarkerUpdater units={processedUnits} trucks={validTrucks} />

                {/* Units - Advanced Markers */}
                {processedUnits.map(unit => (
                    <UnitMarker
                        key={unit.id}
                        unit={unit}
                        hasRole={() => true} // Assuming all dashboard users can view
                    />
                ))}

                {/* Trucks - Blue Circles */}
                {validTrucks.map(truck => (
                    <CircleMarker
                        key={truck.id}
                        center={truck.pos}
                        pathOptions={{
                            color: 'blue',
                            fillColor: 'cyan',
                            fillOpacity: 0.7
                        }}
                        radius={8}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm text-blue-700">{truck.name}</h3>
                                <p className="text-xs text-gray-700 mb-0.5 font-mono">{truck.id?.slice(0, 4).toUpperCase()}</p>
                                <p className="text-xs text-gray-600">{truck.role}</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            <MapControls
                onFitToMarkers={handleFitBounds}
                onResetView={handleResetView}
                onRefresh={onRefresh}
            />
        </div>
    );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(LiveFleetMap);

