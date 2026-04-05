import React from "react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-default-50/50 items-center justify-center p-4">
      {children}
    </div>
  );
}
