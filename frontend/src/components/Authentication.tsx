"use client";
import { resolveHandleViaDoH, resolveHandleViaHttp } from '@/logic/HandleDidredolver';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import {
  Anchor,
  Button,
  Group,
  Stack,
  Autocomplete,
  Title,
  Checkbox,
  Text,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { X, Bookmark } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState, useEffect } from "react";
import Link from 'next/link';
import { FaBluesky } from "react-icons/fa6";
import { useTopLoader } from 'nextjs-toploader';
import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui';
import { getAtPassport } from '@/logic/HandleAtPassport';

export function Authentication({ lang = 'ja' }: { lang?: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const publicAgent = useXrpcAgentStore(state => state.publicAgent);
  const setIsLoginProcess = useXrpcAgentStore(state => state.setIsLoginProcess);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rito_agree_terms');
    if (saved === 'true') {
      setChecked(true);
    }
  }, []);

  const handleCheckedChange = (val: boolean) => {
    setChecked(val);
    localStorage.setItem('rito_agree_terms', val.toString());
  };
  const handle = useXrpcAgentStore(state => state.handle);
  const setHandle = useXrpcAgentStore(state => state.setHandle);
  const messages = useMessages();
  const loader = useTopLoader();

  // ブラウザバック対策: マウント時に通知をクリアし、ロード状態をリセット
  useEffect(() => {
    notifications.clean();
    if (loader) {
      loader.done();
    }
    setIsLoading(false);
    setIsLoginProcess(false);
  }, []); // 初回表示時のみ実行

  const form = useForm({
    initialValues: {
      handle: handle || '',
    },

    validate: {
      handle: (val) => {
        if (/\s/.test(val)) {
          return messages.login.error.whitespace;
        }
        if (!val.includes('.')) {
          return messages.login.error.notdomain;
        }
        if (!/^[\x00-\x7F]+$/.test(val)) {
          return messages.login.error.multibyte;
        }
        return null;
      },
    },
  });

  async function performLogin(values: { handle: string }, prompt?: "none" | "login" | "consent" | "select_account" | "create") {
    setIsLoading(true);

    notifications.show({
      id: 'login-process',
      title: messages.login.title,
      message: messages.login.didresolve,
      loading: true,
      autoClose: false
    });


    try {
      if (prompt !== 'create') {
        try {
          //　HTTP 解決
          await resolveHandleViaHttp(values.handle);
        } catch (e) {
          console.warn('HTTP resolve failed, trying DoH:', e);
          try {
            // DoH 解決
            await resolveHandleViaDoH(values.handle);
          } catch (e2) {
            console.error('DoH resolve failed:', e2);
            // 両方ダメなら通知出して終了
            notifications.update({
              id: 'login-process',
              title: 'Error',
              message: messages.login.error.invalidhandle,
              color: 'red',
              loading: false,
              autoClose: true,
              icon: <X />
            });
            setIsLoading(false);
            return;
          }
        }
        setHandle(values.handle)
      }

    } catch (e) {
      // 想定外の例外キャッチ
      console.error('resolveFromIdentity unexpected error:', e);
      notifications.update({
        id: 'login-process',
        title: 'Error',
        message: 'Unexpected Error:' + e,
        color: 'red',
        loading: false,
        autoClose: true,
        icon: <X />
      });
      setIsLoading(false);
      return;
    }

    const message = messages.login.redirect

    notifications.update({
      id: 'login-process',
      title: messages.login.title,
      message: message,
      color: 'blue',
      loading: true,
      autoClose: false
    });

    try {
      const returnTo = window.location.href;

      loader.start()
      setIsLoginProcess(true)
      const cleanHandle = values.handle.replace(/^@/, ''); // 先頭の@を除去
      if (prompt !== 'create') {
        setHandle(cleanHandle);
      }

      const csrf = await fetch("/api/csrf").then(r => r.json());
      loader.start()
      const res = await fetch("/api/oauth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handle: cleanHandle,
          returnTo,
          csrf: csrf.csrfToken,
          prompt,
        }),
      });

      if (!res.ok) {
        throw new Error("OAuth login failed");
      }

      const { url } = await res.json();
      window.location.href = url;

    } catch (e) {
      notifications.update({
        id: 'login-process',
        title: 'Error',
        message: 'Unexpected Error:' + e,
        color: 'red',
        loading: false,
        autoClose: true,
        icon: <X />
      });
      loader.done()
      setIsLoading(false);
    } finally {
      //なにもしない
    }

  }

  async function performAtPassportLogin() {
    setIsLoading(true);

    notifications.show({
      id: 'atpassport-login-process',
      title: AtPassportUI[lang === 'ja' ? 'ja' : 'en'].title,
      message: messages.login.redirect,
      loading: true,
      autoClose: false
    });

    try {
      const atp = getAtPassport({ lang: lang as 'ja' | 'en' });

      // AtPassport へのリダイレクト URL を生成
      // ここでは mode: 'bypass' を使用せず、ハンドル取得・解決を AtPassport に委ねる
      // また、戻り先の URL をカスタムパラメータとして渡す
      const { url, atpstate } = atp.generateAuthUrl({ returnTo: window.location.href });

      // CSRF 対策として atpstate をクッキーに保存 (10分間)
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      const cookieValue = `atpstate=${encodeURIComponent(atpstate)}; path=/; max-age=600; SameSite=Lax${secure}`;
      document.cookie = cookieValue;

      console.log('AtPassport Cookie saved:', cookieValue);
      console.log('Current document.cookie:', document.cookie);

      window.location.href = url;

    } catch (e) {
      notifications.update({
        id: 'atpassport-login-process',
        title: 'Error',
        message: 'Unexpected Error:' + e,
        color: 'red',
        loading: false,
        autoClose: true,
        icon: <X />
      });
      loader.done();
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: typeof form.values) {
    await performLogin(values);
  }

  const tosLink = (
    <Link
      href={`/${lang}/tos`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--mantine-color-blue-filled)', textDecoration: 'none', fontWeight: 500 }}
    >
      {messages.header.termofuse}
    </Link>
  );

  const privacyLink = (
    <Link
      href={`/${lang}/privacy`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--mantine-color-blue-filled)', textDecoration: 'none', fontWeight: 500 }}
    >
      {messages.header.privacypolicy}
    </Link>
  );


  const handleInput = async (event: React.FormEvent<HTMLInputElement>) => {
    const val = event.currentTarget.value;
    if (!val) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await publicAgent.get("app.bsky.actor.searchActorsTypeahead", {
        params: {
          q: val,
          limit: 5,
        },
      });

      if (res.ok) {
        // actor.handle を候補として表示
        setSuggestions(res.data.actors.map((a) => a.handle));
      }
    } catch (err) {
      console.error("searchActorsTypeahead error", err);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="xl" py="sm">
        <Stack gap={0} align="center">
          <Group gap="xs">
            <Bookmark size={28} color="var(--mantine-color-blue-filled)" />
            <Title order={2} style={{ letterSpacing: '-0.5px', fontWeight: 700 }}>{messages.title}</Title>
          </Group>
          <Text size="xs" c="dimmed" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
            {messages.login.titleDescription}
          </Text>
        </Stack>

        <Stack gap="md">
          <Checkbox
            checked={checked}
            onChange={(event) => handleCheckedChange(event.currentTarget.checked)}
            size="xs"
            label={
              <Text size="xs" c="dimmed">
                {messages.login.field.agree.title} {tosLink} {privacyLink}
              </Text>
            }
          />

          <Stack gap="md">
            <Autocomplete
              label={messages.login.field.handle.title}
              placeholder={messages.login.field.handle.placeholder}
              value={form.values.handle}
              disabled={isLoading}
              leftSection="@"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              onChange={(value) => {
                form.setFieldValue("handle", value);
                setSuggestions([]);
              }}
              error={form.errors.handle}
              onInput={handleInput}
              data={suggestions}
              size="sm"
            />
            <Button
              type="submit"
              radius="md"
              color="blue.7"
              loading={isLoading}
              disabled={!checked}
              leftSection={<FaBluesky size={22} />}
              fullWidth
            >
              {messages.login.button.login}
            </Button>
          </Stack>

          <Divider label={lang === 'ja' ? 'または' : 'OR'} labelPosition="center" my="xs" />

          <Stack gap="sm">
            <Button
              variant="outline"
              color="blue.7"
              radius="md"
              loading={isLoading}
              disabled={!checked}
              leftSection={<AtPassportIcon size={24} />}
              onClick={() => performAtPassportLogin()}
              fullWidth
            >
              {AtPassportUI[lang === 'ja' ? 'ja' : 'en'].title}
            </Button>
            <Text size="xs" c="dimmed" style={{ textAlign: 'left' }}>
              {AtPassportUI[lang === 'ja' ? 'ja' : 'en'].description}
            </Text>
          </Stack>
        </Stack>

        <Group justify="center">
          <Anchor
            component="button"
            type="button"
            onClick={() => performLogin({ handle: 'https://bsky.social' }, 'create')}
            c="dimmed"
            size="xs"
            disabled={!checked}
            style={{
              opacity: checked ? 1 : 0.5,
              cursor: checked ? 'pointer' : 'not-allowed',
              textDecoration: 'none'
            }}
          >
            {messages.login.create}
          </Anchor>
        </Group>
      </Stack>
    </form>
  );
}
