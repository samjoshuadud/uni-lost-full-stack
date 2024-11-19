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
  const [processingUser, setProcessingUser] = useState(null); // Track which user is being processed

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Loading User Management...
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Management
        </h3>
      </div>

      {/* Admin Users Section */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            Admin Users
          </h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.displayName}</TableCell>
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

      {/* All Users Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              All Users
            </h4>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.studentId || "N/A"}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="default">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
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
  );
} 