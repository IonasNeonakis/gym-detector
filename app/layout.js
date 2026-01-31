import './globals.css';

export const metadata = {
    title: 'Gym Detector',
    description: 'AI-powered exercise counter',
    manifest: '/manifest.json',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#000000',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#000000" />
            </head>
            <body>{children}</body>
        </html>
    );
}
