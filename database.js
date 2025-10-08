// database.js
// Base de dades simple amb LowDB (JSON file)

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const adapter = new JSONFile('db.json');
const db = new Low(adapter, {});

// Inicializar base de datos
export async function initDB() {
  await db.read();
  
  db.data ||= {
    config: {},
    metadata: {
      lastUpdate: null,
      lastCheck: null,
      totalTeams: 0,
      totalMatches: 0,
      season: null
    },
    history: []
  };
  
  await db.write();
  console.log('✅ Base de dades inicialitzada');
}

// Guardar configuración
export async function saveConfig(config, metadata) {
  await db.read();
  
  db.data.config = config;
  db.data.metadata = {
    ...metadata,
    lastUpdate: new Date().toISOString()
  };
  
  // Guardar en historial
  db.data.history.push({
    timestamp: new Date().toISOString(),
    totalTeams: metadata.totalTeams,
    totalMatches: metadata.totalMatches,
    season: metadata.season
  });
  
  // Mantener solo últimos 100 registros
  if (db.data.history.length > 100) {
    db.data.history = db.data.history.slice(-100);
  }
  
  await db.write();
  console.log('💾 Configuració guardada');
}

// Obtener configuración actual
export async function getConfig() {
  await db.read();
  return db.data.config;
}

// Obtener metadata
export async function getMetadata() {
  await db.read();
  return db.data.metadata;
}

// Actualizar última comprobación
export async function updateLastCheck() {
  await db.read();
  db.data.metadata.lastCheck = new Date().toISOString();
  await db.write();
}

// Obtener historial
export async function getHistory() {
  await db.read();
  return db.data.history;
}

export default db;