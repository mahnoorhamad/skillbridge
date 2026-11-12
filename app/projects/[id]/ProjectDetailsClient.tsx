
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import Navbar from "../../../components/navbar";

interface Project {
  title: string;
  description: string;
  category: string;
  budget: number;
  clientEmail: string;
  status: string;
  createdAt?: {
    toDate: () => Date;
  };
}

export default function ProjectDetailsClient({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          setProject(projectSnap.data() as Project);
        } else {
          setError("Project not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load project details.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [projectId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navbar />
        <p className="p-10 text-center text-gray-700">
          Loading project details...
        </p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-3xl p-10 text-center">
          <p className="text-red-600">
            {error || "Project not found."}
          </p>

          <button
            onClick={() => router.push("/projects")}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            Back to Projects
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <button
          onClick={() => router.push("/projects")}
          className="mb-6 text-blue-600 hover:underline"
        >
          ← Back to Projects
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-700">
              {project.category}
            </span>

            <span className="rounded-full bg-green-100 px-4 py-2 text-sm text-green-700">
              {project.status}
            </span>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            {project.title}
          </h1>

          <p className="mb-8 whitespace-pre-wrap leading-7 text-gray-700">
            {project.description}
          </p>

          <div className="grid gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Project Budget</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                ${Number(project.budget).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Client Email</p>
              <p className="mt-1 font-medium text-gray-900">
                {project.clientEmail || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Posted On</p>
              <p className="mt-1 text-gray-900">
                {project.createdAt
                  ? project.createdAt.toDate().toLocaleDateString()
                  : "Date unavailable"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
