"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Mail, School, User, Clock, Package, AlertCircle, IdCard } from "lucide-react"
import { format } from "date-fns"

export default function ProfileSection() {
  const { user, userData } = useAuth();

  if (!user) return null;

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
              <h3 className="text-lg font-semibold text-[#0052cc] mb-6">
                Reports History
              </h3>
              {userData?.reports?.length ? (
                <div className="space-y-4">
                  {userData.reports.map(report => (
                    <div key={report.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <Package className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-700">{report.itemName}</p>
                        <p className="text-sm text-gray-500 mt-1">{report.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-2 mx-auto" />
                  <p>No reports yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="mt-10">
            <div className="bg-white rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.15)] p-6">
              <h3 className="text-lg font-semibold text-[#0052cc] mb-6">
                Claims History
              </h3>
              {userData?.claims?.length ? (
                <div className="space-y-4">
                  {userData.claims.map(claim => (
                    <div key={claim.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <Package className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-700">{claim.itemName}</p>
                        <p className="text-sm text-gray-500 mt-1">{claim.status}</p>
                      </div>
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
              <h3 className="text-lg font-semibold text-[#0052cc] mb-6">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-700">Account Created</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {userData?.createdAt ? 
                        format(new Date(userData.createdAt), 'PPP') :
                        format(new Date(user.metadata.creationTime), 'PPP')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-700">Last Sign In</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {userData?.lastLogin ? 
                        format(new Date(userData.lastLogin), 'PPP') :
                        format(new Date(user.metadata.lastSignInTime), 'PPP')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 