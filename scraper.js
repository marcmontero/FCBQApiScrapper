// scraper.js
// Motor d'extracció seguint el flux: Club → Equips → Competicions → Partits

import axios from 'axios';
import * as cheerio from 'cheerio';

const CLUB_ID = 150; // AE Badalonès
const BASE_URL = 'https://www.basquetcatala.cat';
const API_BASE = 'https://msstats.optimalwayconsulting.com/v1/fcbq/getJsonWithMatchStats/';
const CURRENT_SEASON = '2025'; // Temporada 2025-2026

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuració d'equips
const TEAM_CONFIG = {
  'senior-a-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'senior-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'senior-b-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'senior-c-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'u20-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'u20-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'junior-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'junior-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'cadet-a-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'cadet-b-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'cadet-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'infantil-a-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'infantil-a-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'infantil-b-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'infantil-b-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'alevin-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'alevin-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'preinfantil-masc': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
  'preinfantil-fem': { icon: '🏀', keywords: ['badalones', 'corbacho'] },
};

function normalizeTeamName(name) {
  const normalized = name.toUpperCase().trim()
    .replace(/[ÀÁÂÃÄÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/Ñ/g, 'N')
    .replace(/Ç/g, 'C');

  // Detectar categoría y género
  let key = '';
  
  if (normalized.includes('SENIOR A') && normalized.includes('MASCUL')) key = 'senior-a-masc';
  else if (normalized.includes('SENIOR') && normalized.includes('FEMEN')) key = 'senior-fem';
  else if (normalized.includes('SENIOR B') && normalized.includes('MASCUL')) key = 'senior-b-masc';
  else if (normalized.includes('SENIOR C') && normalized.includes('MASCUL')) key = 'senior-c-masc';
  else if (normalized.includes('U20') && normalized.includes('MASCUL')) key = 'u20-masc';
  else if (normalized.includes('U20') && normalized.includes('FEMEN')) key = 'u20-fem';
  else if (normalized.includes('JUNIOR') && normalized.includes('MASCUL')) key = 'junior-masc';
  else if (normalized.includes('JUNIOR') && normalized.includes('FEMEN')) key = 'junior-fem';
  else if (normalized.includes('CADET A') && normalized.includes('MASCUL')) key = 'cadet-a-masc';
  else if (normalized.includes('CADET B') && normalized.includes('MASCUL')) key = 'cadet-b-masc';
  else if (normalized.includes('CADET') && normalized.includes('FEMEN')) key = 'cadet-fem';
  else if (normalized.includes('INFANTIL A') && normalized.includes('MASCUL')) key = 'infantil-a-masc';
  else if (normalized.includes('INFANTIL A') && normalized.includes('FEMEN')) key = 'infantil-a-fem';
  else if (normalized.includes('INFANTIL B') && normalized.includes('MASCUL')) key = 'infantil-b-masc';
  else if (normalized.includes('INFANTIL B') && normalized.includes('FEMEN')) key = 'infantil-b-fem';
  else if (normalized.includes('ALEVIN') && normalized.includes('MASCUL')) key = 'alevin-masc';
  else if (normalized.includes('ALEVIN') && normalized.includes('FEMEN')) key = 'alevin-fem';
  else if (normalized.includes('PREINFANTIL') && normalized.includes('MASCUL')) key = 'preinfantil-masc';
  else if (normalized.includes('PREINFANTIL') && normalized.includes('FEMEN')) key = 'preinfantil-fem';
  else {
    // Generar key genèrica
    key = normalized.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  }

  return {
    key,
    config: TEAM_CONFIG[key] || { icon: '🏀', keywords: ['badalones'] }
  };
}

// 1. Obtenir tots els equips del club
export async function getClubTeams() {
  console.log(`🔍 [${new Date().toISOString()}] Buscant equips del club ${CLUB_ID}...`);
  
  try {
    const response = await axios.get(`${BASE_URL}/club/${CLUB_ID}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const teams = [];
    
    $('a[href*="/equip/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const teamId = href?.match(/\/equip\/(\d+)/)?.[1];
      const teamName = $(elem).text().trim();
      
      if (teamId && teamName && teamName.length > 3) {
        if (!teams.find(t => t.id === teamId)) {
          teams.push({
            id: teamId,
            name: teamName,
            url: `${BASE_URL}/equip/${teamId}`
          });
        }
      }
    });
    
    console.log(`✅ Trobats ${teams.length} equips`);
    return teams;
    
  } catch (error) {
    console.error('❌ Error al buscar equips:', error.message);
    return [];
  }
}

// 2. Obtenir competicions d'un equip
export async function getTeamCompetitions(teamId, teamName) {
  console.log(`  🔍 Buscant competicions de "${teamName}"...`);
  
  try {
    const response = await axios.get(`${BASE_URL}/equip/${teamId}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const competitions = [];
    
    // Buscar enllaços a competicions/resultats
    $('a[href*="/competicions/resultats/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const competitionId = href?.match(/\/competicions\/resultats\/(\d+)/)?.[1];
      
      if (competitionId && !competitions.includes(competitionId)) {
        competitions.push(competitionId);
      }
    });
    
    console.log(`  ✅ Trobades ${competitions.length} competicions`);
    return competitions;
    
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    return [];
  }
}

// 3. Obtenir partits d'una competició (amb paginació i filtre per club)
export async function getCompetitionMatches(competitionId, teamName) {
  console.log(`    🔍 Buscant partits de la competició ${competitionId}...`);
  
  const allMatchIds = new Set();
  let page = 1;
  let hasMorePages = true;
  
  while (hasMorePages && page <= 10) { // Màxim 10 pàgines per seguretat
    try {
      // Provar amb i sense paginació
      const url = page === 1 
        ? `${BASE_URL}/competicions/resultats/${competitionId}`
        : `${BASE_URL}/competicions/resultats/${competitionId}/${page}`;
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const pageHTML = response.data.toUpperCase();
      
      let matchesFoundOnPage = 0;
      let totalLinksOnPage = 0;
      
      // Primer, buscar on apareix "BADALON" o "CORBACHO" al HTML
      const hasBadalones = pageHTML.includes('BADALON') || pageHTML.includes('CORBACHO');
      
      if (page === 1) {
        console.log(`      🔎 DEBUG - Pàgina conté "BADALON/CORBACHO": ${hasBadalones ? '✅ SÍ' : '❌ NO'}`);
      }
      
      // Buscar TOTS els enllaços d'estadístiques
      const allMatchLinks = [];
      $('a[href*="/estadistiques/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        let matchId = href?.match(/\/estadistiques\/([a-f0-9]{24,})/i)?.[1];
        if (!matchId) {
          matchId = href?.match(/\/estadistiques\/\d+\/([a-f0-9]{24,})/i)?.[1];
        }
        if (matchId) {
          allMatchLinks.push(matchId);
        }
      });
      
      totalLinksOnPage = allMatchLinks.length;
      
      // Si la pàgina conté "BADALON/CORBACHO", buscar quins partits són
      if (hasBadalones) {
        // Estratègia: buscar el context al voltant de cada enllaç d'estadístiques
        $('a[href*="/estadistiques/"]').each((i, elem) => {
          const href = $(elem).attr('href');
          let matchId = href?.match(/\/estadistiques\/([a-f0-9]{24,})/i)?.[1];
          if (!matchId) {
            matchId = href?.match(/\/estadistiques\/\d+\/([a-f0-9]{24,})/i)?.[1];
          }
          
          if (matchId && !allMatchIds.has(matchId)) {
            // Agafar context ampli: buscar divs/sections pares fins trobar els noms dels equips
            const $elem = $(elem);
            let contextText = '';
            
            // Intentar diferents nivells de pares
            for (let level = 1; level <= 6; level++) {
              const $parent = $elem.parents().eq(level);
              contextText = $parent.text().toUpperCase();
              
              // Si aquest nivell conté els keywords, és el partit correcte
              if (contextText.includes('BADALON') || contextText.includes('CORBACHO')) {
                allMatchIds.add(matchId);
                matchesFoundOnPage++;
                
                if (page === 1 && matchesFoundOnPage <= 2) {
                  console.log(`      ✅ Partit ${matchesFoundOnPage} trobat! (nivell ${level})`);
                }
                break;
              }
            }
          }
        });
      }
      
      console.log(`      📄 Pàgina ${page}: ${matchesFoundOnPage}/${totalLinksOnPage} partits del Badalonès`);
      
      // Si no trobem més enllaços, parar
      if (totalLinksOnPage === 0) {
        hasMorePages = false;
      } else {
        page++;
        await delay(1000); // Esperar entre pàgines
      }
      
    } catch (error) {
      console.log(`      ⚠️ Error a pàgina ${page}: ${error.message}`);
      hasMorePages = false;
    }
  }
  
  const matches = Array.from(allMatchIds).map(id => ({
    matchId: id,
    apiUrl: `${API_BASE}${id}?currentSeason=true`
  }));
  
  console.log(`    ✅ Trobats ${matches.length} partits del Badalonès`);
  return matches;
}

