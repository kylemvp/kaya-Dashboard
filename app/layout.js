import './globals.css'

export const metadata = {
  title: 'Kaya CMS — Content Dashboard',
  description: 'Manage treatments, doctors, enquiries and page content for the Kaya site.',
  // A staff tool has no business appearing in search results.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        Browser extensions commonly stamp attributes onto <body> before React
        hydrates (password managers, grammar checkers, screen recorders), which
        React reports as a hydration mismatch even though the app rendered
        identically on both sides.

        suppressHydrationWarning applies to THIS element only — its own
        attributes and text. Mismatches inside the tree still surface, so this
        silences the extension noise without hiding a real bug.
      */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
