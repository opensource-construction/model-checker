import React, { useState, useEffect, useCallback } from 'react'
import { Button, Divider, Group, rem, Stack, Text, Switch, Progress, Alert, Modal, Loader, Center, Paper, Grid, SimpleGrid, Title, ScrollArea, Code } from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconFile3d, IconUpload, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
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

interface ValidationResultsModalProps {
  opened: boolean
  onClose: () => void
  results: ProcessedResult
}

const ValidationResultsModal = ({ opened, onClose, results }: ValidationResultsModalProps) => {
  if (!results) return null;

  const { schema, basic_stats, ids_stats, specifications, failed_constraints, html_report, log } = results.result;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="IFC Validation Results"
      size="xl"
      padding="md"
    >
      <Stack spacing="md">
        {/* Schema Information */}
        <Paper p="sm" withBorder>
          <Title order={4}>Schema Information</Title>
          <Text>IFC Schema Version: {schema}</Text>
        </Paper>

        {/* Basic Statistics */}
        <Paper p="sm" withBorder>
          <Title order={4}>Basic Statistics</Title>
          <SimpleGrid cols={3} spacing="sm">
            <Paper p="xs" withBorder>
              <Text size="sm" color="dimmed">Total Entities</Text>
              <Text weight={700}>{basic_stats?.total_entities || 0}</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="sm" color="dimmed">Products</Text>
              <Text weight={700}>{basic_stats?.products || 0}</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="sm" color="dimmed">Walls</Text>
              <Text weight={700}>{basic_stats?.walls || 0}</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="sm" color="dimmed">Spaces</Text>
              <Text weight={700}>{basic_stats?.spaces || 0}</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="sm" color="dimmed">Storeys</Text>
              <Text weight={700}>{basic_stats?.storeys || 0}</Text>
            </Paper>
          </SimpleGrid>
        </Paper>

        {/* Specifications */}
        {specifications && specifications.length > 0 && (
          <Paper p="sm" withBorder>
            <Title order={4}>IDS Specifications</Title>
            <ScrollArea style={{ height: 200 }}>
              <Stack spacing="md">
                {specifications.map((spec, index) => (
                  <Paper key={index} p="xs" withBorder>
                    <Stack spacing="xs">
                      <Group position="apart">
                        <Text weight={700} size="lg">{spec.name}</Text>
                        <Text 
                          weight={700}
                          color={spec.status === true ? "green" : "red"}
                        >
                          {spec.status ? "True" : "False"}
                        </Text>
                      </Group>
                      
                      {spec.description && (
                        <Text size="sm">{spec.description}</Text>
                      )}

                      {spec.requirements && spec.requirements.map((req, reqIndex) => {
                        // Format requirement text
                        let reqText = '';
                        if (typeof req === 'object') {
                          if (req.description) {
                            reqText = req.description;
                          } else if (req.type === 'Property') {
                            const constraints = req.value && typeof req.value === 'object' 
                              ? Object.entries(req.value)
                                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                                  .join(', ')
                              : '';
                            reqText = `${req.propertyName || ''} ${constraints}`;
                          }
                        } else {
                          reqText = req.toString();
                        }

                        return (
                          <Group key={reqIndex} position="apart" spacing="xl">
                            <Text size="sm" style={{ flex: 1 }}>{reqText}</Text>
                            {req.status !== undefined && (
                              <Text 
                                weight={500}
                                color={req.status === true ? "green" : "red"}
                                size="sm"
                              >
                                {req.status ? "True" : "False"}
                              </Text>
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        )}

        {/* Failed Constraints */}
        {failed_constraints && failed_constraints.length > 0 && (
          <Paper p="sm" withBorder>
            <Title order={4}>Failed Constraints</Title>
            <ScrollArea style={{ height: 200 }}>
              <Stack spacing="xs">
                {failed_constraints.map((constraint, index) => (
                  <Text key={index} color="red" size="sm">{constraint}</Text>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        )}

        {/* Detailed Report */}
        <Paper p="sm" withBorder>
          <Title order={4}>Detailed Report</Title>
          <ScrollArea style={{ height: 400 }}>
            <div dangerouslySetInnerHTML={{ __html: html_report || 'No detailed report available' }} />
          </ScrollArea>
        </Paper>

        {/* Log Output */}
        <Paper p="sm" withBorder>
          <Title order={4}>Log Output</Title>
          <ScrollArea style={{ height: 200 }}>
            <Code block>{log || 'No logs available'}</Code>
          </ScrollArea>
        </Paper>
      </Stack>
    </Modal>
  );
};

export const UploadCard = () => {
  const [ifcFiles, setIfcFiles] = useState<File[]>([])
  const [idsFile, setIdsFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FileError[] | null>(null)
  const [isIdsValidation, setIsIdsValidation] = useState(false)
  const { t } = useTranslation()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([])
  const [currentModalIndex, setCurrentModalIndex] = useState<number | null>(null)
  const [idsContent, setIdsContent] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  useEffect(() => {
    if (processedResults.length > 0 && currentModalIndex === null) {
      setCurrentModalIndex(0)
    }
  }, [processedResults])

  const processFiles = useCallback(async (ifcFiles: File[], idsFile: File | null) => {
    setIsProcessing(true)
    setUploadProgress(0)
    setProcessingLogs([])
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
        const arrayBuffer = await file.arrayBuffer()
        const worker = new Worker('/pyodideWorker.js')

        const result = await new Promise((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.error) {
              reject(new Error(event.data.error))
            } else if (event.data.result) {
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

        results.push({ fileName: file.name, result })
        setUploadProgress(((i + 1) / totalFiles) * 100)
      } catch (error: any) {
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

    setProcessedResults(results)
    setUploadProgress(100)
    setIsProcessing(false)
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
      await processFiles(ifcFiles, null)
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

  const renderResultModal = () => {
    if (currentModalIndex === null || processedResults.length === 0) return null

    const currentResult = processedResults[currentModalIndex]

    return (
      <ValidationResultsModal
        opened={true}
        onClose={() => setCurrentModalIndex(null)}
        results={currentResult}
      />
    )
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
              <Text>Your files have been processed. Click the button below to view results.</Text>
              <Button onClick={() => setCurrentModalIndex(0)} mt='sm'>
                View Results
              </Button>
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
      {renderResultModal()}
    </Stack>
  )
}