// 4. Scraping complet
export async function scrapeAllTeams() {
  console.log('🚀 Iniciant extracció completa...\n');
  
  const teams = await getClubTeams();
  
  if (teams.length === 0) {
    console.log('❌ No s\'han trobat equips');
    return null;
  }
  
  const config = {};
  let totalMatches = 0;
  
  for (const team of teams) {
    await delay(2000); // Esperar 2 segons entre equips
    
    // Obtenir competicions de l'equip
    const competitions = await getTeamCompetitions(team.id, team.name);
    
    if (competitions.length === 0) {
      console.log(`  ⚠️ No s'han trobat competicions per ${team.name}`);
      continue;
    }
    
    const allMatches = [];
    
    // Obtenir partits de cada competició
    for (const compId of competitions) {
      await delay(1500); // Esperar 1.5 segons entre competicions
      const matches = await getCompetitionMatches(compId, team.name);
      allMatches.push(...matches);
    }
    
    // Eliminar duplicats
    const uniqueMatches = Array.from(new Set(allMatches.map(m => m.matchId)))
      .map(id => allMatches.find(m => m.matchId === id));
    
    if (uniqueMatches.length > 0) {
      const teamData = normalizeTeamName(team.name);
      
      config[teamData.key] = {
        name: team.name,
        icon: teamData.config.icon,
        keywords: teamData.config.keywords,
        urls: uniqueMatches.map(m => m.apiUrl)
      };
      
      totalMatches += uniqueMatches.length;
      console.log(`  ✅ ${team.name}: ${uniqueMatches.length} partits\n`);
    }
  }
  
  console.log(`\n🎉 Extracció completa!`);
  console.log(`📊 Total equips amb partits: ${Object.keys(config).length}`);
  console.log(`📊 Total partits: ${totalMatches}\n`);
  
  return {
    config,
    metadata: {
      totalTeams: Object.keys(config).length,
      totalMatches,
      lastUpdate: new Date().toISOString(),
      clubId: CLUB_ID,
      season: CURRENT_SEASON
    }
  };
}

// 5. Comparar canvis
export function hasNewMatches(oldConfig, newConfig) {
  if (!oldConfig || !newConfig) return { hasChanges: true, changes: [] };
  
  const changes = [];
  
  for (const [teamKey, teamData] of Object.entries(newConfig)) {
    const oldTeam = oldConfig[teamKey];
    
    if (!oldTeam) {
      changes.push({ 
        team: teamKey, 
        type: 'new_team', 
        count: teamData.urls.length 
      });
      continue;
    }
    
    const newMatches = teamData.urls.filter(url => !oldTeam.urls.includes(url));
    
    if (newMatches.length > 0) {
      changes.push({ 
        team: teamKey, 
        type: 'new_matches', 
        count: newMatches.length,
        matches: newMatches 
      });
    }
  }
  
  return {
    hasChanges: changes.length > 0,
    changes
  };
}