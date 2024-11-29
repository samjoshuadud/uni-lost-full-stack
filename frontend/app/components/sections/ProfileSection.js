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
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Overview Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-8">
              {/* Profile Picture */}
              <div className="relative">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-28 h-28 rounded-full border-4 border-[#0052cc]/10"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[#0052cc]/10 flex items-center justify-center">
                    <User className="h-14 w-14 text-[#0052cc]/40" />
                  </div>
                )}
                <Badge 
                  className="absolute -bottom-2 right-0 px-3 py-1 bg-yellow-400 text-[#0052cc] font-medium"
                >
                  {userData?.isAdmin ? "Admin" : "Student"}
                </Badge>
              </div>

              {/* Basic Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#0052cc]">
                    {user.displayName || "UMAK User"}
                  </h2>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <IdCard className="h-4 w-4 text-gray-400" />
                      <span>{userData?.studentId || "No Student ID"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <School className="h-4 w-4 text-gray-400" />
                      <span>University of Makati</span>
                    </div>
                    {userData?.lastLogin && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Last Login: {format(new Date(userData.lastLogin.seconds * 1000), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Tabs */}
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white border border-gray-200 rounded-lg p-1 h-auto">
            <TabsTrigger 
              value="reports" 
              className="py-2.5 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
            >
              My Reports
            </TabsTrigger>
            <TabsTrigger 
              value="claims"
              className="py-2.5 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
            >
              My Claims
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="py-2.5 data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
            >
              Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0052cc]">Reports History</CardTitle>
              </CardHeader>
              <CardContent>
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
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
                    <p>No reports yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0052cc]">Claims History</CardTitle>
              </CardHeader>
              <CardContent>
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
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
                    <p>No claims yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#0052cc]">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 