"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-blue-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md shrink-0">
      <Link href="/boards" className="font-bold text-lg tracking-tight hover:text-blue-200 transition-colors">
        NotTrello
      </Link>

      {session && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-200 hidden sm:block">
            {session.user?.name ?? session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
