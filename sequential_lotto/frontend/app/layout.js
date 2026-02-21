import './globals.css'

export const metadata = {
  title: 'NtoLotto - Win Big!',
  description: 'Decentralized lottery on Sepolia testnet with sequential number matching',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
