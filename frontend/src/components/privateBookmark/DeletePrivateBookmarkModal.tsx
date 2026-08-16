"use client";
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DeletePrivateBookmarkModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
}

export function DeletePrivateBookmarkModal({
  opened,
  onClose,
  onConfirm,
  title,
}: DeletePrivateBookmarkModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="プライベートブックマークの削除" centered>
      <Stack gap="md">
        <Text size="sm">
          このプライベートブックマークをPDSから削除しますか？この操作は取り消せません。
        </Text>
        {title && (
          <Text size="sm" fw={600} lineClamp={2}>
            「{title}」
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            color="red"
            leftSection={<Trash2 size={16} />}
            loading={loading}
            onClick={handleDelete}
          >
            削除する
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
