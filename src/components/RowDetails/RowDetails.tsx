import { Table, Tabs } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { PartialResult } from '@context'
import { SubTable } from './SubTable.tsx'
import { RowStatistics } from './RowStatistics.tsx'

interface RowDetailsProps {
  show: boolean
  value: PartialResult[]
}

export const RowDetails = (props: RowDetailsProps) => {
  const { show, value } = props
  const { t } = useTranslation()

  if (!show) {
    return null
  }

  return (
    <Table.Tr>
      <Table.Td colSpan={4}>
        <Tabs keepMounted={false} defaultValue='statistics'>
          <Tabs.List>
            <Tabs.Tab value='statistics'>{t('result-table.statistics')}</Tabs.Tab>
            <Tabs.Tab value='all-data'>{t('result-table.all-data')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='statistics'>
            <RowStatistics value={value} />
          </Tabs.Panel>
          <Tabs.Panel value='all-data'>
            <SubTable rows={value} />
          </Tabs.Panel>
        </Tabs>
      </Table.Td>
    </Table.Tr>
  )
}
