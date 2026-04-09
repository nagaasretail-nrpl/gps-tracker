import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInput,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getSections,
  getArticle,
  ALL_ARTICLES,
  type DocSection,
  type DocArticle,
} from "@/lib/docs-content";

// ─── URL helpers ──────────────────────────────────────────────────────────────
function articleUrl(a: { sectionId: string; slug: string }): string {
  return `/docs/${a.sectionId}/${a.slug}`;
}

function sectionUrl(s: DocSection): string {
  const first = s.articles[0];
  return first ? articleUrl(first) : "/docs";
}

// ─── Docs home grid ───────────────────────────────────────────────────────────
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
          <Link key={section.id} href={sectionUrl(section)}>
            <div
              className="border border-border rounded-md p-5 hover-elevate cursor-pointer h-full"
              data-testid={`card-section-${section.id}`}
            >
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
                    +{section.articles.length - 3} more&hellip;
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

// ─── Article view ─────────────────────────────────────────────────────────────
function ArticleView({ sectionId, slug }: { sectionId: string; slug: string }) {
  const article = getArticle(sectionId, slug);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [sectionId, slug]);

  if (!article) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Article not found.</p>
        <Link href="/docs">
          <Button variant="outline" className="mt-4">
            Back to Docs Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-foreground">{article.title}</h1>
      <div>{article.content}</div>
      {/* Prev / Next navigation */}
      <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-3 justify-between">
        {article.prev ? (
          <Link href={articleUrl(article.prev)}>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              data-testid="btn-prev-article"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="max-w-xs truncate">{article.prev.title}</span>
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {article.next ? (
          <Link href={articleUrl(article.next)}>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              data-testid="btn-next-article"
            >
              <span className="max-w-xs truncate">{article.next.title}</span>
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

// ─── Section nav item using SidebarMenuSub + Collapsible ─────────────────────
function DocsSectionNav({
  section,
  currentSectionId,
  currentSlug,
}: {
  section: DocSection;
  currentSectionId: string | null;
  currentSlug: string | null;
}) {
  const isActive = section.id === currentSectionId;
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="text-sidebar-foreground/70 font-semibold uppercase tracking-wide text-xs"
            data-testid={`btn-section-${section.id}`}
          >
            {section.title}
            {open ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform" />
            ) : (
              <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {section.articles.map((article) => {
              const isCurrentArticle =
                article.sectionId === currentSectionId && article.slug === currentSlug;
              return (
                <SidebarMenuSubItem key={`${article.sectionId}/${article.slug}`}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isCurrentArticle}
                    data-testid={`link-article-${article.slug}`}
                  >
                    <Link href={articleUrl(article)}>{article.title}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ─── Docs sidebar inner content ───────────────────────────────────────────────
function DocsSidebar({
  currentSectionId,
  currentSlug,
  query,
  onQueryChange,
}: {
  currentSectionId: string | null;
  currentSlug: string | null;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const sections = getSections();

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return ALL_ARTICLES.filter((a) => a.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <SidebarHeader className="pb-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 py-1">
          <MapPin className="h-4 w-4 text-sidebar-primary shrink-0" />
          <Link href="/home">
            <span className="font-bold text-sidebar-foreground text-sm">NistaGPS</span>
          </Link>
          <span className="text-sidebar-foreground/50 text-xs">Docs</span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/50 pointer-events-none" />
          <SidebarInput
            placeholder="Search articles…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-8"
            data-testid="input-docs-search"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Docs home link */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={!currentSectionId}
                  data-testid="link-docs-home"
                >
                  <Link href="/docs">Overview</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Filtered search results */}
              {filtered !== null ? (
                <>
                  <li className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50 mt-2">
                    Results ({filtered.length})
                  </li>
                  {filtered.length === 0 ? (
                    <li className="px-2 py-1 text-sm text-sidebar-foreground/50">
                      No articles match.
                    </li>
                  ) : (
                    filtered.map((a) => (
                      <SidebarMenuItem key={`${a.sectionId}/${a.slug}`}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            a.sectionId === currentSectionId && a.slug === currentSlug
                          }
                          data-testid={`link-article-${a.slug}`}
                        >
                          <Link href={articleUrl(a)}>{a.title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </>
              ) : (
                sections.map((section) => (
                  <DocsSectionNav
                    key={section.id}
                    section={section}
                    currentSectionId={currentSectionId}
                    currentSlug={currentSlug}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}

// ─── Section landing redirect (declarative) ───────────────────────────────────
function SectionLanding({ sectionId }: { sectionId: string }) {
  const [, setLocation] = useLocation();
  const sections = getSections();

  useEffect(() => {
    const section = sections.find((s) => s.id === sectionId);
    const first = section?.articles[0];
    if (first) {
      setLocation(articleUrl(first));
    }
  }, [sectionId, sections, setLocation]);

  return null;
}

// ─── Main DocsPage ────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [isDocsRoot] = useRoute("/docs");
  const [, sectionParams] = useRoute<{ section: string }>("/docs/:section");
  const [, articleParams] = useRoute<{ section: string; article: string }>(
    "/docs/:section/:article",
  );

  const currentSectionId = articleParams?.section ?? sectionParams?.section ?? null;
  const currentSlug = articleParams?.article ?? null;

  const [searchQuery, setSearchQuery] = useState("");

  const currentArticle =
    currentSectionId && currentSlug ? getArticle(currentSectionId, currentSlug) : null;

  const sidebarStyle = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle} defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Docs sidebar — dark themed via bg-sidebar CSS var */}
        <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
          <DocsSidebar
            currentSectionId={currentSectionId}
            currentSlug={currentSlug}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        </Sidebar>

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <SidebarTrigger
              className="h-8 w-8"
              data-testid="button-mobile-sidebar-toggle"
            />
            <Link href="/home">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                &larr; Back to NistaGPS
              </span>
            </Link>
            {currentArticle && (
              <>
                <span className="text-muted-foreground hidden sm:block">/</span>
                <span className="text-sm text-foreground font-medium truncate">
                  {currentArticle.title}
                </span>
              </>
            )}
          </header>

          {/* Article area */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-10">
              {/* Section-only URL → redirect to first article (declarative, no render side-effect) */}
              {currentSectionId && !currentSlug && !isDocsRoot && (
                <SectionLanding sectionId={currentSectionId} />
              )}

              {isDocsRoot && !currentSectionId ? (
                <DocsHome />
              ) : currentSectionId && currentSlug ? (
                <ArticleView sectionId={currentSectionId} slug={currentSlug} />
              ) : (
                <DocsHome />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
