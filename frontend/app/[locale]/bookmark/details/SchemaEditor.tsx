"use client";
import { useEffect, useState } from "react";
import { Table, Button, Group, Modal } from "@mantine/core";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { RegistSchema } from "@/components/RegistSchema";
import { useDisclosure } from "@mantine/hooks";
import { useMessages } from "next-intl";

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
          const related = resolversJson.filter((r) => r.nsid.startsWith(match.nsid)) || [];
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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (data.length === 0) return <p>No matches found</p>;

  return (
    <>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>NSID</Table.Th>
            <Table.Th>Schema</Table.Th>
            <Table.Th>Count</Table.Th>
            <Table.Th>Actions</Table.Th>
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
                        disabled={!canEdit}
                        onClick={() => handleEdit(match.nsid, match.owner!.schema)}
                        variant="outline"
                        size="xs"
                      >
                        Edit
                      </Button>
                  </Table.Td>
                </Table.Tr>
              );
            }

            if (match.others?.length > 0) {
              // schema ごとにグループ化 (reduce)
              const grouped = match.others.reduce<Record<string, Resolver[]>>((acc, r) => {
                if (!acc[r.schema]) acc[r.schema] = [];
                acc[r.schema].push(r);
                return acc;
              }, {});

              return Object.entries(grouped).map(([schema, resolvers], idx) => (
                <Table.Tr key={`${match.nsid}-other-${idx}`}>
                  <Table.Td>{match.nsid}</Table.Td>
                  <Table.Td>{schema}</Table.Td>
                  <Table.Td >{resolvers.length}</Table.Td>
                  <Table.Td>
                      <Button
                        disabled={!activeDid}
                        onClick={() => handleEdit(match.nsid, schema)}
                        variant="outline"
                        size="xs"
                      >
                        Edit
                      </Button>
                  </Table.Td>
                </Table.Tr>
              ));
            } else {
              return (
                <tr key={`${match.nsid}-no-resolver`}>
                  <Table.Td>{match.nsid}</Table.Td>
                  <Table.Td >-</Table.Td>
                  <Table.Td >0</Table.Td>
                  <Table.Td>
                      <Button
                        onClick={() => handleEdit(match.nsid)}
                        variant="outline"
                        size="xs"
                      >
                        Edit
                      </Button>
                  </Table.Td>
                </tr>
              );
            }
          })}
        </Table.Tbody>
      </Table>

      <Modal
        opened={opened}
        onClose={close}
        title={messages.editschema.title}
        size="lg"
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
