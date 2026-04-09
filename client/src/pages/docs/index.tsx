import { useState, useMemo, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Search, ChevronDown, ChevronRight, Menu, X, ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getSections,
  getArticle,
  getAdjacentArticles,
  ALL_ARTICLES,
  type DocSection,
  type DocArticle,
} from "@/lib/docs-content";

function DocsHome() {
  const sections = getSections();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-foreground">NistaGPS Documentation</h1>
      <p className="text-muted-foreground text-lg mb-8">
        Everything you need to set up, manage, and get the most from your GPS fleet tracker.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.id} href={`/docs/${section.articles[0]?.slug ?? ""}`}>
            <div className="border border-border rounded-md p-5 hover-elevate cursor-pointer h-full">
              <h2 className="font-semibold text-foreground mb-1">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.articles.length} article{section.articles.length !== 1 ? "s" : ""}
              </p>
              <ul className="mt-3 space-y-0.5">
                {section.articles.slice(0, 3).map((a) => (
                  <li key={a.slug} className="text-sm text-muted-foreground truncate">
                    &rarr; {a.title}
                  </li>
                ))}
                {section.articles.length > 3 && (
                  <li className="text-sm text-muted-foreground">
                    +{section.articles.length - 3} more…
                  </li>
                )}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArticleView({ slug }: { slug: string }) {
  const article = getArticle(slug);
  const { prev, next } = getAdjacentArticles(slug);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!article) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Article not found.</p>
        <Link href="/docs">
          <Button variant="outline" className="mt-4">Back to Docs Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-foreground">{article.title}</h1>
      <div className="prose-content">{article.content}</div>

      {/* Prev / Next navigation */}
      <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-3 justify-between">
        {prev ? (
          <Link href={`/docs/${prev.slug}`}>
            <Button variant="outline" className="flex items-center gap-2" data-testid={`btn-prev-article`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="max-w-xs truncate">{prev.title}</span>
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`}>
            <Button variant="outline" className="flex items-center gap-2" data-testid={`btn-next-article`}>
              <span className="max-w-xs truncate">{next.title}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function SectionNav({
  section,
  currentSlug,
  onNav,
  defaultOpen,
}: {
  section: DocSection;
  currentSlug: string | null;
  onNav?: () => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
        data-testid={`btn-section-${section.id}`}
      >
        <span>{section.title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <div className={open ? "mt-0.5 mb-1" : "hidden"}>
        {section.articles.map((article) => (
          <Link key={article.slug} href={`/docs/${article.slug}`}>
            <div
              className={`px-3 py-1 rounded-md text-sm cursor-pointer leading-snug ${
                article.slug === currentSlug
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover-elevate"
              }`}
              onClick={onNav}
              data-testid={`link-article-${article.slug}`}
            >
              {article.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({
  query,
  onQueryChange,
  currentSlug,
  onNav,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  currentSlug: string | null;
  onNav?: () => void;
}) {
  const sections = getSections();

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return ALL_ARTICLES.filter((a) => a.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border/40 flex items-center gap-2 shrink-0">
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <Link href="/home">
          <span className="font-bold text-foreground text-sm">NistaGPS</span>
        </Link>
        <span className="text-muted-foreground text-xs ml-1">Docs</span>
      </div>

      {/* Search */}
      <div className="px-3 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
            data-testid="input-docs-search"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pb-6 px-2">
        {/* Docs home link */}
        <Link href="/docs">
          <div
            className={`px-3 py-1.5 rounded-md text-sm cursor-pointer mb-1 ${
              !currentSlug ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover-elevate"
            }`}
            onClick={onNav}
            data-testid="link-docs-home"
          >
            Overview
          </div>
        </Link>

        {/* Filtered search results */}
        {filtered !== null ? (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground px-3 mb-1 uppercase tracking-wide">
              Results ({filtered.length})
            </p>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-2">No articles match.</p>
            ) : (
              filtered.map((a) => (
                <Link key={a.slug} href={`/docs/${a.slug}`}>
                  <div
                    className={`px-3 py-1.5 rounded-md text-sm cursor-pointer ${
                      a.slug === currentSlug
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover-elevate"
                    }`}
                    onClick={onNav}
                    data-testid={`link-article-${a.slug}`}
                  >
                    {a.title}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          sections.map((section) => (
            <SectionNav
              key={section.id}
              section={section}
              defaultOpen
              currentSlug={currentSlug}
              onNav={onNav}
            />
          ))
        )}
      </nav>
    </div>
  );
}

export default function DocsPage() {
  const [location] = useLocation();
  const [isDocsRoot] = useRoute("/docs");
  const [, params] = useRoute<{ slug: string }>("/docs/:slug");
  const slug = params?.slug ?? null;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-card overflow-hidden">
        <SidebarContent
          query={searchQuery}
          onQueryChange={setSearchQuery}
          currentSlug={slug}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-72 max-w-full bg-card border-r border-border shadow-lg z-10 overflow-hidden">
            <div className="absolute top-3 right-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={closeMobile}
                data-testid="button-close-mobile-sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarContent
              query={searchQuery}
              onQueryChange={setSearchQuery}
              currentSlug={slug}
              onNav={closeMobile}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Docs top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            data-testid="button-mobile-sidebar-toggle"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Link href="/home">
            <span className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              ← Back to NistaGPS
            </span>
          </Link>
          {slug && (
            <>
              <span className="text-muted-foreground hidden sm:block">/</span>
              <span className="text-sm text-foreground font-medium truncate">
                {getArticle(slug)?.title ?? slug}
              </span>
            </>
          )}
        </header>

        {/* Article area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {isDocsRoot && !slug ? (
              <DocsHome />
            ) : slug ? (
              <ArticleView slug={slug} />
            ) : (
              <DocsHome />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
