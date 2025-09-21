import { Group, Paper, SimpleGrid, Text } from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconUserPlus
} from '@tabler/icons-react';
import { Bookmark, Server, Tag } from 'lucide-react';
import classes from './Stats.module.scss';

const icons = {
  user: IconUserPlus,
  bookmark: Bookmark,
  tag: Tag,
  server: Server
};

type StatItem = {
  title: string;
  icon: keyof typeof icons;
  value: number|string;
  diff?: number;
};

type StatsProps = {
  data: StatItem[];
};

export function Stats({ data }: StatsProps) {
  const stats = data.map((stat) => {
    const Icon = icons[stat.icon];
    const DiffIcon = stat.diff && stat.diff > 0 ? IconArrowUpRight : IconArrowDownRight

    return (
      <Paper withBorder p="md" radius="md" key={stat.title}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed" className={classes.title}>
            {stat.title}
          </Text>
          <Icon className={classes.icon} size={20} />
        </Group>

        <Group align="flex-end" gap="xs" mt={25}>
          <Text className={classes.value}>{stat.value}</Text>
          {stat.diff &&
            <Text c={stat.diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={classes.diff}>
              <span>{stat.diff}</span>
              <DiffIcon size={16} stroke={1.5} />
            </Text>
          }
        </Group>
      </Paper>
    );
  });

  return (
    <div className={classes.root}>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{stats}</SimpleGrid>
    </div>
  );
}
