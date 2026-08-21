"use client";
import { Authentication } from "@/components/Authentication";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Alert, Avatar, Badge, Button, Group, Loader, Modal, Paper, Stack, Switch, Text, Title, SegmentedControl } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { usePreferenceStore } from '@/state/Preference';
import { AlertCircle, CheckCircle2, Lock, Save, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { checkSpaceCapability, deletePrivateBookmarkSpace, initializeSpace, requestPrivateAuthorization } from '@/logic/privateBookmark/pdsClient';
import { PdsCapabilityStatus } from '@/logic/privateBookmark/types';

export function Auto() {
    const messages = useMessages() as any;
    const locale = useLocale();
    const [loginOpened, setLoginOpened] = useState(false);
    const isLoginProcess = useXrpcAgentStore(state => state.isLoginProcess);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [enableAutoGenerateBookmark, setenableAutoGenerateBookmark] = useState(false)
    const unblurModerationCategories = usePreferenceStore(state => state.unblurModerationCategories);
    const setUnblurModerationCategories = usePreferenceStore(state => state.setUnblurModerationCategories);
    const isHydrated = usePreferenceStore(state => state.isHydrated);

    const [localUnblurCategories, setLocalUnblurCategories] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Private Bookmark Space capability state
    const [spaceStatus, setSpaceStatus] = useState<PdsCapabilityStatus>('checking');
    const [spaceMessage, setSpaceMessage] = useState<string | null>(null);
    const [isInitializingSpace, setIsInitializingSpace] = useState(false);
    const [deleteSpaceOpened, setDeleteSpaceOpened] = useState(false);
    const [isDeletingSpace, setIsDeletingSpace] = useState(false);
    const [spaceDeleteTargetDid, setSpaceDeleteTargetDid] = useState<string | null>(null);

    const duplicateCheck = useRef(false);
    const hasInitializedLocalModeration = useRef(false);

    const fetchStatus = useCallback(async () => {
        if (!userProf || duplicateCheck.current) return;
        duplicateCheck.current = true;

        notifications.show({
            id: 'process',
            title: messages.settings.title,
            message: messages.settings.inform.loading,
            loading: true,
            autoClose: false
        });

        try {
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
        } catch (err) {
            console.error("Error fetching status:", err);
            setIsError(true);
        } finally {
            notifications.clean();
            setIsLoading(false);
        }
    }, [userProf, messages, setUnblurModerationCategories]);

    useEffect(() => {
        if (userProf) {
            fetchStatus();
        }
    }, [userProf, fetchStatus]);

    useEffect(() => {
        if (isHydrated && !hasInitializedLocalModeration.current) {
            setLocalUnblurCategories(unblurModerationCategories);
            hasInitializedLocalModeration.current = true;
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

    const checkSpace = useCallback(async () => {
        if (!activeDid) return;
        setSpaceStatus('checking');
        try {
            const res = await checkSpaceCapability(activeDid);
            setSpaceStatus(res.status);
            setSpaceMessage(res.message || null);
        } catch {
            setSpaceStatus('unsupported');
        }
    }, [activeDid]);

    useEffect(() => {
        if (activeDid) {
            checkSpace();
        }
    }, [activeDid, checkSpace]);

    const handleInitializeSpace = async () => {
        if (!activeDid) return;
        setIsInitializingSpace(true);
        try {
            const result = await initializeSpace(activeDid);
            if (result.success) {
                notifications.show({
                    title: messages.settings?.section?.privateBookmark?.title || 'プライベートブックマーク(α)',
                    message: messages.settings?.section?.privateBookmark?.status?.ready || '有効化されました',
                    color: 'green',
                });
                await checkSpace();
            } else {
                notifications.show({
                    title: messages.privateBookmark?.inform?.spaceFailedTitle || 'Space作成エラー',
                    message: result.error || messages.privateBookmark?.inform?.spaceFailed || 'PDSでSpaceの作成に失敗しました。',
                    color: 'red',
                });
            }
        } finally {
            setIsInitializingSpace(false);
        }
    };

    const openDeleteSpaceModal = () => {
        if (!activeDid) return;
        setSpaceDeleteTargetDid(activeDid);
        setDeleteSpaceOpened(true);
    };

    const closeDeleteSpaceModal = () => {
        if (isDeletingSpace) return;
        setDeleteSpaceOpened(false);
        setSpaceDeleteTargetDid(null);
    };

    const handleDeleteSpace = async () => {
        if (!activeDid || !spaceDeleteTargetDid || activeDid !== spaceDeleteTargetDid) {
            setDeleteSpaceOpened(false);
            setSpaceDeleteTargetDid(null);
            notifications.show({
                title: messages.settings.section.privateBookmark?.deleteFailedTitle || 'Space削除エラー',
                message: messages.settings.section.privateBookmark?.accountChanged || 'アカウントが切り替わったため、Spaceの削除を中止しました。',
                color: 'red',
            });
            return;
        }

        setIsDeletingSpace(true);
        try {
            const result = await deletePrivateBookmarkSpace(spaceDeleteTargetDid);
            if (result.success) {
                setDeleteSpaceOpened(false);
                setSpaceDeleteTargetDid(null);
                setSpaceStatus('needs_space');
                setSpaceMessage('Space is not created yet');
                notifications.show({
                    title: messages.settings.section.privateBookmark?.deleteSuccessTitle || '退会しました',
                    message: messages.settings.section.privateBookmark?.deleteSuccess || 'プライベートブックマーク用Spaceを削除しました。',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: messages.settings.section.privateBookmark?.deleteFailedTitle || 'Space削除エラー',
                    message: messages.settings.section.privateBookmark?.deleteFailed || 'Spaceの削除に失敗しました。',
                    color: 'red',
                });
            }
        } finally {
            setIsDeletingSpace(false);
        }
    };

    const handleAuthorize = async () => {
        try {
            await requestPrivateAuthorization();
        } catch (err: any) {
            notifications.show({
                title: messages.privateBookmark?.inform?.authFailedTitle || '認可エラー',
                message: err?.message || messages.privateBookmark?.inform?.authFailed || 'OAuth認可の開始に失敗しました。',
                color: 'red',
            });
        }
    };

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
                        closeOnClickOutside={false}
                        centered
                    >
                        <Authentication lang={locale} />
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
            {/* プライベートブックマーク(α)設定 */}
            <Title order={4} mt="md">{messages.settings.section.privateBookmark?.title || 'プライベートブックマーク(α)'}</Title>
            <Text size="xs" c="dimmed">
                {spaceStatus === 'unsupported'
                    ? (messages.settings.section.privateBookmark?.descriptionUnsupported || 'あなたのアカウントが属するPDSは、atproto spacesに未対応です。')
                    : (messages.settings.section.privateBookmark?.description || '全体に公開せず、ご自身のPDS内に暗号保護された専用Spaceとして非公開ブックマークを保存します（atproto spaces対応）')}
            </Text>

            {userProf != null && spaceStatus !== 'unsupported' && (
                <Paper withBorder p="md" radius="md" shadow="xs" mb="sm">
                    <Stack gap="sm">
                        {spaceStatus === 'checking' && (
                            <Group gap="sm" align="center">
                                <Loader size="sm" color="violet" />
                                <Text size="sm" c="dimmed">{messages.settings?.section?.privateBookmark?.status?.checking || (locale === 'ja' ? 'PDSの対応状況を確認中...' : 'Checking PDS capability...')}</Text>
                            </Group>
                        )}

                        {spaceStatus === 'ready' && (
                            <Stack gap="md">
                                <Group justify="space-between" align="center" wrap="wrap">
                                    <div>
                                        <Group gap="xs" align="center">
                                            <CheckCircle2 size={18} color="var(--mantine-color-green-6)" />
                                            <Text size="sm" fw={600} c="green">
                                                {messages.settings.section.privateBookmark?.status?.ready || '有効化済み'}
                                            </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            {messages.settings.section.privateBookmark?.status?.readyDesc || 'PDS内に専用Spaceが作成されており、非公開ブックマークをご利用いただけます。'}
                                        </Text>
                                    </div>
                                    <Button variant="light" color="green" size="xs" disabled leftSection={<CheckCircle2 size={14} />}>
                                        {messages.settings.section.privateBookmark?.button?.enabled || '有効化済み'}
                                    </Button>
                                </Group>
                                <Group
                                    justify="space-between"
                                    align="center"
                                    wrap="wrap"
                                    pt="sm"
                                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                                >
                                    <div>
                                        <Text size="sm" fw={600}>
                                            {messages.settings.section.privateBookmark?.deleteSpaceTitle || 'Spaceの削除'}
                                        </Text>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            {messages.settings.section.privateBookmark?.deleteSpaceDesc || '専用Spaceを削除して、アルファ版の利用を終了します。'}
                                        </Text>
                                    </div>
                                    <Button
                                        variant="outline"
                                        color="red"
                                        size="xs"
                                        onClick={openDeleteSpaceModal}
                                        leftSection={<Trash2 size={14} />}
                                    >
                                        {messages.settings.section.privateBookmark?.button?.leave || 'プライベートブックマークを退会'}
                                    </Button>
                                </Group>
                            </Stack>
                        )}

                        {spaceStatus === 'needs_space' && (
                            <Group justify="space-between" align="center" wrap="wrap">
                                <div>
                                    <Group gap="xs" align="center">
                                        <Sparkles size={18} color="var(--mantine-color-indigo-6)" />
                                        <Text size="sm" fw={600} c="indigo">
                                            {messages.settings.section.privateBookmark?.status?.needs_space || '未作成（有効化が必要）'}
                                        </Text>
                                    </Group>
                                </div>
                                <Button
                                    variant="filled"
                                    color="indigo"
                                    size="xs"
                                    loading={isInitializingSpace}
                                    onClick={handleInitializeSpace}
                                    leftSection={<Sparkles size={14} />}
                                >
                                    {messages.settings.section.privateBookmark?.button?.enable || '有効化'}
                                </Button>
                            </Group>
                        )}

                        {spaceStatus === 'needs_auth' && (
                            <Group justify="space-between" align="center" wrap="wrap">
                                <div>
                                    <Group gap="xs" align="center">
                                        <ShieldAlert size={18} color="var(--mantine-color-violet-6)" />
                                        <Text size="sm" fw={600} c="violet">
                                            {messages.settings.section.privateBookmark?.status?.needs_auth || 'OAuth認可が必要'}
                                        </Text>
                                    </Group>
                                    <Text size="xs" c="dimmed" mt={4}>
                                        {messages.settings?.section?.privateBookmark?.status?.needs_authDesc || 'プライベートブックマーク機能を使用するにはOAuth権限の追加認可が必要です。'}
                                    </Text>
                                </div>
                                <Button
                                    variant="filled"
                                    color="violet"
                                    size="xs"
                                    onClick={handleAuthorize}
                                    leftSection={<Lock size={14} />}
                                >
                                    {messages.settings.section.privateBookmark?.button?.authorize || '非公開機能を認可する'}
                                </Button>
                            </Group>
                        )}
                    </Stack>
                </Paper>
            )}

            <Modal
                opened={deleteSpaceOpened}
                onClose={closeDeleteSpaceModal}
                closeOnClickOutside={!isDeletingSpace}
                closeOnEscape={!isDeletingSpace}
                withCloseButton={!isDeletingSpace}
                title={messages.settings.section.privateBookmark?.deleteModal?.title || 'プライベートブックマークを退会'}
                centered
            >
                <Stack gap="md">
                    <Alert color="red" icon={<ShieldAlert size={18} />}>
                        <Text size="sm" fw={600}>
                            {messages.settings.section.privateBookmark?.deleteModal?.warning || 'この操作は元に戻せません。'}
                        </Text>
                        <Text size="xs" mt={4}>
                            {messages.settings.section.privateBookmark?.deleteModal?.description || '専用Spaceを削除します。保存済みのプライベートブックマークは利用できなくなります。'}
                        </Text>
                    </Alert>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeDeleteSpaceModal} disabled={isDeletingSpace}>
                            {messages.settings.section.privateBookmark?.deleteModal?.cancel || 'キャンセル'}
                        </Button>
                        <Button
                            color="red"
                            loading={isDeletingSpace}
                            onClick={handleDeleteSpace}
                            leftSection={<Trash2 size={16} />}
                        >
                            {messages.settings.section.privateBookmark?.deleteModal?.confirm || 'Spaceを削除して退会'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

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
