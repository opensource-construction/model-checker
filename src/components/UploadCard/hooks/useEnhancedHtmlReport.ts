import { useCallback } from 'react'
import { ValidationResult } from '../../../types/validation'
import { i18n as I18nType } from 'i18next'
import { IDSTranslationService, ValidationResult as IDSValidationResult } from '../../../services/IDSTranslationService'
import { useTranslation } from 'react-i18next'

export const useEnhancedHtmlReport = (templateContent: string | null, i18n: I18nType) => {
  const { t } = useTranslation()

  const generateHtmlContent = useCallback(
    async (result: ValidationResult): Promise<string> => {
      // Check if we have pre-generated HTML content from the worker
      if (result.html_content) {
        return result.html_content
      }

      // Fallback to generating HTML from structured data
      if (!templateContent) {
        throw new Error('Template content not loaded')
      }

      const reportLanguage = result.language_code || result.ui_language || i18n.language || 'en'

      // Optional debug info removed for production

      // Create translation service
      const translationService = new IDSTranslationService(t)
      
      // Translate the validation results
      const translatedResults = translationService.translateValidationResults(result as unknown as IDSValidationResult)

      // Generate HTML using our template renderer logic
      return await generateHtmlReport(templateContent, translatedResults as unknown as ValidationResult, t)
    },
    [templateContent, i18n, t],
  )

  const openHtmlReport = useCallback(
    async (result: ValidationResult, fileName: string) => {
      try {
        const htmlContent = await generateHtmlContent(result)

        // Robust viewer approach: store HTML in localStorage and open lightweight viewer with a stable URL
        const token = Math.random().toString(36).slice(2)
        try {
          // Build a detailed title matching original format
          const ifc = result.filename || 'report.ifc'
          const rawIds = (result as any).ids_filename || 'ids'
          const ids = (rawIds.split(/[\/\\]/).pop() || rawIds)
          const now = new Date()
          const yyyy = now.getFullYear()
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const dd = String(now.getDate()).padStart(2, '0')
          const yy = String(yyyy).slice(-2)
          const pageTitle = `${yy}${mm}${dd}-${ifc}-${ids}`

          const hasTitle = /<title>.*?<\/title>/i.test(htmlContent)
          const withTitle = hasTitle
            ? htmlContent.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}<\/title>`)
            : htmlContent.replace(/<head>/i, `<head><title>${pageTitle}<\/title>`)
          localStorage.setItem(`generated_report_html_${token}`, withTitle)
        } catch (e) {
          // Fallback to blob URL if storage is unavailable or full
          const ifc = result.filename || 'report.ifc'
          const rawIds = (result as any).ids_filename || 'ids'
          const ids = (rawIds.split(/[\/\\]/).pop() || rawIds)
          const now = new Date()
          const yyyy = now.getFullYear()
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const dd = String(now.getDate()).padStart(2, '0')
          const yy = String(yyyy).slice(-2)
          const pageTitle = `${yy}${mm}${dd}-${ifc}-${ids}`
          const hasTitle = /<title>.*?<\/title>/i.test(htmlContent)
          const withTitle = hasTitle
            ? htmlContent.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}<\/title>`)
            : htmlContent.replace(/<head>/i, `<head><title>${pageTitle}<\/title>`)
          const blob = new Blob([withTitle], { type: 'text/html;charset=utf-8' })
          const url = window.URL.createObjectURL(blob)
          window.open(url, '_blank', 'noopener')
          return
        }
        const viewerUrl = `/report-viewer.html?id=${token}`
        window.open(viewerUrl, '_blank', 'noopener')
      } catch (error) {
        console.error('Error generating HTML report:', error)
      }
    },
    [generateHtmlContent],
  )

  const downloadHtmlReport = useCallback(
    async (result: ValidationResult, fileName: string) => {
      try {
        const htmlContent = await generateHtmlContent(result)

        // Create a blob with the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        
        // Create download link
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName.replace(/\.[^/.]+$/, '')}_report.html`
        
        // Trigger download
        document.body.appendChild(link)
        link.click()
        
        // Cleanup
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error downloading HTML report:', error)
        throw new Error(`Failed to download HTML report: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [generateHtmlContent],
  )

  return { openHtmlReport, downloadHtmlReport }
}

