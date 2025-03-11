import { UploadCard } from '@components'
import { Box } from '@mantine/core'

export const UploadFilePage = () => {
  return (
    <Box
      py={{ base: 32, lg: 48 }}
      style={{
        flex: 1,
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      <UploadCard />
    </Box>
  )
}
