
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Truck, MapPin, Navigation } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix for default Leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const truckIcon = new L.Icon.Default();
const unitIcon = new L.Icon.Default();

// Nairobi Coordinates
const CENTER = [-1.2921, 36.8219] as [number, number];

const MOCK_UNITS = [
    { id: 1, lat: -1.2921, lng: 36.8219, name: 'Unit CBD-01', status: 'Full', fill: 95 },
    { id: 2, lat: -1.2641, lng: 36.8078, name: 'Unit Westlands-03', status: 'Active', fill: 45 },
    { id: 3, lat: -1.3000, lng: 36.7800, name: 'Unit Kilimani-07', status: 'maintenance', fill: 20 },
];

const MOCK_TRUCKS = [
    { id: 'T1', lat: -1.29, lng: 36.81, name: 'Truck A (John)', speed: 45, heading: 'North' },
    { id: 'T2', lat: -1.27, lng: 36.80, name: 'Truck B (Sarah)', speed: 30, heading: 'West' },
];

// Component to handle map resizing
const ResizeMap = () => {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
    }, [map]);
    return null;
};

interface LiveFleetMapProps {
    units: any[];
    trucks: any[];
}

const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ units = [], trucks = [] }) => {
    // We can simulate subtle movement on client side if needed, or just render positions

    // Fix leafet icon issue
    useEffect(() => {
        // Leaflet icon fix is handled by createIcon
    }, []);

    const validTrucks = trucks.filter(t => t.lastLat && t.lastLng);

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden relative z-0">
            <MapContainer
                center={CENTER}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ResizeMap />

                {/* Units */}
                {units.map(unit => {
                    // Parse coordinates if needed, dashboard passes [lat, lng] array
                    const pos = (Array.isArray(unit.coordinates) && unit.coordinates.length === 2)
                        ? unit.coordinates
                        : [-1.2921, 36.8219];

                    return (
                        <Marker key={unit.id} position={[pos[0], pos[1]]} icon={unitIcon}>
                            <Popup>
                                <div className="p-1">
                                    <h3 className="font-bold text-sm">{unit.serialNo || unit.name}</h3>
                                    <p className="text-xs text-gray-600">Fill Level: {unit.fillLevel}%</p>
                                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${(unit.fillLevel || 0) > 90 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {(unit.fillLevel || 0) > 90 ? 'Critical' : 'Normal'}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}

                {/* Trucks (Team Members) */}
                {validTrucks.map(truck => (
                    <Marker key={truck.id} position={[truck.lastLat, truck.lastLng]} icon={truckIcon}>
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm text-blue-700">{truck.name}</h3>
                                <p className="text-xs text-gray-600">Role: {truck.role}</p>
                                <p className="text-xs text-gray-500">Status: {truck.status}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay Legend */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg z-[1000] text-xs">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    </div>
                    <span>Technicians</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    </div>
                    <span>Units</span>
                </div>
            </div>
        </div>
    );
};

export default LiveFleetMap;
