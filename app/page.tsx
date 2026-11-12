
import Navbar from "../components/navbar";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-blue-50 px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 font-semibold uppercase tracking-wider text-blue-600">
            Welcome to SkillBridge
          </p>

          <h1 className="text-4xl font-extrabold leading-tight text-gray-950 md:text-6xl">
            Find the Right Talent.
            <span className="block text-blue-600">
              Build Your Future.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
            Connect with talented freelancers, discover exciting projects,
            and grow your career with the power of AI.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Get Started
            </Link>

            <Link
              href="/projects"
              className="rounded-lg border border-gray-300 bg-white px-7 py-3 font-semibold text-gray-800 hover:bg-gray-100"
            >
              Explore Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-950">
          Explore Popular Categories
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Web Development",
            "Graphic Design",
            "AI & Machine Learning",
            "Digital Marketing",
          ].map((category) => (
            <div
              key={category}
              className="rounded-xl border border-gray-200 p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="font-bold text-gray-900">{category}</h3>
              <p className="mt-2 text-sm text-gray-600">
                Explore opportunities and talent.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gray-950 px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-white">
          Ready to start your journey?
        </h2>

        <p className="mt-4 text-gray-300">
          Join SkillBridge and turn your skills into opportunities.
        </p>

        <Link
          href="/register"
          className="mt-7 inline-block rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Join SkillBridge
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 px-6 py-6 text-center text-sm text-gray-600">
        © 2026 SkillBridge. All rights reserved.
      </footer>
    </main>
  );
}
