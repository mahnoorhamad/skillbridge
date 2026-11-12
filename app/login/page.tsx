
"use client";

import { useState } from "react";
import {
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { getFirebaseAuthErrorMessage } from "../../lib/firebase-auth-errors";
import { useRouter } from "next/navigation";

const passwordResetSuccessMessage =
  "If an account exists for this address, a password reset email has been sent.";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      await reload(user);

      if (!user.emailVerified) {
        let verificationError: unknown;
        let verificationEmailSent = false;
        try {
          await sendEmailVerification(user);
          verificationEmailSent = true;
        } catch (error: unknown) {
          verificationError = error;
        }

        try {
          await signOut(auth);
        } catch {
          setMessage(
            verificationEmailSent
              ? "A verification email was sent, but we couldn't end this session. Please try signing out again."
              : "We couldn't send a verification email or end this session. Please try again."
          );
          return;
        }

        if (!verificationEmailSent) {
          setMessage(
            getFirebaseAuthErrorMessage(
              verificationError,
              "Unable to send a verification email. Try again later."
            )
          );
          return;
        }

        setMessage(
          "Your account is not verified. We sent a verification email; verify it before signing in again."
        );
        return;
      }

      await user.getIdToken(true);
      setMessage("Login successful!");
      router.push("/dashboard");
    } catch (error: unknown) {
      setMessage(
        getFirebaseAuthErrorMessage(
          error,
          "Unable to sign in. Check your details and try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const emailAddress = email.trim();
    setMessage("");

    if (!emailAddress) {
      setMessage("Enter your email address to reset your password.");
      return;
    }

    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, emailAddress);
      setMessage(passwordResetSuccessMessage);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "auth/user-not-found"
      ) {
        setMessage(passwordResetSuccessMessage);
      } else {
        setMessage(
          getFirebaseAuthErrorMessage(
            error,
            "Unable to send a password reset email. Try again later."
          )
        );
      }
    } finally {
      setResettingPassword(false);
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
          disabled={loading || resettingPassword}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={loading || resettingPassword}
          className="w-full text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
        >
          {resettingPassword ? "Sending reset email..." : "Forgot password?"}
        </button>

        {message && (
          <p role="status" className="break-word text-center text-sm">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
