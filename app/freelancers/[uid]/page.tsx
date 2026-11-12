"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "../../../components/navbar";
import { auth, db } from "../../../lib/firebase";

interface FreelancerProfile {
  uid: string;
  name: string;
  professionalTitle: string;
  bio: string;
  skills: string;
  experience: string;
  hourlyRate: number;
  portfolioUrl: string;
  githubUrl: string;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default function FreelancerPublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
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
        const profileSnapshot = await getDoc(
          doc(db, "publicFreelancerProfiles", uid)
        );

        if (!active) {
          return;
        }

        if (profileSnapshot.exists()) {
          setProfile({
            ...profileSnapshot.data(),
            uid: profileSnapshot.id,
          } as FreelancerProfile);
        } else {
          setError("Freelancer profile not found.");
        }
      } catch (loadError) {
        console.error("Error loading freelancer profile:", loadError);
        if (active) {
          setError("Unable to load this freelancer profile.");
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
  }, [router, uid]);

  const portfolioUrl = profile
    ? safeExternalUrl(profile.portfolioUrl)
    : null;
  const githubUrl = profile ? safeExternalUrl(profile.githubUrl) : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/freelancers"
          className="mb-6 inline-block text-blue-600 hover:underline"
        >
          ← Back to Freelancers
        </Link>

        {loading ? (
          <p className="py-12 text-center text-gray-700">
            Loading freelancer profile...
          </p>
        ) : error || !profile ? (
          <p role="alert" className="rounded-lg bg-red-100 p-5 text-red-700">
            {error || "Freelancer profile not found."}
          </p>
        ) : (
          <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
            <header className="border-b border-gray-200 pb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Freelancer
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {profile.name}
              </h1>
              <p className="mt-2 text-xl font-medium text-gray-700">
                {profile.professionalTitle}
              </p>
              <p className="mt-4 text-gray-600">
                {profile.experience} experience
              </p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                ${profile.hourlyRate}/hr
              </p>
            </header>

            <section className="mt-7">
              <h2 className="text-lg font-bold text-gray-900">About</h2>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-700">
                {profile.bio}
              </p>
            </section>

            <section className="mt-7">
              <h2 className="text-lg font-bold text-gray-900">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.split(",").map((skill) => skill.trim()).filter(Boolean).map(
                  (skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800"
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </section>

            {(portfolioUrl || githubUrl) && (
              <section className="mt-7 border-t border-gray-200 pt-6">
                <h2 className="text-lg font-bold text-gray-900">Links</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {portfolioUrl && (
                    <a
                      href={portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      Portfolio
                    </a>
                  )}
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </main>
  );
}
