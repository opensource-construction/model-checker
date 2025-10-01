import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IDSTranslationService } from '../../services/IDSTranslationService'
import { ValidationResult } from '../../types/validation'

interface HTMLTemplateRendererProps {
  validationResults: ValidationResult
  onReportGenerated: (htmlContent: string) => void
}

interface TemplateData {
  [key: string]: unknown
  t: {
    [key: string]: string | { [key: string]: string }
  }
}

/**
 * Component that generates HTML reports using the exact same template structure
 * as the current system, but with proper translation support
 */
export const HTMLTemplateRenderer: React.FC<HTMLTemplateRendererProps> = ({ validationResults, onReportGenerated }) => {
  const { t, i18n } = useTranslation()
  const [templateContent, setTemplateContent] = useState<string | null>(null)

  // Load the HTML template
  useEffect(() => {
    fetch('/report.html')
      .then((response) => response.text())
      .then((content) => {
        setTemplateContent(content)
      })
      .catch((error) => console.error('Error loading template:', error))
  }, [])

  const generateReport = useCallback(() => {
    if (!templateContent) return

    // Create translation service
    const translationService = new IDSTranslationService()

    // Translate the validation results
    const translatedResults = translationService.translateValidationResults(validationResults, i18n.language)

    // Prepare template data with translations
    const templateData: TemplateData = {
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
        moreOfSameType: t(
          'report.phrases.moreOfSameType',
          '... {{count}} more of the same element type ({{type}} with Tag {{tag}} and GlobalId {{id}}) not shown ...',
        ),
        moreElementsNotShown: t(
          'report.phrases.moreElementsNotShown',
          '... {{count}} more {{type}} elements not shown out of {{total}} total ...',
        ),
      },
    }

    // Use Mustache-like template replacement (simplified version)
    let htmlContent = templateContent

    // Replace template variables
    htmlContent = replaceMustacheVariables(htmlContent, templateData)

    // Apply additional translations for dynamic content
    htmlContent = applyDynamicTranslations(htmlContent)

    // Callback with the generated HTML
    onReportGenerated(htmlContent)
  }, [templateContent, validationResults, t, onReportGenerated])

  // Generate the report when template and results are ready
  useEffect(() => {
    if (templateContent && validationResults) {
      generateReport()
    }
  }, [templateContent, validationResults, i18n.language, generateReport])

  /**
   * Replace Mustache-style template variables with actual values
   */
  const replaceMustacheVariables = useCallback((template: string, data: TemplateData): string => {
    let result = template

    // Simple variable replacement
    const simpleVars = [
      'title',
      'filename',
      'date',
      '_lang',
      'total_specifications',
      'total_specifications_pass',
      'total_specifications_fail',
      'total_requirements',
      'total_requirements_pass',
      'total_requirements_fail',
      'total_checks',
      'total_checks_pass',
      'total_checks_fail',
      'percent_checks_pass',
      'status_text',
    ]

    simpleVars.forEach((varName) => {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
      const value = data[varName]
      const safe = typeof value === 'string' ? escapeHtml(value) : value
      result = result.replace(regex, () => String(safe ?? ''))
    })

    // Translation variables
    const translationVars = [
      't.summary',
      't.specifications',
      't.requirements',
      't.details',
      't.class',
      't.predefinedType',
      't.name',
      't.description',
      't.warning',
      't.globalId',
      't.tag',
      't.reportBy',
      't.and',
      't.status.pass',
      't.status.fail',
      't.status.untested',
      't.status.skipped',
      't.skipped',
      't.moreOfSameType',
      't.moreElementsNotShown',
    ]

    translationVars.forEach((varName) => {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
      const value = getNestedValue(data, varName)
      // Translations are controlled content - don't escape them
      result = result.replace(regex, () => String(value ?? ''))
    })

    // Handle conditional sections and loops
    result = processConditionalSections(result, data)
    result = processSpecificationLoops(result, data)

    return result
  }, [])

  /**
   * Get nested object value by dot notation
   */
  const getNestedValue = (obj: TemplateData, path: string): string | undefined => {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj) as string | undefined
  }

  /**
   * Process conditional sections in the template
   */
  const processConditionalSections = (template: string, data: TemplateData): string => {
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
    if (Number(data.total_checks) > 0) {
      result = result.replace(/\{\{\^total_checks\}\}.*?\{\{\/total_checks\}\}/g, '')
      result = result.replace(/\{\{#total_checks\}\}/g, '')
      result = result.replace(/\{\{\/total_checks\}\}/g, '')
    } else {
      result = result.replace(/\{\{#total_checks\}\}.*?\{\{\/total_checks\}\}/g, '')
      result = result.replace(/\{\{\^total_checks\}\}/g, '')
      result = result.replace(/\{\{\/total_checks\}\}/g, '')
    }

    return result
  }

  /**
   * Process specification loops in the template
   */
  const processSpecificationLoops = useCallback((template: string, data: TemplateData): string => {
    let result = template

    // Find and replace specification loop
    const specLoopRegex = /\{\{#specifications\}\}([\s\S]*?)\{\{\/specifications\}\}/g
    const specTemplate = template.match(specLoopRegex)?.[0]

    if (specTemplate && data.specifications && Array.isArray(data.specifications)) {
      const specContent = specTemplate.replace(/\{\{#specifications\}\}/, '').replace(/\{\{\/specifications\}\}/, '')

      const specHtml = data.specifications
        .map((spec: Record<string, unknown>) => {
          let specSection = specContent

          // Replace specification variables
          const specVars = [
            'name',
            'description',
            'instructions',
            'status_text',
            'total_checks',
            'total_checks_pass',
            'total_checks_fail',
            'percent_checks_pass',
          ]

          specVars.forEach((varName) => {
            const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
            const raw = spec[varName]
            const safe = typeof raw === 'string' ? escapeHtml(String(raw)) : raw
            specSection = specSection.replace(regex, () => String(safe ?? ''))
          })

          // Handle applicability loop
          if (spec.applicability && Array.isArray(spec.applicability) && spec.applicability.length > 0) {
            const appLoopRegex = /\{\{#applicability\}\}([\s\S]*?)\{\{\/applicability\}\}/g
            const appTemplate = specSection.match(appLoopRegex)?.[0]

            if (appTemplate) {
              const appContent = appTemplate
                .replace(/\{\{#applicability\}\}/, '')
                .replace(/\{\{\/applicability\}\}/, '')
              const appHtml = spec.applicability
                .map((app: string) => appContent.replace(/\{\{\.\}\}/g, () => escapeHtml(String(app))))
                .join('')

              specSection = specSection.replace(appLoopRegex, appHtml)
            }
          }

          // Handle requirements loop
          if (spec.requirements && Array.isArray(spec.requirements) && spec.requirements.length > 0) {
            const reqLoopRegex = /\{\{#requirements\}\}([\s\S]*?)\{\{\/requirements\}\}/g
            const reqTemplate = specSection.match(reqLoopRegex)?.[0]

            if (reqTemplate) {
              const reqContent = reqTemplate.replace(/\{\{#requirements\}\}/, '').replace(/\{\{\/requirements\}\}/, '')
              const reqHtml = spec.requirements
                .map((req: Record<string, unknown>) => {
                  let reqSection = reqContent

                  // Replace requirement variables
                  const reqVars = ['description', 'total_checks', 'total_pass', 'total_fail']
                  reqVars.forEach((varName) => {
                    const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
                    const raw = req[varName]
                    const safe = typeof raw === 'string' ? escapeHtml(String(raw)) : raw
                    reqSection = reqSection.replace(regex, () => String(safe ?? ''))
                  })

                  // Handle entity tables (passed and failed)
                  reqSection = processEntityTables(reqSection, req)

                  return reqSection
                })
                .join('')

              specSection = specSection.replace(reqLoopRegex, reqHtml)
            }
          }

          // Handle specification status conditionals
          if (spec.status) {
            specSection = specSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, 'pass')
            specSection = specSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, '')
          } else {
            specSection = specSection.replace(/\{\{#status\}\}pass\{\{\/status\}\}/g, '')
            specSection = specSection.replace(/\{\{\^status\}\}fail\{\{\/status\}\}/g, 'fail')
          }

          return specSection
        })
        .join('')

      result = result.replace(specLoopRegex, specHtml)
    }

    return result
  }, [])

  const normalizeEntityForTable = (entity: Record<string, unknown>) => ({
    type: entity.type ?? entity.class ?? '',
    predefinedType: entity.predefinedType ?? entity.predefined_type ?? '',
    name: entity.name ?? '',
    description: entity.description ?? '',
    globalId: entity.globalId ?? entity.global_id ?? '',
    tag: entity.tag ?? '',
    reason: entity.reason ?? '',
  })

  const escapeHtml = (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Process entity tables for passed and failed entities
   */
  const processEntityTables = (template: string, req: Record<string, unknown>): string => {
    let result = template

    // Process passed entities table
    if (req.passed_entities && Array.isArray(req.passed_entities) && req.passed_entities.length > 0) {
      const passedTableRegex = /\{\{#total_pass\}\}([\s\S]*?)\{\{\/total_pass\}\}/g
      const passedTemplate = result.match(passedTableRegex)?.[0]

      if (passedTemplate) {
        const tableContent = passedTemplate.replace(/\{\{#total_pass\}\}/, '').replace(/\{\{\/total_pass\}\}/, '')
        const entityRows = req.passed_entities
          .map((entity: Record<string, unknown>) => {
            const normalized = normalizeEntityForTable(entity)
            return `<tr>
            <td>${escapeHtml(String(normalized.type))}</td>
            <td>${escapeHtml(String(normalized.predefinedType))}</td>
            <td>${escapeHtml(String(normalized.name))}</td>
            <td>${escapeHtml(String(normalized.description))}</td>
            <td>${escapeHtml(String(normalized.globalId))}</td>
            <td>${escapeHtml(String(normalized.tag))}</td>
          </tr>`
          })
          .join('')

        const tableHtml = tableContent.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${entityRows}</tbody>`)

        result = result.replace(passedTableRegex, tableHtml)
      }
    } else {
      result = result.replace(/\{\{#total_pass\}\}[\s\S]*?\{\{\/total_pass\}\}/g, '')
    }

    // Process failed entities table
    if (req.failed_entities && Array.isArray(req.failed_entities) && req.failed_entities.length > 0) {
      const failedTableRegex = /\{\{#total_fail\}\}([\s\S]*?)\{\{\/total_fail\}\}/g
      const failedTemplate = result.match(failedTableRegex)?.[0]

      if (failedTemplate) {
        const tableContent = failedTemplate.replace(/\{\{#total_fail\}\}/, '').replace(/\{\{\/total_fail\}\}/, '')
        const entityRows = req.failed_entities
          .map((entity: Record<string, unknown>) => {
            const normalized = normalizeEntityForTable(entity)
            return `<tr>
            <td>${escapeHtml(String(normalized.type))}</td>
            <td>${escapeHtml(String(normalized.predefinedType))}</td>
            <td>${escapeHtml(String(normalized.name))}</td>
            <td>${escapeHtml(String(normalized.description))}</td>
            <td>${escapeHtml(String(normalized.reason))}</td>
            <td>${escapeHtml(String(normalized.globalId))}</td>
            <td>${escapeHtml(String(normalized.tag))}</td>
          </tr>`
          })
          .join('')

        const tableHtml = tableContent.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${entityRows}</tbody>`)

        result = result.replace(failedTableRegex, tableHtml)
      }
    } else {
      result = result.replace(/\{\{#total_fail\}\}[\s\S]*?\{\{\/total_fail\}\}/g, '')
    }

    return result
  }

  /**
   * Apply additional dynamic translations that couldn't be handled by template variables
   */
  const applyDynamicTranslations = (html: string): string => {
    const result = html

    // Apply any remaining pattern-based translations
    // This is where we can add more sophisticated translation logic if needed

    return result
  }

  return null // This component doesn't render anything visible
}

export default HTMLTemplateRenderer
