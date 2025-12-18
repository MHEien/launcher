import { useEffect, useState } from "react";
import {
  Terminal,
  Download,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  LogIn,
  LogOut,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCodexStore } from "@/stores/codex";
import type { PackageManager } from "@/types/codex";
import { cn } from "@/lib/utils";

export function CodexSettings() {
  const {
    installStatus,
    packageManagers,
    authStatus,
    isCheckingInstall,
    isAuthenticating,
    isInstallingBun,
    checkInstalled,
    getPackageManagers,
    install,
    installBun,
    login,
    checkAuth,
  } = useCodexStore();

  const [selectedPM, setSelectedPM] = useState<PackageManager>("npm");
  const [authPollInterval, setAuthPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Check installation and auth status on mount
  useEffect(() => {
    checkInstalled();
    getPackageManagers();
  }, []);

  // Poll for auth completion when awaiting auth
  useEffect(() => {
    if (authStatus.status === "AwaitingAuth") {
      const interval = setInterval(() => {
        checkAuth();
      }, 2000);
      setAuthPollInterval(interval);
      return () => clearInterval(interval);
    } else if (authPollInterval) {
      clearInterval(authPollInterval);
      setAuthPollInterval(null);
    }
  }, [authStatus.status]);

  const isInstalled = installStatus.status === "Installed";
  const isAuthenticated = authStatus.status === "Authenticated";

  const handleInstall = async () => {
    await install(selectedPM);
  };

  const handleLogin = async () => {
    await login();
  };

  // Select first available package manager
  useEffect(() => {
    const available = packageManagers.find((pm) => pm.available);
    if (available) {
      setSelectedPM(available.id);
    }
  }, [packageManagers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Terminal className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-medium">OpenAI Codex CLI</h3>
          <p className="text-xs text-muted-foreground">
            AI coding assistant powered by OpenAI
          </p>
        </div>
      </div>

      {/* Installation Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Installation</span>
          <button
            onClick={checkInstalled}
            disabled={isCheckingInstall}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
            title="Refresh status"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isCheckingInstall && "animate-spin")}
            />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-muted/20">
          {isCheckingInstall ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking installation...</span>
            </div>
          ) : installStatus.status === "Installed" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-4 w-4" />
                <span className="text-sm">Installed</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                v{installStatus.version}
              </span>
            </div>
          ) : installStatus.status === "Installing" ? (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{installStatus.progress}</span>
            </div>
          ) : installStatus.status === "InstallFailed" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Installation failed</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {installStatus.error}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Codex CLI is not installed. Choose a package manager to install:
              </p>

              {/* Package Manager Selection */}
              <div className="space-y-2">
                {packageManagers.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => pm.available && setSelectedPM(pm.id)}
                    disabled={!pm.available}
                    className={cn(
                      "w-full p-3 rounded-md text-left transition-colors",
                      pm.available
                        ? selectedPM === pm.id
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                        : "bg-muted/10 opacity-50 cursor-not-allowed border border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pm.name}</span>
                        {pm.version && (
                          <span className="text-xs font-mono text-muted-foreground">
                            v{pm.version}
                          </span>
                        )}
                      </div>
                      {selectedPM === pm.id && pm.available && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {!pm.available && (
                        <span className="text-xs text-muted-foreground">
                          Not installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pm.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Install Button */}
              <button
                onClick={handleInstall}
                disabled={!packageManagers.some((pm) => pm.available)}
                className={cn(
                  "w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2",
                  "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Download className="h-4 w-4" />
                Install Codex CLI
              </button>

              {!packageManagers.some((pm) => pm.available) && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-400 font-medium mb-2">
                    No package manager found
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    To install Codex CLI, you need either npm (comes with Node.js) or bun.
                  </p>
                  
                  {/* Auto-install Bun option */}
                  <button
                    onClick={installBun}
                    disabled={isInstallingBun}
                    className={cn(
                      "w-full p-3 rounded-md transition-colors mb-3",
                      "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-emerald-400">
                            {isInstallingBun ? "Installing Bun..." : "Auto-install Bun"}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          One-click install • Faster than npm • All-in-one toolkit
                        </p>
                      </div>
                      {isInstallingBun ? (
                        <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-(--launcher-bg) text-muted-foreground">
                        or install manually
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    <button
                      onClick={() => openUrl("https://nodejs.org")}
                      className="w-full flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors group text-left"
                    >
                      <div>
                        <span className="text-sm font-medium">Node.js + npm</span>
                        <p className="text-xs text-muted-foreground">
                          Most widely used, stable, great ecosystem
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </button>
                    <button
                      onClick={() => openUrl("https://bun.sh")}
                      className="w-full flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors group text-left"
                    >
                      <div>
                        <span className="text-sm font-medium">Bun (manual)</span>
                        <p className="text-xs text-muted-foreground">
                          Visit bun.sh for manual installation options
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    After manual install, click <RefreshCw className="h-3 w-3 inline" /> to refresh.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Authentication */}
      {isInstalled && (
        <div className="space-y-3">
          <span className="text-sm font-medium">Authentication</span>

          <div className="p-3 rounded-lg bg-muted/20">
            {authStatus.status === "Authenticated" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Signed in to OpenAI</span>
                </div>
                <button
                  className="px-3 py-1.5 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Sign Out
                </button>
              </div>
            ) : authStatus.status === "AwaitingAuth" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Waiting for authentication...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete the authentication in your browser. This page will
                  update automatically when done.
                </p>
                <button
                  onClick={() =>
                    authStatus.status === "AwaitingAuth" &&
                    useCodexStore.getState().openAuthUrl(authStatus.auth_url)
                  }
                  className="w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Auth Page Again
                </button>
              </div>
            ) : authStatus.status === "Failed" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Authentication failed</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {authStatus.error}
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className="w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in with your OpenAI account to use Codex.
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className={cn(
                    "w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2",
                    "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isAuthenticating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Sign in with OpenAI
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Info */}
      {isInstalled && isAuthenticated && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-emerald-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Codex is ready to use!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Type <code className="px-1 py-0.5 bg-muted/30 rounded text-emerald-400">codex:</code>{" "}
                in the search bar followed by your prompt to start a coding session.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

