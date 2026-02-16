"use client";

import { ReactFlowProvider } from "@xyflow/react";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import HeaderBar from "@/components/HeaderBar";
import EstimatePanel from "@/components/EstimatePanel";
import NodeConfigModal from "@/components/NodeConfigModal";
import ErrorBanner from "@/components/ErrorBanner";
import ComparisonDrawer from "@/components/ComparisonDrawer";

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <HeaderBar />
        <ErrorBanner />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas />
        </div>

        {/* Right-side sliding drawer (fixed overlay) */}
        <EstimatePanel />
        <NodeConfigModal />
        <ComparisonDrawer />
      </div>
    </ReactFlowProvider>
  );
}
