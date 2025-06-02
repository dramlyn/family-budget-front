import { Link } from "wouter";
import { 
  PlusCircle, 
  DollarSign, 
  BarChart, 
  Settings 
} from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Добавить расход",
      icon: <PlusCircle className="text-red-600 text-xl" />,
      href: "/transactions/new?type=expense",
      bgClass: "bg-red-100",
      hoverClass: "hover:border-red-400",
      focusClass: "focus-within:ring-red-500",
    },
    {
      title: "Добавить доход",
      icon: <DollarSign className="text-green-600 text-xl" />,
      href: "/transactions/new?type=income",
      bgClass: "bg-green-100",
      hoverClass: "hover:border-green-400",
      focusClass: "focus-within:ring-green-500",
    },
    {
      title: "Отчеты",
      icon: <BarChart className="text-purple-600 text-xl" />,
      href: "/reports",
      bgClass: "bg-purple-100",
      hoverClass: "hover:border-purple-400",
      focusClass: "focus-within:ring-purple-500",
    },
    {
      title: "Настройки",
      icon: <Settings className="text-orange-600 text-xl" />,
      href: "/profile",
      bgClass: "bg-orange-100",
      hoverClass: "hover:border-orange-400",
      focusClass: "focus-within:ring-orange-500",
    }
  ];

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium text-gray-900">Быстрые действия</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((action, index) => (
          <Link 
            key={index}
            href={action.href}
            className={`relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 ${action.hoverClass} ${action.focusClass} focus-within:ring-2 focus-within:ring-offset-2`}
          >
            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${action.bgClass} flex items-center justify-center`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true"></span>
              <p className="text-sm font-medium text-gray-900">
                {action.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
