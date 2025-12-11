import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ForgotPasswordForm />
            <p className="text-xs text-muted-foreground text-center">
              Remembered it? {" "}
              <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
