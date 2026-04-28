"use client";

import { ChevronLeft, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { navigation, navStyles, type NavItem } from "@/config/navigation";

export default function MainHeader() {
  const [collapsed, setCollapsed] = useState(true);
  const asideRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (collapsed) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && asideRef.current && !asideRef.current.contains(target)) {
        setCollapsed(true);
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setCollapsed(true);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [collapsed]);

  const toggleMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCollapsed((c) => !c);
  };
  const closeMenu = () => setCollapsed(true);

  const isActive = (item: NavItem) =>
    item.status !== "placeholder" && pathname === item.href;

  return (
    <aside
      ref={asideRef}
      className={twMerge(
        "h-screen fixed shadow-2xl z-50 flex flex-col justify-between transition-all duration-300",
        navStyles.sidebarBg,
        navStyles.sidebarText,
        collapsed ? "w-15" : "w-64",
      )}
    >
      <div className="flex flex-col min-h-0 flex-1">
        <SidebarHeader collapsed={collapsed} onToggle={toggleMenu} />

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {navigation.map((section) => (
            <SidebarSection
              key={section.title}
              title={section.title}
              collapsed={collapsed}
            >
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item)}
                  onNavigate={closeMenu}
                />
              ))}
            </SidebarSection>
          ))}
        </nav>
      </div>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: (event: React.MouseEvent) => void;
}) {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center px-4 pt-4 pb-3 border-b border-sky-700/60 text-sky-100 hover:bg-sky-900 transition-colors cursor-pointer"
        aria-label="Expandir menu"
        title="Expandir menu"
      >
        <ChevronRight size={20} />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-sky-700/60">
      <div className="flex flex-col">
        <span className="text-xl font-bold leading-tight">Bike Line</span>
        <span className={twMerge("text-[11px]", navStyles.sidebarTextMuted)}>
          Sistema de Automações
        </span>
      </div>
      <button
        onClick={onToggle}
        className="text-sky-100 cursor-pointer hover:bg-sky-700 p-1 rounded transition-colors"
        aria-label="Colapsar menu"
        title="Colapsar menu"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="px-2 pb-4 pt-3 border-t border-sky-700/60">
      <div
        className={twMerge(
          "flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-sky-900 transition-colors",
          collapsed && "justify-center",
          navStyles.sidebarTextMuted,
        )}
        title={collapsed ? "Perfil" : undefined}
      >
        <User size={20} className="shrink-0" />
        {!collapsed && <span className="text-sm font-medium">Perfil</span>}
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  icon,
  collapsed,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-3">
      {!collapsed ? (
        <h3
          className={twMerge(
            "flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider mb-2 px-2",
            navStyles.sidebarSectionTitle,
          )}
        >
          {icon}
          {title}
        </h3>
      ) : (
        <div className="h-px bg-sky-700/60 my-3 mx-2" aria-hidden />
      )}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

type NavLinkProps = {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  highlight?: boolean;
  onNavigate: () => void;
};

function NavLink({
  item,
  collapsed,
  active,
  highlight,
  onNavigate,
}: NavLinkProps) {
  const Icon = item.icon;
  const isPlaceholder = item.status === "placeholder";

  const baseClasses = twMerge(
    "group relative flex items-center gap-3 py-2 px-2 rounded-md transition-all w-full border-l-2 border-transparent",
    collapsed && "justify-center",
    active
      ? twMerge(navStyles.sidebarBgActive, "text-white border-amber-300")
      : twMerge(navStyles.sidebarHover, "hover:text-white"),
    highlight && !active && "bg-sky-700/40",
    isPlaceholder && "opacity-50 cursor-not-allowed hover:bg-transparent",
  );

  const content = (
    <>
      <Icon
        size={20}
        className={twMerge(
          "shrink-0",
          active ? "text-amber-300" : "text-sky-100 group-hover:text-white",
        )}
      />
      {!collapsed && (
        <span className="flex-1 text-sm font-medium truncate">
          {item.label}
        </span>
      )}
      {!collapsed && item.status === "wip" && (
        <span className="text-[9px] uppercase tracking-wide bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded">
          wip
        </span>
      )}
      {!collapsed && item.status === "placeholder" && (
        <span className="text-[9px] uppercase tracking-wide bg-slate-500/30 text-slate-300 px-1.5 py-0.5 rounded">
          em breve
        </span>
      )}
    </>
  );

  const tooltip = collapsed ? item.label : undefined;

  if (isPlaceholder) {
    return (
      <li>
        <span className={baseClasses} title={tooltip} aria-disabled>
          {content}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        className={baseClasses}
        onClick={onNavigate}
        title={tooltip}
      >
        {content}
      </Link>
    </li>
  );
}
