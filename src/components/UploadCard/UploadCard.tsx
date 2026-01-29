import { useValidationContext } from '@context'
import { Box, Button, Paper, Stack, rem } from '@mantine/core'
import { FileRejection } from '@mantine/dropzone'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BcfData, downloadBcfReport } from '../../utils/bcfUtils'
import { ValidationResult } from '../../types/validation'
import { processFile } from './processFile.ts'
import {
  ErrorDisplay,
  FileDropzones,
  ProcessingConsole,
  ReportFormatOptions,
  ResultsDisplay,
  UploadInstructions,
} from './components'
import { UploadCardTitle } from './UploadCardTitle.tsx'
import { useFileProcessor } from './hooks'
import { useEnhancedHtmlReport } from './hooks/useEnhancedHtmlReport'
import { FileError } from './hooks/useFileProcessor'

export const UploadCard = () => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { t } = useTranslation()
  const { dispatch } = useValidationContext()
  const [ifcFiles, setIfcFiles] = useState<File[]>([])
  const [idsFile, setIdsFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FileError[] | null>(null)
  const [isIdsValidation, setIsIdsValidation] = useState(false)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
  const [templateContent, setTemplateContent] = useState<string | null>(null)
  const [reportFormats, setReportFormats] = useState({
    html: true,
    bcf: false,
  })
  const resultsRef = useRef<HTMLDivElement>(null)

  const addLog = (message: string) => {
    setProcessingLogs((prev) => [...prev, message])
  }

  const {
    isProcessing,
    uploadProgress,
    uploadError,
    processedResults,
    setUploadError,
    setProcessedResults,
    processFiles,
  } = useFileProcessor({
    i18n,
    addLog,
    reportFormats,
  })

  const { openHtmlReport, downloadHtmlReport } = useEnhancedHtmlReport(templateContent)

  // Function to scroll to results
  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  // Watch for when processing completes
  useEffect(() => {
    if (!isProcessing && processedResults.length > 0) {
      // Scroll to results when processing is complete
      setTimeout(scrollToResults, 200)
    }
  }, [isProcessing, processedResults.length])

  useEffect(() => {
    // Load the HTML template
    const loadTemplate = async () => {
      try {
        const response = await fetch('/report.html')
        const content = await response.text()
        setTemplateContent(content)
      } catch (error) {
        console.error('Failed to load template:', error)
      }
    }
    loadTemplate()
  }, [])

  const handleBcfDownload = (result: {
    fileName: string
    result: {
      bcf_data?: BcfData
    }
  }) => {
    if (result.result.bcf_data) {
      try {
        downloadBcfReport(result.result.bcf_data)
      } catch (error) {
        console.error('Failed to download BCF report:', error)
        setUploadError(`Failed to download BCF report: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      setUploadError('No BCF data available for download')
    }
  }

  const handleHtmlDownload = async (result: ValidationResult) => {
    try {
      await downloadHtmlReport(result)
    } catch (error) {
      console.error('Failed to download HTML report:', error)
      setUploadError(`Failed to download HTML report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleClick = async () => {
    setUploadError(null)
    setProcessedResults([])

    if (isIdsValidation && idsFile) {
      if (!ifcFiles.length) return
      await processFiles(ifcFiles, idsFile, isIdsValidation)
    } else {
      if (!ifcFiles.length) return
      ifcFiles.forEach((file) => {
        processFile({ file, dispatch, fileId: file.name })
      })
      navigate('/results')
    }

    setIfcFiles([])
    setIdsFile(null)
  }

  const handleIfcDrop = (acceptedFiles: File[]) => {
    setErrors([])
    setIfcFiles((prevFiles) => [...prevFiles, ...acceptedFiles])
  }

  const handleIdsDrop = (acceptedFiles: File[]) => {
    setErrors([])
    setIdsFile(acceptedFiles[0])
  }

  const handleReject = (fileRejections: FileRejection[]) => {
    setErrors(
      fileRejections.map((rejection) => ({
        code: rejection.errors[0].code,
        message: rejection.errors[0].message,
        file: rejection.file.name,
      })),
    )
  }

  return (
    <Stack maw={800} mx='auto' style={{ width: '100%', paddingTop: '30px' }}>
      <Paper p='md' radius='md' shadow='sm' withBorder>
        <Stack gap='md'>
          <UploadCardTitle isIdsValidation={isIdsValidation} />

          <ReportFormatOptions
            isIdsValidation={isIdsValidation}
            setIsIdsValidation={setIsIdsValidation}
            reportFormats={reportFormats}
            setReportFormats={setReportFormats}
          />

          <UploadInstructions isIdsValidation={isIdsValidation} />

          <Box>
            <FileDropzones
              isIdsValidation={isIdsValidation}
              ifcFiles={ifcFiles}
              idsFile={idsFile}
              onIfcDrop={handleIfcDrop}
              onIdsDrop={handleIdsDrop}
              onReject={handleReject}
            />
          </Box>

          <ErrorDisplay errors={errors} uploadProgress={uploadProgress} uploadError={uploadError} />

          <ProcessingConsole isProcessing={isProcessing} logs={processingLogs} />

          <div ref={resultsRef}>
            <ResultsDisplay
              processedResults={processedResults}
              reportFormats={reportFormats}
              onHtmlReport={openHtmlReport}
              onHtmlDownload={handleHtmlDownload}
              onBcfDownload={handleBcfDownload}
              resultsRef={resultsRef}
            />
          </div>

          <Button
            onClick={handleClick}
            disabled={
              !ifcFiles.length ||
              (isIdsValidation && !idsFile) ||
              isProcessing ||
              (isIdsValidation && !reportFormats.html && !reportFormats.bcf)
            }
            styles={(theme) => ({
              root: {
                height: rem(42),
                backgroundColor: theme.colors.yellow[5],
              },
              label: {
                color: theme.colors.dark[9],
                fontSize: theme.fontSizes.md,
              },
            })}
          >
            {isProcessing ? 'Processing...' : t('validate')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
