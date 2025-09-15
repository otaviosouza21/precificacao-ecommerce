"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MessageCircle,
  ShoppingCart,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function MainHeader() {
  const [collapsed, setCollapsed] = useState(true);
  const asideRef = useRef<HTMLElement | null>(null);

  // Fecha o menu se clicar fora do aside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        asideRef.current &&
        !asideRef.current.contains(event.target as Node)
      ) {
        setCollapsed(true);
      }
    }

    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => setCollapsed(!collapsed);

  return (
    <aside
      ref={asideRef}
      className={`h-screen fixed shadow-2xl bg-sky-800 z-50 text-white flex flex-col justify-between transition-all duration-300 ${
        collapsed ? "w-15 items-center" : "w-64"
      } p-4`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          {!collapsed && <div className="text-2xl font-bold">Bike Line</div>}
          <button
            onClick={toggleMenu}
            className="text-blue-500 cursor-pointer hover:text-white bg-blue-200 rounded"
          >
            {collapsed ? (
              <ChevronRight color="blue" size={20} />
            ) : (
              <ChevronLeft color="blue" size={20} />
            )}
          </button>
        </div>

        {!collapsed && (
          <p className="text-sm text-blue-200 mb-6">Sistema de Automações</p>
        )}

        {/* Tiny ERP */}
        <div className="mb-4">
          {!collapsed && (
            <h3 className="text-blue-300 font-semibold text-xs uppercase mb-2">
              Tiny ERP
            </h3>
          )}
          <ul className="space-y-3 *:hover:bg-sky-900 *:transition-all *:py-1 *:px-1 *:rounded ">
            <li className="flex items-center gap-3 hover:text-blue-100 cursor-pointer">
              <DollarSign size={20} /> {!collapsed && "Preços"}
            </li>
            <li className="flex items-center gap-3 hover:text-blue-100 cursor-pointer">
              <ShoppingCart size={20} /> {!collapsed && "Ecommerce"}
            </li>
            <li className="flex items-center gap-3 hover:text-blue-100 cursor-pointer">
              <Activity size={20} /> {!collapsed && "Custos"}
            </li>
          </ul>
        </div>

        {/* CRM */}
        <div>
          {!collapsed && (
            <h3 className="text-blue-300 font-semibold text-xs uppercase mb-2">
              CRM
            </h3>
          )}
          <ul className="space-y-3 *:hover:bg-sky-900 *:transition-all *:py-1 *:px-1 *:rounded">
            <li className="flex items-center gap-3 hover:text-blue-100 cursor-pointer">
              <Users size={20} /> {!collapsed && "Clientes"}
            </li>
            <li className="flex items-center gap-3 hover:text-blue-100 cursor-pointer">
              <MessageCircle size={20} /> {!collapsed && "Conversas"}
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-blue-200 hover:text-white cursor-pointer">
        <User size={20} />
        {!collapsed && <span>Perfil</span>}
      </div>
    </aside>
  );
}
