import Link from "next/link";
import { SiHiLogo } from "@/components/shared/sihi-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-fuchsia-600/8 blur-[100px]" />
      </div>

      <Link href="/" className="relative z-10 mb-8">
        <SiHiLogo iconSize={40} textSize="1.875rem" />
      </Link>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
