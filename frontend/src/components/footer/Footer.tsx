import { Text, Container, Group, ActionIcon } from '@mantine/core';
import classes from './Footer.module.scss';
import { FaGithub } from "react-icons/fa6";
import { FaBluesky } from "react-icons/fa6";

export function Footer() {

    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Text c="dimmed">Developed by usounds.work</Text>

                <Group gap="md" my="sm" wrap="nowrap">

                    <a
                        href="https://bsky.app/profile/rito.blue"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                    >
                        <FaBluesky />
                    </a>

                    <a
                        href="https://github.com/usounds/Rito"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                    >
                        <FaGithub />
                    </a>

                </Group>
            </Container>
        </div>
    );
}