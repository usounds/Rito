"use client";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Avatar, Text } from '@mantine/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import classes from './User.module.scss';

type UserProps = {
    did: string;
};

export default function User({ did }: UserProps) {
    const publicAgent = useXrpcAgentStore(state => state.publicAgent);
    const [handle, setHandle] = useState('');
    const [displayNamee, setDisplayNamee] = useState('');
    const [image, setImage] = useState('');

    useEffect(() => {
        // 非同期関数を内部で定義して即時呼び出し
        const fetchProfile = async () => {
            try {
                const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
                    params: { actor: did as ActorIdentifier },
                });
                if (userProfile.ok) {
                    setHandle(userProfile.data.handle);
                    setDisplayNamee(userProfile.data.displayName || '');
                    setImage(userProfile.data.avatar || '');
                }
            } catch (err) {
                console.error('Failed to fetch user profile', err);
            }
        };

        fetchProfile();
    }, [did]);


    return (
        <Link
            href={`https://bsky.app/profile/${did}`}
            target="_blank"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            className={classes.user}
        >
            <Avatar src={image} radius="xl" />

            <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                    {displayNamee || handle || "Loading..."}
                </Text>

                <Text c="dimmed" size="xs">
                    @{handle|| 'Loading...'}
                </Text>
            </div>
        </Link>

    );
}