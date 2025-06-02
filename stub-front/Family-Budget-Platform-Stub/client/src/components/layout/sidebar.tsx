import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  RefreshCcw,
  FileText,
  Users,
  Flag,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User as UserType } from "@shared/schema";
import { Logo } from "./logo";
import { NotificationsDropdown } from "./notifications-dropdown";

type SidebarProps = {
  className?: string;
  user: UserType | null;
  initials: string;
};

export function Sidebar({ className, user, initials }: SidebarProps) {
  const { logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const navItems = [
    {
      title: "Главная",
      href: "/",
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />,
    },
    {
      title: "Личный кабинет",
      href: "/profile",
      icon: <User className="mr-3 h-5 w-5" />,
    },
    {
      title: "Транзакции",
      href: "/transactions",
      icon: <RefreshCcw className="mr-3 h-5 w-5" />,
    },
    {
      title: "Обязательные платежи",
      href: "/payments",
      icon: <FileText className="mr-3 h-5 w-5" />,
    },
    {
      title: "Состав семьи",
      href: "/family",
      icon: <Users className="mr-3 h-5 w-5" />,
    },
    {
      title: "Сберегательная цель",
      href: "/savings",
      icon: <Flag className="mr-3 h-5 w-5" />,
    },
  ];
  
  return (
    <div className={cn("flex flex-col w-64 border-r border-gray-200 bg-white", className)}>
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0 px-4">
          <div className="flex items-center">
            <Logo size={28} className="mr-2" />
            <h1 className="text-xl font-bold text-primary">Семейный бюджет</h1>
          </div>
          <NotificationsDropdown />
        </div>
        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1 bg-white">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === item.href
                    ? "bg-primary-50 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div>
              <div className="h-9 w-9 rounded-full bg-primary-200 flex items-center justify-center">
                <span className="text-primary-800 font-medium">{initials}</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {user?.firstName} {user?.lastName || user?.username}
              </p>
              <Button 
                variant="link" 
                className="text-xs text-gray-500 group-hover:text-gray-700 p-0"
                onClick={handleLogout}
              >
                <LogOut className="mr-1 h-3 w-3" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
