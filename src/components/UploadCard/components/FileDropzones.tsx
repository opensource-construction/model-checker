import { Grid, Group, ScrollArea, Stack, Text } from '@mantine/core'
import { Dropzone, FileRejection } from '@mantine/dropzone'
import { IconFile3d, IconFileText, IconUpload, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

interface FileDropzonesProps {
  isIdsValidation: boolean
  ifcFiles: File[]
  idsFile: File | null
  onIfcDrop: (acceptedFiles: File[]) => void
  onIdsDrop: (acceptedFiles: File[]) => void
  onReject: (fileRejections: FileRejection[]) => void
}

export const FileDropzones = ({
  isIdsValidation,
  ifcFiles,
  idsFile,
  onIfcDrop,
  onIdsDrop,
  onReject,
}: FileDropzonesProps) => {
  const { t } = useTranslation()

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

  const dropzoneStyles = {
    root: {
      minHeight: '300px',
      border: '1px dashed var(--mantine-color-gray-4)',
      backgroundColor: 'transparent',
    },
  }

  if (isIdsValidation) {
    return (
      <Grid gutter='md'>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Dropzone
            onDrop={onIfcDrop}
            onReject={onReject}
            maxSize={500 * 1024 ** 2}
            multiple={true}
            validator={ifcValidator}
            styles={dropzoneStyles}
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
            onDrop={onIdsDrop}
            onReject={onReject}
            maxSize={5 * 1024 ** 2}
            multiple={false}
            validator={idsValidator}
            styles={dropzoneStyles}
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
    )
  }

  return (
    <Dropzone
      onDrop={onIfcDrop}
      onReject={onReject}
      maxSize={500 * 1024 ** 2}
      multiple={true}
      validator={ifcValidator}
      styles={dropzoneStyles}
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
  )
}
