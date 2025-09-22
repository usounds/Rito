"use client";
import { RegistSchema } from "./RegistSchema";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { usePreferenceStore } from "@/state/PreferenceStore";
import { Button, Modal, Table, Switch, Group, Text, ScrollArea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMessages } from "next-intl";
import { useEffect, useState } from "react";

interface SchemaEditorProps {
  nsid: string;
  domain: string;
}

interface UFOMatch {
  nsid: string;
  creates: number;
  updates: number;
  deletes: number;
  dids_estimate: number;
}

interface Resolver {
  nsid: string;
  did: string;
  schema: string;
  verified: boolean;
}

interface MergedData extends UFOMatch {
  owner?: Resolver;
  others: Resolver[];
}

export function SchemaEditor({ nsid, domain }: SchemaEditorProps) {
  const messages = useMessages();
  const [data, setData] = useState<MergedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNsid, setSelectedNsid] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | undefined>(undefined);
  const [isCreate, setIsCreate] = useState(false);
  const activeDid = useXrpcAgentStore((state) => state.activeDid);
  const isDeveloper = usePreferenceStore((state) => state.isDeveloper);
  const setIsDeveloper = usePreferenceStore((state) => state.setIsDeveloper);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const ufoRes = await fetch(
          `https://ufos-api.microcosm.blue/search?q=${encodeURIComponent(nsid)}`
        );
        if (!ufoRes.ok) throw new Error("Failed to fetch UFO data");
        const ufoJson: { matches: UFOMatch[] } = await ufoRes.json();

        const resolverRes = await fetch(`/api/resolvers?nsid=${encodeURIComponent(nsid)}`);
        if (!resolverRes.ok) throw new Error("Failed to fetch resolvers");
        const resolversJson: Resolver[] = await resolverRes.json();

        const merged: MergedData[] = ufoJson.matches.map((match) => {
          const related = resolversJson.filter((r) => r.nsid === match.nsid) || [];
          const owner = related.find((r) => r.verified);
          const others = related.filter((r) => !r.verified) || [];
          return { ...match, owner, others };
        });
        setData(merged);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [nsid]);

  const handleEdit = (nsid: string, schema?: string) => {
    setSelectedNsid(nsid);
    setSelectedSchema(schema);

    // nsid が一致し、かつ did が activeDid と一致する Resolver を探す
    const exists = data.some(
      (item) =>
        (item.owner?.did === activeDid && item.owner?.nsid === nsid) ||
        item.others.some((resolver) => resolver.did === activeDid && resolver.nsid === nsid)
    );

    setIsCreate(!exists); // 見つかったら false、なければ true
    open();
  };

  if (loading) return <Group my="sm"><Text c="dimmed">{messages.editschema.inform.loading}</Text></Group>;
  if (error) return <Group my="sm"><Text c="dimmed">Error: {error}</Text></Group>;
  if (data.length === 0) return <Group my="sm"><Text c="dimmed">{messages.editschema.inform.nolexicon}</Text></Group>;

  return (
    <>

      <Group my="sm">
        <Switch
          checked={isDeveloper}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setIsDeveloper(event.currentTarget.checked)
          }
          label={messages.detail.field.developer.title}
        />
      </Group>
      {isDeveloper &&
        <ScrollArea w="100%" type="auto" offsetScrollbars>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>NSID</Table.Th>
                <Table.Th>{messages.detail.field.schema.title}</Table.Th>
                <Table.Th>{messages.detail.field.count.title}</Table.Th>
                <Table.Th>{messages.detail.field.action.title}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.flatMap((match) => {
                if (match.owner) {
                  const canEdit = match.owner.did === activeDid;
                  return (
                    <Table.Tr key={`${match.nsid}-owner`}>
                      <Table.Td>{match.nsid}</Table.Td>
                      <Table.Td>{match.owner.schema}</Table.Td>
                      <Table.Td >Owner</Table.Td>
                      <Table.Td>
                        <Button
                          disabled={(!canEdit || !activeDid)}
                          onClick={() => handleEdit(match.nsid, match.owner!.schema)}
                          variant="outline"
                          size="xs"
                        >
                          {messages.editschema.button.regist}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                }

                if (match.others?.length > 0) {
                  const grouped = match.others.reduce<Record<string, Resolver[]>>((acc, r) => {
                    if (!acc[r.schema]) acc[r.schema] = [];
                    acc[r.schema].push(r);
                    return acc;
                  }, {});

                  // resolvers.length が最大のものを探す
                  const [maxSchema, maxResolvers] = Object.entries(grouped).reduce(
                    (max, current) => (current[1].length > max[1].length ? current : max),
                    ["", [] as Resolver[]]
                  );

                  return (
                    <Table.Tr key={`${match.nsid}-other`}>
                      <Table.Td>{match.nsid}</Table.Td>
                      <Table.Td>{maxSchema}</Table.Td>
                      <Table.Td>{maxResolvers.length}</Table.Td>
                      <Table.Td>
                        <Button
                          disabled={!activeDid}
                          onClick={() => handleEdit(match.nsid, maxSchema)}
                          variant="outline"
                          size="xs"
                        >
                          {messages.editschema.button.regist}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                } else {
                  return (
                    <tr key={`${match.nsid}-no-resolver`}>
                      <Table.Td>{match.nsid}</Table.Td>
                      <Table.Td >-</Table.Td>
                      <Table.Td >0</Table.Td>
                      <Table.Td>
                        <Button
                          disabled={!activeDid}
                          onClick={() => handleEdit(match.nsid)}
                          variant="outline"
                          size="xs"
                        >
                          {messages.editschema.button.regist}
                        </Button>
                      </Table.Td>
                    </tr>
                  );
                }
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      }

      <Modal
        opened={opened}
        onClose={close}
        title={messages.editschema.title}
        size="lg"
        closeOnClickOutside={false} 
        centered
      >
        {selectedNsid && (
          <RegistSchema
            nsid={selectedNsid}
            schema={selectedSchema}
            domain={domain}
            isCreate={isCreate}
            onClose={close}
          />
        )}
      </Modal>
    </>
  );
}
