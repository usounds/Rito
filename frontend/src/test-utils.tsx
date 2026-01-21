import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MantineProvider, createTheme } from '@mantine/core';

const theme = createTheme({});

export function renderWithMantine(ui: React.ReactElement, options?: RenderOptions) {
    return render(
        <MantineProvider theme={theme}>{ui}</MantineProvider>,
        options
    );
}

export * from '@testing-library/react';
export { renderWithMantine as render };
