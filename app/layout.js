import './globals.css';

export const metadata = {
    title: 'Gym Detector',
    description: 'AI-powered exercise counter',
    manifest: '/manifest.json',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
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
