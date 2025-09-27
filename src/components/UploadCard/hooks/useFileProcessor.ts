import { useCallback, useState } from 'react'
import { ValidationResult } from '../../../types/validation'
import { i18n as I18nType } from 'i18next'

export interface FileError {
  code: string
  message: string
  file: string
}

export interface ProcessedResult {
  fileName: string
  result: ValidationResult
}

export interface UseFileProcessorProps {
  i18n: I18nType
  addLog: (message: string) => void
  reportFormats: { html: boolean; bcf: boolean }
}

export const useFileProcessor = ({ i18n, addLog, reportFormats }: UseFileProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([])

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return `Failed to read file: ${errorMessage}`
  }

  const processFiles = useCallback(
    async (ifcFiles: File[], idsFile: File | null, isIdsValidation: boolean) => {
      setIsProcessing(true)
      setUploadProgress(0)
      setUploadError(null)

      if (!idsFile && isIdsValidation) {
        setUploadError('IDS file is required for validation')
        setIsProcessing(false)
        return
      }

      let currentIdsContent: string | null = null
      if (isIdsValidation && idsFile) {
        addLog(i18n.t('console.loading.idsFile', 'Reading IDS file content...'))
        try {
          currentIdsContent = await idsFile.text()
        } catch (error) {
          const errorMsg = handleError(error)
          setUploadError(errorMsg)
          setIsProcessing(false)
          return
        }
      }

      const processedResults = await Promise.all(
        ifcFiles.map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer()
            const worker = new Worker('/pyodideWorkerClean.js')

            const result = await new Promise((resolve, reject) => {
              worker.onmessage = (event) => {
                if (event.data.type === 'progress') {
                  addLog(event.data.message)
                } else if (event.data.type === 'error') {
                  // Check if this is an out of memory error
                  if (event.data.errorType === 'out_of_memory') {
                    addLog(event.data.message)
                    // Set a timer to reload the page after showing the message
                    setUploadError(event.data.message)
                    setTimeout(() => {
                      window.location.reload()
                    }, 3000) // Wait 3 seconds before reloading
                  }
                  reject(new Error(event.data.message))
                } else if (event.data.type === 'complete') {
                  if (event.data.message) {
                    addLog(event.data.message)
                  }
                  resolve(event.data.results)
                } else {
                  reject(new Error('Invalid response from worker'))
                }
              }

              worker.onerror = (error) => {
                reject(new Error(error.message || 'Unknown worker error'))
              }

              worker.postMessage({
                arrayBuffer,
                idsContent: currentIdsContent,
                fileName: file.name,
                language: i18n.language,
                generateBcf: reportFormats.bcf.toString(),
                idsFilename: idsFile ? idsFile.name : null,
              })
            })

            return { fileName: file.name, result }
          } catch (error: unknown) {
            console.error(`Error processing file ${file.name}:`, error)
            const errorDetails =
              error instanceof Error && 'details' in error
                ? `\nDetails: ${JSON.stringify((error as { details: unknown }).details, null, 2)}`
                : ''
            const errorMessage = `Error processing ${file.name}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }${errorDetails}`
            setUploadError(errorMessage)
            return {
              fileName: file.name,
              result: {
                error: error instanceof Error ? error.message : 'Unknown error',
                details:
                  error instanceof Error && 'details' in error ? (error as { details: unknown }).details : undefined,
              },
            }
          }
        }),
      )

      // Clear and then set the results to ensure the state update is detected
      setProcessedResults([])
      setTimeout(() => {
        setProcessedResults(processedResults as ProcessedResult[])
      }, 10)
      setUploadProgress(100)
      setIsProcessing(false)
      return processedResults as ProcessedResult[]
    },
    [i18n, addLog, reportFormats.bcf],
  )

  return {
    isProcessing,
    uploadProgress,
    uploadError,
    processedResults,
    setUploadError,
    setProcessedResults,
    processFiles,
    handleError,
  }
}
