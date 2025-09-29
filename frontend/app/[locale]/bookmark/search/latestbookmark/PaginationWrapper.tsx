"use client";

import { Pagination, Center } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useTopLoader } from 'nextjs-toploader';

type Props = {
  total: number;
  page: number;
  query: Record<string, string | string[]>;
};

export default function PaginationWrapper({ total, page, query }: Props) {
  const router = useRouter();
  const loader = useTopLoader();

  const handlePageChange = (pageNumber: number) => {
    // 既存のクエリをコピーして page だけ更新
    const newQuery = { ...query, page: String(pageNumber) };

    // query を URLSearchParams に変換
    const searchParams = new URLSearchParams();
    Object.entries(newQuery).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    });

    // ページ遷移
    router.push(`?${searchParams.toString()}`);
    loader.start();
  };

  return (
    <Center mt="md" mb="lg">
      <Pagination
        total={total}
        value={page}
        siblings={1}
        onChange={handlePageChange}
      />
    </Center>
  );
}
