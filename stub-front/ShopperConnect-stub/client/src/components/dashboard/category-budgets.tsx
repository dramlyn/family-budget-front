import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { WalletCards } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryBudget = {
  name: string;
  allocated: number;
  spent: number;
  color: string;
};

interface CategoryBudgetsProps {
  categoryBudgets: CategoryBudget[];
  currentPeriod: string;
  isLoading: boolean;
}

export function CategoryBudgets({ categoryBudgets, currentPeriod, isLoading }: CategoryBudgetsProps) {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<"all" | "by-category">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryBudgets && categoryBudgets.length > 0 ? categoryBudgets[0].name : ""
  );

  // Функция для форматирования валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Расчет общего выделенного бюджета
  const totalAllocated = categoryBudgets?.reduce(
    (sum, category) => sum + category.allocated,
    0
  ) || 0;

  // Расчет общих расходов
  const totalSpent = categoryBudgets?.reduce(
    (sum, category) => sum + category.spent,
    0
  ) || 0;

  // Процент расходов от общего бюджета
  const totalPercentage = totalAllocated > 0 
    ? Math.round((totalSpent / totalAllocated) * 100) 
    : 0;

  // Получаем выбранную категорию
  const selectedCategoryData = categoryBudgets?.find(
    (category) => category.name === selectedCategory
  );

  // Процент расходов для выбранной категории
  const categoryPercentage = selectedCategoryData && selectedCategoryData.allocated > 0 
    ? Math.round((selectedCategoryData.spent / selectedCategoryData.allocated) * 100) 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <Skeleton className="h-16 w-full" />
            <div>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-xl font-semibold">
          <WalletCards className="mr-2 h-5 w-5 text-primary" />
          Бюджет на {currentPeriod}
        </CardTitle>
        <CardDescription>
          Отслеживайте распределение и расходы семейного бюджета по категориям
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as "all" | "by-category")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all">Общий бюджет</TabsTrigger>
            <TabsTrigger value="by-category">По категориям</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">
                    {formatCurrency(totalSpent)}
                    <span className="text-sm text-gray-500 ml-1">
                      из {formatCurrency(totalAllocated)}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500">Потрачено в этом месяце</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(totalAllocated - totalSpent)}
                  </p>
                  <p className="text-sm text-gray-500">Осталось</p>
                </div>
              </div>
  
              <Progress value={totalPercentage} className="h-2" />
              
              <p className="text-xs text-gray-500 text-right">
                {totalPercentage}% потрачено
              </p>
            </div>
  
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium">Расходы по категориям</h4>
              <div className="space-y-3">
                {categoryBudgets?.map((category) => {
                  const percentage = category.allocated > 0 
                    ? Math.round((category.spent / category.allocated) * 100) 
                    : 0;
                    
                  return (
                    <div key={category.name} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${category.color} mr-2`} />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="text-sm">
                          {formatCurrency(category.spent)} из {formatCurrency(category.allocated)}
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-1.5 ${category.color}`} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
  
          <TabsContent value="by-category" className="space-y-4">
            <div className="mb-4">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categoryBudgets?.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${category.color} mr-2`} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
  
            {selectedCategoryData && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      {formatCurrency(selectedCategoryData.spent)}
                      <span className="text-sm text-gray-500 ml-1">
                        из {formatCurrency(selectedCategoryData.allocated)}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500">Потрачено в категории "{selectedCategoryData.name}"</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(selectedCategoryData.allocated - selectedCategoryData.spent)}
                    </p>
                    <p className="text-sm text-gray-500">Осталось</p>
                  </div>
                </div>
  
                <div className="space-y-1">
                  <Progress 
                    value={categoryPercentage} 
                    className={`h-2 ${selectedCategoryData.color}`} 
                  />
                  <p className="text-xs text-gray-500 text-right">
                    {categoryPercentage}% потрачено
                  </p>
                </div>
  
                <div className="mt-6">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <h4 className="font-medium mb-2">Советы по управлению бюджетом</h4>
                    <p className="text-sm text-gray-600">
                      {categoryPercentage > 90 
                        ? "Вы почти достигли лимита расходов в этой категории. Рассмотрите возможность сократить дальнейшие траты."
                        : categoryPercentage > 70 
                          ? "Вы уже использовали большую часть бюджета. Планируйте оставшиеся расходы тщательно."
                          : "У вас еще есть запас в бюджете. Продолжайте следить за расходами."
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}