export interface VehicleSettings {
  name: string;
  code: string; // variable-length cheat/selection code
  args: [number, number, number]; // [width, height, length]
  mass: number;
  color: string;
  speedMultiplier: number;
  type: 'bus' | 'heavy' | 'car' | 'bike' | 'aerial' | 'companion' | 'jetpack' | 'animal';
  description: string;
  handling: {
    steerSensitivity: number;
    driftFactor: number;
    suspensionBounciness: number;
    maxSpeed: number;
  };
}

export const VEHICLE_DATABASE: Record<string, VehicleSettings> = {
  // --- PLAYER INDIAN BUSES (BUSSIN SPECIALS) ---
  '8000': {
    name: 'Ashok Leyland Lal Dabba (City Commuter)',
    code: '8000',
    args: [2.5, 3.2, 9.8], // detailed bus dimensions
    mass: 12.0,
    color: '#dc2626', // Classic Red Indian City Bus
    speedMultiplier: 1.0,
    type: 'bus',
    description: 'The legendary "Lal Dabba" city commuter bus. Highly maneuverable, nostalgic heavy steel grill, and raw engine roar.',
    handling: { steerSensitivity: 1.1, driftFactor: 0.1, suspensionBounciness: 0.35, maxSpeed: 18 }
  },
  '8100': {
    name: 'Tata Starbus Deluxe (Highway Prince)',
    code: '8100',
    args: [2.5, 3.3, 11.0],
    mass: 14.0,
    color: '#1d4ed8', // Royal Blue long distance coach
    speedMultiplier: 1.25,
    type: 'bus',
    description: 'A classic long-distance royal blue passenger coach with silver-stripe decals, comfortable air-brakes, and a robust leaf-spring suspension.',
    handling: { steerSensitivity: 0.95, driftFactor: 0.08, suspensionBounciness: 0.45, maxSpeed: 24 }
  },
  '8200': {
    name: 'Eicher Scania Multi-Axle (Sleeper Express)',
    code: '8200',
    args: [2.6, 3.6, 13.8], // Colossal triple axle bus
    mass: 18.0,
    color: '#0f172a', // Premium Midnight Gray/Black
    speedMultiplier: 1.5,
    type: 'bus',
    description: 'Sleek luxury triple-axle night sleeper cabin bus. Equipped with electronic stability controls, cozy berths, and a high-speed turbocharged engine.',
    handling: { steerSensitivity: 0.8, driftFactor: 0.05, suspensionBounciness: 0.55, maxSpeed: 29 }
  },
  '8300': {
    name: 'Royal Ashok "Sher-e-Punjab" (Folk Art Deluxe)',
    code: '8300',
    args: [2.55, 3.5, 11.5],
    mass: 15.0,
    color: '#eab308', // Festive Yellow-Orange hybrid
    speedMultiplier: 1.35,
    type: 'bus',
    description: 'A custom, bright festive folk-art tourist cruiser from Punjab. Adorned with mirror decals, dangling black tassels, dual musical horns, and roof-carrier luggage racks.',
    handling: { steerSensitivity: 1.0, driftFactor: 0.15, suspensionBounciness: 0.5, maxSpeed: 25 }
  },
  '8400': {
    name: 'BUSSIN Custom Chassis (Your Virtual Mod)',
    code: '8400',
    args: [2.5, 3.2, 10.5],
    mass: 13.5,
    color: '#10b981', // Custom Emerald Green
    speedMultiplier: 1.2,
    type: 'bus',
    description: 'A fully editable modular vehicle template. Slide standard body length, engine horsepower, and brakes to craft your ultimate 10-wheeler custom coach!',
    handling: { steerSensitivity: 1.0, driftFactor: 0.1, suspensionBounciness: 0.4, maxSpeed: 22 }
  },

  // --- TRAFFIC HEROES / INDIAN STREET LEGENDS (For AI Traffic System simulation) ---
  '2100': {
    name: 'Tata Heavy Cargo Truck (Horn OK Please)',
    code: '2100',
    args: [2.4, 3.0, 7.5],
    mass: 11.5,
    color: '#f97316',
    speedMultiplier: 0.8,
    type: 'heavy',
    description: 'Classic heavy multi-ton cargo carrier of Indian highways with customized colorful stickers.',
    handling: { steerSensitivity: 0.6, driftFactor: 0.05, suspensionBounciness: 0.3, maxSpeed: 14 }
  },
  '1100': {
    name: 'Mahindra Thar 4x4 Off-roader',
    code: '1100',
    args: [1.8, 1.9, 3.8],
    mass: 3.2,
    color: '#b91c1c',
    speedMultiplier: 1.45,
    type: 'car',
    description: 'A rugged four-wheel-drive Indian vehicle with majestic road status.',
    handling: { steerSensitivity: 1.3, driftFactor: 0.5, suspensionBounciness: 0.75, maxSpeed: 23 }
  },
  '2300': {
    name: 'Bajaj RE Auto Rickshaw (TukTuk)',
    code: '2300',
    args: [1.35, 1.7, 2.5],
    mass: 1.4,
    color: '#ca8a04',
    speedMultiplier: 0.95,
    type: 'heavy',
    description: 'The heart and soul of local transits: chaotic yellow and green 3-wheeled TukTuk taxi.',
    handling: { steerSensitivity: 2.0, driftFactor: 0.8, suspensionBounciness: 0.5, maxSpeed: 16 }
  },
  '1300': {
    name: 'Maruti Suzuki Swift Hatchback',
    code: '1300',
    args: [1.75, 1.45, 3.85],
    mass: 2.1,
    color: '#1d4ed8',
    speedMultiplier: 1.5,
    type: 'car',
    description: 'The ultimate lightning fast commuter hatchback slicing through bumper-to-bumper city blocks.',
    handling: { steerSensitivity: 1.6, driftFactor: 0.7, suspensionBounciness: 0.4, maxSpeed: 25 }
  },

  // --- NEW INDIAN TRACTORS (Farming & Tochan Kings) ---
  '4100': {
    name: 'Mahindra Arjun Novo 605 (Tractor)',
    code: '4100',
    args: [1.9, 2.1, 3.6],
    mass: 3.5,
    color: '#dc2626',
    speedMultiplier: 1.1,
    type: 'heavy',
    description: 'The heavy agricultural workhorse of rural India. Generously high torque, giant rear mud tires, and front nose weights.',
    handling: { steerSensitivity: 1.5, driftFactor: 0.4, suspensionBounciness: 0.6, maxSpeed: 15 }
  },
  '4200': {
    name: 'Swaraj 855 FE (Farming Star)',
    code: '4200',
    args: [1.85, 2.0, 3.5],
    mass: 3.4,
    color: '#1d4ed8',
    speedMultiplier: 1.2,
    type: 'heavy',
    description: 'The legendary blue farming beast. Popular in rural Punjab and Haryana for massive drag pulls and dynamic mud off-roading.',
    handling: { steerSensitivity: 1.4, driftFactor: 0.45, suspensionBounciness: 0.55, maxSpeed: 16 }
  },
  '4300': {
    name: 'John Deere 5310 Tochan Special',
    code: '4300',
    args: [2.0, 2.2, 3.7],
    mass: 3.8,
    color: '#16a34a',
    speedMultiplier: 1.3,
    type: 'heavy',
    description: 'Tochan (tug of war) specialized heavy tractor in classic green and yellow. Balanced rear weights and customized wide sports treads.',
    handling: { steerSensitivity: 1.6, driftFactor: 0.35, suspensionBounciness: 0.5, maxSpeed: 18 }
  },

  // --- NEW INDIAN BIKES ---
  '3100': {
    name: 'Royal Enfield Classic 350 (Bullet)',
    code: '3100',
    args: [0.8, 1.2, 2.1],
    mass: 0.6,
    color: '#3f3f46',
    speedMultiplier: 1.6,
    type: 'bike',
    description: 'The heavyweight cruising icon. Emits the classic, rich "dug-dug" thumping exhaust note with high highway status.',
    handling: { steerSensitivity: 1.8, driftFactor: 0.6, suspensionBounciness: 0.3, maxSpeed: 28 }
  },
  '3200': {
    name: 'Hero Splendor + (Mileage King)',
    code: '3200',
    args: [0.75, 1.1, 2.0],
    mass: 0.4,
    color: '#111827',
    speedMultiplier: 1.4,
    type: 'bike',
    description: 'The fuel-efficient daily companion of billions. Unparalleled reliability, ultra-lightweight frame, and incredibly nimble.',
    handling: { steerSensitivity: 2.2, driftFactor: 0.7, suspensionBounciness: 0.4, maxSpeed: 22 }
  },
  '3300': {
    name: 'KTM RC 390 (Orange Missile)',
    code: '3300',
    args: [0.8, 1.15, 2.0],
    mass: 0.5,
    color: '#f97316',
    speedMultiplier: 2.1,
    type: 'bike',
    description: 'A pocket rocket with aggressive fairings and track handling. Perfect for high-speed lane slicing.',
    handling: { steerSensitivity: 2.0, driftFactor: 0.5, suspensionBounciness: 0.45, maxSpeed: 38 }
  },

  // --- NEW INDIAN CARS ---
  '1400': {
    name: 'Mahindra Scorpio-N (Big Daddy)',
    code: '1400',
    args: [1.9, 1.9, 4.7],
    mass: 2.8,
    color: '#111827',
    speedMultiplier: 1.65,
    type: 'car',
    description: 'The majestic SUV of choice. Dominating road presence, leather-clad steering, and a high-revving turbo diesel engine.',
    handling: { steerSensitivity: 1.3, driftFactor: 0.4, suspensionBounciness: 0.65, maxSpeed: 26 }
  },
  '1500': {
    name: 'Maruti Suzuki Alto 800 (The Legend)',
    code: '1500',
    args: [1.5, 1.4, 3.4],
    mass: 1.2,
    color: '#e2e8f0',
    speedMultiplier: 1.5,
    type: 'car',
    description: 'The tiny mountaineering legend. Can go places where 4x4s think twice. Unstoppable, light, and charming.',
    handling: { steerSensitivity: 2.0, driftFactor: 0.65, suspensionBounciness: 0.5, maxSpeed: 21 }
  },

  // --- AIRPLANES & HELICOPTERS (Aerial Fleet) ---
  '5100': {
    name: 'HAL Dhruv Multirole Helicopter',
    code: '5100',
    args: [2.5, 3.0, 9.0],
    mass: 4.5,
    color: '#047857',
    speedMultiplier: 2.5,
    type: 'aerial',
    description: 'Advanced medium helicopter developed in India. Capable of vertical take-offs, custom hover animations, and agile aerial maneuvers.',
    handling: { steerSensitivity: 1.7, driftFactor: 0.1, suspensionBounciness: 0.2, maxSpeed: 45 }
  },
  '5200': {
    name: 'Air India Express Boeing 737 Compact',
    code: '5200',
    args: [4.5, 4.0, 14.5],
    mass: 9.5,
    color: '#dc2626',
    speedMultiplier: 3.5,
    type: 'aerial',
    description: 'Commercial narrow-body jet airliner adapted for local operations. Needs take-off runs on airport runways to gain lift!',
    handling: { steerSensitivity: 0.8, driftFactor: 0.05, suspensionBounciness: 0.15, maxSpeed: 70 }
  }
};
