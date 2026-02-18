/**
 * BellePoule Modern - Bulk Import Utilities
 * CSV and Excel import for fencers
 * Licensed under GPL-3.0
 */

import { Fencer, FencerStatus, Gender } from '../types';

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ImportResult {
  success: boolean;
  fencers: Fencer[];
  errors: ImportValidationError[];
  warnings: string[];
  importedCount: number;
  skippedCount: number;
}

export interface CSVColumnMapping {
  lastName: string | number;
  firstName: string | number;
  club?: string | number;
  license?: string | number;
  nationality?: string | number;
  ranking?: string | number;
  gender?: string | number;
}

const DEFAULT_MAPPING: CSVColumnMapping = {
  lastName: 'Nom',
  firstName: 'Prenom',
  club: 'Club',
  license: 'Licence',
  nationality: 'Nation',
  ranking: 'Classement',
  gender: 'Sexe',
};

/**
 * Parse CSV content
 */
export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    // Simple CSV parsing (handles quoted fields)
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    result.push(row);
  }

  return result;
}

/**
 * Parse Excel content (simple TSV format)
 */
export function parseExcel(tsvContent: string): string[][] {
  return tsvContent
    .trim()
    .split('\n')
    .map(line => line.split('\t').map(cell => cell.trim()));
}

/**
 * Auto-detect column mapping from headers
 */
export function autoDetectMapping(headers: string[]): CSVColumnMapping {
  const mapping: CSVColumnMapping = {
    lastName: 0,
    firstName: 1,
  };

  const headerMap = new Map(headers.map((h, i) => [h.toLowerCase().trim(), i]));

  // Map French headers
  const namePatterns = ['nom', 'name', 'nom de famille', 'lastname'];
  const firstNamePatterns = ['prenom', 'first name', 'firstname', 'prénom'];
  const clubPatterns = ['club', 'societe', 'société'];
  const licensePatterns = ['licence', 'license', 'numero', 'numéro'];
  const nationPatterns = ['nation', 'nationality', 'pays', 'country'];
  const rankingPatterns = ['classement', 'ranking', 'rang'];
  const genderPatterns = ['sexe', 'gender', 'civility'];

  for (const [header, index] of headerMap) {
    if (namePatterns.some(p => header.includes(p))) mapping.lastName = index;
    if (firstNamePatterns.some(p => header.includes(p))) mapping.firstName = index;
    if (clubPatterns.some(p => header.includes(p))) mapping.club = index;
    if (licensePatterns.some(p => header.includes(p))) mapping.license = index;
    if (nationPatterns.some(p => header.includes(p))) mapping.nationality = index;
    if (rankingPatterns.some(p => header.includes(p))) mapping.ranking = index;
    if (genderPatterns.some(p => header.includes(p))) mapping.gender = index;
  }

  return mapping;
}

/**
 * Get column value by index or name
 */
function getColumnValue(
  row: string[],
  mapping: string | number | undefined,
  headers?: string[]
): string {
  if (mapping === undefined) return '';

  if (typeof mapping === 'number') {
    return row[mapping] || '';
  }

  if (headers) {
    const index = headers.findIndex(h => h.toLowerCase().trim() === mapping.toLowerCase().trim());
    return index >= 0 ? row[index] || '' : '';
  }

  return '';
}

/**
 * Parse gender value
 */
function parseGender(value: string): Gender {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'M' || normalized === 'H' || normalized === 'MALE' || normalized === 'HOMME') {
    return Gender.MALE;
  }
  if (normalized === 'F' || normalized === 'FEMALE' || normalized === 'FEMME') {
    return Gender.FEMALE;
  }
  return Gender.MIXED;
}

/**
 * Validate fencer data
 */
function validateFencer(fencer: Partial<Fencer>, rowIndex: number): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  if (!fencer.lastName || fencer.lastName.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: 'lastName',
      message: 'Le nom est requis',
      value: fencer.lastName || '',
    });
  }

  if (!fencer.firstName || fencer.firstName.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: 'firstName',
      message: 'Le prénom est requis',
      value: fencer.firstName || '',
    });
  }

  if (fencer.ranking !== undefined && (isNaN(fencer.ranking) || fencer.ranking < 0)) {
    errors.push({
      row: rowIndex,
      field: 'ranking',
      message: 'Le classement doit être un nombre positif',
      value: String(fencer.ranking),
    });
  }

  return errors;
}

/**
 * Import fencers from parsed data
 */
export function importFencers(
  data: string[][],
  mapping: CSVColumnMapping = DEFAULT_MAPPING,
  hasHeader: boolean = true
): ImportResult {
  const result: ImportResult = {
    success: true,
    fencers: [],
    errors: [],
    warnings: [],
    importedCount: 0,
    skippedCount: 0,
  };

  if (data.length === 0) {
    result.success = false;
    result.errors.push({
      row: 0,
      field: 'general',
      message: 'Aucune donnée à importer',
      value: '',
    });
    return result;
  }

  const headers = hasHeader ? data[0] : [];
  const startRow = hasHeader ? 1 : 0;

  // Auto-detect mapping if headers present and no explicit mapping
  if (hasHeader && typeof mapping.lastName === 'string') {
    mapping = autoDetectMapping(headers);
  }

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    const fencer: Partial<Fencer> = {
      lastName: getColumnValue(row, mapping.lastName, headers).trim(),
      firstName: getColumnValue(row, mapping.firstName, headers).trim(),
      club: getColumnValue(row, mapping.club, headers).trim() || undefined,
      license: getColumnValue(row, mapping.license, headers).trim() || undefined,
      nationality: getColumnValue(row, mapping.nationality, headers).trim() || 'FRA',
      gender: parseGender(getColumnValue(row, mapping.gender, headers)),
      status: FencerStatus.CHECKED_IN,
    };

    const rankingStr = getColumnValue(row, mapping.ranking, headers).trim();
    if (rankingStr) {
      const ranking = parseInt(rankingStr, 10);
      if (!isNaN(ranking)) {
        fencer.ranking = ranking;
      }
    }

    // Validate
    const errors = validateFencer(fencer, i + 1);
    if (errors.length > 0) {
      result.errors.push(...errors);
      result.skippedCount++;
      continue;
    }

    result.fencers.push(fencer as Fencer);
    result.importedCount++;
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

/**
 * Generate import template
 */
export function generateImportTemplate(): string {
  return `Nom,Prenom,Club,Licence,Nation,Classement,Sexe
DUPONT,Jean,Club d'Escrime Paris,12345,FRA,10,M
MARTIN,Marie,Club de Lyon,12346,FRA,15,F
`;
}

/**
 * Detect file type from content
 */
export function detectFileType(content: string): 'csv' | 'excel' | 'unknown' {
  // Check for TSV (tabs)
  if (content.includes('\t')) {
    return 'excel';
  }

  // Check for CSV (commas)
  if (content.includes(',')) {
    return 'csv';
  }

  return 'unknown';
}

/**
 * Main import function
 */
export async function bulkImportFencers(
  fileContent: string,
  fileType?: 'csv' | 'excel'
): Promise<ImportResult> {
  const detectedType = fileType || detectFileType(fileContent);

  let data: string[][];

  if (detectedType === 'excel') {
    data = parseExcel(fileContent);
  } else {
    data = parseCSV(fileContent);
  }

  return importFencers(data);
}
