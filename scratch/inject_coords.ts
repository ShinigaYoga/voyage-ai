import * as fs from 'fs';

// Destination center coordinates
const destCenters: Record<string, { lat: number; lon: number }> = {
  beach: { lat: 15.2993, lon: 74.1240 }, // Goa
  backwater: { lat: 10.8505, lon: 76.2711 }, // Kerala
  mountain: { lat: 32.2396, lon: 77.1887 }, // Manali
  heritage: { lat: 26.9124, lon: 75.7873 }, // Jaipur
  city: { lat: 19.0760, lon: 72.8777 } // Mumbai
};

const hotelsFile = 'C:\\Users\\shini\\Downloads\\stitch_voyageai_foundation_design_system\\stitch_voyageai_foundation_design_system\\voyageai\\src\\lib\\services\\hotels\\providers\\LocalHotelProvider.ts';
const activitiesFile = 'C:\\Users\\shini\\Downloads\\stitch_voyageai_foundation_design_system\\stitch_voyageai_foundation_design_system\\voyageai\\src\\lib\\itinerary\\activityBank.ts';

function hashToOffset(str: string): { dLat: number, dLon: number } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const rng = () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
  
  // Offset in range roughly -0.05 to +0.05 degrees (~5km)
  const dLat = (rng() - 0.5) * 0.1;
  const dLon = (rng() - 0.5) * 0.1;
  return { dLat, dLon };
}

// 1. Process Hotels
let hotelsText = fs.readFileSync(hotelsFile, 'utf8');

const destNames = ['Goa', 'Kerala', 'Manali', 'Jaipur'];
destNames.forEach(dest => {
  let centerLat = 0, centerLon = 0;
  if (dest === 'Goa') { centerLat = 15.2993; centerLon = 74.1240; }
  if (dest === 'Kerala') { centerLat = 10.8505; centerLon = 76.2711; }
  if (dest === 'Manali') { centerLat = 32.2396; centerLon = 77.1887; }
  if (dest === 'Jaipur') { centerLat = 26.9124; centerLon = 75.7873; }

  const regex = new RegExp(`(${dest}:\\s*\\[)([\\s\\S]*?)(\\]\\,)`, 'g');
  hotelsText = hotelsText.replace(regex, (match, prefix, content, suffix) => {
    const lines = content.split('\\n');
    const newContent = lines.map((line: string) => {
      if (line.includes('{') && line.includes('id:')) {
        const idMatch = line.match(/id:\s*"([^"]+)"/);
        if (idMatch && !line.includes('lat:')) {
          const { dLat, dLon } = hashToOffset(idMatch[1]);
          const lat = Number((centerLat + dLat).toFixed(5));
          const lon = Number((centerLon + dLon).toFixed(5));
          return line.replace(/\\}\\s*,?$/, `, lat: ${lat}, lon: ${lon} },`);
        }
      }
      return line;
    }).join('\\n');
    return prefix + newContent + suffix;
  });
});

fs.writeFileSync(hotelsFile, hotelsText);
console.log('Hotels updated.');

// 2. Process Activities
let activitiesText = fs.readFileSync(activitiesFile, 'utf8');

const categoryMap = {
  beach: { lat: 15.2993, lon: 74.1240 },
  backwater: { lat: 10.8505, lon: 76.2711 },
  mountain: { lat: 32.2396, lon: 77.1887 },
  heritage: { lat: 26.9124, lon: 75.7873 },
  city: { lat: 19.0760, lon: 72.8777 }
};

Object.entries(categoryMap).forEach(([cat, center]) => {
  const regex = new RegExp(`(${cat}:\\s*\\{[\\s\\S]*?\\})`, 'g');
  
  activitiesText = activitiesText.replace(regex, (match) => {
    return match.split('\\n').map((line: string) => {
      if (line.includes('{') && line.includes('id:')) {
        const idMatch = line.match(/id:\s*'([^']+)'/);
        if (idMatch && !line.includes('lat:')) {
          const { dLat, dLon } = hashToOffset(idMatch[1]);
          const lat = Number((center.lat + dLat).toFixed(5));
          const lon = Number((center.lon + dLon).toFixed(5));
          return line.replace(/\\}\\s*,?$/, `, lat: ${lat}, lon: ${lon} },`);
        }
      }
      return line;
    }).join('\\n');
  });
});

fs.writeFileSync(activitiesFile, activitiesText);
console.log('Activities updated.');
