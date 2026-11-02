"use strict";

// Google sign-in via Supabase Auth.
// Shows the login screen until there is a session, then shows the
// signed-in user's name and profile picture from user_metadata.
(function auth() {
  const cfg = window.SUPABASE_CONFIG || {};
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  const googleBtn = document.getElementById("google-btn");
  const loginError = document.getElementById("login-error");
  const userChip = document.getElementById("user-chip");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");
  const signOutBtn = document.getElementById("signout-btn");
  const welcome = document.getElementById("welcome");

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }

  const configured = cfg.url && cfg.anonKey && !cfg.anonKey.startsWith("YOUR_");
  if (!configured || !window.supabase) {
    showLoginError(
      !window.supabase
        ? "Couldn't load the sign-in library. Check your connection and refresh."
        : "Sign-in isn't set up yet: add your Supabase anon key to config.js."
    );
    googleBtn.disabled = true;
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
  });

  function profileFrom(user) {
    const meta = user.user_metadata || {};
    return {
      name: meta.full_name || meta.name || user.email || "Friend",
      avatar: meta.avatar_url || meta.picture || "",
    };
  }

  function showSignedIn(user, justSignedIn) {
    const { name, avatar } = profileFrom(user);
    userName.textContent = name;
    if (avatar) {
      userAvatar.src = avatar;
      userAvatar.alt = `${name}'s profile picture`;
      userAvatar.hidden = false;
    } else {
      userAvatar.hidden = true;
    }
    userChip.hidden = false;

    if (justSignedIn) {
      const first = name.split(" ")[0];
      welcome.textContent = `Welcome, ${first}! 🌴`;
      welcome.hidden = false;
      setTimeout(() => { welcome.hidden = true; }, 6000);
    }

    loginScreen.hidden = true;
    app.hidden = false;
  }

  function showSignedOut() {
    userChip.hidden = true;
    welcome.hidden = true;
    app.hidden = true;
    loginScreen.hidden = false;
  }

  // Did we just come back from Google? (PKCE redirect carries ?code=…)
  const returningFromOAuth = new URLSearchParams(location.search).has("code");

  client.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      showSignedIn(session.user, event === "SIGNED_IN" && returningFromOAuth);
      if (returningFromOAuth) {
        // Clean the auth code out of the address bar.
        history.replaceState(null, "", location.pathname);
      }
    } else if (event !== "INITIAL_SESSION" || !returningFromOAuth) {
      showSignedOut();
    }
  });

  googleBtn.addEventListener("click", async () => {
    loginError.hidden = true;
    googleBtn.disabled = true;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) {
      googleBtn.disabled = false;
      showLoginError(`Google sign-in failed: ${error.message}`);
    }
  });

  signOutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    showSignedOut();
  });
})();
