"use client";

import { ReactNode } from "react";
import { RequireRole } from "@/components/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role={["SUPER_ADMIN", "ADMIN"]}>
      {children}
    </RequireRole>
  );
}
