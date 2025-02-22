import { useValidationContext } from '@context'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Grid,
  Group,
  Paper,
  Progress,
  rem,
  ScrollArea,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconDownload, IconFile3d, IconFileText, IconUpload, IconX } from '@tabler/icons-react'
import Mustache from 'mustache'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ValidationEntity,
  ValidationRequirement,
  ValidationResult,
  ValidationSpecification,
} from '../../types/validation'
import { downloadBcfReport } from '../../utils/bcfUtils'
import { processFile } from './processFile.ts'
import { UploadCardTitle } from './UploadCardTitle.tsx'

interface FileError {
  code: string
  message: string
  file: string
}

interface ProcessedResult {
  fileName: string
  result: ValidationResult
}

const consoleStyles = {
  position: 'fixed',
  bottom: '60px', // Above footer
  right: '20px',
  width: '270px',
  maxHeight: '300px',
  zIndex: 1000,
  borderRadius: '8px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
  transition: 'all var(--theme-transition)',
} as const

export const UploadCard = () => {
  const navigate = useNavigate()
  const { dispatch } = useValidationContext()
  const [ifcFiles, setIfcFiles] = useState<File[]>([])
  const [idsFile, setIdsFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FileError[] | null>(null)
  const [isIdsValidation, setIsIdsValidation] = useState(false)
  const { t } = useTranslation()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
  const [templateContent, setTemplateContent] = useState<string | null>(null)
  const [loadingDots, setLoadingDots] = useState('')
  const [reportFormats, setReportFormats] = useState({
    html: true,
    bcf: false,
  })

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingDots((dots) => (dots.length >= 3 ? '' : dots + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

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

  const addLog = (message: string) => {
    setProcessingLogs((prev) => [...prev, message])
  }

  const openHtmlReport = async (result: ValidationResult, fileName: string) => {
    try {
      if (templateContent) {
        // Prepare the data for Mustache templating
        const templateData = {
          title: result.title || 'IFC Validation Report',
          date: result.date || new Date().toLocaleString(),
          filename: fileName || 'Unknown',
          status: result.status,
          specifications: result.specifications?.map((spec: ValidationSpecification) => ({
            name: spec.name,
            is_ifc_version: spec.is_ifc_version,
            status: spec.status,
            description: spec.description || '',
            instructions: spec.instructions,
            percent_checks_pass: spec.percent_checks_pass,
            total_checks: spec.total_checks || 0,
            total_checks_pass: spec.total_checks_pass || 0,
            total_applicable: spec.total_applicable || 0,
            total_applicable_pass: spec.total_applicable_pass || 0,
            requirements: spec.requirements?.map((req: ValidationRequirement) => ({
              description: req.description,
              status: req.status,
              total_pass: req.passed_entities?.length || 0,
              total_fail: req.failed_entities?.length || 0,
              passed_entities: req.passed_entities?.map((entity: ValidationEntity) => ({
                class: entity.class || '',
                predefined_type: entity.predefined_type || '',
                name: entity.name || '',
                description: entity.description || '',
                global_id: entity.global_id || '',
                tag: entity.tag || '',
                type_name: entity.type_name,
                type_tag: entity.type_tag,
                type_global_id: entity.type_global_id,
                extra_of_type: entity.extra_of_type,
              })),
              failed_entities: req.failed_entities?.map((entity: ValidationEntity) => ({
                class: entity.class || '',
                predefined_type: entity.predefined_type || '',
                name: entity.name || '',
                description: entity.description || '',
                reason: entity.reason || '',
                global_id: entity.global_id || '',
                tag: entity.tag || '',
                type_name: entity.type_name,
                type_tag: entity.type_tag,
                type_global_id: entity.type_global_id,
                extra_of_type: entity.extra_of_type,
              })),
              has_omitted_passes: req.has_omitted_passes,
              total_omitted_passes: req.total_omitted_passes,
              total_passed_entities: req.total_passed_entities,
              has_omitted_failures: req.has_omitted_failures,
              total_omitted_failures: req.total_omitted_failures,
              total_failed_entities: req.total_failed_entities,
              extra_of_type: req.extra_of_type,
            })),
          })),
          // Summary stats
          total_specifications: result.total_specifications,
          total_specifications_pass: result.total_specifications_pass,
          percent_specifications_pass: result.percent_specifications_pass,
          total_requirements: result.total_requirements,
          total_requirements_pass: result.total_requirements_pass,
          percent_requirements_pass: result.percent_requirements_pass,
          total_checks: result.total_checks,
          total_checks_pass: result.total_checks_pass,
          percent_checks_pass: result.percent_checks_pass,
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
  }

  const handleBcfDownload = (result: ProcessedResult) => {
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

  useEffect(() => {
    if (!processedResults.length) return
    console.log('Results ready for report generation')
  }, [processedResults, templateContent])

  const processFiles = useCallback(
    async (ifcFiles: File[], idsFile: File | null) => {
      setIsProcessing(true)
      setUploadProgress(0)
      setProcessingLogs([])
      console.log('Starting file processing...')

      if (!idsFile && isIdsValidation) {
        setUploadError('IDS file is required for validation')
        setIsProcessing(false)
        return
      }

      let currentIdsContent: string | null = null
      if (isIdsValidation && idsFile) {
        try {
          currentIdsContent = await idsFile.text()
        } catch (error) {
          const errorMsg = handleError(error)
          setUploadError(errorMsg)
          setIsProcessing(false)
          return
        }
      }

      // Fetch the reporter code
      let reporterCode: string | null = null
      try {
        const response = await fetch('/reporter.py')
        reporterCode = await response.text()
      } catch (error) {
        const errorMsg = handleError(error)
        setUploadError(errorMsg)
        setIsProcessing(false)
        return
      }

      const processedResults = await Promise.all(
        ifcFiles.map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer()
            const worker = new Worker('/pyodideWorker.js')

            const result = await new Promise((resolve, reject) => {
              worker.onmessage = (event) => {
                if (event.data.type === 'progress') {
                  addLog(event.data.message)
                } else if (event.data.type === 'error') {
                  reject(new Error(event.data.message))
                } else if (event.data.type === 'complete') {
                  console.log('Received worker result:', event.data.results)
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
                reporterCode,
                templateContent,
                fileName: file.name,
              })
            })

            console.log(`Adding result for file ${file.name}`)
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

      console.log('All files processed, results:', processedResults)
      setProcessedResults(processedResults as ProcessedResult[])
      setUploadProgress(100)
      setIsProcessing(false)
    },
    [isIdsValidation, templateContent],
  )

  const handleClick = async () => {
    setUploadError(null)
    setProcessedResults([])
    setUploadProgress(0)

    if (isIdsValidation && idsFile) {
      if (!ifcFiles.length) return
      await processFiles(ifcFiles, idsFile)
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
    setErrors(fileRejections.map((rejection) => ({ ...rejection.errors[0], file: rejection.file.name })))
  }

  const ifcValidator = (file: File) => {
    return file && file.name && file.name.endsWith('.ifc')
      ? null
      : { code: 'file-invalid-type', message: t('dropzone.error.ifc') }
  }

  const idsValidator = (file: File) => {
    return file && file.name && file.name.endsWith('.ids')
      ? null
      : { code: 'file-invalid-type', message: t('dropzone.error.ids') }
  }

  // Add type checking for errors
  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return `Failed to read IDS file: ${errorMessage}`
  }

  return (
    <Stack maw={800} mx='auto'>
      <Paper shadow='sm' p='md' withBorder radius='md'>
        <Stack gap='md'>
          <UploadCardTitle isIdsValidation={isIdsValidation} />

          <Group align='center'>
            <Switch
              checked={isIdsValidation}
              onChange={(event) => setIsIdsValidation(event.currentTarget.checked)}
              label={t('ids-validation')}
              size='md'
            />

            {isIdsValidation && (
              <Group gap='xs'>
                <Text size='sm' fw={500}>
                  {t('report-format')}:
                </Text>
                <Group gap='xs'>
                  <Checkbox
                    label='HTML'
                    checked={reportFormats.html}
                    onChange={(e) => setReportFormats((prev) => ({ ...prev, html: e.currentTarget.checked }))}
                    size='sm'
                  />
                  <Checkbox
                    label='BCF'
                    checked={reportFormats.bcf}
                    onChange={(e) => setReportFormats((prev) => ({ ...prev, bcf: e.currentTarget.checked }))}
                    size='sm'
                  />
                </Group>
              </Group>
            )}
          </Group>

          <Stack gap='xs'>
            <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.0`)}</Text>
            <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.1`)}</Text>
            <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.2`)}</Text>
            {isIdsValidation && (
              <Text size='sm' c='blue.7'>
                {t('upload-description-ids.3')}
              </Text>
            )}
          </Stack>

          <Box>
            {isIdsValidation ? (
              <Grid gutter='md'>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Dropzone
                    onDrop={handleIfcDrop}
                    onReject={handleReject}
                    maxSize={500 * 1024 ** 2}
                    multiple={true}
                    validator={ifcValidator}
                    styles={{
                      root: {
                        minHeight: '300px',
                        border: '1px dashed var(--mantine-color-gray-4)',
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    <Stack justify='center' align='center' h='100%' gap='xs'>
                      <Dropzone.Accept>
                        <IconUpload size={32} stroke={1.5} color='var(--mantine-color-blue-6)' />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <IconX size={32} stroke={1.5} color='var(--mantine-color-red-6)' />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <IconFile3d size={32} stroke={1.5} color='var(--mantine-color-dimmed)' />
                      </Dropzone.Idle>

                      <Text size='xl' inline>
                        {t('dropzone.drag.ifc')}
                      </Text>
                      <Text size='sm' color='dimmed' inline>
                        {t('dropzone.attach')}
                      </Text>

                      <ScrollArea.Autosize mah={100} mt='sm' w='100%' px='sm'>
                        {ifcFiles?.map((file, index) => (
                          <Group key={index} gap='xs'>
                            <IconFile3d size={16} />
                            <Text size='sm'>{file.name}</Text>
                          </Group>
                        ))}
                      </ScrollArea.Autosize>
                    </Stack>
                  </Dropzone>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Dropzone
                    onDrop={handleIdsDrop}
                    onReject={handleReject}
                    maxSize={5 * 1024 ** 2}
                    multiple={false}
                    validator={idsValidator}
                    styles={{
                      root: {
                        minHeight: '300px',
                        border: '1px dashed var(--mantine-color-gray-4)',
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    <Stack justify='center' align='center' h='100%' gap='xs'>
                      <Dropzone.Accept>
                        <IconUpload size={32} stroke={1.5} color='var(--mantine-color-blue-6)' />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <IconX size={32} stroke={1.5} color='var(--mantine-color-red-6)' />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <IconFileText size={32} stroke={1.5} color='var(--mantine-color-dimmed)' />
                      </Dropzone.Idle>

                      <Text size='xl' inline>
                        {t('dropzone.drag.ids')}
                      </Text>
                      <Text size='sm' color='dimmed' inline>
                        {t('dropzone.attach-single')}
                      </Text>

                      <ScrollArea.Autosize mah={100} mt='sm' w='100%' px='sm'>
                        {idsFile && (
                          <Group gap='xs'>
                            <IconFileText size={16} />
                            <Text size='sm'>{idsFile.name}</Text>
                          </Group>
                        )}
                      </ScrollArea.Autosize>
                    </Stack>
                  </Dropzone>
                </Grid.Col>
              </Grid>
            ) : (
              <Dropzone
                onDrop={handleIfcDrop}
                onReject={handleReject}
                maxSize={500 * 1024 ** 2}
                multiple={true}
                validator={ifcValidator}
                styles={{
                  root: {
                    minHeight: '300px',
                    border: '1px dashed var(--mantine-color-gray-4)',
                    backgroundColor: 'transparent',
                  },
                }}
              >
                <Stack justify='center' align='center' h='100%' gap='xs'>
                  <Dropzone.Accept>
                    <IconUpload size={32} stroke={1.5} color='var(--mantine-color-blue-6)' />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={32} stroke={1.5} color='var(--mantine-color-red-6)' />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFile3d size={32} stroke={1.5} color='var(--mantine-color-dimmed)' />
                  </Dropzone.Idle>

                  <Text size='xl' inline>
                    {t('dropzone.drag.ifc')}
                  </Text>
                  <Text size='sm' color='dimmed' inline>
                    {t('dropzone.attach')}
                  </Text>

                  <ScrollArea.Autosize mah={100} mt='sm' w='100%' px='sm'>
                    {ifcFiles?.map((file, index) => (
                      <Group key={index} gap='xs'>
                        <IconFile3d size={16} />
                        <Text size='sm'>{file.name}</Text>
                      </Group>
                    ))}
                  </ScrollArea.Autosize>
                </Stack>
              </Dropzone>
            )}
          </Box>

          {errors && errors.length > 0 && (
            <Alert color='red' variant='light'>
              {errors.map((error, index) => (
                <Text key={index} size='sm'>
                  {t('dropzone.error-message')}: {error.file} - {error.message}
                </Text>
              ))}
            </Alert>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} size='sm' mb='md' />}

          {uploadError && (
            <Alert color='red' variant='light' mb='md'>
              {uploadError}
            </Alert>
          )}

          {isProcessing && (
            <Paper withBorder p='md' style={consoleStyles}>
              <Group justify='apart' mb='xs'>
                <Text size='sm' fw={500} c='dimmed'>
                  Processing Logs
                </Text>
                <Text size='xs' c='dimmed'>
                  {processingLogs.length} entries
                </Text>
              </Group>

              <ScrollArea h={200} offsetScrollbars>
                <Stack gap='xs'>
                  {processingLogs.map((log, index) => (
                    <Text
                      key={index}
                      size='sm'
                      style={{
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'transparent',
                        borderRadius: '4px',
                      }}
                    >
                      {log}
                    </Text>
                  ))}
                  {isProcessing && (
                    <Text
                      size='sm'
                      style={{
                        color: 'var(--text-secondary)',
                        padding: '4px 8px',
                      }}
                    >
                      {loadingDots}
                    </Text>
                  )}
                </Stack>
              </ScrollArea>
            </Paper>
          )}

          {processedResults.length > 0 && (
            <Alert color='green' variant='light'>
              <Text>Your files have been processed.</Text>
              <Group mt='md' gap='sm'>
                {processedResults.map((result, index) => (
                  <Group key={index} gap='xs'>
                    {reportFormats.html && (
                      <Button
                        onClick={() => openHtmlReport(result.result, result.fileName)}
                        color='yellow'
                        variant='outline'
                        size='sm'
                        fw={500}
                        className='report-button'
                        leftSection={<IconFileText size={16} />}
                        styles={{
                          root: {
                            border: '2px solid var(--mantine-color-yellow-filled)',
                            color: 'var(--mantine-color-dark-6)',
                            backgroundColor: 'var(--mantine-color-yellow-1)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'var(--mantine-color-yellow-2)',
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 8px rgba(255, 213, 0, 0.35)',
                            },
                            '&:active': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 2px 4px rgba(255, 213, 0, 0.35)',
                            },
                          },
                        }}
                      >
                        HTML - {result.fileName}
                      </Button>
                    )}
                    {reportFormats.bcf && (
                      <Button
                        onClick={() => handleBcfDownload(result)}
                        variant='outline'
                        size='sm'
                        fw={500}
                        className='report-button'
                        leftSection={<IconDownload size={16} />}
                        styles={{
                          root: {
                            border: '2px solid var(--mantine-color-blue-filled)',
                            color: 'var(--mantine-color-dark-6)',
                            backgroundColor: 'var(--mantine-color-blue-1)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'var(--mantine-color-blue-2)',
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 8px rgba(0, 145, 255, 0.35)',
                            },
                            '&:active': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 2px 4px rgba(0, 145, 255, 0.35)',
                            },
                          },
                        }}
                      >
                        BCF - {result.fileName}
                      </Button>
                    )}
                  </Group>
                ))}
              </Group>
            </Alert>
          )}

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
