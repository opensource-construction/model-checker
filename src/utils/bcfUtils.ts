export interface BcfData {
  zip_content: string // base64 encoded string
  filename: string
}

export const downloadBcfReport = (bcfData: BcfData) => {
  try {
    // Verify that we have valid base64 data
    if (!bcfData.zip_content) {
      throw new Error('BCF data is empty')
    }

    // Add padding if necessary
    let base64Data = bcfData.zip_content
    while (base64Data.length % 4) {
      base64Data += '='
    }

    try {
      // Try to decode the base64 string
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/zip' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = bcfData.filename

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (decodeError) {
      console.error('Failed to decode base64 data:', decodeError)
      throw new Error('Invalid BCF data format')
    }
  } catch (error: unknown) {
    console.error('Error downloading BCF report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to download BCF report: ${errorMessage}`)
  }
}
