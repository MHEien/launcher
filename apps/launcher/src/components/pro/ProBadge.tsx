import { Crown, Sparkles, ExternalLink } from "lucide-react";
import { useProFeaturesStore } from "@/stores/pro";

interface ProBadgeProps {
    /** Size variant of the badge */
    size?: "sm" | "md" | "lg";
    /** Whether to show text label */
    showLabel?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * Pro badge to indicate a feature requires Pro subscription
 */
export function ProBadge({ size = "sm", showLabel = true, className = "" }: ProBadgeProps) {
    const sizeClasses = {
        sm: "text-xs px-1.5 py-0.5 gap-0.5",
        md: "text-sm px-2 py-1 gap-1",
        lg: "text-base px-3 py-1.5 gap-1.5",
    };

    const iconSizes = {
        sm: 10,
        md: 12,
        lg: 14,
    };

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full
        bg-gradient-to-r from-amber-500/20 to-orange-500/20
        text-amber-400 border border-amber-500/30
        ${sizeClasses[size]}
        ${className}
      `}
        >
            <Crown size={iconSizes[size]} className="shrink-0" />
            {showLabel && <span>Pro</span>}
        </span>
    );
}

interface ProPlusBadgeProps {
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

/**
 * Pro+ badge for team/enterprise features
 */
export function ProPlusBadge({ size = "sm", showLabel = true, className = "" }: ProPlusBadgeProps) {
    const sizeClasses = {
        sm: "text-xs px-1.5 py-0.5 gap-0.5",
        md: "text-sm px-2 py-1 gap-1",
        lg: "text-base px-3 py-1.5 gap-1.5",
    };

    const iconSizes = {
        sm: 10,
        md: 12,
        lg: 14,
    };

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full
        bg-gradient-to-r from-purple-500/20 to-pink-500/20
        text-purple-400 border border-purple-500/30
        ${sizeClasses[size]}
        ${className}
      `}
        >
            <Sparkles size={iconSizes[size]} className="shrink-0" />
            {showLabel && <span>Pro+</span>}
        </span>
    );
}

interface UpgradeCTAProps {
    /** Feature name to display */
    feature: string;
    /** Description of what the feature does */
    description?: string;
    /** Variant style */
    variant?: "inline" | "card" | "banner";
    /** Custom class name */
    className?: string;
}

/**
 * Call-to-action component for upgrading to Pro
 */
export function UpgradeCTA({
    feature,
    description,
    variant = "card",
    className = "",
}: UpgradeCTAProps) {
    const handleUpgrade = () => {
        window.open("https://launcher.app/pricing", "_blank");
    };

    if (variant === "inline") {
        return (
            <button
                onClick={handleUpgrade}
                className={`
          inline-flex items-center gap-1 text-amber-400 hover:text-amber-300
          text-sm font-medium transition-colors
          ${className}
        `}
            >
                <Crown size={14} />
                <span>Upgrade to Pro</span>
                <ExternalLink size={12} />
            </button>
        );
    }

    if (variant === "banner") {
        return (
            <div
                className={`
          flex items-center justify-between px-4 py-3 rounded-lg
          bg-gradient-to-r from-amber-500/10 to-orange-500/10
          border border-amber-500/20
          ${className}
        `}
            >
                <div className="flex items-center gap-3">
                    <Crown size={20} className="text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-white">{feature} requires Pro</p>
                        {description && <p className="text-xs text-white/60">{description}</p>}
                    </div>
                </div>
                <button
                    onClick={handleUpgrade}
                    className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-md
            bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm
            transition-colors
          "
                >
                    Upgrade
                    <ExternalLink size={12} />
                </button>
            </div>
        );
    }

    // Card variant (default)
    return (
        <div
            className={`
        flex flex-col items-center justify-center p-6 rounded-xl
        bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10
        border border-amber-500/20
        text-center
        ${className}
      `}
        >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Crown size={24} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{feature}</h3>
            <p className="text-sm text-white/60 mb-4">
                {description || "This feature requires a Pro subscription"}
            </p>
            <button
                onClick={handleUpgrade}
                className="
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-gradient-to-r from-amber-500 to-orange-500
          hover:from-amber-400 hover:to-orange-400
          text-black font-semibold text-sm
          transition-all shadow-lg shadow-amber-500/20
        "
            >
                Upgrade to Pro
                <ExternalLink size={14} />
            </button>
        </div>
    );
}

interface FeatureGateProps {
    /** The feature to check */
    feature: "codex_available" | "cloud_sync_available" | "team_features_available";
    /** Feature name for display */
    featureName: string;
    /** Description for the upgrade CTA */
    description?: string;
    /** Content to show when feature is available */
    children: React.ReactNode;
    /** Placeholder to show when feature is not available */
    placeholder?: "card" | "banner" | "hidden";
}

/**
 * Gate component that shows upgrade CTA when feature is not available
 */
export function FeatureGate({
    feature,
    featureName,
    description,
    children,
    placeholder = "card",
}: FeatureGateProps) {
    const features = useProFeaturesStore((state) => state.features);
    const isAvailable = features[feature];

    if (isAvailable) {
        return <>{children}</>;
    }

    if (placeholder === "hidden") {
        return null;
    }

    return (
        <UpgradeCTA
            feature={featureName}
            description={description}
            variant={placeholder}
        />
    );
}
