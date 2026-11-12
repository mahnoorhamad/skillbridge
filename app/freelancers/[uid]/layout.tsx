import { Suspense, type ReactNode } from "react";
import Navbar from "../../../components/navbar";

export default function FreelancerProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50">
          <Navbar />
          <p className="p-10 text-center text-gray-700">
            Loading freelancer profile...
          </p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
