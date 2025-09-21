import { Text, Container, Group, ActionIcon } from '@mantine/core';
import classes from './Footer.module.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBluesky } from '@fortawesome/free-brands-svg-icons';


export function Footer() {

    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Text c="dimmed">Developed by usounds.work</Text>
                <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                        size="sm"
                        color="gray"
                        variant="subtle"
                        component="a"
                        href="https://github.com/usounds/Rito"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FontAwesomeIcon icon={faGithub} />
                    </ActionIcon>

                    <ActionIcon
                        size="sm"
                        color="gray"
                        variant="subtle"
                        component="a"
                        href="https://bsky.app/profile/rito.blue"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FontAwesomeIcon icon={faBluesky} />
                    </ActionIcon>
                </Group>

            </Container>
        </div>
    );
}