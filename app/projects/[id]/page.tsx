
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDocs,
  getDoc,
  query,
  runTransaction,
  serverTimestamp,
  collection,
  where,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import Navbar from "../../../components/navbar";

type UserRole = "freelancer" | "client";

function base64UrlUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function proposalDocumentId(projectId: string, freelancerId: string) {
  return `${base64UrlUtf8(projectId)}.${base64UrlUtf8(freelancerId)}`;
}

interface Project {
  title: string;
  description: string;
  category: string;
  budget: number;
  clientEmail?: string;
  clientId?: string;
  status: string;
  acceptedProposalId?: string;
  createdAt?: {
    toDate: () => Date;
  };
}

interface Proposal {
  id: string;
  freelancerEmail: string;
  coverLetter: string;
  proposedBudget: number;
  deliveryTime: string;
  status: string;
  createdAt?: {
    toDate: () => Date;
  };
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [clientContactEmail, setClientContactEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<string | null>(
    null
  );
  const [applicationChecked, setApplicationChecked] = useState(false);
  const [applicationError, setApplicationError] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedBudget, setProposedBudget] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState("");
  const [proposalActionError, setProposalActionError] = useState("");
  const [updatingProposalId, setUpdatingProposalId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError("");
      setApplicationError("");
      setApplicationMessage("");
      setApplicationStatus(null);
      setApplicationChecked(false);
      setProposals([]);
      setProposalsError("");
      setClientContactEmail("");

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!active) {
          return;
        }

        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as Project;
          setProject(projectData);
          if (projectData.clientId === user.uid) {
            try {
              const contactSnap = await getDoc(
                doc(db, "projectContacts", projectId)
              );

              if (!active) {
                return;
              }

              const contactEmail = contactSnap.exists()
                ? contactSnap.data().clientEmail
                : projectData.clientEmail;
              if (typeof contactEmail === "string") {
                setClientContactEmail(contactEmail);
              }
            } catch (contactError) {
              console.error("Error loading project contact:", contactError);
              if (typeof projectData.clientEmail === "string") {
                setClientContactEmail(projectData.clientEmail);
              }
            }
          }

