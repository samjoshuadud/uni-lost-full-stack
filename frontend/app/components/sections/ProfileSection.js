"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Mail, School, User, Clock } from "lucide-react"

export default function ProfileSection() {
  const { user, userData } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full border-4 border-primary/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-12 w-12 text-primary/40" />
                </div>
              )}
              <Badge className="absolute -bottom-2 right-0 px-3" variant="secondary">
                {userData?.role || "Student"}
              </Badge>
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {user.displayName || "UMAK User"}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <School className="h-4 w-4" />
                  <span>University of Makati</span>
                </div>
                {userData?.lastLogin && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last Login: {new Date(userData.lastLogin.seconds * 1000).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="claims">My Claims</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reports History</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {userData?.reports?.length ? (
                userData.reports.map(report => (
                  <div key={report.id} className="border-b py-2">
                    <p className="font-medium">{report.itemName}</p>
                    <p className="text-sm">{report.status}</p>
                  </div>
                ))
              ) : (
                "No reports yet."
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claims History</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {userData?.claims?.length ? (
                userData.claims.map(claim => (
                  <div key={claim.id} className="border-b py-2">
                    <p className="font-medium">{claim.itemName}</p>
                    <p className="text-sm">{claim.status}</p>
                  </div>
                ))
              ) : (
                "No claims yet."
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      {userData?.createdAt ? 
                        new Date(userData.createdAt.seconds * 1000).toLocaleDateString() :
                        new Date(user.metadata.creationTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Sign In</p>
                    <p className="text-sm text-muted-foreground">
                      {userData?.lastLogin ? 
                        new Date(userData.lastLogin.seconds * 1000).toLocaleDateString() :
                        new Date(user.metadata.lastSignInTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 