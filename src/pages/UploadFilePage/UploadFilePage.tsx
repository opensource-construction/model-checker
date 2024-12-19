import { UploadCard } from '@components'
import { Stack } from '@mantine/core'

export const UploadFilePage = () => {
  return (
    <Stack
      align='center'
      justify='flex-start'
      py={{ base: 32, lg: 48 }}
      mih='100vh'
      style={{
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      <UploadCard />
    </Stack>
  )
}
