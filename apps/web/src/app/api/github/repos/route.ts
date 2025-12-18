import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

interface RepoListItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  owner: string;
  ownerAvatar: string;
  updatedAt: string;
  language: string | null;
  stars: number;
}

/**
 * GET /api/github/repos
 * List GitHub repositories for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the GitHub connected account
    const githubAccount = await user.getConnectedAccount("github");

    if (!githubAccount) {
      return NextResponse.json(
        {
          error: "GitHub not connected",
          message: "Please connect your GitHub account to continue",
          connectUrl: "/handler/sign-in?oauth_provider=github",
        },
        { status: 400 }
      );
    }

    // Get the access token from the connected account
    const tokenResult = await githubAccount.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "GitHub token expired",
          message: "Please reconnect your GitHub account",
          connectUrl: "/handler/sign-in?oauth_provider=github",
        },
        { status: 401 }
      );
    }

    // Fetch repos from GitHub API
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "30");
    const sort = searchParams.get("sort") || "updated";

    const githubResponse = await fetch(
      `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=${sort}&affiliation=owner,collaborator`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error("GitHub API error:", githubResponse.status, errorText);

      if (githubResponse.status === 401) {
        return NextResponse.json(
          {
            error: "GitHub token invalid",
            message: "Please reconnect your GitHub account",
            connectUrl: "/handler/sign-in?oauth_provider=github",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch repositories" },
        { status: githubResponse.status }
      );
    }

    const repos: GitHubRepo[] = await githubResponse.json();

    // Transform to our format
    const repoList: RepoListItem[] = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      owner: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      updatedAt: repo.updated_at,
      language: repo.language,
      stars: repo.stargazers_count,
    }));

    // Get pagination info from headers
    const linkHeader = githubResponse.headers.get("link");
    const hasMore = linkHeader?.includes('rel="next"') || false;

    return NextResponse.json({
      repos: repoList,
      page,
      perPage,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

