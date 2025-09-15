"use client";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Trash, X } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState } from 'react';
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Pencil } from 'lucide-react';
import { BlueRitoServiceSchema } from '@/lexicons';
import { Switch } from '@mantine/core';

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
    const [loading, setLoading] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [schemaValue, setSchemaValue] = useState(
        !schema || schema === "-" ? `https://${domain}/` : schema
    );
    const [checked, setChecked] = useState(schema === "invalid:schema");

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.currentTarget.checked;
        setChecked(isChecked);

        if (isChecked) {
            // スイッチがオンなら schemaValue をデフォルトに戻す
            setSchemaValue(`invalid:schema`);
        } else {
            setSchemaValue(`https://${domain}/`)
        }
    };

    const handleEdit = async () => {
        if (!thisClient) return;

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
                rkey: nsid,
                value: obj as Record<string, unknown>,
            });

        } else {
            writes.push({
                $type: "com.atproto.repo.applyWrites#update" as const,
                collection: "blue.rito.service.schema" as `${string}.${string}.${string}`,
                rkey: nsid,
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

    return (
        <Stack>
            {!checked &&
                <TextInput
                    placeholder={messages.editschema.field.schema.placeholder}
                    label={messages.editschema.field.schema.title}
                    description={messages.editschema.field.schema.description}
                    value={schemaValue}
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
                <Button
                    leftSection={<Pencil size={16} />}
                    loading={loading}
                    onClick={handleEdit}
                >
                    {messages.editschema.button.regist}
                </Button>
            </Group>
        </Stack>
    );
};
