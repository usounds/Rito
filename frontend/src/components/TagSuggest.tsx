"use client";
import { useEffect, useState } from "react";
import { Badge, Group, Button, ActionIcon } from "@mantine/core";
import { BadgeCheck } from "lucide-react";
import { RefreshCcw } from 'lucide-react';

interface TagSuggestionProps {
    tags: string[];             // 他人のタグ（ランキング）
    selectedTags: string[];            // すでに選択済みのタグ
    setTags: (tags: string[]) => void; // 親に返す
}

export function TagSuggestion({
    tags = [],
    selectedTags,
    setTags,
}: TagSuggestionProps) {
    const [suggested, setSuggested] = useState<string[]>([]);

    // ランダムに n 個取る
    const pickRandom = (arr: string[], n: number) => {
        const candidates = arr.filter((tag) => !selectedTags.includes(tag));
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    };

    // 提案リスト更新
    const updateSuggestions = () => {
        setSuggested(pickRandom(tags, 8));
    };

    useEffect(() => {
        updateSuggestions();
    }, [
        tags.join(","),
    ]);

    const selectTag = (tag: string) => {
        // selectedTags に追加
        setTags([...selectedTags, tag]);

        // suggested から削除
        setSuggested(prev => prev.filter(t => t !== tag));
    };

    return (
        <div>
            <Group mb="xs" gap={3}>
                {/* 再提案ボタンをタグの左に */}
                <ActionIcon
                    variant="outline"
                     color="gray"
                    size="sm"
                    aria-label="再提案"
                    onClick={updateSuggestions}
                    mr='xs'
                >
                    <RefreshCcw style={{ width: "70%", height: "70%" }} />
                </ActionIcon>

                {suggested.map((tag, idx) => (
                    <Badge
                        key={idx}
                        variant="light"
                        color={tag === "Verified" ? "orange" : "blue"}
                        styles={{ root: { textTransform: "none", cursor: "pointer" } }}
                        onClick={() => selectTag(tag)}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: tag === "Verified" ? 2 : 0,
                            }}
                        >
                            {tag === "Verified" && <BadgeCheck size={12} />}
                            {tag}
                        </span>
                    </Badge>
                ))}
            </Group>
        </div>

    );
}
