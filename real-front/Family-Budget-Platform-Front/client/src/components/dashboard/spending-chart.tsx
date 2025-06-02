import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Category = {
  name: string;
  percentage: number;
  color: string;
};

type SpendingChartProps = {
  categories: Category[];
  isLoading: boolean;
};

export function SpendingChart({ categories, isLoading }: SpendingChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Расходы по категориям</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {renderPieChart(categories)}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center bg-white w-16 h-16 rounded-full m-8">
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-xs text-gray-600">
                    {category.name} ({category.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function renderPieChart(categories: Category[]) {
  let cumulativePercentage = 0;
  const totalPercentage = categories.reduce((sum, category) => sum + category.percentage, 0);
  
  return categories.map((category, index) => {
    const normalizedPercentage = (category.percentage / totalPercentage) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert percentage to degrees (360 / 100 = 3.6)
    cumulativePercentage += normalizedPercentage;
    const endAngle = cumulativePercentage * 3.6;
    
    // Calculate the SVG path for the pie slice
    const startX = 50 + 40 * Math.cos((startAngle - 90) * (Math.PI / 180));
    const startY = 50 + 40 * Math.sin((startAngle - 90) * (Math.PI / 180));
    const endX = 50 + 40 * Math.cos((endAngle - 90) * (Math.PI / 180));
    const endY = 50 + 40 * Math.sin((endAngle - 90) * (Math.PI / 180));
    
    const largeArcFlag = normalizedPercentage > 50 ? 1 : 0;
    
    const pathData = [
      `M 50 50`,
      `L ${startX} ${startY}`,
      `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`
    ].join(' ');
    
    return (
      <path 
        key={index} 
        d={pathData} 
        fill={category.color}
      />
    );
  });
}
