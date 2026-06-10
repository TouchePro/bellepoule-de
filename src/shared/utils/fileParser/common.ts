/**
 * BellePoule Modern - File Parser - Types et helpers partagés
 * Licensed under GPL-3.0
 */

import { Fencer } from '../../types';

export interface ImportResult {
  success: boolean;
  fencers: Partial<Fencer>[];
  errors: string[];
  warnings: string[];
}
