/**
 * BellePoule Modern - Tournament Templates
 * Predefined competition configurations
 * Licensed under GPL-3.0
 */

import {
  Competition,
  Weapon,
  Gender,
  Category,
  CompetitionSettings,
  PoolPhaseConfig,
} from '../types';

export interface TournamentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'official' | 'custom';
  weapon: Weapon;
  gender: Gender;
  category_age: Category;
  settings: CompetitionSettings;
  poolConfig: PoolPhaseConfig;
  color: string;
}

// ============================================================================
// Official FFE Templates
// ============================================================================

export const OFFICIAL_TEMPLATES: TournamentTemplate[] = [
  {
    id: 'ffe-senior-individual',
    name: 'Championnat Individuel Senior FFE',
    description: 'Format officiel FFE - Poules de 7, tableau à 64',
    category: 'official',
    weapon: Weapon.EPEE,
    gender: Gender.MIXED,
    category_age: Category.SENIOR,
    color: '#1e40af',
    settings: {
      defaultPoolMaxScore: 5,
      defaultTableMaxScore: 21,
      poolRounds: 1,
      hasDirectElimination: true,
      thirdPlaceMatch: true,
      manualRanking: false,
      defaultRanking: 0,
      randomScore: false,
      minTeamSize: 3,
    },
    poolConfig: {
      minPoolSize: 5,
      maxPoolSize: 7,
      balanced: true,
      seeding: 'serpentine',
      separation: {
        byClub: true,
        byLeague: true,
        byNation: false,
      },
    },
  },
  {
    id: 'ffe-cadet-individual',
    name: 'Championnat Individuel Cadet FFE',
    description: 'Format officiel FFE Cadets - Poules de 6, tableau à 64',
    category: 'official',
    weapon: Weapon.EPEE,
    gender: Gender.MIXED,
    category_age: Category.U17,
    color: '#0891b2',
    settings: {
      defaultPoolMaxScore: 5,
      defaultTableMaxScore: 21,
      poolRounds: 1,
      hasDirectElimination: true,
      thirdPlaceMatch: true,
      manualRanking: false,
      defaultRanking: 0,
      randomScore: false,
      minTeamSize: 3,
    },
    poolConfig: {
      minPoolSize: 5,
      maxPoolSize: 6,
      balanced: true,
      seeding: 'serpentine',
      separation: {
        byClub: true,
        byLeague: true,
        byNation: false,
      },
    },
  },
  {
    id: 'ffe-minime-individual',
    name: 'Championnat Individuel Minime FFE',
    description: 'Format officiel FFE Minimes - Poules de 5, tableau à 32',
    category: 'official',
    weapon: Weapon.EPEE,
    gender: Gender.MIXED,
    category_age: Category.U15,
    color: '#059669',
    settings: {
      defaultPoolMaxScore: 5,
      defaultTableMaxScore: 10,
      poolRounds: 1,
      hasDirectElimination: true,
      thirdPlaceMatch: true,
      manualRanking: false,
      defaultRanking: 0,
      randomScore: false,
      minTeamSize: 3,
    },
    poolConfig: {
      minPoolSize: 4,
      maxPoolSize: 5,
      balanced: true,
      seeding: 'serpentine',
      separation: {
        byClub: true,
        byLeague: true,
        byNation: false,
      },
    },
  },
  {
    id: 'ffe-veteran-individual',
    name: 'Championnat Individuel Vétéran FFE',
    description: 'Format officiel FFE Vétérans - Poules de 6, tableau à 32',
    category: 'official',
    weapon: Weapon.EPEE,
    gender: Gender.MIXED,
    category_age: Category.V1,
    color: '#7c3aed',
    settings: {
      defaultPoolMaxScore: 5,
      defaultTableMaxScore: 10,
      poolRounds: 1,
      hasDirectElimination: true,
      thirdPlaceMatch: true,
      manualRanking: false,
      defaultRanking: 0,
      randomScore: false,
      minTeamSize: 3,
    },
    poolConfig: {
      minPoolSize: 5,
      maxPoolSize: 6,
      balanced: true,
      seeding: 'serpentine',
      separation: {
        byClub: false,
        byLeague: false,
        byNation: false,
      },
    },
  },
  {
    id: 'competition-poules-only',
    name: 'Compétition Poules Uniquement',
    description: 'Phase de poules uniquement, pas de tableau',
    category: 'custom',
    weapon: Weapon.FOIL,
    gender: Gender.MIXED,
    category_age: Category.SENIOR,
    color: '#dc2626',
    settings: {
      defaultPoolMaxScore: 5,
      defaultTableMaxScore: 21,
      poolRounds: 1,
      hasDirectElimination: false,
      thirdPlaceMatch: false,
      manualRanking: false,
      defaultRanking: 0,
      randomScore: false,
      minTeamSize: 3,
    },
    poolConfig: {
      minPoolSize: 5,
      maxPoolSize: 7,
      balanced: true,
      seeding: 'serpentine',
      separation: {
        byClub: true,
        byLeague: false,
        byNation: false,
      },
    },
  },
];

// ============================================================================
// Template Management
// ============================================================================

const STORAGE_KEY = 'bellepoule-templates';

/**
 * Get all templates (official + custom)
 */
export function getAllTemplates(): TournamentTemplate[] {
  const customTemplates = getCustomTemplates();
  return [...OFFICIAL_TEMPLATES, ...customTemplates];
}

/**
 * Get official templates only
 */
export function getOfficialTemplates(): TournamentTemplate[] {
  return OFFICIAL_TEMPLATES;
}

/**
 * Get custom templates from localStorage
 */
export function getCustomTemplates(): TournamentTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom templates:', error);
  }
  return [];
}

/**
 * Save custom template
 */
export function saveCustomTemplate(template: TournamentTemplate): boolean {
  try {
    const templates = getCustomTemplates();

    // Check for duplicate ID
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push({
        ...template,
        id: `custom-${Date.now()}`,
        category: 'custom',
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch (error) {
    console.error('Failed to save custom template:', error);
    return false;
  }
}

/**
 * Delete custom template
 */
export function deleteCustomTemplate(templateId: string): boolean {
  try {
    const templates = getCustomTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete custom template:', error);
    return false;
  }
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TournamentTemplate | null {
  return getAllTemplates().find(t => t.id === id) || null;
}

/**
 * Apply template to competition
 */
export function applyTemplate(template: TournamentTemplate, title?: string): Partial<Competition> {
  return {
    title: title || template.name,
    weapon: template.weapon,
    gender: template.gender,
    category: template.category_age,
    color: template.color,
    settings: template.settings,
  };
}

/**
 * Export templates to JSON
 */
export function exportTemplates(): string {
  return JSON.stringify(getAllTemplates(), null, 2);
}

/**
 * Import templates from JSON
 */
export function importTemplates(jsonContent: string): TournamentTemplate[] {
  try {
    const templates = JSON.parse(jsonContent) as TournamentTemplate[];
    // Filter out official templates
    const customTemplates = templates.filter(t => t.category === 'custom');

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));

    return customTemplates;
  } catch (error) {
    console.error('Failed to import templates:', error);
    return [];
  }
}

/**
 * Create competition from template
 */
export function createCompetitionFromTemplate(
  templateId: string,
  customTitle?: string
): Partial<Competition> | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  return applyTemplate(template, customTitle);
}
