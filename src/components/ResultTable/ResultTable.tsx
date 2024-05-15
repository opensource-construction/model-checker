import { Table } from '@mantine/core'
import { FileResult } from '@context'
import { ResultTableRow } from './ResultTableRow.tsx'

interface ResultTableProps {
  results: FileResult[]
  inProgress: boolean
}

export const ResultTable = (props: ResultTableProps) => {
  const { results, inProgress } = props

  const rows = results.map((props, index) => <ResultTableRow key={index} {...props} inProgress={inProgress} />)

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
