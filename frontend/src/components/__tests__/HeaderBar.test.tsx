import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeaderBar from '../HeaderBar';

// --- Mocks ---
vi.mock('@/store/useWorkflowStore', () => ({
    useWorkflowStore: (selector: any) => {
        if (typeof selector === 'function') {
            return selector({
                isSaving: false,
                lastSavedAt: null,
                setEstimation: vi.fn(),
                setErrorBanner: vi.fn(),
                toggleTheme: vi.fn(),
            });
        }
        return {
            setEstimation: vi.fn(),
            setErrorBanner: vi.fn(),
            toggleTheme: vi.fn(),
        };
    },
    useWorkflowNodes: () => [], // Simulating empty canvas
    useWorkflowEdges: () => [],
    useUIState: () => ({ theme: 'light' }),
    useCurrentWorkflowId: () => 'wk-123',
    useCurrentWorkflowName: () => 'Test Workflow Name',
    useIsDirty: () => false,
    useActiveCanvasId: () => 'canvas-123',
}));

vi.mock('@/store/useAuthStore', () => ({
    useAuthStore: () => ({ openAuthModal: vi.fn() }),
    useUser: () => ({ id: 'usr-1', email: 'test@example.com' }),
}));

vi.mock('@/hooks/useAutoLayout', () => ({
    useAutoLayout: () => vi.fn(),
}));

vi.mock('@/hooks/useTutorial', () => ({
    openTutorial: vi.fn(),
}));

// Mock subcomponents
vi.mock('../ImportWorkflowModal', () => ({ default: () => <div data-testid="ImportWorkflowModal" /> }));
vi.mock('../PullFromCanvasModal', () => ({ default: () => <div data-testid="PullFromCanvasModal" /> }));
vi.mock('../ConfirmModal', () => ({ default: () => <div data-testid="ConfirmModal" /> }));
vi.mock('../ExportDropdown', () => ({ default: () => <div data-testid="ExportDropdown" /> }));
vi.mock('../marketplace/PublishModal', () => ({ default: () => <div data-testid="PublishModal" /> }));
vi.mock('../ShareWorkflowModal', () => ({ default: () => <div data-testid="ShareWorkflowModal" /> }));
vi.mock('@/components/NavProfile', () => ({ default: () => <div data-testid="NavProfile" /> }));

describe('HeaderBar UI Phase 3 Tests', () => {
    it('should apply correct focus ring classes to inline workflow name input', () => {
        render(<HeaderBar />);

        // Click on the workflow name to enter edit mode
        const nameButton = screen.getByText('Test Workflow Name');
        fireEvent.click(nameButton);

        // Find the input element that appears
        const nameInput = screen.getByDisplayValue('Test Workflow Name');
        expect(nameInput).toBeInTheDocument();

        // Verify correct styling classes from the recent patch
        expect(nameInput.className).toContain('transition-shadow');
        expect(nameInput.className).toContain('focus:ring-1');
        expect(nameInput.className).toContain('focus:ring-blue-500');
    });

    it('should apply disabled:pointer-events-none class to Publish, Share, and Save As buttons on empty canvas', () => {
        // Our mock above has useWorkflowNodes returning [] (empty canvas)
        // and valid currentWorkflowId/user so these buttons exist.
        render(<HeaderBar />);

        // Find the toggle button by its title attribute and click it
        const overflowToggle = screen.getByTitle('More actions');
        fireEvent.click(overflowToggle);

        // Now the overflow menu should be open
        const allMenuButtons = screen.getAllByRole('button').filter(b => b.className.includes('min-h-11'));
        const publishButton = allMenuButtons.find(b => b.textContent?.includes('Publish'));
        const shareWorkflowButton = allMenuButtons.find(b => b.textContent?.includes('Share workflow'));
        const saveAsButton = allMenuButtons.find(b => b.textContent?.includes('Save As'));

        expect(publishButton).toBeInTheDocument();
        expect(shareWorkflowButton).toBeInTheDocument();
        expect(saveAsButton).toBeInTheDocument();

        // Verify the fix classes are present
        expect(publishButton?.className).toContain('disabled:pointer-events-none');
        expect(shareWorkflowButton?.className).toContain('disabled:pointer-events-none');
        expect(saveAsButton?.className).toContain('disabled:pointer-events-none');
    });
});
