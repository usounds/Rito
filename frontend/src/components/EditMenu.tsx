"use client";
import { useMyBookmark } from "@/state/MyBookmark";
import { usePrivateBookmark } from "@/state/PrivateBookmark";
import { ActionIcon, Menu, Modal } from '@mantine/core';
import { BookmarkPlus, CircleEllipsis, SquarePen, Trash2 } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useMemo, useState } from 'react';
import { DeleteBookmark } from '@/components/DeleteBookmark';
import { ShareOnBluesky } from '@/components/ShareOnBluesky';
import { Share } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from "next/navigation";
import { stripTrackingParams } from "@/logic/stripTrackingParams";

type Props = {
    subject: string;
    title: string;
    tags?: string[];
    image?: string;
    description?: string;
    isPrivate?: boolean;
};

export default function EditMenu({ subject, title, tags, image, description, isPrivate = false }: Props) {
    const [deleteBookmark, setDeleteBookmark] = useState(false);
    const [shareOnBluesky, setShareOnBluesky] = useState(false);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const privateBookmarks = usePrivateBookmark(state => state.bookmarks);
    const locale = useLocale();
    const messages = useMessages();
    const router = useRouter();

    const normalizeUrl = (u: string) => {
        try {
            const urlObj = new URL(u);
            if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
                return u.endsWith('/') ? u.slice(0, -1) : u;
            }
        } catch {
            // ignore
        }
        return u;
    };

    // subject に対応するブックマークがあるか判定 (公開・非公開の両方を検索)
    const matchedBookmark = useMemo(() => {
        const s1 = stripTrackingParams(subject);
        const norm1 = normalizeUrl(s1);

        // 1. 公開ブックマークから検索
        const foundPublic = myBookmark.find(b => {
            const s2 = stripTrackingParams(b.subject);
            return s1 === s2 || norm1 === normalizeUrl(s2);
        });
        if (foundPublic) {
            return { uri: foundPublic.uri, subject: foundPublic.subject, isPrivate: false };
        }

        // 2. 非公開ブックマークから検索
        const foundPrivate = privateBookmarks.find(b => {
            const s2 = stripTrackingParams(b.subject);
            return s1 === s2 || norm1 === normalizeUrl(s2);
        });
        if (foundPrivate) {
            return { uri: foundPrivate.uri, subject: foundPrivate.subject, isPrivate: true };
        }

        return null;
    }, [myBookmark, privateBookmarks, subject]);

    const handleEdit = () => {
        let targetUrl = `/${locale}/bookmark/register?aturi=${encodeURIComponent(
            matchedBookmark?.uri ?? ""
        )}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        if (matchedBookmark?.isPrivate) {
            targetUrl += `&isPrivate=true`;
        }
        router.push(targetUrl);
    };


    const handleRegister = () => {
        const targetUrl = `/${locale}/bookmark/register?subject=${encodeURIComponent(subject)}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
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
                    subject={isPrivate ? subject : `${process.env.NEXT_PUBLIC_URL}/${locale}/bookmark/details?uri=${encodeURIComponent(subject)}`}
                    title={title}
                    tags={tags}
                    onClose={() => setShareOnBluesky(false)}
                    originalUrl={subject}
                    image={image}
                    description={description}
                    forceOriginalLink={isPrivate}
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
