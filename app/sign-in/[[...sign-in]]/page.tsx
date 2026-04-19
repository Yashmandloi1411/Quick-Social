import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-[#0a0a0f]">
      <SignIn />
    </div>
  );
}
