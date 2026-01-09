import React from "react";
import { Search } from "lucide-react";

interface DataListProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filter?: React.ReactNode;
}

export function DataList({ children, header, search, filter }: DataListProps) {
  return (
    <div className="space-y-4">
      {(header || search || filter) && (
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          {header && <div className="flex-1">{header}</div>}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {filter && <div className="min-w-[200px]">{filter}</div>}
            
            {search && (
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || "Search..."}
                  className="w-full pl-10 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
