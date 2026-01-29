import Mustache from 'mustache'
import { useCallback } from 'react'
import { ValidationResult } from '../../../types/validation'
import { i18n as I18nType } from 'i18next'

export const useHtmlReport = (templateContent: string | null, i18n: I18nType) => {
  const openHtmlReport = useCallback(
    async (result: ValidationResult, fileName: string) => {
      try {
        if (templateContent) {
          const reportLanguage = result.language_code || result.ui_language || i18n.language || 'en'

          // If we have pre-rendered HTML content from the worker that's already translated
          if (result.html_content) {
            const newWindow = window.open()
            if (newWindow) {
              newWindow.document.write(result.html_content)
              newWindow.document.close()
              newWindow.document.title = `Report - ${fileName}`
            }
            return
          }

          // Fallback to Mustache template rendering
          // Prepare the data for Mustache templating
          const templateData = {
            ...result,
            title: result.title || 'IFC Validation Report',
            date: result.date || new Date().toLocaleString(),
            filename: fileName || 'Unknown',
            language: reportLanguage,
            t: result.t || {}, // Ensure translations are passed to template
          }

          // Render the template with Mustache
          const htmlContent = Mustache.render(templateContent, templateData)

          const newWindow = window.open()
          if (newWindow) {
            newWindow.document.write(htmlContent)
            newWindow.document.close()
            newWindow.document.title = `Report - ${fileName}`
          }
        }
      } catch (error) {
        console.error('Error generating HTML report:', error)
      }
    },
    [templateContent, i18n],
  )

  return { openHtmlReport }
}
