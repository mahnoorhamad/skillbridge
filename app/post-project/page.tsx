
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

export default function PostProjectPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [budget, setBudget] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("User profile not found.");
          setLoading(false);
          return;
        }

        const userRole = userSnap.data().role;
        setRole(userRole);

        if (userRole !== "client") {
          setError("Only clients can post projects.");
        }
      } catch (err) {
        console.error(err);
        setError("Could not load your account.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    if (role !== "client") {
      setError("Only clients can post projects.");
      return;
    }

    if (!user.email) {
      setError("Your account needs an email address to post a project.");
      return;
    }

    if (!title.trim() || !description.trim() || !budget) {
      setError("Please fill in all fields.");
      return;
    }

    const budgetNumber = Number(budget);

    if (!Number.isFinite(budgetNumber) || budgetNumber <= 0) {
      setError("Please enter a valid budget greater than zero.");
      return;
    }

    try {
      setSubmitting(true);

      const projectRef = doc(collection(db, "projects"));
      const contactRef = doc(db, "projectContacts", projectRef.id);
      const batch = writeBatch(db);

      batch.set(projectRef, {
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budgetNumber,
        clientId: user.uid,
        status: "open",
        createdAt: serverTimestamp(),
      });
      batch.set(contactRef, {
        clientId: user.uid,
        clientEmail: user.email,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setMessage("Project posted successfully!");

      setTitle("");
      setDescription("");
      setCategory("Web Development");
      setBudget("");
    } catch (err) {
      console.error("Project posting error:", err);
      setError("Failed to post project. Please check your Firestore rules.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <p className="p-10 text-center text-gray-800">
          Loading...
        </p>
      </div>
    );
  }

  if (role !== "client") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Access Restricted
          </h1>
          <p className="mt-3 text-gray-700">
            Only client accounts can post projects.
          </p>
          {error && (
            <p className="mt-3 text-red-600">{error}</p>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Post a Project
          </h1>

          <p className="mt-2 text-gray-600">
            Describe your project and find the right freelancer.
          </p>

          {message && (
            <p className="mt-6 rounded-lg bg-green-100 p-3 text-green-800">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-6 rounded-lg bg-red-100 p-3 text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block font-medium text-gray-800">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build an ecommerce website"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-800">
                Project Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain your project requirements..."
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-800">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              >
                <option>Web Development</option>
                <option>Graphic Design</option>
                <option>AI & Machine Learning</option>
                <option>Digital Marketing</option>
                <option>Mobile App Development</option>
                <option>Content Writing</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-800">
                Budget (USD)
              </label>
              <input
                type="number"
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Posting Project..." : "Post Project"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
