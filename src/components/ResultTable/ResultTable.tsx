import { Table } from '@mantine/core'
import { FileResult } from '@context'
import { ResultTableRow } from './ResultTableRow.tsx'
import { useTranslation } from 'react-i18next'

interface ResultTableProps {
  results: FileResult[]
  inProgress: boolean
}

export const ResultTable = (props: ResultTableProps) => {
  const { results, inProgress } = props
  const { t } = useTranslation()
  const rows = results.map((props, index) => <ResultTableRow key={index} {...props} inProgress={inProgress} />)

  return (
    <Table verticalSpacing='xs'>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('result-table.status')}</Table.Th>
          <Table.Th>{t('result-table.rule')}</Table.Th>
          <Table.Th>{t('result-table.level-of-fulfilment')}</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  )
}
