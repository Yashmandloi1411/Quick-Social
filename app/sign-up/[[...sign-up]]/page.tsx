import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-[#0a0a0f]">
      <SignUp />
    </div>
  );
}
