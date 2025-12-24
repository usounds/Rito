"use client";
import { Authentication } from "@/components/Authentication";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Avatar, Button, Group, Modal, Stack, Switch, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

export function Auto() {
    const messages = useMessages();
    const locale = useLocale();
    const [loginOpened, setLoginOpened] = useState(false);
    const isLoginProcess = useXrpcAgentStore(state => state.isLoginProcess);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [enableAutoGenerateBookmark, setenableAutoGenerateBookmark] = useState(false)

    let duplicateCheck = false;
    useEffect(() => {
        if (!userProf) {

            return;
        }
        if (duplicateCheck) return;

        const fetchStatus = async () => {

            duplicateCheck = true;
            notifications.show({
                id: 'process',
                title: messages.settings.title,
                message: messages.settings.inform.loading,
                loading: true,
                autoClose: false
            });
            const { csrfToken } = await fetch("/api/csrf").then(r => r.json());

            const response2 = await fetch('/api/oauth/getServideAuth?lxm=blue.rito.preference.getPreference', {
                headers: {
                    "x-csrf-token": csrfToken
                }
            })

            if (!response2.ok) {
                console.error('Failed to get service auth', response2.status)
                setIsError(true);
                notifications.clean();
                setIsLoading(false)
                return
            }

            const { token } = await response2.json()

            const response = await fetch('/xrpc/blue.rito.preference.getPreference', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })


            if (response.ok) {
                const data = await response.json();
                setenableAutoGenerateBookmark(data.enableAutoGenerateBookmark || false);
            }else{
                setIsError(true);

            }

            notifications.clean();
            setIsLoading(false);
        };

        fetchStatus();
    }, [userProf]);


    async function changeenableAutoGenerateBookmark() {
        setIsError(false)
        setIsLoading(true)
        notifications.show({
            id: 'process',
            title: messages.settings.title,
            message: messages.settings.inform.saving,
            loading: true,
            autoClose: false
        });
        const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
        const jsonBody = {
            enableAutoGenerateBookmark: !enableAutoGenerateBookmark,
            lang: locale
        }

        const response2 = await fetch('/api/oauth/getServideAuth?lxm=blue.rito.preference.putPreference', {
            headers: {
                "x-csrf-token": csrfToken
            }
        })

        if (!response2.ok) {
            console.error('Failed to get service auth', response2.status)
            setIsLoading(false)
            setIsError(true);
            notifications.clean();
            return
        }

        const { token } = await response2.json()

        const response = await fetch('/xrpc/blue.rito.preference.putPreference', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(jsonBody)
        })

        if (response.ok) {
            const data = await response.json()
            setenableAutoGenerateBookmark(data.enableAutoGenerateBookmark ?? false)
        } else {
            console.error('Failed to update preference', response.status)
        }
        setIsLoading(false)
        notifications.clean();
    }

    return (
        <Stack gap="sm">
            <Title order={4}>{messages.settings.section.user.title}</Title>

            {!isLoginProcess && userProf == null ?
                <>
                    <Group gap="sm" wrap="nowrap" align="center" mt={2} mb='lg'>
                        <Button
                            onClick={() => setLoginOpened(true)}
                            variant="default"
                            w="auto"
                        >
                            {messages.login.title}
                        </Button>
                    </Group>

                    <Modal
                        opened={loginOpened}
                        onClose={() => setLoginOpened(false)}
                        size="md"
                        title={messages.login.titleDescription}
                        closeOnClickOutside={false}
                        centered
                    >
                        <Authentication />
                    </Modal>
                </>
                :

                <Group gap="sm" wrap="nowrap" align="center" mb='lg'>
                    <Avatar src={userProf?.avatar} radius="xl" />

                    <div style={{ flex: 1 }}>
                        <Text size="sm" fw={500}>
                            {userProf?.displayName || userProf?.handle || "Loading..."}
                        </Text>

                        <Text c="dimmed" size="xs">
                            @{userProf?.handle || 'Loading...'}
                        </Text>
                    </div>
                </Group>
            }
            <Title order={4}>{messages.settings.section.enableAutoGenerateBookmark.title}</Title>
            <Switch
                disabled={isLoading || userProf == null || isError}
                checked={enableAutoGenerateBookmark}
                onChange={changeenableAutoGenerateBookmark}
                description={messages.settings.section.enableAutoGenerateBookmark.description}
                label={messages.settings.section.enableAutoGenerateBookmark.enable}
            />
        </Stack>

    );

}