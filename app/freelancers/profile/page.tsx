"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import Navbar from "../../../components/navbar";
import { auth, db } from "../../../lib/firebase";

interface ProfileForm {
  name: string;
  professionalTitle: string;
  bio: string;
  skills: string;
  experience: string;
  hourlyRate: string;
  portfolioUrl: string;
  githubUrl: string;
}

const emptyProfile: ProfileForm = {
  name: "",
  professionalTitle: "",
  bio: "",
  skills: "",
  experience: "",
  hourlyRate: "",
  portfolioUrl: "",
  githubUrl: "",
};

export default function FreelancerProfileEditorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUid(user.uid);
      setError("");

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!userSnapshot.exists() || userSnapshot.data().role !== "freelancer") {
          if (active) {
            setError("Only freelancer accounts can manage a freelancer profile.");
            setLoading(false);
          }
          return;
        }

        if (active) {
          setIsFreelancer(true);
        }

        const profileSnapshot = await getDoc(
          doc(db, "publicFreelancerProfiles", user.uid)
        );

        if (active) {
          setProfile({
            ...emptyProfile,
            name: userSnapshot.data().name,
            ...(profileSnapshot.exists()
              ? {
                  ...profileSnapshot.data(),
                  hourlyRate: String(profileSnapshot.data().hourlyRate ?? ""),
                }
              : {}),
          } as ProfileForm);
          setIsExisting(profileSnapshot.exists());
        }
      } catch (loadError) {
        console.error("Error loading freelancer profile:", loadError);
        if (active) {
          setError("Unable to load your profile. Please try again.");
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

  const updateField = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const user = auth.currentUser;
    const hourlyRate = Number(profile.hourlyRate);
    const portfolioUrl = profile.portfolioUrl.trim();
    const githubUrl = profile.githubUrl.trim();

    if (!user || user.uid !== uid) {
      router.replace("/login");
      return;
    }

    if (
      !profile.professionalTitle.trim() ||
      profile.professionalTitle.trim().length > 120 ||
      !profile.bio.trim() ||
      profile.bio.trim().length > 5000 ||
      !profile.skills.trim() ||
      profile.skills.trim().length > 1000 ||
      !profile.experience.trim() ||
      profile.experience.trim().length > 500 ||
      !Number.isFinite(hourlyRate) ||
      hourlyRate <= 0 ||
      hourlyRate > 100000
    ) {
      setError("Please enter valid profile details and an hourly rate.");
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, "publicFreelancerProfiles", user.uid),
        {
          uid: user.uid,
          name: profile.name,
          professionalTitle: profile.professionalTitle.trim(),
          bio: profile.bio.trim(),
          skills: profile.skills.trim(),
          experience: profile.experience.trim(),
          hourlyRate,
          portfolioUrl,
          githubUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setIsExisting(true);
      setMessage("Your freelancer profile has been saved.");
    } catch (saveError) {
      console.error("Error saving freelancer profile:", saveError);
      setError("Unable to save your profile. Check your connection and rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isExisting ? "Edit Freelancer Profile" : "Create Freelancer Profile"}
            </h1>
            <p className="mt-2 text-gray-600">
              Share your professional details with SkillBridge clients.
            </p>
          </div>
          {isExisting && (
            <Link
              href={`/freelancers/${uid}`}
              className="font-medium text-blue-700 hover:underline"
            >
              View public profile
            </Link>
          )}
        </div>

        {loading ? (
          <p className="text-gray-700">Loading your profile...</p>
        ) : !isFreelancer ? (
          <p role="alert" className="rounded-lg bg-red-100 p-4 text-red-700">
            {error || "Only freelancer accounts can manage a freelancer profile."}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
          >
            {error && (
              <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-lg bg-green-100 p-3 text-green-800">
                {message}
              </p>
            )}

            <div>
              <label htmlFor="profile-name" className="mb-2 block font-medium text-gray-800">
                Name
              </label>
              <input
                id="profile-name"
                value={profile.name}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-700"
              />
            </div>

            <div>
              <label htmlFor="professional-title" className="mb-2 block font-medium text-gray-800">
                Professional title
              </label>
              <input
                id="professional-title"
                value={profile.professionalTitle}
                onChange={(event) => updateField("professionalTitle", event.target.value)}
                maxLength={120}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="e.g. Frontend Developer"
              />
            </div>

            <div>
              <label htmlFor="profile-bio" className="mb-2 block font-medium text-gray-800">
                Professional bio
              </label>
              <textarea
                id="profile-bio"
                value={profile.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                rows={5}
                maxLength={5000}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="Describe your experience and the work you do."
              />
            </div>

            <div>
              <label htmlFor="profile-skills" className="mb-2 block font-medium text-gray-800">
                Skills (comma-separated)
              </label>
              <input
                id="profile-skills"
                value={profile.skills}
                onChange={(event) => updateField("skills", event.target.value)}
                maxLength={1000}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="React, TypeScript, UI design"
              />
            </div>

            <div>
              <label htmlFor="profile-experience" className="mb-2 block font-medium text-gray-800">
                Experience
              </label>
              <input
                id="profile-experience"
                value={profile.experience}
                onChange={(event) => updateField("experience", event.target.value)}
                maxLength={500}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="e.g. 5 years"
              />
            </div>

            <div>
              <label htmlFor="hourly-rate" className="mb-2 block font-medium text-gray-800">
                Hourly rate (USD)
              </label>
              <input
                id="hourly-rate"
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                value={profile.hourlyRate}
                onChange={(event) => updateField("hourlyRate", event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label htmlFor="portfolio-url" className="mb-2 block font-medium text-gray-800">
                Portfolio URL (optional)
              </label>
              <input
                id="portfolio-url"
                type="url"
                value={profile.portfolioUrl}
                onChange={(event) => updateField("portfolioUrl", event.target.value)}
                maxLength={2048}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="github-url" className="mb-2 block font-medium text-gray-800">
                GitHub URL (optional)
              </label>
              <input
                id="github-url"
                type="url"
                value={profile.githubUrl}
                onChange={(event) => updateField("githubUrl", event.target.value)}
                maxLength={2048}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="https://github.com/username"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
