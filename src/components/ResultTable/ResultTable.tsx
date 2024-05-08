import { Group, Progress, Table, Text } from '@mantine/core'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'

interface ResultData {
  status: boolean
  rule: string
  fulfilment: number
  ruleDescription: string
}

const data = [
  {
    status: true,
    rule: 'Project Name',
    fulfilment: 100.0,
    ruleDescription: 'Elements are assigned to a project',
  },
  {
    status: true,
    rule: 'Elements in Project',
    fulfilment: 80.0,
    ruleDescription: 'Elements have a project name assigned',
  },
  {
    status: false,
    rule: 'Elements in Building',
    fulfilment: 28.0,
    ruleDescription: 'Elements are assigned to a building',
  },
  {
    status: true,
    rule: 'Elements in Levels',
    fulfilment: 96.0,
    ruleDescription: 'Elements are assigned to a level',
  },
  {
    status: false,
    rule: 'Element Names',
    fulfilment: 12.0,
    ruleDescription: 'Elements have names',
  },
] as ResultData[]

export const ResultTable = () => {
  const rows = data.map(({ rule, status, ruleDescription, fulfilment }) => {
    return (
      <Table.Tr key={rule}>
        <Table.Td>
          {status ? (
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
        <Table.Td>{rule}</Table.Td>
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
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
