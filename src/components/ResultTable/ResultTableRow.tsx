import { ActionIcon, Group, Progress, Skeleton, Table, Text, useMantineColorScheme } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { PartialResult } from '@context'
import { RowDetails } from '@components'

interface ResultTableRowProps {
  name: string
  result: {
    passed: boolean | null
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
  const { colorScheme } = useMantineColorScheme()

  return (
    <>
      <Table.Tr key={name}>
        <Table.Td>
          <Status inProgress={inProgress} passed={passed} />
        </Table.Td>
        <Table.Td>{t(`rules.${name}`)}</Table.Td>
        <Table.Td>
          <FulfilmentBar fulfilment={calculateFulfilment(value, passed)} />
        </Table.Td>
        <Table.Td>
          {value.length ? (
            <ActionIcon
              variant='transparent'
              size='sm'
              onClick={toggle}
              color={colorScheme === 'dark' ? 'gray.3' : 'dark'}
            >
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
  const { colorScheme } = useMantineColorScheme()
  const color =
    fulfilment === 100
      ? colorScheme === 'dark'
        ? 'blue.5'
        : '#0909ff'
      : colorScheme === 'dark'
        ? 'violet.5'
        : '#f715f7'

  if (fulfilment > 15) {
    return (
      <Progress.Root size='xxl' styles={{ label: { color: 'white' } }}>
        <Progress.Section value={fulfilment} color={color}>
          <Progress.Label py={4}>{fulfilment}%</Progress.Label>
        </Progress.Section>
      </Progress.Root>
    )
  }

  return (
    <Progress.Root size='xxl' styles={{ label: { color: colorScheme === 'dark' ? '#a9b1d6' : 'black' } }}>
      <Progress.Section value={fulfilment} color={color}>
        <Progress.Label py={8}>
          <div style={{ paddingBlock: 'calc(0.25rem * var(--mantine-scale))' }} />
        </Progress.Label>
      </Progress.Section>
      <Progress.Section value={100 - fulfilment} color='gray.1' py={4}>
        <Progress.Label>{fulfilment}%</Progress.Label>
      </Progress.Section>
    </Progress.Root>
  )
}

const calculateFulfilment = (value: PartialResult[], passed: boolean | null): number => {
  const length = value.length
  if (length === 0 && !passed) return 0
  if (length === 0 && passed) return 100

  const _passed = value.filter((result) => result.passed).length
  return Math.round((_passed / length) * 100)
}

interface StatusProps {
  inProgress: boolean
  passed: boolean | null
}

const Status = (props: StatusProps) => {
  const { inProgress, passed } = props
  const { t } = useTranslation()
  const { colorScheme } = useMantineColorScheme()

  if (inProgress) {
    return <Skeleton height={24} circle />
  }

  if (passed === null) {
    return null
  } else if (passed) {
    const color = colorScheme === 'dark' ? 'blue.5' : '#0909ff'
    return (
      <Group>
        <IconCircleCheck color={color} />
        <Text c={color} visibleFrom='lg'>
          {t('result-table.passed')}
        </Text>
      </Group>
    )
  } else {
    const color = colorScheme === 'dark' ? 'violet.5' : '#f715f7'
    return (
      <Group>
        <IconCircleX color={color} />
        <Text c={color} visibleFrom='lg'>
          {t('result-table.failed')}
        </Text>
      </Group>
    )
  }
}
