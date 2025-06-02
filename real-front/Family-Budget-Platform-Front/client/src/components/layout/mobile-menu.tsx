import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-microservices-auth";
import { cn } from "@/lib/utils";
import {
  X,
  LayoutDashboard,
  User,
  RefreshCcw,
  FileText,
  Users,
  Flag,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { User as UserType } from "@shared/schema";
import { Logo } from "./logo";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  initials: string;
};

export function MobileMenu({ isOpen, onClose, user, initials }: MobileMenuProps) {
  const { logout } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logout();
    onClose();
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
    {
      title: "Настройки",
      href: "/settings",
      icon: <Settings className="mr-3 h-5 w-5" />,
    },
  ];
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="p-0 w-[280px]">
        <SheetHeader className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Logo size={24} className="mr-2" />
              <h2 className="text-xl font-bold text-primary">Семейный бюджет</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-base font-medium",
                location === item.href
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={onClose}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </div>
        
        <div className="border-t border-gray-200 pt-4 pb-3">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center">
                <span className="text-primary-800 font-medium">{initials}</span>
              </div>
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">
                {user?.firstName} {user?.lastName || user?.username}
              </div>
              <div className="text-sm font-medium text-gray-500">{user?.email}</div>
            </div>
          </div>
          <div className="mt-3 px-2">
            <Button
              variant="ghost"
              className="flex w-full px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Выйти
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
