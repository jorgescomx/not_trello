"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();
  const initial = (session?.user?.name ?? session?.user?.email ?? "?")[0].toUpperCase();

  return (
    <header className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 border-b border-white/5 shadow-md">
      <Link
        href="/boards"
        className="font-bold text-sm tracking-tight hover:text-slate-300 transition-colors flex items-center gap-2.5"
      >
        <span className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-black shadow-sm select-none">
          N
        </span>
        NotTrello
      </Link>

      {session && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-semibold select-none shadow-sm">
              {initial}
            </div>
            <span className="text-sm text-slate-400 font-medium max-w-[160px] truncate">
              {session.user?.name ?? session.user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all font-medium"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
