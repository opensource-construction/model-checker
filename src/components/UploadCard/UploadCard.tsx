import { useValidationContext } from '@context'
import { Box, Button, Paper, Stack, rem } from '@mantine/core'
import { FileRejection } from '@mantine/dropzone'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BcfData, downloadBcfReport } from '../../utils/bcfUtils'
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
import { useFileProcessor, useHtmlReport } from './hooks'
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
  })

  const { openHtmlReport } = useHtmlReport(templateContent, i18n)

  useEffect(() => {
    // Load the HTML template
    fetch('/report.html')
      .then((response) => response.text())
      .then((content) => {
        console.log('Template loaded, length:', content.length)
        setTemplateContent(content)
      })
      .catch((error) => console.error('Error loading template:', error))
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
    <Stack maw={800} mx='auto'>
      <Paper shadow='sm' p='md' withBorder radius='md'>
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

          <ResultsDisplay
            processedResults={processedResults}
            reportFormats={reportFormats}
            onHtmlReport={openHtmlReport}
            onBcfDownload={handleBcfDownload}
          />

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
