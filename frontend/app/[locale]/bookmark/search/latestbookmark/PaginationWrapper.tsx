"use client";

import { Pagination, Center } from "@mantine/core";
import Link from "next/link";

type Props = {
  total: number;
  page: number;
};

export default function PaginationWrapper({ total, page }: Props) {
  return (
    <Center my="sm" mb="lg">
      <Pagination
        total={total}
        value={page}
        getItemProps={(pageNumber) => ({
          component: Link,
          href: `?page=${pageNumber}`,
        })}
      />
    </Center>
  );
}
