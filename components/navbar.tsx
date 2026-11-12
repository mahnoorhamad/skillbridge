
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(!!currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await signOut(auth);
      setUser(false);
      router.push("/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
    }
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        <Link href="/" className="text-2xl font-bold text-blue-700">
          SkillBridge
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-gray-700 hover:text-blue-600">
            Home
          </Link>

          <Link href="/projects" className="text-gray-700 hover:text-blue-600">
            Find Projects
          </Link>

          <Link href="/freelancers" className="text-gray-700 hover:text-blue-600">
            Find Freelancers
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Join Now
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-2xl text-gray-800 md:hidden"
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </div>

      {logoutError && (
        <p role="alert" className="px-6 pb-3 text-sm text-red-700">
          {logoutError}
        </p>
      )}

      {menuOpen && (
        <div className="space-y-4 border-t border-gray-200 bg-white p-6 md:hidden">
          <Link href="/" className="block text-gray-800" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          <Link href="/projects" className="block text-gray-800" onClick={() => setMenuOpen(false)}>
            Find Projects
          </Link>

          <Link href="/freelancers" className="block text-gray-800" onClick={() => setMenuOpen(false)}>
            Find Freelancers
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className="block text-gray-800" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="font-medium text-red-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-gray-800" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link href="/register" className="block font-semibold text-blue-600" onClick={() => setMenuOpen(false)}>
                Join Now
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
