import { Navigate, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button, EmptyState, Spinner } from "@/components/ui/primitives";

export function ProtectedRoute({ children, requires }: { children: React.ReactNode; requires?: string[] }) {
  const { user, isLoading, hasAny } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requires && requires.length > 0 && !hasAny(...requires)) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          icon={<LockKeyhole className="size-8" />}
          title="You do not have access to this module"
          description="Your role does not include the permission required for this page. Ask a platform administrator to review your role if you believe this is wrong."
          action={
            <Button variant="secondary" onClick={() => history.back()}>
              Go back
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
