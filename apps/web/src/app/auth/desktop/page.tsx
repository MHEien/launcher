import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import { generatePendingToken } from "@/lib/desktop-auth";

export default async function DesktopAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string }>;
}) {
  const user = await stackServerApp.getUser();
  const params = await searchParams;
  const redirectUri = params.redirect_uri || "launcher://auth/callback";

  // If not logged in, redirect to sign-in with return URL
  if (!user) {
    const returnUrl = encodeURIComponent(`/auth/desktop?redirect_uri=${encodeURIComponent(redirectUri)}`);
    redirect(`/handler/sign-in?after_auth_return_to=${returnUrl}`);
  }

  // User is logged in, generate a one-time token
  const token = await generatePendingToken({
    id: user.id,
    email: user.primaryEmail,
    name: user.displayName,
    avatar: user.profileImageUrl,
  });

  // Redirect to desktop app with token
  const callbackUrl = `${redirectUri}?token=${token}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Successful</h1>
        <p className="text-zinc-400 mb-6">
          You&apos;re signed in as <span className="text-white font-medium">{user.displayName || user.primaryEmail}</span>
        </p>
        <p className="text-zinc-500 text-sm mb-6">
          Redirecting you back to the Launcher app...
        </p>
        <a
          href={callbackUrl}
          className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Open Launcher
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <p className="text-zinc-600 text-xs mt-6">
          If the app doesn&apos;t open automatically, click the button above.
        </p>

        {/* Auto-redirect script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                window.location.href = "${callbackUrl}";
              }, 1500);
            `,
          }}
        />
      </div>
    </div>
  );
}

