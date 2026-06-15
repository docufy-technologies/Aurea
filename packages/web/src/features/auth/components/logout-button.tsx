import { useLogoutMutation } from "../hooks/use-login";
import { Button } from "../../../components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LogoutButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function LogoutButton({
  className,
  variant = "outline",
}: LogoutButtonProps) {
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/login");
      },
    });
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      variant={variant}
      className={className}
    >
      {logoutMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
      ) : (
        <LogOut className="w-4 h-4 mr-1.5" />
      )}
      <span>{logoutMutation.isPending ? "Logging Out..." : "Sign Out"}</span>
    </Button>
  );
}