/**
 * Generate HTML report using the template and translated data
 */
export async function generateHtmlReport(
  templateContent: string, 
  translatedResults: ValidationResult, 
  t: any
): Promise<string> {
  // Prepare template data with translations
  const templateData = {
    ...translatedResults,
    
    // Add translation object for template use
    t: {
      summary: t('report.summary', 'Summary'),
      specifications: t('report.specifications', 'Specifications'),
      requirements: t('report.requirements', 'Requirements'),
      details: t('report.details', 'Details'),
      class: t('report.class', 'Class'),
      predefinedType: t('report.predefinedType', 'PredefinedType'),
      name: t('report.name', 'Name'),
      description: t('report.description', 'Description'),
      warning: t('report.warning', 'Warning'),
      globalId: t('report.globalId', 'GlobalId'),
      tag: t('report.tag', 'Tag'),
      reportBy: t('report.reportBy', 'Report by'),
      and: t('report.and', 'and'),
      status: {
        pass: t('report.status.pass', 'PASS'),
        fail: t('report.status.fail', 'FAIL'),
        untested: t('report.status.untested', 'UNTESTED'),
        skipped: t('report.status.skipped', 'SKIPPED'),
      },
      skipped: t('report.status.skipped', 'SKIPPED'),
      checksPassedPrefix: t('report.interface.checksPassedPrefix', 'Checks passed'),
      elementsPassedPrefix: t('report.interface.elementsPassedPrefix', 'Elements passed'),
      specNotApplyToVersion: t('report.specNotApplyToVersion', 'specification does not apply to this IFC version'),
      failureReason: t('report.failureReason', 'Failure Reason'),
      moreOfSameType: t('report.phrases.moreOfSameType', 
        '... {{count}} more of the same element type ({{type}} with Tag {{tag}} and GlobalId {{id}}) not shown ...'),
      moreElementsNotShown: t('report.phrases.moreElementsNotShown', 
        '... {{count}} more {{type}} elements not shown out of {{total}} total ...'),
      specificationsPassedPrefix: t('report.specificationsPassedPrefix', 'Specifications passed'),
      requirementsPassedPrefix: t('report.requirementsPassedPrefix', 'Requirements passed'),
      applicability: t('report.applicability', 'Applicability'),
    }
  }

  // Use simplified template replacement
  let htmlContent = processSpecificationLoops(templateContent, templateData)

  // Replace translation variables (may appear inside injected specification sections)
  const translationVars = [
    't.summary', 't.specifications', 't.requirements', 't.details',
    't.class', 't.predefinedType', 't.name', 't.description', 't.warning',
    't.globalId', 't.tag', 't.reportBy', 't.and',
    't.status.pass', 't.status.fail', 't.status.untested', 't.status.skipped',
    't.skipped', 't.checksPassedPrefix', 't.elementsPassedPrefix', 't.specNotApplyToVersion',
    't.failureReason', 't.moreElementsNotShown',
    't.specificationsPassedPrefix', 't.requirementsPassedPrefix', 't.applicability'
  ]

  translationVars.forEach(varName => {
    const regex = new RegExp(`\{\{${varName}\}\}`, 'g')
    const value = getNestedValue(templateData, varName)
    // Use function replacement to avoid JS treating $-sequences (e.g. $1, $&) specially
    htmlContent = htmlContent.replace(regex, () => String(value ?? ''))
  })

  // Replace simple top-level variables after scoped content is inserted
  const simpleVars = [
    'title', 'filename', 'date', '_lang', 'total_specifications', 
    'total_specifications_pass', 'total_specifications_fail',
    'total_requirements', 'total_requirements_pass', 'total_requirements_fail',
    'total_checks', 'total_checks_pass', 'total_checks_fail', 
    'percent_checks_pass', 'status_text'
  ]

  simpleVars.forEach(varName => {
    const regex = new RegExp(`\{\{${varName}\}\}`, 'g')
    // Insert literally to preserve characters like $ in regex patterns
    htmlContent = htmlContent.replace(
      regex,
      () => String(templateData[varName as keyof ValidationResult] ?? ''),
    )
  })

  // Handle conditional sections
  htmlContent = processConditionalSections(htmlContent, templateData)

  // Debug: Check if requirements are in the final HTML
  const hasRequirements = htmlContent.includes('<summary>') && !htmlContent.includes('{{description}}')
  // Ensure progress bars reflect exact percentages by inlining width from data-width
  htmlContent = applyPercentWidths(htmlContent)
  return htmlContent
}

