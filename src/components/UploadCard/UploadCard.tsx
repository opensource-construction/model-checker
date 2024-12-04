import { useState, useEffect, useCallback } from 'react'
import { Button, Divider, Group, rem, Stack, Text, Switch, Progress, Alert, Modal, Loader, Center, Paper, Grid, SimpleGrid, Title, ScrollArea, Code, Box } from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconFile3d, IconFileText, IconUpload, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { UploadCardTitle } from './UploadCardTitle.tsx'
import { useNavigate } from 'react-router-dom'
import { useValidationContext } from '@context'
import { processFile } from './processFile.ts'
import Mustache from 'mustache';

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
  const [templateContent, setTemplateContent] = useState<string | null>(null)
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingDots(dots => dots.length >= 3 ? '' : dots + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  useEffect(() => {
    // Load the HTML template
    fetch('/report.html')
      .then(response => response.text())
      .then(content => {
        console.log('Template loaded, length:', content.length);
        setTemplateContent(content);
      })
      .catch(error => console.error('Error loading template:', error));
  }, []);

  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, message])
  }

  const generateReport = (result: any, fileName: string) => {
    if (!templateContent) {
      console.error('No template content available');
      return null;
    }

    let html = templateContent;

    // Replace basic placeholders
    html = html.replace('{{title}}', result.title || 'IFC Validation Report');
    html = html.replace('{{date}}', result.date || new Date().toLocaleString());
    html = html.replace('{{filename}}', fileName || 'Unknown');

    // Generate stats HTML
    const statsHtml = `
      <div class="stats">
        <div class="stat-box">
          <h4>Specifications</h4>
          <p>${result.total_specifications_pass}/${result.total_specifications} passed</p>
          <div class="progress-bar">
            <div class="fill" style="width: ${result.percent_specifications_pass}%"></div>
          </div>
        </div>
        <div class="stat-box">
          <h4>Requirements</h4>
          <p>${result.total_requirements_pass}/${result.total_requirements} passed</p>
          <div class="progress-bar">
            <div class="fill" style="width: ${result.percent_requirements_pass}%"></div>
          </div>
        </div>
      </div>
    `;

    // Generate specifications HTML
    const specificationsHtml = result.specifications?.map((spec: any) => {
      const statusClass = spec.status ? 'pass' : 'fail';
      const statusText = spec.status ? 'PASS' : 'FAIL';

      const requirementsHtml = spec.requirements?.map((req: any) => {
        const reqStatusClass = req.status ? 'pass' : 'fail';
        const entitiesHtml = req.entities?.map((entity: string) =>
          `<div class="entity">${entity}</div>`
        ).join('') || '';

        return `
          <div class="requirement ${reqStatusClass}">
            <span class="status-badge ${reqStatusClass}">${req.status ? 'PASS' : 'FAIL'}</span>
            <p>${req.description || ''}</p>
            <div class="entities-list">
              ${entitiesHtml}
            </div>
          </div>
        `;
      }).join('') || '';

      return `
        <div class="specification ${statusClass}">
          <h3>${spec.name}</h3>
          <span class="status-badge ${statusClass}">${statusText}</span>
          <p>${spec.description || ''}</p>
          ${spec.instructions ? `<p><strong>Instructions:</strong> ${spec.instructions}</p>` : ''}
          <div class="requirements">
            ${requirementsHtml}
          </div>
        </div>
      `;
    }).join('') || '';

    // Insert dynamic content
    html = html.replace('<div id="stats">', `<div id="stats">${statsHtml}`);
    html = html.replace('<div id="specifications">', `<div id="specifications">${specificationsHtml}`);

    return html;
  };

  const openReportInNewTab = (result: any, fileName: string) => {
    try {
      if (!templateContent) {
        console.error('No template content available');
        return;
      }

      // Render the template with Mustache
      const htmlContent = Mustache.render(templateContent, result);

      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.document.title = `Report - ${fileName}`;
        console.log('Successfully opened report for', fileName);
      }
    } catch (error) {
      console.error('Error opening report:', error);
    }
  };

  useEffect(() => {
    if (!processedResults.length) return;
    console.log('Results ready for report generation');
  }, [processedResults, templateContent]);

  const processFiles = useCallback(async (ifcFiles: File[], idsFile: File | null) => {
    setIsProcessing(true)
    setUploadProgress(0)
    setProcessingLogs([])
    console.log('Starting file processing...')

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

    // Fetch the reporter code
    let reporterCode: string | null = null;
    try {
      const response = await fetch('/reporter.py');
      reporterCode = await response.text();
    } catch (error) {
      const errorMsg = `Failed to load reporter module: ${error.message}`;
      setUploadError(errorMsg);
      setIsProcessing(false);
      return;
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
              fileName: file.name
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
              details: error.details
            }
          }
        }
      })
    )

    console.log('All files processed, results:', processedResults)
    setProcessedResults(processedResults)
    setUploadProgress(100)
    setIsProcessing(false)
  }, [isIdsValidation, templateContent])

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

  return (
    <Stack>
      <Paper hide={false} p="xl">
        <Stack spacing="md">
          <Stack>
            <UploadCardTitle isIdsValidation={isIdsValidation} />
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
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.0`)}</Text>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.1`)}</Text>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.2`)}</Text>
              <Text size='sm' fw={700}>
                {t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.3`)}
              </Text>
              <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.4`)}</Text>
              {isIdsValidation && (
                <Text size='sm' c="blue.7">{t('upload-description-ids.5')}</Text>
              )}
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
                      style={{ width: '100%', height: '400px' }}
                    >
                      <Stack h="100%" spacing="xs">
                        <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '180px' }}>
                          <Stack align="center" justify="center" gap='xs'>
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
                          </Stack>
                        </Group>
                        <ScrollArea.Autosize mah={200} offsetScrollbars>
                          {ifcFiles?.map((file, index) => (
                            <Group key={index}>
                              <IconFile3d stroke={0.7} />
                              <Text size='sm'>{file.name}</Text>
                            </Group>
                          ))}
                        </ScrollArea.Autosize>
                      </Stack>
                    </Dropzone>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Dropzone
                      onDrop={handleIdsDrop}
                      onReject={handleReject}
                      maxSize={5 * 1024 ** 2}
                      multiple={false}
                      validator={idsValidator}
                      style={{ width: '100%', height: '400px' }}
                    >
                      <Stack h="100%" spacing="xs">
                        <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '180px' }}>
                          <Stack align="center" justify="center" gap='xs'>
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
                        <ScrollArea.Autosize mah={200} offsetScrollbars>
                          {idsFile && (
                            <Group>
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
                style={{ width: '100%', height: '400px', maxWidth: 650 }}
              >
                <Stack h="100%" spacing="xs">
                  <Group justify='center' gap='xl' style={{ pointerEvents: 'none', minHeight: '180px' }}>
                    <Stack align="center" justify="center" gap='xs'>
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
                        <Text size='lg'>{t('dropzone.drag.ifc')}</Text>
                        <Text size='sm' c='dimmed'>
                          {t('dropzone.attach')}
                        </Text>
                      </Stack>
                    </Stack>
                  </Group>
                  <ScrollArea.Autosize mah={200} offsetScrollbars>
                    {ifcFiles?.map((file, index) => (
                      <Group key={index}>
                        <IconFile3d stroke={0.7} />
                        <Text size='sm'>{file.name}</Text>
                      </Group>
                    ))}
                  </ScrollArea.Autosize>
                </Stack>
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
              <Paper withBorder p="xs" style={{
                width: '100%',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'var(--mantine-color-dark-4)',
                fontFamily: 'monospace',
                pointerEvents: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}>
                {processingLogs.map((log, index) => (
                  <Text key={index} size="sm" style={{
                    color: '#fff',
                    padding: '2px 0',
                    borderBottom: index !== processingLogs.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}>
                    {log}
                  </Text>
                ))}
                {isProcessing && (
                  <Text size="sm" style={{
                    color: '#fff',
                    padding: '2px 0',
                    opacity: 0.7
                  }}>
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
                <Group mt="sm" gap="xs" wrap="wrap">
                  {processedResults.map((result, index) => (
                    <Button
                      key={index}
                      onClick={() => openReportInNewTab(result.result, result.fileName)}
                      color="yellow"
                      variant="outline"
                      size="sm"
                      fw={500}
                      className="report-button"
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
                          }
                        }
                      }}
                    >
                      {t('results')} - {result.fileName}
                    </Button>
                  ))}
                </Group>
              </Box>
            </Alert>
          )}
          <Button
            mt='md'
            onClick={handleClick}
            disabled={!ifcFiles.length || (isIdsValidation && !idsFile) || isProcessing}
            styles={(theme) => ({
              label: {
                color: theme.colors.dark[9]
              }
            })}
          >
            {isProcessing ? 'Processing...' : t('validate')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
