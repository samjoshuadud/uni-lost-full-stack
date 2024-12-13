"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Mail, School, User, Clock, Package, AlertCircle, IdCard, Loader2, ClipboardList, Activity } from "lucide-react"
import { format } from "date-fns"
import { API_BASE_URL } from '@/lib/api-config';
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ProfileSection() {
  const { user, userData } = useAuth();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProcesses = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/pending/all`);
        if (!response.ok) throw new Error('Failed to fetch processes');
        
        const data = await response.json();
        const processes = data.$values || [];

        // Filter reports made by the user
        const userReports = processes.filter(process => 
          process.item?.reporterId === user.uid
        ).map(process => ({
          id: process.id,
          itemName: process.item?.name,
          status: process.status,
          date: process.createdAt,
          category: process.item?.category,
          itemStatus: process.item?.status
        }));

        setReports(userReports);
      } catch (error) {
        console.error('Error fetching user processes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProcesses();
  }, [user]);

  if (!user) return null;

  const getStatusBadge = (status, itemStatus) => {
    let bgColor = "bg-gray-100 text-gray-800";
    
    // Function to format status text
    const formatStatus = (text) => {
      return text
        ?.toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    switch (status?.toLowerCase()) {
      case "pending_approval":
        bgColor = "bg-yellow-100 text-yellow-800";
        break;
      case "approved":
        bgColor = "bg-green-100 text-green-800";
        break;
      case "in_verification":
        bgColor = "bg-blue-100 text-blue-800";
        break;
      case "verified":
        bgColor = "bg-purple-100 text-purple-800";
        break;
      case "handed_over":
        bgColor = "bg-green-100 text-green-800";
        break;
      case "verification_failed":
        bgColor = "bg-red-100 text-red-800";
        break;
    }

    return (
      <div className="flex items-center gap-2">
        <Badge className={`${bgColor} px-2 py-0.5 text-xs font-medium`}>
          {formatStatus(status)}
        </Badge>
        {itemStatus && (
          <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs font-medium">
            {itemStatus.toLowerCase()}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] w-full sm:w-[95%] lg:w-[90%] xl:w-[80%] mx-auto rounded-2xl sm:rounded-3xl 
      bg-gradient-to-br from-blue-50 via-blue-100/50 to-yellow-100/50 p-4 sm:p-8 lg:p-12 
      shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm"
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 mt-4 sm:mt-10">
        {/* Profile Info Section */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Avatar Container */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-100 to-blue-50 
                rounded-full shadow-lg flex items-center justify-center flex-shrink-0
                transform transition-transform duration-300 group-hover:scale-105"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover p-1 bg-white"
                  />
                ) : (
                  <div className="bg-white p-6 rounded-full">
                    <svg
                      className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {/* Online Status Indicator */}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full 
                border-2 border-white shadow-sm"
              />
            </div>

            {/* User Details */}
            <div className="flex flex-col text-center sm:text-left space-y-6">
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#2E3F65] via-blue-500 to-[#0052cc] 
                  bg-clip-text text-transparent"
                >
                  {user.displayName || "UMAK User"}
                </h2>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#2E3F65] via-blue-500 to-[#0052cc] 
                  rounded-full opacity-20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="group relative">
                  {/* Decorative Background Elements */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent rounded-2xl 
                    transform transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-white/50 rounded-2xl backdrop-blur-sm border border-white/80
                    shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  
                  {/* Content */}
                  <div className="relative p-4 sm:p-5 flex flex-col items-center sm:items-start gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl
                      shadow-inner group-hover:shadow-blue-100/50 transition-shadow duration-300"
                    >
                      <Mail className="w-5 h-5 text-blue-600 transform group-hover:scale-110 
                        transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider">Email Address</p>
                      <p className="text-sm text-gray-700 break-all font-medium">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent rounded-2xl 
                    transform transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-white/50 rounded-2xl backdrop-blur-sm border border-white/80
                    shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  
                  <div className="relative p-4 sm:p-5 flex flex-col items-center sm:items-start gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl
                      shadow-inner group-hover:shadow-indigo-100/50 transition-shadow duration-300"
                    >
                      <IdCard className="w-5 h-5 text-indigo-600 transform group-hover:scale-110 
                        transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-medium text-indigo-600/80 uppercase tracking-wider">Student ID</p>
                      <p className="text-sm text-gray-700 font-medium">{userData?.studentId || "No Student ID"}</p>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent rounded-2xl 
                    transform transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-white/50 rounded-2xl backdrop-blur-sm border border-white/80
                    shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  
                  <div className="relative p-4 sm:p-5 flex flex-col items-center sm:items-start gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl
                      shadow-inner group-hover:shadow-purple-100/50 transition-shadow duration-300"
                    >
                      <School className="w-5 h-5 text-purple-600 transform group-hover:scale-110 
                        transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-medium text-purple-600/80 uppercase tracking-wider">Institution</p>
                      <p className="text-sm text-gray-700 font-medium">University of Makati</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-blue-50 
                  rounded-full border border-blue-100/50 shadow-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-gray-600">Active Now</span>
                </div>
                
                {userData?.isVerified && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 
                    rounded-full border border-blue-100/50 shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Verified Account</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="reports" className="w-full mt-8">
          <TabsList className="
            w-full bg-[#2E3F65]/90 
            h-14
            p-1.5
            flex gap-2
            rounded-full
            shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10"
          >
            <TabsTrigger 
              value="reports" 
              className="
                flex-1 py-2 px-4
                rounded-full 
                data-[state=active]:bg-gradient-to-r 
                data-[state=active]:from-yellow-400 
                data-[state=active]:to-yellow-300
                data-[state=active]:text-[#2E3F65]
                data-[state=active]:shadow-md
                data-[state=active]:font-medium
                data-[state=active]:scale-[0.98]
                text-white/90 
                text-sm
                transition-all duration-300
                hover:bg-white/10 
                hover:text-yellow-400
                group
              "
            >
              <div className="flex items-center justify-center gap-2">
                <div className="p-1.5 rounded-full bg-white/10 group-data-[state=active]:bg-[#2E3F65]/10">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
                <span>My Reports</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="
                flex-1 py-2 px-4
                rounded-full 
                data-[state=active]:bg-gradient-to-r 
                data-[state=active]:from-yellow-400 
                data-[state=active]:to-yellow-300
                data-[state=active]:text-[#2E3F65]
                data-[state=active]:shadow-md
                data-[state=active]:font-medium
                data-[state=active]:scale-[0.98]
                text-white/90 
                text-sm
                transition-all duration-300
                hover:bg-white/10 
                hover:text-yellow-400
                group
              "
            >
              <div className="flex items-center justify-center gap-2">
                <div className="p-1.5 rounded-full bg-white/10 group-data-[state=active]:bg-[#2E3F65]/10">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span>Recent Activity</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6 sm:mt-10">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              {/* Reports Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-xl">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-[#2E3F65] to-[#0052cc] bg-clip-text text-transparent">
                      Reports History
                    </h3>
                    <p className="text-sm text-gray-500">Track your lost and found reports</p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                </Badge>
              </div>

              {/* Reports Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-blue-100 animate-pulse" />
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-gray-500">Loading your reports...</p>
                  </div>
                </div>
              ) : reports.length ? (
                <motion.div 
                  className="relative"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  <div className="max-h-[500px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-blue-200 
                    scrollbar-track-transparent hover:scrollbar-thumb-blue-300 transition-colors"
                  >
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <motion.div key={report.id} variants={item}>
                          <div className="group">
                            <div className="flex items-start gap-4 p-5 bg-white hover:bg-blue-50/50 
                              transition-all duration-200 rounded-xl border border-gray-100 
                              shadow-sm hover:shadow-md hover:border-blue-100"
                            >
                              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/20 
                                rounded-xl group-hover:from-blue-500/20 group-hover:to-blue-500/30 
                                transition-colors"
                              >
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-1.5">{report.itemName}</h4>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" 
                                        className="bg-gray-50 text-gray-700 group-hover:bg-blue-100/50 
                                          group-hover:text-blue-800 transition-colors"
                                      >
                                        {report.category}
                                      </Badge>
                                    </div>
                                  </div>
                                  {getStatusBadge(report.status, report.itemStatus)}
                                </div>
                                <div className="mt-3 flex items-center text-sm text-gray-500 group-hover:text-gray-600">
                                  <CalendarDays className="h-4 w-4 mr-2 text-gray-400 group-hover:text-gray-500" />
                                  <time dateTime={report.date}>
                                    {format(new Date(report.date), "MMM d, yyyy 'at' h:mm a")}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-3 h-16 
                    bg-gradient-to-t from-white/50 via-white/30 to-transparent pointer-events-none" 
                  />
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100/80 
                    rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"
                  >
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-gray-900 font-medium mb-2">No Reports Yet</h4>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    When you report lost or found items, they will appear here.
                  </p>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6 sm:mt-10">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              {/* Activity Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 rounded-xl">
                  <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-[#2E3F65] to-[#0052cc] bg-clip-text text-transparent">
                    Recent Activity
                  </h3>
                  <p className="text-sm text-gray-500">Your account activity timeline</p>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-6">
                <motion.div 
                  className="relative pl-10 pb-8 before:absolute before:left-[19px] before:top-2 
                    before:h-full before:w-[2px] before:bg-gradient-to-b before:from-green-200 before:to-transparent"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute left-0 top-0 w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 
                    rounded-full flex items-center justify-center shadow-sm"
                  >
                    <CalendarDays className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="bg-white/80 hover:bg-white p-4 rounded-xl border border-gray-100 
                    shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-100"
                  >
                    <h4 className="font-medium text-gray-900">Account Created</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(userData?.createdAt || user.metadata.creationTime), 
                        "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="relative pl-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute left-0 top-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 
                    rounded-full flex items-center justify-center shadow-sm"
                  >
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="bg-white/80 hover:bg-white p-4 rounded-xl border border-gray-100 
                    shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-100"
                  >
                    <h4 className="font-medium text-gray-900">Last Sign In</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(userData?.lastLogin || user.metadata.lastSignInTime), 
                        "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 