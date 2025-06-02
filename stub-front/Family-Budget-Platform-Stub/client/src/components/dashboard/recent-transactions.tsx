import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, ShoppingBasket, DollarSign, Film, FileText, Car } from "lucide-react";

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
};

type RecentTransactionsProps = {
  transactions: Transaction[];
  isLoading: boolean;
};

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Еда":
        return <ShoppingBasket className="text-white" size={16} />;
      case "Доход":
        return <DollarSign className="text-white" size={16} />;
      case "Развлечения":
        return <Film className="text-white" size={16} />;
      case "Обязательные":
        return <FileText className="text-white" size={16} />;
      case "Транспорт":
        return <Car className="text-white" size={16} />;
      default:
        return <ShoppingBasket className="text-white" size={16} />;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Еда":
        return "bg-orange-500";
      case "Доход":
        return "bg-green-500";
      case "Развлечения":
        return "bg-purple-500";
      case "Обязательные":
        return "bg-red-500";
      case "Транспорт":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Последние транзакции</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCategoryColor(transaction.category)}`}>
                    {getCategoryIcon(transaction.category)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{transaction.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.amount > 0 ? `+${formatCurrency(transaction.amount)}` : `-${formatCurrency(transaction.amount)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 px-6 py-4">
        <Link href="/transactions" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center">
          Все транзакции <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
