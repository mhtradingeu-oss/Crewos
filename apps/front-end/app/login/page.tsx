import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <LoginForm />
            <p className="text-xs text-muted-foreground text-center">
              <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">
                Forgot your password?
              </Link>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              New to MH-OS? {" "}
              <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
