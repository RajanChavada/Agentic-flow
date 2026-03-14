import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScalingTab } from '../ScalingTab';

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
        grade: 'A',
        score: 95,
        badges: ['Cost-efficient'],
        details: {},
    },
    detected_cycles: [
        {
            cycle_id: 0,
            node_ids: ['a'],
            node_labels: ['A'],
            cost_contribution: 0.1,
            latency_contribution: 0.1,
            expected_iterations: 2,
            max_iterations: 5,
            tokens_per_lap: 100,
            cost_per_lap: 0.01,
            latency_per_lap: 0.1,
            risk_level: 'medium'
        }
    ],
    parallel_steps: [],
    critical_path: [],
    critical_path_latency: 0,
    recursion_limit: 25,
    breakdown: [],
    sensitivity: {
        cost_min: 0.01, cost_avg: 0.05, cost_max: 0.10,
        latency_min: 1.0, latency_avg: 2.5, latency_max: 5.0
    },
    scaling_projection: {
        runs_per_day: 100,
        monthly_cost: 150,
        monthly_tokens: 4500000,
        monthly_compute_seconds: 36000,
        cost_per_1k_runs: 50
    }
};

const mockScalingParams = {
    runsPerDay: 100,
    loopIntensity: 1
};

describe('ScalingTab Component', () => {
    it('renders sliders and projection cards accurately', () => {
        render(
            <ScalingTab
                estimation={mockEstimation as any}
                scalingParams={mockScalingParams}
                setRunsPerDay={vi.fn()}
                setLoopIntensity={vi.fn()}
                scalingLoading={false}
                isDark={false}
            />
        );

        // Initial labels
        expect(screen.getByText('What-If Scaling')).toBeInTheDocument();
    });

    it('calls setRunsPerDay when slider changes', () => {
        const setRunsPerDay = vi.fn();

        render(
            <ScalingTab
                estimation={mockEstimation as any}
                scalingParams={mockScalingParams}
                setRunsPerDay={setRunsPerDay}
                setLoopIntensity={vi.fn()}
                scalingLoading={false}
                isDark={false}
            />
        );

        // Grab first slider (Runs per day)
        const sliders = screen.getAllByRole('slider');
        fireEvent.change(sliders[0], { target: { value: '500' } });

        expect(setRunsPerDay).toHaveBeenCalledWith(500);
    });

    it('calls setLoopIntensity when loop slider changes (visible because cycles exist)', () => {
        const setLoopIntensity = vi.fn();

        render(
            <ScalingTab
                estimation={mockEstimation as any}
                scalingParams={mockScalingParams}
                setRunsPerDay={vi.fn()}
                setLoopIntensity={setLoopIntensity}
                scalingLoading={false}
                isDark={false}
            />
        );

        // Grab second slider (Loop intensity)
        const sliders = screen.getAllByRole('slider');
        expect(sliders.length).toBe(2);

        fireEvent.change(sliders[1], { target: { value: '2.5' } });
        expect(setLoopIntensity).toHaveBeenCalledWith(2.5);
    });
});
