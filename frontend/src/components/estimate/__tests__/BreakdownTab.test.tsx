import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BreakdownTab } from '../BreakdownTab';

const mockEstimation = {
    graph_type: 'DAG' as const,
    total_tokens: 1500,
    total_cost: 0.05,
    total_latency: 2.0,
    total_input_tokens: 1000,
    total_output_tokens: 500,
    total_tool_latency: 0.5,
    cost_range: { min: 0.02, max: 0.08, avg: 0.05 },
    latency_range: { min: 1.0, max: 3.0, avg: 2.0 },
    token_range: { min: 1000, max: 2000, avg: 1500 },
    health: {
        grade: 'A' as const,
        score: 95,
        badges: ['Cost-efficient'],
        details: {},
    },
    detected_cycles: [],
    parallel_steps: [],
    critical_path: ['agent-1'],
    critical_path_latency: 1.5,
    recursion_limit: 25,
    breakdown: [
        {
            node_id: 'agent-1',
            node_name: 'Main Agent',
            tokens: 1000,
            input_tokens: 600,
            output_tokens: 400,
            cost: 0.03,
            input_cost: 0.01,
            output_cost: 0.02,
            latency: 1.5,
            cost_share: 0.6,
            latency_share: 0.75,
            bottleneck_severity: 'low' as const,
            model_provider: 'OpenAI',
            model_name: 'gpt-4o',
            in_cycle: false,
            tool_schema_tokens: 50,
            tool_response_tokens: 100,
            tool_latency: 0.2,
            tool_impacts: [
                {
                    tool_id: 'tool-1',
                    tool_node_id: 'tool-node-1',
                    tool_name: 'Search Web',
                    schema_tokens: 50,
                    response_tokens: 100,
                    execution_latency: 0.2
                }
            ]
        }
    ],
    scaling_projection: null,
    sensitivity: null,
};

const mockBreakdownWithType = [
    ...mockEstimation.breakdown.map(b => ({ ...b, nodeType: 'agentNode' }))
];

describe('BreakdownTab Component', () => {
    it('renders detailed table correctly with node basic info', () => {
        render(
            <BreakdownTab
                estimation={mockEstimation as any}
                breakdownWithType={mockBreakdownWithType as any}
                actualStats={[]}
                setActualStats={vi.fn()}
                clearActualStats={vi.fn()}
                isDark={false}
                isFullscreen={false}
            />
        );

        expect(screen.getByText('Main Agent')).toBeInTheDocument();
        expect(screen.getByText('OpenAI / gpt-4o')).toBeInTheDocument();
        expect(screen.getByText('600 in')).toBeInTheDocument();
        expect(screen.getByText('400 out')).toBeInTheDocument();
        expect(screen.queryAllByText(/TOTAL ESTIMATE/i).length).toBeGreaterThan(0);
    });

    it('expands tool impacts when chevron is clicked', async () => {
        render(
            <BreakdownTab
                estimation={mockEstimation as any}
                breakdownWithType={mockBreakdownWithType as any}
                actualStats={[]}
                setActualStats={vi.fn()}
                clearActualStats={vi.fn()}
                isDark={false}
                isFullscreen={false}
            />
        );

        expect(screen.queryByText('Search Web')).not.toBeInTheDocument();

        // Find the cell containing the chevron icon/button
        // The expand button is in the first column
        const table = screen.getByRole('table');
        const rows = screen.getAllByRole('row');
        // Row 0 is header, Row 1 is the agent row
        const agentRow = rows[1];
        const expandBtn = agentRow.querySelector('button');

        if (expandBtn) {
            fireEvent.click(expandBtn);
        }

        // Search Web should now be visible (it's in a sub-row)
        await waitFor(() => {
            expect(screen.queryByText('Search Web')).toBeInTheDocument();
        });
    });

    it('shows JSON trace input form on click and handles valid inputs', () => {
        const setActualStats = vi.fn();

        render(
            <BreakdownTab
                estimation={mockEstimation as any}
                breakdownWithType={mockBreakdownWithType as any}
                actualStats={[]}
                setActualStats={setActualStats}
                clearActualStats={vi.fn()}
                isDark={false}
                isFullscreen={false}
            />
        );

        const toggleBtn = screen.getByRole('button', { name: /Add JSON Trace/i });
        fireEvent.click(toggleBtn);

        const textArea = screen.getByPlaceholderText(/node_id/i);
        expect(textArea).toBeInTheDocument();

        fireEvent.change(textArea, { target: { value: '[{"node_id": "agent-1", "actual_tokens": 1200}]' } });

        const loadBtn = screen.getByRole('button', { name: /Load Trace Data/i });
        fireEvent.click(loadBtn);

        expect(setActualStats).toHaveBeenCalledWith([{ node_id: "agent-1", actual_tokens: 1200 }]);
    });

    it('handles invalid JSON inputs gracefully', () => {
        const setActualStats = vi.fn();

        render(
            <BreakdownTab
                estimation={mockEstimation as any}
                breakdownWithType={mockBreakdownWithType as any}
                actualStats={[]}
                setActualStats={setActualStats}
                clearActualStats={vi.fn()}
                isDark={false}
                isFullscreen={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Add JSON Trace/i }));

        const textArea = screen.getByPlaceholderText(/node_id/i);
        fireEvent.change(textArea, { target: { value: '{}' } });

        fireEvent.click(screen.getByRole('button', { name: /Load Trace Data/i }));

        expect(setActualStats).not.toHaveBeenCalled();
        expect(screen.queryAllByText(/json/i).length).toBeGreaterThan(0);
    });

    it('renders actual traces successfully when passed via props', () => {
        render(
            <BreakdownTab
                estimation={mockEstimation as any}
                breakdownWithType={mockBreakdownWithType as any}
                actualStats={[{ node_id: "agent-1", actual_tokens: 1337, actual_latency: 3.5, actual_cost: 0.1 }]}
                setActualStats={vi.fn()}
                clearActualStats={vi.fn()}
                isDark={false}
                isFullscreen={false}
            />
        );

        const table = screen.getByRole('table');
        expect(table.textContent).toContain('1,337');
    });
});
