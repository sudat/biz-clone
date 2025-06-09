import { Header } from "@/components/layout/header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Biz Clone 会計システム
            </h1>
            <p className="mx-auto max-w-[600px] text-lg text-muted-foreground">
              Next.js + Supabase + Prisma + Shadcn/UI で構築された
              <br />
              現代的な会計システム
            </p>
          </div>

          <div className="pt-8">
            <p className="text-muted-foreground">
              上部のメニューから各機能にアクセスできます
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
