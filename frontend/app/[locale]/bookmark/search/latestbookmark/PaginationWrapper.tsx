"use client";

import { Pagination, Center } from "@mantine/core";
import Link from "next/link";

type Props = {
  total: number;
  page: number;
  query: Record<string, string | string[]>;
};

export default function PaginationWrapper({ total, page, query }: Props) {
  return (
    <Center mt="md" mb='lg'>
      <Pagination
        total={total}
        value={page}
        getItemProps={(pageNumber) => {
          // 既存のクエリをコピーして page だけ更新
          const newQuery = { ...query, page: String(pageNumber) };

          // query を URLSearchParams に変換
          const searchParams = new URLSearchParams();
          Object.entries(newQuery).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else {
              searchParams.append(key, value);
            }
          });

          return {
            component: Link,
            href: `?${searchParams.toString()}`,
          };
        }}
      />
    </Center>
  );
}
