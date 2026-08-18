// Curated FiveM Resource Catalog
// This is a local catalog — in production, this could be fetched from an API

export interface FiveMResource {
  id: string
  name: string
  description: string
  category: ResourceCategory
  framework: ('qbcore' | 'esx' | 'all' | 'standalone')[]
  downloadUrl: string
  stars: number
  tags: string[]
}

export type ResourceCategory = 
  | 'hud'
  | 'vehicles'
  | 'scripts'
  | 'maps'
  | 'weapons'
  | 'clothing'
  | 'jobs'
  | 'inventory'
  | 'phone'
  | 'drugs'
  | 'economy'
  | 'communication'
  | 'vehicleshop'
  | 'housing'
  | 'gangs'
  | 'police'
  | 'medical'
  | 'mechanic'
  | 'fishing'
  | 'hunting'
  | 'minigames'
  | 'roleplay'
  | 'utility'
  | 'performance'

export const RESOURCE_CATALOG: FiveMResource[] = [
  // HUD
  {
    id: 'qb-hud',
    name: 'QBCore HUD',
    description: 'Modern, customizable HUD for QBCore servers. Includes health, armor, stress, hunger, thirst indicators.',
    category: 'hud',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-hud',
    stars: 342,
    tags: ['hud', 'ui', 'qbcore'],
  },
  {
    id: 'jn-phone',
    name: 'JN Phone',
    description: 'Advanced smartphone resource with apps, messaging, banking, and social media features.',
    category: 'phone',
    framework: ['qbcore', 'esx'],
    downloadUrl: 'https://github.com/JayNorquist/jn-phone',
    stars: 189,
    tags: ['phone', 'ui', 'apps'],
  },
  {
    id: 'sb-phone',
    name: 'SB Phone',
    description: 'Sleek smartphone with contacts, messages, social media, and app ecosystem.',
    category: 'phone',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/SaltPvP/sb-phone',
    stars: 156,
    tags: ['phone', 'ui', 'modern'],
  },
  
  // Vehicles
  {
    id: 'qb-vehicleshops',
    name: 'QBCore Vehicle Shops',
    description: 'Complete vehicle dealership system with showrooms, financing, and inventory management.',
    category: 'vehicleshop',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-vehicleshop',
    stars: 278,
    tags: ['vehicles', 'shop', 'economy'],
  },
  {
    id: 'blip-vehicles',
    name: 'Blip Vehicles',
    description: 'Collection of high-quality custom vehicles with handling overrides.',
    category: 'vehicles',
    framework: ['all'],
    downloadUrl: 'https://github.com/Blip/vehicles',
    stars: 423,
    tags: ['vehicles', 'custom', 'performance'],
  },
  {
    id: 'ox_target',
    name: 'OX Target',
    description: 'Modern target/interaction system. Replace legacy interact-spr or proximity-menu.',
    category: 'utility',
    framework: ['qbcore', 'esx', 'all'],
    downloadUrl: 'https://github.com/overextended/ox_target',
    stars: 567,
    tags: ['target', 'interaction', 'utility'],
  },
  
  // Inventory
  {
    id: 'qb-inventory',
    name: 'QBCore Inventory',
    description: 'Full inventory system with drag-drop, hotbar, and item interactions.',
    category: 'inventory',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-inventory',
    stars: 445,
    tags: ['inventory', 'items', 'ui'],
  },
  {
    id: 'ox_lib',
    name: 'OX Lib',
    description: 'Essential library resource. Provides shared functions used by many other resources.',
    category: 'utility',
    framework: ['all'],
    downloadUrl: 'https://github.com/overextended/ox_lib',
    stars: 892,
    tags: ['library', 'dependency', 'essential'],
  },
  {
    id: 'ox_inventory',
    name: 'OX Inventory',
    description: 'High-performance inventory system with web UI, crafting, and vendor support.',
    category: 'inventory',
    framework: ['qbcore', 'esx'],
    downloadUrl: 'https://github.com/overextended/ox_inventory',
    stars: 734,
    tags: ['inventory', 'performance', 'web'],
  },
  
  // Jobs
  {
    id: 'qb-police',
    name: 'QBCore Police',
    description: 'Complete police job with arrests, evidence, impound, and warrant system.',
    category: 'police',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-policejob',
    stars: 312,
    tags: ['police', 'job', 'erp'],
  },
  {
    id: 'qb-medical',
    name: 'QBCore Medical',
    description: 'Medical job with hospitals, injuries, treatments, and ambulance services.',
    category: 'medical',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-medical',
    stars: 198,
    tags: ['medical', 'job', 'hospital'],
  },
  {
    id: 'qb-mechanic',
    name: 'QBCore Mechanic',
    description: 'Mechanic job with vehicle repairs, impound lot, and towing services.',
    category: 'mechanic',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-mechanicjob',
    stars: 167,
    tags: ['mechanic', 'job', 'vehicles'],
  },
  
  // Economy
  {
    id: 'qb-banking',
    name: 'QBCore Banking',
    description: 'Complete banking system with accounts, ATMs, transfers, and statements.',
    category: 'economy',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-banking',
    stars: 223,
    tags: ['bank', 'economy', 'money'],
  },
  {
    id: 'qb-boss-menu',
    name: 'QBCore Boss Menu',
    description: 'Boss management panel for managing employees, paying salaries, and viewing stats.',
    category: 'economy',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-boss-menu',
    stars: 145,
    tags: ['boss', 'economy', 'management'],
  },
  
  // Communication
  {
    id: 'qb-radio',
    name: 'QBCore Radio',
    description: 'Two-way radio system with channels, frequencies, and police/emergency bands.',
    category: 'communication',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-radio',
    stars: 178,
    tags: ['radio', 'communication', 'job'],
  },
  {
    id: 'qb-clothing',
    name: 'QBCore Clothing',
    description: 'Clothing store system with wardrobe, appearance changes, and price management.',
    category: 'clothing',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-clothing',
    stars: 134,
    tags: ['clothing', 'shop', 'appearance'],
  },
  
  // Scripts
  {
    id: 'ps-admin',
    name: 'PS Admin',
    description: 'Comprehensive admin panel with player management, commands, and logging.',
    category: 'utility',
    framework: ['all'],
    downloadUrl: 'https://github.com/Psvmp/ps-admin',
    stars: 456,
    tags: ['admin', 'panel', 'management'],
  },
  {
    id: 'esx_status',
    name: 'ESX Status',
    description: 'Essential ESX status tracking for hunger, thirst, stress, and health.',
    category: 'utility',
    framework: ['esx'],
    downloadUrl: 'https://github.com/esx-framework/esx_status',
    stars: 267,
    tags: ['status', 'esx', 'essential'],
  },
  {
    id: 'esx_basicneeds',
    name: 'ESX Basic Needs',
    description: 'Hunger, thirst, and fatigue system for ESX servers.',
    category: 'utility',
    framework: ['esx'],
    downloadUrl: 'https://github.com/esx-framework/esx_basicneeds',
    stars: 189,
    tags: ['needs', 'esx', 'survival'],
  },
  
  // Performance
  {
    id: 'ox_events',
    name: 'OX Events',
    description: 'Optimized event system replacing native FiveM events for better performance.',
    category: 'performance',
    framework: ['all'],
    downloadUrl: 'https://github.com/overextended/ox_events',
    stars: 345,
    tags: ['performance', 'events', 'optimization'],
  },
  {
    id: 'ox_core',
    name: 'OX Core',
    description: 'Framework-agnostic core library with shared utilities and optimization.',
    category: 'performance',
    framework: ['all'],
    downloadUrl: 'https://github.com/overextended/ox_core',
    stars: 512,
    tags: ['core', 'performance', 'library'],
  },
  
  // Housing
  {
    id: 'qb-houses',
    name: 'QBCore Houses',
    description: 'Complete housing system with buying, selling, furnishing, and key sharing.',
    category: 'housing',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-houses',
    stars: 234,
    tags: ['housing', 'property', 'economy'],
  },
  
  // Gangs
  {
    id: 'qb-gangs',
    name: 'QBCore Gangs',
    description: 'Gang system with territory control, ranks, and gang wars.',
    category: 'gangs',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-gangs',
    stars: 167,
    tags: ['gangs', 'territory', 'pvp'],
  },
  
  // Minigames
  {
    id: 'qb-minigames',
    name: 'QBCore Minigames',
    description: 'Collection of minigames: poker, blackjack, slots, and more.',
    category: 'minigames',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-minigames',
    stars: 145,
    tags: ['minigames', 'casino', 'entertainment'],
  },
  
  // Utility
  {
    id: 'qb-weathersync',
    name: 'QBCore Weather Sync',
    description: 'Synchronized weather across all players for immersive roleplay.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-weathersync',
    stars: 98,
    tags: ['weather', 'sync', 'immersion'],
  },
  {
    id: 'qb-garage',
    name: 'QBCore Garage',
    description: 'Vehicle garage system with storage, retrieval, and proximity spawning.',
    category: 'vehicleshop',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-garage',
    stars: 201,
    tags: ['garage', 'vehicles', 'storage'],
  },
  {
    id: 'qb-apartments',
    name: 'QBCore Apartments',
    description: 'Apartment hunting system with viewing, renting, and furnishing.',
    category: 'housing',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-apartments',
    stars: 178,
    tags: ['apartments', 'housing', 'renting'],
  },
  {
    id: 'qb-contacts',
    name: 'QBCore Contacts',
    description: 'Phone contacts system with call logs, messages, and speed dial.',
    category: 'communication',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-contacts',
    stars: 112,
    tags: ['contacts', 'phone', 'communication'],
  },
  {
    id: 'qb-dispenser',
    name: 'QBCore Dispenser',
    description: 'ATM and bank dispenser system for cash withdrawals and deposits.',
    category: 'economy',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-dispenser',
    stars: 89,
    tags: ['atm', 'bank', 'economy'],
  },
  {
    id: 'qb-drugs',
    name: 'QBCore Drugs',
    description: 'Drug production and selling system with processing plants and distribution.',
    category: 'drugs',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-drugs',
    stars: 156,
    tags: ['drugs', 'illegal', 'economy'],
  },
  {
    id: 'qb-fishing',
    name: 'QBCore Fishing',
    description: 'Fishing minigame with different fish types, bait, and selling.',
    category: 'fishing',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-fishing',
    stars: 134,
    tags: ['fishing', 'minigame', 'relax'],
  },
  {
    id: 'qb-hunting',
    name: 'QBCore Hunting',
    description: 'Hunting system with weapons, animals, and processing.',
    category: 'hunting',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-hunting',
    stars: 123,
    tags: ['hunting', 'animals', 'survival'],
  },
  {
    id: 'qb-maphacks',
    name: 'QBCore Map Hacks',
    description: 'Advanced map and marker system for custom locations and POIs.',
    category: 'maps',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-maphacks',
    stars: 87,
    tags: ['map', 'markers', 'poi'],
  },
  {
    id: 'qb-notifications',
    name: 'QBCore Notifications',
    description: 'Toast notification system for all server events and alerts.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-notifications',
    stars: 145,
    tags: ['notifications', 'ui', 'alerts'],
  },
  {
    id: 'qb-progressbar',
    name: 'QBCore Progress Bar',
    description: 'Animated progress bar for all actions (robbing, crafting, etc).',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-progressbar',
    stars: 198,
    tags: ['progress', 'ui', 'animation'],
  },
  {
    id: 'qb-lockpick',
    name: 'QBCore Lockpick',
    description: 'Mini-game lockpicking for houses, cars, and safes.',
    category: 'scripts',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-lockpick',
    stars: 167,
    tags: ['lockpick', 'minigame', 'crime'],
  },
  {
    id: 'qb-pvpscript',
    name: 'QBCore PvP Script',
    description: 'PvP settings and weapon damage configuration system.',
    category: 'weapons',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-pvpscript',
    stars: 134,
    tags: ['pvp', 'weapons', 'combat'],
  },
  {
    id: 'qb-reboot',
    name: 'QBCore Reboot',
    description: 'Server reboot and maintenance announcement system.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-reboot',
    stars: 76,
    tags: ['reboot', 'maintenance', 'admin'],
  },
  {
    id: 'qb-vehiclekeys',
    name: 'QBCore Vehicle Keys',
    description: 'Vehicle key system with crafting, sharing, and stealing.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-vehiclekeys',
    stars: 189,
    tags: ['keys', 'vehicles', 'crafting'],
  },
  {
    id: 'qb-target',
    name: 'QBCore Target',
    description: 'Legacy target system (replaced by ox_target, but still widely used).',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-target',
    stars: 234,
    tags: ['target', 'legacy', 'interaction'],
  },
  {
    id: 'qb-chat',
    name: 'QBCore Chat',
    description: 'Chat command system and /help documentation.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-chat',
    stars: 112,
    tags: ['chat', 'commands', 'help'],
  },
  {
    id: 'qb-core',
    name: 'QBCore Framework',
    description: 'The main QBCore framework — required for all QBCore resources.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-core',
    stars: 1234,
    tags: ['framework', 'core', 'required'],
  },
  {
    id: 'qb-logging',
    name: 'QBCore Logging',
    description: 'Server logging system for all actions and events.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-logging',
    stars: 98,
    tags: ['logging', 'debug', 'audit'],
  },
  {
    id: 'qb-carlock',
    name: 'QBCore Car Lock',
    description: 'Vehicle locking system with animations and proximity.',
    category: 'vehicles',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-carlock',
    stars: 145,
    tags: ['cars', 'lock', 'vehicles'],
  },
  {
    id: 'qb-traphouse',
    name: 'QBCore Trap House',
    description: 'Drug manufacturing location system with protection mechanics.',
    category: 'drugs',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-traphouse',
    stars: 167,
    tags: ['drugs', 'trap', 'illegal'],
  },
  {
    id: 'qb-rope',
    name: 'QBCore Rope',
    description: 'Rope tool for binding NPCs and players during roleplay.',
    category: 'scripts',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-rope',
    stars: 89,
    tags: ['rope', 'rp', 'tools'],
  },
  {
    id: 'qb-printer',
    name: 'QBCore Printer',
    description: 'In-game printer for documents, receipts, and wanted posters.',
    category: 'utility',
    framework: ['qbcore'],
    downloadUrl: 'https://github.com/qbcore-framework/qb-printer',
    stars: 67,
    tags: ['printer', 'documents', 'utility'],
  },
]

