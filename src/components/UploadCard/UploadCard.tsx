import { useValidationContext } from '@context'
import {
  Alert,
  Box,
  Button,
  Center,
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
  Tooltip,
} from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconFile3d, IconFileText, IconUpload, IconX, IconDownload, IconInfoCircle } from '@tabler/icons-react'
import Mustache from 'mustache'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { processFile } from './processFile.ts'
import { UploadCardTitle } from './UploadCardTitle.tsx'

interface FileError {
  code: string
  message: string
  file: string
}

interface ProcessedResult {
  fileName: string
  result: any
}

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

  const openReportInNewTab = async (result: any, fileName: string) => {
    try {
      // Check if BCF data is available
      if (result.bcf_data) {
        // Create a Blob from the BCF data
        const bcfBlob = new Blob([result.bcf_data], { type: 'application/octet-stream' })

        // Create a download link
        const downloadUrl = window.URL.createObjectURL(bcfBlob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${fileName.replace(/\.[^/.]+$/, '')}_report.bcf`

        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up
        window.URL.revokeObjectURL(downloadUrl)
      }

      // Generate HTML report as before
      if (templateContent) {
        // Prepare the data for Mustache templating
        const templateData = {
          title: result.title || 'IFC Validation Report',
          date: result.date || new Date().toLocaleString(),
          filename: fileName || 'Unknown',
          status: result.status,
          specifications: result.specifications?.map((spec: any) => ({
            name: spec.name,
            status: spec.status,
            description: spec.description || '',
            instructions: spec.instructions,
            percent_checks_pass: spec.percent_checks_pass,
            total_checks: spec.total_checks,
            total_checks_pass: spec.total_checks_pass,
            total_applicable: spec.total_applicable,
            total_applicable_pass: spec.total_applicable_pass,
            requirements: spec.requirements?.map((req: any) => ({
              description: req.description,
              status: req.status,
              // Important: Add these flags for both passed and failed
              total_pass: req.passed_entities?.length > 0,
              total_fail: req.failed_entities?.length > 0,
              // Pass through all entities data
              passed_entities: req.passed_entities?.map((entity: any) => ({
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
              failed_entities: req.failed_entities?.map((entity: any) => ({
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
              // Add all the necessary flags for both passed and failed
              has_omitted_passes: req.has_omitted_passes,
              total_omitted_passes: req.total_omitted_passes,
              total_passed_entities: req.total_passed_entities,
              has_omitted_failures: req.has_omitted_failures,
              total_omitted_failures: req.total_omitted_failures,
              total_failed_entities: req.total_failed_entities,
              extra_of_type: req.extra_of_type,
            })),
          })),
          // Add summary stats
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
      console.error('Error generating report:', error)
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
          } catch (error: any) {
            console.error(`Error processing file ${file.name}:`, error)
            const errorDetails = error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
            const errorMessage = `Error processing ${file.name}: ${error.message || 'Unknown error'}${errorDetails}`
            setUploadError(errorMessage)
            return {
              fileName: file.name,
              result: {
                error: error.message,
                details: error.details,
              },
            }
          }
        }),
      )

      console.log('All files processed, results:', processedResults)
      setProcessedResults(processedResults)
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
    <Stack maw={{ base: '95%', sm: '70%' }} mx='auto' px={{ base: 'xs', sm: 'md', lg: 'xl' }} gap='md'>
      <Paper shadow='sm' p={{ base: 'md', sm: 'lg', lg: 'xl' }} withBorder>
        <Stack gap='md'>
          <Stack gap='md'>
            <UploadCardTitle isIdsValidation={isIdsValidation} />
            <Group align='center' gap='md' mt={{ base: 'xs', sm: 'md', lg: 'xl' }}>
              <Group gap='xs'>
                <Switch
                  checked={isIdsValidation}
                  onChange={(event) => setIsIdsValidation(event.currentTarget.checked)}
                  label={t('ids-validation')}
                />
                {isIdsValidation && (
                  <Stack gap={0}>
                    <Group gap='xs'>
                      <Text size='sm'>{t('report-format')}:</Text>
                      <Group gap='xs'>
                        <Group gap={4}>
                          <Checkbox
                            label='HTML'
                            checked={reportFormats.html}
                            onChange={(e) => setReportFormats((prev) => ({ ...prev, html: e.currentTarget.checked }))}
                          />
                          <Tooltip label={t('html-report')}>
                            <IconInfoCircle size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
                          </Tooltip>
                        </Group>
                        <Group gap={4}>
                          <Checkbox
                            label='BCF'
                            checked={reportFormats.bcf}
                            onChange={(e) => setReportFormats((prev) => ({ ...prev, bcf: e.currentTarget.checked }))}
                          />
                          <Tooltip label={t('bcf-report')}>
                            <IconInfoCircle size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
                          </Tooltip>
                        </Group>
                      </Group>
                    </Group>
                  </Stack>
                )}
              </Group>
            </Group>
            <Stack gap='xs' mt={{ base: 'md', lg: 'xl' }}>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.0`)}</Text>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.1`)}</Text>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.2`)}</Text>
              {isIdsValidation && (
                <Text size='sm' c='blue.7'>
                  {t('upload-description-ids.3')}
                </Text>
              )}
            </Stack>

            <Box mt={{ base: 'lg', lg: 'xl' }}>
              {isIdsValidation ? (
                <Stack maw='100%'>
                  <Grid gutter={{ base: 'xs', sm: 'md', lg: 'xl' }} style={{ width: '100%' }}>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Dropzone
                        onDrop={handleIfcDrop}
                        onReject={handleReject}
                        maxSize={500 * 1024 ** 2}
                        multiple={true}
                        validator={ifcValidator}
                        style={{ width: '100%', minHeight: '300px', height: '100%' }}
                      >
                        <Stack h='100%' gap='xs'>
                          <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '120px' }}>
                            <Stack align='center' justify='center' gap='xs'>
                              <Dropzone.Accept>
                                <IconUpload
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-blue-6)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Accept>
                              <Dropzone.Reject>
                                <IconX
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-red-6)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Reject>
                              <Dropzone.Idle>
                                <IconFile3d
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-dimmed)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Idle>

                              <Stack gap='xs'>
                                <Text size='lg'>{t('dropzone.drag.ifc')}</Text>
                                <Text size='sm' c='dimmed'>
                                  {t('dropzone.attach')}
                                </Text>
                              </Stack>
                            </Stack>
                          </Group>
                          <ScrollArea.Autosize mah={160}>
                            {ifcFiles?.map((file, index) => (
                              <Group key={index} gap='xs'>
                                <IconFile3d stroke={0.7} />
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
                        style={{ width: '100%', minHeight: '300px', height: '100%' }}
                      >
                        <Stack h='100%' gap='xs'>
                          <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '120px' }}>
                            <Stack align='center' justify='center' gap='xs'>
                              <Dropzone.Accept>
                                <IconUpload
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-blue-6)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Accept>
                              <Dropzone.Reject>
                                <IconX
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-red-6)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Reject>
                              <Dropzone.Idle>
                                <IconFileText
                                  style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-dimmed)' }}
                                  stroke={1.5}
                                />
                              </Dropzone.Idle>
                              <Stack gap='xs'>
                                <Text size='lg'>{t('dropzone.drag.ids')}</Text>
                                <Text size='sm' c='dimmed'>
                                  {t('dropzone.attach-single')}
                                </Text>
                              </Stack>
                            </Stack>
                          </Group>
                          <ScrollArea.Autosize mah={160}>
                            {idsFile && (
                              <Group gap='xs'>
                                <IconFileText stroke={0.7} />
                                <Text size='sm'>{idsFile.name}</Text>
                              </Group>
                            )}
                          </ScrollArea.Autosize>
                        </Stack>
                      </Dropzone>
                    </Grid.Col>
                  </Grid>
                </Stack>
              ) : (
                <Dropzone
                  onDrop={handleIfcDrop}
                  onReject={handleReject}
                  maxSize={500 * 1024 ** 2}
                  multiple={true}
                  validator={ifcValidator}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    maxWidth: '100%',
                    margin: '0 auto',
                  }}
                >
                  <Stack h='100%' gap='xs'>
                    <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '120px' }}>
                      <Stack align='center' justify='center' gap='xs'>
                        <Dropzone.Accept>
                          <IconUpload
                            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
                            stroke={1.5}
                          />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                          <IconX
                            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
                            stroke={1.5}
                          />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                          <IconFile3d
                            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
                            stroke={1.5}
                          />
                        </Dropzone.Idle>

                        <Stack gap='xs'>
                          <Text size='lg'>{t('dropzone.drag.ifc')}</Text>
                          <Text size='sm' c='dimmed'>
                            {t('dropzone.attach')}
                          </Text>
                        </Stack>
                      </Stack>
                    </Group>
                    <ScrollArea.Autosize mah={160}>
                      {ifcFiles?.map((file, index) => (
                        <Group key={index} gap='xs'>
                          <IconFile3d stroke={0.7} />
                          <Text size='sm'>{file.name}</Text>
                        </Group>
                      ))}
                    </ScrollArea.Autosize>
                  </Stack>
                </Dropzone>
              )}
            </Box>
            {errors && (
              <div>
                {errors.map((error, index) => (
                  <Text key={index} size='sm' c='red'>
                    {t('dropzone.error-message')}: {error.file} - {error.message}
                  </Text>
                ))}
              </div>
            )}
          </Stack>
          {isProcessing && (
            <Center
              style={{
                position: 'fixed',
                bottom: 'calc(var(--mantine-footer-height, 60px) + 1rem)',
                right: '1rem',
                width: 'auto',
                maxWidth: '600px',
                backgroundColor: 'transparent',
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              <Paper
                withBorder
                p='xs'
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--mantine-color-dark-4)',
                  fontFamily: 'monospace',
                  pointerEvents: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                {processingLogs.map((log, index) => (
                  <Text
                    key={index}
                    size='sm'
                    style={{
                      color: '#fff',
                      padding: '2px 0',
                      borderBottom: index !== processingLogs.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    }}
                  >
                    {log}
                  </Text>
                ))}
                {isProcessing && (
                  <Text
                    size='sm'
                    style={{
                      color: '#fff',
                      padding: '2px 0',
                      opacity: 0.7,
                    }}
                  >
                    {loadingDots}
                  </Text>
                )}
              </Paper>
            </Center>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} size='xl' mb='md' />}
          {uploadError && (
            <Alert color='red' title='Processing Error' mb='md'>
              {uploadError}
            </Alert>
          )}
          {processedResults.length > 0 && (
            <Alert color='green' title='Processing Complete' mb='md'>
              <Text>Your files have been processed.</Text>
              <Box maw={650}>
                <Group mt='sm' gap='xs' wrap='wrap'>
                  {processedResults.map((result, index) => (
                    <Group key={index} gap='xs'>
                      {reportFormats.html && (
                        <Button
                          onClick={() => openReportInNewTab(result.result, result.fileName)}
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
                          onClick={() => openReportInNewTab(result.result, result.fileName)}
                          color='blue'
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
              </Box>
            </Alert>
          )}
          <Button
            mt={{ base: 'md', lg: 'xl' }}
            onClick={handleClick}
            disabled={
              !ifcFiles.length ||
              (isIdsValidation && !idsFile) ||
              isProcessing ||
              (isIdsValidation && !reportFormats.html && !reportFormats.bcf)
            }
            styles={(theme) => ({
              label: {
                color: theme.colors.dark[9],
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
