import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Settings as SettingsIcon, X, FolderOpen, Plug, HardDrive, Link2, ExternalLink, Check, Loader2, ChevronDown, ChevronUp, Save, Plus, Trash2, RefreshCw, Store, Download, Star, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IndexConfig, PluginManifest, OAuthProviderInfo, OAuthCredentials, RegistryPlugin, PluginUpdate } from "@/types";
import { cn } from "@/lib/utils";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"index" | "plugins" | "marketplace" | "accounts">("index");
  const [indexConfig, setIndexConfig] = useState<IndexConfig | null>(null);
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [pluginsDir, setPluginsDir] = useState<string>("");
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderInfo[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const [config, pluginList, dir, providers] = await Promise.all([
        invoke<IndexConfig>("get_index_config"),
        invoke<PluginManifest[]>("list_plugins"),
        invoke<string>("get_plugins_dir"),
        invoke<OAuthProviderInfo[]>("list_oauth_providers"),
      ]);
      setIndexConfig(config);
      setPlugins(pluginList);
      setPluginsDir(dir);
      setOauthProviders(providers);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const tabs = [
    { id: "index" as const, label: "File Index", icon: HardDrive },
    { id: "plugins" as const, label: "Plugins", icon: Plug },
    { id: "marketplace" as const, label: "Marketplace", icon: Store },
    { id: "accounts" as const, label: "Accounts", icon: Link2 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-2xl max-h-[80vh]",
              "bg-(--launcher-bg) backdrop-blur-(--launcher-blur)",
              "border border-(--launcher-border)",
              "rounded-xl shadow-2xl overflow-hidden"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex">
              <div className="w-48 border-r border-border/30 p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 overflow-y-auto max-h-[60vh]">
                {activeTab === "index" && indexConfig && (
                  <IndexSettings config={indexConfig} onConfigChange={setIndexConfig} />
                )}
                {activeTab === "plugins" && (
                  <PluginSettings plugins={plugins} pluginsDir={pluginsDir} onRefresh={loadSettings} />
                )}
                {activeTab === "marketplace" && (
                  <MarketplaceSettings installedPlugins={plugins} onRefresh={loadSettings} />
                )}
                {activeTab === "accounts" && (
                  <AccountsSettings providers={oauthProviders} onRefresh={loadSettings} />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IndexSettings({ config, onConfigChange }: { config: IndexConfig; onConfigChange: (config: IndexConfig) => void }) {
  const [newPath, setNewPath] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newExtension, setNewExtension] = useState("");
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const handleAddPath = () => {
    if (newPath.trim() && !config.index_paths.includes(newPath.trim())) {
      onConfigChange({
        ...config,
        index_paths: [...config.index_paths, newPath.trim()],
      });
      setNewPath("");
    }
  };

  const handleRemovePath = (index: number) => {
    onConfigChange({
      ...config,
      index_paths: config.index_paths.filter((_, i) => i !== index),
    });
  };

  const handleAddPattern = () => {
    if (newPattern.trim() && !config.exclude_patterns.includes(newPattern.trim())) {
      onConfigChange({
        ...config,
        exclude_patterns: [...config.exclude_patterns, newPattern.trim()],
      });
      setNewPattern("");
    }
  };

  const handleRemovePattern = (index: number) => {
    onConfigChange({
      ...config,
      exclude_patterns: config.exclude_patterns.filter((_, i) => i !== index),
    });
  };

  const handleAddExtension = () => {
    const ext = newExtension.trim().replace(/^\./, "");
    if (ext && !config.content_extensions.includes(ext)) {
      onConfigChange({
        ...config,
        content_extensions: [...config.content_extensions, ext],
      });
      setNewExtension("");
    }
  };

  const handleRemoveExtension = (index: number) => {
    onConfigChange({
      ...config,
      content_extensions: config.content_extensions.filter((_, i) => i !== index),
    });
  };

  const handleToggle = (field: "exclude_hidden" | "index_content") => {
    onConfigChange({
      ...config,
      [field]: !config[field],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke("set_index_config", { config });
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await invoke("start_indexing");
    } catch (error) {
      console.error("Failed to start reindexing:", error);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Indexed Directories
        </h3>
        <div className="space-y-1">
          {config.index_paths.map((path, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md text-sm font-mono group"
            >
              <span className="truncate">{path}</span>
              <button
                onClick={() => handleRemovePath(i)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPath()}
              placeholder="/path/to/directory"
              className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
            />
            <button
              onClick={handleAddPath}
              className="px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Excluded Patterns</h3>
        <div className="flex flex-wrap gap-1">
          {config.exclude_patterns.map((pattern, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-muted/30 rounded text-xs font-mono flex items-center gap-1 group"
            >
              {pattern}
              <button
                onClick={() => handleRemovePattern(i)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPattern()}
            placeholder="node_modules"
            className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
          />
          <button
            onClick={handleAddPattern}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleToggle("exclude_hidden")}
          className="flex items-center justify-between p-3 bg-muted/20 rounded-md hover:bg-muted/30 transition-colors"
        >
          <span className="text-sm">Exclude hidden files</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded",
            config.exclude_hidden ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {config.exclude_hidden ? "Yes" : "No"}
          </span>
        </button>
        <button
          onClick={() => handleToggle("index_content")}
          className="flex items-center justify-between p-3 bg-muted/20 rounded-md hover:bg-muted/30 transition-colors"
        >
          <span className="text-sm">Index content</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded",
            config.index_content ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {config.index_content ? "Yes" : "No"}
          </span>
        </button>
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md col-span-2">
          <span className="text-sm">Max file size</span>
          <span className="text-xs font-mono">{config.max_file_size_mb} MB</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Content-indexed extensions</h3>
        <div className="flex flex-wrap gap-1">
          {config.content_extensions.map((ext, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono flex items-center gap-1 group"
            >
              .{ext}
              <button
                onClick={() => handleRemoveExtension(i)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newExtension}
            onChange={(e) => setNewExtension(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExtension()}
            placeholder=".json"
            className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
          />
          <button
            onClick={handleAddExtension}
            className="px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border/20">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2",
            "bg-green-500/10 text-green-400 hover:bg-green-500/20",
            saving && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className={cn(
            "px-4 py-2 rounded-md transition-colors flex items-center gap-2",
            "bg-primary/10 text-primary hover:bg-primary/20",
            reindexing && "opacity-50 cursor-not-allowed"
          )}
        >
          {reindexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reindex
        </button>
      </div>
    </div>
  );
}

function PluginSettings({ plugins, pluginsDir, onRefresh }: { plugins: PluginManifest[]; pluginsDir: string; onRefresh: () => void }) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [updates, setUpdates] = useState<PluginUpdate[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    checkForUpdates();
  }, [plugins]);

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const availableUpdates = await invoke<PluginUpdate[]>("check_plugin_updates");
      setUpdates(availableUpdates);
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdate = async (pluginId: string) => {
    setUpdating(pluginId);
    try {
      await invoke("update_plugin", { id: pluginId });
      onRefresh();
      checkForUpdates();
    } catch (error) {
      console.error("Failed to update plugin:", error);
    } finally {
      setUpdating(null);
    }
  };

  const getUpdateForPlugin = (pluginId: string) => updates.find(u => u.id === pluginId);

  const handleToggle = async (pluginId: string, currentEnabled: boolean) => {
    setToggling(pluginId);
    try {
      if (currentEnabled) {
        await invoke("disable_plugin", { id: pluginId });
      } else {
        await invoke("enable_plugin", { id: pluginId });
      }
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle plugin:", error);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground font-mono bg-muted/20 px-3 py-2 rounded">
        {pluginsDir}
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Plug className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No plugins installed</p>
          <p className="text-xs mt-1">
            Place plugin folders in the directory above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={cn(
                "p-3 rounded-md transition-colors",
                plugin.enabled ? "bg-muted/20" : "bg-muted/10 opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{plugin.name}</h4>
                    <span className="text-xs font-mono text-muted-foreground">
                      v{plugin.version}
                    </span>
                    {getUpdateForPlugin(plugin.id) && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                        Update: v{getUpdateForPlugin(plugin.id)?.latest_version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {plugin.description || "No description"}
                  </p>
                  {plugin.author && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {plugin.author}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {getUpdateForPlugin(plugin.id) && (
                    <button
                      onClick={() => handleUpdate(plugin.id)}
                      disabled={updating === plugin.id}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                        "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
                        updating === plugin.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {updating === plugin.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Update
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(plugin.id, plugin.enabled)}
                    disabled={toggling === plugin.id}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                      plugin.enabled
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                      toggling === plugin.id && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {toggling === plugin.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : plugin.enabled ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                    {plugin.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountsSettings({ providers, onRefresh }: { providers: OAuthProviderInfo[]; onRefresh: () => void }) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, OAuthCredentials>>({});
  const [saving, setSaving] = useState<string | null>(null);
  
  // Web auth state
  const [webAuthState, setWebAuthState] = useState<{ is_authenticated: boolean; user: { id: string; email: string | null; name: string | null; avatar: string | null } | null } | null>(null);
  const [webAuthLoading, setWebAuthLoading] = useState(false);

  useEffect(() => {
    loadWebAuthState();
    
    // Listen for auth callback to refresh state immediately
    let unlisten: (() => void) | undefined;
    listen<string>("auth-callback", () => {
      // Small delay to ensure the backend has processed the token
      setTimeout(() => {
        loadWebAuthState();
      }, 500);
    }).then((fn) => {
      unlisten = fn;
    });
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const loadWebAuthState = async () => {
    try {
      const state = await invoke<{ is_authenticated: boolean; user: { id: string; email: string | null; name: string | null; avatar: string | null } | null }>("get_auth_state");
      setWebAuthState(state);
    } catch (error) {
      console.error("Failed to load web auth state:", error);
    }
  };

  const handleWebLogin = async () => {
    setWebAuthLoading(true);
    try {
      await invoke("open_login");
      // Auth completion happens via deep link callback
    } catch (error) {
      console.error("Failed to open login:", error);
    } finally {
      setWebAuthLoading(false);
    }
  };

  const handleWebLogout = async () => {
    setWebAuthLoading(true);
    try {
      const state = await invoke<{ is_authenticated: boolean; user: { id: string; email: string | null; name: string | null; avatar: string | null } | null }>("logout");
      setWebAuthState(state);
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setWebAuthLoading(false);
    }
  };

  const loadCredentials = async (providerId: string) => {
    try {
      const creds = await invoke<OAuthCredentials>("get_oauth_credentials", { providerId });
      setCredentials(prev => ({ ...prev, [providerId]: creds }));
    } catch (error) {
      console.error("Failed to load credentials:", error);
    }
  };

  const handleToggleExpand = async (providerId: string) => {
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
    } else {
      setExpandedProvider(providerId);
      if (!credentials[providerId]) {
        await loadCredentials(providerId);
      }
    }
  };

  const handleSaveCredentials = async (providerId: string) => {
    setSaving(providerId);
    try {
      const creds = credentials[providerId];
      await invoke("set_oauth_credentials", {
        providerId,
        clientId: creds?.client_id || null,
        clientSecret: creds?.client_secret || null,
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to save credentials:", error);
    } finally {
      setSaving(null);
    }
  };

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    try {
      const authUrl = await invoke<string>("start_oauth", { providerId });
      await openUrl(authUrl);
    } catch (error) {
      console.error("Failed to start OAuth:", error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      await invoke("disconnect_oauth", { providerId });
      onRefresh();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const providerIcons: Record<string, string> = {
    github: "🐙",
    google: "🔵",
    notion: "📝",
    slack: "💬",
  };

  const providerDocs: Record<string, string> = {
    github: "https://github.com/settings/developers",
    google: "https://console.cloud.google.com/apis/credentials",
    notion: "https://www.notion.so/my-integrations",
    slack: "https://api.slack.com/apps",
  };

  return (
    <div className="space-y-4">
      {/* Launcher Account Section */}
      <div className="bg-muted/20 rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              {webAuthState?.user?.avatar ? (
                <img src={webAuthState.user.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-xl">🚀</span>
              )}
            </div>
            <div>
              <h4 className="font-medium">Launcher Account</h4>
              {webAuthState?.is_authenticated ? (
                <p className="text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="h-3 w-3" /> {webAuthState.user?.email || webAuthState.user?.name || "Connected"}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Sign in to sync settings and plugins</p>
              )}
            </div>
          </div>
          <div>
            {webAuthState?.is_authenticated ? (
              <button
                onClick={handleWebLogout}
                disabled={webAuthLoading}
                className="px-3 py-1.5 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
              >
                {webAuthLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleWebLogin}
                disabled={webAuthLoading}
                className="px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                {webAuthLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          Connect external services for search integrations.
        </p>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => {
          const isExpanded = expandedProvider === provider.id;
          const creds = credentials[provider.id];
          const hasCredentials = creds?.client_id && creds.client_id.length > 0;

          return (
            <div
              key={provider.id}
              className="bg-muted/20 rounded-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{providerIcons[provider.id] || "🔗"}</span>
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {provider.connected ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Check className="h-3 w-3" /> Connected
                        </span>
                      ) : hasCredentials ? (
                        "Ready to connect"
                      ) : (
                        "Credentials required"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {provider.connected ? (
                    <button
                      onClick={() => handleDisconnect(provider.id)}
                      className="px-3 py-1.5 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : hasCredentials ? (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={connecting === provider.id}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                        "bg-primary/10 text-primary hover:bg-primary/20",
                        connecting === provider.id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {connecting === provider.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3" />
                          Connect
                        </>
                      )}
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleToggleExpand(provider.id)}
                    className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/20">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={creds?.client_id || ""}
                        onChange={(e) => setCredentials(prev => ({
                          ...prev,
                          [provider.id]: { ...prev[provider.id], client_id: e.target.value || null }
                        }))}
                        placeholder="Enter client ID"
                        className="w-full px-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Client Secret (optional for PKCE)
                      </label>
                      <input
                        type="password"
                        value={creds?.client_secret || ""}
                        onChange={(e) => setCredentials(prev => ({
                          ...prev,
                          [provider.id]: { ...prev[provider.id], client_secret: e.target.value || null }
                        }))}
                        placeholder="Enter client secret"
                        className="w-full px-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={providerDocs[provider.id]}
                        onClick={(e) => {
                          e.preventDefault();
                          openUrl(providerDocs[provider.id]);
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Get credentials
                      </a>
                      <button
                        onClick={() => handleSaveCredentials(provider.id)}
                        disabled={saving === provider.id}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                          "bg-green-500/10 text-green-400 hover:bg-green-500/20",
                          saving === provider.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {saving === provider.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Redirect URI: <code className="bg-muted/30 px-1 rounded">http://localhost:19284/oauth/callback</code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {providers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No OAuth providers available</p>
        </div>
      )}
    </div>
  );
}

function MarketplaceSettings({ installedPlugins, onRefresh }: { installedPlugins: PluginManifest[]; onRefresh: () => void }) {
  const [marketplacePlugins, setMarketplacePlugins] = useState<RegistryPlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const installedIds = new Set(installedPlugins.map(p => p.id));

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const [plugins, cats] = await Promise.all([
        invoke<RegistryPlugin[]>("list_marketplace_plugins"),
        invoke<string[]>("get_marketplace_categories"),
      ]);
      setMarketplacePlugins(plugins);
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load marketplace:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await invoke("refresh_marketplace");
      await loadMarketplace();
    } catch (error) {
      console.error("Failed to refresh marketplace:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMarketplace();
      return;
    }
    try {
      const results = await invoke<RegistryPlugin[]>("search_marketplace", { query: searchQuery });
      setMarketplacePlugins(results);
    } catch (error) {
      console.error("Failed to search marketplace:", error);
    }
  };

  const handleInstall = async (pluginId: string) => {
    setInstalling(pluginId);
    try {
      await invoke("install_plugin", { id: pluginId });
      onRefresh();
    } catch (error) {
      console.error("Failed to install plugin:", error);
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setUninstalling(pluginId);
    try {
      await invoke("uninstall_plugin", { id: pluginId });
      onRefresh();
    } catch (error) {
      console.error("Failed to uninstall plugin:", error);
    } finally {
      setUninstalling(null);
    }
  };

  const filteredPlugins = selectedCategory
    ? marketplacePlugins.filter(p => p.categories.includes(selectedCategory))
    : marketplacePlugins;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search plugins..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-background/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            "px-3 py-2 bg-muted/30 text-muted-foreground rounded-md hover:bg-muted/50 transition-colors",
            refreshing && "opacity-50 cursor-not-allowed"
          )}
          title="Refresh from server"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-2 py-1 text-xs rounded-md transition-colors",
            selectedCategory === null
              ? "bg-primary/20 text-primary"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-2 py-1 text-xs rounded-md transition-colors",
              selectedCategory === cat
                ? "bg-primary/20 text-primary"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredPlugins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No plugins found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlugins.map((plugin) => {
            const isInstalled = installedIds.has(plugin.id);
            return (
              <div
                key={plugin.id}
                className="p-3 bg-muted/20 rounded-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plugin.name}</h4>
                      <span className="text-xs font-mono text-muted-foreground">
                        v{plugin.version}
                      </span>
                      {isInstalled && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plugin.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {plugin.author && (
                        <span>by {plugin.author}</span>
                      )}
                      {plugin.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {plugin.rating.toFixed(1)}
                        </span>
                      )}
                      {plugin.downloads > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Download className="h-3 w-3" />
                          {plugin.downloads.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {plugin.categories.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {plugin.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-1.5 py-0.5 text-[10px] bg-muted/40 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    {isInstalled ? (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={uninstalling === plugin.id}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                          "bg-red-500/10 text-red-400 hover:bg-red-500/20",
                          uninstalling === plugin.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {uninstalling === plugin.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Uninstall
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(plugin.id)}
                        disabled={installing === plugin.id}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1",
                          "bg-primary/10 text-primary hover:bg-primary/20",
                          installing === plugin.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {installing === plugin.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Install
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
