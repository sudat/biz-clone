import { Button } from "@/components/ui/button";
import { BarChart3, FileText } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="py-8">
      {/* ヒーローセクション */}
      <div className="text-center space-y-12 mb-20">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Biz Clone 会計システム
          </h1>
          <p className="mx-auto max-w-[700px] text-xl text-muted-foreground leading-relaxed">
            シンプルな会計システム
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Link href="/siwake/new">
            <Button
              size="lg"
              className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <FileText className="h-5 w-5" />
              仕訳を作成する
            </Button>
          </Link>
          <Link href="/siwake">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <BarChart3 className="h-5 w-5" />
              仕訳を確認する
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
