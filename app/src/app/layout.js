import './globals.css';

export const metadata = {
  title: 'SDA Workflow — AI-Assisted Deviation Approval',
  description: 'AI-Assisted Service Deviation & Approval Workflow for Telecom/Media',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
