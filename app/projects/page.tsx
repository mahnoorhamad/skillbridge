
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  clientId: string;
  status: string;
  createdAt?: {
    toDate: () => Date;
  } | null;
}

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(collection(db, "projects"));

        const projectList = snapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        } as Project));

        projectList.sort((a, b) => {
          const dateA = a.createdAt?.toDate().getTime() || 0;
          const dateB = b.createdAt?.toDate().getTime() || 0;
          return dateB - dateA;
        });

        setProjects(projectList);
      } catch (err) {
        console.error("Error loading projects:", err);
        setError("Unable to load projects. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const categories = [
    "All",
    "Web Development",
    "Graphic Design",
    "AI & Machine Learning",
    "Digital Marketing",
    "Mobile App Development",
    "Content Writing",
  ];

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      project.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Projects
          </h1>
          <p className="mt-2 text-gray-600">
            Discover opportunities and find your next project on SkillBridge.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-12 text-center text-gray-700">
            Loading projects...
          </p>
        ) : error ? (
          <div className="rounded-lg bg-red-100 p-5 text-center text-red-700">
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              No projects found
            </h2>
            <p className="mt-2 text-gray-600">
              Try another search or category.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-600">
              Showing {filteredProjects.length} project(s)
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <article
                  key={project.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {project.category}
                    </span>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {project.status}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900">
                    {project.title}
                  </h2>

                  <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-gray-600">
                    {project.description}
                  </p>

                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500">
                      Project Budget
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      ${project.budget}
                    </p>

                    {project.createdAt && (
                      <p className="mt-2 text-xs text-gray-500">
                        Posted:{" "}
                        {project.createdAt.toDate().toLocaleDateString()}
                      </p>
                    )}

                    <button
                      onClick={() =>
                        router.push(`/projects/${project.id}`)
                      }
                      className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
