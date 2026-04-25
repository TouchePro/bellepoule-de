import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PdfDocType, PdfTemplate } from '../../../shared/types/pdfTemplate.types';
import { buildDefaultTemplate } from '../../../shared/types/pdfTemplate.types';

interface PdfTemplateState {
  templates: Record<PdfDocType, PdfTemplate>;
}

interface PdfTemplateActions {
  setTemplate: (docType: PdfDocType, template: PdfTemplate) => void;
  resetTemplate: (docType: PdfDocType) => void;
  importTemplate: (template: PdfTemplate) => void;
}

export const usePdfTemplateStore = create<PdfTemplateState & PdfTemplateActions>()(
  devtools(
    immer(
      persist(
        (set) => ({
          templates: {
            pool:    buildDefaultTemplate('pool'),
            tableau: buildDefaultTemplate('tableau'),
            ranking: buildDefaultTemplate('ranking'),
          },

          setTemplate: (docType, template) =>
            set(s => { s.templates[docType] = template; }),

          resetTemplate: (docType) =>
            set(s => { s.templates[docType] = buildDefaultTemplate(docType); }),

          importTemplate: (template) =>
            set(s => { s.templates[template.docType] = template; }),
        }),
        { name: 'bellepoule-pdf-templates' }
      )
    ),
    { name: 'PdfTemplateStore' }
  )
);
