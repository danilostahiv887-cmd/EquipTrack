import type { ReactNode } from "react";
import { CatalogIndex } from "@/components/layout/catalog-index";
import { BrandMark } from "@/components/layout/brand-mark";
import { UserMenu } from "@/components/layout/user-menu";
import type { WorkspaceUser } from "@/lib/types";

export function WorkspaceShell({
  user,
  children,
}: {
  user: WorkspaceUser;
  children: ReactNode;
}) {
  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <a className="wordmark" href="/dashboard">
          <BrandMark className="wordmark-logo" />
          <span>EquipTrack</span>
        </a>
        <UserMenu user={user} />
      </header>
      <main className="workspace-main">{children}</main>
      <CatalogIndex role={user.role} />
    </div>
  );
}