/**
 * Get nested object value by dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Process conditional sections in the template
 */
function processConditionalSections(template: string, data: any): string {
  let result = template

  // Handle status conditionals
  if (data.status) {
    result = result.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, 'pass')
    result = result.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, '')
  } else {
    result = result.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, '')
    result = result.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'fail')
  }

  // Handle total_checks conditionals
  if (data.total_checks > 0) {
    result = result.replace(/\{\{\^total_checks\}\}.*?\{\{\/total_checks\}\}/gs, '')
    result = result.replace(/\{\{#total_checks\}\}/g, '')
    result = result.replace(/\{\{\/total_checks\}\}/g, '')
  } else {
    result = result.replace(/\{\{#total_checks\}\}.*?\{\{\/total_checks\}\}/gs, '')
    result = result.replace(/\{\{\^total_checks\}\}/g, '')
    result = result.replace(/\{\{\/total_checks\}\}/g, '')
  }

  // Handle generic field conditionals for all string fields
  const fields = ['description', 'instructions', 'filename', 'is_ifc_version']
  fields.forEach(field => {
    const hasValue = data[field] && data[field].toString().trim() !== ''
    if (hasValue) {
      // If field exists, show content within {{#field}} and remove {{^field}} blocks
      const regex1 = new RegExp(`\\{\\{#${field}\\}\\}`, 'g')
      const regex2 = new RegExp(`\\{\\{\\/${field}\\}\\}`, 'g')
      const regex3 = new RegExp(`\\{\\{\\^${field}\\}\\}[\\s\\S]*?\\{\\{\\/${field}\\}\\}`, 'g')
      result = result.replace(regex1, '')
      result = result.replace(regex2, '')
      result = result.replace(regex3, '')
    } else {
      // If field doesn't exist, remove {{#field}} blocks and show {{^field}} content
      const regex1 = new RegExp(`\\{\\{#${field}\\}\\}[\\s\\S]*?\\{\\{\\/${field}\\}\\}`, 'g')
      const regex2 = new RegExp(`\\{\\{\\^${field}\\}\\}`, 'g')
      const regex3 = new RegExp(`\\{\\{\\/${field}\\}\\}`, 'g')
      result = result.replace(regex1, '')
      result = result.replace(regex2, '')
      result = result.replace(regex3, '')
    }
  })

  return result
}

/**
 * Process specification loops in the template
 */
function processSpecificationLoops(template: string, data: any): string {
  let result = template

  // Find and replace specification loop
  const specLoopRegex = /\{\{#specifications\}\}([\s\S]*?)\{\{\/specifications\}\}/g
  const specMatch = template.match(specLoopRegex)

  if (specMatch && data.specifications) {
    const specTemplate = specMatch[0]
    const specContent = specTemplate.replace(/\{\{#specifications\}\}/, '').replace(/\{\{\/specifications\}\}/, '')
    
    const specHtml = data.specifications.map((spec: any) => {
      let specSection = specContent
      
      // Handle specification-level conditionals
      const specFields = ['description', 'instructions', 'is_ifc_version']
      specFields.forEach(field => {
        const hasValue = spec[field] && spec[field].toString().trim() !== ''
        if (hasValue) {
          // If field exists, show content within {{#field}} and remove {{^field}} blocks
          const regex1 = new RegExp(`\\{\\{#${field}\\}\\}`, 'g')
          const regex2 = new RegExp(`\\{\\{\\/${field}\\}\\}`, 'g')
          const regex3 = new RegExp(`\\{\\{\\^${field}\\}\\}[\\s\\S]*?\\{\\{\\/${field}\\}\\}`, 'g')
          specSection = specSection.replace(regex1, '')
          specSection = specSection.replace(regex2, '')
          specSection = specSection.replace(regex3, '')
        } else {
          // If field doesn't exist, remove {{#field}} blocks and show {{^field}} content
          const regex1 = new RegExp(`\\{\\{#${field}\\}\\}[\\s\\S]*?\\{\\{\\/${field}\\}\\}`, 'g')
          const regex2 = new RegExp(`\\{\\{\\^${field}\\}\\}`, 'g')
          const regex3 = new RegExp(`\\{\\{\\/${field}\\}\\}`, 'g')
          specSection = specSection.replace(regex1, '')
          specSection = specSection.replace(regex2, '')
          specSection = specSection.replace(regex3, '')
        }
      })

      // Handle applicability loop
      if (spec.applicability && spec.applicability.length > 0) {
        const appLoopRegex = /\{\{#applicability\}\}([\s\S]*?)\{\{\/applicability\}\}/g
        const appMatch = specSection.match(appLoopRegex)
        
        if (appMatch) {
          const appTemplate = appMatch[0]
          const appContent = appTemplate.replace(/\{\{#applicability\}\}/, '').replace(/\{\{\/applicability\}\}/, '')
          const appHtml = spec.applicability.map((app: string) => 
            appContent.replace(/\{\{\.\}\}/g, app)
          ).join('')
          
          specSection = specSection.replace(appLoopRegex, appHtml)
        }
      } else {
        specSection = specSection.replace(/\{\{#applicability\}\}[\s\S]*?\{\{\/applicability\}\}/g, '')
      }

      // Handle requirements loop
      if (spec.requirements && spec.requirements.length > 0) {
        const reqLoopRegex = /\{\{#requirements\}\}([\s\S]*?)\{\{\/requirements\}\}/g
        const reqMatch = specSection.match(reqLoopRegex)
        
        if (reqMatch) {
          const reqTemplate = reqMatch[0]
          const reqContent = reqTemplate.replace(/\{\{#requirements\}\}/, '').replace(/\{\{\/requirements\}\}/, '')
          const reqHtml = spec.requirements.map((req: any) => {
            let reqSection = reqContent
            // Replace requirement variables - but protect entity table placeholders
            // First, temporarily protect entity table sections from replacement
            const entityTableProtected = reqSection.replace(
              /(\{\{#(?:passed|failed)_entities\}\}[\s\S]*?\{\{\/(?:passed|failed)_entities\}\})/g,
              (match) => match.replace(/\{\{/g, '[[PROTECT[[').replace(/\}\}/g, ']]PROTECT]]')
            )
            
            // Replace requirement variables
            const reqVars = ['description', 'total_checks', 'total_pass', 'total_fail', 'status', 'cardinality']
            let processedSection = entityTableProtected
            reqVars.forEach(varName => {
              const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
              // Use nullish coalescing to preserve 0 and false values
              const value = req[varName] ?? ''
              processedSection = processedSection.replace(regex, () => String(value))
            })
            
            // Restore protected placeholders
            reqSection = processedSection.replace(/\[\[PROTECT\[\[/g, '{{').replace(/\]\]PROTECT\]\]/g, '}}')

            // Handle requirement status conditionals
            if (req.status === 'skipped') {
              reqSection = reqSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, '')
              reqSection = reqSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'skipped')
            } else if (req.status) {
              reqSection = reqSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, 'pass')
              reqSection = reqSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, '')
            } else {
              reqSection = reqSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, '')
              reqSection = reqSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'fail')
            }

            // Handle total check conditionals
            const hasChecks = Number(req.total_checks) > 0
            if (hasChecks) {
              reqSection = applyConditional(reqSection, 'total_checks', true)
            } else {
              // For skipped requirements (total_checks = 0), replace the entire content with just the description
              reqSection = reqSection.replace(/\{\{#total_checks\}\}[\s\S]*?\{\{\/total_checks\}\}/g, '')
              reqSection = reqSection.replace(/\{\{\^total_checks\}\}([\s\S]*?)\{\{\/total_checks\}\}/g, '$1')
            }
            reqSection = reqSection.replace(/<table class="skipped">[\s\S]*?<\/table>/g, '')

            // Handle entity tables
            reqSection = processEntityTables(reqSection, req)

            return reqSection
          }).join('')
          
          specSection = specSection.replace(reqLoopRegex, () => reqHtml)
        }
      } else {
        specSection = specSection.replace(/\{\{#requirements\}\}[\s\S]*?\{\{\/requirements\}\}/g, '')
      }

      // Handle specification status conditionals
      if (spec.status === 'skipped') {
        specSection = specSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, 'skipped')
        specSection = specSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'skipped')
      } else if (spec.status) {
        specSection = specSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, 'pass')
        specSection = specSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, '')
      } else {
        specSection = specSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, '')
        specSection = specSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'fail')
      }

      // Replace specification variables - expanded list (after processing loops to avoid clobbering nested placeholders)
      const specVars = ['name', 'description', 'instructions', 'status_text', 'identifier',
                       'total_checks', 'total_checks_pass', 'total_checks_fail', 'percent_checks_pass',
                       'total_applicable', 'total_applicable_pass', 'total_applicable_fail',
                       'failed_entities', 'applicable_entities']

      specVars.forEach(varName => {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
        // Use nullish coalescing to preserve 0 and false values
        const value = String(spec[varName] ?? '')
        specSection = specSection.replace(regex, () => value)
      })

      return specSection
    }).join('')

    // Use function replacement to avoid $-sequence interpretation
    result = result.replace(specLoopRegex, () => specHtml)
  }

  return result
}

/**
 * Process entity tables for passed and failed entities
 */
function processEntityTables(template: string, req: any): string {
  let result = template

  // Process passed entities table
  if (req.total_pass > 0 && req.passed_entities && req.passed_entities.length > 0) {
    const passedTableRegex = /\{\{#total_pass\}\}([\s\S]*?)\{\{\/total_pass\}\}/g
    const passedMatch = result.match(passedTableRegex)
    
    if (passedMatch) {
      const tableTemplate = passedMatch[0]
      const tableContent = tableTemplate.replace(/\{\{#total_pass\}\}/, '').replace(/\{\{\/total_pass\}\}/, '')
      const rowTemplateMatch = tableContent.match(/\{\{#passed_entities\}\}([\s\S]*?)\{\{\/passed_entities\}\}/)
      let rowTemplate = ''
      if (rowTemplateMatch) {
        const rowTemplateRaw = rowTemplateMatch[1]
        // Extract just the first <tr>...</tr> as the template
        const firstTrMatch = rowTemplateRaw.match(/<tr[^>]*>([\s\S]*?)<\/tr>/)
        if (firstTrMatch) {
          rowTemplate = firstTrMatch[0]
        }
      }

      const omittedPassesRegex = /\{\{#has_omitted_passes\}\}([\s\S]*?)\{\{\/has_omitted_passes\}\}/
      const omittedPassesMatch = tableContent.match(omittedPassesRegex)
      const omittedPassesContent = omittedPassesMatch ? omittedPassesMatch[1] : ''

      const entityRows = req.passed_entities.slice(0, 10).map((entity: any) =>
        rowTemplate
          .replace(/\{\{class\}\}/g, () => escapeHtml(getEntityValue(entity, ['class', 'type'])))
          .replace(/\{\{predefined_type\}\}/g, () => escapeHtml(getEntityValue(entity, ['predefined_type', 'predefinedType'])))
          .replace(/\{\{name\}\}/g, () => escapeHtml(getEntityValue(entity, ['name'])))
          .replace(/\{\{description\}\}/g, () => escapeHtml(getEntityValue(entity, ['description'])))
          .replace(/\{\{global_id\}\}/g, () => escapeHtml(getEntityValue(entity, ['global_id', 'globalId'])))
          .replace(/\{\{tag\}\}/g, () => escapeHtml(getEntityValue(entity, ['tag'])))
      ).join('')

      let tableHtml = tableContent
        .replace(/\{\{#passed_entities\}\}[\s\S]*?\{\{\/passed_entities\}\}/, entityRows)

      tableHtml = tableHtml.replace(omittedPassesRegex, req.has_omitted_passes ? omittedPassesContent : '')

      result = result.replace(passedTableRegex, tableHtml)
    }
  } else {
    result = result.replace(/\{\{#total_pass\}\}[\s\S]*?\{\{\/total_pass\}\}/g, '')
  }

  // Process failed entities table  
  if (req.total_fail > 0 && req.failed_entities && req.failed_entities.length > 0) {
    const failedTableRegex = /\{\{#total_fail\}\}([\s\S]*?)\{\{\/total_fail\}\}/g
    const failedMatch = result.match(failedTableRegex)
    
    if (failedMatch) {
      const tableTemplate = failedMatch[0]
      const tableContent = tableTemplate.replace(/\{\{#total_fail\}\}/, '').replace(/\{\{\/total_fail\}\}/, '')

      // Generate entity rows
      const rowTemplateMatch = tableContent.match(/\{\{#failed_entities\}\}([\s\S]*?)\{\{\/failed_entities\}\}/)
      let rowTemplate = ''
      if (rowTemplateMatch) {
        const rowTemplateRaw = rowTemplateMatch[1]
        // Extract just the first <tr>...</tr> as the template
        const firstTrMatch = rowTemplateRaw.match(/<tr[^>]*>([\s\S]*?)<\/tr>/)
        if (firstTrMatch) {
          rowTemplate = firstTrMatch[0]
        }
      }

      const omittedFailuresRegex = /\{\{#has_omitted_failures\}\}([\s\S]*?)\{\{\/has_omitted_failures\}\}/
      const omittedFailuresMatch = tableContent.match(omittedFailuresRegex)
      const omittedFailuresContent = omittedFailuresMatch ? omittedFailuresMatch[1] : ''

      const entityRows = req.failed_entities.slice(0, 10).map((entity: any) =>
        rowTemplate
          .replace(/\{\{class\}\}/g, () => escapeHtml(getEntityValue(entity, ['class', 'type'])))
          .replace(/\{\{predefined_type\}\}/g, () => escapeHtml(getEntityValue(entity, ['predefined_type', 'predefinedType'])))
          .replace(/\{\{name\}\}/g, () => escapeHtml(getEntityValue(entity, ['name'])))
          .replace(/\{\{description\}\}/g, () => escapeHtml(getEntityValue(entity, ['description'])))
          .replace(/\{\{reason\}\}/g, () => escapeHtml(getEntityValue(entity, ['reason']) || 'Validation failed'))
          .replace(/\{\{global_id\}\}/g, () => escapeHtml(getEntityValue(entity, ['global_id', 'globalId'])))
          .replace(/\{\{tag\}\}/g, () => escapeHtml(getEntityValue(entity, ['tag'])))
      ).join('')

      let tableHtml = tableContent
        .replace(/\{\{#failed_entities\}\}[\s\S]*?\{\{\/failed_entities\}\}/, entityRows)

      tableHtml = tableHtml.replace(omittedFailuresRegex, req.has_omitted_failures ? omittedFailuresContent : '')

      result = result.replace(failedTableRegex, tableHtml)
    }
  } else {
    result = result.replace(/\{\{#total_fail\}\}[\s\S]*?\{\{\/total_fail\}\}/g, '')
  }

  return result
}

function applyConditional(template: string, field: string, condition: boolean): string {
  const positiveRegex = new RegExp(`\{\{#${field}\}\}([\s\S]*?)\{\{\/${field}\}\}`, 'g')
  const negativeRegex = new RegExp(`\{\{\^${field}\}\}([\s\S]*?)\{\{\/${field}\}\}`, 'g')

  if (condition) {
    template = template.replace(positiveRegex, '$1')
    template = template.replace(negativeRegex, '')
  } else {
    template = template.replace(positiveRegex, '')
    template = template.replace(negativeRegex, '$1')
  }

  return template
}

function getEntityValue(entity: any, keys: string[]): string {
  for (const key of keys) {
    if (entity && entity[key] !== undefined && entity[key] !== null) {
      return String(entity[key])
    }
  }
  return ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Convert data-width values on percent bars into inline width styles
 */
function applyPercentWidths(html: string): string {
  // Match only divs that have class including "percent" and a data-width numeric value
  const regex = /(<div[^>]*class="[^"]*percent[^"]*"[^>]*?)data-width=("|')?(\d{1,3})(\2)?([^>]*>)/g
  return html.replace(regex, (match, pre, quote, num, _q2, post) => {
    const width = Math.max(0, Math.min(100, Number(num)))
    // If a style attribute already exists in pre or post, just append width declaration at the end of pre
    if (/style=/.test(pre)) {
      return `${pre.replace(/style=("|')/i, (m, q) => `style=${q}width: ${width}%; `)}data-width=${quote || ''}${width}${quote || ''}${post}`
    }
    return `${pre}data-width=${quote || ''}${width}${quote || ''} style="width: ${width}%;"${post}`
  })
}
