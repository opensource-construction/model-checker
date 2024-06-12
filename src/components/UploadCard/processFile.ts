import { ValidationAction } from '@context'
import { Dispatch } from 'react'

interface processFileProps {
  file: File
  dispatch: Dispatch<ValidationAction>
  fileId: string
}

export const processFile = async (props: processFileProps) => {
  const { fileId, dispatch, file } = props

  dispatch({ type: 'SET_FILE', payload: fileId, fileId })
  const worker = new Worker(new URL('/src/context/ValidationContext/worker.ts', import.meta.url), { type: 'module' })
  worker.postMessage({ file, fileId })
  worker.onmessage = (e) => {
    dispatch(e.data)
  }
  dispatch({ type: 'SET_METADATA', payload: await getAuthorAndExported(file), fileId })
}

// Function to sanitize IFC content
const sanitizeIFCContent = (content: string): string => {
  return content.replace(/=\s+/g, '='); // Remove space right after '='
};

// Function to extract author and export date
const getAuthorAndExported = async (file: File): Promise<{ author: string | null, exported: string | null }> => {
  // Assume author and exported are in the first 64kB of the file
  const fileSlice = file.slice(0, 1024 * 64);
  const chunk = await fileSlice.text();

  // Sanitize the chunk to remove spaces after '='
  const sanitizedChunk = sanitizeIFCContent(chunk);

  // Extract the person and organization IDs from IFCPERSONANDORGANIZATION
  const personOrgMatch = sanitizedChunk.match(/\d+=IFCPERSONANDORGANIZATION\(#(\d+),#(\d+)/);
  const personId = personOrgMatch ? personOrgMatch[1] : null;
  const organizationId = personOrgMatch ? personOrgMatch[2] : null;

  let author: string | null = null;

  if (personId && organizationId) {
    // Extract second attribute for personId
    const personRegex = new RegExp(`#${personId}=IFCPERSON\\([^,]*,'([^']*)'`, 'i');
    const personMatch = sanitizedChunk.match(personRegex);
    const personName = personMatch ? personMatch[1] : null;

    // Extract second attribute for organizationId
    const organizationRegex = new RegExp(`#${organizationId}=IFCORGANIZATION\\([^,]*,'([^']*)'`, 'i');
    const orgMatch = sanitizedChunk.match(organizationRegex);
    const organizationName = orgMatch ? orgMatch[1] : null;

    // Combine personName and organizationName
    author = [personName, organizationName].filter(Boolean).join(', ');
  }

  // Extract exported date
  const exportedMatch = sanitizedChunk.match(/FILE_NAME\('[^']+','([^']+)'/);
  const exported = exportedMatch ? exportedMatch[1] : null;

  return { author, exported };
};
