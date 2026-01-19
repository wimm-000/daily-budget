import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";

// Initialize i18n (client-side only)
import "@/i18n";

// Inline script to prevent flash of wrong theme
const themeScript = `
(function() {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
  if (isDark) document.documentElement.classList.add('dark');
})();
`;

// Loading splash screen styles (inline to show immediately)
const splashStyles = `
#splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  z-index: 9999;
  transition: opacity 0.3s ease-out;
}
.dark #splash-screen {
  background: #0a0a0a;
}
#splash-screen.hidden {
  opacity: 0;
  pointer-events: none;
}
#splash-screen img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  animation: pulse 1.5s ease-in-out infinite;
}
#splash-screen p {
  margin-top: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #0a0a0a;
}
.dark #splash-screen p {
  color: #fafafa;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
`;

// Script to hide splash screen after hydration
const hideSplashScript = `
window.addEventListener('load', function() {
  setTimeout(function() {
    var splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(function() { splash.remove(); }, 300);
    }
  }, 100);
});
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
      },
      {
        title: "Daily Budget",
      },
      {
        name: "description",
        content: "Track your daily spending and stay within your budget",
      },
      {
        name: "theme-color",
        content: "#2563EB",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Daily Budget",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
      {
        rel: "apple-touch-icon",
        href: "/icon-192x192.png",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: splashStyles }} />
        <script dangerouslySetInnerHTML={{ __html: hideSplashScript }} />
        <HeadContent />
      </head>
      <body>
        {/* Splash screen shown while app loads */}
        <div id="splash-screen">
          <img src="/cover.png" alt="Daily Budget" />
          <p>Daily Budget</p>
        </div>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
