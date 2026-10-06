"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  ["overview", "მიმოხილვა"],
  ["schedule", "გრაფიკი"],
  ["availability", "ხელმისაწვდომობა"],
  ["attendance", "დასწრება"],
  ["requests", "მოთხოვნები"],
] as const;

export function ProfileTabs({
  overview,
  schedule,
  availability,
  attendance,
  requests,
}: {
  overview: ReactNode;
  schedule: ReactNode;
  availability: ReactNode;
  attendance: ReactNode;
  requests: ReactNode;
}) {
  const panels = { overview, schedule, availability, attendance, requests };

  return (
    <Tabs defaultValue="overview">
      <TabsList variant="line" className="h-auto w-full justify-start gap-1 overflow-x-auto border-b border-border/80 bg-transparent pb-0">
        {tabs.map(([value, label]) => (
          <TabsTrigger key={value} value={value} className="h-10 rounded-none px-3 text-sm">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(([value]) => (
        <TabsContent key={value} value={value} className="pt-5">
          {panels[value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
