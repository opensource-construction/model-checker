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

  const orderedData = data.slice(0, 8)
  if (data.length > 8) {
    orderedData.push({ name: t('other'), value: data.slice(8, data.length).reduce((acc, { value }) => acc + value, 0) })
  }

  return (
    <Container my={'xl'}>
      <BarChart
        h={300}
        data={orderedData}
        dataKey='name'
        series={[{ name: 'value', color: '#4A5ABE' }]}
        yAxisLabel={t('result-table.count')}
        withTooltip={true}
        withBarValueLabel
        valueFormatter={(value) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)}
        tickLine='y'
      />
    </Container>
  )
}
