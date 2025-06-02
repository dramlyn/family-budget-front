import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  Wallet,
  ArrowLeftCircle,
  Flag,
  ArrowRight,
} from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number;
  icon: "wallet" | "expenses" | "goal";
  linkText: string;
  linkHref: string;
  color: "green" | "red" | "purple";
  isLoading: boolean;
  progress?: number;
  currentValue?: number;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getIconBgClass = (color: string) => {
  const colorMap = {
    "green": "bg-green-100",
    "red": "bg-red-100",
    "purple": "bg-purple-100",
  };
  return colorMap[color as keyof typeof colorMap] || "bg-blue-100";
};

const getIconTextClass = (color: string) => {
  const colorMap = {
    "green": "text-green-600",
    "red": "text-red-600",
    "purple": "text-purple-600",
  };
  return colorMap[color as keyof typeof colorMap] || "text-blue-600";
};

export function StatsCard({
  title,
  value,
  icon,
  linkText,
  linkHref,
  color,
  isLoading,
  progress,
  currentValue,
}: StatsCardProps) {
  const bgColorClass = getIconBgClass(color);
  const textColorClass = getIconTextClass(color);
  
  const renderIcon = () => {
    switch (icon) {
      case "wallet":
        return <Wallet className={`${textColorClass} text-xl`} />;
      case "expenses":
        return <ArrowLeftCircle className={`${textColorClass} text-xl`} />;
      case "goal":
        return <Flag className={`${textColorClass} text-xl`} />;
      default:
        return null;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${bgColorClass} rounded-md p-3`}>
            {renderIcon()}
          </div>
          <div className="ml-5 w-0 flex-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-7 w-24" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </p>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(value)}
                </div>
                {progress !== undefined && currentValue !== undefined && (
                  <div className="mt-2">
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs mt-1 text-gray-500">
                      {progress}% ({formatCurrency(currentValue)})
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-6 py-4">
        <Link href={linkHref} className="text-sm font-medium text-primary hover:text-primary/80 flex items-center">
          {linkText} <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
