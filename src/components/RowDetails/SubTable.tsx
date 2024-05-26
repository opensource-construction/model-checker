import { PartialResult } from '@context'
import { Center, Pagination, Table } from '@mantine/core'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useState } from 'react'

export const SubTable = ({ rows }: { rows: PartialResult[] }) => {
  const [activePage, setPage] = useState(1)

  const chunkedData = chunkData(
    rows.map(({ globalId, name, passed }, index) => (
      <Table.Tr key={`${globalId}-${index}`}>
        <Table.Td>{globalId}</Table.Td>
        <Table.Td>{name}</Table.Td>
        <Table.Td>{passed ? <IconCircleCheck color='#319555' /> : <IconCircleX color='#BE4A5A' />}</Table.Td>
      </Table.Tr>
    )),
    30,
  )
  const data = chunkedData[activePage - 1] || []

  return (
    <Table verticalSpacing='xs'>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Global Id</Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{data}</Table.Tbody>
      <Table.Tfoot>
        <Table.Tr>
          <Table.Th colSpan={3}>
            <Center>
              <Pagination
                total={chunkedData.length}
                value={activePage}
                onChange={setPage}
                my='sm'
                color='#4A5ABE'
                withEdges
              />
            </Center>
          </Table.Th>
        </Table.Tr>
      </Table.Tfoot>
    </Table>
  )
}

const chunkData = <T,>(array: T[], size: number): T[][] => {
  if (!array.length) {
    return []
  }
  const head = array.slice(0, size)
  const tail = array.slice(size)
  return [head, ...chunkData(tail, size)]
}
