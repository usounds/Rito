"use client";
import { BlueRitoServiceSchema } from '@/lexicons';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Button, Group, Stack, Switch, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Trash, X } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState } from 'react';

type RegistSchemaProps = {
    nsid: string;
    isCreate: boolean;
    schema?: string;
    domain?: string;
    onClose: () => void;
};

export const RegistSchema: React.FC<RegistSchemaProps> = ({ nsid, isCreate, schema, domain, onClose }) => {
    const messages = useMessages();
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [loading, setLoading] = useState(false);

    // 初期 schemaValue を決定
    const initialSchemaValue = (!schema)
        ? `https://${domain}/`
        : schema;

    const [schemaValue, setSchemaValue] = useState(initialSchemaValue);
    const [nsidValue, setNsidValue] = useState(nsid);
    const [checked, setChecked] = useState(
        initialSchemaValue === `https://${domain}/missing.schema` && schema !== "-"
    );
    const [schemaError, setSchemaError] = useState('');

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.currentTarget.checked;
        setChecked(isChecked);

        if (isChecked) {
            // スイッチがオンなら missing.schema を適用
            setSchemaValue(`https://${domain}/missing.schema`);
        } else {
            // スイッチがオフなら通常の schema に戻す
            setSchemaValue(`https://${domain}/`);
        }
    };

    const handleEdit = async () => {
        if (!thisClient) return;

        if (!checked && !schemaValue.includes('did') && !schemaValue.includes('rkey')) {
            setSchemaError(messages.editschema.error.schemaRequired)
            return
        }

        setLoading(true);

        const obj: BlueRitoServiceSchema.Main = {
            $type: "blue.rito.service.schema",
            schema: schemaValue as `${string}:${string}`,
        };

        const writes = []
        if (isCreate) {
            writes.push({
                $type: "com.atproto.repo.applyWrites#create" as const,
                collection: "blue.rito.service.schema" as `${string}.${string}.${string}`,
                rkey: nsidValue,
                value: obj as Record<string, unknown>,
            });

        } else {

            writes.push({
                $type: "com.atproto.repo.applyWrites#update" as const,
                collection: "blue.rito.service.schema" as `${string}.${string}.${string}`,
                rkey: nsidValue,
                value: obj as Record<string, unknown>,
            });
        }

        try {
            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
                    writes: writes
                },
            });

            if (ret.ok) {

                notifications.show({
                    title: 'Success',
                    message: messages.editschema.inform.success,
                    color: 'teal',
                    icon: <Check />
                });
                onClose();
                setLoading(false);
                return

            }


        } catch {

            notifications.show({
                title: 'Error',
                message: messages.editschema.inform.error,
                color: 'red',
                icon: <X />
            });

        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);

        const writes = []
        writes.push({
            $type: "com.atproto.repo.applyWrites#delete" as const,
            collection: "blue.rito.service.schema" as `${string}.${string}.${string}`,
            rkey: nsidValue
        });

        try {
            
            const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
                    writes: writes
                },
                headers: {
                    "X-CSRF-Token": csrfToken,
                },
            });

            if (ret.ok) {

                notifications.show({
                    title: 'Success',
                    message: messages.editschema.inform.successDelete,
                    color: 'teal',
                    icon: <Check />
                });
                onClose();
                setLoading(false);
                return

            }


        } catch {

            notifications.show({
                title: 'Error',
                message: messages.editschema.inform.error,
                color: 'red',
                icon: <X />
            });

        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack>

            <TextInput
                placeholder={messages.editschema.field.nsid.placeholder}
                label={messages.editschema.field.nsid.title}
                description={messages.editschema.field.nsid.description}
                value={nsidValue}
                onChange={(e) => setNsidValue(e.currentTarget.value)}
            />
            {!checked &&
                <TextInput
                    placeholder={messages.editschema.field.schema.placeholder}
                    label={messages.editschema.field.schema.title}
                    description={messages.editschema.field.schema.description}
                    value={schemaValue}
                    error={schemaError}
                    onChange={(e) => setSchemaValue(e.currentTarget.value)}
                />
            }
            <Switch
                checked={checked}
                onChange={handleSwitchChange}
                label={messages.editschema.field.invalid.title}
            />
            <Group justify="right">
                <Button variant="default" onClick={onClose}>
                    {messages.editschema.button.close}
                </Button>
                {!isCreate &&
                    <Button color="red" onClick={handleDelete}
                        loading={loading}
                        leftSection={<Trash size={16} />}>
                        {messages.editschema.button.delete}
                    </Button>
                }
                <Button
                    loading={loading}
                    onClick={handleEdit}
                >
                    {messages.editschema.button.regist}
                </Button>
            </Group>
        </Stack>
    );
};
