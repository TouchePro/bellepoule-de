/**
 * Tests unitaires - Modèles PDF simples (intégrité des données)
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import { TEMPLATES, getAvailableTemplates, SimplePdfTemplate } from './pdfTemplates';

const isHexColor = (c: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);

describe('TEMPLATES', () => {
  it('contient au moins un modèle', () => {
    expect(Object.keys(TEMPLATES).length).toBeGreaterThan(0);
  });

  it('chaque clé correspond à l’id du modèle', () => {
    for (const [key, tpl] of Object.entries(TEMPLATES)) {
      expect(tpl.id).toBe(key);
    }
  });

  it('chaque modèle a un nom, une description et une organisation', () => {
    for (const tpl of Object.values(TEMPLATES)) {
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.branding.organizationName).toBeTruthy();
    }
  });

  it('toutes les couleurs sont des valeurs hexadécimales valides', () => {
    for (const tpl of Object.values(TEMPLATES)) {
      for (const color of Object.values(tpl.colors)) {
        expect(isHexColor(color)).toBe(true);
      }
    }
  });

  it('chaque modèle définit des tailles de police positives', () => {
    for (const tpl of Object.values(TEMPLATES)) {
      expect(tpl.fonts.title.size).toBeGreaterThan(0);
      expect(tpl.fonts.header.size).toBeGreaterThan(0);
      expect(tpl.fonts.body.size).toBeGreaterThan(0);
    }
  });
});

describe('getAvailableTemplates', () => {
  it('retourne toutes les valeurs de TEMPLATES', () => {
    const list = getAvailableTemplates();
    expect(list).toHaveLength(Object.keys(TEMPLATES).length);
    expect(list.every((t: SimplePdfTemplate) => typeof t.id === 'string')).toBe(true);
  });
});
