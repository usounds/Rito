'use client';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { ActionIcon, Menu, Modal } from '@mantine/core';
import { BookmarkPlus, CircleEllipsis, SquarePen, Trash2 } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useEffect, useState } from 'react';
import { DeleteBookmark } from '@/components/DeleteBookmark';
import { ShareOnBluesky } from '@/components/ShareOnBluesky';
import { Share } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from "next/navigation";

type Props = {
    subject: string;
    title: string;
    tags?: string[];
    image?: string;
    description?: string;
};

export default function EditMenu({ subject, title, tags, image, description }: Props) {
    const [deleteBookmark, setDeleteBookmark] = useState(false);
    const [shareOnBluesky, setShareOnBluesky] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const locale = useLocale();
    const messages = useMessages();
    const router = useRouter();

    // subject に対応するブックマークがあるか判定
    const matchedBookmark = myBookmark.find(b => b.subject === subject);

    useEffect(() => {
        // setData(prev => prev + " (processed on client)");
    }, []);



    const handleEdit = () => {
        const targetUrl = `/${locale}/bookmark/register?aturi=${encodeURIComponent(
            matchedBookmark?.uri ?? ""
        )}`;
        router.push(targetUrl);
    };


    const handleRegister = () => {
        const targetUrl = `/${locale}/bookmark/register?subject=${encodeURIComponent(subject)}`
        router.push(targetUrl);
    };

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


            <Modal
                opened={shareOnBluesky}
                onClose={() => setShareOnBluesky(false)}
                size="md"
                title={messages.share.title}
                centered
                closeOnClickOutside={false}
            >
                <ShareOnBluesky
                    subject={`${process.env.NEXT_PUBLIC_URL}/${locale}/bookmark/details?uri=${encodeURIComponent(subject)}`}
                    title={title}
                    tags={tags}
                    onClose={() => setShareOnBluesky(false)}
                    originalUrl={subject}
                    image={image}
                    description={description}
                />
            </Modal>

            <Menu.Dropdown>
                <Menu.Label>{messages.detail.menu.title}</Menu.Label>

                <Menu.Item leftSection={<Share size={14} />} onClick={() => setShareOnBluesky(true)} >
                    {messages.detail.menu.share.title}
                </Menu.Item>

                {matchedBookmark ? (
                    <>
                        <Menu.Item leftSection={<SquarePen size={14} />} onClick={handleEdit} >
                            {messages.detail.menu.edit.title}
                        </Menu.Item>
                        <Menu.Item leftSection={<Trash2 size={14} />} onClick={() => setDeleteBookmark(true)} color='red'>
                            {messages.detail.menu.delete.title}
                        </Menu.Item>
                    </>
                ) : (
                    <Menu.Item leftSection={<BookmarkPlus size={14} />} onClick={handleRegister} >
                        {messages.detail.menu.regist.title}
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    );
}
