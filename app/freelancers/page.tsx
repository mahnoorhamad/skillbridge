"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import Navbar from "../../components/navbar";
import { auth, db } from "../../lib/firebase";

interface FreelancerProfile {
  uid: string;
  name: string;
  professionalTitle: string;
  bio: string;
  skills: string;
  experience: string;
  hourlyRate: number;
}

export default function FreelancersPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<FreelancerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "publicFreelancerProfiles")
        );

        if (active) {
          setProfiles(
            snapshot.docs.map((profileDoc) => ({
              ...profileDoc.data(),
              uid: profileDoc.id,
            })) as FreelancerProfile[]
          );
        }
      } catch (loadError) {
        console.error("Error loading freelancer profiles:", loadError);
        if (active) {
          setError("Unable to load freelancer profiles. Please try again.");
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
  }, [router]);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return profiles;
    }

    return profiles.filter((profile) =>
      [profile.name, profile.professionalTitle, profile.skills]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [profiles, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Freelancers
          </h1>
          <p className="mt-2 text-gray-600">
            Browse skilled professionals and find the right fit for your work.
          </p>
        </div>

        <label htmlFor="freelancer-search" className="sr-only">
          Search freelancers
        </label>
        <input
          id="freelancer-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, title, or skills..."
          className="mb-8 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
        />

        {loading ? (
          <p className="py-12 text-center text-gray-700">
            Loading freelancer profiles...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-lg bg-red-100 p-5 text-red-700">
            {error}
          </p>
        ) : filteredProfiles.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {profiles.length === 0
                ? "No freelancer profiles yet"
                : "No freelancers found"}
            </h2>
            <p className="mt-2 text-gray-600">
              {profiles.length === 0
                ? "Freelancers can publish a profile from their dashboard."
                : "Try searching for a different name, title, or skill."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-600">
              Showing {filteredProfiles.length} freelancer(s)
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <article
                  key={profile.uid}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile.name}
                  </h2>
                  <p className="mt-1 font-medium text-blue-700">
                    {profile.professionalTitle}
                  </p>
                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-gray-600">
                    {profile.bio}
                  </p>
                  <p className="mt-4 text-sm text-gray-700">
                    <span className="font-semibold">Skills: </span>
                    {profile.skills}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-600">
                      {profile.experience}
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${profile.hourlyRate}/hr
                    </span>
                  </div>
                  <Link
                    href={`/freelancers/${profile.uid}`}
                    className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-center font-medium text-white transition hover:bg-blue-700"
                  >
                    View Profile
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
