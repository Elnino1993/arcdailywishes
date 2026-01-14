'use client'

import { useWallet } from '@/hooks/use-wallet'
import { Button } from '@/components/ui/button'
import { Wallet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function WalletConnection() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useWallet()

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={disconnect} className="gap-2">
        <Wallet className="h-4 w-4" />
        <span className="hidden md:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <span className="md:hidden">
          {address.slice(0, 4)}...{address.slice(-2)}
        </span>
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={connect}
        disabled={isConnecting}
        className="gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
