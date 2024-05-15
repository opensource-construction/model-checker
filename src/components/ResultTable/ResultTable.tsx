import { ActionIcon, Group, Progress, Skeleton, Table, Text } from '@mantine/core'
import { IconChevronDown, IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { FileResult } from '@context'

interface ResultTableProps {
  results: FileResult[]
  inProgress: boolean
}

export const ResultTable = (props: ResultTableProps) => {
  const { results, inProgress } = props

  // @ts-expect-error ignore for now
  const rows = results.map(({ name, result: { passed, value }, ruleDescription = 'Text', fulfilment = '50' }) => {
    return (
      <Table.Tr key={name}>
        <Table.Td>
          {inProgress ? (
            <Group>
              <IconCircleCheck color='#319555' />
              <Skeleton height={8} radius='xl' />
            </Group>
          ) : passed ? (
            <Group>
              <IconCircleCheck color='#319555' />
              <Text c='#319555'>Passed</Text>
            </Group>
          ) : (
            <Group>
              <IconCircleX color='#BE4A5A' />
              <Text c='#BE4A5A'>Failed</Text>
            </Group>
          )}
        </Table.Td>
        <Table.Td>{name}</Table.Td>
        <Table.Td>
          <Progress.Root size='xxl'>
            <Progress.Section value={fulfilment} color='#319555'>
              <Progress.Label color='#ffff' py={4}>
                {fulfilment}%
              </Progress.Label>
            </Progress.Section>
          </Progress.Root>
        </Table.Td>
        <Table.Td>{ruleDescription}</Table.Td>
        <Table.Td>
          {value.length ? (
            <ActionIcon variant='transparent' size='sm'>
              <IconChevronDown />
            </ActionIcon>
          ) : null}
        </Table.Td>
      </Table.Tr>
    )
  })

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table verticalSpacing='xs'>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Status</Table.Th>
            <Table.Th>Rule</Table.Th>
            <Table.Th>Level of Fulfilment</Table.Th>
            <Table.Th>Rule Description</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
