import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EstimatePanel from '../EstimatePanel';
import { useWorkflowStore, useUIState, useEstimation, useScalingParams, useActualStats } from '@/store/useWorkflowStore';

// Mock the Zustand store hooks directly
vi.mock('@/store/useWorkflowStore', () => ({
    useEstimation: vi.fn(),
    useUIState: vi.fn(),
    useWorkflowStore: vi.fn(),
    useScalingParams: vi.fn(),
    useActualStats: vi.fn(),
}));

const mockEstimation = {
    graph_type: 'Agentic',
    total_tokens: 1500,
    total_cost: 0.05,
    total_latency: 2.0,
    total_input_tokens: 1000,
    total_output_tokens: 500,
    total_tool_latency: 0.5,
    health: {
        grade: 'A',
        score: 95,
        badges: ['Cost-efficient'],
        details: {},
    },
    detected_cycles: [],
    parallel_steps: [],
    critical_path: [],
    critical_path_latency: 0,
    best_case_cost: 0,
    best_case_latency: 0,
    worst_case_cost: 0,
    worst_case_latency: 0,
    complexity_score: 0,
    complexity_label: 'Low',
    recursion_limit: 25,
    breakdown: [],
    scaling_projection: {
        runs_per_day: 100,
        monthly_cost: 150,
        monthly_tokens: 4500000,
        monthly_compute_seconds: 36000,
        cost_per_1k_runs: 50
    },
    sensitivity: null,
};

const mockNodes = [
    { id: '1', data: { label: 'Node 1', type: 'agentNode' } },
];
const mockEdges: any[] = [];

describe('EstimatePanel Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock localStorage and sessionStorage for Zustand persistence
        const storageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
        };
        global.localStorage = storageMock;
        global.sessionStorage = storageMock;

        (useEstimation as unknown as import("vitest").Mock).mockReturnValue(mockEstimation);
        (useUIState as unknown as import("vitest").Mock).mockReturnValue({ isEstimatePanelOpen: true, theme: 'light' });
        (useScalingParams as unknown as import("vitest").Mock).mockReturnValue({ runsPerDay: 100, loopIntensity: 1 });
        (useActualStats as unknown as import("vitest").Mock).mockReturnValue([]);

        // Mock the specific slice of useWorkflowStore
        (useWorkflowStore as unknown as import("vitest").Mock).mockImplementation((selector: any) => {
            const state = {
                toggleEstimatePanel: vi.fn(),
                nodes: mockNodes,
                edges: mockEdges,
                setEstimation: vi.fn(),
                setRunsPerDay: vi.fn(),
                setLoopIntensity: vi.fn(),
                setActualStats: vi.fn(),
                clearActualStats: vi.fn(),
            };
            return selector(state);
        });

        // ResizeObserver mock is typically needed for Recharts on jsdom
        global.ResizeObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    it('renders the estimate panel when open and populated', () => {
        render(<EstimatePanel />);
        expect(screen.getByText('Estimate Report')).toBeInTheDocument();
        // Check for the graph type in the metric ribbon
        expect(screen.getByText('Agentic')).toBeInTheDocument();
    });

    it('returns null if estimation is missing', () => {
        (useEstimation as unknown as import("vitest").Mock).mockReturnValue(null);
        const { container } = render(<EstimatePanel />);
        expect(container).toBeEmptyDOMElement();
    });

    it('toggles between tabs correctly', async () => {
        render(<EstimatePanel />);

        // Defaults to Overview
        expect(screen.getByText('Token Usage')).toBeInTheDocument();

        // Click Scaling Tab
        const scalingTab = screen.getByRole('tab', { name: /Scaling & Sensitivity/i });
        fireEvent.click(scalingTab);

        // Click Detailed Breakdown
        const breakdownTab = screen.getByRole('tab', { name: /Detailed Breakdown/i });
        fireEvent.click(breakdownTab);
    });
});
