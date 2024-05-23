import { ActionIcon, Group, Progress, Skeleton, Table, Text, useMantineTheme } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { PartialResult } from '../../context/ValidationContext/interfaces.ts';
import { useTranslation } from 'react-i18next';

interface ResultTableRowProps {
  name: string;
  result: {
    passed: boolean;
    value: string[] | PartialResult[];
  };
  fulfilment?: number;
  inProgress: boolean;
}

export const ResultTableRow = (props: ResultTableRowProps) => {
  const {
    name,
    result: { passed, value },
    fulfilment = 50,
    inProgress,
  } = props;
  const [opened, { toggle }] = useDisclosure(false);
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const matches = useMediaQuery(`(max-width: ${theme.breakpoints.lg})`);

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
          <Progress.Root size='xxl'>
            <Progress.Section value={fulfilment} color='#319555'>
              <Progress.Label color='#ffff' py={4}>
                {fulfilment}%
              </Progress.Label>
            </Progress.Section>
          </Progress.Root>
        </Table.Td>
        <Table.Td>
          {value.length ? (
            <ActionIcon variant='transparent' size='sm' onClick={toggle}>
              {opened ? <IconChevronUp /> : <IconChevronDown />}
            </ActionIcon>
          ) : null}
        </Table.Td>
      </Table.Tr>
      <Table.Tr key={`${name}_hidden`} style={opened ? undefined : { display: 'none' }}>
        <Table.Td colSpan={1} />
        <Table.Td colSpan={3}>
          <ExpandedRow value={value} />
        </Table.Td>
      </Table.Tr>
    </>
  );
};

const ExpandedRow = ({ value }: { value: string[] | PartialResult[] }) => {
  if (typeof value[0] === 'object') {
    return <SubTable rows={value as PartialResult[]} />;
  }
  return <Text>{value.join(', ')}</Text>;
};

const SubTable = ({ rows }: { rows: PartialResult[] }) => {
  const _rows = rows.map(({ globalId, name, passed }, index) => (
    <Table.Tr key={`${globalId}-${index}`}>
      <Table.Td>{globalId}</Table.Td>
      <Table.Td>{name}</Table.Td>
      <Table.Td>
        {passed ? <IconCircleCheck color='#319555' /> : <IconCircleX color='#BE4A5A' />}
      </Table.Td>
    </Table.Tr>
  ));
  return (
    <Table.ScrollContainer minWidth={200}>
      <Table verticalSpacing='xs'>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Global Id</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{_rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
