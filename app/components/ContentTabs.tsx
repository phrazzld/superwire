"use client";

import React, { useState } from "react";

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface ContentTabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  renderContent: (tabId: string) => React.ReactNode;
  className?: string;
  tabClassName?: string;
  contentClassName?: string;
  sticky?: boolean;
}

export default function ContentTabs({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  renderContent,
  className = "",
  tabClassName = "",
  contentClassName = "",
  sticky = true
}: ContentTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    tabs.length > 0 ? tabs[0].id : ""
  );

  // Use controlled value if provided, otherwise use internal state
  const activeTab = controlledActiveTab !== undefined 
    ? controlledActiveTab 
    : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Navigation Tabs */}
      <div 
        className={`bg-white border-b border-gray-200 ${
          sticky ? "sticky top-0 z-10" : ""
        } ${tabClassName}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className={contentClassName}>
        {renderContent(activeTab)}
      </div>
    </div>
  );
}

// Utility component for tab panels
export interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ 
  tabId, 
  activeTab, 
  children, 
  className = "" 
}: TabPanelProps) {
  if (tabId !== activeTab) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Export tab type for convenience
export type ContentTab = string;