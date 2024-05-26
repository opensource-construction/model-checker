import { PartialResult } from '@context'
import { BarChart } from '@mantine/charts'
import { Container } from '@mantine/core'
import { useTranslation } from 'react-i18next'

interface RowStatisticsProps {
  value: PartialResult[]
}

export const RowStatistics = ({ value }: RowStatisticsProps) => {
  const { t, i18n } = useTranslation()
  const groupedResults = Object.groupBy(value, ({ name }) => name)

  const data = Object.entries(groupedResults).map(([name, values]) => ({ name, value: values?.length || 0 }))
  data.sort((prev, next) => next.value - prev.value)

  const orderedData = data.slice(0, 4)
  if (data.length > 4) {
    orderedData.push({ name: 'other', value: data.slice(4, data.length).reduce((acc, { value }) => acc + value, 0) })
  }

  return (
    <Container my={'xl'}>
      <BarChart
        h={300}
        data={orderedData}
        dataKey='name'
        series={[{ name: 'value', color: '#4A5ABE' }]}
        yAxisLabel={t('result-table.count')}
        withTooltip={false}
        withBarValueLabel
        valueFormatter={(value) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)}
        tickLine='y'
      />
    </Container>
  )
}
