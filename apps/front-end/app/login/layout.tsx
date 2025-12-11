import AuthLayout from "@/app/(auth)/auth/layout";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
