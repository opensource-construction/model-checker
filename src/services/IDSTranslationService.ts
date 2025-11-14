import { ValidationResult, ValidationSpecification, ValidationRequirement } from '../types/validation'

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
    translated.specifications = results.specifications.map((spec: ValidationSpecification) =>
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
  private translateSpecification(spec: ValidationSpecification, language: string): ValidationSpecification {
    const translated = { ...spec }

    // Handle skipped specifications (no applicable entities)
    const isSkipped = spec.total_applicable === 0 || spec.total_checks === 0

    // Translate status text
    translated.status_text = this.getStatusText(spec.status, language, isSkipped)

    // Set status to 'skipped' for proper template rendering
    if (isSkipped) {
      translated.status = 'skipped'
    }

    // Translate applicability descriptions
    translated.applicability =
      spec.applicability?.map((app: string) => this.translateApplicabilityText(app, language)) || []

    // Translate requirements
    translated.requirements = spec.requirements.map((req: ValidationRequirement) =>
      this.translateRequirement(req, language, isSkipped),
    )

    return translated
  }

  /**
   * Translate applicability text based on language
   */
  private translateApplicabilityText(applicability: string, language: string): string {
    let translated = this.normalizeApplicabilityText(applicability)

    // Handle "All X data" patterns first
    const allDataPattern = /All (.+?) data/
    const match = translated.match(allDataPattern)

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
      translated = translated.replace(/matches pattern/g, 'entspricht dem Muster')
      translated = translated.replace(/matching pattern/g, 'entsprechend dem Muster')
      translated = translated.replace(/is one of/g, 'ist einer von')
      translated = translated.replace(/equals one of/g, 'ist einer von')
      translated = translated.replace(/equals/g, 'ist')
      translated = translated.replace(/with value matching pattern/g, 'mit Wert entsprechend dem Muster')
      translated = translated.replace(/with value one of/g, 'mit Wert einer von')
      translated = translated.replace(/with value between/g, 'mit Wert zwischen')
      translated = translated.replace(/with value greater than or equal to/g, 'mit Wert mindestens')
      translated = translated.replace(/with value greater than/g, 'mit Wert grösser als')
      translated = translated.replace(/with value less than or equal to/g, 'mit Wert höchstens')
      translated = translated.replace(/with value less than/g, 'mit Wert kleiner als')
      translated = translated.replace(/with value/g, 'mit Wert')
      translated = translated.replace(/ data (?:equal to|of)/g, 'gleich')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'im ')
    } else if (language === 'fr') {
      translated = translated.replace(/Data where the/g, 'Données où')
      translated = translated.replace(/Elements with/g, 'Éléments avec')
      translated = translated.replace(/matches pattern/g, 'correspond au motif')
      translated = translated.replace(/matching pattern/g, 'correspondant au motif')
      translated = translated.replace(/is one of/g, 'est parmi')
      translated = translated.replace(/equals one of/g, 'est parmi')
      translated = translated.replace(/equals/g, 'est égal à')
      translated = translated.replace(/with value matching pattern/g, 'avec une valeur correspondant au motif')
      translated = translated.replace(/with value one of/g, 'avec une valeur parmi')
      translated = translated.replace(/with value between/g, 'avec une valeur entre')
      translated = translated.replace(/with value greater than or equal to/g, 'avec une valeur supérieure ou égale à')
      translated = translated.replace(/with value greater than/g, 'avec une valeur supérieure à')
      translated = translated.replace(/with value less than or equal to/g, 'avec une valeur inférieure ou égale à')
      translated = translated.replace(/with value less than/g, 'avec une valeur inférieure à')
      translated = translated.replace(/with value/g, 'avec une valeur')
      translated = translated.replace(/ data (?:equal to|of)/g, 'égal à')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'dans le ')
    } else if (language === 'it') {
      translated = translated.replace(/Data where the/g, 'Dati dove')
      translated = translated.replace(/Elements with/g, 'Elementi con')
      translated = translated.replace(/matches pattern/g, 'corrisponde al modello')
      translated = translated.replace(/matching pattern/g, 'corrispondente al modello')
      translated = translated.replace(/is one of/g, 'è uno dei')
      translated = translated.replace(/equals one of/g, 'è uno dei')
      translated = translated.replace(/equals/g, 'è uguale a')
      translated = translated.replace(/with value matching pattern/g, 'con valore corrispondente al modello')
      translated = translated.replace(/with value one of/g, 'con valore uno dei')
      translated = translated.replace(/with value between/g, 'con valore tra')
      translated = translated.replace(/with value greater than or equal to/g, 'con valore maggiore o uguale a')
      translated = translated.replace(/with value greater than/g, 'con valore maggiore di')
      translated = translated.replace(/with value less than or equal to/g, 'con valore minore o uguale a')
      translated = translated.replace(/with value less than/g, 'con valore minore di')
      translated = translated.replace(/with value/g, 'con valore')
      translated = translated.replace(/ data (?:equal to|of)/g, 'uguale a')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'nel ')
    } else if (language === 'rm') {
      translated = translated.replace(/Data where the/g, 'Datas nua che')
      translated = translated.replace(/Elements with/g, 'Elements cun')
      translated = translated.replace(/matches pattern/g, 'correspundent al model')
      translated = translated.replace(/matching pattern/g, 'correspundent al model')
      translated = translated.replace(/is one of/g, 'è ina da')
      translated = translated.replace(/equals one of/g, 'è ina da')
      translated = translated.replace(/equals/g, 'è ugual a')
      translated = translated.replace(/with value matching pattern/g, 'cun valur correspundent al model')
      translated = translated.replace(/with value one of/g, 'cun valur ina da')
      translated = translated.replace(/with value between/g, 'cun valur tranter')
      translated = translated.replace(/with value greater than or equal to/g, 'cun valur pli grond u egal a')
      translated = translated.replace(/with value greater than/g, 'cun valur pli grond che')
      translated = translated.replace(/with value less than or equal to/g, 'cun valur pli pitschen u egal a')
      translated = translated.replace(/with value less than/g, 'cun valur pli pitschen che')
      translated = translated.replace(/with value/g, 'cun valur')
      translated = translated.replace(/ data (?:equal to|of)/g, 'ugual a')
      translated = translated.replace(/in the dataset\s+(?=Pset)/g, 'en il ')
    }

    // Collapse any double spaces introduced during replacements
    translated = translated.replace(/\s{2,}/g, ' ').trim()

    return translated
  }

  private normalizeApplicabilityText(applicability: string): string {
    if (!applicability) {
      return ''
    }

    let normalized = applicability

    normalized = normalized.replace(/\{\{#applicability\}\}/g, '')
    normalized = normalized.replace(/\{\{\/applicability\}\}/g, '')
    normalized = normalized.replace(/\{\{\.\}\}/g, '')

    normalized = normalized.replace(/\{'pattern':\s*'([^']+)'\}/g, 'matching pattern "$1"')
    normalized = normalized.replace(/\{'enumeration':\s*\[([^\]]+)\]\}/g, 'one of $1')
    normalized = normalized.replace(/\{'value':\s*'([^']+)'\}/g, 'equals "$1"')
    normalized = normalized.replace(
      /\{'minInclusive':\s*'([^']+)',\s*'maxInclusive':\s*'([^']+)'\}/g,
      'between $1 and $2',
    )
    normalized = normalized.replace(/\{'minExclusive':\s*'([^']+)'\}/g, 'greater than $1')
    normalized = normalized.replace(/\{'minInclusive':\s*'([^']+)'\}/g, 'greater than or equal to $1')
    normalized = normalized.replace(/\{'maxExclusive':\s*'([^']+)'\}/g, 'less than $1')
    normalized = normalized.replace(/\{'maxInclusive':\s*'([^']+)'\}/g, 'less than or equal to $1')

    normalized = normalized.replace(/\s+/g, ' ').trim()

    return normalized
  }

  /**
   * Translate individual requirement
   */
  private translateRequirement(
    req: ValidationRequirement,
    language: string,
    isSpecSkipped: boolean,
  ): ValidationRequirement {
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
    const normalized = this.normalizeRequirementDescription(description)
    let translated = normalized

    if (language === 'de') {
      translated = this.applyGermanTranslations(normalized)
    } else if (language === 'fr') {
      translated = this.applyFrenchTranslations(normalized)
    } else if (language === 'it') {
      translated = this.applyItalianTranslations(normalized)
    } else if (language === 'rm') {
      translated = this.applyRumantschTranslations(normalized)
    }

    // Normalize common artifacts that can appear when upstream already partially translated text
    return this.normalizeTranslatedDescription(translated, language)
  }

  private normalizeRequirementDescription(description: string): string {
    if (!description) {
      return ''
    }

    let normalized = description.trim()

    normalized = normalized.replace(/\{\{'pattern':\s*'([^']+)'\}\}/g, 'matching pattern "$1"')
    normalized = normalized.replace(/\{\{'enumeration':\s*\[([^\]]+)\]\}\}/g, 'one of $1')
    normalized = normalized.replace(/\{\{'value':\s*'([^']+)'\}\}/g, 'equals "$1"')
    normalized = normalized.replace(
      /\{\{'minInclusive':\s*'([^']+)',\s*'maxInclusive':\s*'([^']+)'\}\}/g,
      'between $1 and $2',
    )
    normalized = normalized.replace(/\{\{'minExclusive':\s*'([^']+)'\}\}/g, 'greater than $1')
    normalized = normalized.replace(/\{\{'minInclusive':\s*'([^']+)'\}\}/g, 'greater than or equal to $1')
    normalized = normalized.replace(/\{\{'maxExclusive':\s*'([^']+)'\}\}/g, 'less than $1')
    normalized = normalized.replace(/\{\{'maxInclusive':\s*'([^']+)'\}\}/g, 'less than or equal to $1')

    normalized = normalized.replace(/\{'pattern':\s*'([^']+)'\}/g, 'matching pattern "$1"')
    normalized = normalized.replace(/\{'enumeration':\s*\[([^\]]+)\]\}/g, 'one of $1')
    normalized = normalized.replace(/\{'value':\s*'([^']+)'\}/g, 'equals "$1"')
    normalized = normalized.replace(
      /\{'minInclusive':\s*'([^']+)',\s*'maxInclusive':\s*'([^']+)'\}/g,
      'between $1 and $2',
    )
    normalized = normalized.replace(/\{'minExclusive':\s*'([^']+)'\}/g, 'greater than $1')
    normalized = normalized.replace(/\{'minInclusive':\s*'([^']+)'\}/g, 'greater than or equal to $1')
    normalized = normalized.replace(/\{'maxExclusive':\s*'([^']+)'\}/g, 'less than $1')
    normalized = normalized.replace(/\{'maxInclusive':\s*'([^']+)'\}/g, 'less than or equal to $1')

    normalized = normalized.replace(/\s+/g, ' ').trim()

    return normalized
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

  /**
   * Translate failure reason messages from validation engine
   * Covers all IfcTester failure reasons from facet.py Result classes
   */
  translateFailureReason(reason: string, language: string, t?: (key: string, defaultValue?: string) => string): string {
    if (!reason) {
      return reason
    }

    // EntityResult patterns
    const entityClassPattern = /The entity class\s+"([^"]+)"\s+does not meet the required IFC class/i
    const entityClassMatch = reason.match(entityClassPattern)
    if (entityClassMatch && t) {
      const actual = entityClassMatch[1]
      return t('report.errorMessages.entityClassDoesNotMeet', '').replace('{{actual}}', actual)
    }

    const predefinedTypePattern = /The predefined type\s+"([^"]+)"\s+does not meet the required type/i
    const predefinedTypeMatch = reason.match(predefinedTypePattern)
    if (predefinedTypeMatch && t) {
      const actual = predefinedTypeMatch[1]
      return t('report.errorMessages.predefinedTypeDoesNotMeet', '').replace('{{actual}}', actual)
    }

    // AttributeResult patterns
    if (reason === 'The required attribute did not exist' || reason.includes('required attribute did not exist')) {
      return t ? t('report.errorMessages.requiredAttributeNotExist', 'Das erforderliche Attribut existiert nicht') : reason
    }

    // Pattern: "The attribute value "X" is empty" - handle both straight and curly quotes
    const attributeEmptyPattern = /The attribute value\s+[""]([^""]+)[""]\s+is empty/i
    const attributeEmptyMatch = reason.match(attributeEmptyPattern)
    if (attributeEmptyMatch) {
      const actual = attributeEmptyMatch[1]
      if (t) {
        const translated = t('report.errorMessages.attributeValueEmpty', '')
        if (translated && translated.trim() !== '') {
          return translated.replace('{{actual}}', actual)
        }
      }
      // Fallback translations if t function not available or returns empty
      switch (language) {
        case 'de':
          return `Der Attributwert "${actual}" ist leer`
        case 'fr':
          return `La valeur de l'attribut "${actual}" est vide`
        case 'it':
          return `Il valore dell'attributo "${actual}" è vuoto`
        case 'rm':
          return `La valur da l'attribut "${actual}" è vida`
        default:
          return reason
      }
    }

    if (reason.includes('invalid attribute name was specified')) {
      return t ? t('report.errorMessages.invalidAttributeName', 'Ein ungültiger Attributname wurde in der IDS angegeben') : reason
    }

    // Pattern: "The attribute value "X" does not match the requirement"
    const attributeValuePattern = /The attribute value\s+"([^"]+)"\s+does not match the requirement/i
    const attributeMatch = reason.match(attributeValuePattern)
    if (attributeMatch && t) {
      const value = attributeMatch[1]
      return t('report.errorMessages.attributeValueDoesNotMatch', '').replace('{{value}}', value)
    }

    if (reason.includes('attribute value should not have met the requirement')) {
      return t ? t('report.errorMessages.attributeShouldNotMeet', 'Der Attributwert hätte die Anforderung nicht erfüllen dürfen') : reason
    }

    // ClassificationResult patterns
    if (reason === 'The entity has no classification' || reason.includes('entity has no classification')) {
      return t ? t('report.errorMessages.noClassification', 'Die Entität hat keine Klassifizierung') : reason
    }

    const referencesPattern = /The references\s+"([^"]+)"\s+do not match the requirements/i
    const referencesMatch = reason.match(referencesPattern)
    if (referencesMatch && t) {
      const actual = referencesMatch[1]
      return t('report.errorMessages.referencesDoNotMatch', '').replace('{{actual}}', actual)
    }

    const systemsPattern = /The systems\s+"([^"]+)"\s+do not match the requirements/i
    const systemsMatch = reason.match(systemsPattern)
    if (systemsMatch && t) {
      const actual = systemsMatch[1]
      return t('report.errorMessages.systemsDoNotMatch', '').replace('{{actual}}', actual)
    }

    if (reason.includes('classification should not have met the requirement')) {
      return t ? t('report.errorMessages.classificationShouldNotMeet', 'Die Klassifizierung hätte die Anforderung nicht erfüllen dürfen') : reason
    }

    // PartOfResult patterns
    if (reason === 'The entity has no relationship' || reason.includes('entity has no relationship')) {
      return t ? t('report.errorMessages.noRelationship', 'Die Entität hat keine Beziehung') : reason
    }

    const relationshipEntitiesPattern = /The entity has a relationship with incorrect entities:\s+"([^"]+)"/i
    const relationshipEntitiesMatch = reason.match(relationshipEntitiesPattern)
    if (relationshipEntitiesMatch && t) {
      const actual = relationshipEntitiesMatch[1]
      return t('report.errorMessages.relationshipIncorrectEntities', '').replace('{{actual}}', actual)
    }

    const relationshipPredefinedPattern = /The entity has a relationship with incorrect predefined type:\s+"([^"]+)"/i
    const relationshipPredefinedMatch = reason.match(relationshipPredefinedPattern)
    if (relationshipPredefinedMatch && t) {
      const actual = relationshipPredefinedMatch[1]
      return t('report.errorMessages.relationshipIncorrectPredefinedType', '').replace('{{actual}}', actual)
    }

    if (reason.includes('relationship should not have met the requirement')) {
      return t ? t('report.errorMessages.relationshipShouldNotMeet', 'Die Beziehung hätte die Anforderung nicht erfüllen dürfen') : reason
    }

    // PropertyResult patterns
    if (reason === 'The required property set does not exist' || reason.includes('required property set does not exist')) {
      return t ? t('report.errorMessages.propertySetNotExist', 'Der erforderliche PropertySet existiert nicht') : reason
    }

    if (reason === 'The property set does not contain the required property' || reason.includes('property set does not contain the required property')) {
      return t ? t('report.errorMessages.propertySetDoesNotContain', 'Der PropertySet enthält nicht die erforderliche Eigenschaft') : reason
    }

    const propertyDataTypePattern = /The property's data type\s+"([^"]+)"\s+does not match the required data type of\s+"([^"]+)"/i
    const propertyDataTypeMatch = reason.match(propertyDataTypePattern)
    if (propertyDataTypeMatch && t) {
      const actual = propertyDataTypeMatch[1]
      const dataType = propertyDataTypeMatch[2]
      return t('report.errorMessages.propertyDataTypeMismatch', '').replace('{{actual}}', actual).replace('{{dataType}}', dataType)
    }

    const propertyValuePattern = /The property value\s+"([^"]+)"\s+does not match the requirements/i
    const propertyValueMatch = reason.match(propertyValuePattern)
    if (propertyValueMatch && t) {
      const actual = propertyValueMatch[1]
      return t('report.errorMessages.propertyValueDoesNotMatch', '').replace('{{actual}}', actual)
    }

    const propertyValuesPattern = /The property values\s+"([^"]+)"\s+do not match the requirements/i
    const propertyValuesMatch = reason.match(propertyValuesPattern)
    if (propertyValuesMatch && t) {
      const actual = propertyValuesMatch[1]
      return t('report.errorMessages.propertyValuesDoNotMatch', '').replace('{{actual}}', actual)
    }

    if (reason.includes('property should not have met the requirement')) {
      return t ? t('report.errorMessages.propertyShouldNotMeet', 'Die Eigenschaft hätte die Anforderung nicht erfüllen dürfen') : reason
    }

    // MaterialResult patterns
    if (reason === 'The entity has no material' || reason.includes('entity has no material')) {
      return t ? t('report.errorMessages.noMaterial', 'Die Entität hat kein Material') : reason
    }

    const materialPattern = /The material names and categories of\s+"([^"]+)"\s+does not match the requirement/i
    const materialMatch = reason.match(materialPattern)
    if (materialMatch && t) {
      const actual = materialMatch[1]
      return t('report.errorMessages.materialDoesNotMatch', '').replace('{{actual}}', actual)
    }

    if (reason.includes('material should not have met the requirement')) {
      return t ? t('report.errorMessages.materialShouldNotMeet', 'Das Material hätte die Anforderung nicht erfüllen dürfen') : reason
    }

    // Pattern: "does not match the requirement" (standalone fallback)
    if (reason.includes('does not match the requirement')) {
      if (t) {
        return t('report.errorMessages.doesNotMatchRequirement', 'entspricht nicht der Anforderung')
      }
      // Fallback translations if t function not available
      switch (language) {
        case 'de':
          return reason.replace(/does not match the requirement/i, 'entspricht nicht der Anforderung')
        case 'fr':
          return reason.replace(/does not match the requirement/i, "ne correspond pas à l'exigence")
        case 'it':
          return reason.replace(/does not match the requirement/i, 'non corrisponde al requisito')
        case 'rm':
          return reason.replace(/does not match the requirement/i, "na correspunda betg a la pretensiun")
        default:
          return reason
      }
    }

    // Return original if no pattern matches
    return reason
  }
}
