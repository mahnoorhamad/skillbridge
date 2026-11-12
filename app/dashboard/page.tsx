
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  name: string;
  email: string;
  role: "freelancer" | "client";
}

interface RecoveryAccount {
  uid: string;
  name: string;
  email: string;
}

const recoveryRoleKey = "skillbridge-registration-role";

function readUserProfile(data: Record<string, unknown>): UserProfile | null {
  if (
    typeof data.name !== "string" ||
    typeof data.email !== "string" ||
    (data.role !== "freelancer" && data.role !== "client")
  ) {
    return null;
  }

  return {
    name: data.name,
    email: data.email,
    role: data.role,
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [recoveryAccount, setRecoveryAccount] =
    useState<RecoveryAccount | null>(null);
  const [recoveryName, setRecoveryName] = useState("");
  const [recoveryRole, setRecoveryRole] = useState<
    UserProfile["role"] | ""
  >("");
  const [recoveredRole, setRecoveredRole] = useState(false);
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (active) {
        setLoading(true);
        setLoadError("");
        setProfile(null);
        setRecoveryAccount(null);
      }

      if (!user) {
        router.replace("/login");
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!active) {
          return;
        }

        if (userDoc.exists()) {
          const userProfile = readUserProfile(userDoc.data());
          if (userProfile) {
            setProfile(userProfile);
          } else {
            setLoadError(
              "Your account profile has invalid fields and cannot be recovered automatically."
            );
          }
        } else {
          let savedRole: string | null = null;
          try {
            savedRole = sessionStorage.getItem(recoveryRoleKey);
          } catch (storageError) {
            console.warn("Could not read the saved registration role:", storageError);
          }
          const validRole =
            savedRole === "freelancer" || savedRole === "client"
              ? savedRole
              : "";

          setRecoveryAccount({
            uid: user.uid,
            name: user.displayName ?? "",
            email: user.email ?? "",
          });
          setRecoveryName(user.displayName ?? "");
          setRecoveryRole(validRole);
          setRecoveredRole(validRole !== "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        if (active) {
          setLoadError(
            "Unable to check your account profile. Please retry before attempting recovery."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadAttempt, router]);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
    }
  };

  const handleProfileRecovery = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setRecoveryError("");
    setRecoveryMessage("");

    const user = auth.currentUser;
    const name = recoveryName.trim();
    const email = recoveryAccount?.email.trim() ?? "";

    if (!user || !recoveryAccount || user.uid !== recoveryAccount.uid) {
      setRecoveryError("Your sign-in session could not be verified. Sign in again.");
      return;
    }

    if (
      !name ||
      name.length > 120 ||
      !email ||
      email.length > 320 ||
      (recoveryRole !== "freelancer" && recoveryRole !== "client")
    ) {
      setRecoveryError("Enter a valid name and select an account type.");
      return;
    }

    setRecoverySaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const outcome = await runTransaction(db, async (transaction) => {
        const existingProfile = await transaction.get(userRef);
        if (existingProfile.exists()) {
          return {
            created: false,
            profile: readUserProfile(existingProfile.data()),
          };
        }

        transaction.set(userRef, {
          uid: user.uid,
          name,
          email,
          role: recoveryRole,
          createdAt: serverTimestamp(),
        });

        return {
          created: true,
          profile: { name, email, role: recoveryRole },
        };
      });

      if (!outcome.profile) {
        setRecoveryError(
          "An existing profile has invalid fields. Recovery did not change it; contact support."
        );
        return;
      }

      setProfile(outcome.profile);
      setRecoveryAccount(null);
      setRecoveryMessage(
        outcome.created
          ? "Your account profile was recovered successfully."
          : "An existing profile was found. It was not changed."
      );
      try {
        sessionStorage.removeItem(recoveryRoleKey);
      } catch (storageError) {
        console.warn("Could not clear the saved registration role:", storageError);
      }
    } catch (error) {
      console.error("Error recovering user profile:", error);
      setRecoveryError(
        "Profile recovery failed. Your existing account data was not intentionally overwritten; check your connection and Firestore rules."
      );
    } finally {
      setRecoverySaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900">
        <p className="text-lg font-medium">Loading dashboard...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900">
        <p role="alert" className="font-medium text-red-700">
          {loadError}
        </p>
        <button
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </main>
    );
  }

  if (recoveryAccount) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 sm:p-10">
        {logoutError && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {logoutError}
          </p>
        )}
        <form
          onSubmit={handleProfileRecovery}
          className="mx-auto w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-lg sm:p-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-950">
              Recover your account profile
            </h1>
            <p className="mt-2 text-gray-700">
              Your sign-in account exists, but its SkillBridge profile is
              missing. Recovery only creates a profile if one is still absent.
            </p>
          </div>

          {recoveryMessage && (
            <p role="status" className="rounded-lg bg-green-100 p-3 text-green-800">
              {recoveryMessage}
            </p>
          )}
          {recoveryError && (
            <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-700">
              {recoveryError}
            </p>
          )}

          <div>
            <label htmlFor="recovery-name" className="mb-2 block font-medium">
              Name
            </label>
            <input
              id="recovery-name"
              value={recoveryName}
              onChange={(event) => setRecoveryName(event.target.value)}
              maxLength={120}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="recovery-email" className="mb-2 block font-medium">
              Account email
            </label>
            <input
              id="recovery-email"
              type="email"
              value={recoveryAccount.email}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="recovery-role" className="mb-2 block font-medium">
              Account type
            </label>
            <select
              id="recovery-role"
              value={recoveryRole}
              onChange={(event) =>
                setRecoveryRole(
                  event.target.value === "freelancer" ||
                    event.target.value === "client"
                    ? event.target.value
                    : ""
                )
              }
              disabled={recoveredRole}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 disabled:bg-gray-100"
            >
              <option value="" disabled>
                Select your account type
              </option>
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
            {recoveredRole ? (
              <p className="mt-2 text-sm text-gray-600">
                Retained from your registration in this browser session.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                Your original selection was unavailable; choose your account
                type again.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={recoverySaving}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {recoverySaving ? "Recovering profile..." : "Recover profile"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900">
        <p className="font-medium">Could not load your profile.</p>
        {logoutError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {logoutError}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="mt-4 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
        >
          Logout
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        {recoveryMessage && (
          <p role="status" className="mb-6 rounded-lg bg-green-100 p-3 text-green-800">
            {recoveryMessage}
          </p>
        )}
        {logoutError && (
          <p role="alert" className="mb-6 text-sm text-red-700">
            {logoutError}
          </p>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-950">
            Dashboard
          </h1>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="text-2xl font-bold text-gray-950">
            Welcome, {profile.name}!
          </h2>

          <p className="text-base text-gray-800">
            Email: {profile.email}
          </p>

          <p className="text-base capitalize text-gray-800">
            Account type: {profile.role}
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="text-xl font-bold text-blue-950">
            {profile.role === "freelancer"
              ? "Freelancer Dashboard"
              : "Client Dashboard"}
          </h3>

          <p className="mt-2 leading-relaxed text-gray-800">
            {profile.role === "freelancer"
              ? "Your workspace for finding projects and submitting proposals."
              : "Your workspace for posting projects and hiring freelancers."}
          </p>
          {profile.role === "freelancer" && (
            <Link
              href="/freelancers/profile"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Manage Freelancer Profile
            </Link>
          )}
          {profile.role === "client" && (
            <Link
              href="/post-project"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Post a Project
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}
