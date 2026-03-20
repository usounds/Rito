"use client";
import { Authentication } from "@/components/Authentication";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Alert, Avatar, Button, Group, Modal, Paper, Stack, Switch, Text, Title, SegmentedControl } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import { usePreferenceStore } from '@/state/Preference';
import { Save } from 'lucide-react';

export function Auto() {
    const messages = useMessages();
    const locale = useLocale();
    const [loginOpened, setLoginOpened] = useState(false);
    const isLoginProcess = useXrpcAgentStore(state => state.isLoginProcess);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [enableAutoGenerateBookmark, setenableAutoGenerateBookmark] = useState(false)
    const unblurModerationCategories = usePreferenceStore(state => state.unblurModerationCategories);
    const setUnblurModerationCategories = usePreferenceStore(state => state.setUnblurModerationCategories);
    const isHydrated = usePreferenceStore(state => state.isHydrated);

    const [localUnblurCategories, setLocalUnblurCategories] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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
                if (data.unblurModerationCategories) {
                    setUnblurModerationCategories(data.unblurModerationCategories);
                    setLocalUnblurCategories(data.unblurModerationCategories);
                }
            } else {
                setIsError(true);

            }

            notifications.clean();
            setIsLoading(false);
        };

        fetchStatus();
    }, [userProf]);

    useEffect(() => {
        if (isHydrated && unblurModerationCategories.length > 0 && localUnblurCategories.length === 0) {
            setLocalUnblurCategories(unblurModerationCategories);
        }
    }, [isHydrated, unblurModerationCategories]);


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

    const [lastLogin, setLastLogin] = useState<string | null>(null);

    useEffect(() => {
        if (userProf) {
            fetch("/api/session-info")
                .then(res => res.json())
                .then(data => {
                    if (data.updatedAt) {
                        setLastLogin(new Date(data.updatedAt).toLocaleDateString(locale, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }));
                    }
                })
                .catch(err => console.error("Failed to fetch session info", err));
        }
    }, [userProf, locale]);

    function toggleLocalCategory(category: string, checked: boolean) {
        setLocalUnblurCategories(prev => {
            if (checked) {
                return prev.includes(category) ? prev : [...prev, category];
            } else {
                return prev.filter(c => c !== category);
            }
        });
    }

    async function saveModerationSettings() {
        if (!userProf) return;

        setIsSaving(true)
        notifications.show({
            id: 'saving-moderation',
            title: messages.settings.section.unblurModeration.title,
            message: messages.settings.inform.saving,
            loading: true,
            autoClose: false
        });

        const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
        const jsonBody = {
            enableAutoGenerateBookmark,
            lang: locale,
            unblurModerationCategories: localUnblurCategories
        }

        try {
            const response2 = await fetch('/api/oauth/getServideAuth?lxm=blue.rito.preference.putPreference', {
                headers: { "x-csrf-token": csrfToken }
            })

            if (!response2.ok) throw new Error('Failed to get service auth');

            const { token } = await response2.json()

            const response = await fetch('/xrpc/blue.rito.preference.putPreference', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(jsonBody)
            })

            if (response.ok) {
                setUnblurModerationCategories(localUnblurCategories);
                notifications.update({
                    id: 'saving-moderation',
                    title: messages.settings.section.unblurModeration.title,
                    message: messages.detail.inform.success,
                    loading: false,
                    autoClose: 2000,
                    color: 'teal'
                });
            } else {
                throw new Error('Failed to update preference');
            }
        } catch (e) {
            console.error(e);
            notifications.update({
                id: 'saving-moderation',
                title: messages.settings.section.unblurModeration.title,
                message: messages.settings.inform.error,
                loading: false,
                autoClose: 2000,
                color: 'red'
            });
        }
        setIsSaving(false)
    }

    const moderationCategories = useMemo(() => {
        return Object.keys(messages.moderations);
    }, [messages.moderations]);

    function blurAllCategories() {
        setLocalUnblurCategories([]);
    }

    function unblurAllCategories() {
        setLocalUnblurCategories([...moderationCategories]);
    }

    async function handleRelogin() {
        if (!userProf?.handle) return;
        setIsLoading(true);

        try {
            const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
            const returnTo = window.location.href;

            const res = await fetch("/api/oauth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    handle: userProf.handle,
                    returnTo,
                    csrf: csrfToken,
                }),
            });

            if (!res.ok) {
                throw new Error("OAuth login failed");
            }

            const { url } = await res.json();
            window.location.href = url;
        } catch (e) {
            console.error("Relogin failed", e);
            notifications.show({
                title: 'Error',
                message: messages.settings.inform.error,
                color: 'red',
            });
            setIsLoading(false);
        }
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
                <Paper withBorder p="md" radius="md" shadow="xs">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Group gap="sm">
                                <Avatar src={userProf?.avatar} radius="xl" size="lg" />
                                <div>
                                    <Text size="sm" fw={600}>
                                        {userProf?.displayName || userProf?.handle || "Loading..."}
                                    </Text>
                                    <Text c="dimmed" size="xs">
                                        @{userProf?.handle || 'Loading...'}
                                    </Text>
                                    {lastLogin && (
                                        <Text size="xs" c="dimmed" mt={2}>
                                            {messages.settings.section.user.lastLogin.replace('{date}', lastLogin)}
                                        </Text>
                                    )}
                                </div>
                            </Group>
                            <Button
                                variant="light"
                                size="sm"
                                onClick={handleRelogin}
                                loading={isLoading}
                                color="blue"
                            >
                                {messages.settings.section.user.relogin}
                            </Button>
                        </Group>

                        <Alert color="blue" variant="light" radius="md" style={{ border: 'none' }}>
                            <Text size="xs" style={{ lineHeight: 1.5 }}>
                                {messages.settings.section.user.reloginDescription}
                            </Text>
                        </Alert>
                    </Stack>
                </Paper>
            }
            <Title order={4}>{messages.settings.section.enableAutoGenerateBookmark.title}</Title>
            <Switch
                disabled={isLoading || userProf == null || isError}
                checked={enableAutoGenerateBookmark}
                onChange={changeenableAutoGenerateBookmark}
                description={messages.settings.section.enableAutoGenerateBookmark.description}
                label={messages.settings.section.enableAutoGenerateBookmark.enable}
            />

            <Title order={4}>{messages.settings.section.unblurModeration.title}</Title>
            <Text size="xs" c="dimmed">
                {messages.settings.section.unblurModeration.description}
            </Text>
            <Group gap="xs" mt="xs" justify="center">
                <Button variant="default" size="xs" onClick={blurAllCategories} disabled={!isHydrated || isLoading || userProf == null || isError}>
                    {messages.settings.section.unblurModeration.bulkAction.blurAll}
                </Button>
                <Button variant="default" size="xs" onClick={unblurAllCategories} disabled={!isHydrated || isLoading || userProf == null || isError}>
                    {messages.settings.section.unblurModeration.bulkAction.unblurAll}
                </Button>
            </Group>
            <Stack gap="sm" mt="xs">
                {moderationCategories.map(cat => (
                    <Group key={cat} justify="space-between" align="center" wrap="nowrap">
                        <Text size="sm" style={{ flex: 1 }}>{messages.moderations[cat]}</Text>
                        <SegmentedControl
                            size="xs"
                            disabled={!isHydrated || (userProf != null && isLoading) || isError}
                            value={localUnblurCategories.includes(cat) ? 'unblur' : 'blur'}
                            onChange={(val) => toggleLocalCategory(cat, val === 'unblur')}
                            data={[
                                { label: messages.settings.section.unblurModeration.options.blur, value: 'blur' },
                                { label: messages.settings.section.unblurModeration.options.unblur, value: 'unblur' }
                            ]}
                        />
                    </Group>
                ))}
            </Stack>
            <Group justify="flex-end" mt="md">
                <Button
                    onClick={saveModerationSettings}
                    loading={isSaving}
                    disabled={!isHydrated || isLoading || userProf == null || isError}
                    leftSection={<Save size={16} />}
                >
                    {messages.create.button.regist}
                </Button>
            </Group>
        </Stack>

    );

}