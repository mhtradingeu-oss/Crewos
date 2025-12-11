import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ResetPasswordPlaceholderPage() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Reset password UI will be surfaced once the backend flow is ready.</p>
          <p>
            Already have a link? Use it from your email. Otherwise, request one from the {" "}
            <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">
              forgot password
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
