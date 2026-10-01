import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity } from '@/lib/types';
import { getDistanceService } from '@/lib/services/distance';
import { resolveActivityCoords } from '@/lib/itinerary/coordinateUtils';

// Fix Leaflet's default icon path issues in React
const defaultIconPrototype = L.Icon.Default.prototype as typeof L.Icon.Default.prototype & {
  _getIconUrl?: () => string;
};
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const activityIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hotelIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  activities: Activity[];
  originCoords?: { lat: number; lon: number } | null;
  showLines?: boolean;
  destination: string;
  destinationCoords?: { lat: number; lon: number } | null;
  activeActivityId?: string | null;
  onActivitySelect?: (id: string) => void;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({ activities, originCoords, showLines = false, destination, destinationCoords, activeActivityId, onActivitySelect }: MapComponentProps) {
  const distanceService = getDistanceService();

  useEffect(() => {
    // Inject Leaflet CSS via CDN to avoid Turbopack PostCSS worker crash.
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  const resolvedActivities = activities.map(act => {
    if (act.lat !== undefined && act.lon !== undefined && !isNaN(act.lat) && !isNaN(act.lon) && (act.lat !== 0 || act.lon !== 0)) {
      return act;
    }
    const resolved = resolveActivityCoords(act.name, act.lat, act.lon, destination, destinationCoords);
    if (resolved) {
      return { ...act, lat: resolved.lat, lon: resolved.lon };
    }
    return act;
  });

  // Filter out activities with invalid coordinates
  const validActivities = resolvedActivities.filter(
    (a) => a.lat !== undefined && a.lon !== undefined && !isNaN(a.lat) && !isNaN(a.lon) && (a.lat !== 0 || a.lon !== 0)
  );

  const hasOrigin = originCoords && !isNaN(originCoords.lat) && !isNaN(originCoords.lon) && (originCoords.lat !== 0 || originCoords.lon !== 0);

  // Determine bounds or center
  let center: [number, number] = [0, 0];
  let zoom = 2;

  if (hasOrigin) {
    center = [originCoords.lat, originCoords.lon];
    zoom = 13;
  } else if (validActivities.length > 0) {
    center = [validActivities[0].lat!, validActivities[0].lon!];
    zoom = 13;
  }

  // If no valid points at all, show a default world view (or return a fallback)
  if (!hasOrigin && validActivities.length === 0) {
    return (
      <div className="w-full h-full min-h-75 flex items-center justify-center bg-cream-100  rounded-cardLg text-ink-500">
        Map view is unavailable for this arbitrary destination as its coordinates could not be found.
      </div>
    );
  }

  // Preserve itinerary order and anchor hotel at the start/end when available.
  const linePositions: [number, number][] = [];
  if (hasOrigin) {
    linePositions.push([originCoords.lat, originCoords.lon]);
  }

  for (const act of validActivities) {
    const nextPoint: [number, number] = [act.lat!, act.lon!];
    const previousPoint = linePositions[linePositions.length - 1];

    if (previousPoint && distanceService.calculateDistance(previousPoint[0], previousPoint[1], nextPoint[0], nextPoint[1])) {
      linePositions.push(nextPoint);
      continue;
    }

    if (!previousPoint) {
      linePositions.push(nextPoint);
    }
  }

  if (hasOrigin && validActivities.length > 0) {
    linePositions.push([originCoords.lat, originCoords.lon]);
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%', minHeight: '300px', borderRadius: '16px', zIndex: 10 }}
    >
      <MapUpdater center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {hasOrigin && (
        <Marker position={[originCoords.lat, originCoords.lon]} icon={hotelIcon}>
          <Popup className="voyage-popup">
            <div className="flex flex-col gap-1 p-1 min-w-35">
              <span className="font-display font-bold text-ink-900 text-sm">Base / Hotel</span>
              <span className="text-xs text-ink-500">Your starting point</span>
            </div>
          </Popup>
        </Marker>
      )}

      {validActivities.map((act) => {
        const distance = hasOrigin ? distanceService.calculateDistance(originCoords.lat, originCoords.lon, act.lat!, act.lon!) : null;
        const isActive = activeActivityId === act.id;
        const icon = isActive
          ? new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [30, 49],
              iconAnchor: [15, 49],
              popupAnchor: [1, -40],
              shadowSize: [41, 41]
            })
          : activityIcon;
        return (
          <Marker 
            key={act.id} 
            position={[act.lat!, act.lon!]}
            icon={icon}
            eventHandlers={{
              click: () => onActivitySelect?.(act.id),
            }}
          >
            <Popup className="voyage-popup">
              <div className="flex flex-col gap-1 p-1 min-w-37.5">
                <strong className="font-display text-ink-900 text-sm leading-tight">{act.name}</strong>
                {act.startTime && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-ink-500 font-medium">
                    <span>🕒</span> {act.startTime}
                  </div>
                )}
                {distance !== null && distance.distanceKm > 0 && (
                  <div className="flex items-center gap-1 text-xs text-ink-500 mt-0.5">
                    <span>📍</span> {distance.distanceKm < 1 ? '< 1' : distance.distanceKm.toFixed(1)} km from base
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showLines && linePositions.length > 1 && (
        <Polyline 
          positions={linePositions} 
          color="#0f766e" 
          weight={3} 
          dashArray="5, 5" 
          opacity={0.8}
        />
      )}
    </MapContainer>
  );
}
