export interface ValidationResult {
  title: string
  filename: string
  date: string
  language_code: string
  _lang: string
  total_specifications: number
  total_specifications_pass: number
  total_specifications_fail: number
  percent_specifications_pass?: number
  total_requirements: number
  total_requirements_pass: number
  total_requirements_fail: number
  percent_requirements_pass?: number
  total_checks: number
  total_checks_pass: number
  total_checks_fail: number
  percent_checks_pass: number
  status: boolean
  status_text: string
  specifications: SpecificationResult[]
  bcf_data?: {
    zip_content: string
    filename: string
  }
}

export interface SpecificationResult {
  name: string
  description: string
  instructions: string
  status: boolean
  status_text: string
  total_checks: number
  total_checks_pass: number
  total_checks_fail: number
  percent_checks_pass: number
  total_applicable?: number
  total_applicable_pass?: number
  applicability: string[]
  requirements: RequirementResult[]
}

export interface RequirementResult {
  description: string
  status: boolean | string
  total_checks: number
  total_pass: number
  total_fail: number
  total_applicable?: number
  passed_entities: EntityResult[]
  failed_entities: EntityResult[]
  has_omitted_passes: boolean
  has_omitted_failures: boolean
}

export interface EntityResult {
  globalId: string
  type: string
  name: string
  tag: string
  description: string
}

/**
 * Translation service that handles IDS validation results and converts them
 * to properly translated content while maintaining the exact HTML template structure
 */
export class IDSTranslationService {
  constructor() {}

  /**
   * Translate validation results and prepare them for HTML template rendering
   */
  translateValidationResults(results: ValidationResult, languageOverride?: string): ValidationResult {
    const translated = { ...results }

    // Translate overall status text based on language (prefer override for UI language)
    const language = languageOverride || results.language_code || 'en'
    translated.status_text = this.getStatusText(results.status, language, false)

    // Translate each specification
    translated.specifications = results.specifications.map((spec: SpecificationResult) =>
      this.translateSpecification(spec, language),
    )

    return translated
  }

  /**
   * Get localized status text
   */
  private getStatusText(status: boolean | string, language: string, isSkipped: boolean): string {
    if (isSkipped) {
      switch (language) {
        case 'de':
          return 'ÜBERSPRUNGEN'
        case 'fr':
          return 'IGNORÉ'
        case 'it':
          return 'SALTATO'
        case 'rm':
          return 'SURSIGLÌ'
        default:
          return 'SKIPPED'
      }
    }

    if (status) {
      switch (language) {
        case 'de':
          return 'BESTANDEN'
        case 'fr':
          return 'RÉUSSI'
        case 'it':
          return 'SUPERATO'
        case 'rm':
          return 'REUSSÌ'
        default:
          return 'PASS'
      }
    } else {
      switch (language) {
        case 'de':
          return 'FEHLGESCHLAGEN'
        case 'fr':
          return 'ÉCHEC'
        case 'it':
          return 'FALLITO'
        case 'rm':
          return 'BETG REUSSÌ'
        default:
          return 'FAIL'
      }
    }
  }

  /**
   * Translate individual specification
   */
  private translateSpecification(spec: SpecificationResult, language: string): SpecificationResult {
    const translated = { ...spec }

    // Handle skipped specifications (no applicable entities)
    const isSkipped = spec.total_applicable === 0 || spec.total_checks === 0

    // Translate status text
    translated.status_text = this.getStatusText(spec.status, language, isSkipped)

    // Translate applicability descriptions
    translated.applicability = spec.applicability.map((app: string) => this.translateApplicabilityText(app, language))

    // Translate requirements
    translated.requirements = spec.requirements.map((req: RequirementResult) =>
      this.translateRequirement(req, language, isSkipped),
    )

    return translated
  }

