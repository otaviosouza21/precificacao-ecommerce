import {
  Activity,
  DollarSign,
  MessageCircle,
  RefreshCw,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavStatus = "active" | "wip" | "placeholder";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  status: NavStatus;
  description?: string;
  quickAccess?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    title: "Tiny ERP",
    items: [
      {
        label: "Precificação",
        href: "/precificacao",
        icon: DollarSign,
        status: "wip",
        description: "Cálculo de preços para marketplaces.",
        quickAccess: true,
      },
      {
        label: "Títulos Ecommerce",
        href: "/titulos-ecommerce",
        icon: ShoppingCart,
        status: "active",
        description: "Conciliação de recebimentos Shopee × Tiny.",
      },
      {
        label: "Relatório de Custos",
        href: "/produtos/relatorios/custos",
        icon: Activity,
        status: "active",
        description: "Análise de custos de compra dos produtos.",
        quickAccess: true,
      },
      {
        label: "Atualizar Custos",
        href: "/custo-update",
        icon: RefreshCw,
        status: "wip",
        description: "Atualização de custos de produtos no Tiny.",
      },
    ],
  },
  {
    title: "CRM",
    items: [
      {
        label: "Clientes",
        href: "#",
        icon: Users,
        status: "placeholder",
      },
      {
        label: "Conversas",
        href: "#",
        icon: MessageCircle,
        status: "placeholder",
      },
    ],
  },
];

export const quickAccessItems: NavItem[] = navigation
  .flatMap((section) => section.items)
  .filter((item) => item.quickAccess);

export const navStyles = {
  sidebarBg: "bg-sky-800",
  sidebarBgActive: "bg-sky-950",
  sidebarHover: "hover:bg-sky-900",
  sidebarText: "text-white",
  sidebarTextMuted: "text-blue-200",
  sidebarSectionTitle: "text-blue-300",
  topbarBg: "bg-white",
  topbarBorder: "border-slate-200",
  topbarBtnIdle:
    "text-slate-600 hover:text-sky-800 hover:bg-sky-50 border-transparent",
  topbarBtnActive: "text-sky-800 bg-sky-50 border-sky-200",
};
