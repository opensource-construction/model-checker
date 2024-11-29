import { useState } from 'react';
import { Group, Text, Stack, Button, Paper } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconFile } from '@tabler/icons-react';
import { ifcTester } from '../../lib/ifctester';
import { ValidationResult } from '../../lib/ifctester/types';

export function IDSTester() {
  const [ifcFile, setIfcFile] = useState<File | null>(null);
  const [idsFile, setIdsFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleIFCDrop = (files: File[]) => {
    if (files.length > 0) {
      setIfcFile(files[0]);
    }
  };

  const handleIDSDrop = (files: File[]) => {
    if (files.length > 0) {
      setIdsFile(files[0]);
    }
  };

  const handleValidate = async () => {
    if (!ifcFile || !idsFile) return;

    setIsValidating(true);
    try {
      const result = await ifcTester.validateIFC(ifcFile, idsFile);
      setValidationResult(result);
    } catch (error) {
      console.error('Validation failed:', error);
      // TODO: Add error handling UI
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Stack spacing="md">
      <Group grow>
        <Dropzone
          onDrop={handleIFCDrop}
          accept={['.ifc']}
          maxFiles={1}
        >
          <Group position="center" spacing="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size="3.2rem" stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size="3.2rem" stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile size="3.2rem" stroke={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                {ifcFile ? ifcFile.name : 'Drop IFC file here'}
              </Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                Drag and drop IFC file here
              </Text>
            </div>
          </Group>
        </Dropzone>

        <Dropzone
          onDrop={handleIDSDrop}
          accept={['.ids']}
          maxFiles={1}
        >
          <Group position="center" spacing="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size="3.2rem" stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size="3.2rem" stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile size="3.2rem" stroke={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                {idsFile ? idsFile.name : 'Drop IDS file here'}
              </Text>
              <Text size="sm" color="dimmed" inline mt={7}>
                Drag and drop IDS file here
              </Text>
            </div>
          </Group>
        </Dropzone>
      </Group>

      <Button
        onClick={handleValidate}
        disabled={!ifcFile || !idsFile || isValidating}
        loading={isValidating}
      >
        Validate IFC against IDS
      </Button>

      {validationResult && (
        <Paper p="md" withBorder>
          <Stack>
            <Text>Validation Result:</Text>
            <Text color={validationResult.isValid ? 'green' : 'red'}>
              {validationResult.isValid ? 'Valid' : 'Invalid'}
            </Text>
            {/* TODO: Add detailed validation results display */}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
