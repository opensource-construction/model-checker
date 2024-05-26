import { ActionIcon, Group, Progress, Skeleton, Table, Text, useMantineTheme } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { PartialResult } from '@context'
import { RowDetails } from '@components'

interface ResultTableRowProps {
  name: string
  result: {
    passed: boolean
    value: PartialResult[]
  }
  inProgress: boolean
}

export const ResultTableRow = (props: ResultTableRowProps) => {
  const {
    name,
    result: { passed, value },
    inProgress,
  } = props
  const [opened, { toggle }] = useDisclosure(false)
  const { t } = useTranslation()
  const theme = useMantineTheme()
  const matches = useMediaQuery(`(max-width: ${theme.breakpoints.lg})`)
  const fulfilment = calculateFulfilment(value)

  return (
    <>
      <Table.Tr key={name}>
        <Table.Td>
          {inProgress ? (
            <Skeleton height={24} circle />
          ) : passed ? (
            <Group>
              <IconCircleCheck color='#319555' />
              <Text c='#319555' style={matches ? { display: 'none' } : undefined}>
                {t('result-table.passed')}
              </Text>
            </Group>
          ) : (
            <Group>
              <IconCircleX color='#BE4A5A' />
              <Text c='#BE4A5A' style={matches ? { display: 'none' } : undefined}>
                {t('result-table.failed')}
              </Text>
            </Group>
          )}
        </Table.Td>
        <Table.Td>{t(`rules.${name}`)}</Table.Td>
        <Table.Td>
          <FulfilmentBar fulfilment={fulfilment} />
        </Table.Td>
        <Table.Td>
          {value.length ? (
            <ActionIcon variant='transparent' size='sm' onClick={toggle}>
              {opened ? <IconChevronUp /> : <IconChevronDown />}
            </ActionIcon>
          ) : null}
        </Table.Td>
      </Table.Tr>
      <RowDetails show={opened} value={value} />
    </>
  )
}

const FulfilmentBar = ({ fulfilment }: { fulfilment: number }) => {
  return (
    <Progress.Root size='xxl'>
      {fulfilment > 15 ? (
        <Progress.Section value={fulfilment} color='#319555'>
          <Progress.Label color='#ffff' py={4}>
            {fulfilment}%
          </Progress.Label>
        </Progress.Section>
      ) : (
        <>
          <Progress.Section value={fulfilment} color='#319555' />
          <Progress.Section value={100 - fulfilment} color='#E9ECEF'>
            <Progress.Label color='#0000' py={4}>
              {fulfilment}%
            </Progress.Label>
          </Progress.Section>
        </>
      )}
    </Progress.Root>
  )
}

const calculateFulfilment = (value: PartialResult[]): number => {
  const length = value.length
  if (length === 0) return 0

  const passed = value.filter((result) => result.passed).length
  return Math.round((passed / length) * 100)
}
