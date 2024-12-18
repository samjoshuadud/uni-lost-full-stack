"use client"

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Activity, TrendingUp, BarChart, Package, Search, CheckCircle, Loader2, Download, X } from "lucide-react"
import { API_BASE_URL } from '@/lib/api-config';
import { ProcessStatus } from '@/lib/constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { exportStatistics } from '@/lib/export-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Add loading animation styles at the top of the component
const pulseAnimation = "animate-pulse";
const shimmerAnimation = "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

// Add consistent category colors
const categoryColors = {
  'Electronics': '#3B82F6',    // Blue
  'Documents': '#10B981',      // Green
  'Personal Items': '#F59E0B', // Amber
  'Clothing': '#8B5CF6',       // Purple
  'Accessories': '#EC4899',    // Pink
  'Books': '#F97316',          // Orange
  'Others': '#6B7280'          // Gray
};

export default function StatisticsSection() {
  const [stats, setStats] = useState({
    totalReports: 0,
    foundItems: 0,
    lostItems: 0,
    activeCases: 0,
    retrievedItems: 0,
    noShowItems: 0,
    pendingApproval: 0,
    pendingRetrieval: 0,
    categoryDistribution: {},
    recentActivity: [],
    weeklyChange: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Add new state for processes
  const [processes, setProcesses] = useState([]);

  // Add new state for chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  // Add chart ref
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch statistics");
        const data = await response.json();
        
        const fetchedProcesses = data.$values || [];
        // Store processes in state
        setProcesses(fetchedProcesses);

        // Calculate statistics
        const totalReports = fetchedProcesses.length;

        const foundItems = fetchedProcesses.filter(process => 
          process.item?.status?.toLowerCase() === "found"
        ).length;

        const lostItems = fetchedProcesses.filter(process => 
          process.item?.status?.toLowerCase() === "lost"
        ).length;

        const activeCases = fetchedProcesses.filter(process => 
          process.status === ProcessStatus.PENDING_APPROVAL ||
          process.status === ProcessStatus.IN_VERIFICATION ||
          process.status === ProcessStatus.PENDING_RETRIEVAL
        ).length;

        const retrievedItems = fetchedProcesses.filter(process => 
          process.status === ProcessStatus.HANDED_OVER
        ).length;

        const noShowItems = fetchedProcesses.filter(process => 
          process.status === ProcessStatus.NO_SHOW
        ).length;

        const pendingApproval = fetchedProcesses.filter(process => 
          process.status === ProcessStatus.PENDING_APPROVAL
        ).length;

        const pendingRetrieval = fetchedProcesses.filter(process => 
          process.status === ProcessStatus.PENDING_RETRIEVAL
        ).length;

        // Calculate category distribution
        const categoryDistribution = fetchedProcesses.reduce((acc, process) => {
          const category = process.item?.category?.toLowerCase() || '';
          
          // Skip if no category
          if (!category) return acc;

          // Normalize "others" categories
          const normalizedCategory = category.startsWith('others') ? 'Others' : process.item.category;
          
          if (!acc[normalizedCategory]) {
            acc[normalizedCategory] = 0;
          }
          acc[normalizedCategory]++;
          
          return acc;
        }, {});

        // Calculate percentages based on total items
        const total = Object.values(categoryDistribution).reduce((sum, count) => sum + count, 0);
        const categoryPercentages = Object.entries(categoryDistribution).reduce((acc, [category, count]) => {
          acc[category] = Math.round((count / total) * 100);
          return acc;
        }, {});

        // Get recent activity
        const recentActivity = fetchedProcesses
          .filter(process => process.updatedAt)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 10)
          .map(process => {
            let type, label;
            switch (process.status) {
              case ProcessStatus.HANDED_OVER:
                type = 'Retrieved';
                label = 'bg-green-500';
                break;
              case ProcessStatus.PENDING_APPROVAL:
                type = 'New Report';
                label = 'bg-blue-500';
                break;
              case ProcessStatus.IN_VERIFICATION:
                type = 'Verification';
                label = 'bg-yellow-500';
                break;
              case ProcessStatus.PENDING_RETRIEVAL:
                type = 'Ready';
                label = 'bg-purple-500';
                break;
              case ProcessStatus.NO_SHOW:
                type = 'No Show';
                label = 'bg-red-500';
                break;
              case ProcessStatus.REJECTED:
                type = 'Rejected';
                label = 'bg-gray-500';
                break;
              case ProcessStatus.APPROVED:
                type = 'Posted';
                label = 'bg-blue-500';
                break;
              default:
                type = 'Status Update';
                label = 'bg-gray-400';
            }
            return {
              type,
              color: label,
              itemName: process.item?.name,
              studentId: process.item?.studentId,
              timestamp: process.updatedAt,
              itemStatus: process.item?.status
            };
          });

        // Calculate weekly change
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentReports = fetchedProcesses.filter(process => 
          new Date(process.createdAt) > lastWeek
        ).length;

        // Calculate monthly statistics for the chart
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date;
        }).reverse();

        const monthlyStats = last6Months.map(date => {
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const monthProcesses = fetchedProcesses.filter(process => {
            const processDate = new Date(process.createdAt);
            return processDate >= monthStart && processDate <= monthEnd;
          });

          return {
            month: `${month} ${year}`,
            lost: monthProcesses.filter(p => p.item?.status?.toLowerCase() === 'lost').length,
            found: monthProcesses.filter(p => p.item?.status?.toLowerCase() === 'found').length,
            retrieved: monthProcesses.filter(p => p.status === ProcessStatus.HANDED_OVER).length,
            noShow: monthProcesses.filter(p => p.status === ProcessStatus.NO_SHOW).length,
            pendingApproval: monthProcesses.filter(p => p.status === ProcessStatus.PENDING_APPROVAL).length,
            pendingRetrieval: monthProcesses.filter(p => p.status === ProcessStatus.PENDING_RETRIEVAL).length,
            activeCases: monthProcesses.filter(p => 
              p.status === ProcessStatus.PENDING_APPROVAL ||
              p.status === ProcessStatus.IN_VERIFICATION ||
              p.status === ProcessStatus.PENDING_RETRIEVAL
            ).length
          };
        });

        // Update chart data
        setChartData({
          labels: monthlyStats.map(stat => stat.month),
          datasets: [
            {
              label: 'Lost Items',
              data: monthlyStats.map(stat => stat.lost),
              backgroundColor: 'rgba(239, 68, 68, 0.5)', // Red
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1
            },
            {
              label: 'Found Items',
              data: monthlyStats.map(stat => stat.found),
              backgroundColor: categoryColors['Electronics'].replace(')', ', 0.5)').replace('rgb', 'rgba'),
              borderColor: categoryColors['Electronics'],
              borderWidth: 1
            },
            {
              label: 'Retrieved Items',
              data: monthlyStats.map(stat => stat.retrieved),
              backgroundColor: categoryColors['Documents'].replace(')', ', 0.5)').replace('rgb', 'rgba'),
              borderColor: categoryColors['Documents'],
              borderWidth: 1
            },
            {
              label: 'No Show',
              data: monthlyStats.map(stat => stat.noShow),
              backgroundColor: categoryColors['Others'].replace(')', ', 0.5)').replace('rgb', 'rgba'),
              borderColor: categoryColors['Others'],
              borderWidth: 1
            },
            {
              label: 'Pending Approval',
              data: monthlyStats.map(stat => stat.pendingApproval),
              backgroundColor: categoryColors['Accessories'].replace(')', ', 0.5)').replace('rgb', 'rgba'),
              borderColor: categoryColors['Accessories'],
              borderWidth: 1
            },
            {
              label: 'Pending Retrieval',
              data: monthlyStats.map(stat => stat.pendingRetrieval),
              backgroundColor: categoryColors['Books'].replace(')', ', 0.5)').replace('rgb', 'rgba'),
              borderColor: categoryColors['Books'],
              borderWidth: 1
            },
            {
              label: 'Active Cases',
              data: monthlyStats.map(stat => stat.activeCases),
              backgroundColor: 'rgba(147, 51, 234, 0.5)', // Purple
              borderColor: 'rgb(147, 51, 234)',
              borderWidth: 1
            }
          ]
        });

        setStats({
          totalReports,
          foundItems,
          lostItems,
          activeCases,
          retrievedItems,
          noShowItems,
          pendingApproval,
          pendingRetrieval,
          weeklyChange: recentReports,
          categoryDistribution: categoryPercentages,
          recentActivity
        });

      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
    const interval = setInterval(fetchStatistics, 60000);
    return () => clearInterval(interval);
  }, []);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div 
              key={index}
              className={cn(
                "bg-white rounded-lg shadow-sm p-6 relative overflow-hidden",
                shimmerAnimation
              )}
            >
              {/* Card Header Skeleton */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent animate-shimmer" />
              
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  pulseAnimation,
                  index === 0 ? "bg-blue-100/50" :
                  index === 1 ? "bg-green-100/50" :
                  index === 2 ? "bg-yellow-100/50" : "bg-green-100/50"
                )}>
                  {/* Animated dot */}
                  <div className="h-2 w-2 rounded-full bg-current animate-ping opacity-75" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className={cn("h-4 bg-gray-100/80 rounded w-24", pulseAnimation)} />
                  <div className={cn("h-7 bg-gray-100/80 rounded w-16", pulseAnimation)} />
                  {index === 0 && (
                    <div className={cn("h-3 bg-gray-100/80 rounded w-20", pulseAnimation)} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Data Section Skeleton */}
        <div className="grid grid-cols-2 gap-6">
          {/* Monthly Statistics Chart Skeleton */}
          <div className={cn(
            "col-span-2 bg-white rounded-lg shadow-sm p-6 relative overflow-hidden",
            shimmerAnimation
          )}>
            {/* Card Header Loading Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent animate-shimmer" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-5 w-5 rounded bg-gray-100/80 flex items-center justify-center",
                  pulseAnimation
                )}>
                  <div className="h-1.5 w-1.5 rounded-full bg-current animate-ping opacity-75" />
                </div>
                <div className={cn("h-6 w-40 bg-gray-100/80 rounded", pulseAnimation)} />
              </div>
              <div className={cn("h-9 w-32 bg-gray-100/80 rounded", pulseAnimation)} />
            </div>
            <div className={cn(
              "h-[300px] bg-gray-100/80 rounded flex items-center justify-center relative",
              pulseAnimation
            )}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
              <Loader2 className="h-8 w-8 animate-spin text-gray-400/50" />
            </div>
          </div>

          {/* Category Distribution Skeleton */}
          <div className={cn(
            "bg-white rounded-lg shadow-sm p-6 relative overflow-hidden",
            shimmerAnimation
          )}>
            {/* Card Header Loading Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent animate-shimmer" />
            
            <div className="flex items-center gap-2 mb-6">
              <div className={cn(
                "h-5 w-5 rounded bg-gray-100/80 flex items-center justify-center",
                pulseAnimation
              )}>
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-ping opacity-75" />
              </div>
              <div className={cn("h-6 w-40 bg-gray-100/80 rounded", pulseAnimation)} />
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <div className={cn("h-4 w-24 bg-gray-100/80 rounded", pulseAnimation)} />
                    <div className={cn("h-4 w-12 bg-gray-100/80 rounded", pulseAnimation)} />
                  </div>
                  <div className={cn(
                    "h-2 bg-gray-100/80 rounded-full relative overflow-hidden",
                    pulseAnimation
                  )} style={{ width: `${Math.random() * 60 + 40}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className={cn(
            "bg-white rounded-lg shadow-sm p-6 relative overflow-hidden",
            shimmerAnimation
          )}>
            {/* Card Header Loading Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent animate-shimmer" />
            
            <div className="flex items-center gap-2 mb-6">
              <div className={cn(
                "h-5 w-5 rounded bg-gray-100/80 flex items-center justify-center",
                pulseAnimation
              )}>
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-ping opacity-75" />
              </div>
              <div className={cn("h-6 w-40 bg-gray-100/80 rounded", pulseAnimation)} />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg relative overflow-hidden",
                    "bg-gray-50/80"
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full bg-gray-200/80", pulseAnimation)} />
                  <div className="flex-1 space-y-1">
                    <div className={cn("h-4 w-32 bg-gray-100/80 rounded", pulseAnimation)} />
                    <div className={cn("h-3 w-48 bg-gray-100/80 rounded", pulseAnimation)} />
                  </div>
                  <div className={cn("h-3 w-24 bg-gray-100/80 rounded", pulseAnimation)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="space-y-4">
        {/* First Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Reports Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                  <p className="text-xl font-bold text-blue-600">{stats.totalReports}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    +{stats.weeklyChange}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Found Items Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Found Items</p>
                  <p className="text-xl font-bold text-blue-600">{stats.foundItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lost Items Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Search className="h-4 w-4 text-red-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Lost Items</p>
                  <p className="text-xl font-bold text-red-600">{stats.lostItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retrieved Items Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Retrieved</p>
                  <p className="text-xl font-bold text-green-600">{stats.retrievedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Pending Approval Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-pink-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-xl font-bold text-pink-600">{stats.pendingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Retrieval Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Pending Retrieval</p>
                  <p className="text-xl font-bold text-orange-600">{stats.pendingRetrieval}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Show Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <X className="h-4 w-4 text-gray-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">No Show</p>
                  <p className="text-xl font-bold text-gray-600">{stats.noShowItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Cases Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-xl font-bold text-purple-600">{stats.activeCases}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts and Data Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Statistics Chart */}
        <Card className="hover:shadow-md transition-shadow col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <BarChart className="h-5 w-5 text-blue-600" />
                Monthly Statistics
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => exportStatistics.toExcel({
                      ...stats,
                      chartData,
                      allProcesses: processes, // Include all processes data
                      categoryColors          // Include category colors
                    })}
                  >
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportStatistics.toPdf({
                      ...stats,
                      chartData,
                      allProcesses: processes,
                      categoryColors,
                      additionalStats: {
                        lostItems: stats.lostItems,
                        pendingRetrieval: stats.pendingRetrieval,
                        pendingApproval: stats.pendingApproval
                      }
                    }, chartRef)}
                  >
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Bar ref={chartRef} options={chartOptions} data={chartData} />
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <PieChart className="h-5 w-5 text-blue-600" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.categoryDistribution).map(([category, data]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {category}
                      {category === 'Others' && data.specifications?.length > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({data.specifications.length} types)
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {typeof data === 'number' ? data : data.count}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500 ease-in-out"
                      style={{ 
                        width: `${typeof data === 'number' ? data : data.count}%`,
                        backgroundColor: categoryColors[category] || categoryColors['Others']
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${activity.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.itemName} 
                      {activity.studentId && ` • ${activity.studentId}`}
                      {activity.itemStatus && ` • ${activity.itemStatus} Item`}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.timestamp).toRelative()}
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 