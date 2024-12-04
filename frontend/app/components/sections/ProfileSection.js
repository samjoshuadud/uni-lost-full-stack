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
  const [claims, setClaims] = useState([]);
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

        // Filter claims made by the user
        const userClaims = processes.filter(process => 
          process.requestorUserId === user.uid
        ).map(process => ({
          id: process.id,
          itemName: process.item?.name,
          status: process.status,
          date: process.createdAt,
          category: process.item?.category
        }));

        setReports(userReports);
        setClaims(userClaims);
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
    <div className="min-h-[80vh] w-[80%] mx-auto rounded-3xl bg-gradient-to-br from-blue-100 to-yellow-100 p-12 shadow-[0_10px_20px_rgba(0,0,0,0.15)]">
      <div className="max-w-3xl mx-auto space-y-6 mt-10">
        {/* Profile Info Section */}
        <div className="flex items-start gap-8">
          {/* Avatar */}
          <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-32 h-32 rounded-full"
              />
            ) : (
              <svg
                className="w-16 h-16 text-gray-400"
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
            )}
          </div>

          {/* User Details */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-[#2E3F65] mb-2">
              {user.displayName || "UMAK User"}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <IdCard className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{userData?.studentId || "No Student ID"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <School className="w-4 h-4 text-gray-500" />
                <span className="text-sm">University of Makati</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="w-full bg-[#2E3F65] p-1.5 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.15)] mt-10">
            <TabsTrigger 
              value="reports" 
              className="flex-1 py-1.5 px-6 rounded-full data-[state=active]:bg-yellow-400 data-[state=active]:text-[#0052cc] text-white"
            >
              My Reports
            </TabsTrigger>
            <TabsTrigger 
              value="claims"
              className="flex-1 py-1.5 px-6 rounded-full data-[state=active]:bg-yellow-400 data-[state=active]:text-[#0052cc] text-white"
            >
              My Claims
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="flex-1 py-1.5 px-6 rounded-full data-[state=active]:bg-yellow-400 data-[state=active]:text-[#0052cc] text-white"
            >
              Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-10">
            <div className="bg-white rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.15)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0052cc]">
                    Reports History
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-gray-100">
                  {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                </Badge>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0052cc]" />
                    <p className="text-sm text-gray-500">Loading your reports...</p>
                  </div>
                </div>
              ) : reports.length ? (
                <motion.div 
                  className="space-y-4"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  {reports.map((report, index) => (
                    <motion.div key={report.id} variants={item}>
                      <div className="group">
                        <div className="flex items-start gap-4 p-6 bg-white hover:bg-gray-50 transition-all duration-200 rounded-xl border border-gray-200 shadow-sm hover:shadow-md">
                          <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Package className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 truncate">{report.itemName}</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="secondary" className="bg-gray-100/80 text-gray-700 group-hover:bg-gray-100">
                                    {report.category}
                                  </Badge>
                                </div>
                              </div>
                              {getStatusBadge(report.status, report.itemStatus)}
                            </div>
                            <div className="mt-3 flex items-center text-sm text-gray-600">
                              <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                              <time dateTime={report.date}>
                                {format(new Date(report.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                              </time>
                            </div>
                          </div>
                        </div>
                        {index < reports.length - 1 && (
                          <div className="h-[2px] bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4 opacity-60" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-gray-100/80 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-gray-900 font-medium mb-1">No Reports Yet</h4>
                  <p className="text-gray-500 text-sm">
                    When you report lost or found items, they will appear here.
                  </p>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="mt-10">
            <div className="bg-white rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.15)] p-6">
              <h3 className="text-lg font-semibold text-[#0052cc] mb-6">
                Claims History
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0052cc]" />
                </div>
              ) : claims.length ? (
                <div className="space-y-4">
                  {claims.map((claim, index) => (
                    <div key={claim.id}>
                      <div className="flex items-start gap-4 p-6 bg-white hover:bg-gray-50 transition-colors rounded-xl border border-gray-200 shadow-sm">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <Package className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{claim.itemName}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                  {claim.category}
                                </Badge>
                              </div>
                            </div>
                            {getStatusBadge(claim.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-3 flex items-center">
                            <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                            {new Date(claim.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      {index < claims.length - 1 && (
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-2 mx-auto" />
                  <p>No claims yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-10">
            <div className="bg-white rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.15)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Activity className="h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#0052cc]">
                  Recent Activity
                </h3>
              </div>
              <div className="space-y-4">
                <motion.div 
                  className="relative pl-8 pb-8 before:absolute before:left-[15px] before:top-2 before:h-full before:w-[2px] before:bg-gray-100"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="absolute left-0 top-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <h4 className="font-medium text-gray-900">Account Created</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(userData?.createdAt || user.metadata.creationTime), 
                        "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="relative pl-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute left-0 top-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
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