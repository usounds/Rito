'use client';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { ActionIcon, Menu, Modal } from '@mantine/core';
import { BookmarkPlus, CircleEllipsis, SquarePen, Trash2 } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useEffect, useState } from 'react';
import { DeleteBookmark } from '@/components/DeleteBookmark';
import Link from 'next/link';
import { useLocale } from 'next-intl';

type Props = {
    subject: string;
};

export default function EditMenu({ subject }: Props) {
    const [deleteBookmark, setDeleteBookmark] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const locale = useLocale();
    const messages = useMessages();

    // subject に対応するブックマークがあるか判定
    const matchedBookmark = myBookmark.find(b => b.subject === subject);

    useEffect(() => {
        // setData(prev => prev + " (processed on client)");
    }, []);

    if (!activeDid) return null;

    return (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <ActionIcon variant="transparent" color="gray" size="lg" aria-label="Settings">
                    <CircleEllipsis />
                </ActionIcon>
            </Menu.Target>


            <Modal
                opened={deleteBookmark}
                onClose={() => setDeleteBookmark(false)}
                size="md"
                title={messages.delete.title}
                centered
            >
                <DeleteBookmark aturi={matchedBookmark?.uri} onClose={() => setDeleteBookmark(false)} />
            </Modal>

            <Menu.Dropdown>
                <Menu.Label>{messages.detail.menu.title}</Menu.Label>

                {matchedBookmark ? (
                    <>
                        <Menu.Item leftSection={<SquarePen size={14} />}>

                            <Link href={`/${locale}/bookmark/register?aturi=${encodeURIComponent(matchedBookmark?.uri)}`} style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                wordBreak: 'break-all',   // 単語途中でも改行
                                overflowWrap: 'anywhere', // 長いURLを折り返す
                            }}>
                                {messages.detail.menu.edit.title}
                            </Link>
                        </Menu.Item>
                        <Menu.Item leftSection={<Trash2 size={14} />} onClick={() => setDeleteBookmark(true)} color='red'>
                            {messages.detail.menu.delete.title}
                        </Menu.Item>
                    </>
                ) : (
                    <Menu.Item leftSection={<BookmarkPlus size={14} />}>
                        <Link href={`/${locale}/bookmark/register?subject=${encodeURIComponent(subject)}`} style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            wordBreak: 'break-all',   // 単語途中でも改行
                            overflowWrap: 'anywhere', // 長いURLを折り返す
                        }}>
                            {messages.detail.menu.regist.title}
                        </Link>
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    );
}
