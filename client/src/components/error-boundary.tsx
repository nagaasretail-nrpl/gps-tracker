import { Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "An unexpected error occurred." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-background p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="flex flex-row items-center gap-3 pb-3 flex-wrap">
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-base">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while loading this page. You can try reloading or navigating back to the dashboard.
              </p>
              {import.meta.env.DEV && this.state.errorMessage && (
                <pre className="text-xs bg-muted rounded-md px-3 py-2 overflow-auto max-h-24 text-muted-foreground">
                  {this.state.errorMessage}
                </pre>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={this.handleReload} data-testid="button-error-reload">
                  Reload
                </Button>
                <Button variant="outline" onClick={this.handleReset} data-testid="button-error-retry">
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