// Categories with display names
export const CATEGORIES: { id: ResourceCategory; label: string; icon: string }[] = [
  { id: 'hud', label: 'HUD & UI', icon: '🎨' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'vehicleshop', label: 'Vehicle Shops', icon: '🏪' },
  { id: 'scripts', label: 'Scripts', icon: '📜' },
  { id: 'maps', label: 'Maps', icon: '🗺️' },
  { id: 'weapons', label: 'Weapons', icon: '🔫' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'jobs', label: 'Jobs', icon: '💼' },
  { id: 'jobs', label: 'Jobs', icon: '💼' },
  { id: 'inventory', label: 'Inventory', icon: '🎒' },
  { id: 'phone', label: 'Phones', icon: '📱' },
  { id: 'drugs', label: 'Drugs', icon: '💊' },
  { id: 'economy', label: 'Economy', icon: '💰' },
  { id: 'communication', label: 'Communication', icon: '📻' },
  { id: 'vehicleshop', label: 'Vehicle Shop', icon: '🏪' },
  { id: 'housing', label: 'Housing', icon: '🏠' },
  { id: 'gangs', label: 'Gangs', icon: '🔫' },
  { id: 'police', label: 'Police', icon: '🚔' },
  { id: 'medical', label: 'Medical', icon: '🏥' },
  { id: 'mechanic', label: 'Mechanic', icon: '🔧' },
  { id: 'fishing', label: 'Fishing', icon: '🎣' },
  { id: 'hunting', label: 'Hunting', icon: '🏹' },
  { id: 'minigames', label: 'Minigames', icon: '🎮' },
  { id: 'roleplay', label: 'Roleplay', icon: '🎭' },
  { id: 'utility', label: 'Utility', icon: '🔧' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
]

// Filter resources by category
export function getResourcesByCategory(category: ResourceCategory): FiveMResource[] {
  return RESOURCE_CATALOG.filter(r => r.category === category)
}

// Search resources by keyword
export function searchResources(query: string): FiveMResource[] {
  const q = query.toLowerCase()
  return RESOURCE_CATALOG.filter(r => 
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q))
  )
}

// Get resources compatible with a framework
export function getFrameworkResources(framework: 'qbcore' | 'esx' | 'all'): FiveMResource[] {
  return RESOURCE_CATALOG.filter(r => 
    r.framework.includes(framework) || r.framework.includes('all')
  )
}
