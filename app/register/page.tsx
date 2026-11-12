
"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { auth, db } from "../../lib/firebase";

const recoveryRoleKey = "skillbridge-registration-role";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("freelancer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setRecoveryAvailable(false);
    let createdUser = false;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      createdUser = true;
      try {
        sessionStorage.setItem(recoveryRoleKey, role);
      } catch (storageError) {
        console.warn("Could not save the selected registration role:", storageError);
      }

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: serverTimestamp(),
      });
      try {
        sessionStorage.removeItem(recoveryRoleKey);
      } catch (storageError) {
        console.warn("Could not clear the saved registration role:", storageError);
      }
      setName("");
      setEmail("");
      setPassword("");
      setRole("freelancer");
      setMessage("Account created successfully! You can continue to your dashboard.");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed.";
      setMessage(errorMessage);
      setRecoveryAvailable(createdUser && !!auth.currentUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6 text-gray-900">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-3xl font-bold text-center">
          Create Account
        </h1>

        <input
          className="w-full rounded-lg border p-3"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border p-3"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded-lg border p-3"
          type="password"
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <select
          className="w-full rounded-lg border p-3"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="freelancer">I am a Freelancer</option>
          <option value="client">I am a Client</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        {message && (
          <p className="break-word text-center text-sm">{message}</p>
        )}
        {recoveryAvailable && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-amber-800">
              Your sign-in account was created, but its profile may need
              recovery.
            </p>
            <Link
              href="/dashboard"
              className="inline-block font-semibold text-blue-700 hover:underline"
            >
              Continue to dashboard recovery
            </Link>
          </div>
        )}
        {message.startsWith("Account created successfully") && (
          <Link
            href="/dashboard"
            className="block text-center font-semibold text-blue-700 hover:underline"
          >
            Go to dashboard
          </Link>
        )}
      </form>
    </main>
  );
}
