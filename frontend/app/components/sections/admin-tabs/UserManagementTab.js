"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function UserManagementTab() {
  const { makeAuthenticatedRequest } = useAuth();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingUser, setProcessingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const [usersResponse, adminsResponse] = await Promise.all([
        makeAuthenticatedRequest("/api/Auth/users"),
        makeAuthenticatedRequest("/api/Auth/admins")
      ]);

      if (usersResponse && usersResponse.$values) {
        setUsers(usersResponse.$values);
        console.log('Users fetched:', usersResponse.$values);
      }

      if (adminsResponse && adminsResponse.$values) {
        setAdmins(adminsResponse.$values);
        console.log('Admins fetched:', adminsResponse.$values);
      }

    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (email, isCurrentlyAdmin) => {
    setProcessingUser(email);
    try {
      const response = await makeAuthenticatedRequest("/api/Auth/assign-admin", {
        method: "POST",
        body: JSON.stringify({ 
          email: email,
          action: isCurrentlyAdmin ? 'unassign' : 'assign'
        })
      });

      if (response) {
        await fetchUsers(); // Refresh the lists
      }
    } catch (error) {
      console.error("Error toggling admin status:", error);
    } finally {
      setProcessingUser(null);
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.studentId && user.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (isLoading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#0052cc]" />
          <p className="text-gray-500">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Users Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0052cc]">
          <Shield className="h-5 w-5" />
          Admin Users
        </h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Student ID</TableHead>
                    <TableHead className="font-semibold">Date Added</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.displayName}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.studentId || "N/A"}</TableCell>
                      <TableCell>
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleToggleAdmin(admin.email, true)}
                          disabled={processingUser === admin.email}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {processingUser === admin.email ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Remove Admin"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Users Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0052cc]">
            <Users className="h-5 w-5" />
            All Users
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-9 bg-white border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Student ID</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Joined Date</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.studentId || "N/A"}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge className="bg-yellow-400 text-[#0052cc]">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!user.isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleAdmin(user.email, false)}
                            disabled={processingUser === user.email}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            {processingUser === user.email ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Make Admin"
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 