  /**
   * Translate applicability text based on language
   */
  private translateApplicabilityText(applicability: string, language: string): string {
    let translated = applicability

    // Handle "All X data" patterns first
    const allDataPattern = /All (\w+) data/
    const match = applicability.match(allDataPattern)

    if (match) {
      const entityType = match[1]
      if (language === 'de') {
        translated = `Alle ${entityType} Daten`
      } else if (language === 'fr') {
        translated = `Toutes les données ${entityType}`
      } else if (language === 'it') {
        translated = `Tutti i dati ${entityType}`
      } else if (language === 'rm') {
        translated = `Tut las datas ${entityType}`
      }
      return translated
    }

    // Apply language-specific translations for other applicability patterns
    if (language === 'de') {
      translated = translated.replace(/Data where the/g, 'Daten wo')
      translated = translated.replace(/Elements with/g, 'Elemente mit')
      translated = translated.replace(/data (?:equal to|of)/g, 'gleich')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'im ')
    } else if (language === 'fr') {
      translated = translated.replace(/Data where the/g, 'Données où')
      translated = translated.replace(/Elements with/g, 'Éléments avec')
      translated = translated.replace(/data (?:equal to|of)/g, 'égal à')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'dans le ')
    } else if (language === 'it') {
      translated = translated.replace(/Data where the/g, 'Dati dove')
      translated = translated.replace(/Elements with/g, 'Elementi con')
      translated = translated.replace(/data (?:equal to|of)/g, 'uguale a')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'nel ')
    } else if (language === 'rm') {
      translated = translated.replace(/Data where the/g, 'Datas nua che')
      translated = translated.replace(/Elements with/g, 'Elements cun')
      translated = translated.replace(/data (?:equal to|of)/g, 'ugual a')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'en il ')
    }

    // Collapse any double spaces introduced during replacements
    translated = translated.replace(/\s{2,}/g, ' ').trim()

    return translated
  }

  /**
   * Translate individual requirement
   */
  private translateRequirement(req: RequirementResult, language: string, isSpecSkipped: boolean): RequirementResult {
    const translated = { ...req }

    // Handle skipped requirements
    const isSkipped = isSpecSkipped || req.total_applicable === 0 || req.total_checks === 0

    // Set status for skipped requirements
    if (isSkipped) {
      translated.status = 'skipped'
    }

    // Translate the requirement description using language-specific patterns
    translated.description = this.translateRequirementDescriptionByLanguage(req.description, language)

    return translated
  }

  /**
   * Translate requirement descriptions by language
   */
  private translateRequirementDescriptionByLanguage(description: string, language: string): string {
    // Apply language-specific translations while preserving IFC nomenclature
    let translated = description

    if (language === 'de') {
      translated = this.applyGermanTranslations(description)
    } else if (language === 'fr') {
      translated = this.applyFrenchTranslations(description)
    } else if (language === 'it') {
      translated = this.applyItalianTranslations(description)
    } else if (language === 'rm') {
      translated = this.applyRumantschTranslations(description)
    }

    // Normalize common artifacts that can appear when upstream already partially translated text
    return this.normalizeTranslatedDescription(translated, language)
  }

  /**
   * Apply German translations with professional BIM language
   */
  private applyGermanTranslations(description: string): string {
    let translated = description

    // Remove "The" prefix for cleaner German
    if (translated.startsWith('The ')) {
      translated = translated.substring(4)
    }

    // Professional German translations (keep IFC property names in English)
    translated = translated.replace(/shall have/g, 'muss haben')
    translated = translated.replace(/shall be/g, 'zwingend')
    translated = translated.replace(/one of/g, 'einer von')
    translated = translated.replace(/allowed values/g, 'zulässigen Werten')
    translated = translated.replace(/matching pattern/g, 'entsprechend dem Muster')
    translated = translated.replace(/shall be provided/g, 'zwingend erforderlich')
    translated = translated.replace(/ provided /g, ' erforderlich ')
    // Replace compound form first to avoid leaving a stray 'and'
    translated = translated.replace(/and in the dataset/g, 'und im PropertySet')
    translated = translated.replace(/in the dataset/g, 'im PropertySet')
    translated = translated.replace(/ muss /g, ' zwingend ')

    // Remove " sein" suffix for cleaner German
    if (translated.endsWith(' sein')) {
      translated = translated.substring(0, translated.length - 5)
    }

    return translated
  }

  /**
   * Apply French translations
   */
  private applyFrenchTranslations(description: string): string {
    let translated = description

    // Remove "The" prefix
    if (translated.startsWith('The ')) {
      translated = translated.substring(4)
    }

    // French translations (keep IFC property names in English)
    translated = translated.replace(/shall have/g, 'doit avoir')
    translated = translated.replace(/shall be/g, 'doit être')
    translated = translated.replace(/one of/g, "l'une des")
    translated = translated.replace(/allowed values/g, 'valeurs autorisées')
    translated = translated.replace(/matching pattern/g, 'correspondant au motif')
    translated = translated.replace(/shall be provided/g, 'doit être fourni')
    translated = translated.replace(/ provided /g, ' fourni ')
    // Replace compound form first to avoid leaving a stray 'and'
    translated = translated.replace(/and in the dataset/g, 'et dans le PropertySet')
    translated = translated.replace(/in the dataset/g, 'dans le PropertySet')

    return translated
  }

  /**
   * Apply Italian translations
   */
  private applyItalianTranslations(description: string): string {
    let translated = description

    // Remove "The" prefix
    if (translated.startsWith('The ')) {
      translated = translated.substring(4)
    }

    // Italian translations (keep IFC property names in English)
    translated = translated.replace(/shall have/g, 'deve avere')
    translated = translated.replace(/shall be/g, 'deve essere')
    translated = translated.replace(/one of/g, 'uno dei')
    translated = translated.replace(/allowed values/g, 'valori consentiti')
    translated = translated.replace(/matching pattern/g, 'corrispondente al modello')
    translated = translated.replace(/shall be provided/g, 'deve essere fornito')
    translated = translated.replace(/ provided /g, ' fornito ')
    // Replace compound form first to avoid leaving a stray 'and'
    translated = translated.replace(/and in the dataset/g, 'e nel PropertySet')
    translated = translated.replace(/in the dataset/g, 'nel PropertySet')

    return translated
  }

  /**
   * Apply Rumantsch translations
   */
  private applyRumantschTranslations(description: string): string {
    let translated = description

    // Remove "The" prefix
    if (translated.startsWith('The ')) {
      translated = translated.substring(4)
    }

    // Rumantsch translations (keep IFC property names in English)
    translated = translated.replace(/shall have/g, 'sto avair')
    translated = translated.replace(/shall be/g, 'sto esser')
    translated = translated.replace(/one of/g, 'ina da')
    translated = translated.replace(/allowed values/g, 'valurs permessas')
    translated = translated.replace(/matching pattern/g, 'correspundent al model')
    translated = translated.replace(/shall be provided/g, 'sto vegnir furnì')
    translated = translated.replace(/ provided /g, ' furnì ')
    // Replace compound form first to avoid leaving a stray 'and'
    translated = translated.replace(/and in the dataset/g, 'ed en il PropertySet')
    translated = translated.replace(/in the dataset/g, 'en il PropertySet')

    return translated
  }

  /**
   * Cleanup pass to remove artifacts like 'data' before verbs and stray 'and' before localized dataset phrase
   */
  private normalizeTranslatedDescription(text: string, language: string): string {
    let normalized = text

    // Remove ' data ' when it appears before the language verb (property descriptions)
    const verbByLang: Record<string, RegExp> = {
      de: /(zwingend|erforderlich)/,
      fr: /(doit être|fourni)/,
      it: /(deve essere|fornito)/,
      rm: /(sto esser|furnì)/,
      en: /(shall be|provided)/,
    }
    const verbPattern = verbByLang[language] || verbByLang['en']
    normalized = normalized.replace(new RegExp(`\\bdata\\s+(?=${verbPattern.source})`, 'i'), '')

    // Also fix generic case ' data ' immediately after a word (e.g., EarthquakeStructuralClass data zwingend → EarthquakeStructuralClass zwingend)
    normalized = normalized.replace(/(\b[\w-]+)\s+data\s+(?=[^\s])/i, '$1 ')

    // If upstream already translated 'in the dataset' but left a leading 'and ', remove that 'and '
    const datasetPhraseByLang: Record<string, RegExp> = {
      de: /and\s+(?=im PropertySet)/i,
      fr: /and\s+(?=dans le PropertySet)/i,
      it: /and\s+(?=nel PropertySet)/i,
      rm: /and\s+(?=en il PropertySet)/i,
      en: /and\s+(?=in the dataset)/i,
    }
    const andBeforeDataset = datasetPhraseByLang[language] || datasetPhraseByLang['en']
    normalized = normalized.replace(andBeforeDataset, '')

    return normalized
  }
}
