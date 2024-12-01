"use client"

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Activity, TrendingUp, BarChart, Package, Search, CheckCircle, Loader2, Download } from "lucide-react"
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

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function StatisticsSection() {
  const [stats, setStats] = useState({
    totalReports: 0,
    foundItems: 0,
    activeCases: 0,
    retrievedItems: 0,
    categoryDistribution: {},
    recentActivity: [],
    weeklyChange: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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
        
        const processes = data.$values || [];

        // Calculate statistics
        const totalReports = processes.length;

        const foundItems = processes.filter(process => 
          process.item?.status?.toLowerCase() === "found"
        ).length;

        const activeCases = processes.filter(process => 
          process.status === ProcessStatus.PENDING_APPROVAL ||
          process.status === ProcessStatus.IN_VERIFICATION ||
          process.status === ProcessStatus.PENDING_RETRIEVAL
        ).length;

        const retrievedItems = processes.filter(process => 
          process.status === ProcessStatus.HANDED_OVER
        ).length;

        // Calculate category distribution
        const categoryDistribution = processes.reduce((acc, process) => {
          const category = process.item?.category || 'Others';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        // Calculate percentages for categories
        const total = Object.values(categoryDistribution).reduce((a, b) => a + b, 0);
        const categoryPercentages = Object.entries(categoryDistribution).reduce((acc, [key, value]) => {
          acc[key] = Math.round((value / total) * 100);
          return acc;
        }, {});

        // Get recent activity
        const recentActivity = processes
          .filter(process => 
            process.status === ProcessStatus.HANDED_OVER || 
            process.status === ProcessStatus.PENDING_APPROVAL
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 5)
          .map(process => ({
            type: process.status === ProcessStatus.HANDED_OVER ? 'retrieved' : 'new',
            itemName: process.item?.name,
            studentId: process.item?.studentId,
            timestamp: process.updatedAt
          }));

        // Calculate weekly change
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentReports = processes.filter(process => 
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

          const monthProcesses = processes.filter(process => {
            const processDate = new Date(process.createdAt);
            return processDate >= monthStart && processDate <= monthEnd;
          });

          return {
            month: `${month} ${year}`,
            lost: monthProcesses.filter(p => p.item?.status?.toLowerCase() === 'lost').length,
            found: monthProcesses.filter(p => p.item?.status?.toLowerCase() === 'found').length,
            retrieved: monthProcesses.filter(p => p.status === ProcessStatus.HANDED_OVER).length
          };
        });

        // Update chart data
        setChartData({
          labels: monthlyStats.map(stat => stat.month),
          datasets: [
            {
              label: 'Lost Items',
              data: monthlyStats.map(stat => stat.lost),
              backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1
            },
            {
              label: 'Found Items',
              data: monthlyStats.map(stat => stat.found),
              backgroundColor: 'rgba(34, 197, 94, 0.5)', // green
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1
            },
            {
              label: 'Retrieved Items',
              data: monthlyStats.map(stat => stat.retrieved),
              backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1
            }
          ]
        });

        setStats({
          totalReports,
          foundItems,
          activeCases,
          retrievedItems,
          categoryDistribution: categoryPercentages,
          recentActivity,
          weeklyChange: recentReports
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
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        {/* Total Reports Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalReports}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +{stats.weeklyChange} from last week
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Found Items Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">Found Items</p>
                <p className="text-2xl font-bold text-green-600">{stats.foundItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Cases Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Activity className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.activeCases}</p>
                <p className="text-xs text-muted-foreground">Currently processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retrieved Items Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">Retrieved</p>
                <p className="text-2xl font-bold text-green-600">{stats.retrievedItems}</p>
                <p className="text-xs text-muted-foreground">Successfully returned</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                      chartData
                    })}
                  >
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportStatistics.toPdf({
                      ...stats,
                      chartData
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
              {Object.entries(stats.categoryDistribution).map(([category, percentage]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500 ease-in-out"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: category === 'Electronics' ? '#3B82F6' :
                                      category === 'Documents' ? '#10B981' :
                                      category === 'Personal Items' ? '#F59E0B' :
                                      '#6B7280'
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
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    activity.type === 'retrieved' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.type === 'retrieved' ? 'Item Retrieved' : 'New Report'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.itemName} - Student ID: {activity.studentId}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.timestamp).toRelative()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 