          try {
            const profileSnap = await getDoc(doc(db, "users", user.uid));

            if (!active) {
              return;
            }

            if (!profileSnap.exists()) {
              setApplicationError("Your user profile could not be verified.");
              setApplicationChecked(true);
              return;
            }

            const userRole = profileSnap.data().role;

            if (userRole !== "freelancer" && userRole !== "client") {
              setApplicationError("Your account role could not be verified.");
              setApplicationChecked(true);
              return;
            }

            setRole(userRole);

            if (userRole === "freelancer") {
              const proposalRef = doc(
                db,
                "proposals",
                proposalDocumentId(projectId, user.uid)
              );

              try {
                const proposalSnap = await getDoc(proposalRef);

                if (!active) {
                  return;
                }

                if (proposalSnap.exists()) {
                  const status = proposalSnap.data().status;
                  setApplicationStatus(
                    typeof status === "string" ? status : "unavailable"
                  );
                }

                setApplicationChecked(true);
              } catch (proposalErr) {
                console.error("Error checking existing proposal:", proposalErr);
                setApplicationError(
                  "Unable to check your application status. Please try again later."
                );
                setApplicationChecked(true);
              }
            } else if (projectData.clientId === user.uid) {
              setProposalsLoading(true);

              try {
                const proposalsQuery = query(
                  collection(db, "proposals"),
                  where("projectId", "==", projectId)
                );
                const proposalsSnapshot = await getDocs(proposalsQuery);

                if (!active) {
                  return;
                }

                const projectProposals = proposalsSnapshot.docs.map(
                  (proposalDoc) => ({
                    id: proposalDoc.id,
                    ...proposalDoc.data(),
                  }) as Proposal
                );

                projectProposals.sort(
                  (first, second) =>
                    (second.createdAt?.toDate().getTime() ?? 0) -
                    (first.createdAt?.toDate().getTime() ?? 0)
                );
                setProposals(projectProposals);
              } catch (proposalErr) {
                console.error("Error loading project proposals:", proposalErr);
                setProposalsError(
                  "Unable to load proposals for this project."
                );
              } finally {
                if (active) {
                  setProposalsLoading(false);
                }
              }
            }
          } catch (profileErr) {
            console.error("Error verifying user profile:", profileErr);
            setApplicationError(
              "Unable to verify your account role. Please try again later."
            );
            setApplicationChecked(true);
          }
        } else {
          setError("Project not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load project details.");
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
  }, [projectId, router]);

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplicationError("");
    setApplicationMessage("");

    const user = auth.currentUser;

    if (!user || user.uid !== userId) {
      router.push("/login");
      return;
    }

    if (!user.email) {
      setApplicationError(
        "Your account must have a verified email address to submit a proposal."
      );
      return;
    }

    if (
      role !== "freelancer" ||
      !project ||
      !project.clientId ||
      project.clientId === user.uid ||
      project.status !== "open"
    ) {
      setApplicationError("You are not eligible to apply for this project.");
      return;
    }

    const normalizedCoverLetter = coverLetter.trim();
    const normalizedDeliveryTime = deliveryTime.trim();
    const budget = Number(proposedBudget);

    if (
      !normalizedCoverLetter ||
      normalizedCoverLetter.length > 5000 ||
      !normalizedDeliveryTime ||
      normalizedDeliveryTime.length > 100 ||
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      setApplicationError("Please enter valid proposal details.");
      return;
    }

    const proposalRef = doc(
      db,
      "proposals",
      proposalDocumentId(projectId, user.uid)
    );

    try {
      setSubmitting(true);

      const result = await runTransaction(db, async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        const projectSnap = await transaction.get(doc(db, "projects", projectId));

        if (proposalSnap.exists()) {
          const status = proposalSnap.data().status;
          return {
            created: false,
            status: typeof status === "string" ? status : "unavailable",
            closed: false,
          };
        }

        if (
          !projectSnap.exists() ||
          projectSnap.data().status !== "open" ||
          projectSnap.data().acceptedProposalId !== undefined
        ) {
          return {
            created: false,
            status: null,
            closed: true,
            acceptedProposalId: projectSnap.data()?.acceptedProposalId,
          };
        }

        transaction.set(proposalRef, {
          projectId,
          freelancerId: user.uid,
          freelancerEmail: user.email,
          coverLetter: normalizedCoverLetter,
          proposedBudget: budget,
          deliveryTime: normalizedDeliveryTime,
          status: "pending",
          createdAt: serverTimestamp(),
        });

        return { created: true, status: "pending", closed: false };
      });

      setApplicationStatus(result.status);
      setApplicationChecked(true);
      if (result.closed) {
        setProject((current) =>
          current
            ? {
                ...current,
                status: "closed",
                acceptedProposalId: result.acceptedProposalId,
              }
            : current
        );
      }
      setApplicationMessage(
        result.closed
          ? "Applications are closed for this project."
          : result.created
            ? "Your proposal was submitted successfully."
            : "You have already applied for this project."
      );
    } catch (err) {
      console.error("Error submitting proposal:", err);
      setApplicationError(
        "Unable to submit your proposal. Please try again after the required Firestore rules are deployed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProposalDecision = async (
    proposal: Proposal,
    status: "accepted" | "rejected"
  ) => {
    setProposalActionError("");

    const user = auth.currentUser;

    if (!user || user.uid !== userId) {
      router.push("/login");
      return;
    }

    if (
      role !== "client" ||
      project?.clientId !== user.uid ||
      proposal.status !== "pending"
    ) {
      setProposalActionError(
        "Only the project owner can decide a pending proposal."
      );
      return;
    }

    const proposalRef = doc(db, "proposals", proposal.id);
    const projectRef = doc(db, "projects", projectId);

    try {
      setUpdatingProposalId(proposal.id);

      const result = await runTransaction(db, async (transaction) => {
        const proposalSnapshot = await transaction.get(proposalRef);
        const projectSnapshot = await transaction.get(projectRef);

        if (!proposalSnapshot.exists() || !projectSnapshot.exists()) {
          return "not-found" as const;
        }

        const currentProposal = proposalSnapshot.data();
        const currentProject = projectSnapshot.data();

        if (
          currentProposal.projectId !== projectId ||
          currentProposal.status !== "pending"
        ) {
          return "no-longer-pending" as const;
        }

        if (currentProject.clientId !== user.uid) {
          return "not-owner" as const;
        }

        if (
          status === "accepted" &&
          currentProject.status !== "open"
        ) {
          return "project-closed" as const;
        }

        if (
          status === "accepted" &&
          typeof currentProject.acceptedProposalId === "string"
        ) {
          return "already-accepted" as const;
        }

        transaction.update(proposalRef, { status });

        if (status === "accepted") {
          transaction.update(projectRef, {
            status: "closed",
            acceptedProposalId: proposal.id,
          });
        }

        return "updated" as const;
      });

      if (result !== "updated") {
        setProposalActionError(
          result === "already-accepted"
            ? "A proposal has already been accepted for this project."
            : result === "project-closed"
              ? "This project is closed and cannot accept another proposal."
              : result === "no-longer-pending"
              ? "This proposal is no longer pending."
              : result === "not-owner"
                ? "Only the project owner can decide this proposal."
                : "The proposal or project could not be found."
        );
        return;
      }

      setProposals((current) =>
        current.map((item) =>
          item.id === proposal.id ? { ...item, status } : item
        )
      );

      if (status === "accepted") {
        setProject((current) =>
          current
            ? {
                ...current,
                status: "closed",
                acceptedProposalId: proposal.id,
              }
            : current
        );
      }
    } catch (decisionError) {
      console.error("Error updating proposal status:", decisionError);
      setProposalActionError(
        "Unable to update this proposal. Check the Firestore rules and try again."
      );
    } finally {
      setUpdatingProposalId(null);
    }
  };

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
          <p className="text-red-600">{error || "Project not found."}</p>
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

            <span
              className={`rounded-full px-4 py-2 text-sm capitalize ${
                project.status === "open"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
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

            {project.clientId === userId && clientContactEmail && (
              <div>
                <p className="text-sm text-gray-500">Your contact email</p>
                <p className="mt-1 font-medium text-gray-900">
                  {clientContactEmail}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">Posted On</p>
              <p className="mt-1 text-gray-900">
                {project.createdAt
                  ? project.createdAt.toDate().toLocaleDateString()
                  : "Date unavailable"}
              </p>
            </div>
          </div>

          {role === "client" && project.clientId === userId && (
            <section className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900">
                Project Proposals
              </h2>
              <p className="mt-2 text-gray-600">
                You posted this project and cannot apply to it.
              </p>

              {proposalsLoading ? (
                <p className="mt-5 text-gray-600">Loading proposals...</p>
              ) : proposalsError ? (
                <p
                  role="alert"
                  className="mt-5 rounded-lg bg-red-100 p-3 text-red-700"
                >
                  {proposalsError}
                </p>
              ) : proposals.length === 0 ? (
                <p className="mt-5 text-gray-600">
                  No proposals have been submitted yet.
                </p>
              ) : (
                <>
                  {proposalActionError && (
                    <p
                      role="alert"
                      className="mt-5 rounded-lg bg-red-100 p-3 text-red-700"
                    >
                      {proposalActionError}
                    </p>
                  )}
                  {project.status === "closed" && (
                    <p className="mt-5 rounded-lg bg-green-50 p-3 text-green-800">
                      This project is closed. No more proposals can be
                      accepted.
                    </p>
                  )}
                  <div className="mt-5 space-y-4">
                  {proposals.map((proposal) => (
                    <article
                      key={proposal.id}
                      className="rounded-xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <a
                          href={`mailto:${proposal.freelancerEmail}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {proposal.freelancerEmail}
                        </a>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                            proposal.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : proposal.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {proposal.status}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-gray-700">
                        {proposal.coverLetter}
                      </p>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-gray-500">Proposed budget</dt>
                          <dd className="font-semibold text-gray-900">
                            ${Number(proposal.proposedBudget).toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Delivery time</dt>
                          <dd className="font-semibold text-gray-900">
                            {proposal.deliveryTime}
                          </dd>
                        </div>
                      </dl>

                      {proposal.createdAt && (
                        <p className="mt-4 text-xs text-gray-500">
                          Submitted{" "}
                          {proposal.createdAt.toDate().toLocaleDateString()}
                        </p>
                      )}

                      {proposal.status === "pending" && (
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void handleProposalDecision(proposal, "accepted")
                            }
                            disabled={
                              updatingProposalId !== null ||
                              project.status !== "open" ||
                              project.acceptedProposalId !== undefined
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingProposalId === proposal.id
                              ? "Updating..."
                              : "Accept"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleProposalDecision(proposal, "rejected")
                            }
                            disabled={updatingProposalId !== null}
                            className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingProposalId === proposal.id
                              ? "Updating..."
                              : "Reject"}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  </div>
                </>
              )}
            </section>
          )}

          {role === "freelancer" && (
            <section className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900">
                Apply for Project
              </h2>

              {applicationMessage && (
                <p className="mt-4 rounded-lg bg-green-100 p-3 text-green-800">
                  {applicationMessage}
                </p>
              )}

              {applicationError && (
                <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
                  {applicationError}
                </p>
              )}

              {project.status !== "open" && (
                <p className="mt-4 rounded-lg bg-gray-100 p-4 text-gray-700">
                  Applications are closed for this project.
                </p>
              )}

              {applicationStatus ? (
                <p className="mt-4 rounded-lg bg-blue-50 p-4 text-blue-900">
                  Your application status:{" "}
                  <span className="font-semibold">{applicationStatus}</span>
                </p>
              ) : project.clientId === userId ? (
                <p className="mt-4 text-gray-700">
                  You cannot apply to your own project.
                </p>
              ) : project.status !== "open" ? (
                null
              ) : !applicationChecked ? (
                <p className="mt-4 text-gray-600">
                  Checking your application status...
                </p>
              ) : applicationError ? null : !project.clientId ? (
                <p className="mt-4 text-gray-700">
                  Applications are unavailable because this project has no
                  verified owner.
                </p>
              ) : (
                <form onSubmit={handleApply} className="mt-5 space-y-5">
                  <div>
                    <label
                      htmlFor="cover-letter"
                      className="mb-2 block font-medium text-gray-800"
                    >
                      Cover letter
                    </label>
                    <textarea
                      id="cover-letter"
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                      rows={5}
                      maxLength={5000}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                      placeholder="Explain why you are a good fit for this project."
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="proposed-budget"
                      className="mb-2 block font-medium text-gray-800"
                    >
                      Proposed budget (USD)
                    </label>
                    <input
                      id="proposed-budget"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={proposedBudget}
                      onChange={(event) =>
                        setProposedBudget(event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                      placeholder="e.g. 500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="delivery-time"
                      className="mb-2 block font-medium text-gray-800"
                    >
                      Estimated delivery time
                    </label>
                    <input
                      id="delivery-time"
                      type="text"
                      value={deliveryTime}
                      onChange={(event) => setDeliveryTime(event.target.value)}
                      maxLength={100}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                      placeholder="e.g. 2 weeks"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !applicationChecked}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting Proposal..." : "Submit Proposal"}
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
