"use client";

import { createContext, useContext } from "react";

const AdminContext = createContext(false);

/** true, wenn der aktuelle Betrachter Owner ist (Bearbeiten erlaubt). */
export function useAdmin(): boolean {
  return useContext(AdminContext);
}

export default function AdminProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}
