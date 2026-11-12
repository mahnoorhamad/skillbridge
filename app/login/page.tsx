
"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      setMessage("Login successful!");

      router.push("/dashboard");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6 text-gray-900">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-center text-3xl font-bold">Welcome Back</h1>

        <input
          type="email"
          placeholder="Email address"
          className="w-full rounded-lg border p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full rounded-lg border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && (
          <p className="break-word text-center text-sm">{message}</p>
        )}
      </form>
    </main>
  );
}
