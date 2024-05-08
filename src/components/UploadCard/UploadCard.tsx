import { Button, Center, Divider, Group, rem, Stack, Text, Title } from '@mantine/core'
import { Paper } from '@components'
import { Dropzone } from '@mantine/dropzone'
import { IconFile3d, IconUpload, IconX } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

export const UploadCard = () => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/results')
  }

  return (
    <Stack>
      <Paper>
        <Center>
          <Title order={2}>Upload File</Title>
        </Center>
        <Divider py={8} />
        <Dropzone
          onDrop={(files) => console.log('accepted files', files)}
          onReject={(files) => console.log('rejected files', files)}
          maxSize={500 * 1024 ** 2}
          accept={['application/p21']}
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

            <div>
              <Text size='xl' inline>
                Drag IFC files here or click to select files
              </Text>
              <Text size='sm' c='dimmed' inline mt={7}>
                Attach as many files as you like, each file should not exceed 500Mb
              </Text>
            </div>
          </Group>
        </Dropzone>
        <Button color='#319555' mt='md' radius='md' onClick={handleClick}>
          Validate
        </Button>
      </Paper>
    </Stack>
  )
}
