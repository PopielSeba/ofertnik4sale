import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if error is due to pending approval
  const needsApproval = error && (error as any).message?.includes("Account pending approval");
  
  // If user is pending approval, return user data from error response
  const pendingUser = needsApproval ? (error as any).user : null;

  return {
    user: user || pendingUser,
    isLoading,
    isAuthenticated: !!user || needsApproval,
    needsApproval,
    isApproved: (user || pendingUser)?.isApproved ?? false,
  };
}
