import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapManager } from "./_components/MapManager";
import { PinManager } from "./_components/PinManager";
import { RouteManager } from "./_components/RouteManager";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  // Fetch all maps with relations for the dashboard
  const maps = await prisma.map.findMany({
    orderBy: { name: "asc" },
    include: {
      locationPins: true,
      routes: {
        include: {
          startLocation: true,
          endLocation: true,
          waypoints: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12">
        <header className="flex items-center gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Admin control</p>
            <h1 className="text-3xl font-semibold">Navigation workspace</h1>
            <p className="text-sm text-slate-400">
              Signed in as {session.user.username ?? session.user.email}
            </p>
          </div>
          <form action={handleSignOut} className="ml-auto">
            <button
              type="submit"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </header>

        <Tabs defaultValue="maps" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-white/10 p-1 rounded-full">
            <TabsTrigger value="maps" className="rounded-full px-6 data-[state=active]:bg-brand-500 data-[state=active]:text-white">Maps</TabsTrigger>
            <TabsTrigger value="locations" className="rounded-full px-6 data-[state=active]:bg-brand-500 data-[state=active]:text-white">Locations & Pins</TabsTrigger>
            <TabsTrigger value="routes" className="rounded-full px-6 data-[state=active]:bg-brand-500 data-[state=active]:text-white">Routes & Paths</TabsTrigger>
          </TabsList>

          <TabsContent value="maps" className="space-y-4 focus:outline-none">
            <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6">
              <MapManager maps={maps} />
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 focus:outline-none">
            <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6">
              <PinManager maps={maps} />
            </div>
          </TabsContent>

          <TabsContent value="routes" className="space-y-4 focus:outline-none">
            <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6">
              <RouteManager maps={maps} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
