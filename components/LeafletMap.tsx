'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet + Next.js
const FIX_LEAFLET_ICON = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    label: string;
    description?: string;
  }>;
}

// Component to handle map center updates
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function LeafletMap({ center, zoom = 15, markers = [] }: LeafletMapProps) {
  useEffect(() => {
    FIX_LEAFLET_ICON();
  }, []);

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={center} zoom={zoom} />
      {markers.map((marker, idx) => (
        <Marker key={idx} position={marker.position}>
          <Popup>
            <div className="p-1">
              <p className="font-bold text-sm">{marker.label}</p>
              {marker.description && <p className="text-xs text-muted-foreground">{marker.description}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
