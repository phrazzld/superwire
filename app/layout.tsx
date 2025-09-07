import "../styles/globals.css";
import { ServiceWorkerProvider } from "./hooks/useServiceWorker";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <head />
      <body>
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}
