import { useState, useEffect, useCallback } from 'react'
import { Button, Divider, Group, rem, Stack, Text, Switch, Progress, Alert, Modal, Loader, Center, Paper, Grid, SimpleGrid, Title, ScrollArea, Code } from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconFile3d, IconUpload, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { UploadCardTitle } from './UploadCardTitle.tsx'
import { useNavigate } from 'react-router-dom'
import { useValidationContext } from '@context'
import { processFile } from './processFile.ts'

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
  const [idsContent, setIdsContent] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, message])
  }

  // Function to open HTML report in new tab
  const openReportInNewTab = (htmlContent: string, fileName: string) => {
    try {
      // Create data URL from HTML content
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

      // Try to open in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.title = `Report - ${fileName}`;
        newWindow.document.close();
        console.log(`Successfully opened report for ${fileName}`);
      } else {
        console.warn(`Popup blocked for ${fileName} - manual button will be available`);
      }
    } catch (error) {
      console.error(`Failed to open report for ${fileName}:`, error);
    }
  };

  // Render manual open button for a result
  const renderResultActions = (result: ProcessedResult) => {
    if (!result.result?.html_report) return null;

    return (
      <Button
        onClick={() => openReportInNewTab(result.result.html_report, result.fileName)}
        size="sm"
        variant="light"
        mt="xs"
      >
        Open Report for {result.fileName}
      </Button>
    );
  };

  const processFiles = useCallback(async (ifcFiles: File[], idsFile: File | null) => {
    setIsProcessing(true)
    setUploadProgress(0)
    setProcessingLogs([])
    console.log('Starting file processing...')
    const totalFiles = ifcFiles.length
    const results: ProcessedResult[] = []

    if (!idsFile && isIdsValidation) {
      setUploadError('IDS file is required for validation')
      setIsProcessing(false)
      return
    }

    let currentIdsContent: string | null = null;
    if (isIdsValidation && idsFile) {
      try {
        currentIdsContent = await idsFile.text()
      } catch (error) {
        const errorMsg = `Failed to read IDS file: ${error.message}`
        setUploadError(errorMsg)
        setIsProcessing(false)
        return
      }
    }

    for (let i = 0; i < totalFiles; i++) {
      const file = ifcFiles[i]
      try {
        console.log(`Processing file ${i + 1}/${totalFiles}: ${file.name}`)
        const arrayBuffer = await file.arrayBuffer()
        const worker = new Worker('/pyodideWorker.js')

        const result = await new Promise((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.type === 'progress') {
              addLog(event.data.message)
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.message))
            } else if (event.data.result) {
              console.log('Received worker result:', event.data.result)
              resolve(event.data.result)
            } else {
              reject(new Error('Invalid response from worker'))
            }
          }

          worker.onerror = (error) => {
            reject(new Error(error.message || 'Unknown worker error'))
          }

          worker.postMessage({
            arrayBuffer,
            idsContent: currentIdsContent
          })
        })

        console.log(`Adding result for file ${file.name}`)
        results.push({ fileName: file.name, result })
        setUploadProgress(((i + 1) / totalFiles) * 100)
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error)
        const errorDetails = error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
        const errorMessage = `Error processing ${file.name}: ${error.message || 'Unknown error'}${errorDetails}`
        setUploadError(errorMessage)
        results.push({
          fileName: file.name,
          result: {
            error: error.message,
            details: error.details
          }
        })
      }
    }

    console.log('All files processed, results:', results)
    setProcessedResults(results)
    setUploadProgress(100)
    setIsProcessing(false)

    // Attempt to open HTML reports automatically
    console.log('Attempting to open HTML reports...')
    results.forEach(result => {
      console.log(`Checking result for ${result.fileName}:`, result)
      if (result.result?.html_report) {
        openReportInNewTab(result.result.html_report, result.fileName)
      } else {
        console.log(`No HTML report found for ${result.fileName}`)
      }
    })
  }, [isIdsValidation])

  const handleClick = async () => {
    setUploadError(null)
    setProcessedResults([])
    setUploadProgress(0)

    if (isIdsValidation && idsFile) {
      if (!ifcFiles.length) return
      await processFiles(ifcFiles, idsFile)
    } else {
      if (!ifcFiles.length) return
      // Use standard validation for each file
      ifcFiles.forEach((file) => {
        processFile({ file, dispatch, fileId: file.name })
      })
      navigate('/results')
    }

    // Clear files after processing
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

  return (
    <Stack>
      <Paper hide={false}>
        <Stack spacing="md">
          <Stack>
            <UploadCardTitle />
            <Divider py={8} />
            <Group justify='apart' mb='md'>
              <Text>{t('validation-type')}:</Text>
              <Switch
                checked={isIdsValidation}
                onChange={(event) => setIsIdsValidation(event.currentTarget.checked)}
                label={isIdsValidation ? t('ids-validation') : t('standard-validation')}
              />
            </Group>
            <Stack maw={650} gap='xs'>
              <Text size='sm'>{t('upload-description.0')}</Text>
              <Text size='sm'>{t('upload-description.1')}</Text>
              <Text size='sm'>{t('upload-description.2')}</Text>
              <Text size='sm' fw={700}>
                {t('upload-description.3')}
              </Text>
              <Text size='sm'>{t('upload-description.4')}</Text>
            </Stack>

            {isIdsValidation ? (
              <Stack maw={650}>
                <Grid gutter="md" style={{ width: '100%' }}>
                  <Grid.Col span={6}>
                    <Dropzone
                      onDrop={handleIfcDrop}
                      onReject={handleReject}
                      maxSize={500 * 1024 ** 2}
                      multiple={true}
                      validator={ifcValidator}
                      style={{ width: '100%' }}
                    >
                      <Group justify='center' gap='xl' mih={180} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                          <IconUpload
                            style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-blue-6)' }}
                            stroke={1.5}
                          />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                          <IconX style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
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
                      </Group>
                      <div>
                        {ifcFiles?.map((file, index) => (
                          <Group key={index}>
                            <IconFile3d stroke={0.7} />
                            <Text size='sm'>{file.name}</Text>
                          </Group>
                        ))}
                      </div>
                    </Dropzone>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Dropzone
                      onDrop={handleIdsDrop}
                      onReject={handleReject}
                      maxSize={5 * 1024 ** 2}
                      multiple={false}
                      validator={idsValidator}
                      style={{ width: '100%' }}
                    >
                      <Group justify='center' gap='md' mih={180} style={{ pointerEvents: 'none' }}>
                        <Stack align="center" gap='xs'>
                          <Dropzone.Accept>
                            <IconUpload
                              style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-blue-6)' }}
                              stroke={1.5}
                            />
                          </Dropzone.Accept>
                          <Dropzone.Reject>
                            <IconX style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
                          </Dropzone.Reject>
                          <Dropzone.Idle>
                            <IconFile3d
                              style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-dimmed)' }}
                              stroke={1.5}
                            />
                          </Dropzone.Idle>
                          <Text size='sm' ta="center">{t('dropzone.drag.ids')}</Text>
                        </Stack>
                      </Group>
                      {idsFile && (
                        <Group>
                          <IconFile3d stroke={0.7} />
                          <Text size='sm'>{idsFile.name}</Text>
                        </Group>
                      )}
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
                style={{ width: '100%', maxWidth: 650 }}
              >
                <Group justify='center' gap='xl' mih={220} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload
                      style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
                      stroke={1.5}
                    />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFile3d
                      style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
                      stroke={1.5}
                    />
                  </Dropzone.Idle>

                  <Stack gap='xs'>
                    <Text size='xl'>{t('dropzone.drag.ifc')}</Text>
                    <Text size='sm' c='dimmed'>
                      {t('dropzone.attach')}
                    </Text>
                  </Stack>
                </Group>
                <div>
                  {ifcFiles?.map((file, index) => (
                    <Group key={index}>
                      <IconFile3d stroke={0.7} />
                      <Text size='sm'>{file.name}</Text>
                    </Group>
                  ))}
                </div>
              </Dropzone>
            )}
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
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Stack align='center' style={{ width: '100%', maxWidth: '600px' }}>
                <Loader size='xl' variant='bars' />
                <Text size='lg' weight={500}>
                  Processing files...
                </Text>
                <Text size='sm' color='dimmed'>
                  {Math.round(uploadProgress)}% complete
                </Text>
                <Paper withBorder p="xs" style={{
                  width: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#1e1e1e',
                  fontFamily: 'monospace'
                }}>
                  {processingLogs.map((log, index) => (
                    <Text key={index} size="sm" style={{ color: '#fff' }}>
                      {log}
                    </Text>
                  ))}
                </Paper>
              </Stack>
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
              <Stack mt="sm">
                {processedResults.map((result, index) => (
                  <div key={index}>
                    {renderResultActions(result)}
                  </div>
                ))}
              </Stack>
            </Alert>
          )}
          <Button
            mt='md'
            onClick={handleClick}
            disabled={!ifcFiles.length || (isIdsValidation && !idsFile) || isProcessing}
          >
            {isProcessing ? 'Processing...' : t('validate')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
